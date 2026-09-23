import React, { useState } from 'react';
import {
  Student,
  ClassRoom,
  SchoolSettings,
  SchoolDatabase,
  ReportCardValidation,
  Teacher,
} from '../types';
import { dbService } from '../services/dbService';
import { formatRank } from '../utils/formatters';
import { exportBulletinToPDF } from '../utils/pdfExport';
import { SignatureModal } from './SignatureModal';
import {
  Printer,
  Download,
  CheckCircle,
  FilePenLine,
  Stamp,
  Award,
  AlertCircle,
  Sparkles,
  Pen,
  PenTool,
} from 'lucide-react';

interface BulletinDocumentProps {
  student: Student;
  classRoom: ClassRoom;
  termId: string;
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT' };
  onValidationSuccess?: () => void;
}

export const BulletinDocument: React.FC<BulletinDocumentProps> = ({
  student,
  classRoom,
  termId,
  db,
  currentUser,
  onValidationSuccess,
}) => {
  const settings = db.settings;
  const term = settings.availableTerms.find((t) => t.id === termId) || {
    id: termId,
    name: `${termId}`,
    shortName: termId,
  };

  const validationKey = `${student.id}_${termId}_${settings.activeAcademicYear}`;
  const validationRecord = db.reportCardValidations.find((v) => v.id === validationKey);

  // Compute calculated metrics
  const reportData = dbService.calculateStudentReport(
    student.id,
    classRoom.id,
    termId,
    settings.activeAcademicYear,
    db
  );

  const mainTeacher = db.teachers.find((t) => t.id === classRoom.mainTeacherId);

  const [appreciation, setAppreciation] = useState(
    validationRecord?.generalAppreciation ||
      (reportData.generalAverage !== null
        ? reportData.generalAverage >= 16
          ? 'Excellent travail trimestriel. Félicitations du Conseil de Classe.'
          : reportData.generalAverage >= 14
          ? 'Très bon travail. Tableau d\'honneur décerné.'
          : reportData.generalAverage >= 12
          ? 'Bon travail d\'ensemble. Encourageant.'
          : reportData.generalAverage >= 10
          ? 'Résultats convenables. Peut encore progresser.'
          : 'Trimestre insuffisant. Doit fournir des efforts réguliers.'
        : '')
  );

  // Director signature state
  const [directorSignature, setDirectorSignature] = useState<string>(
    validationRecord?.directorSignatureUrl || settings.directorSignatureUrl || ''
  );
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  // Main teacher / Enseignement général signature state (completely editable)
  const [mainTeacherSignature, setMainTeacherSignature] = useState<string>(
    mainTeacher?.signatureUrl || ''
  );
  const [isTeacherSignModalOpen, setIsTeacherSignModalOpen] = useState(false);

  // Subject teacher signature editing state
  const [editingSubjectTeacher, setEditingSubjectTeacher] = useState<{
    subjectId: string;
    subjectName: string;
    teacher: Teacher | null;
    currentSignature?: string;
  } | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const isValidated = Boolean(validationRecord?.isValidated);

  const handleQuickAppreciation = (text: string) => {
    if (isValidated && currentUser.role !== 'DIRECTEUR') return;
    setAppreciation(text);
  };

  // Direct upload for the school stamp (cachet)
  const handleQuickStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const newStamp = uploadEvent.target?.result as string;
        await dbService.updateSettings(
          {
            ...settings,
            schoolStampUrl: newStamp,
          },
          currentUser.name
        );
        setSaveStatus('Cachet officiel mis à jour et appliqué immédiatement sur le bulletin !');
        setTimeout(() => setSaveStatus(null), 3500);
        if (onValidationSuccess) onValidationSuccess();
      };
      reader.readAsDataURL(file);
    }
  };

  // Save main teacher (Professeur Principal / Enseignement Général) signature
  const handleSaveTeacherSignature = async (dataUrl: string) => {
    setMainTeacherSignature(dataUrl);
    if (mainTeacher) {
      await dbService.updateTeacher(
        {
          ...mainTeacher,
          signatureUrl: dataUrl,
        },
        currentUser.name
      );
    }
    setIsTeacherSignModalOpen(false);
    setSaveStatus("Signature du Professeur enregistrée avec succès !");
    setTimeout(() => setSaveStatus(null), 3000);
    if (onValidationSuccess) onValidationSuccess();
  };

  // Save subject teacher signature
  const handleSaveSubjectTeacherSignature = async (dataUrl: string) => {
    if (!editingSubjectTeacher) return;

    // 1. Update teacher profile if teacher assigned
    if (editingSubjectTeacher.teacher) {
      await dbService.updateTeacher(
        {
          ...editingSubjectTeacher.teacher,
          signatureUrl: dataUrl,
        },
        currentUser.name
      );
    }

    // 2. Also update grade record for this student/subject
    const existingGrade = db.grades.find(
      (g) =>
        g.studentId === student.id &&
        g.subjectId === editingSubjectTeacher.subjectId &&
        g.classId === classRoom.id &&
        g.termId === termId &&
        g.academicYear === settings.activeAcademicYear
    );

    if (existingGrade) {
      await dbService.saveBatchGrades(
        classRoom.id,
        editingSubjectTeacher.subjectId,
        termId,
        settings.activeAcademicYear,
        [
          {
            studentId: student.id,
            score: existingGrade.score,
            observation: existingGrade.observation,
            isAbsent: existingGrade.isAbsent,
            signatureUrl: dataUrl,
            signedAt: new Date().toISOString(),
          },
        ],
        currentUser.name,
        currentUser.role
      );
    }

    setEditingSubjectTeacher(null);
    setSaveStatus("Signature du professeur pour cette matière enregistrée avec succès !");
    setTimeout(() => setSaveStatus(null), 3000);
    if (onValidationSuccess) onValidationSuccess();
  };

  const handleValidateAndSign = async () => {
    if (currentUser.role !== 'DIRECTEUR') {
      alert('Seul le Directeur de l\'établissement peut valider et signer officiellement le bulletin.');
      return;
    }

    if (!directorSignature) {
      setIsSignModalOpen(true);
      return;
    }

    const payload: ReportCardValidation = {
      id: validationKey,
      studentId: student.id,
      classId: classRoom.id,
      termId,
      academicYear: settings.activeAcademicYear,
      isValidated: true,
      validatedAt: new Date().toISOString(),
      validatedBy: `${currentUser.name} (Directeur)`,
      directorSignatureUrl: directorSignature,
      generalAppreciation: appreciation,
      rank: reportData.rank ?? undefined,
      classSize: reportData.classSize,
      generalAverage: reportData.generalAverage ?? undefined,
      classAverage: reportData.classGeneralAverage ?? undefined,
      totalPoints: reportData.totalPoints,
      totalCoefficients: reportData.totalCoefficients,
    };

    await dbService.validateReportCard(payload, currentUser.name);
    setSaveStatus('Bulletin officiellement validé et verrouillé !');
    setTimeout(() => setSaveStatus(null), 3500);
    if (onValidationSuccess) onValidationSuccess();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const cleanNom = student.lastName.replace(/\s+/g, '_');
      const cleanPrenom = student.firstName.replace(/\s+/g, '_');
      const cleanClasse = classRoom.name.replace(/\s+/g, '_');
      const fileName = `Bulletin_${cleanNom}_${cleanPrenom}_${cleanClasse}_${termId}.pdf`;
      await exportBulletinToPDF('official-bulletin-print-area', fileName);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Erreur lors de la génération du PDF. Utilisez le bouton Imprimer pour exporter en PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              isValidated ? 'bg-emerald-500' : 'bg-amber-400'
            }`}
          />
          <div>
            <span className="text-sm font-semibold text-slate-800">
              Statut du bulletin :{' '}
              {isValidated ? (
                <span className="text-emerald-700 font-bold">Officiellement Validé & Signé</span>
              ) : (
                <span className="text-amber-700 font-bold">Provisoire (En attente de validation)</span>
              )}
            </span>
            {validationRecord?.validatedAt && (
              <p className="text-xs text-slate-500">
                Signé le {new Date(validationRecord.validatedAt).toLocaleDateString('fr-FR')} par{' '}
                {validationRecord.validatedBy}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'DIRECTEUR' && !isValidated && (
            <button
              onClick={handleValidateAndSign}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Valider & Signer le bulletin
            </button>
          )}

          {currentUser.role === 'DIRECTEUR' && isValidated && (
            <button
              onClick={() => setIsSignModalOpen(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <FilePenLine className="w-4 h-4" />
              Modifier la signature
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Génération PDF...' : 'Télécharger PDF'}
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Official Printable Bulletin Area */}
      <div className="flex justify-center">
        <div
          id="official-bulletin-print-area"
          className="bg-white border-2 border-slate-300 shadow-md rounded-sm w-full max-w-[850px] p-8 text-slate-900 font-sans print:shadow-none print:border-none print:p-4 print:w-full print:max-w-none"
        >
          {/* Official Malagasy Republic Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-center justify-between">
              {/* Left: School Identification */}
              <div className="w-2/5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Établissement Scolaire
                </p>
                <h1 className="text-base font-extrabold text-slate-950 uppercase tracking-tight leading-tight">
                  {settings.schoolName}
                </h1>
                <p className="text-[11px] text-slate-600 mt-1 italic leading-tight">
                  "{settings.motto}"
                </p>
                <p className="text-[10px] text-slate-600 mt-1">{settings.address}</p>
                <p className="text-[10px] text-slate-600">Tél: {settings.phone}</p>
                {settings.email && (
                  <p className="text-[10px] text-slate-600">Email: {settings.email}</p>
                )}
              </div>

              {/* Center: Official Madagascar Seal & Repoblika */}
              <div className="w-1/5 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex items-center justify-center p-1 mb-1 bg-amber-50/50">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Logo École"
                      className="w-full h-full object-contain rounded-full"
                    />
                  ) : (
                    <Stamp className="w-8 h-8 text-slate-700" />
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                  {settings.republicTitle}
                </p>
                <p className="text-[8px] font-semibold text-slate-600 italic">
                  {settings.nationalDevise}
                </p>
              </div>

              {/* Right: Academic Year & Status */}
              <div className="w-2/5 text-right">
                <p className="text-[11px] font-bold text-slate-800 uppercase">
                  Année Scolaire : {settings.activeAcademicYear}
                </p>
                <p className="text-xs font-extrabold text-indigo-900 uppercase tracking-wide mt-1">
                  {term.name}
                </p>
                <div className="mt-2 inline-block px-2 py-0.5 border border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                  {isValidated ? 'DOC. OFFICIEL VALIDÉ' : 'PROVISOIRE'}
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-4 text-center bg-slate-900 text-white py-1.5 px-4 rounded-xs">
              <h2 className="text-lg font-black tracking-widest uppercase">BULLETIN SCOLAIRE</h2>
            </div>
          </div>

          {/* Student Info Box */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-300 rounded-sm mb-4 text-xs">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-28 font-bold text-slate-700 uppercase">Nom de l'élève :</span>
                <span className="font-extrabold text-slate-950 uppercase">{student.lastName}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-slate-700 uppercase">Prénom(s) :</span>
                <span className="font-semibold text-slate-900">{student.firstName}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-slate-700 uppercase">Né(e) le :</span>
                <span>
                  {student.birthDate} ({student.gender === 'F' ? 'Féminin' : 'Masculin'})
                </span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-slate-700 uppercase">Matricule :</span>
                <span className="font-mono font-bold text-indigo-900">{student.matricule}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex">
                <span className="w-32 font-bold text-slate-700 uppercase">Classe :</span>
                <span className="font-extrabold text-slate-950 uppercase">{classRoom.name}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700 uppercase">Niveau :</span>
                <span>{classRoom.level}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700 uppercase">Prof. Principal :</span>
                <span>{mainTeacher ? `${mainTeacher.firstName} ${mainTeacher.lastName}` : 'Non assigné'}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700 uppercase">Effectif classe :</span>
                <span className="font-bold">{reportData.classSize} élèves</span>
              </div>
            </div>
          </div>

          {/* Grades Table */}
          <table className="w-full text-left border-collapse border border-slate-900 text-xs mb-4">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold border-b-2 border-slate-900 text-center">
                <th className="p-2 border-r border-slate-900 text-left w-1/4">MATIÈRE</th>
                <th className="p-2 border-r border-slate-900 w-16">NOTE / 20</th>
                <th className="p-2 border-r border-slate-900 w-14">COEFF.</th>
                <th className="p-2 border-r border-slate-900 w-16">TOTAL</th>
                <th className="p-2 border-r border-slate-900 w-16">MOY. CLASSE</th>
                <th className="p-2 border-r border-slate-900 text-left">OBSERVATION DU PROFESSEUR</th>
                <th className="p-2 text-center w-28">SIGNATURE ENSEIGNANT</th>
              </tr>
            </thead>
            <tbody>
              {reportData.subjectRows.map((row, idx) => (
                <tr
                  key={row.subject.id}
                  className={`border-b border-slate-400 ${
                    idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                  }`}
                >
                  <td className="p-2 border-r border-slate-400 font-semibold text-slate-900">
                    {row.subject.name}
                    {row.teacherName && (
                      <span className="block text-[9px] font-normal text-slate-500">
                        {row.teacherName}
                      </span>
                    )}
                  </td>
                  <td className="p-2 border-r border-slate-400 text-center font-bold">
                    {row.isAbsent ? (
                      <span className="text-red-600 font-bold">ABS</span>
                    ) : row.score !== null ? (
                      <span
                        className={
                          row.score >= 10 ? 'text-slate-900' : 'text-red-700 font-extrabold'
                        }
                      >
                        {row.score.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">Non renseigné</span>
                    )}
                  </td>
                  <td className="p-2 border-r border-slate-400 text-center font-medium">
                    {row.coefficient}
                  </td>
                  <td className="p-2 border-r border-slate-400 text-center font-semibold">
                    {row.totalSubjectPoints !== null ? row.totalSubjectPoints.toFixed(2) : '-'}
                  </td>
                  <td className="p-2 border-r border-slate-400 text-center text-slate-600">
                    {row.classSubjectAverage !== null
                      ? row.classSubjectAverage.toFixed(2)
                      : '-'}
                  </td>
                  <td className="p-2 border-r border-slate-400 text-slate-800 text-[11px] italic">
                    {row.observation || '-'}
                  </td>
                  <td className="p-1.5 text-center align-middle">
                    {row.signatureUrl ? (
                      <div className="flex flex-col items-center justify-center">
                        <img
                          src={row.signatureUrl}
                          alt="Signature Enseignant"
                          className="max-h-7 max-w-[85px] object-contain"
                        />
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[7px] font-mono text-slate-500 font-bold uppercase tracking-tight">
                            Visa Prof.
                          </span>
                          {!isValidated && (
                            <button
                              type="button"
                              onClick={() => {
                                const t =
                                  db.teachers.find(
                                    (tea) =>
                                      tea.status === 'active' &&
                                      tea.assignedClassIds.includes(classRoom.id) &&
                                      tea.assignedSubjectIds.includes(row.subject.id)
                                  ) || mainTeacher || db.teachers[0] || null;
                                setEditingSubjectTeacher({
                                  subjectId: row.subject.id,
                                  subjectName: row.subject.name,
                                  teacher: t,
                                  currentSignature: row.signatureUrl,
                                });
                              }}
                              className="print:hidden text-[8px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                              title="Modifier la signature de cet enseignant"
                            >
                              Modifier
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-slate-300 italic">-</span>
                        {!isValidated && (
                          <button
                            type="button"
                            onClick={() => {
                              const t =
                                db.teachers.find(
                                  (tea) =>
                                    tea.status === 'active' &&
                                    tea.assignedClassIds.includes(classRoom.id) &&
                                    tea.assignedSubjectIds.includes(row.subject.id)
                                ) || mainTeacher || db.teachers[0] || null;
                              setEditingSubjectTeacher({
                                subjectId: row.subject.id,
                                subjectName: row.subject.name,
                                teacher: t,
                                currentSignature: undefined,
                              });
                            }}
                            className="print:hidden text-[9px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                            title="Signer pour cette matière"
                          >
                            + Signer
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Table Footer Summary */}
            <tfoot>
              <tr className="bg-slate-200/90 font-bold border-t-2 border-slate-900 text-center">
                <td className="p-2 border-r border-slate-900 text-left uppercase">
                  TOTAL GÉNÉRAL
                </td>
                <td className="p-2 border-r border-slate-900">-</td>
                <td className="p-2 border-r border-slate-900 font-bold">
                  {reportData.totalCoefficients}
                </td>
                <td className="p-2 border-r border-slate-900 font-extrabold text-indigo-950">
                  {reportData.totalPoints.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-900 text-slate-700">
                  {reportData.classGeneralAverage !== null
                    ? reportData.classGeneralAverage.toFixed(2)
                    : '-'}
                </td>
                <td className="p-2 border-r border-slate-900 text-left text-[11px]">
                  Points totaux ÷ Total coefficients
                </td>
                <td className="p-2 text-center text-[10px] text-slate-500 font-medium">
                  -
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Academic Results Box */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-indigo-50/60 border border-indigo-200 rounded-sm mb-4 text-center">
            <div className="p-2 bg-white rounded border border-indigo-100">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">
                Moyenne de l'élève
              </span>
              <span className="text-xl font-black text-indigo-900">
                {reportData.generalAverage !== null
                  ? `${reportData.generalAverage.toFixed(2)} / 20`
                  : 'N/A'}
              </span>
            </div>

            <div className="p-2 bg-white rounded border border-indigo-100">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">
                Rang dans la classe
              </span>
              <span className="text-xl font-black text-slate-900">
                {formatRank(reportData.rank)}
                <span className="text-xs font-normal text-slate-500 ml-1">
                  / {reportData.classSize}
                </span>
              </span>
            </div>

            <div className="p-2 bg-white rounded border border-indigo-100">
              <span className="block text-[10px] font-bold text-slate-500 uppercase">
                Moyenne générale de la classe
              </span>
              <span className="text-xl font-black text-slate-700">
                {reportData.classGeneralAverage !== null
                  ? `${reportData.classGeneralAverage.toFixed(2)} / 20`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* General Appreciation Area */}
          <div className="border border-slate-400 p-3 rounded-sm mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                Appréciation Générale & Décision du Conseil de Classe :
              </h4>
              {!isValidated && (
                <div className="flex gap-1 print:hidden">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAppreciation(
                        'Félicitations du Conseil de Classe. Excellent trimestre.'
                      )
                    }
                    className="text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-100 text-slate-700 rounded transition-colors"
                  >
                    Félicitations
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAppreciation(
                        'Tableau d\'honneur. Très bon trimestre, poursuivez ainsi.'
                      )
                    }
                    className="text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-100 text-slate-700 rounded transition-colors"
                  >
                    Tableau d'Honneur
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAppreciation(
                        'Encouragements. Travail sérieux et résultats en progrès.'
                      )
                    }
                    className="text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-100 text-slate-700 rounded transition-colors"
                  >
                    Encouragements
                  </button>
                </div>
              )}
            </div>

            {isValidated ? (
              <p className="text-xs italic font-medium text-slate-900 bg-slate-50 p-2 rounded border border-slate-200 min-h-[44px]">
                "{appreciation || 'Aucune appréciation enregistrée.'}"
              </p>
            ) : (
              <textarea
                value={appreciation}
                onChange={(e) => setAppreciation(e.target.value)}
                placeholder="Rédigez l'appréciation globale du Directeur ou du Conseil de Classe..."
                rows={2}
                className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
              />
            )}
          </div>

          {/* Official Signatures & Stamp Block */}
          <div className="grid grid-cols-2 gap-8 pt-3 border-t-2 border-slate-900 text-xs">
            {/* Teacher Signature (Professeur Principal / Enseignement Général) */}
            <div className="flex flex-col justify-between h-36 border-r border-slate-300 pr-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-800">
                    Le Professeur Principal
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {mainTeacher ? `${mainTeacher.firstName} ${mainTeacher.lastName}` : 'Visa enseignant titulaire'}
                  </p>
                </div>
                {!isValidated && (
                  <button
                    type="button"
                    onClick={() => setIsTeacherSignModalOpen(true)}
                    className="print:hidden text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Modifier la signature du professeur principal"
                  >
                    <FilePenLine className="w-3 h-3" />
                    {mainTeacherSignature ? 'Modifier signature' : '+ Signer'}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center h-20">
                {mainTeacherSignature ? (
                  <img
                    src={mainTeacherSignature}
                    alt="Signature Enseignant"
                    className="max-h-16 object-contain"
                  />
                ) : (
                  <div className="text-[10px] text-slate-400 italic border-b border-dashed border-slate-300 w-36 text-center pb-1">
                    Signature du Professeur
                  </div>
                )}
              </div>

              <p className="text-[9px] text-slate-500">Date : ______________</p>
            </div>

            {/* Director Signature & Stamp */}
            <div className="flex flex-col justify-between h-36 pl-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-900">
                    {settings.directorTitle}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-800">{settings.directorName}</p>
                </div>
                {currentUser.role === 'DIRECTEUR' && !isValidated && (
                  <button
                    type="button"
                    onClick={() => setIsSignModalOpen(true)}
                    className="print:hidden text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Modifier la signature du directeur"
                  >
                    <FilePenLine className="w-3 h-3" />
                    {directorSignature ? 'Modifier signature' : '+ Signer'}
                  </button>
                )}
              </div>

              {/* Signature Graphic & Official Stamp */}
              <div className="flex items-center justify-between h-20 px-2 gap-3">
                <div className="flex items-center justify-center flex-1">
                  {directorSignature ? (
                    <img
                      src={directorSignature}
                      alt="Signature Directeur"
                      className="max-h-16 object-contain"
                    />
                  ) : (
                    <div className="text-[10px] text-slate-400 italic border-b border-dashed border-slate-300 w-36 text-center pb-1">
                      Signature du Directeur
                    </div>
                  )}
                </div>

                {/* Stamp / Cachet */}
                <div className="relative group shrink-0 flex items-center justify-center">
                  {settings.schoolStampUrl ? (
                    <img
                      src={settings.schoolStampUrl}
                      alt="Cachet Officiel"
                      className="w-20 h-20 object-contain rotate-[-6deg] shrink-0 drop-shadow-xs"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-red-700/80 text-red-700 flex flex-col items-center justify-center p-1 rotate-[-12deg] shrink-0 opacity-80">
                      <span className="text-[7px] font-black uppercase text-center leading-none">
                        CACHET OFFICIEL
                      </span>
                      <Stamp className="w-4 h-4 my-0.5" />
                      <span className="text-[6px] font-bold text-center leading-none truncate max-w-[50px]">
                        {settings.schoolName.substring(0, 15)}
                      </span>
                    </div>
                  )}

                  {currentUser.role === 'DIRECTEUR' && (
                    <label
                      className="print:hidden absolute -bottom-1 -right-1 bg-white hover:bg-indigo-50 text-indigo-700 p-1.5 rounded-full shadow-md border border-slate-300 cursor-pointer transition-all hover:scale-110"
                      title="Changer le cachet officiel (PNG/JPG)"
                    >
                      <Stamp className="w-3.5 h-3.5 text-indigo-600" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQuickStampUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <p className="text-[9px] text-slate-600">
                Fait à Antananarivo, le{' '}
                {validationRecord?.validatedAt
                  ? new Date(validationRecord.validatedAt).toLocaleDateString('fr-FR')
                  : new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Director Signature Modal */}
      <SignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onSave={(dataUrl) => {
          setDirectorSignature(dataUrl);
          setIsSignModalOpen(false);
        }}
        title="Signature du Directeur"
        subtitle="Apposez votre signature officielle pour valider ce bulletin"
        initialSignature={directorSignature}
      />

      {/* Main Teacher / Enseignement Général Signature Modal */}
      <SignatureModal
        isOpen={isTeacherSignModalOpen}
        onClose={() => setIsTeacherSignModalOpen(false)}
        onSave={handleSaveTeacherSignature}
        title="Signature du Professeur Principal"
        subtitle="Cette signature numérique sera apposée sur le visa du professeur principal"
        initialSignature={mainTeacherSignature}
      />

      {/* Subject Teacher Signature Modal */}
      {editingSubjectTeacher && (
        <SignatureModal
          isOpen={Boolean(editingSubjectTeacher)}
          onClose={() => setEditingSubjectTeacher(null)}
          onSave={handleSaveSubjectTeacherSignature}
          title={`Signature de la matière : ${editingSubjectTeacher.subjectName}`}
          subtitle={`Enseignant : ${editingSubjectTeacher.teacher ? `${editingSubjectTeacher.teacher.firstName} ${editingSubjectTeacher.teacher.lastName}` : 'Professeur de matière'}`}
          initialSignature={editingSubjectTeacher.currentSignature}
        />
      )}
    </div>
  );
};
