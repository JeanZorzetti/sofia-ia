import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', 'SofiaAI2024#Admin')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
  })

  test('should display dashboard overview', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Dashboard|Visão Geral/)

    // Check for metric cards
    const metricCards = page.locator('[class*="glass-card"]')
    await expect(metricCards).toHaveCount(4, { timeout: 5000 })
  })

  test('should navigate to agents page', async ({ page }) => {
    await page.click('text=/Agentes/i')
    await page.waitForURL('**/agents')

    await expect(page.locator('h1')).toContainText(/Agentes/)
  })

  test('should navigate to workflows page', async ({ page }) => {
    await page.click('text=/Automações|Workflows/i')
    await page.waitForURL('**/workflows')

    await expect(page.locator('h1')).toContainText(/Automações|Workflows/)
  })

  test('should navigate to orchestrations page', async ({ page }) => {
    await page.goto('/dashboard/orchestrations')

    await expect(page.locator('h1')).toContainText(/Orchestration/)
  })

  test('should open workflow visual builder', async ({ page }) => {
    await page.goto('/dashboard/workflows')

    const visualBuilderButton = page.locator('button:has-text("Visual Builder")')
    await visualBuilderButton.click()

    await page.waitForURL('**/workflows/builder')
    await expect(page.locator('h1')).toContainText(/Visual Workflow Builder/)
  })
})
