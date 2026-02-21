
require('dotenv').config({ path: '.env' });
const OpenAI = require('openai');

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': 'https://sofia.app',
    },
});

const fs = require('fs');

async function main() {
    console.log('Listing OpenRouter models...');
    try {
        const response = await openai.models.list();

        console.log('Filtering for "coder" or "480"...');
        const targetModels = response.data.filter(m =>
            m.id.toLowerCase().includes('coder') ||
            m.id.toLowerCase().includes('480') ||
            m.id.toLowerCase().includes('qwen') // Keep qwen to see all options if needed, but maybe log less
        );

        // Log only IDs to save space
        const modelIds = targetModels.map(m => m.id).sort();

        if (modelIds.length > 0) {
            console.log('Found matching models:\n', modelIds.join('\n'));
        } else {
            console.log('No matching models found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
