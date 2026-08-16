/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./prisma/dev.db', './prisma/**/*'],
  },
};

export default nextConfig;
