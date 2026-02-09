# Testing Guide

## Overview

This project uses Jest for unit/integration tests and Playwright for end-to-end tests.

## Setup

Install dependencies:
```bash
npm install
```

Install Playwright browsers (first time only):
```bash
npx playwright install
```

## Running Tests

### Unit/Integration Tests (Jest)

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

### End-to-End Tests (Playwright)

Run E2E tests:
```bash
npm run test:e2e
```

Run E2E tests with UI:
```bash
npm run test:e2e:ui
```

Debug E2E tests:
```bash
npm run test:e2e:debug
```

## Test Structure

```
sofia-next/
├── src/
│   └── __tests__/          # Unit/integration tests
│       ├── api/            # API route tests
│       └── components/     # Component tests
├── e2e/                    # End-to-end tests
│   ├── login.spec.ts
│   ├── dashboard.spec.ts
│   └── ...
├── jest.config.js          # Jest configuration
├── jest.setup.js           # Jest setup
└── playwright.config.ts    # Playwright configuration
```

## Writing Tests

### Jest Unit Test Example

```typescript
// src/__tests__/api/health.test.ts
describe('/api/health', () => {
  it('should return healthy status', async () => {
    const response = await fetch('http://localhost:3000/api/health')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('status', 'ok')
  })
})
```

### Playwright E2E Test Example

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('should login successfully', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', 'SofiaAI2024#Admin')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/.*dashboard/)
})
```

## CI/CD Integration

Tests run automatically on:
- Every push to `main` and `develop` branches
- Every pull request
- Before deployment to production

See `.github/workflows/ci.yml` for CI configuration.

## Coverage Goals

- Unit Tests: 50% minimum coverage
- E2E Tests: Critical user flows
- API Tests: All public endpoints

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear test descriptions
3. **Mock External Services**: Don't hit real APIs in tests
4. **Test User Flows**: Focus on real user scenarios in E2E tests
5. **Fast Feedback**: Keep unit tests fast, use E2E sparingly

## Debugging

### Jest
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright
```bash
npm run test:e2e:debug
```

## Troubleshooting

**Issue**: Tests fail with database connection error
**Solution**: Update `DATABASE_URL` in `jest.setup.js` or use mocks

**Issue**: Playwright tests timeout
**Solution**: Increase timeout in `playwright.config.ts` or check if dev server is running

**Issue**: Component tests fail
**Solution**: Ensure all components are properly mocked and dependencies are installed
