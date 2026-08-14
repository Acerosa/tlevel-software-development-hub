import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { defineConfig } from "vite";

function collectHtml(directory: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) collectHtml(full, acc);
    else if (entry === "index.html") acc.push(full);
  }
  return acc;
}

function htmlInputs() {
  return Object.fromEntries(
    collectHtml(process.cwd()).map((file) => {
      const relative = file.replace(process.cwd() + "/", "");
      const name = relative === "index.html" ? "home" : relative.replace(/\/index\.html$/, "").replaceAll("/", "-");
      return [name, file];
    })
  );
}

function copyStaticAssets() {
  return {
    name: "copy-tlevel-static-assets",
    closeBundle() {
      const dist = resolve("dist");
      const bootstrap = resolve(dist, "js/core/theme-bootstrap.js");
      mkdirSync(dirname(bootstrap), { recursive: true });
      cpSync(resolve("js/core/theme-bootstrap.js"), bootstrap);
      writeFileSync(resolve(dist, ".nojekyll"), "");
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), copyStaticAssets()],
  build: {
    sourcemap: true,
    rollupOptions: {
      input: htmlInputs()
    }
  }
});
