import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')

    await expect(page).toHaveTitle(/ROI Labs/)
    await expect(page.locator('h1')).toContainText(/Login|Entrar/)
  })

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="text"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Wait for error message
    await page.waitForTimeout(1000)

    // Check if redirected back to login or shows error
    const url = page.url()
    expect(url).toContain('/login')
  })

  test('should redirect to dashboard on valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Use credentials from the system
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', 'SofiaAI2024#Admin')
    await page.click('button[type="submit"]')

    // Wait for navigation
    await page.waitForURL('**/dashboard', { timeout: 5000 })

    expect(page.url()).toContain('/dashboard')
  })
})
