import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // PDF da fatura pode passar de 1 MB (padrão do Next); a ação aceita até 5 MB.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
