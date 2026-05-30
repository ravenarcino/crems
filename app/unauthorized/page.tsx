
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold mb-4">Unauthorized</h1>
        <p className="text-muted-foreground mb-8">
          You don't have permission to access this page.
        </p>
        <Link href="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          Go Home
        </Link>
      </div>
    </div>
  );
}
