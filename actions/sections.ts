"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sectionSchema } from "@/lib/validation";

export type SectionFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
} | null;

export async function createSection(
  _prevState: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  const { supabase } = await requireAdmin();

  const parsed = sectionSchema.safeParse({
    name: formData.get("name"),
    gradeLevel: formData.get("gradeLevel"),
    adviser: formData.get("adviser") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { error } = await supabase.from("sections").insert({
    name: parsed.data.name,
    grade_level: parsed.data.gradeLevel,
    adviser: parsed.data.adviser,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "That section already exists for this grade level." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/sections");
  revalidatePath("/students");
  redirect("/sections?flash=created");
}

export async function deleteSection(formData: FormData) {
  const { supabase } = await requireAdmin();

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  // students.section_id is ON DELETE SET NULL, so no student records are lost.
  await supabase.from("sections").delete().eq("id", id.data);

  revalidatePath("/sections");
  revalidatePath("/students");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
}
