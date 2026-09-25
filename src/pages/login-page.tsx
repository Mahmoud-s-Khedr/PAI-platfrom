import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useLanguage } from "../app/language";
import { useAuth } from "../app/auth";
import { PageMetadata } from "../app/page-metadata";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { validateLogin, type FormErrors } from "../lib/admin-validation";

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
  const [errors, setErrors] = useState<FormErrors>({});
  const failed = params.get("error") === "google_signin_failed";
  const isArabic = language === "ar";
  const signIn = () => { window.location.assign(`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`); };
  const signInWithPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateLogin(email, password, language);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setSubmitting(true);
    setPasswordError(null);
    try {
      await api.passwordLogin(email, password);
      await refresh();
      navigate(returnTo, { replace: true });
    } catch (reason) {
      setPasswordError(isArabic ? "البريد الإلكتروني أو كلمة المرور غير صحيحة، أو تعذّر تسجيل الدخول. حاول مرة أخرى." : "Email or password is incorrect, or sign-in could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="mx-auto max-w-md"><PageMetadata title={isArabic ? "تسجيل الدخول" : "Sign in"} description={isArabic ? "تسجيل الدخول إلى منصة البرمجة والذكاء الاصطناعي." : "Sign in to the Programming and Artificial Intelligence platform."} language={language} noIndex /><Card><CardHeader><CardTitle>{isArabic ? "تسجيل الدخول" : "Sign in"}</CardTitle><CardDescription>{isArabic ? "اختياري للطلاب، ومطلوب للوصول إلى أدوات الإدارة." : "Optional for students and required for administration."}</CardDescription></CardHeader><CardContent className="space-y-5">
    {failed && <p className="text-sm text-destructive" role="alert">{isArabic ? "تعذّر إتمام تسجيل الدخول عبر Google. حاول مرة أخرى." : "Google sign-in could not be completed. Please try again."}</p>}
    {user ? <p className="text-sm">{isArabic ? `تم تسجيل الدخول باسم ${user.displayName}.` : `Signed in as ${user.displayName}.`}</p> : <>
      <form className="space-y-4" onSubmit={signInWithPassword} noValidate>
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="login-email">{isArabic ? "البريد الإلكتروني" : "Email"}</label><Input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setErrors(({ email: _email, ...rest }) => rest); setPasswordError(null); }} aria-invalid={Boolean(errors.email) || undefined} aria-describedby={errors.email ? "login-email-error" : undefined} required />{errors.email && <p id="login-email-error" className="text-sm text-destructive" role="alert">{errors.email}</p>}</div>
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="login-password">{isArabic ? "كلمة المرور" : "Password"}</label><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setErrors(({ password: _password, ...rest }) => rest); setPasswordError(null); }} aria-invalid={Boolean(errors.password) || undefined} aria-describedby={errors.password ? "login-password-error" : undefined} required />{errors.password && <p id="login-password-error" className="text-sm text-destructive" role="alert">{errors.password}</p>}</div>
        {passwordError && <p className="text-sm text-destructive" role="alert">{passwordError}</p>}
        <Button className="w-full" type="submit" disabled={submitting}><LogIn className="size-4" />{submitting ? (isArabic ? "جارٍ تسجيل الدخول…" : "Signing in…") : (isArabic ? "تسجيل الدخول بالبريد الإلكتروني" : "Sign in with email")}</Button>
      </form>
      <div className="flex items-center gap-3"><Separator className="flex-1" /><span className="text-xs text-muted-foreground">{isArabic ? "أو" : "or"}</span><Separator className="flex-1" /></div>
      <Button className="w-full" type="button" variant="outline" onClick={signIn}><LogIn className="size-4" />{isArabic ? "المتابعة باستخدام Google" : "Continue with Google"}</Button>
    </>}
  </CardContent></Card></div>;
}
