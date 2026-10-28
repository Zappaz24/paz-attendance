import type {
  AttendanceRecord,
  AttendanceStatus,
  Section,
  Student,
} from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type StudentWithSection = Student & { sectionName: string | null };

export type AttendanceEntry = {
  student: Student;
  sectionName: string | null;
  record: AttendanceRecord | null;
};

export type RecentCheckIn = {
  id: string;
  studentName: string;
  sectionName: string | null;
  status: AttendanceStatus;
  timeIn: string;
};

export type ReportRow = {
  student: Student;
  sectionName: string | null;
  present: number;
  late: number;
  absent: number;
  excused: number;
  marked: number;
  rate: number;
};

export type DashboardStats = {
  studentCount: number;
  sectionCount: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  unmarked: number;
};

function indexSections(sections: Section[]) {
  return new Map(sections.map((section) => [section.id, section]));
}

export async function listSections(): Promise<Section[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .order("grade_level", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(`Could not load sections: ${error.message}`);
  return data ?? [];
}

export async function listStudents(
  search?: string,
  sectionId?: string,
): Promise<StudentWithSection[]> {
  const supabase = await createClient();

  let query = supabase.from("students").select("*").order("full_name", { ascending: true });
  if (search) query = query.ilike("full_name", `%${search}%`);
  if (sectionId) query = query.eq("section_id", sectionId);

  const [{ data: students, error }, sections] = await Promise.all([query, listSections()]);
  if (error) throw new Error(`Could not load students: ${error.message}`);

  const byId = indexSections(sections);
  return (students ?? []).map((student) => ({
    ...student,
    sectionName: student.section_id ? byId.get(student.section_id)?.name ?? null : null,
  }));
}

export async function getStudent(id: string): Promise<StudentWithSection | null> {
  const supabase = await createClient();
  const { data: student, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load student: ${error.message}`);
  if (!student) return null;

  if (!student.section_id) return { ...student, sectionName: null };

  const { data: section } = await supabase
    .from("sections")
    .select("*")
    .eq("id", student.section_id)
    .maybeSingle();

  return { ...student, sectionName: section?.name ?? null };
}

export async function getAttendanceSheet(
  date: string,
  sectionId?: string,
): Promise<AttendanceEntry[]> {
  const supabase = await createClient();

  let studentsQuery = supabase.from("students").select("*").order("full_name", { ascending: true });
  if (sectionId) studentsQuery = studentsQuery.eq("section_id", sectionId);

  const [{ data: students, error }, { data: records }, sections] = await Promise.all([
    studentsQuery,
    supabase.from("attendance_records").select("*").eq("attendance_date", date),
    listSections(),
  ]);

  if (error) throw new Error(`Could not load attendance: ${error.message}`);

  const bySection = indexSections(sections);
  const byStudent = new Map((records ?? []).map((record) => [record.student_id, record]));

  return (students ?? []).map((student) => ({
    student,
    sectionName: student.section_id ? bySection.get(student.section_id)?.name ?? null : null,
    record: byStudent.get(student.id) ?? null,
  }));
}

export async function getDashboardStats(date: string): Promise<DashboardStats> {
  const supabase = await createClient();

  const [{ count: studentCount }, { count: sectionCount }, { data: records, error }] =
    await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("sections").select("*", { count: "exact", head: true }),
      supabase.from("attendance_records").select("*").eq("attendance_date", date),
    ]);

  if (error) throw new Error(`Could not load dashboard totals: ${error.message}`);

  const count = (status: AttendanceStatus) =>
    (records ?? []).filter((record) => record.status === status).length;

  const marked = (records ?? []).length;

  return {
    studentCount: studentCount ?? 0,
    sectionCount: sectionCount ?? 0,
    present: count("present"),
    late: count("late"),
    absent: count("absent"),
    excused: count("excused"),
    unmarked: Math.max((studentCount ?? 0) - marked, 0),
  };
}

export async function getRecentCheckIns(limit = 6): Promise<RecentCheckIn[]> {
  const supabase = await createClient();

  const [{ data: records, error }, { data: students }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("*")
      .not("time_in", "is", null)
      .order("time_in", { ascending: false })
      .limit(limit),
    supabase.from("students").select("*"),
  ]);

  if (error) throw new Error(`Could not load recent check-ins: ${error.message}`);

  const byStudent = new Map((students ?? []).map((student) => [student.id, student]));
  const sections = await listSections();
  const bySection = indexSections(sections);

  return (records ?? []).flatMap((record) => {
    const student = byStudent.get(record.student_id);
    if (!student || !record.time_in) return [];
    return [
      {
        id: record.id,
        studentName: student.full_name,
        sectionName: student.section_id ? bySection.get(student.section_id)?.name ?? null : null,
        status: record.status,
        timeIn: record.time_in,
      },
    ];
  });
}

export type SectionOverview = Section & { studentCount: number };

export async function listSectionOverview(): Promise<SectionOverview[]> {
  const supabase = await createClient();

  const [{ data: sections, error }, { data: students }] = await Promise.all([
    supabase
      .from("sections")
      .select("*")
      .order("grade_level", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("students").select("id, section_id"),
  ]);

  if (error) throw new Error(`Could not load sections: ${error.message}`);

  const counts = new Map<string, number>();
  for (const student of students ?? []) {
    if (!student.section_id) continue;
    counts.set(student.section_id, (counts.get(student.section_id) ?? 0) + 1);
  }

  return (sections ?? []).map((section) => ({
    ...section,
    studentCount: counts.get(section.id) ?? 0,
  }));
}

export async function getReport(
  startDate: string,
  endDate: string,
  sectionId?: string,
): Promise<ReportRow[]> {
  const supabase = await createClient();

  let studentsQuery = supabase.from("students").select("*").order("full_name", { ascending: true });
  if (sectionId) studentsQuery = studentsQuery.eq("section_id", sectionId);

  const [{ data: students, error }, { data: records }, sections] = await Promise.all([
    studentsQuery,
    supabase
      .from("attendance_records")
      .select("*")
      .gte("attendance_date", startDate)
      .lte("attendance_date", endDate),
    listSections(),
  ]);

  if (error) throw new Error(`Could not load report: ${error.message}`);

  const bySection = indexSections(sections);
  const grouped = new Map<string, AttendanceRecord[]>();
  for (const record of records ?? []) {
    const bucket = grouped.get(record.student_id) ?? [];
    bucket.push(record);
    grouped.set(record.student_id, bucket);
  }

  return (students ?? []).map((student) => {
    const rows = grouped.get(student.id) ?? [];
    const present = rows.filter((row) => row.status === "present").length;
    const late = rows.filter((row) => row.status === "late").length;
    const absent = rows.filter((row) => row.status === "absent").length;
    const excused = rows.filter((row) => row.status === "excused").length;
    const marked = rows.length;

    return {
      student,
      sectionName: student.section_id ? bySection.get(student.section_id)?.name ?? null : null,
      present,
      late,
      absent,
      excused,
      marked,
      rate: marked === 0 ? 0 : Math.round(((present + late) / marked) * 100),
    };
  });
}
