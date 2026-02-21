
const Groq = require('groq-sdk');
require('dotenv').config({ path: '.env' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
    try {
        const models = await groq.models.list();
        console.log('Available Groq Models:');
        models.data.forEach((m) => {
            console.log(`- ${m.id} (Owner: ${m.owned_by})`);
        });
    } catch (error) {
        console.error('Error fetching models:', error);
    }
}

main();
