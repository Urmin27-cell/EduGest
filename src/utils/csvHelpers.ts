import { Student, ClassRoom, GradeEntry, Subject, StudentAttendance } from '../types';

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportStudentsCSV(students: Student[], classes: ClassRoom[]): void {
  const headers = ['Matricule', 'Nom', 'Prenom', 'Sexe', 'Date_Naissance', 'Classe', 'Telephone_Parent', 'Adresse', 'Statut'];
  const rows = students.map((s) => {
    const cls = classes.find((c) => c.id === s.classId);
    return [
      `"${s.matricule}"`,
      `"${s.lastName}"`,
      `"${s.firstName}"`,
      `"${s.gender}"`,
      `"${s.birthDate}"`,
      `"${cls ? cls.name : s.classId}"`,
      `"${s.guardianPhone}"`,
      `"${s.address.replace(/"/g, '""')}"`,
      `"${s.status === 'active' ? 'Actif' : 'Archivé'}"`,
    ].join(';');
  });

  const csv = [headers.join(';'), ...rows].join('\n');
  downloadCSV(csv, `Eleves_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportGradesCSV(
  grades: GradeEntry[],
  students: Student[],
  classes: ClassRoom[],
  subjects: Subject[],
  termName: string
): void {
  const headers = ['Matricule', 'Nom_Eleve', 'Prenom_Eleve', 'Classe', 'Matiere', 'Trimestre', 'Note_sur_20', 'Coefficient', 'Observation'];
  const rows = grades.map((g) => {
    const stu = students.find((s) => s.id === g.studentId);
    const cls = classes.find((c) => c.id === g.classId);
    const sub = subjects.find((sb) => sb.id === g.subjectId);
    return [
      `"${stu?.matricule || ''}"`,
      `"${stu?.lastName || ''}"`,
      `"${stu?.firstName || ''}"`,
      `"${cls?.name || ''}"`,
      `"${sub?.name || ''}"`,
      `"${termName}"`,
      `"${g.score !== null ? g.score : 'Non note'}"`,
      `"${g.coefficient}"`,
      `"${(g.observation || '').replace(/"/g, '""')}"`,
    ].join(';');
  });

  const csv = [headers.join(';'), ...rows].join('\n');
  downloadCSV(csv, `Notes_${termName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
}

export function parseStudentsCSV(
  text: string,
  targetClassId: string
): Array<Partial<Student>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Determine separator: ';' or ','
  const firstLine = lines[0];
  const sep = firstLine.includes(';') ? ';' : ',';

  const results: Array<Partial<Student>> = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (rawCols.length < 2) continue;

    // Expected format: Nom; Prenom; Sexe; Date_Naissance; Telephone; Adresse
    const lastName = rawCols[0] || '';
    const firstName = rawCols[1] || '';
    if (!lastName && !firstName) continue;

    const gender = (rawCols[2] || 'M').toUpperCase().startsWith('F') ? 'F' : 'M';
    const birthDate = rawCols[3] || '2012-01-01';
    const phone = rawCols[4] || '';
    const address = rawCols[5] || 'Antananarivo';

    results.push({
      lastName,
      firstName,
      gender: gender as 'M' | 'F',
      birthDate,
      guardianPhone: phone,
      address,
      classId: targetClassId,
    });
  }

  return results;
}
