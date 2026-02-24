import { type AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google' || !user.email) return false

      try {
        let dbUser = await prisma.user.findUnique({ where: { email: user.email } })

        if (!dbUser) {
          // Novo usuário via Google — cria conta sem senha
          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? user.email.split('@')[0],
              passwordHash: `OAUTH:google:${account.providerAccountId}`,
              role: 'user',
              status: 'active',
              googleId: account.providerAccountId,
              lastLogin: new Date(),
            },
          })
        } else {
          // Usuário existente — vincula Google ID e atualiza login
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              googleId: dbUser.googleId ?? account.providerAccountId,
              lastLogin: new Date(),
            },
          })
        }

        // Sobrescreve o user.id com nosso UUID real do DB
        user.id = dbUser.id
        return true
      } catch (error) {
        console.error('[Google OAuth] signIn callback error:', error)
        return false
      }
    },

    async jwt({ token, user }) {
      // Só na primeira vez (sign-in), user está disponível
      if (user?.id) {
        token.dbUserId = user.id
        token.dbUserEmail = user.email
        token.dbUserName = user.name
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = (token.dbUserId as string) ?? ''
      return session
    },

    // Redireciona para nosso finalizador após OAuth
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl) || url.startsWith('/')) return url
      return `${baseUrl}/api/auth/google-finalize`
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}
