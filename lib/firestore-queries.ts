/**
 * firestore-queries.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Funciones de lectura/escritura adaptadas a la estructura REAL de Firestore:
 *
 *  teachers/{teacherId}
 *  courses/{courseId}/students/{studentDocId}
 *  courses/{courseId}/attendance/{date}
 *  courses/{courseId}/subjects/{subjectId}/gradebookStructures/trimester-1
 *  courses/{courseId}/subjects/{subjectId}/gradebookData/trimester-1
 *  courses/{courseId}/students/{studentDocId}/observations/{obsId}  (nueva)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Teacher,
  Student,
  AttendanceRecord,
  GradebookStructure,
  GradebookData,
  StudentGradeRow,
  Observation,
} from "./types";

// ─── 1. PROFESORES ────────────────────────────────────────────────────────────

/** Obtiene los datos de un profesor por su ID */
export async function getTeacher(teacherId: string): Promise<Teacher | null> {
  const snap = await getDoc(doc(db, "teachers", teacherId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Teacher, "id">) };
}

// ─── 2. CURSOS ────────────────────────────────────────────────────────────────

/** Lista todos los cursos disponibles (IDs de documentos) */
export async function getCourseIds(): Promise<string[]> {
  const snap = await getDocs(collection(db, "courses"));
  return snap.docs.map((d) => d.id);
}

// ─── 3. ESTUDIANTES ──────────────────────────────────────────────────────────

/**
 * Obtiene la lista de estudiantes de un curso.
 * Ruta: courses/{courseId}/students
 */
export async function getStudents(courseId: string): Promise<Student[]> {
  const snap = await getDocs(
    collection(db, "courses", courseId, "students")
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Student, "id">),
  }));
}

/** Mapa rápido ID → nombre para cruzar con notas */
export async function getStudentMap(
  courseId: string
): Promise<Record<string, Student>> {
  const students = await getStudents(courseId);
  return Object.fromEntries(students.map((s) => [s.id, s]));
}

// ─── 4. ASISTENCIA ───────────────────────────────────────────────────────────

/**
 * Obtiene todos los registros de asistencia de un curso.
 * Ruta: courses/{courseId}/attendance
 */
export async function getAttendance(
  courseId: string
): Promise<AttendanceRecord[]> {
  const snap = await getDocs(
    collection(db, "courses", courseId, "attendance")
  );
  return snap.docs.map((d) => ({
    date: d.id,
    records: d.data() as Record<string, "P" | "F" | "J">,
  }));
}

/**
 * Obtiene la asistencia de una fecha específica.
 * Ruta: courses/{courseId}/attendance/{date}  (date: "YYYY-MM-DD")
 */
export async function getAttendanceByDate(
  courseId: string,
  date: string
): Promise<AttendanceRecord | null> {
  const snap = await getDoc(
    doc(db, "courses", courseId, "attendance", date)
  );
  if (!snap.exists()) return null;
  return {
    date: snap.id,
    records: snap.data() as Record<string, "P" | "F" | "J">,
  };
}

// ─── 5. MATERIAS (SUBJECTS) ──────────────────────────────────────────────────

/** Lista las materias de un curso */
export async function getSubjectIds(courseId: string): Promise<string[]> {
  const snap = await getDocs(
    collection(db, "courses", courseId, "subjects")
  );
  return snap.docs.map((d) => d.id);
}

// ─── 6. ESTRUCTURA DE LIBRETA (gradebookStructures) ──────────────────────────

/**
 * Obtiene la estructura de columnas de un trimestre.
 * Ruta: courses/{courseId}/subjects/{subjectId}/gradebookStructures/trimester-1
 */
export async function getGradebookStructure(
  courseId: string,
  subjectId: string,
  trimester: string = "trimester-1"
): Promise<GradebookStructure | null> {
  const snap = await getDoc(
    doc(
      db,
      "courses",
      courseId,
      "subjects",
      subjectId,
      "gradebookStructures",
      trimester
    )
  );
  if (!snap.exists()) return null;
  return snap.data() as GradebookStructure;
}

// ─── 7. NOTAS REALES (gradebookData) + CRUCE CON ESTUDIANTES ─────────────────

/**
 * Obtiene las notas crudas de un trimestre.
 * Ruta: courses/{courseId}/subjects/{subjectId}/gradebookData/trimester-1
 */
export async function getRawGradebookData(
  courseId: string,
  subjectId: string,
  trimester: string = "trimester-1"
): Promise<GradebookData> {
  const snap = await getDoc(
    doc(
      db,
      "courses",
      courseId,
      "subjects",
      subjectId,
      "gradebookData",
      trimester
    )
  );
  if (!snap.exists()) return {};
  return snap.data() as GradebookData;
}

