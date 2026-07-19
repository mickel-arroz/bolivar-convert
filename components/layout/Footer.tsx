import { SITE_CONFIG, SOCIAL_LINKS } from '@/constants/site'
import { Fragment } from 'react'

export function Footer() {
  return (
    <footer className="w-full flex justify-center pb-24 md:pb-6 mt-auto">
      <div className="w-[calc(100%-2rem)] max-w-7xl border-t pt-3">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
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
      </div>
    </footer>
  )
}
