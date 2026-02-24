import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    dbUserId?: string
    dbUserEmail?: string | null
    dbUserName?: string | null
    dbUserRole?: string | null
  }
}
