import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        category: 'company',
      },
    });

    // Convert array of settings to object
    const companyData: Record<string, unknown> = {};
    settings.forEach((setting) => {
      companyData[setting.key] = setting.value;
    });

    return NextResponse.json({ company: companyData });
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, cnpj, phone, email, address, logoUrl, website } = body;

    const settingsToUpdate = [
      { key: 'name', value: name },
      { key: 'cnpj', value: cnpj },
      { key: 'phone', value: phone },
      { key: 'email', value: email },
      { key: 'address', value: address },
      { key: 'logoUrl', value: logoUrl },
      { key: 'website', value: website },
    ];

    // Upsert each setting
    for (const setting of settingsToUpdate) {
      if (setting.value !== undefined) {
        await prisma.setting.upsert({
          where: {
            category_key: {
              category: 'company',
              key: setting.key,
            },
          },
          create: {
            category: 'company',
            key: setting.key,
            value: setting.value,
          },
          update: {
            value: setting.value,
          },
        });
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'company.updated',
        resourceType: 'settings',
        resourceId: null,
        details: body,
      },
    });

    // Fetch updated settings
    const updatedSettings = await prisma.setting.findMany({
      where: {
        category: 'company',
      },
    });

    const companyData: Record<string, unknown> = {};
    updatedSettings.forEach((setting) => {
      companyData[setting.key] = setting.value;
    });

    return NextResponse.json({ company: companyData });
  } catch (error) {
    console.error('Error updating company settings:', error);
    return NextResponse.json(
      { error: 'Failed to update company settings' },
      { status: 500 }
    );
  }
}
