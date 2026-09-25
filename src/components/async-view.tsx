import type { ReactNode } from "react";
import type { Language } from "@/lib/types";
import { localizedErrorMessage } from "@/lib/errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AsyncView({ loading, error, onRetry, language = "en", children }: { loading: boolean; error: unknown | null; onRetry?: () => void; language?: Language; children: ReactNode }) {
  if (loading) return <div className="mx-auto max-w-4xl space-y-4 rounded-xl border bg-card p-6 shadow-sm" aria-label="Loading"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-2/3" /><Skeleton className="h-4 w-full" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div></div>;
  if (error) return <Alert variant="destructive" className="mx-auto max-w-2xl" role="alert"><AlertTitle>{language === "ar" ? "تعذّر تحميل الصفحة" : "Unable to load this page"}</AlertTitle><AlertDescription className="space-y-4"><p>{localizedErrorMessage(error, language)}</p>{onRetry && <Button variant="outline" onClick={onRetry}>{language === "ar" ? "إعادة المحاولة" : "Try again"}</Button>}</AlertDescription></Alert>;
  return <>{children}</>;
}
