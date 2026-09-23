import React, { useState, useEffect } from 'react';
import { SchoolDatabase, Teacher } from '../types';
import { dbService } from '../services/dbService';
import {
  BookOpen,
  Layers,
  Calendar,
  Lock,
  Unlock,
  Save,
  Calculator,
  AlertCircle,
  CheckCircle2,
  History,
  FileSpreadsheet,
  Pen,
  FilePenLine,
  Check,
  X,
  ShieldCheck,
  UserCheck,
  User,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { exportGradesCSV } from '../utils/csvHelpers';
import { SignatureModal } from './SignatureModal';

interface GradeEntryViewProps {
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT'; teacherId?: string };
  onUpdate: () => void;
}

export const GradeEntryView: React.FC<GradeEntryViewProps> = ({
  db,
  currentUser,
  onUpdate,
}) => {
  // Security Authentication State for Grade Entry
  const [authenticatedTeacher, setAuthenticatedTeacher] = useState<Teacher | null>(() => {
    // If the user logged into the app as an active teacher with their password, they are ALREADY authenticated!
    if (currentUser.role === 'ENSEIGNANT' && currentUser.teacherId) {
      const found = db.teachers.find((t) => t.id === currentUser.teacherId && t.status === 'active');
      if (found) return found;
    }
    const savedId = sessionStorage.getItem('saisie_notes_teacher_id');
    if (savedId) {
      const found = db.teachers.find((t) => t.id === savedId && t.status === 'active');
      if (found) return found;
    }
    return null;
  });

  // Director Supervision Mode (PIN required if not already logged in as Director)
  const [isDirectorMode, setIsDirectorMode] = useState<boolean>(() => currentUser.role === 'DIRECTEUR');
  const [showDirectorPinPrompt, setShowDirectorPinPrompt] = useState<boolean>(false);
  const [directorPinInput, setDirectorPinInput] = useState<string>('');
  const [directorPinError, setDirectorPinError] = useState<string | null>(null);

  // Authentication form fields
  const [loginFullName, setLoginFullName] = useState<string>(() => {
    if (currentUser.role === 'ENSEIGNANT' && currentUser.teacherId) {
      const t = db.teachers.find((tea) => tea.id === currentUser.teacherId);
      if (t) return `${t.firstName} ${t.lastName}`;
    }
    return '';
  });
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);

  // STRICT FILTERING: Only classes assigned to the authenticated teacher (or all if Director override)
  const allowedClasses = db.classes.filter((c) => {
    if (c.isArchived) return false;
    if (isDirectorMode) return true;
    if (!authenticatedTeacher) return false;
    return authenticatedTeacher.assignedClassIds.includes(c.id);
  });

  // STRICT FILTERING: Only subjects assigned to the authenticated teacher (or all if Director override)
  const allowedSubjects = db.subjects.filter((s) => {
    if (s.isArchived) return false;
    if (isDirectorMode) return true;
    if (!authenticatedTeacher) return false;
    return authenticatedTeacher.assignedSubjectIds.includes(s.id);
  });

  const [selectedClassId, setSelectedClassId] = useState<string>(allowedClasses[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(allowedSubjects[0]?.id || '');
  const [selectedTermId, setSelectedTermId] = useState<string>(
    db.settings.availableTerms[0]?.id || 'T1'
  );

  // Keep selected class & subject strictly in sync with allowed options
  useEffect(() => {
    if (allowedClasses.length > 0 && !allowedClasses.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(allowedClasses[0].id);
    } else if (allowedClasses.length === 0) {
      setSelectedClassId('');
    }
  }, [allowedClasses, selectedClassId]);

  useEffect(() => {
    if (allowedSubjects.length > 0 && !allowedSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(allowedSubjects[0].id);
    } else if (allowedSubjects.length === 0) {
      setSelectedSubjectId('');
    }
  }, [allowedSubjects, selectedSubjectId]);

  // Handle teacher login submission
  const handleTeacherAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!loginFullName.trim() || !loginPassword.trim()) {
      setAuthError('Ampidiro ny anaranao feno sy ny teny miafina azafady / Veuillez renseigner le nom complet et le mot de passe.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const teacher = await dbService.verifyTeacherCredentials(loginFullName, loginPassword);
      if (teacher) {
        setAuthenticatedTeacher(teacher);
        sessionStorage.setItem('saisie_notes_teacher_id', teacher.id);
        sessionStorage.setItem('saisie_notes_session_unlocked', 'true');
        setLoginPassword('');
        setAuthError(null);

        // Pre-select first assigned class & subject
        if (teacher.assignedClassIds.length > 0) {
          const firstClass = db.classes.find((c) => !c.isArchived && teacher.assignedClassIds.includes(c.id));
          if (firstClass) setSelectedClassId(firstClass.id);
        }
        if (teacher.assignedSubjectIds.length > 0) {
          const firstSub = db.subjects.find((s) => !s.isArchived && teacher.assignedSubjectIds.includes(s.id));
          if (firstSub) setSelectedSubjectId(firstSub.id);
        }

        await dbService.logActivity(
          `${teacher.firstName} ${teacher.lastName}`,
          'ENSEIGNANT',
          'CONNEXION_SAISIE_NOTES',
          `Fidirana voaaro tamin'ny fampidirana naoty nataon'i Prof. ${teacher.firstName} ${teacher.lastName}.`
        );
      } else {
        setAuthError(
          'Diso ny anarana feno na ny teny miafina. Hamarino tsara na manatona ny fitondrana. (Nom complet ou mot de passe incorrect).'
        );
      }
    } catch {
      setAuthError('Nisy olana teo am-panamarinana ny kaonty. Andramo indray.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleDisconnectTeacher = () => {
    setAuthenticatedTeacher(null);
    setIsDirectorMode(false);
    sessionStorage.removeItem('saisie_notes_teacher_id');
    sessionStorage.removeItem('saisie_notes_session_unlocked');
    setLoginPassword('');
    setAuthError(null);
  };

  // Identify the designated subject teacher for this class & subject
  const assignedTeacher =
    authenticatedTeacher ||
    db.teachers.find(
      (t) =>
        t.status === 'active' &&
        t.assignedClassIds.includes(selectedClassId) &&
        t.assignedSubjectIds.includes(selectedSubjectId)
    ) ||
    null;

  // The teacher signature to use on grades: MUST be the teacher's signature, NEVER the Director!
  const teacherProfileSignature =
    authenticatedTeacher?.signatureUrl || assignedTeacher?.signatureUrl;

  const [scores, setScores] = useState<
    Record<
      string,
      {
        score: string;
        observation: string;
        isAbsent: boolean;
        signatureUrl?: string;
        signedAt?: string;
      }
    >
  >({});
  const [showAverageModal, setShowAverageModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeSigningStudentId, setActiveSigningStudentId] = useState<string | null>(null);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isBatchSignModalOpen, setIsBatchSignModalOpen] = useState(false);
  const [isTeacherProfileSignModalOpen, setIsTeacherProfileSignModalOpen] = useState(false);
  const [isQuickCoeffModalOpen, setIsQuickCoeffModalOpen] = useState(false);
  const [tempCoeffValue, setTempCoeffValue] = useState<number>(1);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const selectedClass = db.classes.find((c) => c.id === selectedClassId);
  const selectedSubject = db.subjects.find((s) => s.id === selectedSubjectId);
  const currentTerm = db.settings.availableTerms.find((t) => t.id === selectedTermId);
  const isTermLocked = Boolean(currentTerm?.isLocked);

  const currentCoefficient =
    selectedSubject?.classCoefficients?.[selectedClassId] ||
    selectedSubject?.defaultCoefficient ||
    1;

  const students = db.students.filter(
    (s) => s.classId === selectedClassId && s.status === 'active'
  );

  const lastContextKeyRef = React.useRef<string>('');
  const currentContextKey = `${selectedClassId}_${selectedSubjectId}_${selectedTermId}_${db.settings.activeAcademicYear}`;

  // Load existing grades WITHOUT wiping in-progress user input when database or teacher signature updates
  useEffect(() => {
    const isContextChange = lastContextKeyRef.current !== currentContextKey;
    lastContextKeyRef.current = currentContextKey;

    const existing = db.grades.filter(
      (g) =>
        g.classId === selectedClassId &&
        g.subjectId === selectedSubjectId &&
        g.termId === selectedTermId &&
        g.academicYear === db.settings.activeAcademicYear
    );

    setScores((prev) => {
      const updated: typeof scores = {};
      students.forEach((stu) => {
        const g = existing.find((entry) => entry.studentId === stu.id);
        const prevEntry = prev[stu.id];

        if (isContextChange || !prevEntry) {
          // Context changed (switched class, subject, or term): load from database
          updated[stu.id] = {
            score: g && g.score !== null && g.score !== undefined ? String(g.score) : '',
            observation: g?.observation || '',
            isAbsent: Boolean(g?.isAbsent),
            signatureUrl: g?.signatureUrl || '',
            signedAt: g?.signedAt,
          };
        } else {
          // Same context: NEVER erase what the user typed in the inputs!
          updated[stu.id] = {
            score: prevEntry.score,
            observation: prevEntry.observation,
            isAbsent: prevEntry.isAbsent,
            signatureUrl: prevEntry.signatureUrl || g?.signatureUrl || '',
            signedAt: prevEntry.signedAt || g?.signedAt,
          };
        }
      });
      return updated;
    });
  }, [currentContextKey, students.length]);

  const handleScoreChange = (studentId: string, value: string) => {
    setErrorStatus(null);
    if (value === '') {
      setScores((prev) => ({
        ...prev,
        [studentId]: { ...prev[studentId], score: '', isAbsent: false },
      }));
      return;
    }

    const num = parseFloat(value);
    if (isNaN(num)) return;
    if (num < 0 || num > db.settings.maxGrade) {
      setErrorStatus(`La note doit être comprise entre 0 et ${db.settings.maxGrade}.`);
      return;
    }

    setScores((prev) => {
      const current = prev[studentId] || { score: '', observation: '', isAbsent: false };
      // Auto-attach teacher signature if available and not yet signed
      const autoSignature = current.signatureUrl || teacherProfileSignature || '';
      const autoSignedAt = autoSignature ? (current.signedAt || new Date().toISOString()) : undefined;

      return {
        ...prev,
        [studentId]: {
          ...current,
          score: value,
          isAbsent: false,
          signatureUrl: autoSignature,
          signedAt: autoSignedAt,
        },
      };
    });
  };

  const toggleAbsent = (studentId: string) => {
    setScores((prev) => {
      const current = prev[studentId] || { score: '', observation: '', isAbsent: false };
      const nextAbsent = !current.isAbsent;
      return {
        ...prev,
        [studentId]: {
          ...current,
          isAbsent: nextAbsent,
          score: nextAbsent ? '' : current.score,
        },
      };
    });
  };

  const handleObservationChange = (studentId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], observation: value },
    }));
  };

  // Signatures Handlers for the Teacher
  const handleSignStudentWithProfile = (studentId: string) => {
    if (!teacherProfileSignature) {
      setActiveSigningStudentId(studentId);
      setIsSignModalOpen(true);
      return;
    }
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        signatureUrl: teacherProfileSignature,
        signedAt: new Date().toISOString(),
      },
    }));
  };

  const handleSaveStudentSignature = async (signatureDataUrl: string) => {
    if (activeSigningStudentId) {
      setScores((prev) => ({
        ...prev,
        [activeSigningStudentId]: {
          ...prev[activeSigningStudentId],
          signatureUrl: signatureDataUrl,
          signedAt: new Date().toISOString(),
        },
      }));

      // If the teacher didn't have a profile signature yet, save it to their profile in the background
      if (assignedTeacher && !assignedTeacher.signatureUrl) {
        await dbService.updateTeacher(
          { ...assignedTeacher, signatureUrl: signatureDataUrl },
          currentUser.name
        );
      }

      setActiveSigningStudentId(null);
      setIsSignModalOpen(false);
    }
  };

  const handleSaveTeacherProfileSignature = async (signatureDataUrl: string) => {
    const teacherToUpdate = authenticatedTeacher || assignedTeacher;
    if (teacherToUpdate) {
      const updatedTeacher = { ...teacherToUpdate, signatureUrl: signatureDataUrl };
      await dbService.updateTeacher(updatedTeacher, currentUser.name);
      if (authenticatedTeacher) {
        setAuthenticatedTeacher(updatedTeacher);
      }
    }

    // Auto-apply to all currently scored rows without wiping any notes
    const now = new Date().toISOString();
    setScores((prev) => {
      const updated = { ...prev };
      students.forEach((stu) => {
        const val = updated[stu.id];
        if (val && val.score !== '' && !val.isAbsent) {
          updated[stu.id] = {
            ...val,
            signatureUrl: signatureDataUrl,
            signedAt: val.signedAt || now,
          };
        }
      });
      return updated;
    });

    setIsTeacherProfileSignModalOpen(false);
    setSaveStatus("Sonia ofisialy voatahiry soa aman-tsara ary nampiharina tamin'ny naoty rehetra !");
    setTimeout(() => setSaveStatus(null), 3500);
  };

  const handleBatchSign = async (customSignature?: string) => {
    const sig = customSignature || teacherProfileSignature;
    if (!sig) {
      setIsBatchSignModalOpen(true);
      return;
    }
    const now = new Date().toISOString();
    setScores((prev) => {
      const updated = { ...prev };
      students.forEach((stu) => {
        const val = updated[stu.id];
        if (val && val.score !== '' && !val.isAbsent) {
          updated[stu.id] = {
            ...val,
            signatureUrl: sig,
            signedAt: now,
          };
        }
      });
      return updated;
    });

    // If teacher had no signature, attach it to their teacher profile
    if (customSignature && assignedTeacher && !assignedTeacher.signatureUrl) {
      await dbService.updateTeacher(
        { ...assignedTeacher, signatureUrl: customSignature },
        currentUser.name
      );
    }

    setIsBatchSignModalOpen(false);
  };

  const handleClearSignature = (studentId: string) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        signatureUrl: '',
        signedAt: undefined,
      },
    }));
  };

  const handleSaveGrades = async () => {
    if (isTermLocked && currentUser.role !== 'DIRECTEUR') {
      alert('La saisie des notes pour cette période est verrouillée par la Direction.');
      return;
    }

    const entries = students.map((stu) => {
      const val = scores[stu.id];
      const parsedScore = val?.score !== '' && val?.score !== undefined ? parseFloat(val.score) : null;
      return {
        studentId: stu.id,
        score: val?.isAbsent ? null : parsedScore,
        isAbsent: val?.isAbsent,
        observation: val?.observation || '',
        signatureUrl: val?.signatureUrl || undefined,
        signedAt: val?.signedAt || undefined,
      };
    });

    const teacherName = assignedTeacher
      ? `Prof. ${assignedTeacher.firstName} ${assignedTeacher.lastName}`
      : (currentUser.role === 'ENSEIGNANT' ? currentUser.name : 'Professeur');

    await dbService.saveBatchGrades(
      selectedClassId,
      selectedSubjectId,
      selectedTermId,
      db.settings.activeAcademicYear,
      entries,
      teacherName,
      'ENSEIGNANT',
      assignedTeacher?.id || currentUser.teacherId
    );

    setSaveStatus(`Notes et signatures de ${teacherName} enregistrées avec succès en temps réel.`);
    setTimeout(() => setSaveStatus(null), 3500);
    onUpdate();
  };

  const handleQuickSaveCoefficient = async (newCoeff: number) => {
    if (!selectedSubject || newCoeff < 1 || newCoeff > 20) return;
    const updatedClassCoeffs = { ...(selectedSubject.classCoefficients || {}), [selectedClassId]: newCoeff };
    await dbService.updateSubject(
      {
        ...selectedSubject,
        classCoefficients: updatedClassCoeffs,
      },
      currentUser.name
    );
    setIsQuickCoeffModalOpen(false);
    setSaveStatus(`Coefficient de ${selectedSubject.name} pour ${selectedClass?.name} mis à jour : ${newCoeff}`);
    setTimeout(() => setSaveStatus(null), 3500);
    onUpdate();
  };

  const handleToggleLock = async () => {
    if (currentUser.role !== 'DIRECTEUR') return;
    await dbService.toggleTermLock(selectedTermId, !isTermLocked, currentUser.name);
    onUpdate();
  };

  // Computations for average modal
  const validScores = students
    .map((stu) => {
      const val = scores[stu.id];
      if (val && val.score !== '' && !val.isAbsent) {
        return parseFloat(val.score);
      }
      return null;
    })
    .filter((s): s is number => s !== null);

  const subjectAverage =
    validScores.length > 0
      ? (validScores.reduce((sum, v) => sum + v, 0) / validScores.length).toFixed(2)
      : 'N/A';

  const totalPoints = validScores
    .reduce((sum, v) => sum + v * currentCoefficient, 0)
    .toFixed(2);

  const auditLogsForSubject = db.gradeAudits.filter(
    (aud) =>
      students.some((s) => s.id === aud.studentId) &&
      aud.subjectName.toLowerCase() === (selectedSubject?.name || '').toLowerCase()
  );

  const scoredCount = students.filter((s) => scores[s.id]?.score !== '' && !scores[s.id]?.isAbsent).length;
  const signedCount = students.filter((s) => scores[s.id]?.signatureUrl && !scores[s.id]?.isAbsent).length;

  // 1. SCREEN: Security Login Gate if not authenticated
  if (!authenticatedTeacher && !isDirectorMode) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="inline-flex p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 mb-3 shadow-inner">
              <ShieldCheck className="w-9 h-9 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Fidirana Voaaro — Saisie des Notes
            </h2>
            <p className="text-xs text-indigo-200 mt-1.5 max-w-md mx-auto leading-relaxed">
              Mba hiarovana ny tsiambaratelon'ny naoty sy ny fitokisana, ampidiro ny anaranao feno sy ny teny miafinao. Ireo kilasy sy taranja ampianarinao ihany no hiseho.
            </p>
          </div>

          <form onSubmit={handleTeacherAuth} className="p-6 sm:p-8 space-y-5">
            {authError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium">{authError}</span>
              </div>
            )}

            {/* Input 1: Anarana Feno */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Anarana Feno / Nom Complet de l'Enseignant</span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">(Soraty na safidio)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  list="activeTeachersList"
                  value={loginFullName}
                  onChange={(e) => setLoginFullName(e.target.value)}
                  placeholder="ex: RAZAFY Hery na ANDRIANINA Mamy"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pl-10 font-medium"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <datalist id="activeTeachersList">
                  {db.teachers
                    .filter((t) => t.status === 'active')
                    .map((t) => (
                      <React.Fragment key={t.id}>
                        <option value={`${t.firstName} ${t.lastName}`}>
                          {t.firstName} {t.lastName} ({t.matricule})
                        </option>
                        <option value={`${t.lastName} ${t.firstName}`}>
                          {t.lastName} {t.firstName} ({t.matricule})
                        </option>
                      </React.Fragment>
                    ))}
                </datalist>
              </div>
            </div>

            {/* Input 2: Mot de Passe */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Teny Miafina / Mot de Passe Personnel
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pl-10 pr-10 font-mono"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {isSubmittingAuth ? 'Eo am-panamarinana...' : 'Hiditra & Hijery ny Kilasiko (Se connecter)'}
            </button>

            {/* Security Explanation Note */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Fiarovana sy Tsiambaratelo (Sécurité stricte) :
              </div>
              <p className="text-slate-500">
                Ireo kilasy sy taranja voatendry ho anao ihany no hiseho rehefa tafiditra ianao. Tsy hiseho ao mihitsy ny kilasy sy taranja ampianarin'ny mpampianatra hafa.
              </p>
            </div>

            {/* Quick Demo Selector for instant testing */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Kaonty santionany ahafahana manandrana avy hatrany :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {db.teachers
                  .filter((t) => t.status === 'active')
                  .slice(0, 5)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setLoginFullName(`${t.firstName} ${t.lastName}`);
                        setLoginPassword('prof123');
                        setAuthError(null);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[11px] font-medium transition-colors border border-slate-200 text-left"
                    >
                      {t.lastName} {t.firstName}
                    </button>
                  ))}
              </div>
            </div>

            {/* Director Override Option if currentUser is DIRECTEUR */}
            {currentUser.role === 'DIRECTEUR' && (
              <div className="pt-3 border-t border-dashed border-slate-200 text-center">
                {!showDirectorPinPrompt ? (
                  <button
                    type="button"
                    onClick={() => setShowDirectorPinPrompt(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                  >
                    Dérogation Direction (Accès Superviseur avec PIN Directeur)
                  </button>
                ) : (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                    <p className="text-xs text-indigo-900 font-bold">
                      Fidirana manokan'ny Tale (Supervision Direction)
                    </p>
                    {directorPinError && (
                      <p className="text-[11px] text-red-600">{directorPinError}</p>
                    )}
                    <div className="flex items-center gap-2 max-w-xs mx-auto">
                      <input
                        type="password"
                        placeholder="PIN Directeur (ex: 1234)"
                        value={directorPinInput}
                        onChange={(e) => setDirectorPinInput(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-indigo-300 rounded-lg bg-white w-full"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await dbService.verifyAdminPin(directorPinInput);
                          if (ok) {
                            setIsDirectorMode(true);
                            setShowDirectorPinPrompt(false);
                            setDirectorPinInput('');
                          } else {
                            setDirectorPinError('PIN diso.');
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDirectorPinPrompt(false);
                          setDirectorPinError(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        Hanafoana
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // 2. SCREEN: Teacher has no assigned classes or subjects
  if (authenticatedTeacher && (allowedClasses.length === 0 || allowedSubjects.length === 0)) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto py-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4 border border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 border border-indigo-400/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Mpampianatra mifandray
              </span>
              <h3 className="text-base font-bold text-white">
                Prof. {authenticatedTeacher.firstName} {authenticatedTeacher.lastName} ({authenticatedTeacher.matricule})
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDisconnectTeacher}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            Hivoaka / Déconnexion
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
          <h3 className="text-base font-bold text-amber-900">
            {allowedClasses.length === 0
              ? 'Tsy mbola misy kilasy voatendry ho anao'
              : 'Tsy mbola misy taranja voatendry ho anao'}
          </h3>
          <p className="text-xs text-amber-700 max-w-md mx-auto leading-relaxed">
            Ny kaontinao (Prof. {authenticatedTeacher.firstName} {authenticatedTeacher.lastName}) dia mbola tsy manana {allowedClasses.length === 0 ? 'kilasy' : 'taranja'} nankinina taminy ao amin'ny sekoly. Mba mifandraisa amin'ny Tale / Directeur mba hanomezana anao ny taranja sy kilasy ampianarinao.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleDisconnectTeacher}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Hivoaka sy hanova kaonty
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Authenticated Teacher Status Banner */}
      {authenticatedTeacher && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4 border border-indigo-800/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-white shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Mpampianatra Mifandray
                </span>
                <span className="text-xs text-indigo-200 font-mono">
                  Matricule: {authenticatedTeacher.matricule}
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                Prof. {authenticatedTeacher.firstName} {authenticatedTeacher.lastName}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-indigo-200">
                <span className="font-semibold text-slate-300">Kilasy ampianarinao:</span>
                <span className="font-bold text-white bg-indigo-900/60 px-2 py-0.5 rounded-md border border-indigo-700/50">
                  {allowedClasses.map((c) => c.name).join(', ')}
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-300">Taranja ampianarinao:</span>
                <span className="font-bold text-white bg-indigo-900/60 px-2 py-0.5 rounded-md border border-indigo-700/50">
                  {allowedSubjects.map((s) => s.name).join(', ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {authenticatedTeacher.signatureUrl ? (
              <div className="bg-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 border border-white/15">
                <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">
                  Sonia voatahiry :
                </span>
                <img
                  src={authenticatedTeacher.signatureUrl}
                  alt="Sonia Enseignant"
                  className="h-6 max-w-[80px] object-contain filter invert brightness-200"
                />
                <button
                  type="button"
                  onClick={() => setIsTeacherProfileSignModalOpen(true)}
                  className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold rounded-lg ml-1 transition-colors cursor-pointer"
                  title="Hanova ny sonia ofisialinao"
                >
                  Hanova sonia
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsTeacherProfileSignModalOpen(true)}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Hampiditra ny sonia ofisialy"
              >
                <FilePenLine className="w-4 h-4" />
                + Ampidiro ny Soniako
              </button>
            )}
            <button
              type="button"
              onClick={handleDisconnectTeacher}
              className="px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 active:bg-red-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:shadow-md"
              title="Hivoaka amin'ny fampidirana naoty / Fermer la session sécurisée"
            >
              <LogOut className="w-3.5 h-3.5" />
              Hivoaka (Déconnexion)
            </button>
          </div>
        </div>
      )}

      {/* Director Override Mode Banner */}
      {isDirectorMode && (
        <div className="bg-amber-900 text-amber-100 rounded-2xl p-4 shadow-md flex items-center justify-between gap-4 border border-amber-700">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-300 shrink-0" />
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider block text-amber-200">
                Mode Dérogation Direction (Supervision)
              </span>
              <p className="text-xs text-amber-100">
                Ny Tale no mpanara-maso eto. Azo jerena ny kilasy sy taranja rehetra.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDisconnectTeacher}
            className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold rounded-lg"
          >
            Atsahatra ny Mode Dérogation
          </button>
        </div>
      )}
      {/* 3-Step Selection Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Class */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              1. Classe
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white font-medium"
            >
              {allowedClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Subject */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              2. Matière
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white font-medium"
            >
              {allowedSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} (Code: {sub.code})
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Term */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              3. Période / Trimestre
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white font-medium"
              >
                {db.settings.availableTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} {term.isLocked ? '🔒 (Verrouillé)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Control & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Saisie des Notes & Signatures des Professeurs
            </h2>
            {isTermLocked ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Période Verrouillée
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Unlock className="w-3 h-3" /> Saisie Ouverte
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Matière : <strong className="text-slate-800">{selectedSubject?.name}</strong></span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600 inline" />
              Enseignant : <strong className="text-indigo-800">{assignedTeacher ? `Prof. ${assignedTeacher.firstName} ${assignedTeacher.lastName}` : 'Non attribué'}</strong>
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
              Coeff : <strong className="text-indigo-800">{currentCoefficient}</strong>
              {currentUser.role === 'DIRECTEUR' && (
                <button
                  type="button"
                  onClick={() => {
                    setTempCoeffValue(currentCoefficient);
                    setIsQuickCoeffModalOpen(true);
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-900 underline font-bold ml-1 cursor-pointer"
                  title="Modifier le coefficient de cette matière pour cette classe"
                >
                  (Hanova)
                </button>
              )}
            </span>
            <span>·</span>
            <span>Note max : <strong className="text-slate-800">/{db.settings.maxGrade}</strong></span>
            <span>·</span>
            <span>Signatures enseignant : <strong className="text-emerald-700">{signedCount}/{scoredCount}</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'DIRECTEUR' && (
            <button
              type="button"
              onClick={handleToggleLock}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 border transition-colors ${
                isTermLocked
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {isTermLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isTermLocked ? 'Ouvrir la saisie' : 'Verrouiller les notes'}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleBatchSign()}
            disabled={(isTermLocked && currentUser.role !== 'DIRECTEUR') || scoredCount === 0}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Apposer la signature de ${assignedTeacher ? `Prof. ${assignedTeacher.lastName}` : "l'enseignant"} sur toutes les notes`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Signer toutes les notes ({signedCount}/{scoredCount})
          </button>

          <button
            type="button"
            onClick={() => setShowAverageModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-600" />
            Voir la moyenne
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            Historique ({auditLogsForSubject.length})
          </button>

          <button
            type="button"
            onClick={() =>
              exportGradesCSV(
                db.grades,
                db.students,
                db.classes,
                db.subjects,
                currentTerm?.name || selectedTermId
              )
            }
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Exporter CSV
          </button>

          <button
            type="button"
            onClick={handleSaveGrades}
            disabled={isTermLocked && currentUser.role !== 'DIRECTEUR'}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Enregistrer les notes & signatures
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveStatus}</span>
        </div>
      )}

      {errorStatus && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{errorStatus}</span>
        </div>
      )}

      {/* Grade Entry Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Grille de Notes — {selectedClass?.name} · {selectedSubject?.name} (Enseignant : {assignedTeacher ? `Prof. ${assignedTeacher.firstName} ${assignedTeacher.lastName}` : 'Enseignant'})
          </h3>
          <span className="text-xs text-slate-500">
            Période : <strong>{currentTerm?.name}</strong>
          </span>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Aucun élève trouvé dans cette classe.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-3 w-10 text-center">N°</th>
                  <th className="p-3 w-32">Matricule</th>
                  <th className="p-3">Nom & Prénom(s)</th>
                  <th className="p-3 w-28 text-center">Note / {db.settings.maxGrade}</th>
                  <th className="p-3 w-20 text-center">Absent ?</th>
                  <th className="p-3 w-20 text-center">Coeff.</th>
                  <th className="p-3 w-24 text-center">Total</th>
                  <th className="p-3 w-48 text-center">Visa / Signature Enseignant</th>
                  <th className="p-3">Observation / Remarque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((stu, idx) => {
                  const val = scores[stu.id] || { score: '', observation: '', isAbsent: false };
                  const numScore = val.score !== '' ? parseFloat(val.score) : null;
                  const total = numScore !== null ? (numScore * currentCoefficient).toFixed(2) : '-';
                  const isSigned = Boolean(val.signatureUrl);

                  return (
                    <tr
                      key={stu.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        val.isAbsent ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-medium text-slate-600">{stu.matricule}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900">{stu.lastName}</span>{' '}
                        <span className="text-slate-700">{stu.firstName}</span>
                      </td>

                      {/* Note Input */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max={db.settings.maxGrade}
                          disabled={(isTermLocked && currentUser.role !== 'DIRECTEUR') || val.isAbsent}
                          value={val.score}
                          onChange={(e) => handleScoreChange(stu.id, e.target.value)}
                          placeholder="Non saisi"
                          className="w-24 px-2 py-1.5 text-xs text-center font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>

                      {/* Absent Toggle */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAbsent(stu.id)}
                          disabled={isTermLocked && currentUser.role !== 'DIRECTEUR'}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                            val.isAbsent
                              ? 'bg-red-100 border-red-300 text-red-700'
                              : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {val.isAbsent ? 'ABS' : 'Non'}
                        </button>
                      </td>

                      {/* Coeff */}
                      <td className="p-3 text-center font-semibold text-slate-700">
                        {currentCoefficient}
                      </td>

                      {/* Total points */}
                      <td className="p-3 text-center font-mono font-bold text-indigo-900">
                        {val.isAbsent ? <span className="text-red-600 text-xs">ABS</span> : total}
                      </td>

                      {/* Teacher Signature Column (NEVER Director) */}
                      <td className="p-3 text-center">
                        {isSigned ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="bg-white border border-slate-200 rounded p-1 shadow-2xs max-w-[110px] max-h-10 overflow-hidden flex items-center justify-center">
                              <img
                                src={val.signatureUrl}
                                alt={`Signature Prof. ${assignedTeacher ? assignedTeacher.lastName : ''}`}
                                className="max-h-8 max-w-full object-contain"
                              />
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                                <Check className="w-3 h-3 text-emerald-600" /> Visa Prof
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSigningStudentId(stu.id);
                                  setIsSignModalOpen(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 underline ml-1"
                                title="Changer la signature de l'enseignant pour cet élève"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => handleClearSignature(stu.id)}
                                className="text-red-500 hover:text-red-700 ml-0.5"
                                title="Retirer la signature"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              {teacherProfileSignature ? (
                                <button
                                  type="button"
                                  disabled={
                                    (isTermLocked && currentUser.role !== 'DIRECTEUR') ||
                                    val.isAbsent ||
                                    val.score === ''
                                  }
                                  onClick={() => handleSignStudentWithProfile(stu.id)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                                  title={`Appliquer la signature officielle de ${assignedTeacher ? `Prof. ${assignedTeacher.lastName}` : "l'enseignant"}`}
                                >
                                  <Pen className="w-3 h-3 text-indigo-600" />
                                  Signer
                                </button>
                              ) : null}

                              <button
                                type="button"
                                disabled={
                                  (isTermLocked && currentUser.role !== 'DIRECTEUR') ||
                                  val.isAbsent ||
                                  val.score === ''
                                }
                                onClick={() => {
                                  setActiveSigningStudentId(stu.id);
                                  setIsSignModalOpen(true);
                                }}
                                className="px-2 py-1 text-slate-600 hover:text-indigo-700 border border-slate-300 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Dessiner ou importer la signature manuscrite du professeur"
                              >
                                <FilePenLine className="w-3 h-3" />
                                {teacherProfileSignature ? 'Tracer' : 'Signer note'}
                              </button>
                            </div>
                            {val.score !== '' && !val.isAbsent && (
                              <span className="text-[10px] text-amber-600 font-medium">Non signée</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Observation */}
                      <td className="p-3">
                        <input
                          type="text"
                          disabled={isTermLocked && currentUser.role !== 'DIRECTEUR'}
                          value={val.observation}
                          onChange={(e) => handleObservationChange(stu.id, e.target.value)}
                          placeholder="Observation pédagogique de l'enseignant..."
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden bg-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signature Modal for a single student (Teacher Signature) */}
      <SignatureModal
        isOpen={isSignModalOpen}
        onClose={() => {
          setIsSignModalOpen(false);
          setActiveSigningStudentId(null);
        }}
        onSave={handleSaveStudentSignature}
        title="Signature du Professeur pour la note de l'élève"
        subtitle={
          activeSigningStudentId
            ? `Signature de ${assignedTeacher ? `Prof. ${assignedTeacher.firstName} ${assignedTeacher.lastName}` : "l'enseignant"} pour la note de ${
                students.find((s) => s.id === activeSigningStudentId)?.lastName
              } ${students.find((s) => s.id === activeSigningStudentId)?.firstName} en ${
                selectedSubject?.name
              }`
            : "Signature de l'enseignant"
        }
        initialSignature={
          activeSigningStudentId
            ? scores[activeSigningStudentId]?.signatureUrl || teacherProfileSignature
            : teacherProfileSignature
        }
      />

      {/* Batch Signature Modal for Teacher */}
      <SignatureModal
        isOpen={isBatchSignModalOpen}
        onClose={() => setIsBatchSignModalOpen(false)}
        onSave={(sig) => handleBatchSign(sig)}
        title="Signature du Professeur pour la matière"
        subtitle={`Apposez la signature de ${assignedTeacher ? `Prof. ${assignedTeacher.firstName} ${assignedTeacher.lastName}` : "l'enseignant"} sur toutes les notes de ${selectedSubject?.name} en ${selectedClass?.name}.`}
        initialSignature={teacherProfileSignature}
      />

      {/* Teacher Profile Signature Modal */}
      <SignatureModal
        isOpen={isTeacherProfileSignModalOpen}
        onClose={() => setIsTeacherProfileSignModalOpen(false)}
        onSave={handleSaveTeacherProfileSignature}
        title="Sonia Ofisialin'ny Mpampianatra (Signature Officielle)"
        subtitle={`Sonia ofisialy ampiasain'i ${assignedTeacher ? `Prof. ${assignedTeacher.firstName} ${assignedTeacher.lastName}` : 'Mpampianatra'}. Ampidiro amin'ny sary na soraty mivantana eto.`}
        initialSignature={teacherProfileSignature}
      />

      {/* Quick Coefficient Modifier Modal (Director) */}
      {isQuickCoeffModalOpen && selectedSubject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Hanova Coefficient
            </h3>
            <p className="text-xs text-slate-600">
              Fanovana ny coefficient ho an'ny taranja <strong>{selectedSubject.name}</strong> ao amin'ny kilasy <strong>{selectedClass?.name}</strong> :
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => setTempCoeffValue((prev) => Math.max(1, prev - 1))}
                  className="w-9 h-9 flex items-center justify-center text-lg font-black bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tempCoeffValue}
                  onChange={(e) => setTempCoeffValue(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 text-center text-xl font-black text-indigo-900 border-2 border-indigo-500 rounded-xl focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setTempCoeffValue((prev) => Math.min(20, prev + 1))}
                  className="w-9 h-9 flex items-center justify-center text-lg font-black bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  +
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5, 6].map((cf) => (
                  <button
                    key={cf}
                    type="button"
                    onClick={() => setTempCoeffValue(cf)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      tempCoeffValue === cf
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Coeff {cf}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsQuickCoeffModalOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Aoka ihany (Annuler)
              </button>
              <button
                type="button"
                onClick={() => handleQuickSaveCoefficient(tempCoeffValue)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Tahirizo (Enregistrer)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Average Modal */}
      {showAverageModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" />
              Statistiques de la Matière
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Matière :</span>
                <span className="font-bold text-slate-900">{selectedSubject?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Enseignant :</span>
                <span className="font-bold text-indigo-900">
                  {assignedTeacher ? `Prof. ${assignedTeacher.firstName} ${assignedTeacher.lastName}` : 'Non assigné'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Classe :</span>
                <span className="font-bold text-slate-900">{selectedClass?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Élèves notés :</span>
                <span className="font-bold text-slate-900">
                  {validScores.length} / {students.length}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Notes signées par le prof :</span>
                <span className="font-bold text-emerald-700">
                  {signedCount} / {validScores.length}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Moyenne de la classe :</span>
                <span className="font-extrabold text-indigo-700 text-sm">
                  {subjectAverage} / {db.settings.maxGrade}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Total des points cumulés :</span>
                <span className="font-bold text-slate-900">{totalPoints} pts</span>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAverageModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-700" />
                Historique des modifications — {selectedSubject?.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {auditLogsForSubject.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Aucune modification antérieure enregistrée pour cette matière.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
                {auditLogsForSubject.map((aud) => (
                  <div key={aud.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800">{aud.studentName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(aud.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      Ancienne note :{' '}
                      <span className="font-mono line-through text-red-600">
                        {aud.oldScore !== null ? aud.oldScore : 'N/A'}
                      </span>{' '}
                      → Nouvelle note :{' '}
                      <span className="font-mono font-bold text-emerald-700">
                        {aud.newScore !== null ? aud.newScore : 'N/A'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Modifié par : <strong>{aud.modifiedBy}</strong> ({aud.userRole}) · {aud.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
