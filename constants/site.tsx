import { TrendingUpIcon, GithubIcon, UserIcon, ClockIcon, CalculatorIcon } from '@/components/icons'

export const SITE_CONFIG = {
  name: 'Bolívar Convert',
  author: 'Mickel Arroz',
  links: {
    github: 'https://github.com/mickel-arroz',
    portfolio: 'https://portfolio-mickel-arroz.vercel.app/'
  }
}

export const NAV_ITEMS = [
  {
    label: 'Tasas',
    href: '/',
    icon: <TrendingUpIcon className="w-5 h-5" />
  },
  {
    label: 'Convertir',
    href: '/convertir',
    icon: <CalculatorIcon className="w-5 h-5" />
  },
  {
    label: 'Historial',
    href: '/historial',
    icon: <ClockIcon className="w-5 h-5" />
  }
]

export const SOCIAL_LINKS = [
  {
    label: 'GitHub',
    href: SITE_CONFIG.links.github,
    icon: <GithubIcon className="w-5 h-5" />
  },
  {
    label: 'Portafolio',
    href: SITE_CONFIG.links.portfolio,
    icon: <UserIcon className="w-5 h-5" />
  }
]
