# Bolivar Convert Context

## Stack
Next.js App Router, React, TypeScript, Tailwind CSS, Shadcn UI, Python, Vitest, Playwright.

## Structure
/app: Next.js routes/API
/components/ui: Shadcn primitives
/components/icons: Standalone SVG components
/scraper: Python BCV/Binance scrapers
/hooks: State logic
/tests: Unit/E2E

## Rules
1. Icons: SVGs MUST be isolated components in /components/icons. No inline <svg> in UI.
2. UI: Use Shadcn UI for new components. Mobile-first.
3. Styles: CSS/Tailwind MUST support light/dark modes dynamically (use dark: prefix or css vars).
4. Scrapers: BCV (BeautifulSoup). Binance P2P calculates the MEDIAN of top 20 offers.
5. Types: Strict TS. No 'any'.
6. Validation: Run 'npm run build && npm run lint && npx tsc --noEmit && npm test' before finishing.
7. Colors: Green(USD/BCV), Blue(EUR), Yellow(Binance), Primary(Custom).