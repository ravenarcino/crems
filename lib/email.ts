export async function sendPasswordResetEmail(to: string, token: string) {
  try {
    console.log("=== Preparing to send password reset email via Brevo REST API ===");
    console.log("From:", process.env.BREVO_FROM_EMAIL);
    console.log("To:", to);

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
    console.log("Reset URL:", resetUrl);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY || "",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_FROM_EMAIL || "no-reply@crems.com",
          name: "CREMS",
        },
        to: [
          {
            email: to,
          },
        ],
        subject: "Password Reset Request",
        htmlContent: `
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link will expire in 3 minutes.</p>
        `,
      }),
    });

    console.log("Brevo API response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo API error response:", errorText);
      throw new Error(`Failed to send email: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("=== Email sent successfully ===");
    console.log("Message ID:", data.messageId);
  } catch (error: any) {
    console.error("=== Error sending email via Brevo ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}
