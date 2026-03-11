import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

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

    // Use tool calling for guaranteed structured output
    const tools = [
      {
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
            additionalProperties: false
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "update_website" } },
        temperature: 0.5,
        max_tokens: 64000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI edit failed");
    }

    const aiData = await response.json();
    
    let updatedData: { html: string; css: string; js: string };
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        updatedData = {
          html: args.html || currentHtml || "",
          css: args.css || currentCss || "",
          js: args.js || currentJs || "",
        };
      } catch {
        throw new Error("Failed to parse AI response");
      }
    } else {
      // Fallback
      const rawContent = aiData.choices?.[0]?.message?.content || "";
      const parsed = cleanAndParseJSON(rawContent);
      if (!parsed) throw new Error("Failed to parse AI response");
      updatedData = {
        html: (parsed.html as string) || currentHtml || "",
        css: (parsed.css as string) || currentCss || "",
        js: (parsed.js as string) || currentJs || "",
      };
    }

    if (websiteId) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient
        .from("websites")
        .update({
          html_content: updatedData.html,
          css_content: updatedData.css,
          js_content: updatedData.js,
        })
        .eq("id", websiteId)
        .eq("user_id", user.id);
    }

    return new Response(JSON.stringify({ updated: updatedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("edit-website error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
