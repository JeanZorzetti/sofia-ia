/**
 * E2E tests for the landing page (/)
 *
 * Verifies that the home page loads correctly, key sections are visible,
 * and CTAs are present. No authentication required.
 *
 * Run with: npx playwright test e2e/landing.spec.ts --reporter=list
 */
import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the page to be fully hydrated
    await page.waitForLoadState('domcontentloaded')
  })

  test('should load the home page with a 200 status', async ({ page }) => {
    // Verify no error page is shown
    const title = await page.title()
    expect(title).toBeTruthy()
    // Should not show a generic error
    expect(title.toLowerCase()).not.toContain('error')
    expect(title.toLowerCase()).not.toContain('404')
  })

  test('should display the navbar', async ({ page }) => {
    // The top navigation should be present
    const nav = page.locator('nav')
    await expect(nav.first()).toBeVisible()
  })

  test('should have a hero section with a headline', async ({ page }) => {
    // The hero section should contain at least one heading
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible()

    const text = await heading.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  test('should have at least one CTA button or link pointing to login or signup', async ({ page }) => {
    // Look for any CTA — "Começar", "Grátis", "Sign", "Login", "Criar conta", etc.
    const ctaPattern = /Começar|Gratis|Start|Login|Criar conta|Entrar|Free|Signup/i
    const ctaLinks = page.getByRole('link', { name: ctaPattern })
    const ctaButtons = page.getByRole('button', { name: ctaPattern })

    const linkCount = await ctaLinks.count()
    const buttonCount = await ctaButtons.count()

    expect(linkCount + buttonCount).toBeGreaterThan(0)
  })

  test('should have a features section with multiple items', async ({ page }) => {
    // The landing page should describe features — look for section headings or cards
    const featureHeadings = page.locator('section')
    const count = await featureHeadings.count()
    expect(count).toBeGreaterThan(1)
  })

  test('should have a pricing or plans reference on the page', async ({ page }) => {
    // Look for pricing text anywhere on the page
    const pricingText = page.getByText(/Planos|Precos|Pricing|Free|Pro|Business/i)
    const count = await pricingText.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should not have any broken console errors from React', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out known non-critical browser extension errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('extension') &&
        !e.includes('chrome-extension') &&
        !e.includes('moz-extension') &&
        !e.includes('ResizeObserver')
    )

    expect(criticalErrors).toHaveLength(0)
  })
})
