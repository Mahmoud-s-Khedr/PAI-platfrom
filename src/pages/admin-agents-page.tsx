import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Bot, Check, Copy, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../app/language";
import { AsyncView } from "../components/async-view";
import { api } from "../lib/api";
import { localizedErrorMessage } from "../lib/errors";
import type { AgentToken, AuditEntry, CreatedAgentToken } from "../lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, formatAdminDate } from "./admin-shared";

const copy = {
  ar: { title: "وكلاء الذكاء الاصطناعي", intro: "يتصل كل وكيل بخادم MCP عبر رمز خاص به يمكن إلغاؤه في أي وقت.", back: "العودة إلى الإدارة", name: "اسم الوكيل", namePlaceholder: "مثال: claude-code", create: "إنشاء رمز", creating: "جارٍ الإنشاء…", once: "انسخ هذا الرمز الآن؛ لن يظهر مرة أخرى.", copyToken: "نسخ الرمز", copied: "تم النسخ", tokens: "الرموز", none: "لا توجد رموز بعد.", created: "أُنشئ", lastUsed: "آخر استخدام", never: "لم يُستخدم", revoked: "ملغى", active: "نشط", revoke: "إلغاء", audit: "سجل التعديلات الأخير", noAudit: "لا توجد تعديلات مسجلة بعد.", agent: "وكيل", admin: "المدير", endpoint: "عنوان MCP" },
  en: { title: "AI agents", intro: "Each agent connects to the MCP server with its own token, which you can revoke at any time.", back: "Back to admin", name: "Agent name", namePlaceholder: "e.g. claude-code", create: "Create token", creating: "Creating…", once: "Copy this token now — it will not be shown again.", copyToken: "Copy token", copied: "Copied", tokens: "Tokens", none: "No tokens yet.", created: "Created", lastUsed: "Last used", never: "Never used", revoked: "Revoked", active: "Active", revoke: "Revoke", audit: "Recent changes", noAudit: "No changes recorded yet.", agent: "Agent", admin: "Admin", endpoint: "MCP endpoint" },
} as const;

function entityLink(entry: AuditEntry): string | null {
  if (entry.entityId === null) return null;
  if (entry.entityType === "course") return `/admin/courses/${entry.entityId}`;
  if (entry.entityType === "lesson") return `/admin/lessons/${entry.entityId}`;
  if (entry.entityType === "question") return `/admin/questions/${entry.entityId}/edit`;
  return null;
}

export function AdminAgentsPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const [tokens, setTokens] = useState<AgentToken[] | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreatedAgentToken | null>(null);
  const [copied, setCopied] = useState(false);
  const endpoint = `${window.location.origin}/api/mcp`;

  function load() {
    void Promise.all([api.agentTokens(), api.auditLog(50)]).then(([loadedTokens, entries]) => { setTokens(loadedTokens); setAudit(entries); }).catch(setLoadError);
  }
  useEffect(load, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setActionError(null); setSaving(true); setCopied(false);
    try { setCreated(await api.createAgentToken(name.trim())); setName(""); load(); } catch (reason) { setActionError(localizedErrorMessage(reason, language)); } finally { setSaving(false); }
  }

  async function revoke(id: number) {
    setActionError(null);
    try { await api.revokeAgentToken(id); load(); } catch (reason) { setActionError(localizedErrorMessage(reason, language)); }
  }

  async function copyToken() {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.token); setCopied(true); } catch { setCopied(false); }
  }

  return <AsyncView loading={!tokens && !loadError} error={loadError} language={language} onRetry={load}>
    <section className="space-y-6">
      <div>
        <Button variant="link" className="px-0" asChild><Link to="/admin"><ArrowLeft className="size-4 rtl:rotate-180" />{t.back}</Link></Button>
        <h1 className="flex items-center gap-2 text-3xl font-bold"><Bot className="size-7" aria-hidden="true" />{t.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.intro}</p>
        <p className="mt-2 text-sm">{t.endpoint}: <code className="rounded bg-muted px-1.5 py-0.5" dir="ltr">{endpoint}</code></p>
      </div>
      {actionError && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{actionError}</p>}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => void create(event)}>
            <div className="min-w-60 flex-1"><Field label={t.name}><Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.namePlaceholder} dir="ltr" maxLength={80} required /></Field></div>
            <Button type="submit" disabled={saving || !name.trim()}><KeyRound className="size-4" aria-hidden="true" />{saving ? t.creating : t.create}</Button>
          </form>
          {created && <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950 dark:text-amber-50" role="status">
            <p className="text-sm font-medium">{t.once}</p>
            <div className="flex flex-wrap items-center gap-2"><code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-1 text-sm text-foreground" dir="ltr">{created.token}</code><Button size="sm" variant="outline" onClick={() => void copyToken()}>{copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{copied ? t.copied : t.copyToken}</Button></div>
          </div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t.tokens}</CardTitle></CardHeader>
        <CardContent>
          {tokens?.length ? <ul className="divide-y rounded-lg border">{tokens.map((token) => <li key={token.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div><p className="font-medium" dir="ltr">{token.name}</p><p className="text-sm text-muted-foreground">{t.created} {formatAdminDate(token.createdAt, language)} · {token.lastUsedAt ? `${t.lastUsed} ${formatAdminDate(token.lastUsedAt, language)}` : t.never}</p></div>
            {token.revokedAt ? <Badge variant="secondary">{t.revoked}</Badge> : <div className="flex items-center gap-2"><Badge>{t.active}</Badge><Button size="sm" variant="outline" onClick={() => void revoke(token.id)} aria-label={`${t.revoke} ${token.name}`}>{t.revoke}</Button></div>}
          </li>)}</ul> : <p className="text-sm text-muted-foreground">{t.none}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t.audit}</CardTitle></CardHeader>
        <CardContent>
          {audit.length ? <ul className="divide-y rounded-lg border text-sm">{audit.map((entry) => {
            const href = entityLink(entry);
            const target = `${entry.entityType}${entry.entityId === null ? "" : ` #${entry.entityId}`}`;
            return <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 p-3">
              <div className="min-w-0"><span className="font-medium" dir="ltr">{entry.actorName}</span> <Badge variant="outline">{entry.actorType === "agent" ? t.agent : t.admin}</Badge> <span dir="ltr">{entry.action} {href ? <Link className="underline" to={href}>{target}</Link> : target}</span>{entry.summary && <p className="text-muted-foreground" dir="ltr">{entry.summary}</p>}</div>
              <time className="text-muted-foreground" dateTime={entry.createdAt}>{formatAdminDate(entry.createdAt, language)}</time>
            </li>;
          })}</ul> : <p className="text-sm text-muted-foreground">{t.noAudit}</p>}
        </CardContent>
      </Card>
    </section>
  </AsyncView>;
}
