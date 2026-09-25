import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AsyncView } from "../components/async-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "../app/language";
import { api } from "../lib/api";
import { calloutTones, type CalloutTone } from "../lib/types";
import type {
  AdminAsset,
  AdminBlockInput,
  AdminLesson,
  AdminLessonBlock,
  AdminLessonInput,
  ContentStatus,
  LessonBlockType,
  LocalizedText,
} from "../lib/types";
import {
  Field,
  LocalizedFields,
  StatusBadge,
  StatusSelect,
  adminCopy,
  formatAdminDate,
} from "./admin-shared";
import { MarkdownRenderer } from "../lesson-blocks/markdown-renderer";
import { LessonBlock } from "../lesson-blocks/lesson-block";
import { validateAdminAsset, validateAdminBlock, validateAdminLesson, type FormErrors } from "../lib/admin-validation";
import {
  interactiveComponentDetails,
  registeredInteractiveComponentIds,
} from "../interactives/component-ids";

const blockLabels = {
  "rich-text": { ar: "نص", en: "Rich text" },
  image: { ar: "صورة", en: "Image" },
  file: { ar: "ملف قابل للتنزيل", en: "Downloadable file" },
  code: { ar: "رمز برمجي", en: "Code" },
  callout: { ar: "تنبيه", en: "Callout" },
  interactive: { ar: "تفاعل", en: "Interactive" },
} as const;
const blockTypes: LessonBlockType[] = [
  "rich-text",
  "image",
  "file",
  "code",
  "callout",
  "interactive",
];
const calloutToneLabels: Record<CalloutTone, LocalizedText> = {
  "key-concept": { ar: "مفهوم أساسي", en: "Key concept" },
  note: { ar: "ملاحظة", en: "Note" },
  tip: { ar: "نصيحة", en: "Tip" },
  warning: { ar: "تنبيه", en: "Warning" },
  example: { ar: "مثال", en: "Example" },
};

function lessonForm(lesson: AdminLesson): AdminLessonInput {
  return {
    courseId: lesson.courseId,
    slug: lesson.slug,
    title: lesson.title,
    youtubeVideoId: lesson.youtubeVideoId,
    status: lesson.status,
    sortOrder: lesson.sortOrder,
  };
}

function blankData(type: LessonBlockType): unknown {
  if (type === "rich-text") return { ar: "نص جديد", en: "New text" };
  if (type === "image")
    return {
      src: "https://",
      alt: { ar: "", en: "" },
      caption: { ar: "", en: "" },
    };
  if (type === "file")
    return {
      assetId: undefined,
      title: { ar: "", en: "" },
      description: { ar: "", en: "" },
    };
  if (type === "code") return { language: "python", code: "" };
  if (type === "callout") return { ar: "ملاحظة", en: "Note", tone: "note" };
  return { component: "", props: {} };
}

function localText(value: unknown): LocalizedText {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    ar: typeof source.ar === "string" ? source.ar : "",
    en: typeof source.en === "string" ? source.en : "",
  };
}

function RichTextEditor({
  value,
  onChange,
  onFieldChange,
  language,
}: {
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  onFieldChange?: (key: keyof LocalizedText) => void;
  language: "ar" | "en";
}) {
  const [showPreview, setShowPreview] = useState(false);
  const copy =
    language === "ar"
      ? {
          help: "صيغة Markdown المدعومة",
          description:
            "استخدم # للعناوين، و**غامق** أو *مائل*، والقوائم بـ - أو 1.، والروابط [عنوان](https://example.com)، و`رمز`، وكتل ```python. تدعم الجداول وقوائم المهام أيضاً.",
          safety:
            "لن تُعرض وسوم HTML أو الصور داخل Markdown. أضف الصور باستخدام كتلة الصورة المخصصة.",
          show: "إظهار معاينة العربية",
          hide: "إخفاء المعاينة",
          preview: "معاينة المحتوى",
        }
      : {
          help: "Supported Markdown",
          description:
            "Use # for headings, **bold** or *italic*, - or 1. for lists, [label](https://example.com) for links, `code`, and ```python for code fences. Tables and task lists are supported too.",
          safety:
            "HTML tags and Markdown images are not rendered. Add images with the dedicated image block.",
          show: "Show English preview",
          hide: "Hide preview",
          preview: "Content preview",
        };

  return (
    <div className="space-y-3">
      <LocalizedFields
        label={language === "ar" ? "المحتوى" : "Content"}
        value={value}
        onChange={onChange}
        onFieldChange={onFieldChange}
        multiline
      />
      <details className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          {copy.help}
        </summary>
        <p className="mt-2">{copy.description}</p>
        <p className="mt-2">{copy.safety}</p>
      </details>
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowPreview((visible) => !visible)}
        aria-expanded={showPreview}
      >
        {showPreview ? copy.hide : copy.show}
      </Button>
      {showPreview && (
        <section className="space-y-2 rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">{copy.preview}</h3>
          <MarkdownRenderer markdown={value[language]} language={language} />
        </section>
      )}
    </div>
  );
}

