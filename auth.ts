
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("=== Authorize function called ===");
        console.log("Credentials email:", credentials?.email);
        console.log("TEST_EMAIL env var:", process.env.TEST_EMAIL ? "exists" : "missing");
        console.log("TEST_PASSWORD env var:", process.env.TEST_PASSWORD ? "exists" : "missing");
        
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing email or password");
          return null;
        }

        // Check if it's the testing account first
        if (
          process.env.TEST_EMAIL &&
          process.env.TEST_PASSWORD &&
          credentials.email === process.env.TEST_EMAIL &&
          credentials.password === process.env.TEST_PASSWORD
        ) {
          console.log("Test account login successful!");
          // Return testing user (no database needed)
          return {
            id: "test-user-123",
            email: process.env.TEST_EMAIL,
            name: "Test User",
            role: "ADMIN",
          };
        }

        console.log("Not test account, checking database...");
        try {
          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password) {
            console.log("User not found or missing password");
            return null;
          }

          // Check password
          const passwordMatch = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!passwordMatch) {
            console.log("Password mismatch");
            return null;
          }

          console.log("Database user login successful!");
          // Return user object without password
          return {
            id: user.user_id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (dbError) {
          console.error("Database error during login:", dbError);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
