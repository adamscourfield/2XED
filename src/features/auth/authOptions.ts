import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/db/prisma';
import { z } from 'zod';

if (process.env.NODE_ENV !== 'production') {
  process.env.NEXTAUTH_SECRET ??= 'ember-local-dev-secret';
  process.env.NEXTAUTH_URL ??= 'http://localhost:3000';
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.enum(['true', 'false']).optional(),
});

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        remember: { label: 'Remember me', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        const remember = parsed.data.remember === 'true';

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          remember,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        const remember = Boolean((user as unknown as { remember?: boolean }).remember);
        const maxAgeSec = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
        token.exp = Math.floor(Date.now() / 1000) + maxAgeSec;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id: string; role: string }).id = token.id as string;
        (session.user as { id: string; role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
