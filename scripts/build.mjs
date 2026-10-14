import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { build, transform } from "esbuild";

rmSync("build", { recursive: true, force: true });
mkdirSync("build/client/vendor", { recursive: true });
mkdirSync("build/server", { recursive: true });
await transform(readFileSync("public/main.js", "utf8"), { loader:"js", format:"esm", target:"esnext" });
await transform(readFileSync("public/motion-kit.js", "utf8"), { loader:"js", format:"esm", target:"esnext" });
await build({ entryPoints:["scripts/motion-entry.js"], outfile:"public/vendor/motion.js", bundle:true, format:"esm", minify:true, target:["es2020"] });
cpSync("public", "build/client", { recursive: true });
cpSync("worker.js", "build/server/worker.js");

const rawConfig = readFileSync("wrangler.jsonc", "utf8");
const config = JSON.parse(rawConfig.replace(/\/\/[^\n]*/g, "").replace(/,(\s*[}\]])/g, "$1"));
const manifest = {
  main: "worker.js",
  no_bundle: true,
  rules: [{ type: "ESModule", globs: ["**/*.js", "**/*.mjs"] }],
  compatibility_date: config.compatibility_date,
  compatibility_flags: config.compatibility_flags ?? [],
  assets: { directory: "../client", binding: "ASSETS" },
  ...(config.vars ? { vars: config.vars } : {}),
  ...(config.durable_objects ? { durable_objects: config.durable_objects } : {}),
  ...(config.migrations ? { migrations: config.migrations } : {}),
  ...(config.kv_namespaces ? { kv_namespaces: config.kv_namespaces } : {}),
  ...(config.r2_buckets ? { r2_buckets: config.r2_buckets } : {}),
  ...(config.bindings ? { bindings: config.bindings } : {}),
};
writeFileSync("build/server/wrangler.json", JSON.stringify(manifest, null, 2) + "\n");
