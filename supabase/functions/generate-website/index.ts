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

    const { businessName, category, description, theme } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const systemPrompt = `You are an elite website developer. Build a stunning, complete, professional website.

RULES:
- HTML = inner body HTML only. NEVER include <!DOCTYPE>, <html>, <head>, <body> tags.
- CSS = complete CSS with @import for Google Fonts and Font Awesome 6 CDN.
- JS = complete JavaScript for smooth scroll, mobile menu, animations.
- Use https://placehold.co/ for images.
- Use Font Awesome 6: @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
- 4-5 sections: Nav, Hero, About/Features, Contact, Footer.
- Responsive design with flexbox/grid, CSS custom properties.
- ALL HTML tags MUST be properly closed.
- Quality over quantity. Professional and polished.`;

    const userPrompt = `Build a professional ${theme} website for "${businessName}" (${category}).
Description: ${description}
Make it polished with 4-5 sections.`;

    // Use tool calling to FORCE structured JSON output
    const tools = [
      {
        type: "function",
        function: {
          name: "create_website",
          description: "Create a complete website with HTML, CSS, and JavaScript",
          parameters: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "Complete inner body HTML (no DOCTYPE/html/head/body wrapper tags). Must include all sections."
              },
              css: {
                type: "string",
                description: "Complete CSS including @import for fonts and icon libraries. Include all styles."
              },
              js: {
                type: "string",
                description: "Complete JavaScript for interactivity: smooth scroll, mobile menu toggle, animations."
              },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    title: { type: "string" },
                    content: { type: "string" }
                  },
                  required: ["type", "title", "content"],
                  additionalProperties: false
                },
                description: "Array describing each section of the website"
              }
            },
            required: ["html", "css", "js", "sections"],
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
        tool_choice: { type: "function", function: { name: "create_website" } },
        temperature: 0.7,
        max_tokens: 64000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
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
      throw new Error("AI generation failed");
    }

    const aiData = await response.json();
    
    // Extract from tool call response
    let websiteData: { html: string; css: string; js: string; sections: unknown[] };
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        websiteData = {
          html: args.html || "",
          css: args.css || "",
          js: args.js || "",
          sections: args.sections || [],
        };
      } catch {
        // Fallback: try to parse content directly
        const rawContent = aiData.choices?.[0]?.message?.content || "";
        const parsed = cleanAndParseJSON(rawContent);
        websiteData = parsed ? {
          html: (parsed.html as string) || "",
          css: (parsed.css as string) || "",
          js: (parsed.js as string) || "",
          sections: (parsed.sections as unknown[]) || [],
        } : {
          html: rawContent, css: "", js: "",
          sections: [{ type: "hero", title: businessName, content: description }],
        };
      }
    } else {
      // Fallback for non-tool-call response
      const rawContent = aiData.choices?.[0]?.message?.content || "";
      const parsed = cleanAndParseJSON(rawContent);
      websiteData = parsed ? {
        html: (parsed.html as string) || "",
        css: (parsed.css as string) || "",
        js: (parsed.js as string) || "",
        sections: (parsed.sections as unknown[]) || [],
      } : {
        html: rawContent, css: "", js: "",
        sections: [{ type: "hero", title: businessName, content: description }],
      };
    }

    const { data: website, error: dbError } = await adminClient
      .from("websites")
      .insert({
        user_id: user.id, name: businessName, category, description, theme,
        html_content: websiteData.html,
        css_content: websiteData.css,
        js_content: websiteData.js,
        preview_data: websiteData.sections,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to save website");
    }

    // Update daily usage
    const { data: existingUsage } = await adminClient
      .from("daily_usage")
      .select("id, generation_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .single();

    if (existingUsage) {
      await adminClient.from("daily_usage")
        .update({ generation_count: existingUsage.generation_count + 1 })
        .eq("id", existingUsage.id);
    } else {
      await adminClient.from("daily_usage")
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

function cleanAndParseJSON(raw: string): Record<string, unknown> | null {
  let cleaned = raw.replace(/^```(?:json)?\s*/gim, "").replace(/```\s*$/gim, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) return null;
  if (lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(cleaned); } catch { return null; }
}
