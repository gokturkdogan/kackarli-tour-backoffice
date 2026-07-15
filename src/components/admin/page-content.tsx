import { cn } from "@/lib/utils";

export function PageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-4 sm:p-6 space-y-4 sm:space-y-6 min-w-0", className)}>
      {children}
    </div>
  );
}
