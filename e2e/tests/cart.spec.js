import { test, expect } from '@playwright/test';

const PASSWORD = 'Test1234!';

test.describe('Cart & Checkout Flow', () => {
  test('should add product to cart', async ({ page }) => {
    const email = `cart-${Date.now()}-add@example.com`;
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Cart');
    await page.fill('input[name="lastName"]', 'Tester');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.fill('input[name="confirmPassword"]', PASSWORD);
    await page.fill('input[name="phone"]', '+251912345678');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 15000 });

    await page.goto('/shop');
    const addBtn = page.locator('.add-cart-btn-premium').first();
    if (await addBtn.isVisible() && !await addBtn.isDisabled()) {
      await addBtn.click();
      await expect(page.locator('.cart-badge')).toBeVisible();
    }
  });

  test('should navigate to cart page', async ({ page }) => {
    const email = `cart-${Date.now()}-nav@example.com`;
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Cart');
    await page.fill('input[name="lastName"]', 'Tester');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.fill('input[name="confirmPassword"]', PASSWORD);
    await page.fill('input[name="phone"]', '+251912345678');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 15000 });

    await page.goto('/cart');
    await expect(page).toHaveURL('/cart');
  });

  test('should visit checkout page', async ({ page }) => {
    const email = `cart-${Date.now()}-checkout@example.com`;
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Cart');
    await page.fill('input[name="lastName"]', 'Tester');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PASSWORD);
    await page.fill('input[name="confirmPassword"]', PASSWORD);
    await page.fill('input[name="phone"]', '+251912345678');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 15000 });

    await page.goto('/checkout');
    await expect(page).toHaveURL('/checkout');
  });
});
