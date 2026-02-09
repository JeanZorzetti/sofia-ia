import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const key = searchParams.get('key');

    // Build where clause
    const where: any = {};
    if (category) where.category = category;
    if (key) where.key = key;

    // Fetch settings
    const settings = await prisma.setting.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    // If specific key requested, return single object
    if (category && key && settings.length === 1) {
      return NextResponse.json({
        success: true,
        data: settings[0]
      });
    }

    // Return array of settings
    return NextResponse.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to manage settings
    // Only admin can update settings
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can update settings' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { category, key, value, description, isEncrypted } = body;

    // Validate required fields
    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { success: false, error: 'category is required and must be a string' },
        { status: 400 }
      );
    }

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'key is required and must be a string' },
        { status: 400 }
      );
    }

    if (value === undefined) {
      return NextResponse.json(
        { success: false, error: 'value is required' },
        { status: 400 }
      );
    }

    // Upsert setting
    const setting = await prisma.setting.upsert({
      where: {
        category_key: {
          category,
          key
        }
      },
      update: {
        value,
        description: description || undefined,
        isEncrypted: isEncrypted || false,
        updatedAt: new Date()
      },
      create: {
        category,
        key,
        value,
        description: description || null,
        isEncrypted: isEncrypted || false
      }
    });

    return NextResponse.json({
      success: true,
      data: setting,
      message: 'Setting saved successfully'
    });

  } catch (error) {
    console.error('Error saving setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save setting' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to manage settings
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can delete settings' },
        { status: 403 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const key = searchParams.get('key');

    if (!category || !key) {
      return NextResponse.json(
        { success: false, error: 'category and key are required' },
        { status: 400 }
      );
    }

    // Delete setting
    await prisma.setting.delete({
      where: {
        category_key: {
          category,
          key
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Setting deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete setting' },
      { status: 500 }
    );
  }
}
