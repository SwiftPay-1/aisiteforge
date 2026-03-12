import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NO_TOOL_SUPPORT = ["mixtral-8x7b-32768", "gemma2-9b-it", "gemma-7b-it"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { websiteId, prompt, currentHtml, currentCss, currentJs } = await req.json();
    if (!prompt) throw new Error("Prompt is required");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const systemPrompt = `You are an elite website editor. You receive existing website code and a user's edit request.
Apply the requested changes and return the COMPLETE updated code.

RULES:
1. HTML = inner body HTML only. NO <!DOCTYPE>, <html>, <head>, <body> tags.
2. CSS = all CSS including @import for fonts.
3. JS = all JavaScript.
4. Preserve ALL existing functionality unless the user asks to remove it.
5. Apply ONLY the changes the user requested.
6. Maintain professional design quality.
7. Keep responsive design intact.`;

    const userPrompt = `Current HTML:\n${currentHtml || "(empty)"}\n\nCurrent CSS:\n${currentCss || "(empty)"}\n\nCurrent JS:\n${currentJs || "(empty)"}\n\nUser's edit request: ${prompt}\n\nApply the changes now.`;

    const tools = [{
      type: "function",
      function: {
        name: "update_website",
        description: "Return the complete updated website code after applying edits",
        parameters: {
          type: "object",
          properties: {
            html: { type: "string", description: "Complete updated inner body HTML" },
            css: { type: "string", description: "Complete updated CSS" },
            js: { type: "string", description: "Complete updated JavaScript" },
          },
          required: ["html", "css", "js"],
          additionalProperties: false,
        },
      },
    }];

    let updatedData: { html: string; css: string; js: string } | null = null;

    // Try admin-configured providers first
    const { data: providers } = await adminClient.from("ai_providers").select("*").eq("is_active", true).order("is_default", { ascending: false }).order("sort_order");

    for (const provider of (providers || [])) {
      const { data: keys } = await adminClient.from("ai_api_keys").select("*").eq("provider_id", provider.id).eq("is_active", true).order("usage_count");
      if (!keys?.length) continue;

      const apiKey = keys[0];
      const model = (provider.models as any[])?.[0]?.id || "deepseek-chat";
      const useTools = !NO_TOOL_SUPPORT.includes(model);

      try {
        const body: any = {
          model,
          messages: [
            { role: "system", content: useTools ? systemPrompt : systemPrompt + "\n\nIMPORTANT: Return your response as a JSON object with keys: html, css, js." },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 64000,
        };

        if (useTools) {
          body.tools = tools;
          body.tool_choice = { type: "function", function: { name: "update_website" } };
        }

        const response = await fetch(provider.base_url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey.api_key}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          console.error(`Edit provider ${provider.name} error:`, response.status);
          
          // If tool_choice caused 400/422, retry without tools
          if (useTools && (response.status === 400 || response.status === 422)) {
            console.log(`Retrying ${provider.name} without tool_choice...`);
            const retryBody = { ...body };
            delete retryBody.tools;
            delete retryBody.tool_choice;
            retryBody.messages[0].content = systemPrompt + "\n\nIMPORTANT: Return your response as a JSON object with keys: html, css, js.";
            
            const retryResponse = await fetch(provider.base_url, {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey.api_key}`, "Content-Type": "application/json" },
              body: JSON.stringify(retryBody),
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              const raw = retryData.choices?.[0]?.message?.content || "";
              const parsed = cleanAndParseJSON(raw);
              if (parsed) {
                updatedData = { html: (parsed.html as string) || currentHtml || "", css: (parsed.css as string) || currentCss || "", js: (parsed.js as string) || currentJs || "" };
              }
            }
          }
          
          if (updatedData) {
            await adminClient.from("ai_api_keys").update({ usage_count: (apiKey.usage_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", apiKey.id);
            break;
          }
          continue;
        }

        const aiData = await response.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const args = JSON.parse(toolCall.function.arguments);
          updatedData = { html: args.html || currentHtml || "", css: args.css || currentCss || "", js: args.js || currentJs || "" };
        } else {
          const raw = aiData.choices?.[0]?.message?.content || "";
          const parsed = cleanAndParseJSON(raw);
          if (parsed) updatedData = { html: (parsed.html as string) || currentHtml || "", css: (parsed.css as string) || currentCss || "", js: (parsed.js as string) || currentJs || "" };
        }

        if (updatedData) {
          await adminClient.from("ai_api_keys").update({ usage_count: (apiKey.usage_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", apiKey.id);
          break;
        }
      } catch (e) {
        console.error(`Edit provider ${provider.name} exception:`, e);
      }
    }

    // Fallback to Lovable gateway
    if (!updatedData) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            tools,
            tool_choice: { type: "function", function: { name: "update_website" } },
            temperature: 0.5, max_tokens: 64000,
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const args = JSON.parse(toolCall.function.arguments);
            updatedData = { html: args.html || currentHtml || "", css: args.css || currentCss || "", js: args.js || currentJs || "" };
          }
        }
      }
    }

    if (!updatedData) {
      return new Response(JSON.stringify({ error: "All AI providers failed. Please check API keys in admin settings." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (websiteId) {
      await adminClient.from("websites").update({
        html_content: updatedData.html, css_content: updatedData.css, js_content: updatedData.js,
      }).eq("id", websiteId).eq("user_id", user.id);
    }

    return new Response(JSON.stringify({ updated: updatedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("edit-website error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function cleanAndParseJSON(raw: string): Record<string, unknown> | null {
  let cleaned = raw.replace(/^```(?:json)?\s*/gim, "").replace(/```\s*$/gim, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) return null;
  if (lastBrace > firstBrace) cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(cleaned); } catch { return null; }
}
