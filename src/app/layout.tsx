import { Link, Outlet } from "react-router-dom";
import { Languages } from "lucide-react";
import { useLanguage } from "./language";
import { Button } from "@/components/ui/button";
import logo from "../assets/branding/logo-transparent-cropped.png";

export function Layout() {
  const { language, setLanguage } = useLanguage();
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--secondary),_transparent_38rem)]">
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link className="flex items-center" to="/" aria-label="Home"><img className="h-10 w-auto object-contain" src={logo} alt="" /></Link>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-xs" aria-label="Language">
          <Languages className="mx-1 size-4 text-muted-foreground" aria-hidden="true" />
          <Button size="sm" variant={language === "ar" ? "default" : "ghost"} onClick={() => setLanguage("ar")}>العربية</Button>
          <Button size="sm" variant={language === "en" ? "default" : "ghost"} onClick={() => setLanguage("en")}>English</Button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><Outlet /></main>
  </div>;
}
