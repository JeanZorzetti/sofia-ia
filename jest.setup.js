// Add custom jest matchers from jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_SECRET = 'test-secret'
process.env.GROQ_API_KEY = 'test-key'
process.env.EVOLUTION_API_URL = 'https://test.example.com'
process.env.EVOLUTION_API_KEY = 'test-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
