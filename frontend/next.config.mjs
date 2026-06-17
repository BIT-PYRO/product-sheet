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
      // Serve a placeholder favicon to avoid 404 noise in dev
      { source: '/favicon.ico', destination: '/placeholder-logo.svg' },
      { source: '/product-sheet', destination: '/frontend' },
      { source: '/home', destination: '/frontend/home' },
      { source: '/welcome', destination: '/frontend/welcome' },
      { source: '/login', destination: '/frontend/login' },
      { source: '/signup', destination: '/frontend/signup' },
      { source: '/auth/google', destination: '/frontend/auth/google' },
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
      { source: '/finding-entry', destination: '/frontend/finding-entry' },
      { source: '/master-workforce-sheet', destination: '/frontend/master-workforce-sheet' },
      { source: '/master-designer-sheet', destination: '/frontend/master-designer-sheet' },
      { source: '/designer-sheet', destination: '/frontend/designer-sheet' },
      { source: '/designer-sheet/:path*', destination: '/frontend/designer-sheet/:path*' },
      { source: '/inventory', destination: '/frontend/inventory' },
      { source: '/inventory/:path*', destination: '/frontend/inventory/:path*' },
      { source: '/orders', destination: '/frontend/orders' },
      { source: '/orders/:path*', destination: '/frontend/orders/:path*' },
      { source: '/accountancy', destination: '/frontend/accountancy' },
      { source: '/accountancy/:path*', destination: '/frontend/accountancy/:path*' },
      { source: '/hr-section', destination: '/frontend/hr-section' },
      { source: '/hr-section/:path*', destination: '/frontend/hr-section/:path*' },
      { source: '/profile', destination: '/frontend/profile' },
      { source: '/manage-members', destination: '/frontend/manage-members' },
      { source: '/settings', destination: '/frontend/settings' },
      { source: '/settings/:path*', destination: '/frontend/settings/:path*' },
      // Proxy /media/* requests to the Django backend so product images resolve correctly
      { source: '/media/:path*', destination: `${process.env.BACKEND_BASE_URL || 'https://product-sheet.onrender.com'}/media/:path*` },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ]
  },
}

export default nextConfig
