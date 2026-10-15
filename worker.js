export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const isRead = method === "GET" || method === "HEAD";

    if (url.pathname === "/api/health" && method === "GET") {
      if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        return Response.json(
          {
            connected: false,
            error: "Supabase configuration is missing",
          },
          { status: 500 },
        );
      }

      const supabaseUrl = env.SUPABASE_URL.replace(/\/+$/, "");

      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/meetings?select=id&limit=1`,
          {
            headers: {
              apikey: env.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
            },
          },
        );

        return Response.json(
          {
            connected: response.ok,
            status: response.status,
          },
          { status: response.ok ? 200 : 502 },
        );
      } catch {
        return Response.json(
          {
            connected: false,
            error: "Could not reach Supabase",
          },
          { status: 502 },
        );
      }
    }

    if (isRead && url.pathname === "/") {
      return env.ASSETS.fetch(
        new Request(new URL("/landing%20page/index.html", url), request),
      );
    }
    if (isRead && (url.pathname === "/app" || url.pathname === "/app/")) {
      return env.ASSETS.fetch(
        new Request(new URL("/index.html", url), request),
      );
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (isRead && acceptsHtml) {
      return env.ASSETS.fetch(
        new Request(new URL("/index.html", url), request),
      );
    }
    return assetResponse;
  },
};
