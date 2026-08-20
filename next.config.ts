import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Chromium for the school comparison PDF must not be bundled.
   *
   * @sparticuz/chromium ships a brotli-compressed Chromium under its own bin/
   * directory and resolves that path at runtime relative to the installed
   * package. A bundler rewrites the module and relocates it, so the binary is
   * left behind and the function fails in production with:
   *
   *   The input directory "/var/task/node_modules/@sparticuz/chromium/bin"
   *   does not exist.
   *
   * Marking both packages external keeps them as plain requires from
   * node_modules, and tracing bin/ into the function output makes sure the
   * archive is actually deployed alongside them.
   */
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  outputFileTracingIncludes: {
    "/api/schools/export/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
