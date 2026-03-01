import { collection, doc, getDoc, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { Teacher, Student, AttendanceRecord, GradebookStructure, GradebookData, StudentGradeRow, Observation, Assignment } from "./types";

export async function getTeacher(teacherId: string): Promise<Teacher | null> {
  const snap = await getDoc(doc(db, "teachers", teacherId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Teacher, "id">) };
}

export async function getCourseIds(): Promise<string[]> {
  const snap = await getDocs(collection(db, "courses"));
  return snap.docs.map((d) => d.id);
}

export async function getStudents(courseId: string): Promise<Student[]> {
  const snap = await getDocs(collection(db, "courses", courseId, "students"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Student, "id">) }));
}

export async function getStudentMap(courseId: string): Promise<Record<string, Student>> {
  const students = await getStudents(courseId);
  return Object.fromEntries(students.map((s) => [s.id, s]));
}

export async function getAttendance(courseId: string): Promise<AttendanceRecord[]> {
  const snap = await getDocs(collection(db, "courses", courseId, "attendance"));
  return snap.docs.map((d) => ({ date: d.id, records: d.data() as Record<string, "P" | "F" | "J"> }));
}

export async function getAttendanceByDate(courseId: string, date: string): Promise<AttendanceRecord | null> {
  const snap = await getDoc(doc(db, "courses", courseId, "attendance", date));
  if (!snap.exists()) return null;
  return { date: snap.id, records: snap.data() as Record<string, "P" | "F" | "J"> };
}

export async function getSubjectIds(courseId: string): Promise<string[]> {
  const snap = await getDocs(collection(db, "courses", courseId, "subjects"));
  return snap.docs.map((d) => d.id);
}

export async function getGradebookStructure(courseId: string, subjectId: string, trimester: string = "trimester-1"): Promise<GradebookStructure | null> {
  const snap = await getDoc(doc(db, "courses", courseId, "subjects", subjectId, "gradebookStructures", trimester));
  if (!snap.exists()) return null;
  return snap.data() as GradebookStructure;
}

export async function getRawGradebookData(courseId: string, subjectId: string, trimester: string = "trimester-1"): Promise<GradebookData> {
  const snap = await getDoc(doc(db, "courses", courseId, "subjects", subjectId, "gradebookData", trimester));
  if (!snap.exists()) return {};
  return snap.data() as GradebookData;
}

export function calculateFinalGrade(grades: Record<string, number>, assignments: Assignment[]): number {
  if (!assignments || assignments.length === 0) return 0;
  
  const aiAgKeys = assignments.filter((a) => a.id.startsWith("AI") || a.id.startsWith("AG")).map(a => a.id);
  const piKeys = assignments.filter((a) => a.id.startsWith("PI")).map(a => a.id);
  const exKeys = assignments.filter((a) => a.id === "EX").map(a => a.id);

  let aiAgScore = 0;
  if (aiAgKeys.length > 0) {
    const sum = aiAgKeys.reduce((acc, k) => acc + (grades[k] ?? 0), 0);
    aiAgScore = ((sum / aiAgKeys.length) / 10) * 7;
  }

  let piScore = 0;
  if (piKeys.length > 0) {
    const sum = piKeys.reduce((acc, k) => acc + (grades[k] ?? 0), 0);
    piScore = ((sum / piKeys.length) / 10) * 1.5;
  }

  let exScore = 0;
  if (exKeys.length > 0) {
    const sum = exKeys.reduce((acc, k) => acc + (grades[k] ?? 0), 0);
    exScore = ((sum / exKeys.length) / 10) * 1.5;
  }

  return Math.round((aiAgScore + piScore + exScore) * 100) / 100;
}

export async function getGradeTableRows(courseId: string, subjectId: string, trimester: string = "trimester-1"): Promise<StudentGradeRow[]> {
  const studentMap = await getStudentMap(courseId);
  const structure = await getGradebookStructure(courseId, subjectId, trimester);
  const assignments = structure?.assignments ?? [];
  const gradebookData = await getRawGradebookData(courseId, subjectId, trimester);
  const rows: StudentGradeRow[] = [];

  for (const [studentDocId, student] of Object.entries(studentMap)) {
    const grades = gradebookData[studentDocId] || {};
    const finalGrade = calculateFinalGrade(grades, assignments);
    rows.push({ studentDocId, studentName: student.name, studentCedula: student.studentId, grades, finalGrade });
  }

  rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
  return rows;
}
