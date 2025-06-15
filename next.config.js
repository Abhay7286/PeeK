/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      // Social Media Platforms
      'i.ytimg.com', // YouTube
      'pbs.twimg.com', // Twitter
      't.co', // Twitter URL shortener
      'scontent.cdninstagram.com', // Instagram
      'graph.facebook.com', // Facebook
      'avatars.githubusercontent.com', // GitHub
      
      // Image Hosting Services
      'i.imgur.com', // Imgur
      'media.discordapp.net', // Discord
      'dl.dropboxusercontent.com', // Dropbox
      'images.unsplash.com', // Unsplash
      'images.pexels.com', // Pexels
      'images.pixabay.com', // Pixabay
      'store-apps.p.rapidapi.com',
      'play-lh.googleusercontent.com',
      
      // Cloud Storage
      'storage.googleapis.com', // Google Cloud
      's3.amazonaws.com', // Amazon S3
      'azure.blob.storage', // Azure Blob Storage
      
      // Content Delivery Networks (CDNs)
      'cdn.jsdelivr.net',
      'unpkg.com',
      'cdnjs.cloudflare.com',
      
      // Common Websites and Services
      'via.placeholder.com', // Placeholder images
      'picsum.photos', // Random image generator
      'avatars.githubusercontent.com', // GitHub avatars
      'www.gravatar.com', // Gravatar
      'lh3.googleusercontent.com', // Google
      'platform-lookaside.fbsbx.com', // Facebook
      
      // Add your specific domains here
      'example.com',
      'yourwebsite.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '**',
      }
    ]
  },
};

module.exports = nextConfig;