/**
 * Calcula la nota final sobre 10 aplicando la regla oficial:
 *   - Insumos individuales (AI) y grupales (AG) = 70% del total
 *   - Proyecto Integrador (PI)                  = 1.5 puntos (15%)
 *   - Examen (EX)                               = 1.5 puntos (15%)
 *
 * Para el 70%: se promedian todos los AI/AG y se escala a 7 puntos.
 */
export function calculateFinalGrade(
  grades: Record<string, number>,
  assignments: string[]
): number {
  // Separar columnas por tipo
  const aiAgKeys = assignments.filter(
    (a) => a.startsWith("AI") || a.startsWith("AG")
  );
  const piKeys = assignments.filter((a) => a.startsWith("PI"));
  const exKeys = assignments.filter((a) => a === "EX");

  // 70%: promedio de AI/AG escalado a 7
  let aiAgScore = 0;
  if (aiAgKeys.length > 0) {
    const sum = aiAgKeys.reduce((acc, k) => acc + (grades[k] ?? 0), 0);
    const avg = sum / aiAgKeys.length; // sobre 10
    aiAgScore = (avg / 10) * 7;
  }

  // 15%: PI → máx 1.5 puntos (se toma el promedio si hay varios PI)
  let piScore = 0;
  if (piKeys.length > 0) {
    const sum = piKeys.reduce((acc, k) => acc + (grades[k] ?? 0), 0);
    const avg = sum / piKeys.length; // sobre 10
    piScore = (avg / 10) * 1.5;
  }

  // 15%: EX → máx 1.5 puntos
  let exScore = 0;
  if (exKeys.length > 0) {
    const sum = exKeys.reduce((acc, k) => acc + (grades[k] ?? 0), 0);
    const avg = sum / exKeys.length; // sobre 10
    exScore = (avg / 10) * 1.5;
  }

  const total = aiAgScore + piScore + exScore;
  return Math.round(total * 100) / 100; // redondeo a 2 decimales
}

/**
 * ★ FUNCIÓN PRINCIPAL ★
 * Combina estudiantes + notas y devuelve filas listas para la tabla.
 * Resuelve el "código raro" → nombre real.
 *
 * Uso:
 *   const rows = await getGradeTableRows("10mo EGB \"A\" (V)", "pe");
 */
export async function getGradeTableRows(
  courseId: string,
  subjectId: string,
  trimester: string = "trimester-1"
): Promise<StudentGradeRow[]> {
  // Paso 1: obtener mapa de estudiantes (ID → datos)
  const studentMap = await getStudentMap(courseId);

  // Paso 2: obtener estructura de columnas
  const structure = await getGradebookStructure(courseId, subjectId, trimester);
  const assignments = structure?.assignments ?? [];

  // Paso 3: obtener notas reales
  const gradebookData = await getRawGradebookData(courseId, subjectId, trimester);

  // Paso 4: cruzar datos
  const rows: StudentGradeRow[] = [];

  for (const [studentDocId, grades] of Object.entries(gradebookData)) {
    const student = studentMap[studentDocId];
    if (!student) continue; // estudiante no encontrado, se omite

    const finalGrade = calculateFinalGrade(grades, assignments);

    rows.push({
      studentDocId,
      studentName: student.name,
      studentCedula: student.studentId,
      grades,
      finalGrade,
    });
  }

  // Ordenar por nombre
  rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
  return rows;
}

// ─── 8. OBSERVACIONES (nueva colección) ──────────────────────────────────────

/**
 * Guarda una observación de comportamiento de un estudiante.
 * Ruta: courses/{courseId}/students/{studentDocId}/observations
 */
export async function addObservation(
  courseId: string,
  studentDocId: string,
  observation: Omit<Observation, "id">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "courses", courseId, "students", studentDocId, "observations"),
    {
      ...observation,
      createdAt: serverTimestamp(),
    }
  );
  return ref.id;
}

/**
 * Obtiene todas las observaciones de un estudiante.
 * Ruta: courses/{courseId}/students/{studentDocId}/observations
 */
export async function getObservations(
  courseId: string,
  studentDocId: string
): Promise<Observation[]> {
  const snap = await getDocs(
    collection(db, "courses", courseId, "students", studentDocId, "observations")
  );
  return snap.docs.map((d) => {
    const data = d.data();
    // Convertir Timestamp de Firestore a ISO string si aplica
    const date =
      data.date instanceof Timestamp
        ? data.date.toDate().toISOString()
        : data.date;
    return {
      id: d.id,
      date,
      note: data.note,
      teacherId: data.teacherId,
    };
  });
}
