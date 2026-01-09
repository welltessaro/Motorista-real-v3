
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Em produção, substitua * pela URL do seu site
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const key = request.headers.get("X-Auth-Token");

    // Validação simples de segurança
    if (!key) {
      return new Response("Missing X-Auth-Token header", { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    try {
      // POST: Salvar dados
      if (request.method === "POST") {
        const data = await request.json();
        // Salva no KV. O limite é 25MB por valor.
        await env.DATA_STORE.put(key, JSON.stringify(data));
        return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // GET: Recuperar dados
      if (request.method === "GET") {
        const data = await env.DATA_STORE.get(key);
        if (!data) {
          return new Response(JSON.stringify(null), { 
             headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
        }
        return new Response(data, { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  },
};
