import { Resend } from "resend";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.error("CRITICAL: RESEND_API_KEY environment variable is not set!");
  throw new Error("RESEND_API_KEY is not configured. The function cannot start.");
}

const resend = new Resend(RESEND_API_KEY);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, from, subject, html } = await req.json();

    if (!to || !from || !subject || !html) {
        return new Response(JSON.stringify({ error: "Missing required fields: to, from, subject, html" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
    }

    const { data, error } = await resend.emails.send({
      from: from,
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Email sent successfully", data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Caught an unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
