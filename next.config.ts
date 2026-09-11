import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    hideLogsAfterAbort: true,
  },
  async redirects() {
    return [
      {
        source: "/organization/organization-employee/create",
        destination: "/organization/organization-employee",
        permanent: true,
      },
      {
        source: "/organization/employee-types",
        destination: "/organization/organization-employee-type-group",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
