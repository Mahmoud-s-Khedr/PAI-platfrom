import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useLanguage } from "../app/language";
import { useAuth } from "../app/auth";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

function safeReturnTo(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function LoginPage() {
  const { language } = useLanguage();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const failed = params.get("error") === "google_signin_failed";
  const isArabic = language === "ar";
  const signIn = () => { window.location.assign(`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`); };
  const signInWithPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setPasswordError(null);
    try {
      await api.passwordLogin(email, password);
      await refresh();
      navigate(returnTo, { replace: true });
    } catch (reason) {
      setPasswordError(reason instanceof Error ? reason.message : isArabic ? "تعذّر تسجيل الدخول. حاول مرة أخرى." : "Sign-in could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="mx-auto max-w-md"><Card><CardHeader><CardTitle>{isArabic ? "تسجيل الدخول" : "Sign in"}</CardTitle><CardDescription>{isArabic ? "اختياري للطلاب، ومطلوب للوصول إلى أدوات الإدارة." : "Optional for students and required for administration."}</CardDescription></CardHeader><CardContent className="space-y-5">
    {failed && <p className="text-sm text-destructive" role="alert">{isArabic ? "تعذّر إتمام تسجيل الدخول عبر Google. حاول مرة أخرى." : "Google sign-in could not be completed. Please try again."}</p>}
    {user ? <p className="text-sm">{isArabic ? `تم تسجيل الدخول باسم ${user.displayName}.` : `Signed in as ${user.displayName}.`}</p> : <>
      <form className="space-y-4" onSubmit={signInWithPassword}>
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="login-email">{isArabic ? "البريد الإلكتروني" : "Email"}</label><Input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="login-password">{isArabic ? "كلمة المرور" : "Password"}</label><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
        {passwordError && <p className="text-sm text-destructive" role="alert">{passwordError}</p>}
        <Button className="w-full" type="submit" disabled={submitting}><LogIn className="size-4" />{submitting ? (isArabic ? "جارٍ تسجيل الدخول…" : "Signing in…") : (isArabic ? "تسجيل الدخول بالبريد الإلكتروني" : "Sign in with email")}</Button>
      </form>
      <div className="flex items-center gap-3"><Separator className="flex-1" /><span className="text-xs text-muted-foreground">{isArabic ? "أو" : "or"}</span><Separator className="flex-1" /></div>
      <Button className="w-full" type="button" variant="outline" onClick={signIn}><LogIn className="size-4" />{isArabic ? "المتابعة باستخدام Google" : "Continue with Google"}</Button>
    </>}
  </CardContent></Card></div>;
}
