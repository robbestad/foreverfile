import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Signing and upload run in the browser. Do not add server routes that
  // accept a JWK or file bytes.
};

export default nextConfig;
