import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = await prisma.template.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error: any) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch template',
        message: error.message
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, category, type, icon, config } = body

    const template = await prisma.template.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(category && { category }),
        ...(type && { type }),
        ...(icon !== undefined && { icon }),
        ...(config && { config })
      }
    })

    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error: any) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update template',
        message: error.message
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.template.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete template',
        message: error.message
      },
      { status: 500 }
    )
  }
}
