/** @type {import('next').NextConfig} */
const nextConfig = {
  // The whole app lives under voltdrop.app/comments — the static site owns
  // every other path. Traefik routes PathPrefix(/comments) to this service.
  basePath: '/comments',
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
    ],
  },
}

module.exports = nextConfig
