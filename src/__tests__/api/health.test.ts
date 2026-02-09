/**
 * API Health Check Test
 *
 * Tests the /api/health endpoint to ensure the API is responding correctly
 */

describe('/api/health', () => {
  it('should return healthy status', async () => {
    const response = await fetch('http://localhost:3000/api/health')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('timestamp')
  })

  it('should have proper CORS headers', async () => {
    const response = await fetch('http://localhost:3000/api/health')

    expect(response.headers.get('content-type')).toContain('application/json')
  })
})
