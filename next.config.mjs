
/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  devIndicators: false,

  // Packages that use native code / worker threads / data files must stay outside the bundle.
  serverExternalPackages: [
    "pdfjs-dist",
    "@napi-rs/canvas",
    "tesseract.js",
    "tesseract.js-core",
  ],

  // Vercel only ships the files it can *see* being imported. pdfjs and tesseract load several
  // files by computed path at runtime (fonts, cmaps, wasm, worker scripts, language data), so
  // they must be listed here or they are missing in production, even though everything works
  // on localhost where all of node_modules exists.
  outputFileTracingIncludes: {
    "/api/documents/**": [
      // pdfjs: fonts, cmaps, wasm image decoders, colour profiles
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/pdfjs-dist/cmaps/**/*",
      "./node_modules/pdfjs-dist/wasm/**/*",
      "./node_modules/pdfjs-dist/iccs/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.mjs",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      // native canvas (used by pdfjs and for rendering pages for OCR)
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
      // tesseract.js: worker script is started by path, so it is not auto-detected
      "./node_modules/tesseract.js/package.json",
      "./node_modules/tesseract.js/src/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/@tesseract.js-data/eng/4.0.0_best_int/**/*",
      // tesseract.js dependencies that the worker script requires
      "./node_modules/regenerator-runtime/**/*",
      "./node_modules/wasm-feature-detect/**/*",
      "./node_modules/is-url/**/*",
      "./node_modules/bmp-js/**/*",
      "./node_modules/node-fetch/**/*",
      "./node_modules/whatwg-url/**/*",
      "./node_modules/tr46/**/*",
      "./node_modules/webidl-conversions/**/*",
    ],
  },

  // Keep the function small (Vercel's limit is 250 MB unzipped).
  outputFileTracingExcludes: {
    "/api/documents/**": [
      "./node_modules/pdfjs-dist/**/*.map",
      "./node_modules/pdfjs-dist/build/**",
      "./node_modules/pdfjs-dist/web/**",
      "./node_modules/pdfjs-dist/legacy/web/**",
      "./node_modules/@tesseract.js-data/eng/4.0.0/**",
    ],
  },
};

export default nextConfig;
