// ─── Tipos base del sistema ───────────────────────────────────────────────────

export interface Teacher {
  id: string;
  name: string;
  email: string;
  /** Ej: { "10mo EGB \"A\" (V)": ["pe", "mat"] } */
  assignedSubjects: Record<string, string[]>;
}

export interface Student {
  id: string;          // ID del documento en Firestore (código raro, ej: 297Vu8...)
  name: string;
  email: string;
  studentId: string;   // Cédula
}

export interface AttendanceRecord {
  /** Fecha en formato YYYY-MM-DD (es el ID del documento) */
  date: string;
  /** Mapa: { [studentDocId]: "P" | "F" | "J" } */
  records: Record<string, "P" | "F" | "J">;
}

export interface GradebookStructure {
  /** Arreglo con los nombres de columnas, ej: ["AI1","AI2","PI","EX"] */
  assignments: string[];
}

/** Notas reales: { [studentDocId]: { AI1: 10, EX: 9, ... } } */
export type GradebookData = Record<string, Record<string, number>>;

export interface Observation {
  id?: string;
  date: string;        // ISO string
  note: string;
  teacherId?: string;
}

// ─── Resultado enriquecido para la tabla de calificaciones ───────────────────

export interface StudentGradeRow {
  studentDocId: string;
  studentName: string;
  studentCedula: string;
  grades: Record<string, number>;  // { AI1: 10, EX: 9, ... }
  /** Promedio final calculado sobre 10 */
  finalGrade: number;
}
