import { SITE_CONFIG, SOCIAL_LINKS } from '@/constants/site'
import { Fragment } from 'react'

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
          {SOCIAL_LINKS.filter(link => link.label !== 'GitHub').map((link) => (
            <Fragment key={link.href}>
              {' '}&bull;{' '}
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-4 hover:text-muted-foreground"
              >
                {link.label}
              </a>
            </Fragment>
          ))}
        </p>
      </div>
    </footer>
  )
}
