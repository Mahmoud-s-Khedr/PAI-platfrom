import { registeredInteractiveComponentIds } from "../interactives/component-ids";
import { calloutTones, type AdminBlockInput, type AdminLessonInput, type AdminQuestionInput, type AssetKind, type Language, type LocalizedText } from "./types";

export type FormErrors = Record<string, string>;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const maxText = 20_000;

function copy(language: Language) {
  return language === "ar" ? {
    required: "هذا الحقل مطلوب.", textLong: "يجب ألا يزيد هذا الحقل عن 20,000 حرف.",
    slugRequired: "أدخل معرّفًا.", slugInvalid: "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط، من دون مسافات.", slugLong: "يجب ألا يزيد المعرّف عن 120 حرفًا.",
    order: "أدخل عددًا صحيحًا من 0 إلى 1,000,000.", course: "اختر مقررًا.",
    titleAr: "أدخل العنوان بالعربية.", titleEn: "أدخل العنوان بالإنجليزية.",
    promptAr: "أدخل نص السؤال بالعربية.", promptEn: "أدخل نص السؤال بالإنجليزية.",
    explanationAr: "أدخل الشرح بالعربية.", explanationEn: "أدخل الشرح بالإنجليزية.",
    youtube: "يجب ألا يزيد معرّف YouTube عن 100 حرف.", url: "أدخل رابط صورة لا يزيد عن 2,000 حرف.",
    imageAsset: "اختر صورة مرفوعة أو أدخل رابطًا خارجيًا.", fileAsset: "اختر ملفًا مرفوعًا.", code: "أدخل الرمز البرمجي (100,000 حرف كحد أقصى).", codeLanguage: "يجب ألا تزيد اللغة عن 80 حرفًا.",
    tone: "اختر نوعًا مدعومًا للتنبيه.", component: "اختر اسم مكوّن تفاعلي مسجّل.", props: "يجب أن تكون الخصائص JSON صالحًا على هيئة كائن.",
    answerJson: "أدخل إجابة صحيحة.", mcq: "أدخل خيارات عربية وإنجليزية متطابقة وغير فارغة، وحدد إجابة صحيحة.",
    boolean: "يجب أن تحتوي إجابة صح أو خطأ على قيمة correct منطقية.", shortAnswer: "أدخل إجابة قصيرة واحدة صالحة على الأقل.", lessons: "يمكن ربط السؤال بما لا يزيد على 100 درس.",
    file: "اختر ملفًا للرفع.", mime: "نوع الملف غير مسموح به لهذا النوع.", emptyFile: "لا يمكن رفع ملف فارغ.", size: "حجم الملف يتجاوز الحد المسموح.",
    email: "أدخل بريدًا إلكترونيًا صالحًا.", password: "أدخل كلمة مرور من 1 إلى 1,024 حرفًا.",
  } : {
    required: "This field is required.", textLong: "This field must be 20,000 characters or fewer.",
    slugRequired: "Enter a slug.", slugInvalid: "Use lowercase letters, numbers, and hyphens only, with no spaces.", slugLong: "The slug must be 120 characters or fewer.",
    order: "Enter a whole number from 0 to 1,000,000.", course: "Select a course.",
    titleAr: "Enter the Arabic title.", titleEn: "Enter the English title.",
    promptAr: "Enter the Arabic question prompt.", promptEn: "Enter the English question prompt.",
    explanationAr: "Enter the Arabic explanation.", explanationEn: "Enter the English explanation.",
    youtube: "The YouTube ID must be 100 characters or fewer.", url: "Enter an image URL of 2,000 characters or fewer.",
    imageAsset: "Select an uploaded image or enter an external URL.", fileAsset: "Select an uploaded file.", code: "Enter code (100,000 characters or fewer).", codeLanguage: "The language must be 80 characters or fewer.",
    tone: "Choose a supported callout type.", component: "Choose a registered interactive component.", props: "Props must be valid JSON represented by an object.",
    answerJson: "Enter a valid answer.", mcq: "Enter matching, non-empty Arabic and English choices and select the correct answer.",
    boolean: "A true/false answer must contain a boolean correct value.", shortAnswer: "Enter at least one valid short answer.", lessons: "A question can be mapped to at most 100 lessons.",
    file: "Choose a file to upload.", mime: "This file type is not allowed for the selected asset type.", emptyFile: "An empty file cannot be uploaded.", size: "The file exceeds the allowed size.",
    email: "Enter a valid email address.", password: "Enter a password from 1 to 1,024 characters.",
  };
}