function ImageAssetPicker({
  data,
  onChange,
  language,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  language: "ar" | "en";
}) {
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  useEffect(() => {
    void api
      .adminAssets()
      .then((items) =>
        setAssets(items.filter((asset) => asset.kind === "image")),
      )
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to load images",
        ),
      );
  }, []);
  const selectedId =
    typeof data.assetId === "number" ? String(data.assetId) : "";
  async function upload(file: File | null) {
    const validation = validateAdminAsset("image", file, language);
    if (validation.file) { setFileError(validation.file); return; }
    if (!file) return;
    setUploading(true);
    setError(null); setFileError(null);
    try {
      const asset = await api.uploadAdminAsset("image", file);
      setAssets((items) => [asset, ...items]);
      onChange({ ...data, assetId: asset.id, src: asset.url });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to upload image",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
      <Field label={language === "ar" ? "صورة مرفوعة" : "Uploaded image"}>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={selectedId}
          onChange={(event) => {
            const asset = assets.find(
              (item) => item.id === Number(event.target.value),
            );
            onChange(
              asset
                ? { ...data, assetId: asset.id, src: asset.url }
                : { ...data, assetId: undefined },
            );
          }}
        >
          <option value="">
            {language === "ar"
              ? "استخدم رابطًا خارجيًا"
              : "Use an external URL"}
          </option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.fileName}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label={language === "ar" ? "رفع صورة جديدة" : "Upload a new image"}
        error={fileError ?? undefined}
      >
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={uploading}
          onChange={(event) => { setFileError(null); void upload(event.target.files?.[0] ?? null); }}
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        {language === "ar"
          ? "JPEG وPNG وWebP وGIF حتى 8 ميغابايت."
          : "JPEG, PNG, WebP, or GIF up to 8 MB."}
      </p>
      {uploading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="size-4" />
          {language === "ar" ? "جارٍ الرفع…" : "Uploading…"}
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function FileAssetPicker({
  data,
  onChange,
  language,
  error,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  language: "ar" | "en";
  error?: string;
}) {
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  useEffect(() => {
    void api
      .adminAssets()
      .then((items) => setAssets(items.filter((asset) => asset.kind !== "image")))
      .catch((reason: unknown) =>
        setUploadError(
          reason instanceof Error ? reason.message : "Unable to load files",
        ),
      );
  }, []);
  const selectedId =
    typeof data.assetId === "number" ? String(data.assetId) : "";
  async function upload(file: File | null) {
    const validation = validateAdminAsset("resource", file, language);
    if (validation.file) {
      setFileError(validation.file);
      return;
    }
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setFileError(null);
    try {
      const asset = await api.uploadAdminAsset("resource", file);
      setAssets((items) => [asset, ...items]);
      onChange({ ...data, assetId: asset.id });
    } catch (reason) {
      setUploadError(
        reason instanceof Error ? reason.message : "Unable to upload file",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
      <Field label={language === "ar" ? "ملف مرفوع" : "Uploaded file"} error={error}>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={selectedId}
          onChange={(event) =>
            onChange({
              ...data,
              assetId: event.target.value ? Number(event.target.value) : undefined,
            })
          }
        >
          <option value="">
            {language === "ar" ? "اختر ملفًا…" : "Select a file…"}
          </option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.fileName}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label={language === "ar" ? "أو ارفع ملفًا جديدًا" : "Or upload a new file"}
        error={fileError ?? undefined}
      >
        <Input
          type="file"
          accept=".pdf,.zip,.docx,.xlsx,.csv,.json,.yaml,.yml,.toml,.txt,application/pdf,application/zip,application/x-zip-compressed,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/json,application/x-yaml,text/yaml,text/x-yaml,application/toml"
          disabled={uploading}
          onChange={(event) => {
            setFileError(null);
            void upload(event.target.files?.[0] ?? null);
          }}
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        {language === "ar"
          ? "PDF وZIP وDOCX وXLSX وCSV وJSON وYAML وTOML وTXT حتى 20 ميغابايت."
          : "PDF, ZIP, DOCX, XLSX, CSV, JSON, YAML, TOML, or TXT up to 20 MB."}
      </p>
      {uploading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="size-4" />
          {language === "ar" ? "جارٍ الرفع…" : "Uploading…"}
        </p>
      )}
      {uploadError && (
        <p className="text-sm text-destructive" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}

function BlockEditor({
  block,
  language,
  onSave,
  onDelete,
  move,
  saving,
}: {
  block: AdminLessonBlock;
  language: "ar" | "en";
  onSave: (input: AdminBlockInput) => Promise<void>;
  onDelete: () => Promise<void>;
  move: (direction: -1 | 1) => void;
  saving: boolean;
}) {
  const [type, setType] = useState<LessonBlockType>(
    block.type as LessonBlockType,
  );
  const [data, setData] = useState<unknown>(
    block.data ?? blankData(block.type as LessonBlockType),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [propsJson, setPropsJson] = useState(() => JSON.stringify((block.data && typeof block.data === "object" && !Array.isArray(block.data) ? (block.data as Record<string, unknown>).props : {}) ?? {}, null, 2));
  const text = localText(data);
  const objectData =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const selectedInteractiveComponent =
    typeof objectData.component === "string" &&
    registeredInteractiveComponentIds.includes(
      objectData.component as (typeof registeredInteractiveComponentIds)[number],
    )
      ? (objectData.component as (typeof registeredInteractiveComponentIds)[number])
      : "";
  const selectedCalloutTone = calloutTones.includes(objectData.tone as CalloutTone)
    ? objectData.tone as CalloutTone
    : "note";
  const setText = (next: LocalizedText) =>
    setData(type === "callout" ? { ...objectData, ...next } : next);
  const setObject = (next: Record<string, unknown>) => setData(next);
  useEffect(() => {
    if (!saveNotice || saveNotice.tone !== "success") return;
    const timeout = window.setTimeout(() => setSaveNotice(null), 4_000);
    return () => window.clearTimeout(timeout);
  }, [saveNotice]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setSaveNotice(null);
    let submittedData = type === "callout" ? { ...objectData, tone: selectedCalloutTone } : data;
    if (type === "interactive") {
      try {
        const props = JSON.parse(propsJson);
        if (!props || typeof props !== "object" || Array.isArray(props)) throw new Error("props must be an object");
        submittedData = { ...objectData, props };
      } catch {
        setErrors((current) => ({ ...current, "data.props": language === "ar" ? "يجب أن تكون الخصائص JSON صالحًا على هيئة كائن." : "Props must be valid JSON represented by an object." }));
        return;
      }
    }
    const blockData =
      type === "image"
        ? {
            ...objectData,
            ...(Object.values(localText(objectData.caption)).some((value) => value.trim()) ? {} : { caption: undefined }),
            ...(Object.values(localText(objectData.alt)).some((value) => value.trim()) ? {} : { alt: undefined }),
          }
        : type === "file"
          ? {
              ...objectData,
              ...(Object.values(localText(objectData.description)).some((value) => value.trim())
                ? {}
                : { description: undefined }),
            }
          : submittedData;
    const validation = validateAdminBlock({ type, data: blockData, sortOrder: block.sortOrder }, language);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    try {
      setIsSubmitting(true);
      await onSave({ type, data: blockData, sortOrder: block.sortOrder });
      setData(blockData);
      setSaveNotice({
        tone: "success",
        message: language === "ar" ? "تم حفظ الكتلة." : "Block saved.",
      });
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Unable to save block";
      setSaveError(message);
      setSaveNotice({
        tone: "error",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">
            {language === "ar"
              ? `الكتلة ${block.sortOrder}`
              : `Block ${block.sortOrder}`}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={language === "ar" ? "نقل لأعلى" : "Move up"}
              onClick={() => move(-1)}
              disabled={saving}
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={language === "ar" ? "نقل لأسفل" : "Move down"}
              onClick={() => move(1)}
              disabled={saving}
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={language === "ar" ? "حذف الكتلة" : "Delete block"}
              onClick={() => void onDelete()}
              disabled={saving}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <Field label={language === "ar" ? "نوع الكتلة" : "Block type"}>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={type}
              onChange={(event) => {
                const next = event.target.value as LessonBlockType;
                setType(next);
                setData(blankData(next));
                setPropsJson("{}");
              }}
            >
              {blockTypes.map((option) => (
                <option key={option} value={option}>
                  {blockLabels[option][language]}
                </option>
              ))}
            </select>
          </Field>
          {type === "rich-text" && (
            <RichTextEditor
              value={text}
              onChange={setText}
              onFieldChange={(key) => setErrors(({ [`data.${key}`]: _, ...rest }) => rest)}
              language={language}
            />
          )}
          {type === "image" && (
            <div className="space-y-4">
              <ImageAssetPicker
                data={objectData}
                onChange={(next) => { setObject(next); setErrors(({ "data.src": _src, "data.assetId": _asset, ...rest }) => rest); }}
                language={language}
              />
              <Field label={language === "ar" ? "رابط الصورة" : "Image URL"} error={errors["data.src"]}>
                <Input
                  value={
                    typeof objectData.src === "string" ? objectData.src : ""
                  }
                  dir="ltr"
                  onChange={(event) => {
                    setObject({
                      ...objectData,
                      src: event.target.value,
                      assetId: undefined,
                    });
                    setErrors(({ "data.src": _src, "data.assetId": _asset, ...rest }) => rest);
                  }}
                  required
                />
              </Field>
              <LocalizedFields
                label={language === "ar" ? "النص البديل" : "Alt text"}
                value={localText(objectData.alt)}
                onChange={(alt) => setObject({ ...objectData, alt })}
                onFieldChange={(key) => setErrors(({ [`data.alt.${key}`]: _, ...rest }) => rest)}
                errors={{ ar: errors["data.alt.ar"], en: errors["data.alt.en"] }}
              />
              <LocalizedFields
                label={language === "ar" ? "التعليق" : "Caption"}
                value={localText(objectData.caption)}
                onChange={(caption) => setObject({ ...objectData, caption })}
                onFieldChange={(key) => setErrors(({ [`data.caption.${key}`]: _, ...rest }) => rest)}
                required={false}
                errors={{ ar: errors["data.caption.ar"], en: errors["data.caption.en"] }}
              />
            </div>
          )}
          {type === "file" && (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p>
                  {language === "ar"
                    ? "اختر ملفًا مرفوعًا أو ارفع ملفًا جديدًا. سيُنزل الطالب الملف بدل عرضه داخل المنصة."
                    : "Select an uploaded file or add a new one. Students download files instead of opening them inside the platform."}
                </p>
              </div>
              <FileAssetPicker
                data={objectData}
                onChange={(next) => {
                  setObject(next);
                  setErrors(({ "data.assetId": _asset, ...rest }) => rest);
                }}
                language={language}
                error={errors["data.assetId"]}
              />
              <LocalizedFields
                label={language === "ar" ? "عنوان الملف" : "File title"}
                value={localText(objectData.title)}
                onChange={(title) => setObject({ ...objectData, title })}
                onFieldChange={(key) =>
                  setErrors(({ [`data.title.${key}`]: _, ...rest }) => rest)
                }
                errors={{ ar: errors["data.title.ar"], en: errors["data.title.en"] }}
              />
              <LocalizedFields
                label={language === "ar" ? "وصف الملف" : "File description"}
                value={localText(objectData.description)}
                onChange={(description) => setObject({ ...objectData, description })}
                onFieldChange={(key) =>
                  setErrors(({ [`data.description.${key}`]: _, ...rest }) => rest)
                }
                required={false}
                errors={{
                  ar: errors["data.description.ar"],
                  en: errors["data.description.en"],
                }}
              />
            </div>
          )}
          {type === "code" && (
            <div className="grid gap-4">
              <Field label={language === "ar" ? "اللغة" : "Language"} error={errors["data.language"]}>
                <Input
                  value={
                    typeof objectData.language === "string"
                      ? objectData.language
                      : ""
                  }
                  dir="ltr"
                  onChange={(event) =>
                    { setObject({ ...objectData, language: event.target.value }); setErrors(({ "data.language": _language, ...rest }) => rest); }
                  }
                />
              </Field>
              <Field label={language === "ar" ? "الرمز البرمجي" : "Code"} error={errors["data.code"]}>
                <Textarea
                  className="min-h-40 font-mono"
                  dir="ltr"
                  value={
                    typeof objectData.code === "string" ? objectData.code : ""
                  }
                  onChange={(event) =>
                    { setObject({ ...objectData, code: event.target.value }); setErrors(({ "data.code": _code, ...rest }) => rest); }
                  }
                  required
                />
              </Field>
            </div>
          )}
          {type === "callout" && (
            <div className="space-y-4">
              <LocalizedFields
                label={language === "ar" ? "محتوى التنبيه" : "Callout content"}
                value={text}
                onChange={setText}
                onFieldChange={(key) => setErrors(({ [`data.${key}`]: _, ...rest }) => rest)}
                multiline
                errors={{ ar: errors["data.ar"], en: errors["data.en"] }}
              />
              <Field label={language === "ar" ? "النمط" : "Tone"} error={errors["data.tone"]}>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedCalloutTone}
                  onChange={(event) => {
                    setObject({ ...objectData, tone: event.target.value });
                    setErrors(({ "data.tone": _tone, ...rest }) => rest);
                  }}
                  aria-label={language === "ar" ? "نوع التنبيه" : "Callout type"}
                >
                  {calloutTones.map((tone) => (
                    <option key={tone} value={tone}>{calloutToneLabels[tone][language]}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}
          {type === "interactive" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-4 space-y-1">
                  <h3 className="font-medium">
                    {language === "ar" ? "اختر نشاطًا" : "Choose an activity"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar"
                      ? "تظهر للطلاب الأنشطة المسجّلة فقط."
                      : "Only registered activities can be shown to students."}
                  </p>
                </div>
                <Field
                  error={errors["data.component"]}
                  label={language === "ar" ? "النشاط التفاعلي" : "Interactive activity"}
                >
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedInteractiveComponent}
                    onChange={(event) => {
                      setObject({
                        ...objectData,
                        component: event.target.value,
                        props: {},
                      });
                      setPropsJson("{}");
                      setErrors(({ "data.component": _component, "data.props": _props, ...rest }) => rest);
                    }}
                    required
                  >
                    <option value="">
                      {language === "ar" ? "اختر نشاطًا…" : "Select an activity…"}
                    </option>
                    {registeredInteractiveComponentIds.map((component) => (
                      <option key={component} value={component}>
                        {interactiveComponentDetails[component].title[language]}
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedInteractiveComponent && (
                  <div className="mt-4 rounded-md border bg-background p-3">
                    <p className="font-medium">
                      {interactiveComponentDetails[selectedInteractiveComponent].title[language]}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {interactiveComponentDetails[selectedInteractiveComponent].description[language]}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {language === "ar"
                        ? "لا يحتاج هذا النشاط إلى إعدادات إضافية حاليًا."
                        : "This activity does not need any additional setup yet."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {saveError && (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          )}
          <Button disabled={saving || isSubmitting}>
            {isSubmitting
              ? language === "ar"
                ? "جارٍ الحفظ…"
                : "Saving…"
              : language === "ar"
                ? "حفظ الكتلة"
                : "Save block"}
          </Button>
        </form>
      </CardContent>
      {saveNotice && (
        <div
          className={`fixed bottom-4 start-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${
            saveNotice.tone === "success"
              ? "border-green-700/30 bg-green-50 text-green-950 dark:bg-green-950 dark:text-green-50"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
          role={saveNotice.tone === "error" ? "alert" : "status"}
          aria-live={saveNotice.tone === "error" ? "assertive" : "polite"}
        >
          {saveNotice.message}
        </div>
      )}
    </Card>
  );
}

export function AdminLessonPage() {
  const { language } = useLanguage();
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const id = Number(lessonId);
  const [lesson, setLesson] = useState<AdminLesson | null>(null);
  const [form, setForm] = useState<AdminLessonInput | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setLoadError(
        language === "ar" ? "معرّف الدرس غير صالح" : "Invalid lesson id",
      );
      return;
    }
    void api
      .adminLesson(id)
      .then((loaded) => {
        setLesson(loaded);
        setForm(lessonForm(loaded));
      })
      .catch((reason: unknown) =>
        setLoadError(
          reason instanceof Error ? reason.message : "Unable to load lesson",
        ),
      );
  }, [id, language]);
  async function saveLesson(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const validation = validateAdminLesson(form, language);
    setFormErrors(validation);
    if (Object.keys(validation).length) return;
    setSaving(true);
    setActionError(null);
    try {
      const updated = await api.updateAdminLesson(id, form);
      setLesson(updated);
      setForm(lessonForm(updated));
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Unable to save lesson",
      );
    } finally {
      setSaving(false);
    }
  }
  async function saveBlock(input: AdminBlockInput, blockId: number) {
    setSaving(true);
    try {
      const updated = await api.updateAdminBlock(blockId, input);
      setLesson((current) =>
        current
          ? {
              ...current,
              blocks: current.blocks.map((block) =>
                block.id === updated.id ? updated : block,
              ),
            }
          : current,
      );
    } finally {
      setSaving(false);
    }
  }
  async function addBlock() {
    if (!lesson) return;
    setSaving(true);
    setActionError(null);
    try {
      const sortOrder =
        Math.max(0, ...lesson.blocks.map((block) => block.sortOrder)) + 1;
      const block = await api.createAdminBlock(id, {
        type: "rich-text",
        data: blankData("rich-text"),
        sortOrder,
      });
      setLesson({ ...lesson, blocks: [...lesson.blocks, block] });
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Unable to add block",
      );
    } finally {
      setSaving(false);
    }
  }
  async function deleteBlock(blockId: number) {
    if (
      !lesson ||
      !window.confirm(
        language === "ar" ? "هل تريد حذف هذه الكتلة؟" : "Delete this block?",
      )
    )
      return;
    setSaving(true);
    try {
      await api.deleteAdminBlock(blockId);
      setLesson({
        ...lesson,
        blocks: lesson.blocks.filter((block) => block.id !== blockId),
      });
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Unable to delete block",
      );
    } finally {
      setSaving(false);
    }
  }
  async function moveBlock(index: number, direction: -1 | 1) {
    if (!lesson) return;
    const target = index + direction;
    if (target < 0 || target >= lesson.blocks.length) return;
    const blocks = [...lesson.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    setSaving(true);
    try {
      setLesson(
        await api.reorderAdminBlocks(
          id,
          blocks.map((block) => block.id),
        ),
      );
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Unable to reorder blocks",
      );
    } finally {
      setSaving(false);
    }
  }
  async function archive() {
    if (
      !lesson ||
      !window.confirm(
        language === "ar"
          ? "سيُؤرشف هذا الدرس ولن يظهر للطلاب. متابعة؟"
          : "This will archive the lesson and hide it from students. Continue?",
      )
    )
      return;
    setSaving(true);
    try {
      await api.archiveAdminLesson(id);
      navigate(`/admin/courses/${lesson.courseId}`);
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Unable to archive lesson",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <AsyncView loading={!lesson && !loadError} error={loadError}>
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button variant="link" className="px-0" asChild>
              <Link
                to={lesson ? `/admin/courses/${lesson.courseId}` : "/admin"}
              >
                <ArrowLeft className="size-4" />
                {language === "ar" ? "العودة إلى المقرر" : "Back to course"}
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">{lesson?.title[language]}</h1>
          </div>
          <div className="flex items-center gap-2">
            {lesson && (
              <StatusBadge status={lesson.status} language={language} />
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview((visible) => !visible)}
              disabled={!lesson}
            >
              <Eye className="size-4" />
              {language === "ar" ? "معاينة الدرس" : "Preview lesson"}
            </Button>
          </div>
        </div>
        {showPreview && lesson && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>
                {language === "ar" ? "معاينة الطالب" : "Student preview"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <h2 className="text-2xl font-bold">{lesson.title[language]}</h2>
              {lesson.youtubeVideoId && (
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                  <iframe
                    className="size-full"
                    title={lesson.title[language]}
                    src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(lesson.youtubeVideoId)}`}
                    allowFullScreen
                  />
                </div>
              )}
              <article className="space-y-6">
                {lesson.blocks.map((block) => (
                  <LessonBlock key={block.id} block={block} />
                ))}
              </article>
            </CardContent>
          </Card>
        )}
        {form && (
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "ar" ? "بيانات الدرس" : "Lesson details"}
              </CardTitle>
              <CardDescription>
                {lesson?.updatedAt &&
                  `${language === "ar" ? "آخر تحديث" : "Last updated"}: ${formatAdminDate(lesson.updatedAt, language)}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={saveLesson} noValidate>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={adminCopy[language].slug} error={formErrors.slug}>
                    <Input
                      value={form.slug}
                      dir="ltr"
                      onChange={(event) => { setForm({ ...form, slug: event.target.value }); setFormErrors(({ slug, ...rest }) => rest); }}
                      required
                    />
                  </Field>
                  <Field label={adminCopy[language].order} error={formErrors.sortOrder}>
                    <Input
                      type="number"
                      min="0"
                      value={form.sortOrder}
                      onChange={(event) => {
                        setForm({
                          ...form,
                          sortOrder: Number(event.target.value),
                        });
                        setFormErrors(({ sortOrder, ...rest }) => rest);
                      }}
                      required
                    />
                  </Field>
                </div>
                <LocalizedFields
                  label={language === "ar" ? "العنوان" : "Title"}
                  value={form.title}
                  onChange={(title) => setForm({ ...form, title })}
                  onFieldChange={(key) => setFormErrors(({ [`title.${key}`]: _, ...rest }) => rest)}
                  errors={{ ar: formErrors["title.ar"], en: formErrors["title.en"] }}
                />
                <Field error={formErrors.youtubeVideoId}
                  label={
                    language === "ar"
                      ? "معرّف فيديو YouTube"
                      : "YouTube video ID"
                  }
                >
                  <Input
                    value={form.youtubeVideoId ?? ""}
                    dir="ltr"
                    onChange={(event) => {
                      setForm({
                        ...form,
                        youtubeVideoId: event.target.value.trim() || null,
                      });
                      setFormErrors(({ youtubeVideoId, ...rest }) => rest);
                    }}
                  />
                </Field>
                <div className="max-w-xs">
                  <Field label={adminCopy[language].status}>
                    <StatusSelect
                      language={language}
                      value={form.status}
                      onChange={(status: ContentStatus) =>
                        setForm({ ...form, status })
                      }
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={saving}>
                    {saving
                      ? adminCopy[language].saving
                      : adminCopy[language].save}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={saving || form.status === "archived"}
                    onClick={() => void archive()}
                  >
                    {adminCopy[language].archive}
                  </Button>
                </div>
                {actionError && <p className="text-sm text-destructive" role="alert">{actionError}</p>}
              </form>
            </CardContent>
          </Card>
        )}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                {language === "ar" ? "كتل المحتوى" : "Content blocks"}
              </h2>
            </div>
            <Button
              onClick={() => void addBlock()}
              disabled={saving || !lesson}
            >
              <Plus className="size-4" />
              {language === "ar" ? "إضافة كتلة" : "Add block"}
            </Button>
          </div>
          {lesson?.blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              language={language}
              saving={saving}
              onSave={(input) => saveBlock(input, block.id)}
              onDelete={() => deleteBlock(block.id)}
              move={(direction) => void moveBlock(index, direction)}
            />
          ))}
          {lesson && !lesson.blocks.length && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                {language === "ar"
                  ? "لا توجد كتل محتوى بعد."
                  : "There are no content blocks yet."}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </AsyncView>
  );
}
