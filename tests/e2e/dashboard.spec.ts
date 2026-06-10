import { test, expect } from '@playwright/test'

test.describe('Dashboard and E2E Web Features', () => {
  test('should display the main titles and layout components', async ({
    page
  }) => {
    await page.goto('/')

    // Validate main heading exists (new Hero title)
    // Using a safer sub-string to avoid terminal encoding weirdness, but ensuring it matches
    const mainHeading = page.locator('h1')
    await expect(mainHeading).toContainText(/preciso y al instante/i)

    // Validate the core Cards represent the correct info
    await expect(page.getByText('Dólar Oficial (BCV)')).toBeVisible()
    await expect(page.getByText('Euro Oficial (BCV)')).toBeVisible()
    await expect(page.getByText('Binance', { exact: true }).first()).toBeVisible()

    // Validate the Footer
    await expect(
      page.getByText(/Hecho para proveer información/i)
    ).toBeVisible()
  })

  test('should toggle dark mode properly', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to hydrate and next-themes to apply classes
    // We can wait for the theme button to be visible
    const themeBtn = page.getByRole('button', { name: 'Toggle theme' })
    await expect(themeBtn).toBeVisible()

    // In our theme provider, default is dark, so html should have class 'dark'
    const htmlLocator = page.locator('html')
    // Wait until 'dark' is present (might take a fraction of a second on hydration)
    await expect(htmlLocator).toHaveClass(/dark/)

    // Direct toggle button
    await themeBtn.click()

    // The dark class should be removed after single click
    await expect(htmlLocator).not.toHaveClass(/dark/)

    // Click again to return to dark
    await themeBtn.click()
    await expect(htmlLocator).toHaveClass(/dark/)
  })
})

