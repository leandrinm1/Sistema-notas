import { Timestamp } from "firebase/firestore";

export interface Teacher { id: string; email: string; displayName: string; role: string; assignedSubjects: Record<string, string[]>; }
export interface Student { id: string; name: string; studentId: string; email: string; }
export interface AttendanceRecord { date: string; records: Record<string, "P" | "F" | "J">; }
export interface Assignment { id: string; name: string; type: string; }
export interface GradebookStructure { trimester: number; assignments: Assignment[]; }
export interface GradebookData { [studentId: string]: Record<string, number>; }
export interface StudentGradeRow { studentDocId: string; studentName: string; studentCedula: string; grades: Record<string, number>; finalGrade: number; }
export interface Observation { id?: string; date: string | Timestamp; note: string; teacherId: string; }
