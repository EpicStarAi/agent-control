/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.68.101", "127.0.0.1:3015", "localhost:3015", "192.168.68.101:3015"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
