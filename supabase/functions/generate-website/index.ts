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

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check plan limits
    const today = new Date().toISOString().split("T")[0];
    const { data: profile } = await adminClient.from("profiles").select("plan").eq("user_id", user.id).single();
    if ((profile?.plan || "free") === "free") {
      const { data: usage } = await adminClient.from("daily_usage").select("generation_count").eq("user_id", user.id).eq("usage_date", today).single();
      if (usage && usage.generation_count >= 3) {
        return new Response(JSON.stringify({ error: "Daily limit reached (3/day). Upgrade to Pro for unlimited!" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { businessName, category, description, theme } = await req.json();

    // Fetch pipeline stages and prompts
    const { data: stages } = await adminClient.from("pipeline_stages").select("*").eq("is_active", true).order("stage_order");
    const { data: allPrompts } = await adminClient.from("pipeline_prompts").select("*").eq("is_active", true).order("sort_order");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const userPrompt = `Build a COMPLETE, PRODUCTION-READY ${theme} website for "${businessName}" (${category}).
Business description: ${description}

CRITICAL RULES:
- Create ALL 8 sections (hero, nav, about, services/features, portfolio/gallery, testimonials, contact, footer) with realistic content.
- DO NOT use any images (<img> tags) unless the user specifically asks for images. Instead, use CSS-based 3D designs, gradients, geometric shapes, SVG patterns, CSS animations, and creative visual elements to make it visually stunning.
- Use CSS 3D transforms, perspective, box-shadows, and gradients to create depth and visual interest.
- Make it look like a $5000+ agency-built website.
- Use colors and styling that match the "${theme}" theme perfectly.
- Return ONLY a JSON object with keys: html, css, js, sections.`;

    // ===== STAGE 1: BREAKDOWN =====
    const breakdownStage = stages?.find((s: any) => s.name === "breakdown");
    const breakdownPrompt = getStagePrompt(allPrompts, breakdownStage?.id);
    
    console.log("Stage 1: Breaking down prompt...");
    const breakdownResult = await callLovableAI(LOVABLE_API_KEY, 
      breakdownPrompt || "You are a requirements analyst. Break down the user's website request into detailed technical requirements. List sections needed, design elements, color scheme, typography, animations, and functionality. Be specific and thorough. Return as structured text.",
      userPrompt,
      "google/gemini-2.5-flash"
    );
    console.log("Breakdown complete:", breakdownResult?.substring(0, 200));

    // ===== STAGE 2: CODE GENERATION =====
    const codegenStage = stages?.find((s: any) => s.name === "code_generation");
    const codegenPrompt = getStagePrompt(allPrompts, codegenStage?.id);
    
    // Try stage-specific provider first, fallback to Lovable AI
    let websiteData = null;
    
    // Try with configured provider for code generation stage
    if (codegenStage?.default_provider) {
      websiteData = await tryStageProvider(adminClient, codegenStage, codegenPrompt, userPrompt, breakdownResult);
    }
    
    // Fallback to Lovable AI gateway
    if (!websiteData) {
      console.log("Stage 2: Generating code via Lovable AI...");
      const systemPrompt = codegenPrompt || buildDefaultCodegenPrompt();
      const enhancedPrompt = `${userPrompt}\n\n--- REQUIREMENTS BREAKDOWN ---\n${breakdownResult || "Standard 8-section website"}`;
      
      const codeResult = await callLovableAI(LOVABLE_API_KEY, 
        systemPrompt + "\n\nIMPORTANT: Return ONLY a raw JSON object with keys: html, css, js, sections. No markdown, no code blocks. Just pure JSON starting with { and ending with }.",
        enhancedPrompt,
        "google/gemini-2.5-flash"
      );
      websiteData = parseWebsiteJSON(codeResult);
    }

    if (!websiteData) {
      return new Response(JSON.stringify({ error: "Code generation failed. Please try again." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== STAGE 3: BUG FINDER =====
    const bugStage = stages?.find((s: any) => s.name === "bug_finder");
    const bugPrompt = getStagePrompt(allPrompts, bugStage?.id);
    
    if (bugStage?.is_active !== false) {
      console.log("Stage 3: Finding bugs...");
      const bugReport = await callLovableAI(LOVABLE_API_KEY,
        bugPrompt || "You are a senior code reviewer. Analyze the following HTML/CSS/JS code for bugs, errors, broken layouts, missing closing tags, CSS issues, JS errors, accessibility problems, and responsive design issues. List each bug with a fix. Be thorough.",
        `Review this website code for bugs:\n\nHTML:\n${websiteData.html.substring(0, 8000)}\n\nCSS:\n${websiteData.css.substring(0, 4000)}\n\nJS:\n${websiteData.js.substring(0, 2000)}`,
        "google/gemini-2.5-flash"
      );
      console.log("Bug report:", bugReport?.substring(0, 200));

      // ===== STAGE 4: FINALIZE =====
      const finalizeStage = stages?.find((s: any) => s.name === "finalize");
      const finalizePrompt = getStagePrompt(allPrompts, finalizeStage?.id);
      
      if (finalizeStage?.is_active !== false && bugReport && bugReport.length > 50) {
        console.log("Stage 4: Finalizing code...");
        const fixedCode = await callLovableAI(LOVABLE_API_KEY,
          finalizePrompt || "You are a code fixer. Given the original code and a bug report, fix ALL identified issues. Apply patches, ensure proper closing tags, fix CSS responsive issues, and validate JS. Return ONLY a JSON object with keys: html, css, js, sections. No markdown.",
          `Original HTML:\n${websiteData.html}\n\nOriginal CSS:\n${websiteData.css}\n\nOriginal JS:\n${websiteData.js}\n\n--- BUG REPORT ---\n${bugReport}\n\nFix all bugs and return the corrected code as JSON with keys: html, css, js, sections.`,
          "google/gemini-2.5-flash"
        );
        const fixedData = parseWebsiteJSON(fixedCode);
        if (fixedData && (fixedData.html.length > 100 || fixedData.css.length > 100)) {
          console.log("Applied bug fixes");
          websiteData = fixedData;
        }
      }
    }

    // Save website
    const { data: website, error: dbError } = await adminClient.from("websites").insert({
      user_id: user.id, name: businessName, category, description, theme,
      html_content: websiteData.html, css_content: websiteData.css,
      js_content: websiteData.js, preview_data: websiteData.sections,
    }).select().single();

    if (dbError) throw new Error("Failed to save website");

    // Update daily usage
    const { data: existingUsage } = await adminClient.from("daily_usage").select("id, generation_count").eq("user_id", user.id).eq("usage_date", today).single();
    if (existingUsage) {
      await adminClient.from("daily_usage").update({ generation_count: existingUsage.generation_count + 1 }).eq("id", existingUsage.id);
    } else {
      await adminClient.from("daily_usage").insert({ user_id: user.id, usage_date: today, generation_count: 1 });
    }

    return new Response(JSON.stringify({ website, generated: websiteData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-website error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getStagePrompt(allPrompts: any[] | null, stageId?: string): string | null {
  if (!allPrompts || !stageId) return null;
  const stagePrompts = allPrompts.filter((p: any) => p.stage_id === stageId);
  const defaultPrompt = stagePrompts.find((p: any) => p.is_default);
  return (defaultPrompt || stagePrompts[0])?.prompt_text || null;
}

async function tryStageProvider(adminClient: any, stage: any, stagePrompt: string | null, userPrompt: string, breakdownResult: string | null) {
  try {
    const { data: provider } = await adminClient.from("ai_providers").select("*").eq("name", stage.default_provider).eq("is_active", true).single();
    if (!provider) return null;
    
    const { data: keys } = await adminClient.from("ai_api_keys").select("*").eq("provider_id", provider.id).eq("is_active", true).order("usage_count");
    if (!keys?.length) return null;

    const apiKey = keys[0];
    const model = stage.default_model || (provider.models as any[])?.[0]?.id;
    if (!model || !provider.base_url) return null;

    const systemPrompt = (stagePrompt || buildDefaultCodegenPrompt()) + "\n\nReturn ONLY a raw JSON object. No markdown.";
    const enhancedPrompt = `${userPrompt}\n\n--- REQUIREMENTS ---\n${breakdownResult || "Standard website"}`;

    const body: any = {
      model, temperature: 0.7, max_tokens: 32000,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: enhancedPrompt }],
    };

    if (["groq", "openai", "deepseek"].includes(provider.name)) {
      body.response_format = { type: "json_object" };
    }

    console.log(`Stage 2: Trying provider ${provider.name}, model ${model}`);
    const response = await fetch(provider.base_url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) { console.error(`Provider ${provider.name} error: ${response.status}`); return null; }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Update key usage
    await adminClient.from("ai_api_keys").update({ usage_count: (apiKey.usage_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", apiKey.id);
    
    return parseWebsiteJSON(content);
  } catch (e) {
    console.error("Stage provider error:", e);
    return null;
  }
}

async function callLovableAI(apiKey: string, systemPrompt: string, userPrompt: string, model: string = "google/gemini-2.5-flash"): Promise<string | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        max_tokens: 64000,
      }),
    });

    if (!response.ok) {
      console.error("Lovable AI error:", response.status);
      if (response.status === 429) throw new Error("Rate limited. Please try again shortly.");
      if (response.status === 402) throw new Error("AI credits exhausted. Please contact admin.");
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    if (e instanceof Error && (e.message.includes("Rate") || e.message.includes("credits"))) throw e;
    console.error("Lovable AI exception:", e);
    return null;
  }
}

function parseWebsiteJSON(raw: string | null): { html: string; css: string; js: string; sections: any[] } | null {
  if (!raw || raw.length < 50) return null;

  // Try markdown code block
  const jsonBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const toParse = jsonBlock ? jsonBlock[1] : raw;

  const parsed = cleanAndParse(toParse);
  if (parsed && (parsed.html || parsed.css)) {
    return { html: String(parsed.html || ""), css: String(parsed.css || ""), js: String(parsed.js || ""), sections: (parsed.sections as any[]) || [] };
  }

  // Separate code blocks
  const htmlMatch = raw.match(/```html\s*([\s\S]*?)```/i);
  const cssMatch = raw.match(/```css\s*([\s\S]*?)```/i);
  const jsMatch = raw.match(/```(?:javascript|js)\s*([\s\S]*?)```/i);
  if (htmlMatch || cssMatch) {
    return { html: htmlMatch?.[1]?.trim() || "", css: cssMatch?.[1]?.trim() || "", js: jsMatch?.[1]?.trim() || "", sections: [] };
  }

  // Raw HTML fallback
  if (raw.includes("<") && raw.includes(">") && raw.length > 200) {
    return { html: raw, css: "", js: "", sections: [] };
  }
  return null;
}

function cleanAndParse(raw: string): Record<string, unknown> | null {
  if (!raw || raw.length < 10) return null;
  let cleaned = raw.replace(/^```(?:json)?\s*/gim, "").replace(/```\s*$/gim, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) return null;
  if (lastBrace > firstBrace) cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  else cleaned = cleaned.substring(firstBrace);
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(cleaned); } catch { /* try repair */ }

  let repaired = cleaned.replace(/,\s*$/, "");
  let inString = false, escape = false;
  const stack: string[] = [];
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inString) repaired += '"';
  while (stack.length > 0) repaired += stack.pop();
  try { return JSON.parse(repaired); } catch { return null; }
}

function buildDefaultCodegenPrompt(): string {
  return `You are a world-class web developer. Create production-ready websites with stunning CSS-based 3D designs.

CRITICAL: DO NOT use any <img> tags or external images unless specifically requested. Instead use:
- CSS 3D transforms with perspective for depth
- Gradient backgrounds and overlays
- SVG shapes and patterns inline
- CSS animations and transitions
- Box-shadows for layered depth effects
- Geometric shapes using CSS
- Glass morphism effects

Return ONLY a valid JSON object with keys: html, css, js, sections.
- html = inner body HTML only (no DOCTYPE/html/head/body tags)
- css = complete CSS with @import for Google Fonts and Font Awesome 6, 300+ lines
- js = complete JavaScript for interactivity
- sections = array of {type, title, content}`;
}
