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

    const systemPrompt = `You are an elite website editor and full-stack developer. You will receive existing website code (HTML, CSS, JS) and a user's edit request.

Apply the requested changes and return the COMPLETE updated code as a JSON object with keys: html, css, js.

RULES:
1. Return ONLY raw JSON. No markdown. No backticks. No explanation.
2. "html" = inner body HTML only. NO <!DOCTYPE>, <html>, <head>, <body> tags.
3. "css" = all CSS including @import for fonts.
4. "js" = all JavaScript.
5. Preserve ALL existing functionality unless the user asks to remove it.
6. Apply ONLY the changes the user requested.
7. Maintain professional design quality - proper spacing, typography, colors.

MULTI-LANGUAGE BACKEND SUPPORT:
- If user asks to add backend code (Python, Flask, PHP, C, C++, MySQL, SQLite, etc.), include it as commented instructions or setup scripts within the JS section.
- For Python/Flask: provide a complete app.py structure as a comment block.
- For database: provide SQL schema and setup instructions.
- For any language: provide clear, runnable code examples.

DESIGN QUALITY:
- Ensure all changes maintain visual consistency.
- Use smooth transitions and modern CSS.
- Keep responsive design intact.
- Use proper color contrast and spacing.`;

    const userPrompt = `Current HTML:\n${currentHtml || "(empty)"}\n\nCurrent CSS:\n${currentCss || "(empty)"}\n\nCurrent JS:\n${currentJs || "(empty)"}\n\nUser's edit request: ${prompt}\n\nApply the changes and return the updated JSON now.`;

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
        temperature: 0.5,
        max_tokens: 16000,
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
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    const parsed = cleanAndParseJSON(rawContent);
    if (!parsed) throw new Error("Failed to parse AI response");

    const updatedData = {
      html: (parsed.html as string) || currentHtml || "",
      css: (parsed.css as string) || currentCss || "",
      js: (parsed.js as string) || currentJs || "",
    };

    // Save to DB if websiteId provided
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
  if (lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else {
    cleaned = cleaned.substring(firstBrace);
    cleaned = repairJSON(cleaned);
  }
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(cleaned); } catch {
    try { return JSON.parse(repairJSON(cleaned)); } catch { return null; }
  }
}

function repairJSON(json: string): string {
  let result = json.replace(/,\s*$/, "");
  let inString = false, escape = false;
  const stack: string[] = [];
  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inString) result += '"';
  while (stack.length > 0) result += stack.pop();
  return result;
}
