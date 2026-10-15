import { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Languages, Search } from "lucide-react";
import { useLanguage } from "./language";
import { useAuth } from "./auth";
import { Button } from "@/components/ui/button";
import { AsyncView } from "../components/async-view";
import logo from "../assets/branding/logo-header.webp";

export function Layout() {
  const { language, setLanguage } = useLanguage();
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const signIn = () => { window.location.assign(`/login?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`); };
  const signOut = () => { void logout(); };
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--secondary),_transparent_38rem)]">
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link className="flex items-center" to="/" aria-label={language === "ar" ? "الصفحة الرئيسية" : "Home"}><img className="h-10 w-auto object-contain" src={logo} width={47} height={40} alt="" /></Link>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" asChild><Link to="/search" aria-label={language === "ar" ? "البحث في المنصة" : "Search the platform"}><Search className="size-4" /><span className="hidden sm:inline">{language === "ar" ? "بحث" : "Search"}</span></Link></Button>
          {!loading && (user ? <><span className="hidden text-sm text-muted-foreground sm:inline">{user.displayName}</span>{user.role === "admin" && <Button size="sm" variant="outline" asChild><Link to="/admin">{language === "ar" ? "الإدارة" : "Admin"}</Link></Button>}<Button size="sm" variant="ghost" onClick={signOut}>{language === "ar" ? "تسجيل الخروج" : "Sign out"}</Button></> : <Button size="sm" variant="outline" onClick={signIn}>{language === "ar" ? "تسجيل الدخول" : "Sign in"}</Button>)}
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-xs" aria-label={language === "ar" ? "اللغة" : "Language"}>
            <Languages className="mx-1 size-4 text-muted-foreground" aria-hidden="true" />
            <Button size="sm" variant={language === "ar" ? "default" : "ghost"} onClick={() => setLanguage("ar")}>العربية</Button>
            <Button size="sm" variant={language === "en" ? "default" : "ghost"} onClick={() => setLanguage("en")}>English</Button>
          </div>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><Suspense fallback={<AsyncView loading error={null} language={language}>{null}</AsyncView>}><Outlet /></Suspense></main>
  </div>;
}
