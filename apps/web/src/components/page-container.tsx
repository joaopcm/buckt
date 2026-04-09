import { cn } from "@/utils/utils";

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-6 py-6", className)}>
      {children}
    </div>
  );
}
