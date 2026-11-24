import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitivos
// ---------------------------------------------------------------------------

const trimmed = (min: number, max: number) =>
  z.string().trim().min(min, "Obrigatório").max(max, `Máximo de ${max} caracteres`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .optional()
    .transform((v) => v ?? "");

export const tagsSchema = z
  .array(z.string().trim().min(1).max(40, "Tag muito longa"))
  .max(12, "Máximo de 12 tags")
  .transform((tags) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const tag of tags) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
    return out;
  });

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD")
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), "Data inválida");

const datetimeSchema = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data e hora inválidas");

/** Aceita URLs com ou sem scheme, normalizando para https:// */
const urlSchema = z
  .string()
  .trim()
  .min(1, "URL obrigatória")
  .max(2000)
  .transform((v) => (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v) ? v : `https://${v}`))
  .refine((v) => {
    try {
      const url = new URL(v);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "URL inválida");

const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor hexadecimal inválida (ex.: #6366f1)");

// ---------------------------------------------------------------------------
// Entidades
// ---------------------------------------------------------------------------

export const projectSchema = z.object({
  name: trimmed(1, 120),
  description: optionalText(4000),
  color: colorSchema.default("#6366f1"),
  status: z.enum(["active", "paused", "completed"]).default("active"),
  tags: tagsSchema.optional().default([]),
});
export type ProjectFormValues = z.infer<typeof projectSchema>;

export const noteSchema = z.object({
  title: trimmed(1, 200),
  content: optionalText(200_000),
  projectId: z.string().nullable().optional(),
  tags: tagsSchema.optional().default([]),
});
export type NoteFormValues = z.infer<typeof noteSchema>;

export const activitySchema = z.object({
  title: trimmed(1, 200),
  description: optionalText(20_000),
  category: z
    .enum([
      "development",
      "configuration",
      "meeting",
      "problem",
      "solution",
      "study",
      "delivery",
      "other",
    ])
    .default("other"),
  status: z.enum(["done", "pending"]).default("done"),
  projectId: z.string().nullable().optional(),
  occurredAt: datetimeSchema,
  tags: tagsSchema.optional().default([]),
});
export type ActivityFormValues = z.infer<typeof activitySchema>;

export const taskSchema = z.object({
  title: trimmed(1, 200),
  description: optionalText(20_000),
  status: z.enum(["pending", "in_progress", "done", "cancelled"]).default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: dateOnlySchema.nullable().optional(),
  projectId: z.string().nullable().optional(),
  tags: tagsSchema.optional().default([]),
});
export type TaskFormValues = z.infer<typeof taskSchema>;

export const linkSchema = z.object({
  name: trimmed(1, 160),
  url: urlSchema,
  description: optionalText(2000),
  category: z
    .string()
    .trim()
    .max(60, `Máximo de ${60} caracteres`)
    .default("")
    .transform((v) => v || "outros"),
  projectId: z.string().nullable().optional(),
  isFavorite: z.boolean().optional().default(false),
  tags: tagsSchema.optional().default([]),
});
export type LinkFormValues = z.infer<typeof linkSchema>;

export const reminderSchema = z.object({
  title: trimmed(1, 200),
  remindAt: datetimeSchema,
  notes: optionalText(2000),
});
export type ReminderFormValues = z.infer<typeof reminderSchema>;

/** Converte um valor de input datetime-local em ISO UTC. */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

/** Converte ISO UTC em valor de input datetime-local (fuso local). */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
