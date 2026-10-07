import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { database } from './services/database/mongodb.ts';
import { verifyPassword } from './services/database/password.ts';

const credentialsSchema = z.object({ email: z.email().max(254), password: z.string().min(12).max(128) });
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  providers: [Credentials({
    credentials: { email: { type: 'email' }, password: { type: 'password' } },
    async authorize(input) {
      const parsed = credentialsSchema.safeParse(input);
      if (!parsed.success) return null;
      const email = parsed.data.email.toLowerCase().trim();
      const db = await database();
      const bucket = Math.floor(Date.now() / 60000);
      const limit = await db.collection('login_limits').findOneAndUpdate(
        { email, bucket }, { $inc: { count: 1 }, $set: { expiresAt: new Date(Date.now() + 120000) } },
        { upsert: true, returnDocument: 'after' },
      );
      if ((limit?.count ?? 0) > 10) return null;
      const user = await db.collection('users').findOne({ email });
      if (!user || !await verifyPassword(parsed.data.password, user.passwordHash)) return null;
      return { id: user._id.toString(), email: user.email, name: user.name };
    },
  })],
  callbacks: {
    jwt({ token, user }) { if (user) token.sub = user.id; return token; },
    session({ session, token }) { if (session.user && token.sub) session.user.id = token.sub; return session; },
  },
});
