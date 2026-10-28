"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { attendanceSchema } from "@/lib/validation";

function attendanceBackLink(formData: FormData) {
  const date = String(formData.get("date") ?? todayISO());
  const section = String(formData.get("section") ?? "");
  return `/attendance?date=${encodeURIComponent(date)}${section ? `&section=${section}` : ""}`;
}

function fail(formData: FormData, message: string): never {
  const back = attendanceBackLink(formData);
  redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function markAttendance(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const back = attendanceBackLink(formData);

  const parsed = attendanceSchema.safeParse({
    studentId: formData.get("studentId"),
    date: formData.get("date"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) fail(formData, parsed.error.issues[0]?.message ?? "Invalid attendance entry.");

  const { error } = await supabase.from("attendance_records").upsert(
    {
      student_id: parsed.data.studentId,
      attendance_date: parsed.data.date,
      status: parsed.data.status,
      note: parsed.data.note,
      recorded_by: user.id,
    },
    { onConflict: "student_id,attendance_date" },
  );

  if (error) fail(formData, error.message);

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`${back}${back.includes("?") ? "&" : "?"}flash=marked`);
}

export async function markAllPresent(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const date = String(formData.get("date") ?? "");
  const section = String(formData.get("section") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(formData, "Choose a valid date.");
  if (date > todayISO()) fail(formData, "Attendance cannot be recorded for a future date.");

  const sectionId = section ? z.uuid().safeParse(section) : null;
  if (sectionId && !sectionId.success) fail(formData, "Unknown section.");

  let studentsQuery = supabase.from("students").select("id");
  if (sectionId?.success) studentsQuery = studentsQuery.eq("section_id", sectionId.data);

  const { data: students, error: studentsError } = await studentsQuery;
  if (studentsError) fail(formData, studentsError.message);
  if (!students || students.length === 0) fail(formData, "No students to mark.");

  const { error } = await supabase.from("attendance_records").upsert(
    students.map((student) => ({
      student_id: student.id,
      attendance_date: date,
      status: "present" as const,
      recorded_by: user.id,
    })),
    { onConflict: "student_id,attendance_date" },
  );

  if (error) fail(formData, error.message);

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`${attendanceBackLink(formData)}&flash=marked-all`);
}

export async function clearAttendance(formData: FormData) {
  const { supabase } = await requireAdmin();

  const studentId = z.uuid().safeParse(formData.get("studentId"));
  const date = String(formData.get("date") ?? "");

  if (!studentId.success || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail(formData, "Unknown attendance entry.");
  }

  const { error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("student_id", studentId.data)
    .eq("attendance_date", date);

  if (error) fail(formData, error.message);

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`${attendanceBackLink(formData)}&flash=cleared`);
}
