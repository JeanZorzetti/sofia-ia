import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')
    const type = searchParams.get('type')

    const where: any = {}

    if (category && category !== 'all') {
      where.category = category
    }

    if (subcategory && subcategory !== 'all') {
      where.subcategory = subcategory
    }

    if (type && type !== 'all') {
      where.type = type
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: [
        { isOfficial: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: templates,
      total: templates.length
    })
  } catch (error: any) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch templates',
        message: error.message
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, category, subcategory, type, icon, config } = body

    if (!name || !description || !category || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, description, category, type'
        },
        { status: 400 }
      )
    }

    const template = await prisma.template.create({
      data: {
        name,
        description,
        category,
        subcategory: subcategory || null,
        type,
        icon: icon || null,
        config: config || {},
        isOfficial: false,
        usageCount: 0
      }
    })

    return NextResponse.json({
      success: true,
      data: template
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create template',
        message: error.message
      },
      { status: 500 }
    )
  }
}
