import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { useLanguage } from "../app/language";
import { PageMetadata } from "../app/page-metadata";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PageNotFound() {
  const { language } = useLanguage();
  const copy = language === "ar"
    ? { title: "الصفحة غير موجودة", description: "لم يتم العثور على الصفحة التي طلبتها.", home: "العودة إلى الصفحة الرئيسية", search: "البحث في المنصة" }
    : { title: "Page not found", description: "The page you requested could not be found.", home: "Back to home", search: "Search the platform" };
  return <section className="mx-auto max-w-2xl"><PageMetadata title={copy.title} description={copy.description} language={language} noIndex /><Card><CardContent className="flex flex-col items-center gap-4 py-12 text-center"><span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Compass className="size-6" /></span><h1 className="text-2xl font-semibold">{copy.title}</h1><p className="text-muted-foreground">{copy.description}</p><div className="flex flex-wrap justify-center gap-3"><Button asChild><Link to="/">{copy.home}</Link></Button><Button variant="outline" asChild><Link to="/search">{copy.search}</Link></Button></div></CardContent></Card></section>;
}
