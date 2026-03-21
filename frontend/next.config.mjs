import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
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
      { source: '/enrol-customer', destination: '/frontend/enrol-customer' },
      { source: '/managers-dashboard', destination: '/frontend/managers-dashboard' },
      { source: '/company-kyc', destination: '/frontend/company-kyc' },
      { source: '/master-inventory-sheet', destination: '/frontend/master-inventory-sheet' },
      { source: '/master-job-sheet', destination: '/frontend/master-job-sheet' },
      { source: '/master-kyc-sheet', destination: '/frontend/master-kyc-sheet' },
      { source: '/master-customer-sheet', destination: '/frontend/master-customer-sheet' },
      { source: '/master-product-sheet', destination: '/frontend/master-product-sheet' },
      { source: '/master-product-sheet/:path*', destination: '/frontend/master-product-sheet/:path*' },
      { source: '/finding-sheet', destination: '/frontend/finding-sheet' },
      { source: '/master-workforce-sheet', destination: '/frontend/master-workforce-sheet' },
      { source: '/master-designer-sheet', destination: '/frontend/master-designer-sheet' },
      { source: '/orders', destination: '/frontend/orders' },
      { source: '/orders/:path*', destination: '/frontend/orders/:path*' },
      { source: '/profile', destination: '/frontend/profile' },
    ]
  },
}

export default nextConfig
