/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Inline the page CSS into the HTML: removes the render-blocking
    // stylesheet fetch, which could paint a flash of unstyled content
    // (a large layout shift) when the response was slow.
    inlineCss: true,
  },
};

export default nextConfig;
