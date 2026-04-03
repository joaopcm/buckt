export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <div>
          <span className="font-bold text-xl tracking-tight">buckt</span>
        </div>
        <div className="space-y-4">
          <blockquote className="max-w-md font-medium text-lg leading-relaxed">
            &ldquo;We went from manually provisioning S3 buckets to having
            branded asset delivery in under 5 minutes.&rdquo;
          </blockquote>
          <p className="text-background/60 text-sm">
            Engineering Team at Acme Corp
          </p>
        </div>
        <p className="text-background/40 text-xs">
          Branded S3 buckets on demand
        </p>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
