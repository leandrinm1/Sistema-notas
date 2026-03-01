/**
 * useGradeTable.ts
 * Hook de React que encapsula la carga de la tabla de calificaciones.
 * Uso:
 *   const { rows, columns, loading, error } = useGradeTable(courseId, subjectId);
 */

"use client";

import { useEffect, useState } from "react";
import {
  getGradeTableRows,
  getGradebookStructure,
} from "@/lib/firestore-queries";
import type { StudentGradeRow } from "@/lib/types";

interface UseGradeTableResult {
  rows: StudentGradeRow[];
  columns: string[];   // Nombres de las columnas de notas (ej: ["AI1","AI2","PI","EX"])
  loading: boolean;
  error: string | null;
}

export function useGradeTable(
  courseId: string,
  subjectId: string,
  trimester: string = "trimester-1"
): UseGradeTableResult {
  const [rows, setRows] = useState<StudentGradeRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !subjectId) return;

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        // Cargar columnas y filas en paralelo
        const [structure, tableRows] = await Promise.all([
          getGradebookStructure(courseId, subjectId, trimester),
          getGradeTableRows(courseId, subjectId, trimester),
        ]);

        setColumns(structure?.assignments ?? []);
        setRows(tableRows);
      } catch (err) {
        console.error("Error cargando tabla de notas:", err);
        setError("No se pudieron cargar las calificaciones. Revisa la consola.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, subjectId, trimester]);

  return { rows, columns, loading, error };
}
