/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  devIndicators: false, // hides the Next.js "N" badge in dev
  // These use native code / worker threads, so they must run from node_modules, not be bundled.
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas", "tesseract.js"],
};
export default nextConfig;
