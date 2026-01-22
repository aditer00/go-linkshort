/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    env: {
        NEXT_PUBLIC_URL_SERVICE: process.env.NEXT_PUBLIC_URL_SERVICE || 'http://localhost:8080',
        NEXT_PUBLIC_ANALYTICS_SERVICE: process.env.NEXT_PUBLIC_ANALYTICS_SERVICE || 'http://localhost:8081',
    },
}

module.exports = nextConfig
