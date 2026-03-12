import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProviderConfig {
  id: string;
  name: string;
  base_url: string;
  models: { id: string; name: string; supports_tools?: boolean }[];
}

interface ApiKeyConfig {
  id: string;
  api_key: string;
  provider_id: string;
}

// Models known to NOT support tool calling
const NO_TOOL_SUPPORT = [
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "gemma-7b-it",
];

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

    // Check plan and daily usage
    const { data: profile } = await adminClient.from("profiles").select("plan").eq("user_id", user.id).single();
    const plan = profile?.plan || "free";

    if (plan === "free") {
      const { data: usage } = await adminClient.from("daily_usage").select("generation_count").eq("user_id", user.id).eq("usage_date", today).single();
      if (usage && usage.generation_count >= 3) {
        return new Response(JSON.stringify({ error: "Daily limit reached (3/day). Upgrade to Pro for unlimited!" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { businessName, category, description, theme, providerId, modelId } = await req.json();

    // Get provider and keys from DB
    const { provider, apiKey } = await getProviderAndKey(adminClient, providerId);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(businessName, category, description, theme);
    const tools = buildTools();

    const selectedModel = modelId || (provider.models[0]?.id) || "deepseek-chat";
    const useTools = !NO_TOOL_SUPPORT.includes(selectedModel);

    // Try with selected provider
    let websiteData = await tryGenerate(provider, apiKey, systemPrompt, userPrompt, tools, selectedModel, useTools);

    if (!websiteData) {
      // Fallback: try Lovable AI gateway
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        console.log("Falling back to Lovable AI gateway");
        websiteData = await tryLovableGateway(LOVABLE_API_KEY, systemPrompt, userPrompt, tools);
      }
    }

    if (!websiteData) {
      // Try other providers with available keys
      const { data: allProviders } = await adminClient.from("ai_providers").select("*").eq("is_active", true).neq("id", provider.id).order("sort_order");
      for (const altProvider of (allProviders || [])) {
        const { data: altKeys } = await adminClient.from("ai_api_keys").select("*").eq("provider_id", altProvider.id).eq("is_active", true);
        if (!altKeys?.length) continue;
        const altKey = altKeys[Math.floor(Math.random() * altKeys.length)];
        const altConfig: ProviderConfig = { id: altProvider.id, name: altProvider.name, base_url: altProvider.base_url, models: altProvider.models || [] };
        const defaultModel = (altProvider.models as any[])?.[0]?.id;
        const altUseTools = !NO_TOOL_SUPPORT.includes(defaultModel || "");
        websiteData = await tryGenerate(altConfig, altKey, systemPrompt, userPrompt, tools, defaultModel, altUseTools);
        if (websiteData) {
          await adminClient.from("ai_api_keys").update({ usage_count: (altKey.usage_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", altKey.id);
          break;
        }
      }
    }

    if (!websiteData) {
      return new Response(JSON.stringify({ error: "All AI providers failed. Please check your API keys in admin settings." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save website
    const { data: website, error: dbError } = await adminClient.from("websites").insert({
      user_id: user.id, name: businessName, category, description, theme,
      html_content: websiteData.html, css_content: websiteData.css,
      js_content: websiteData.js, preview_data: websiteData.sections,
    }).select().single();

    if (dbError) { console.error("DB error:", dbError); throw new Error("Failed to save website"); }

    // Update daily usage
    const { data: existingUsage } = await adminClient.from("daily_usage").select("id, generation_count").eq("user_id", user.id).eq("usage_date", today).single();
    if (existingUsage) {
      await adminClient.from("daily_usage").update({ generation_count: existingUsage.generation_count + 1 }).eq("id", existingUsage.id);
    } else {
      await adminClient.from("daily_usage").insert({ user_id: user.id, usage_date: today, generation_count: 1 });
    }

    // Update API key usage count
    if (apiKey?.id) {
      await adminClient.from("ai_api_keys").update({ usage_count: (apiKey.usage_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", apiKey.id);
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

async function getProviderAndKey(adminClient: any, requestedProviderId?: string) {
  let provider: ProviderConfig;
  let apiKey: ApiKeyConfig & { usage_count?: number } | null = null;

  if (requestedProviderId) {
    const { data: p } = await adminClient.from("ai_providers").select("*").eq("id", requestedProviderId).eq("is_active", true).single();
    if (p) {
      provider = { id: p.id, name: p.name, base_url: p.base_url, models: p.models || [] };
      const { data: keys } = await adminClient.from("ai_api_keys").select("*").eq("provider_id", p.id).eq("is_active", true).order("usage_count");
      if (keys?.length) apiKey = keys[0];
    }
  }

  if (!provider!) {
    const { data: p } = await adminClient.from("ai_providers").select("*").eq("is_default", true).eq("is_active", true).single();
    if (p) {
      provider = { id: p.id, name: p.name, base_url: p.base_url, models: p.models || [] };
      const { data: keys } = await adminClient.from("ai_api_keys").select("*").eq("provider_id", p.id).eq("is_active", true).order("usage_count");
      if (keys?.length) apiKey = keys[0];
    }
  }

  if (!provider!) {
    const { data: providers } = await adminClient.from("ai_providers").select("*").eq("is_active", true).order("sort_order");
    for (const p of (providers || [])) {
      const { data: keys } = await adminClient.from("ai_api_keys").select("*").eq("provider_id", p.id).eq("is_active", true).order("usage_count");
      if (keys?.length) {
        provider = { id: p.id, name: p.name, base_url: p.base_url, models: p.models || [] };
        apiKey = keys[0];
        break;
      }
    }
  }

  if (!provider!) {
    provider = { id: "", name: "lovable", base_url: "", models: [] };
  }

  return { provider, apiKey };
}

async function tryGenerate(
  provider: ProviderConfig,
  apiKey: ApiKeyConfig | null,
  systemPrompt: string,
  userPrompt: string,
  tools: any[],
  modelId?: string,
  useTools: boolean = true
): Promise<{ html: string; css: string; js: string; sections: any[] } | null> {
  if (!apiKey || !provider.base_url) return null;

  const model = modelId || (provider.models[0]?.id) || "deepseek-chat";

  // Set max_tokens based on provider limits
  const providerMaxTokens: Record<string, number> = {
    groq: 32000,
    google: 64000,
    openai: 16000,
    deepseek: 64000,
    xai: 32000,
    huggingface: 16000,
    replicate: 16000,
  };
  const maxTokens = providerMaxTokens[provider.name] || 32000;

  try {
    console.log(`Trying provider: ${provider.name}, model: ${model}, tools: ${useTools}`);

    const body: any = {
      model,
      messages: [
        { role: "system", content: useTools ? systemPrompt : systemPrompt + "\n\nIMPORTANT: Return your response as a JSON object with keys: html, css, js, sections. The sections key should be an array of objects with type, title, content." },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    };

    // Only add tools if model supports it
    if (useTools) {
      body.tools = tools;
      body.tool_choice = { type: "function", function: { name: "create_website" } };
    }

    const response = await fetch(provider.base_url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Provider ${provider.name} error:`, response.status, errorText);

      // If tool_choice caused the error, retry without tools
      if (useTools && (response.status === 400 || response.status === 422)) {
        console.log(`Retrying ${provider.name} without tool_choice...`);
        return tryGenerate(provider, apiKey, systemPrompt, userPrompt, tools, modelId, false);
      }
      return null;
    }

    const aiData = await response.json();
    return extractWebsiteData(aiData);
  } catch (e) {
    console.error(`Provider ${provider.name} exception:`, e);
    return null;
  }
}

async function tryLovableGateway(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  tools: any[]
): Promise<{ html: string; css: string; js: string; sections: any[] } | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "create_website" } },
        max_tokens: 64000,
      }),
    });

    if (!response.ok) {
      console.error("Lovable gateway error:", response.status);
      return null;
    }

    const aiData = await response.json();
    return extractWebsiteData(aiData);
  } catch (e) {
    console.error("Lovable gateway exception:", e);
    return null;
  }
}

function extractWebsiteData(aiData: any): { html: string; css: string; js: string; sections: any[] } | null {
  // Try tool call first
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      return { html: args.html || "", css: args.css || "", js: args.js || "", sections: args.sections || [] };
    } catch { /* fall through */ }
  }

  // Try parsing content as JSON
  const rawContent = aiData.choices?.[0]?.message?.content || "";
  const parsed = cleanAndParseJSON(rawContent);
  if (parsed && (parsed.html || parsed.css)) {
    return { html: (parsed.html as string) || "", css: (parsed.css as string) || "", js: (parsed.js as string) || "", sections: (parsed.sections as any[]) || [] };
  }

  // Last resort: treat entire content as HTML
  if (rawContent && rawContent.length > 100) {
    return { html: rawContent, css: "", js: "", sections: [] };
  }

  return null;
}

function cleanAndParseJSON(raw: string): Record<string, unknown> | null {
  let cleaned = raw.replace(/^```(?:json)?\s*/gim, "").replace(/```\s*$/gim, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1) return null;
  if (lastBrace > firstBrace) cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(cleaned); } catch { /* try repair */ }

  // Repair truncated JSON
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

function buildSystemPrompt(): string {
  return `You are a world-class web developer building PRODUCTION-READY, FULLY COMPLETE websites that look like they were built by a top agency.

OUTPUT FORMAT:
- HTML = inner body HTML only. NEVER include <!DOCTYPE>, <html>, <head>, <body> tags.
- CSS = complete CSS starting with @import for Google Fonts (pick 2 complementary fonts) and Font Awesome 6 CDN: @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
- JS = complete JavaScript for all interactivity.
- ALL HTML tags MUST be properly closed.

DESIGN REQUIREMENTS - THIS IS CRITICAL:
1. HERO SECTION: Full-viewport hero with gradient/image background, large compelling headline, subtitle, and 1-2 CTA buttons. Must feel premium.
2. NAVIGATION: Sticky/fixed nav with logo, menu links, and a CTA button. Must include working mobile hamburger menu.
3. ABOUT/STORY SECTION: Two-column layout with image and text. Include statistics/counters.
4. SERVICES/FEATURES: Grid of 4-6 cards with icons (Font Awesome), titles, and descriptions with hover effects.
5. PORTFOLIO/GALLERY: Grid of 4-6 items with overlay hover effects.
6. TESTIMONIALS: 3 testimonial cards with avatar, quote, name, and star ratings.
7. CONTACT SECTION: Split layout - contact info on one side, contact form on the other.
8. FOOTER: Multi-column footer with links, social icons, newsletter signup, and copyright.

CSS QUALITY REQUIREMENTS:
- Use CSS custom properties (--primary-color, --secondary-color, etc.)
- Smooth transitions on ALL interactive elements (0.3s ease)
- Box shadows for depth, gradient backgrounds
- Responsive breakpoints: 1200px, 992px, 768px, 576px
- Scroll-triggered fade-in animations
- Professional spacing: generous padding (60-100px vertical sections)
- Typography hierarchy: h1 (3-4rem), h2 (2-2.5rem), h3 (1.3-1.5rem), body (1rem-1.1rem)

JS REQUIREMENTS:
- Smooth scroll for anchor links
- Mobile hamburger menu toggle
- Scroll-triggered fade-in animations using IntersectionObserver
- Sticky navbar background change on scroll
- Form validation, Back-to-top button

IMAGE PLACEHOLDERS: Use https://placehold.co/ with meaningful dimensions.

The website MUST look like a real, production website.`;
}

function buildUserPrompt(businessName: string, category: string, description: string, theme: string): string {
  return `Build a COMPLETE, PRODUCTION-READY ${theme} website for "${businessName}" (${category}).
Business description: ${description}

Create ALL 8 sections (hero, nav, about, services/features, portfolio/gallery, testimonials, contact, footer) with realistic content. Make it look like a $5000+ agency-built website. Use colors and styling that match the "${theme}" theme perfectly.`;
}

function buildTools(): any[] {
  return [{
    type: "function",
    function: {
      name: "create_website",
      description: "Create a complete, production-ready website with all 8 sections",
      parameters: {
        type: "object",
        properties: {
          html: { type: "string", description: "Complete inner body HTML with ALL 8 sections." },
          css: { type: "string", description: "Complete CSS with @import for Google Fonts and Font Awesome 6. 300+ lines." },
          js: { type: "string", description: "Complete JavaScript: smooth scroll, mobile menu, animations, form validation." },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: { type: { type: "string" }, title: { type: "string" }, content: { type: "string" } },
              required: ["type", "title", "content"],
              additionalProperties: false,
            },
          },
        },
        required: ["html", "css", "js", "sections"],
        additionalProperties: false,
      },
    },
  }];
}
