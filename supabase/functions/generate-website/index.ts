import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Cleans raw LLM output into a valid JSON string.
 * Handles markdown fences, trailing commas, control chars, and truncation.
 */
function cleanAndParseJSON(raw: string): Record<string, unknown> | null {
  // 1. Strip markdown code fences
  let cleaned = raw
    .replace(/^```(?:json)?\s*/gim, "")
    .replace(/```\s*$/gim, "")
    .trim();

  // 2. Find the outermost JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) return null;

  if (lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else {
    // Truncated – no closing brace. Try to repair.
    cleaned = cleaned.substring(firstBrace);
    // Close any open strings and structures
    cleaned = repairTruncatedJSON(cleaned);
  }

  // 3. Remove control characters (except normal whitespace)
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");

  // 4. Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  // 5. Try parsing
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try a more aggressive repair
    try {
      return JSON.parse(repairTruncatedJSON(cleaned));
    } catch {
      return null;
    }
  }
}

/**
 * Attempts to repair truncated JSON by closing open strings, arrays, objects.
 */
function repairTruncatedJSON(json: string): string {
  let result = json;

  // Remove trailing commas
  result = result.replace(/,\s*$/, "");

  // Count open/close braces and brackets
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"' && !escape) { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // If we're still inside a string, close it
  if (inString) result += '"';

  // Remove any trailing partial key-value (e.g. `"key": "some trunc`)
  // Already handled by closing the string above

  // Close remaining open structures
  while (stack.length > 0) {
    result += stack.pop();
  }

  return result;
}

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

    const today = new Date().toISOString().split("T")[0];

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await adminClient
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    const plan = profile?.plan || "free";

    if (plan === "free") {
      const { data: usage } = await adminClient
        .from("daily_usage")
        .select("generation_count")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .single();

      if (usage && usage.generation_count >= 3) {
        return new Response(
          JSON.stringify({ error: "Daily limit reached (3/day). Upgrade to Pro for unlimited!" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { businessName, category, description, theme, stream } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const systemPrompt = `You are a website builder. Output a JSON object with keys: html, css, js, sections.

RULES:
1. Return ONLY raw JSON. No markdown. No backticks. No explanation text.
2. "html" = inner body HTML only. NO <!DOCTYPE>, <html>, <head>, <body> tags.
3. "css" = all CSS. Include @import for Google Fonts. Keep it SHORT and VALID.
4. "js" = JavaScript for menu toggle, smooth scroll, scroll animations.
5. "sections" = [{type, title, content}] array describing each section.

CRITICAL CSS RULES:
- Every CSS property MUST be complete. Never truncate values.
- Use shorthand properties (margin, padding, background, border, font).
- Combine selectors that share styles.
- NO duplicate rules. NO excessive comments.
- Keep total CSS under 200 lines.
- Use CSS variables for repeated values.

CRITICAL HTML RULES:
- Every tag must be properly closed.
- Use semantic HTML (header, nav, main, section, footer).
- Use Font Awesome CDN for icons: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css (add as @import in CSS)
- Use https://placehold.co/ for images.

Include sections: navbar, hero, about, services/skills, projects, contact form, footer.
Theme: ${theme}. Make it responsive.
Keep total output COMPACT - under 3500 tokens.`;

    const userPrompt = `Create a ${theme} website for "${businessName}" (${category}).
Description: ${description}

Return the JSON now.`;

    if (stream) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.6,
          max_tokens: 8000,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(JSON.stringify({ error: "AI generation failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let fullContent = "";

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = decoder.decode(chunk);
          fullContent += extractContent(text);
          controller.enqueue(chunk);
        },
        async flush(controller) {
          try {
            const parsed = cleanAndParseJSON(fullContent);
            const websiteData = parsed || {
              html: fullContent,
              css: "",
              js: "",
              sections: [{ type: "hero", title: businessName, content: description }],
            };

            await adminClient
              .from("websites")
              .insert({
                user_id: user.id,
                name: businessName,
                category,
                description,
                theme,
                html_content: (websiteData.html as string) || "",
                css_content: (websiteData.css as string) || "",
                js_content: (websiteData.js as string) || "",
                preview_data: (websiteData.sections as unknown[]) || [],
              });

            const { data: existingUsage } = await adminClient
              .from("daily_usage")
              .select("id, generation_count")
              .eq("user_id", user.id)
              .eq("usage_date", today)
              .single();

            if (existingUsage) {
              await adminClient
                .from("daily_usage")
                .update({ generation_count: existingUsage.generation_count + 1 })
                .eq("id", existingUsage.id);
            } else {
              await adminClient
                .from("daily_usage")
                .insert({ user_id: user.id, usage_date: today, generation_count: 1 });
            }
          } catch (e) {
            console.error("DB save error after stream:", e);
          }
        }
      });

      const readableStream = response.body!.pipeThrough(transformStream);

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming mode (fallback)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again in a moment." }), {
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
      throw new Error("AI generation failed");
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    const parsed = cleanAndParseJSON(rawContent);
    const websiteData = parsed || {
      html: rawContent,
      css: "",
      js: "",
      sections: [
        { type: "hero", title: businessName, content: description },
        { type: "about", title: "About Us", content: `${businessName} is a leading ${category} company.` },
      ],
    };

    const { data: website, error: dbError } = await adminClient
      .from("websites")
      .insert({
        user_id: user.id,
        name: businessName,
        category,
        description,
        theme,
        html_content: (websiteData.html as string) || "",
        css_content: (websiteData.css as string) || "",
        js_content: (websiteData.js as string) || "",
        preview_data: (websiteData.sections as unknown[]) || [],
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to save website");
    }

    const { data: existingUsage } = await adminClient
      .from("daily_usage")
      .select("id, generation_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .single();

    if (existingUsage) {
      await adminClient
        .from("daily_usage")
        .update({ generation_count: existingUsage.generation_count + 1 })
        .eq("id", existingUsage.id);
    } else {
      await adminClient
        .from("daily_usage")
        .insert({ user_id: user.id, usage_date: today, generation_count: 1 });
    }

    return new Response(
      JSON.stringify({ website, generated: websiteData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-website error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractContent(sseText: string): string {
  let content = "";
  const lines = sseText.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ") && line !== "data: [DONE]") {
      try {
        const data = JSON.parse(line.slice(6));
        content += data.choices?.[0]?.delta?.content || "";
      } catch {
        // skip
      }
    }
  }
  return content;
}
