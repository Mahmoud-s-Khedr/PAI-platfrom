import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { AsyncView } from "../components/async-view";
import { useLanguage } from "../app/language";
import { api } from "../lib/api";
import type { AdminAsset, AssetKind } from "../lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, formatAdminDate } from "./admin-shared";
import { validateAdminAsset, type FormErrors } from "../lib/admin-validation";

const kinds: AssetKind[] = ["image", "worksheet", "dataset", "resource"];
const labels = {
  image: { ar: "صورة", en: "Image" },
  worksheet: { ar: "ورقة عمل", en: "Worksheet" },
  dataset: { ar: "مجموعة بيانات", en: "Dataset" },
  resource: { ar: "مورد قابل للتنزيل", en: "Downloadable resource" },
} as const;
const accepts = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  worksheet: "application/pdf",
  dataset: "text/csv,application/json",
  resource: ".pdf,.zip,.docx,.xlsx,.csv,.json,.yaml,.yml,.toml,.txt,application/pdf,application/zip,application/x-zip-compressed,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/json,application/x-yaml,text/yaml,text/x-yaml,application/toml",
} as const;

export function AdminAssetsPage() {
  const { language } = useLanguage();
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [kind, setKind] = useState<AssetKind>("image");
  const [file, setFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void api
      .adminAssets()
      .then(setAssets)
      .catch((reason: unknown) =>
        setLoadError(
          reason instanceof Error ? reason.message : "Unable to load assets",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  async function upload(event: FormEvent) {
    event.preventDefault();
    const validation = validateAdminAsset(kind, file, language);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    if (!file) return;
    setSaving(true);
    setActionError(null);
    try {
      const asset = await api.uploadAdminAsset(kind, file);
      setAssets((current) => [asset, ...current]);
      setFile(null);
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Unable to upload asset",
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove(asset: AdminAsset) {
    if (
      !window.confirm(
        language === "ar"
          ? `حذف ${asset.fileName} نهائيًا؟`
          : `Permanently delete ${asset.fileName}?`,
      )
    )
      return;
    setSaving(true);
    setActionError(null);
    try {
      await api.deleteAdminAsset(asset.id);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Unable to delete asset",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <AsyncView loading={loading} error={loadError && !assets.length ? loadError : null}>
      <section className="space-y-6">
        <div>
          <Button variant="link" className="px-0" asChild>
            <Link to="/admin">
              <ArrowLeft className="size-4" />
              {language === "ar" ? "العودة إلى الإدارة" : "Back to admin"}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">
            {language === "ar" ? "الوسائط والملفات" : "Assets"}
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              {language === "ar" ? "رفع ملف" : "Upload file"}
            </CardTitle>
            <CardDescription>
              {language === "ar"
                ? "لا تُقبل SVG أو HTML أو الملفات التنفيذية."
                : "SVG, HTML, and executable files are not accepted."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
              onSubmit={upload}
              noValidate
            >
              <Field label={language === "ar" ? "النوع" : "Type"}>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value as AssetKind);
                    setFile(null);
                    setErrors({});
                  }}
                >
                  {kinds.map((item) => (
                    <option key={item} value={item}>
                      {labels[item][language]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={language === "ar" ? "الملف" : "File"} error={errors.file}>
                <Input
                  type="file"
                  accept={accepts[kind]}
                  onChange={(event) => { setFile(event.target.files?.[0] ?? null); setErrors({}); setActionError(null); }}
                  required
                />
              </Field>
              <Button className="self-end" disabled={saving || !file}>
                <Upload className="size-4" />
                {saving
                  ? language === "ar"
                    ? "جارٍ الرفع…"
                    : "Uploading…"
                  : language === "ar"
                    ? "رفع"
                    : "Upload"}
              </Button>
            </form>
            {actionError && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {actionError}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {language === "ar"
                ? `كل الملفات (${assets.length})`
                : `All assets (${assets.length})`}
            </CardTitle>
            <CardDescription>
              {language === "ar"
                ? "العناصر ذات الاستخدام صفر هي ملفات يتيمة ويمكن حذفها."
                : "Items with zero uses are orphaned and can be deleted."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assets.length ? (
              <ul className="divide-y rounded-lg border">
                {assets.map((asset) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 p-3"
                    key={asset.id}
                  >
                    <div className="min-w-0">
                      <a
                        className="font-medium hover:underline"
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {asset.fileName}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {labels[asset.kind][language]} · {asset.mimeType} ·{" "}
                        {(asset.size / 1024).toFixed(1)} KB ·{" "}
                        {formatAdminDate(asset.createdAt, language)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {language === "ar"
                          ? `${asset.linkedBlockCount} استخدام`
                          : `${asset.linkedBlockCount} uses`}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={
                          language === "ar" ? "حذف الملف" : "Delete asset"
                        }
                        disabled={saving || asset.linkedBlockCount > 0}
                        onClick={() => void remove(asset)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {language === "ar"
                  ? "لا توجد ملفات مرفوعة بعد."
                  : "No uploaded assets yet."}
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </AsyncView>
  );
}
