import withFlowbiteReact from "flowbite-react/plugin/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones de rendimiento
  //reactStrictMode: true,
  // Deshabilitar source maps en producción para reducir tamaño
  //productionBrowserSourceMaps: false,
  // Headers de caché para assets estáticos
  /*
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },*/
};

export default withFlowbiteReact(nextConfig);
