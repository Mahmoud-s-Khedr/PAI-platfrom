import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function AsyncView({ loading, error, children }: { loading: boolean; error: string | null; children: ReactNode }) {
  if (loading) return <div className="mx-auto max-w-4xl space-y-4 rounded-xl border bg-card p-6 shadow-sm" aria-label="Loading"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-2/3" /><Skeleton className="h-4 w-full" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div></div>;
  if (error) return <Alert variant="destructive" className="mx-auto max-w-2xl"><AlertTitle>Unable to load this page</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  return <>{children}</>;
}
