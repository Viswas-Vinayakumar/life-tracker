import type { NextConfig } from 'next'

const isTauri = process.env.TAURI_BUILD === '1'

const nextConfig: NextConfig = {
  // Static export for Tauri, normal for web
  output: isTauri ? 'export' : undefined,
  images: isTauri ? { unoptimized: true } : undefined,
  trailingSlash: isTauri ? true : false,
}

export default nextConfig
