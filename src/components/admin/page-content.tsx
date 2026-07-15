import { cn } from "@/lib/utils";

export function PageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-6 space-y-6 min-w-0 max-md:p-4 max-md:space-y-4", className)}>
      {children}
    </div>
  );
}
