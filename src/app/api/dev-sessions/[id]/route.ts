
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { chatWithAgent } from '@/lib/groq'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    const resolvedParams = await params
    const { id } = resolvedParams

    try {
        const session = await prisma.devSession.findUnique({
            where: { id },
            include: {
                agent: {
                    select: { id: true, name: true, model: true, systemPrompt: true }
                }
            }
        })

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Session not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, session })
    } catch (error) {
        console.error('Error fetching session:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch session' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    const resolvedParams = await params
    const { id } = resolvedParams

    try {
        const body = await request.json()
        const { content } = body

        if (!content) {
            return NextResponse.json(
                { success: false, error: 'Message content required' },
                { status: 400 }
            )
        }

        // 1. Fetch current session state
        const session = await prisma.devSession.findUnique({
            where: { id },
            include: { agent: true }
        })

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Session not found' },
                { status: 404 }
            )
        }

        // 2. Append User Message
        const currentMessages = (session.messages as any[]) || []
        const userMessage = {
            role: 'user',
            content,
            timestamp: new Date().toISOString()
        }

        const updatedMessages = [...currentMessages, userMessage]

        // Update DB with user message first (optimistic)
        await prisma.devSession.update({
            where: { id },
            data: {
                messages: updatedMessages,
                updatedAt: new Date()
            }
        })

        // 3. Call Agent
        // We pass the full history to chatWithAgent?
        // chatWithAgent expects { role, content } array.
        const historyForAi = updatedMessages.map(m => ({
            role: m.role,
            content: m.content
        }))

        const aiResponse = await chatWithAgent(
            session.agentId,
            historyForAi,
            {} // No lead context for dev chat
        )

        // 4. Append AI Response
        const aiMessage = {
            role: 'assistant',
            content: aiResponse.message,
            model: aiResponse.model,
            usage: aiResponse.usage,
            timestamp: new Date().toISOString()
        }

        const finalMessages = [...updatedMessages, aiMessage]

        // Update DB with AI response
        await prisma.devSession.update({
            where: { id },
            data: {
                messages: finalMessages,
                updatedAt: new Date()
            }
        })

        return NextResponse.json({ success: true, message: aiMessage })

    } catch (error) {
        console.error('Error in dev chat:', error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    const resolvedParams = await params
    const { id } = resolvedParams

    try {
        await prisma.devSession.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting session:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete session' },
            { status: 500 }
        )
    }
}
