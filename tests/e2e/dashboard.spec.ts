import { test, expect } from '@playwright/test'

test.describe('Dashboard and E2E Web Features', () => {
  test('should display the main titles and layout components', async ({
    page
  }) => {
    await page.goto('/')

    // Validate main heading exists (new Hero title)
    const mainHeading = page.locator('h1')
    await expect(mainHeading).toContainText(/El valor del Bolívar/i)

    // Validate the core Cards represent the correct info
    await expect(page.getByText('Dólar Oficial (BCV)')).toBeVisible()
    await expect(page.getByText('Euro Oficial (BCV)')).toBeVisible()
    await expect(page.getByText('Binance', { exact: true })).toBeVisible()

    // Validate the Footer
    await expect(
      page.getByText(/Hecho para proveer información/i)
    ).toBeVisible()
  })

  test('should toggle dark mode properly', async ({ page }) => {
    await page.goto('/')

    // In our theme provider, default is dark, so html should have class 'dark'
    const htmlLocator = page.locator('html')
    await expect(htmlLocator).toHaveClass(/dark/)

    // Direct toggle button
    const themeBtn = page.getByRole('button', { name: 'Toggle theme' })
    await themeBtn.click()

    // The dark class should be removed after single click
    await expect(htmlLocator).not.toHaveClass(/dark/)

    // Click again to return to dark
    await themeBtn.click()
    await expect(htmlLocator).toHaveClass(/dark/)
  })
})
