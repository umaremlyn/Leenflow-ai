import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options",           value: "DENY"            },
  // Prevent MIME sniffing
  { key: "X-Content-Type-Options",    value: "nosniff"         },
  // Referrer policy
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Permissions policy — disable camera/mic/geolocation
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  // XSS protection (legacy browsers)
  { key: "X-XSS-Protection",         value: "1; mode=block"   },
  // HSTS — force HTTPS for 1 year
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // needed for Next.js HMR in dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.paystack.co wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },

  async headers() {
    return [
      // Apply security headers to all dashboard pages
      {
        source: "/((?!api/widget|widget).*)",
        headers: securityHeaders,
      },
      // CORS for the public widget API
      {
        source: "/api/assistant/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: "*"                                },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS"               },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization"      },
        ],
      },
      // Widget JS — public, cache 1 hour
      {
        source: "/widget/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*"                                  },
          { key: "Cache-Control",                value: "public, max-age=3600, s-maxage=3600" },
        ],
      },
    ];
  },

  // Vercel + Next.js performance
  compress:             true,
  poweredByHeader:      false,   // Don't expose Next.js version
  reactStrictMode:      true,

  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
};

export default nextConfig;
