import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    console.log("=== Starting forgot password process ===");
    const { email } = await req.json();
    console.log("Email received:", email);

    // Check environment variables
    if (!process.env.BREVO_API_KEY) {
      console.error("Missing Brevo API key");
      return Response.json(
        { error: "Email service not configured properly." },
        { status: 500 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    console.log("User found:", !!user);

    // Don't reveal whether the user exists or not for security
    if (!user) {
      return Response.json(
        { message: "If an account exists with this email, a password reset link has been sent." },
        { status: 200 }
      );
    }

    // Delete any existing reset tokens for this user
    console.log("Deleting existing tokens...");
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.user_id },
    });

    // Generate a new token
    console.log("Generating new token...");
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 3); // 3 minutes expiry

    // Save the token to the database
    console.log("Saving token to database...");
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.user_id,
        expiresAt,
      },
    });

    // Send the email
    console.log("Sending email...");
    await sendPasswordResetEmail(email, token);
    console.log("Email sent successfully!");

    return Response.json(
      { message: "If an account exists with this email, a password reset link has been sent." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("=== ERROR in forgot password ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return Response.json(
      { error: "Something went wrong. Please try again later. Details: " + error.message },
      { status: 500 }
    );
  }
}
