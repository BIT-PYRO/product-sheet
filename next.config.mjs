/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: '/frontend/api/:path*' },
      { source: '/', destination: '/frontend' },
      { source: '/home', destination: '/frontend/home' },
      { source: '/login', destination: '/frontend/login' },
      { source: '/drafts', destination: '/frontend/drafts' },
      { source: '/enrol-workforce', destination: '/frontend/enrol-workforce' },
      { source: '/managers-dashboard', destination: '/frontend/managers-dashboard' },
      { source: '/master-inventory-sheet', destination: '/frontend/master-inventory-sheet' },
      { source: '/master-job-sheet', destination: '/frontend/master-job-sheet' },
      { source: '/master-kyc-sheet', destination: '/frontend/master-kyc-sheet' },
      { source: '/master-product-sheet', destination: '/frontend/master-product-sheet' },
      { source: '/master-product-sheet/:path*', destination: '/frontend/master-product-sheet/:path*' },
      { source: '/master-workforce-sheet', destination: '/frontend/master-workforce-sheet' },
    ]
  },
}

export default nextConfig
