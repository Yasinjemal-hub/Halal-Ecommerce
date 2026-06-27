import { test, expect } from '@playwright/test';

test.describe('Product Browsing', () => {
  test('should display shop page', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.locator('h1')).toContainText('Shop Halal Products');
  });

  test('should search for products', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('#search-input');
    await searchInput.fill('meat');
    await page.locator('#search-submit').click();

    await page.waitForURL('**/shop?search=meat');
    await expect(page).toHaveURL(/search=meat/);
  });

  test('should filter by category', async ({ page }) => {
    await page.goto('/shop');
    await page.goto('/shop?category=meat');
    await expect(page).toHaveURL(/category=meat/);
  });

  test('should navigate to product details', async ({ page }) => {
    await page.goto('/shop');

    const productLink = page.locator('.product-title-link').first();
    if (await productLink.isVisible()) {
      const href = await productLink.getAttribute('href');
      await productLink.click();
      await expect(page).toHaveURL(/\/product\//);
    }
  });
});
