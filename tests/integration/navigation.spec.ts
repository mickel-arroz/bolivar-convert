import { test, expect } from '@playwright/test'

test.describe('Responsive Navigation Integration', () => {
  test('desktop navigation displays links natively', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'Testing desktop navigation behavior')

    await page.goto('/')

    // In Desktop, the "Tasas" link is visible directly in the nav bar
    const desktopLink = page.locator('header nav').getByText('Tasas', { exact: true })
    await expect(desktopLink).toBeVisible()

    // Hamburger menu should NOT be visible
    const menuBtn = page.getByRole('button', { name: /Más/i })
    await expect(menuBtn).not.toBeVisible()
  })

  test('mobile navigation uses hamburger menu', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Testing mobile navigation behavior')

    await page.goto('/')

    // In Mobile, the Menu button should be visible in the bottom nav
    const menuBtn = page.getByRole('button', { name: /Más/i })
    await expect(menuBtn).toBeVisible()

    // Open the side sheet
    await menuBtn.click()

    // Look for the "Tasas" link inside the rendered sheet
    const sheetContent = page.getByRole('dialog') // Shadcn's Sheet uses Dialog role
    await expect(sheetContent).toBeVisible()

    // In the new mobile nav, the links are both in the bottom bar AND in the sheet
    // We check the sheet content for the link with text 'Tasas'
    const mobileLink = sheetContent.getByText('Tasas', { exact: true })
    await expect(mobileLink).toBeVisible()
  })
})
