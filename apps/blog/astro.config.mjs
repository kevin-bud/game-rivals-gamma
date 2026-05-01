import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  site: "https://game-rivals-gamma-2-blog.kevin-wilson.workers.dev",
});
