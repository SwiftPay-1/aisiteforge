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

// Providers that should NEVER use tool calling (they fail or return broken formats)
const NO_TOOL_PROVIDERS = ["groq", "huggingface", "replicate"];

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

    // Get system prompt from DB (use default or first active)
    const systemPrompt = await getSystemPrompt(adminClient);
    const userPrompt = buildUserPrompt(businessName, category, description, theme);

    const selectedModel = modelId || (provider.models[0]?.id) || "llama-3.3-70b-versatile";
    // Never use tools for providers known to fail
    const useTools = !NO_TOOL_PROVIDERS.includes(provider.name);

    // Try with selected provider
    let websiteData = await tryGenerate(provider, apiKey, systemPrompt, userPrompt, selectedModel, useTools);

    if (!websiteData) {
      // Fallback: try Lovable AI gateway
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        console.log("Falling back to Lovable AI gateway");
        websiteData = await tryLovableGateway(LOVABLE_API_KEY, systemPrompt, userPrompt);
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
        const altUseTools = !NO_TOOL_PROVIDERS.includes(altProvider.name);
        websiteData = await tryGenerate(altConfig, altKey, systemPrompt, userPrompt, defaultModel, altUseTools);
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

async function getSystemPrompt(adminClient: any): Promise<string> {
  // Try to get default prompt from DB
  const { data: defaultPrompt } = await adminClient
    .from("system_prompts")
    .select("prompt_text")
    .eq("is_default", true)
    .eq("is_active", true)
    .single();
  
  if (defaultPrompt?.prompt_text) return defaultPrompt.prompt_text;

  // Fallback to any active prompt
  const { data: anyPrompt } = await adminClient
    .from("system_prompts")
    .select("prompt_text")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .single();

  if (anyPrompt?.prompt_text) return anyPrompt.prompt_text;

  // Hardcoded fallback
  return buildFallbackSystemPrompt();
}

function buildFallbackSystemPrompt(): string {
  return `You are a world-class web developer. Return ONLY a valid JSON object with keys: html, css, js, sections.
- html = inner body HTML only (no DOCTYPE/html/head/body tags)
- css = complete CSS with @import for Google Fonts and Font Awesome 6
- js = complete JavaScript
- sections = array of {type, title, content}
IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks.`;
}

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
  modelId?: string,
  useTools: boolean = false
): Promise<{ html: string; css: string; js: string; sections: any[] } | null> {
  if (!apiKey || !provider.base_url) return null;

  const model = modelId || (provider.models[0]?.id) || "llama-3.3-70b-versatile";

  const providerMaxTokens: Record<string, number> = {
    groq: 32000, google: 64000, openai: 16000, deepseek: 64000, xai: 32000, huggingface: 16000,
  };
  const maxTokens = providerMaxTokens[provider.name] || 32000;

  try {
    console.log(`Trying provider: ${provider.name}, model: ${model}, useTools: ${useTools}`);

    const body: any = {
      model,
      messages: [
        { role: "system", content: systemPrompt + "\n\nIMPORTANT: Return ONLY a raw JSON object. No markdown code blocks, no explanations, no ```json wrapping. Just the pure JSON starting with { and ending with }." },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    };

    // Add response_format for providers that support it
    if (provider.name === "groq" || provider.name === "openai" || provider.name === "deepseek") {
      body.response_format = { type: "json_object" };
    }

    if (useTools) {
      body.tools = buildTools();
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
      console.error(`Provider ${provider.name} error: ${response.status} ${errorText}`);
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
): Promise<{ html: string; css: string; js: string; sections: any[] } | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt + "\n\nReturn ONLY valid JSON. No markdown." },
          { role: "user", content: userPrompt },
        ],
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
  // 1. Try tool call first
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      if (args.html || args.css) {
        console.log("Extracted from tool_call");
        return { html: args.html || "", css: args.css || "", js: args.js || "", sections: args.sections || [] };
      }
    } catch { /* fall through */ }
  }

  const rawContent = aiData.choices?.[0]?.message?.content || "";
  if (!rawContent || rawContent.length < 50) return null;

  // 2. Try parsing content that starts with <function=create_website> (Groq format)
  const funcMatch = rawContent.match(/<function=create_website>([\s\S]*?)(?:<\/function>|$)/);
  if (funcMatch) {
    const parsed = cleanAndParseJSON(funcMatch[1]);
    if (parsed && (parsed.html || parsed.css)) {
      console.log("Extracted from <function> tag format");
      return { html: (parsed.html as string) || "", css: (parsed.css as string) || "", js: (parsed.js as string) || "", sections: (parsed.sections as any[]) || [] };
    }
  }

  // 3. Try direct JSON parse of entire content
  const parsed = cleanAndParseJSON(rawContent);
  if (parsed && (parsed.html || parsed.css)) {
    console.log("Extracted from direct JSON parse");
    return { html: (parsed.html as string) || "", css: (parsed.css as string) || "", js: (parsed.js as string) || "", sections: (parsed.sections as any[]) || [] };
  }

  // 4. Try extracting from markdown code blocks
  const jsonBlockMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    const blockParsed = cleanAndParseJSON(jsonBlockMatch[1]);
    if (blockParsed && (blockParsed.html || blockParsed.css)) {
      console.log("Extracted from markdown JSON block");
      return { html: (blockParsed.html as string) || "", css: (blockParsed.css as string) || "", js: (blockParsed.js as string) || "", sections: (blockParsed.sections as any[]) || [] };
    }
  }

  // 5. Extract separate HTML/CSS/JS code blocks
  const htmlMatch = rawContent.match(/```html\s*([\s\S]*?)```/i);
  const cssMatch = rawContent.match(/```css\s*([\s\S]*?)```/i);
  const jsMatch = rawContent.match(/```(?:javascript|js)\s*([\s\S]*?)```/i);
  if (htmlMatch || cssMatch || jsMatch) {
    console.log("Extracted from separate code blocks");
    return {
      html: htmlMatch?.[1]?.trim() || "",
      css: cssMatch?.[1]?.trim() || "",
      js: jsMatch?.[1]?.trim() || "",
      sections: [],
    };
  }

  // 6. Last resort: if content looks like HTML, treat as HTML
  if (rawContent.includes("<") && rawContent.includes(">") && rawContent.length > 200) {
    console.log("Treating raw content as HTML");
    return { html: rawContent, css: "", js: "", sections: [] };
  }

  return null;
}

function cleanAndParseJSON(raw: string): Record<string, unknown> | null {
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

function buildUserPrompt(businessName: string, category: string, description: string, theme: string): string {
  return `Build a COMPLETE, PRODUCTION-READY ${theme} website for "${businessName}" (${category}).
Business description: ${description}

Create ALL 8 sections (hero, nav, about, services/features, portfolio/gallery, testimonials, contact, footer) with realistic content. Make it look like a $5000+ agency-built website. Use colors and styling that match the "${theme}" theme perfectly.

Return ONLY a JSON object with keys: html, css, js, sections.`;
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
        required: ["html", "css", "js"],
        additionalProperties: false,
      },
    },
  }];
}
