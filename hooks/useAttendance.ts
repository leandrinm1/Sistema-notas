/**
 * useAttendance.ts
 * Hook de React para cargar la asistencia de un curso,
 * resolviendo el "código raro" → nombre real del estudiante.
 */

"use client";

import { useEffect, useState } from "react";
import { getAttendance, getStudentMap } from "@/lib/firestore-queries";
import type { Student } from "@/lib/types";

export interface AttendanceRow {
  studentDocId: string;
  studentName: string;
  studentCedula: string;
  /** Mapa fecha → estado: { "2025-12-12": "P", "2025-12-13": "F" } */
  byDate: Record<string, "P" | "F" | "J">;
}

interface UseAttendanceResult {
  rows: AttendanceRow[];
  dates: string[];   // Lista de fechas ordenadas
  loading: boolean;
  error: string | null;
}

export function useAttendance(courseId: string): UseAttendanceResult {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const [studentMap, attendanceRecords] = await Promise.all([
          getStudentMap(courseId),
          getAttendance(courseId),
        ]);

        // Ordenar fechas
        const sortedDates = attendanceRecords
          .map((r) => r.date)
          .sort((a, b) => a.localeCompare(b));

        setDates(sortedDates);

        // Construir filas por estudiante
        const studentRows: Record<string, AttendanceRow> = {};

        for (const record of attendanceRecords) {
          for (const [studentDocId, status] of Object.entries(record.records)) {
            if (!studentRows[studentDocId]) {
              const student: Student | undefined = studentMap[studentDocId];
              studentRows[studentDocId] = {
                studentDocId,
                studentName: student?.name ?? `(ID: ${studentDocId})`,
                studentCedula: student?.studentId ?? "",
                byDate: {},
              };
            }
            studentRows[studentDocId].byDate[record.date] = status;
          }
        }

        const sorted = Object.values(studentRows).sort((a, b) =>
          a.studentName.localeCompare(b.studentName)
        );

        setRows(sorted);
      } catch (err) {
        console.error("Error cargando asistencia:", err);
        setError("No se pudo cargar la asistencia.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  return { rows, dates, loading, error };
}
