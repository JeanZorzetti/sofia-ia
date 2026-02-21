
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Default Groq models
        const models = [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)', provider: 'Groq' },
            { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (via OpenRouter)', provider: 'OpenRouter' },
            { id: 'arcee-ai/trinity-large-preview:free', name: 'Trinity Large Preview (Free)', provider: 'OpenRouter' },
            { id: 'qwen/qwen3-coder:free', name: 'Qwen 3 Coder 480B (Free)', provider: 'OpenRouter' },
            // Claude Code CLI models — all available via local CLI with --model flag
            { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'Claude Code' },
            { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Claude Code' },
            { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'Claude Code' },
            { id: 'claude-sonnet-4-5-thinking', name: 'Claude Sonnet 4.5 (Thinking)', provider: 'Claude Code' },
            { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Claude Code' },
            { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'Claude Code' },
            { id: 'claude-haiku-3-5', name: 'Claude Haiku 3.5', provider: 'Claude Code' },
            // Opencode CLI models — access to multiple providers via local CLI
            { id: 'opencode-gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Opencode' },
            { id: 'opencode-gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Opencode' },
            { id: 'opencode-gpt-4o', name: 'GPT-4o', provider: 'Opencode' },
            { id: 'opencode-gpt-4.1', name: 'GPT-4.1', provider: 'Opencode' },
            { id: 'opencode-claude-sonnet-4', name: 'Claude Sonnet 4 (via Opencode)', provider: 'Opencode' },
            { id: 'opencode-claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (via Opencode)', provider: 'Opencode' },
            { id: 'opencode-claude-opus-4', name: 'Claude Opus 4 (via Opencode)', provider: 'Opencode' },
            { id: 'llama-3.3-70b-specdec', name: 'Llama 3.3 70B (SpecDec)', provider: 'Groq' },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'Groq' },
        ];

        // Check for active integrations
        const integrations = await prisma.integration.findMany({
            where: {
                status: 'active'
            },
            select: {
                type: true
            }
        });

        const integrationTypes = new Set(integrations.map(i => i.type));

        // Add Claude models if integration exists
        if (integrationTypes.has('claude')) {
            models.push(
                // CLI Integration
                { id: 'claude-code-cli', name: 'Claude Code (Official CLI) ⚡', provider: 'Anthropic' }
            );
        }

        // Add OpenAI models if integration exists
        if (integrationTypes.has('openai')) {
            models.push(
                { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' }
            );
        }

        return NextResponse.json({
            success: true,
            data: models
        });

    } catch (error) {
        console.error('Error fetching models:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch models' },
            { status: 500 }
        );
    }
}
