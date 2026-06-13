import { test, expect } from '@playwright/test'

test.describe('Bill Splitter E2E Flow', () => {
  test('should navigate to split tab and perform an itemized calculation', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')

    // Wait for data to load
    await expect(page.getByText('Dólar Oficial (BCV)')).toBeVisible()

    // Click on the Dividir Factura navigation item
    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 768 : false
    if (isMobile) {
      await page.getByRole('button', { name: 'Más' }).click()
      await page.getByRole('link', { name: 'Dividir Factura' }).click()
    } else {
      await page.getByRole('link', { name: 'Dividir Factura' }).click()
    }

    // Wait for BillSplitter to render
    await expect(page.getByRole('heading', { name: 'Dividir Factura' })).toBeVisible()

    // Select USD as currency
    await page.locator('button[id$="-currency-USD"]').click()

    // Add first person (type name first, then click button)
    const nameInput = page.getByPlaceholder('Nombre de la persona…')
    await nameInput.fill('Alice')
    await page.getByRole('button', { name: '+ Agregar' }).click()
    
    // Add item for Alice
    const amountInput = page.getByPlaceholder('Monto')
    await amountInput.fill('100') // $100
    await amountInput.press('Enter')

    // Turn off IVA included (so it adds 16%)
    const ivaToggle = page.getByRole('switch', { name: 'Los precios ya incluyen IVA' })
    await ivaToggle.click()

    // Turn off Tip included (so it adds 10%)
    const tipToggle = page.getByRole('switch', { name: 'Los precios ya incluyen propina' })
    await tipToggle.click()

    // Turn on IGTF (adds 3%)
    const igtfToggle = page.getByRole('switch', { name: /Cobrar IGTF/ })
    await igtfToggle.click()

    // The logic: Base = $100. Tip = $10 (10% default). IVA = $16 (16%). IGTF = $3 (3%). Grand Total = $129.
    
    // Look for Grand Total breakdown
    await expect(page.getByText('Gran Total')).toBeVisible()
    
    // Validate Tip was added
    await expect(page.locator('.font-mono', { hasText: '+ $10,00' })).toBeVisible()

    // Validate IVA was added
    await expect(page.locator('.font-mono', { hasText: '+ $16,00' })).toBeVisible()
    
    // Validate IGTF was added
    await expect(page.locator('.font-mono', { hasText: '+ $3,00' })).toBeVisible()
    
    // Validate Grand Total is $129,00
    const grandTotals = page.getByText('$129,00')
    await expect(grandTotals.first()).toBeVisible()
  })

  test('should perform an equal parts calculation', async ({ page }) => {
    await page.goto('/')

    const isMobile = page.viewportSize() ? page.viewportSize()!.width < 768 : false
    if (isMobile) {
      await page.getByRole('button', { name: 'Más' }).click()
      await page.getByRole('link', { name: 'Dividir Factura' }).click()
    } else {
      await page.getByRole('link', { name: 'Dividir Factura' }).click()
    }

    // Switch to Equal mode
    const equalTab = page.getByText('Partes iguales')
    await equalTab.click()

    // Fill $200 total amount
    const totalInput = page.getByLabel('Monto total de la cuenta')
    await totalInput.fill('200')

    // Divide by 4 people
    const peopleInput = page.getByLabel('Número de personas')
    await peopleInput.fill('4')

    // Each person should pay Bs.50,00
    await expect(page.getByText('Bs.50,00')).toBeVisible()
  })
})
