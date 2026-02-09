import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get user from request
    const user = await getAuthFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Buscar dados completos do usuário no banco de dados
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          permissions: true,
          lastLogin: true,
          createdAt: true
        }
      });

      if (dbUser) {
        return NextResponse.json({
          success: true,
          user: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            status: dbUser.status,
            permissions: dbUser.permissions,
            lastLogin: dbUser.lastLogin,
            createdAt: dbUser.createdAt
          }
        });
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Fallback para dados do token se o banco falhar
    }

    // Fallback: retornar dados do token JWT
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
