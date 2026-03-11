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

    const systemPrompt = `You are a world-class web developer building PRODUCTION-READY, FULLY COMPLETE websites that look like they were built by a top agency.

OUTPUT FORMAT:
- HTML = inner body HTML only. NEVER include <!DOCTYPE>, <html>, <head>, <body> tags.
- CSS = complete CSS starting with @import for Google Fonts (pick 2 complementary fonts) and Font Awesome 6 CDN: @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
- JS = complete JavaScript for all interactivity.
- ALL HTML tags MUST be properly closed.

DESIGN REQUIREMENTS - THIS IS CRITICAL:
1. HERO SECTION: Full-viewport hero with gradient/image background, large compelling headline, subtitle, and 1-2 CTA buttons. Must feel premium.
2. NAVIGATION: Sticky/fixed nav with logo, menu links, and a CTA button. Must include working mobile hamburger menu.
3. ABOUT/STORY SECTION: Two-column layout with image and text. Include statistics/counters (e.g., "500+ Clients", "10 Years Experience").
4. SERVICES/FEATURES: Grid of 4-6 cards with icons (Font Awesome), titles, and descriptions. Each card should have hover effects.
5. PORTFOLIO/GALLERY: Grid of 4-6 items with overlay hover effects showing titles.
6. TESTIMONIALS: 3 testimonial cards with avatar, quote, name, and star ratings.
7. CONTACT SECTION: Split layout - contact info (address, phone, email, hours, social links) on one side, contact form on the other.
8. FOOTER: Multi-column footer with links, social icons, newsletter signup, and copyright.

CSS QUALITY REQUIREMENTS:
- Use CSS custom properties (--primary-color, --secondary-color, --accent-color, --text-color, --bg-color, etc.)
- Smooth transitions on ALL interactive elements (0.3s ease)
- Box shadows for depth and elevation on cards
- Gradient backgrounds where appropriate
- Responsive breakpoints: 1200px, 992px, 768px, 576px
- Use flexbox AND grid appropriately
- Scroll-triggered fade-in animations
- Professional spacing: generous padding (60-100px vertical sections)
- Typography hierarchy: distinct sizes for h1 (3-4rem), h2 (2-2.5rem), h3 (1.3-1.5rem), body (1rem-1.1rem)

JS REQUIREMENTS:
- Smooth scroll for anchor links
- Mobile hamburger menu toggle with animation
- Scroll-triggered fade-in animations using IntersectionObserver
- Sticky navbar background change on scroll
- Form validation with user feedback
- Back-to-top button

IMAGE PLACEHOLDERS: Use https://placehold.co/ with meaningful dimensions (e.g., 800x500 for hero, 400x300 for cards, 80x80 for avatars).

The website MUST look like a real, production website - NOT a template or demo. Every section must have real-looking content, proper spacing, and professional polish.`;

    const userPrompt = `Build a COMPLETE, PRODUCTION-READY ${theme} website for "${businessName}" (${category}).
Business description: ${description}

Create ALL 8 sections (hero, nav, about, services/features, portfolio/gallery, testimonials, contact, footer) with realistic content tailored to this specific business. Make it look like a $5000+ agency-built website. Use colors and styling that match the "${theme}" theme perfectly.`;

    // Use tool calling to FORCE structured JSON output
    const tools = [
      {
        type: "function",
        function: {
          name: "create_website",
          description: "Create a complete, production-ready website with all 8 sections",
          parameters: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "Complete inner body HTML with ALL 8 sections (nav, hero, about, services, portfolio, testimonials, contact, footer). No DOCTYPE/html/head/body wrapper tags. Must be extensive and production-ready."
              },
              css: {
                type: "string",
                description: "Complete CSS with @import for Google Fonts and Font Awesome 6. Include CSS custom properties, responsive breakpoints (1200px, 992px, 768px, 576px), hover effects, transitions, animations, box-shadows, gradients. Must be 300+ lines."
              },
              js: {
                type: "string",
                description: "Complete JavaScript: smooth scroll, mobile hamburger menu, IntersectionObserver animations, sticky navbar scroll effect, form validation, back-to-top button."
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
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "create_website" } },
        max_completion_tokens: 100000,
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
