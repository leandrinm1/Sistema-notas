"use client";

import { useEffect, useState } from "react";
import { getCourseIds, getStudents, getSubjectIds, getGradeTableRows } from "@/lib/firestore-queries";
import type { StudentGradeRow } from "@/lib/types";

export default function DebugPage() {
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [gradeRows, setGradeRows] = useState<StudentGradeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((l) => [...l, msg]);

  // Cargar cursos al montar
  useEffect(() => {
    getCourseIds()
      .then((ids) => {
        setCourses(ids);
        addLog(`✅ Cursos encontrados: ${ids.length}`);
      })
      .catch((err) => addLog(`❌ Error al leer cursos: ${err.message}`));
  }, []);

  // Cargar materias cuando se selecciona un curso
  useEffect(() => {
    if (!selectedCourse) return;
    setSubjects([]);
    setGradeRows([]);
    addLog(`🔍 Cargando materias de: ${selectedCourse}`);
    getSubjectIds(selectedCourse)
      .then((ids) => {
        setSubjects(ids);
        addLog(`✅ Materias encontradas: ${ids.join(", ")}`);
      })
      .catch((err) => addLog(`❌ Error materias: ${err.message}`));
  }, [selectedCourse]);

  // Cargar tabla cuando se selecciona materia
  useEffect(() => {
    if (!selectedCourse || !selectedSubject) return;
    setLoading(true);
    setGradeRows([]);
    addLog(`🔍 Cargando notas: ${selectedCourse} / ${selectedSubject}`);
    getGradeTableRows(selectedCourse, selectedSubject)
      .then((rows) => {
        setGradeRows(rows);
        addLog(`✅ Filas de notas: ${rows.length} estudiantes`);
      })
      .catch((err) => addLog(`❌ Error notas: ${err.message}`))
      .finally(() => setLoading(false));
  }, [selectedCourse, selectedSubject]);

  const styles: Record<string, React.CSSProperties> = {
    container: { fontFamily: "monospace", padding: 24, maxWidth: 1200, margin: "0 auto" },
    select: { padding: "6px 12px", marginRight: 12, fontSize: 14, borderRadius: 4, border: "1px solid #ccc" },
    table: { width: "100%", borderCollapse: "collapse", marginTop: 16 },
    th: { background: "#1e3a5f", color: "#fff", padding: "8px 12px", textAlign: "left", fontSize: 13 },
    td: { padding: "7px 12px", borderBottom: "1px solid #ddd", fontSize: 13 },
    log: { background: "#1a1a1a", color: "#00ff88", padding: 16, borderRadius: 8, height: 180, overflowY: "auto", fontSize: 12 },
    badge: (v: number) => ({
      display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: "bold",
      background: v >= 7 ? "#d4edda" : v >= 5 ? "#fff3cd" : "#f8d7da",
      color: v >= 7 ? "#155724" : v >= 5 ? "#856404" : "#721c24",
    }),
  };

  return (
    <div style={styles.container}>
      <h1 style={{ marginBottom: 4 }}>🏫 Debug — Sistema de Notas</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>Verificación de conexión y estructura real de Firestore</p>

      {/* Selectores */}
      <div style={{ marginBottom: 20 }}>
        <label><strong>Curso:</strong>&nbsp;</label>
        <select style={styles.select} value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
          <option value="">-- Selecciona --</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {subjects.length > 0 && (
          <>
            <label><strong>Materia:</strong>&nbsp;</label>
            <select style={styles.select} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
              <option value="">-- Selecciona --</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Log */}
      <div style={styles.log}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
        {log.length === 0 && <div style={{ color: "#aaa" }}>Esperando conexión...</div>}
      </div>

      {/* Tabla de notas */}
      {loading && <p style={{ marginTop: 16 }}>⏳ Cargando notas...</p>}

      {gradeRows.length > 0 && (
        <>
          <h2 style={{ marginTop: 24 }}>📊 Tabla de Calificaciones</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Cédula</th>
                {Object.keys(gradeRows[0].grades).map((col) => (
                  <th key={col} style={styles.th}>{col}</th>
                ))}
                <th style={styles.th}>Final /10</th>
              </tr>
            </thead>
            <tbody>
              {gradeRows.map((row) => (
                <tr key={row.studentDocId}>
                  <td style={styles.td}>{row.studentName}</td>
                  <td style={styles.td}>{row.studentCedula}</td>
                  {Object.values(row.grades).map((v, i) => (
                    <td key={i} style={styles.td}>{v ?? "—"}</td>
                  ))}
                  <td style={styles.td}>
                    <span style={styles.badge(row.finalGrade)}>{row.finalGrade}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
