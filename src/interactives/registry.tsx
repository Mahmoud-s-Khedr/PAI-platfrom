import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { registeredInteractiveComponentIds } from "./component-ids";

export { registeredInteractiveComponentIds } from "./component-ids";

export function BinaryConverter(_: { props: Record<string, unknown> }) {
  const [value, setValue] = useState("10");
  const number = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(number) && number >= 0;
  return <div className="space-y-4"><div><h3 className="font-semibold">Binary converter</h3><p className="text-sm text-muted-foreground">Convert a non-negative decimal number to binary.</p></div><label className="grid gap-2 text-sm font-medium">Decimal<Input value={value} inputMode="numeric" onChange={(event) => setValue(event.target.value)} /></label><div className="rounded-lg bg-muted p-3"><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Binary value</p><Badge variant={valid ? "success" : "outline"} className="font-mono text-sm">{valid ? number.toString(2) : "Enter a non-negative whole number."}</Badge></div></div>;
}

export function PythonPlayground(_: { props: Record<string, unknown> }) {
  return <div className="space-y-2"><h3 className="font-semibold">Python playground</h3><p className="text-sm text-muted-foreground">The interactive shell will be added in a later phase. No Python code runs in this browser yet.</p></div>;
}
