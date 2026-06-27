import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to all main pages', async ({ page }) => {
    const pages = [
      { path: '/', heading: /Halal/i },
      { path: '/shop', heading: /Shop/i },
      { path: '/merchants', heading: /Merchants/i },
      { path: '/about', heading: /About/i },
      { path: '/mejilis', heading: /Mejilis/i },
      { path: '/login', heading: /Login/i },
      { path: '/register', heading: /Register/i },
    ];

    for (const { path } of pages) {
      await page.goto(path);
      await expect(page).toHaveURL(path);
    }
  });

  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('should have working logo link to home', async ({ page }) => {
    await page.goto('/shop');
    await page.click('#navbar-logo');
    await expect(page).toHaveURL('/');
  });

  test('should have responsive mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.click('.mobile-menu-btn');
    await expect(page.locator('.mobile-menu.mobile-menu-open')).toBeVisible();
  });
});
