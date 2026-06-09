import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bolivar Convert',
    short_name: 'Bolivar',
    description: 'Tasas de cambio del Banco Central de Venezuela y Binance',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml'
      }
    ]
  }
}
