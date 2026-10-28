export type Gender = "male" | "female";
export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export type Profile = {
  id: string;
  full_name: string;
  role: "admin";
  created_at: string;
};

export type Section = {
  id: string;
  name: string;
  grade_level: number;
  adviser: string | null;
  created_at: string;
};

export type Student = {
  id: string;
  lrn: string;
  full_name: string;
  gender: Gender;
  section_id: string | null;
  created_at: string;
};

export type AttendanceRecord = {
  id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  time_in: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DailySummary = {
  attendance_date: string;
  section_id: string | null;
  present_count: number;
  late_count: number;
  absent_count: number;
  excused_count: number;
  total_count: number;
};

/**
 * Hand-written shape of the `public` schema (same shape `supabase gen types`
 * produces). Keeping it in the repo means `npm run build` type-checks without a
 * running database.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: { id: string; full_name: string; role?: "admin"; created_at?: string };
        Update: { full_name?: string; role?: "admin" };
        Relationships: [];
      };
      sections: {
        Row: Section;
        Insert: { id?: string; name: string; grade_level: number; adviser?: string | null; created_at?: string };
        Update: { name?: string; grade_level?: number; adviser?: string | null };
        Relationships: [];
      };
      students: {
        Row: Student;
        Insert: { id?: string; lrn: string; full_name: string; gender: Gender; section_id?: string | null; created_at?: string };
        Update: { lrn?: string; full_name?: string; gender?: Gender; section_id?: string | null };
        Relationships: [];
      };
      attendance_records: {
        Row: AttendanceRecord;
        Insert: {
          id?: string;
          student_id: string;
          attendance_date?: string;
          status: AttendanceStatus;
          time_in?: string | null;
          note?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          student_id?: string;
          attendance_date?: string;
          status?: AttendanceStatus;
          time_in?: string | null;
          note?: string | null;
          recorded_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      attendance_daily_summary: {
        Row: DailySummary;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      gender: Gender;
      attendance_status: AttendanceStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
