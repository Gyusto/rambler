/** @type {import('next').NextConfig} */

// Note: /api and the chat WebSocket are proxied to the .NET backend by the
// custom server (server.js), not by Next rewrites — rewrites can't proxy the
// WebSocket upgrade. See server.js and BACKEND_URL.
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
