import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../app/language";
import { registeredInteractiveComponentIds } from "./component-ids";

export { registeredInteractiveComponentIds } from "./component-ids";

const copy = {
  binaryTitle: { ar: "محوّل النظام الثنائي", en: "Binary converter" },
  binaryDescription: { ar: "حوّل عددًا عشريًا صحيحًا غير سالب إلى النظام الثنائي.", en: "Convert a non-negative decimal number to binary." },
  decimal: { ar: "العدد العشري", en: "Decimal" },
  binaryValue: { ar: "القيمة الثنائية", en: "Binary value" },
  invalid: { ar: "أدخل عددًا صحيحًا غير سالب.", en: "Enter a non-negative whole number." },
  pythonTitle: { ar: "بيئة بايثون التفاعلية", en: "Python playground" },
  pythonPending: { ar: "ستُضاف بيئة تشغيل بايثون قريبًا. لا يتم تشغيل أي كود بايثون في المتصفح حاليًا.", en: "The interactive shell will be added in a later phase. No Python code runs in this browser yet." },
} as const;

export function BinaryConverter(_: { props: Record<string, unknown> }) {
  const { language } = useLanguage();
  const [value, setValue] = useState("10");
  const number = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(number) && number >= 0;
  return <div className="space-y-4"><div><h3 className="font-semibold">{copy.binaryTitle[language]}</h3><p className="text-sm text-muted-foreground">{copy.binaryDescription[language]}</p></div><label className="grid gap-2 text-sm font-medium">{copy.decimal[language]}<Input value={value} inputMode="numeric" dir="ltr" onChange={(event) => setValue(event.target.value)} /></label><div className="rounded-lg bg-muted p-3"><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.binaryValue[language]}</p><Badge variant={valid ? "success" : "outline"} className="font-mono text-sm" dir={valid ? "ltr" : undefined}>{valid ? number.toString(2) : copy.invalid[language]}</Badge></div></div>;
}

export function PythonPlayground(_: { props: Record<string, unknown> }) {
  const { language } = useLanguage();
  return <div className="space-y-2"><h3 className="font-semibold">{copy.pythonTitle[language]}</h3><p className="text-sm text-muted-foreground">{copy.pythonPending[language]}</p></div>;
}
