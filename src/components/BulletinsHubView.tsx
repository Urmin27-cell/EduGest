import React, { useState } from 'react';
import { SchoolDatabase, Student, ClassRoom } from '../types';
import { dbService } from '../services/dbService';
import { BulletinDocument } from './BulletinDocument';
import { formatRank } from '../utils/formatters';
import {
  FileText,
  Layers,
  User,
  Calendar,
  CheckCircle2,
  Award,
  Printer,
  Download,
  AlertCircle,
  Eye,
  Sparkles,
} from 'lucide-react';

interface BulletinsHubViewProps {
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT'; teacherId?: string };
  initialStudentId?: string;
  initialTermId?: string;
  onUpdate: () => void;
}

export const BulletinsHubView: React.FC<BulletinsHubViewProps> = ({
  db,
  currentUser,
  initialStudentId,
  initialTermId,
  onUpdate,
}) => {
  const activeClasses = db.classes.filter((c) => !c.isArchived);

  // Find class if student is specified
  const initialStudent = initialStudentId
    ? db.students.find((s) => s.id === initialStudentId)
    : null;

  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialStudent?.classId || activeClasses[0]?.id || ''
  );
  const [selectedTermId, setSelectedTermId] = useState<string>(
    initialTermId || db.settings.availableTerms[0]?.id || 'T1'
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || ''
  );

  const selectedClass = db.classes.find((c) => c.id === selectedClassId);
  const studentsInClass = db.students.filter(
    (s) => s.classId === selectedClassId && s.status === 'active'
  );

  // Default to first student if not set or invalid
  const activeStudent =
    studentsInClass.find((s) => s.id === selectedStudentId) || studentsInClass[0] || null;

  const currentTerm = db.settings.availableTerms.find((t) => t.id === selectedTermId);

  return (
    <div className="space-y-6">
      {/* 3-Step Selection Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Class */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Étape 1 : Choisir la classe
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                const nextStudents = db.students.filter(
                  (s) => s.classId === e.target.value && s.status === 'active'
                );
                if (nextStudents.length > 0) {
                  setSelectedStudentId(nextStudents[0].id);
                } else {
                  setSelectedStudentId('');
                }
              }}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {activeClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.level})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Student */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Étape 2 : Choisir l'élève
            </label>
            <select
              value={activeStudent?.id || ''}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={studentsInClass.length === 0}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            >
              {studentsInClass.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  {stu.lastName} {stu.firstName} ({stu.matricule})
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Term */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Étape 3 : Choisir le trimestre
            </label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {db.settings.availableTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Class Students Fast Switcher Carousel / Badges */}
      {studentsInClass.length > 0 && (
        <div className="bg-slate-100/70 p-2.5 rounded-xl border border-slate-200 overflow-x-auto flex items-center gap-2 print:hidden">
          <span className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap pl-1">
            Élèves de la classe ({studentsInClass.length}) :
          </span>
          <div className="flex items-center gap-1.5">
            {studentsInClass.map((stu) => {
              const isSelected = activeStudent?.id === stu.id;
              const isVal = db.reportCardValidations.some(
                (v) =>
                  v.studentId === stu.id &&
                  v.termId === selectedTermId &&
                  v.academicYear === db.settings.activeAcademicYear &&
                  v.isValidated
              );

              return (
                <button
                  key={stu.id}
                  type="button"
                  onClick={() => setSelectedStudentId(stu.id)}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold whitespace-nowrap border flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate max-w-[120px]">
                    {stu.lastName} {stu.firstName.charAt(0)}.
                  </span>
                  {isVal && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                      }`}
                      title="Validé"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Official Bulletin View */}
      {activeStudent && selectedClass ? (
        <BulletinDocument
          student={activeStudent}
          classRoom={selectedClass}
          termId={selectedTermId}
          db={db}
          currentUser={currentUser}
          onValidationSuccess={onUpdate}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Veuillez sélectionner une classe avec des élèves inscrits pour générer les bulletins.
        </div>
      )}
    </div>
  );
};
