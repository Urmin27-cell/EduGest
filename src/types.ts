export interface SchoolSettings {
  schoolName: string;
  motto: string;
  republicTitle: string; // e.g., "RÉPUBLIQUE DE MADAGASCAR"
  nationalDevise: string; // "Fitiavana - Tanindrazana - Fandrosoana"
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  directorName: string;
  directorTitle: string; // e.g., "Le Directeur Général"
  directorSignatureUrl?: string;
  schoolStampUrl?: string;
  activeAcademicYear: string; // e.g. "2026-2027"
  academicYears: string[];
  maxGrade: number; // default 20
  availableTerms: { id: string; name: string; shortName: string; isLocked?: boolean }[];
  isDemoData: boolean;
}

export interface ClassRoom {
  id: string;
  name: string; // e.g., "6ème A", "3ème B", "Terminale S"
  level: string; // e.g., "Collège", "Lycée", "Primaire"
  academicYear: string;
  mainTeacherId?: string;
  roomNumber?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string; // e.g., "Mathématiques"
  code: string; // e.g., "MATH"
  defaultCoefficient: number;
  classCoefficients: Record<string, number>; // classId -> coefficient
  displayOrder: number;
  category: 'Scientifique' | 'Littéraire' | 'Langues' | 'Sport' | 'Artistique' | 'Autre';
  isArchived: boolean;
}

export interface Teacher {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  photoUrl?: string;
  signatureUrl?: string;
  passwordHash: string; // sha256 or bcrypt representation
  assignedSubjectIds: string[];
  assignedClassIds: string[];
  status: 'active' | 'archived';
  hireDate?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  matricule: string; // e.g., "ELEV-2026-001"
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'M' | 'F';
  address: string;
  fatherName: string;
  motherName: string;
  guardianPhone: string;
  classId: string;
  academicYear: string;
  photoUrl?: string;
  status: 'active' | 'archived';
  admissionDate: string;
  notes?: string;
}

export interface GradeEntry {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  termId: string; // e.g., "T1", "T2", "T3"
  academicYear: string;
  score: number | null; // null if not yet entered
  isAbsent?: boolean;
  coefficient: number;
  observation?: string;
  teacherId?: string;
  teacherName?: string;
  signatureUrl?: string; // Signature de l'enseignant pour cette note
  signedAt?: string; // Date et heure de signature
  updatedAt: string;
}

export interface GradeAudit {
  id: string;
  gradeId: string;
  studentId: string;
  studentName: string;
  subjectName: string;
  oldScore: number | null;
  newScore: number | null;
  modifiedBy: string;
  userRole: 'DIRECTEUR' | 'ENSEIGNANT';
  timestamp: string;
  reason?: string;
}

export interface StudentAttendance {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  classId: string;
  studentId: string;
  termId: string;
  academicYear: string;
  status: 'present' | 'absent' | 'late';
  isJustified: boolean;
  observation?: string;
  recordedBy: string;
}

export interface TeacherAttendance {
  id: string;
  date: string; // YYYY-MM-DD
  teacherId: string;
  arrivalTime?: string;
  departureTime?: string;
  status: 'present' | 'absent' | 'late';
  observation?: string;
  recordedBy: string;
}

export interface ReportCardValidation {
  id: string; // studentId_termId_academicYear
  studentId: string;
  classId: string;
  termId: string;
  academicYear: string;
  isValidated: boolean;
  validatedAt?: string;
  validatedBy?: string;
  directorSignatureUrl?: string;
  teacherSignatureUrl?: string;
  generalAppreciation: string;
  rank?: number;
  classSize?: number;
  generalAverage?: number;
  classAverage?: number;
  totalPoints?: number;
  totalCoefficients?: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: 'DIRECTEUR' | 'ENSEIGNANT';
  action: string;
  details: string;
}

export interface AdminAuth {
  pinHash: string;
  isConfigured: boolean;
  recoveryQuestion: string;
  recoveryAnswerHash: string;
  lastLogin?: string;
}

export interface SchoolDatabase {
  settings: SchoolSettings;
  classes: ClassRoom[];
  subjects: Subject[];
  teachers: Teacher[];
  students: Student[];
  grades: GradeEntry[];
  gradeAudits: GradeAudit[];
  studentAttendances: StudentAttendance[];
  teacherAttendances: TeacherAttendance[];
  reportCardValidations: ReportCardValidation[];
  activityLogs: ActivityLog[];
  adminAuth: AdminAuth;
}

export interface SchoolSummary {
  id: string;
  schoolName: string;
  directorName: string;
  phone?: string;
  address?: string;
  email?: string;
  isDemo?: boolean;
  createdAt?: string;
}
