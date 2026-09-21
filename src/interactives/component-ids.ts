/** The allow-list shared by the CMS validator and browser registry. */
export const registeredInteractiveComponentIds = ["binary-converter", "python-playground"] as const;
export type RegisteredInteractiveComponentId = (typeof registeredInteractiveComponentIds)[number];
