import { defineConfig } from "@playwright/test";

const port = process.env.PRODUCT_PORT ?? "8787";
const baseURL = process.env.PRODUCT_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 0 : 0,
  reporter: "list",
  use: {
    baseURL,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
