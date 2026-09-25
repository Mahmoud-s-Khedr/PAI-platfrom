/** The allow-list shared by the CMS validator and browser registry. */
export const registeredInteractiveComponentIds = ["binary-converter", "python-playground"] as const;
export type RegisteredInteractiveComponentId = (typeof registeredInteractiveComponentIds)[number];

export const interactiveComponentDetails: Record<
  RegisteredInteractiveComponentId,
  {
    title: { ar: string; en: string };
    description: { ar: string; en: string };
  }
> = {
  "binary-converter": {
    title: { ar: "محول الأعداد الثنائية", en: "Binary converter" },
    description: {
      ar: "يحوّل الطالب عددًا عشريًا صحيحًا غير سالب إلى النظام الثنائي.",
      en: "Students convert a non-negative whole decimal number to binary.",
    },
  },
  "python-playground": {
    title: { ar: "بيئة Python التجريبية", en: "Python playground" },
    description: {
      ar: "عرض تمهيدي لبيئة Python. تشغيل الشيفرة غير متاح بعد.",
      en: "An introductory Python workspace. Running code is not available yet.",
    },
  },
};
