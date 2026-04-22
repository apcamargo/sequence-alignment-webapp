// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

import tailwindcss from "@tailwindcss/vite";

const DEFAULT_DEPLOY_BASE = "/";

/** @param {string} value */
function normalizeBasePath(value) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

const processEnv = /** @type {{ DEPLOY_BASE?: string } | undefined} */ (
  Reflect.get(globalThis, "process")?.env
);
const deployBase = normalizeBasePath(
  processEnv?.DEPLOY_BASE ?? DEFAULT_DEPLOY_BASE,
);

// https://astro.build/config
export default defineConfig({
  site: "https://apcamargo.github.io",
  base: deployBase,
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
  },
});
