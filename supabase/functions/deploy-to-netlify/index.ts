import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { projectName, html, css, js } = await req.json();
    if (!projectName || !html) throw new Error("Project name and HTML are required");

    const NETLIFY_API_KEY = Deno.env.get("NETLIFY_API_KEY");
    if (!NETLIFY_API_KEY) throw new Error("Netlify API key not configured. Ask admin to set it up.");

    // Sanitize project name
    const sanitized = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const siteName = `${sanitized}-faith`;

    // Build full HTML file
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>${css || ""}</style>
</head>
<body>
${html}
<script>${js || ""}<\/script>
</body>
</html>`;

    // Step 1: Check if site exists, create if not
    let siteId: string;
    const checkRes = await fetch(`https://api.netlify.com/api/v1/sites?name=${siteName}&filter=all`, {
      headers: { Authorization: `Bearer ${NETLIFY_API_KEY}` },
    });

    const sites = await checkRes.json();
    const existingSite = Array.isArray(sites) ? sites.find((s: any) => s.name === siteName) : null;

    if (existingSite) {
      siteId = existingSite.id;
      console.log(`Updating existing site: ${siteName}`);
    } else {
      // Create new site
      const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NETLIFY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: siteName }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error("Create site error:", err);
        throw new Error(`Failed to create site: ${createRes.status}`);
      }

      const newSite = await createRes.json();
      siteId = newSite.id;
      console.log(`Created new site: ${siteName}, id: ${siteId}`);
    }

    // Step 2: Deploy using file digest API
    // Create SHA1 hash of the file
    const encoder = new TextEncoder();
    const data = encoder.encode(fullHtml);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1 = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NETLIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: { "/index.html": sha1 },
      }),
    });

    if (!deployRes.ok) {
      const err = await deployRes.text();
      console.error("Deploy error:", err);
      throw new Error(`Deploy failed: ${deployRes.status}`);
    }

    const deploy = await deployRes.json();
    const deployId = deploy.id;

    // Step 3: Upload the file
    const uploadRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}/files/index.html`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${NETLIFY_API_KEY}`,
        "Content-Type": "application/octet-stream",
      },
      body: data,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error("Upload error:", err);
      throw new Error(`File upload failed: ${uploadRes.status}`);
    }

    const siteUrl = `https://${siteName}.netlify.app`;

    return new Response(JSON.stringify({ 
      success: true, 
      url: siteUrl, 
      siteName,
      deployId 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("deploy-to-netlify error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
