import React from 'react';
import { Student, ClassRoom, SchoolDatabase } from '../types';
import { dbService } from '../services/dbService';
import { formatRank, formatDateFr } from '../utils/formatters';
import {
  User,
  Calendar,
  Phone,
  MapPin,
  GraduationCap,
  Clock,
  Award,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classes: ClassRoom[];
  db: SchoolDatabase;
  onOpenBulletin: (student: Student, termId: string) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  classes,
  db,
  onOpenBulletin,
}) => {
  if (!isOpen || !student) return null;

  const currentClass = classes.find((c) => c.id === student.classId);
  const terms = db.settings.availableTerms;

  // Compute attendance stats
  const attendances = db.studentAttendances.filter((a) => a.studentId === student.id);
  const presentsCount = attendances.filter((a) => a.status === 'present').length;
  const latesCount = attendances.filter((a) => a.status === 'late').length;
  const absentsCount = attendances.filter((a) => a.status === 'absent').length;
  const justifiedAbsents = attendances.filter((a) => a.status === 'absent' && a.isJustified).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600/30 border-2 border-indigo-400/40 text-indigo-300 flex items-center justify-center text-3xl font-black uppercase shadow-inner">
              {student.lastName.charAt(0)}
              {student.firstName.charAt(0)}
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {student.matricule}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    student.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {student.status === 'active' ? 'Élève Actif' : 'Dossier Archivé'}
                </span>
              </div>

              <h2 className="text-2xl font-black text-white mt-1">
                {student.lastName} {student.firstName}
              </h2>
              <p className="text-slate-300 text-xs mt-0.5">
                Classe de {currentClass ? currentClass.name : 'Non assignée'} ({currentClass?.level}) · Année {student.academicYear}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Quick Academic Summary Grid by Term */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-600" />
              Résultats Scolaires par Trimestre
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {terms.map((term) => {
                const report = dbService.calculateStudentReport(
                  student.id,
                  student.classId,
                  term.id,
                  db.settings.activeAcademicYear,
                  db
                );
                const isVal = db.reportCardValidations.some(
                  (v) =>
                    v.studentId === student.id &&
                    v.termId === term.id &&
                    v.academicYear === db.settings.activeAcademicYear &&
                    v.isValidated
                );

                return (
                  <div
                    key={term.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800">{term.name}</span>
                        {isVal ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Validé
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                            En cours
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-indigo-900">
                          {report.generalAverage !== null
                            ? `${report.generalAverage.toFixed(2)}`
                            : '--'}
                        </span>
                        <span className="text-xs text-slate-500">/ 20</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Rang : <strong className="text-slate-900">{formatRank(report.rank)}</strong> ({report.classSize} élèves)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenBulletin(student, term.id);
                      }}
                      className="mt-3 w-full py-1.5 px-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Voir le Bulletin
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personal and Guardian Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <User className="w-4 h-4 text-indigo-600" />
                État Civil & Coordonnées
              </h4>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date de naissance :</span>
                <span className="font-medium text-slate-800">{formatDateFr(student.birthDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Sexe :</span>
                <span className="font-medium text-slate-800">
                  {student.gender === 'F' ? 'Féminin' : 'Masculin'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date d'admission :</span>
                <span className="font-medium text-slate-800">{formatDateFr(student.admissionDate)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Adresse :</span>
                <span className="font-medium text-slate-800 text-right">{student.address}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <Phone className="w-4 h-4 text-indigo-600" />
                Parents & Tuteurs
              </h4>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Père / Tuteur :</span>
                <span className="font-medium text-slate-800">{student.fatherName || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Mère / Tutrice :</span>
                <span className="font-medium text-slate-800">{student.motherName || '-'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Téléphone de contact :</span>
                <span className="font-bold text-indigo-700">{student.guardianPhone || '-'}</span>
              </div>
            </div>
          </div>

          {/* Attendance Overview */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <h4 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-3 text-xs">
              <Clock className="w-4 h-4 text-indigo-600" />
              Assiduité & Présences Scolaires
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="block text-lg font-black text-emerald-700">{presentsCount}</span>
                <span className="text-[10px] font-semibold text-emerald-800 uppercase">Présences</span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <span className="block text-lg font-black text-amber-700">{latesCount}</span>
                <span className="text-[10px] font-semibold text-amber-800 uppercase">Retards</span>
              </div>
              <div className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                <span className="block text-lg font-black text-red-700">{absentsCount}</span>
                <span className="text-[10px] font-semibold text-red-800 uppercase">Absences</span>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                <span className="block text-lg font-black text-blue-700">{justifiedAbsents}</span>
                <span className="text-[10px] font-semibold text-blue-800 uppercase">Justifiées</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-100 transition-colors"
          >
            Fermer le dossier
          </button>
        </div>
      </div>
    </div>
  );
};
