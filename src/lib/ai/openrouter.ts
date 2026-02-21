
import OpenAI from 'openai'

let _openrouter: OpenAI | null = null

export function getOpenRouterClient(): OpenAI {
    if (!_openrouter) {
        _openrouter = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: process.env.OPENROUTER_API_KEY,
            defaultHeaders: {
                'HTTP-Referer': 'https://sofia.app', // Required by OpenRouter
                'X-Title': 'Sofia Next', // Optional
            },
        })
    }
    return _openrouter
}
