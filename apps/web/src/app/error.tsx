"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h2 className="font-bold text-2xl tracking-tight">
        Something went wrong
      </h2>
      <p className="mt-2 text-muted-foreground text-sm">
        {error.message || "An unexpected error occurred"}
      </p>
      <Button className="mt-6" onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
