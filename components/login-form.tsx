"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type View = "login" | "forgot-password";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid credentials");
    } else {
      router.push("/admin/dashboard");
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setForgotSuccess(true);
      toast.success(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          {view === "login" ? (
            <form className="p-6 md:p-8" onSubmit={handleLoginSubmit}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground">
                    Login to your account
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                  />
                </Field>
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <button
                      type="button"
                      onClick={() => setView("forgot-password")}
                      className="ml-auto text-sm underline-offset-2 hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                  <Input id="password" name="password" type="password" required />
                </Field>
                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}
                <Field>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          ) : (
            <form className="p-6 md:p-8" onSubmit={handleForgotPasswordSubmit}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Forgot Password</h1>
                  {forgotSuccess ? (
                    <p className="text-balance text-muted-foreground">
                      If an account exists with this email, a password reset link has been sent.
                    </p>
                  ) : (
                    <p className="text-balance text-muted-foreground">
                      Enter your email to receive a password reset link.
                    </p>
                  )}
                </div>
                {!forgotSuccess && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="m@example.com"
                        required
                      />
                    </Field>
                    {error && (
                      <div className="text-red-500 text-sm">{error}</div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Button type="submit" disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Link"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setView("login");
                          setError(null);
                          setForgotEmail("");
                        }}
                      >
                        Back to Login
                      </Button>
                    </div>
                  </>
                )}
                {forgotSuccess && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setView("login");
                      setForgotSuccess(false);
                      setForgotEmail("");
                      setError(null);
                    }}
                  >
                    Back to Login
                  </Button>
                )}
              </FieldGroup>
            </form>
          )}
          <div className="relative hidden bg-muted md:block">
            <img
              src="/login_logo.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
