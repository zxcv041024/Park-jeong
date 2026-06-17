/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? "/Park-jeong" : undefined,
  assetPrefix: isGithubPages ? "/Park-jeong/" : undefined,
  trailingSlash: isGithubPages
};

export default nextConfig;
