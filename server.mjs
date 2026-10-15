import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = resolve(__dirname, "public");
const LANDING_PAGE_DIR = resolve(PUBLIC_DIR, "landing page");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "localhost";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

async function serveFile(res, filePath, method) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return false;
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": fileStat.size,
      "Cache-Control": "no-cache",
    });
    if (method === "HEAD") {
      res.end();
      return true;
    }
    const content = await readFile(filePath);
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  // Serve main Ergon application directly on "/" and "/app"
  if (pathname === "/" || pathname === "/app" || pathname === "/app/") {
    const indexPath = join(PUBLIC_DIR, "index.html");
    await serveFile(res, indexPath, method);
    return;
  }

  const candidatePath = resolve(PUBLIC_DIR, "." + normalize("/" + pathname));

  // Prevent directory traversal outside public/ and do not interact with public/landing page
  if (
    !candidatePath.startsWith(PUBLIC_DIR) ||
    candidatePath === LANDING_PAGE_DIR ||
    candidatePath.startsWith(LANDING_PAGE_DIR + "\\") ||
    candidatePath.startsWith(LANDING_PAGE_DIR + "/")
  ) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const served = await serveFile(res, candidatePath, method);
  if (served) return;

  // SPA fallback to public/index.html for HTML navigation requests
  const acceptsHtml = (req.headers.accept || "").includes("text/html");
  if (acceptsHtml) {
    const indexPath = join(PUBLIC_DIR, "index.html");
    if (await serveFile(res, indexPath, method)) return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not Found");
});

server.listen(PORT, HOST, () => {
  console.log(`Ergon Node.js server running at http://${HOST}:${PORT}`);
});
