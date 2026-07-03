const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*\/api\/.*/,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https?.*\/_next\/static\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'badaya-static-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'badaya-pages-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