function localized(value: LocalizedText, prefix: string, language: Language, labels?: { ar: string; en: string }) {
  const errors: FormErrors = {}; const c = copy(language);
  for (const key of ["ar", "en"] as const) {
    if (!value[key].trim()) errors[`${prefix}.${key}`] = labels?.[key] ?? c.required;
    else if (value[key].length > maxText) errors[`${prefix}.${key}`] = c.textLong;
  }
  return errors;
}

function slugAndOrder(input: { slug: string; sortOrder: number }, language: Language) {
  const errors: FormErrors = {}; const c = copy(language); const slug = input.slug.trim();
  if (!slug) errors.slug = c.slugRequired;
  else if (slug.length > 120) errors.slug = c.slugLong;
  else if (!slugPattern.test(slug)) errors.slug = c.slugInvalid;
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 1_000_000) errors.sortOrder = c.order;
  return errors;
}

export function validateAdminCourse(input: { slug: string; title: LocalizedText; description: LocalizedText; sortOrder: number }, language: Language): FormErrors {
  const c = copy(language);
  return { ...slugAndOrder(input, language), ...localized(input.title, "title", language, { ar: c.titleAr, en: c.titleEn }),
    ...(input.description.ar.length > maxText ? { "description.ar": c.textLong } : {}), ...(input.description.en.length > maxText ? { "description.en": c.textLong } : {}) };
}

export function validateAdminLesson(input: AdminLessonInput, language: Language): FormErrors {
  const c = copy(language);
  return { ...slugAndOrder(input, language), ...(input.courseId > 0 && Number.isInteger(input.courseId) ? {} : { courseId: c.course }),
    ...localized(input.title, "title", language, { ar: c.titleAr, en: c.titleEn }),
    ...(input.youtubeVideoId && input.youtubeVideoId.trim().length > 100 ? { youtubeVideoId: c.youtube } : {}) };
}

export function validateAdminBlock(input: AdminBlockInput, language: Language): FormErrors {
  const c = copy(language); const data = input.data && typeof input.data === "object" && !Array.isArray(input.data) ? input.data as Record<string, unknown> : null;
  const errors: FormErrors = !Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 1_000_000 ? { sortOrder: c.order } : {};
  if (!data) return { ...errors, data: c.required };
  const directText = { ar: typeof data.ar === "string" ? data.ar : "", en: typeof data.en === "string" ? data.en : "" };
  if (input.type === "rich-text" || input.type === "callout") Object.assign(errors, localized(directText, "data", language));
  if (input.type === "image") {
    const src = typeof data.src === "string" ? data.src.trim() : "";
    if (!src || src.length > 2_000) errors["data.src"] = c.url;
    if (data.assetId !== undefined && (!Number.isInteger(data.assetId) || Number(data.assetId) < 1)) errors["data.assetId"] = c.imageAsset;
    for (const key of ["alt", "caption"] as const) if (data[key] !== undefined) Object.assign(errors, localized(data[key] && typeof data[key] === "object" ? data[key] as LocalizedText : { ar: "", en: "" }, `data.${key}`, language));
  }
  if (input.type === "file") {
    if (!Number.isInteger(data.assetId) || Number(data.assetId) < 1) errors["data.assetId"] = c.fileAsset;
    Object.assign(errors, localized(
      data.title && typeof data.title === "object" ? data.title as LocalizedText : { ar: "", en: "" },
      "data.title",
      language,
      { ar: c.titleAr, en: c.titleEn },
    ));
    if (data.description !== undefined) {
      Object.assign(errors, localized(
        data.description && typeof data.description === "object" ? data.description as LocalizedText : { ar: "", en: "" },
        "data.description",
        language,
      ));
    }
  }
  if (input.type === "code") { const value = typeof data.code === "string" ? data.code : ""; if (value.length > 100_000) errors["data.code"] = c.code; if (typeof data.language === "string" && data.language.trim().length > 80) errors["data.language"] = c.codeLanguage; }
  if (input.type === "callout" && (!calloutTones.includes(data.tone as typeof calloutTones[number]))) errors["data.tone"] = c.tone;
  if (input.type === "interactive") { if (typeof data.component !== "string" || !registeredInteractiveComponentIds.includes(data.component.trim() as typeof registeredInteractiveComponentIds[number])) errors["data.component"] = c.component; if (data.props !== undefined && (!data.props || typeof data.props !== "object" || Array.isArray(data.props))) errors["data.props"] = c.props; }
  return errors;
}

