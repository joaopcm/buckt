export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-foreground text-background p-12">
        <div>
          <span className="text-xl font-bold tracking-tight">buckt</span>
        </div>
        <div className="space-y-4">
          <blockquote className="text-lg font-medium leading-relaxed max-w-md">
            &ldquo;We went from manually provisioning S3 buckets to having branded
            asset delivery in under 5 minutes.&rdquo;
          </blockquote>
          <p className="text-sm text-background/60">
            Engineering Team at Acme Corp
          </p>
        </div>
        <p className="text-xs text-background/40">
          Branded S3 buckets on demand
        </p>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
