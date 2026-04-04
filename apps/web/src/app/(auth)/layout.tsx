import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mb-8">
        <Link className="flex items-center gap-2" href="/">
          <div className="flex h-7 w-7 items-center justify-center bg-primary font-bold text-primary-foreground text-xs">
            B
          </div>
          <span className="font-bold text-base tracking-tight">buckt</span>
        </Link>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
