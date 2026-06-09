import { test, expect } from '@playwright/test'

test.describe('Responsive Navigation Integration', () => {
  test('desktop navigation displays links natively', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'Testing desktop navigation behavior')

    await page.goto('/')

    // In Desktop, the "Tasas" link is visible directly in the nav bar
    const desktopLink = page.locator('nav').getByText('Tasas')
    await expect(desktopLink).toBeVisible()

    // Hamburger menu should NOT be visible
    const menuBtn = page.getByRole('button', { name: 'Toggle Menu' })
    await expect(menuBtn).not.toBeVisible()
  })

  test('mobile navigation uses hamburger menu', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Testing mobile navigation behavior')

    await page.goto('/')

    // In Mobile, the "Tasas" link inside the standard nav is hidden
    const menuBtn = page.getByRole('button', { name: 'Toggle Menu' })
    await expect(menuBtn).toBeVisible()

    // Open the side sheet
    await menuBtn.click()

    // Look for the "Tasas" link inside the rendered sheet
    const sheetContent = page.getByRole('dialog') // Shadcn's Sheet uses Dialog role
    await expect(sheetContent).toBeVisible()

    const mobileLink = sheetContent.getByText('Tasas')
    await expect(mobileLink).toBeVisible()
  })
})
