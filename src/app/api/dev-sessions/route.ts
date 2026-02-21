
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const sessions = await prisma.devSession.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                agent: {
                    select: { name: true, model: true }
                }
            }
        })

        return NextResponse.json({ success: true, sessions })
    } catch (error) {
        console.error('Error fetching dev sessions:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch sessions' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, agentId } = body

        if (!name || !agentId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const session = await prisma.devSession.create({
            data: {
                name,
                agentId,
                messages: []
            },
            include: {
                agent: {
                    select: { name: true, model: true }
                }
            }
        })

        return NextResponse.json({ success: true, session })
    } catch (error) {
        console.error('Error creating dev session:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create session' },
            { status: 500 }
        )
    }
}
