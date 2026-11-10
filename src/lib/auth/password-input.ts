import { z } from "zod";

export const passwordChangeInput = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12, "Use at least 12 characters.").max(256),
  confirmPassword: z.string().min(1).max(256),
  code: z.string().regex(/^\d{6}$/, "Enter the six-digit authenticator code."),
  factorId: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.newPassword !== value.confirmPassword) context.addIssue({ code: "custom", path: ["confirmPassword"], message: "The new passwords must match." });
  if (value.newPassword === value.currentPassword) context.addIssue({ code: "custom", path: ["newPassword"], message: "Choose a different new password." });
});
