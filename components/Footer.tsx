import { Github, ExternalLink } from '@/components/icons'
import { SITE_CONFIG } from '@/constants/site'

export function Footer() {
  return (
    <footer className="py-6 md:px-8 border-t mt-auto">
      <div className="container flex flex-col items-center justify-center gap-2 md:h-16 text-center">
        <p className="text-sm text-muted-foreground/70">
          Hecho para proveer información de tasas de cambio. Actualizado
          diariamente.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Desarrollado por{' '}
          <a
            href={SITE_CONFIG.links.github}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4 hover:text-muted-foreground"
          >
            {SITE_CONFIG.author}
          </a>
          {' '}&bull;{' '}
          <a
            href={SITE_CONFIG.links.portfolio}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4 hover:text-muted-foreground"
          >
            Portafolio
          </a>
        </p>
      </div>
    </footer>
  )
}
