import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function cleanAndParseJSON(raw: string): Record<string, unknown> | null {
  let cleaned = raw.replace(/^```(?:json)?\s*/gim, "").replace(/```\s*$/gim, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) return null;
  if (lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else {
    cleaned = cleaned.substring(firstBrace);
    cleaned = repairTruncatedJSON(cleaned);
  }
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(cleaned); } catch {
    try { return JSON.parse(repairTruncatedJSON(cleaned)); } catch { return null; }
  }
}

function repairTruncatedJSON(json: string): string {
  let result = json.replace(/,\s*$/, "");
  let inString = false, escape = false;
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
  if (inString) result += '"';
  while (stack.length > 0) result += stack.pop();
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

    const systemPrompt = `You are an elite, world-class website developer and designer. You produce pixel-perfect, visually stunning, production-ready websites that look like they were built by a top design agency.

OUTPUT FORMAT: Return ONLY raw JSON with keys: html, css, js, sections. NO markdown, NO backticks, NO explanation.

DESIGN EXCELLENCE RULES:
1. "html" = inner body HTML only. NO <!DOCTYPE>, <html>, <head>, <body> tags.
2. Use modern, semantic HTML5 (header, nav, main, section, article, footer).
3. Include Font Awesome 6 CDN via @import in CSS: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css
4. Use https://placehold.co/ for placeholder images with proper dimensions.
5. Every element must have thoughtful spacing, typography, and visual hierarchy.

CSS MASTERY:
- Use CSS custom properties (variables) for colors, fonts, spacing.
- Include a Google Font import (@import) that matches the theme.
- Use gradients, box-shadows, backdrop-filter for depth.
- Smooth transitions on all interactive elements (0.3s ease).
- Mobile-first responsive design with clean breakpoints.
- Use grid and flexbox for layouts.
- Add subtle hover effects on cards, buttons, links.
- Keep CSS well-organized: variables → resets → typography → layout → components → responsive.

JAVASCRIPT FEATURES:
- Smooth scroll navigation.
- Mobile hamburger menu toggle.
- Scroll-triggered fade-in animations using IntersectionObserver.
- Sticky header with background change on scroll.
- Form validation with visual feedback.
- Dark/light mode toggle if theme is "dark".

REQUIRED SECTIONS (in order):
1. Navigation bar - sticky, responsive, with logo and CTA button
2. Hero section - large heading, subtitle, dual CTAs, background visual
3. About/Features section - icon cards in grid
4. Services/Skills section - detailed cards with icons
5. Projects/Portfolio - image cards with hover overlay
6. Testimonials - carousel or grid with avatars
7. Contact form - styled inputs with validation
8. Footer - multi-column with links, social icons, copyright

QUALITY STANDARDS:
- Professional color palette with proper contrast ratios.
- Consistent spacing system (8px grid).
- Typography hierarchy: distinct h1-h6 sizes.
- All images have alt text.
- Interactive elements have focus states.
- Animations are smooth and not excessive.

"sections" = [{type, title, content}] array describing each section.
Theme: ${theme}. Category: ${category}.
Produce COMPLETE, POLISHED output. This should look like a real production website.`;

    const userPrompt = `Build a stunning ${theme} website for "${businessName}" (${category} industry).

Description: ${description}

Make it look absolutely professional and modern. Every detail matters - typography, colors, spacing, animations. This should impress anyone who sees it. Return the complete JSON now.`;

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
          temperature: 0.7,
          max_tokens: 32000,
          stream: true,
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
        return new Response(JSON.stringify({ error: "AI generation failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const decoder = new TextDecoder();
      let fullContent = "";

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = decoder.decode(chunk);
          fullContent += extractContent(text);
          controller.enqueue(chunk);
        },
        async flush() {
          try {
            const parsed = cleanAndParseJSON(fullContent);
            const websiteData = parsed || {
              html: fullContent, css: "", js: "",
              sections: [{ type: "hero", title: businessName, content: description }],
            };

            await adminClient.from("websites").insert({
              user_id: user.id, name: businessName, category, description, theme,
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
              await adminClient.from("daily_usage")
                .update({ generation_count: existingUsage.generation_count + 1 })
                .eq("id", existingUsage.id);
            } else {
              await adminClient.from("daily_usage")
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

    // Non-streaming fallback
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
        temperature: 0.7,
        max_tokens: 32000,
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
      html: rawContent, css: "", js: "",
      sections: [
        { type: "hero", title: businessName, content: description },
        { type: "about", title: "About Us", content: `${businessName} is a leading ${category} company.` },
      ],
    };

    const { data: website, error: dbError } = await adminClient
      .from("websites")
      .insert({
        user_id: user.id, name: businessName, category, description, theme,
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

function extractContent(sseText: string): string {
  let content = "";
  const lines = sseText.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ") && line !== "data: [DONE]") {
      try {
        const data = JSON.parse(line.slice(6));
        content += data.choices?.[0]?.delta?.content || "";
      } catch { /* skip */ }
    }
  }
  return content;
}
