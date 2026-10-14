export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const isRead = method === "GET" || method === "HEAD";

    if (isRead && url.pathname === "/") {
      return env.ASSETS.fetch(new Request(new URL("/landing%20page/index.html", url), request));
    }
    if (isRead && (url.pathname === "/app" || url.pathname === "/app/")) {
      return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (isRead && acceptsHtml) {
      return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
    }
    return assetResponse;
  },
};
