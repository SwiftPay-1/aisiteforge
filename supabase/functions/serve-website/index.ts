import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get("path");

    if (!filePath) {
      return new Response("Missing path parameter", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.storage
      .from("hosted-websites")
      .download(filePath);

    if (error || !data) {
      console.error("Download error:", error);
      return new Response("File not found", { status: 404, headers: corsHeaders });
    }

    const htmlContent = await data.text();

    return new Response(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("serve-website error:", e);
    return new Response("Internal Server Error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
