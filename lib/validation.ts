import { z } from "zod";
import { todayISO } from "./format";

export const genderSchema = z.enum(["male", "female"], {
  error: "Choose the student's gender.",
});

export const attendanceStatusSchema = z.enum(
  ["present", "late", "absent", "excused"],
  { error: "Choose a valid attendance status." },
);

export const studentSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(80, "Full name is too long."),
  lrn: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "LRN must be exactly 12 digits."),
  gender: genderSchema,
  sectionId: z
    .union([z.literal(""), z.uuid("Choose a valid section.")])
    .transform((value) => (value === "" ? null : value)),
});

export const sectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Section name is required.")
    .max(60, "Section name is too long."),
  gradeLevel: z.coerce
    .number({ error: "Grade level is required." })
    .int("Grade level must be a whole number.")
    .min(7, "Grade level must be between 7 and 12.")
    .max(12, "Grade level must be between 7 and 12."),
  adviser: z
    .string()
    .trim()
    .max(80, "Adviser name is too long.")
    .transform((value) => (value === "" ? null : value)),
});

export const attendanceSchema = z.object({
  studentId: z.uuid("Unknown student."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
    .refine((value) => value <= todayISO(), "Attendance cannot be recorded for a future date."),
  status: attendanceStatusSchema,
  note: z
    .string()
    .trim()
    .max(200, "Note is limited to 200 characters.")
    .optional()
    .transform((value) => (value ? value : null)),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export type StudentInput = z.infer<typeof studentSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
