"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { studentSchema } from "@/lib/validation";

export type StudentFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
} | null;

export async function createStudent(
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const { supabase } = await requireAdmin();

  const parsed = studentSchema.safeParse({
    fullName: formData.get("fullName"),
    lrn: formData.get("lrn"),
    gender: formData.get("gender"),
    sectionId: formData.get("sectionId") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { error } = await supabase.from("students").insert({
    full_name: parsed.data.fullName,
    lrn: parsed.data.lrn,
    gender: parsed.data.gender,
    section_id: parsed.data.sectionId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, errors: { lrn: ["That LRN is already enrolled."] } };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");
  redirect("/students?flash=created");
}

export async function updateStudent(
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const { supabase } = await requireAdmin();

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, message: "Unknown student." };

  const parsed = studentSchema.safeParse({
    fullName: formData.get("fullName"),
    lrn: formData.get("lrn"),
    gender: formData.get("gender"),
    sectionId: formData.get("sectionId") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { error } = await supabase
    .from("students")
    .update({
      full_name: parsed.data.fullName,
      lrn: parsed.data.lrn,
      gender: parsed.data.gender,
      section_id: parsed.data.sectionId,
    })
    .eq("id", id.data);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, errors: { lrn: ["That LRN is already enrolled."] } };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/students");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  redirect("/students?flash=updated");
}

export async function deleteStudent(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  await supabase.from("students").delete().eq("id", id.data);

  revalidatePath("/students");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}
