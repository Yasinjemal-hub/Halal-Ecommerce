import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test1234!';

  test('should complete user registration', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.fill('input[name="phone"]', '+251912345678');

    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 15000 });

    await expect(page.locator('#user-menu-btn')).toBeVisible({ timeout: 5000 });
  });

  test('should login and logout', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 15000 });

    await page.click('#user-menu-btn');
    await page.click('text=Logout');

    await expect(page.locator('#login-btn')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'nonexistent@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login/);
  });
});
