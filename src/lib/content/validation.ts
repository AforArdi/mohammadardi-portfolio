import { z } from "zod";

const httpsUrl = z.string().trim().max(2000).url().refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}, "Use a full HTTPS URL without credentials.");
const optionalUrl = z.union([httpsUrl, z.literal(""), z.null()]).transform(value => value || null);
const name = z.string().trim().min(1).max(160);
const description = z.string().trim().min(1).max(10000);
const uuid = z.string().uuid();
const editorial = { displayOrder: z.number().int().min(0).max(10000), isPublished: z.boolean() };

export const profileInput = z.object({
  greeting: z.string().trim().min(1).max(60), displayName: name, fullName: name,
  tagline: z.string().trim().min(1).max(200), aboutHeading: name, aboutBio: description,
  availabilityText: z.string().trim().max(100), contactEmail: z.string().email().max(254),
  avatarMediaId: uuid.nullable(), resumeMediaId: uuid.nullable(),
}).strict();
export const skillInput = z.object({
  name, iconProvider: z.enum(["simple-icons", "lucide", "custom"]), iconKey: z.string().max(100).nullable(),
  customMediaId: uuid.nullable(), accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a six-digit hex color."), ...editorial,
}).strict().superRefine((value, ctx) => {
  if (value.iconProvider === "custom" ? !value.customMediaId || value.iconKey !== null : !value.iconKey || value.customMediaId !== null) ctx.addIssue({ code: "custom", message: "Choose one library icon or upload one custom icon." });
});
export const projectInput = z.object({ title: name, description, imageMediaId: uuid, liveUrl: httpsUrl, githubUrl: optionalUrl, githubServerUrl: optionalUrl, ...editorial }).strict();
export const achievementInput = z.object({ title: name, certificateType: name, description, imageMediaId: uuid, verifyUrl: httpsUrl, ...editorial }).strict();
export const socialInput = z.object({ platform: name, label: name, url: httpsUrl, iconKey: z.string().min(1).max(100), ...editorial }).strict();
export const videoInput = z.object({
  url: z.string().trim().min(1).max(2000),
  titleOverride: z.string().trim().max(300).nullable().optional().transform(v => v ? v.trim() : null),
  description: z.string().trim().max(10000).default(""),
  refreshMetadata: z.boolean().optional(),
  ...editorial,
}).strict();
export const mutationInput = z.object({ id: uuid.optional(), expectedVersion: z.number().int().positive().optional(), data: z.unknown() }).strict().refine(value => !value.id || value.expectedVersion, "An existing item requires its version.");
export const deleteInput = z.object({ id: uuid, expectedVersion: z.number().int().positive() }).strict();
