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
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check daily usage
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

    const systemPrompt = `You are an expert website builder AI. Generate a complete, modern, responsive single-page website.
    
Output format: Return ONLY a JSON object with these fields:
- html: Complete HTML content (use semantic HTML5, include all sections inline)
- css: Complete CSS styles (modern, responsive, use CSS variables, animations, gradients)
- js: JavaScript for interactivity (smooth scroll, animations, mobile menu toggle)
- sections: Array of {type, title, content} for preview

Requirements:
- The website must be fully responsive and mobile-first
- Use modern CSS (flexbox, grid, custom properties, backdrop-filter)
- Include smooth animations and transitions
- Theme style: ${theme}
- Make it production-ready and visually stunning
- Include: hero, about, services/features, testimonials, contact, footer sections
- Use placeholder images from https://placehold.co/
- Include a navigation bar with smooth scroll links`;

    const userPrompt = `Create a ${theme} themed website for "${businessName}" - a ${category} business.
Description: ${description}

Generate the complete HTML, CSS, and JS code. Make it visually impressive with the ${theme} style.`;

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

    // Parse JSON from the response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, treat the whole response as HTML
      parsed = {
        html: rawContent,
        css: "",
        js: "",
        sections: [
          { type: "hero", title: businessName, content: description },
          { type: "about", title: "About Us", content: `${businessName} is a leading ${category} company.` },
          { type: "services", title: "Our Services", content: "Professional services tailored to your needs." },
          { type: "contact", title: "Contact", content: "Get in touch with us today." },
        ],
      };
    }

    // Save to database
    const { data: website, error: dbError } = await adminClient
      .from("websites")
      .insert({
        user_id: user.id,
        name: businessName,
        category,
        description,
        theme,
        html_content: parsed.html || "",
        css_content: parsed.css || "",
        js_content: parsed.js || "",
        preview_data: parsed.sections || [],
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
      JSON.stringify({ website, generated: parsed }),
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