export function validateAdminQuestion(input: AdminQuestionInput, language: Language): FormErrors {
  const c = copy(language); const errors: FormErrors = {};
  if (!Number.isInteger(input.courseId) || input.courseId < 1) errors.courseId = c.course;
  Object.assign(errors, localized(input.prompt, "prompt", language, { ar: c.promptAr, en: c.promptEn }), localized(input.explanation, "explanation", language, { ar: c.explanationAr, en: c.explanationEn }));
  if (input.lessonIds.length > 100 || input.lessonIds.some((id) => !Number.isInteger(id) || id < 1)) errors.lessonIds = c.lessons;
  if (!input.answer || typeof input.answer !== "object" || Array.isArray(input.answer)) return { ...errors, answer: c.answerJson };
  const data = input.answer as Record<string, unknown>;
  if (input.type === "mcq") { const choices = data.choices as Record<string, unknown> | undefined; const ar = choices?.ar; const en = choices?.en; if (!Array.isArray(ar) || !Array.isArray(en) || !ar.length || ar.length > 20 || ar.length !== en.length || ar.some((x) => typeof x !== "string" || !x.trim() || x.length > maxText) || en.some((x) => typeof x !== "string" || !x.trim() || x.length > maxText) || !Number.isInteger(data.correctIndex) || Number(data.correctIndex) < 0 || Number(data.correctIndex) >= ar.length) errors.answer = c.mcq; }
  if (input.type === "true_false" && typeof data.correct !== "boolean") errors.answer = c.boolean;
  if (input.type === "short_answer") { const answers = data.acceptedAnswers; if (!Array.isArray(answers) || !answers.length || answers.length > 50 || answers.some((x) => typeof x !== "string" || !x.trim() || x.length > maxText)) errors.answer = c.shortAnswer; }
  return errors;
}

const resourceMimeTypes = ["application/pdf", "application/zip", "application/x-zip-compressed", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "text/csv", "application/json", "application/x-yaml", "text/yaml", "text/x-yaml", "application/toml"] as const;
const assetRules: Record<AssetKind, { mime: readonly string[]; max: number }> = { image: { mime: ["image/jpeg", "image/png", "image/webp", "image/gif"], max: 8 * 1024 * 1024 }, worksheet: { mime: ["application/pdf"], max: 20 * 1024 * 1024 }, dataset: { mime: ["text/csv", "application/json"], max: 20 * 1024 * 1024 }, resource: { mime: resourceMimeTypes, max: 20 * 1024 * 1024 } };
const mimeTypesByExtension: Record<string, string> = { pdf: "application/pdf", zip: "application/zip", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", txt: "text/plain", csv: "text/csv", json: "application/json", yaml: "application/x-yaml", yml: "application/x-yaml", toml: "application/toml" };
function uploadMimeType(file: File): string { if (file.type && file.type !== "application/octet-stream") return file.type; const extension = file.name?.split(".").pop()?.toLowerCase(); return extension ? mimeTypesByExtension[extension] ?? file.type : file.type; }
export function validateAdminAsset(kind: AssetKind, file: File | null, language: Language): FormErrors { const c = copy(language); if (!file) return { file: c.file }; if (!assetRules[kind].mime.includes(uploadMimeType(file))) return { file: c.mime }; if (file.size < 1) return { file: c.emptyFile }; if (file.size > assetRules[kind].max) return { file: c.size }; return {}; }
export function validateLogin(email: string, password: string, language: Language): FormErrors { const c = copy(language); const errors: FormErrors = {}; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) errors.email = c.email; if (!password || password.length > 1024) errors.password = c.password; return errors; }
