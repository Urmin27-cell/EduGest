import React from 'react';
import { SchoolDatabase, Teacher } from '../types';
import {
  GraduationCap,
  BookOpen,
  Layers,
  Users,
  PenTool,
  Clock,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface TeacherDashboardViewProps {
  db: SchoolDatabase;
  teacherId: string;
  onNavigate: (section: string) => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  db,
  teacherId,
  onNavigate,
}) => {
  const teacher = db.teachers.find((t) => t.id === teacherId);
  if (!teacher) {
    return <div className="p-8 text-center text-slate-500">Enseignant introuvable.</div>;
  }

  const assignedClasses = db.classes.filter(
    (c) => teacher.assignedClassIds.includes(c.id) && !c.isArchived
  );
  const assignedSubjects = db.subjects.filter(
    (s) => teacher.assignedSubjectIds.includes(s.id) && !s.isArchived
  );

  const assignedStudents = db.students.filter(
    (s) => teacher.assignedClassIds.includes(s.classId) && s.status === 'active'
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-400/20">
            <GraduationCap className="w-3.5 h-3.5" />
            Espace Pédagogique Sécurisé
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Bonjour, Professeur {teacher.firstName} {teacher.lastName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Matricule : <strong>{teacher.matricule}</strong> · Année scolaire :{' '}
            {db.settings.activeAcademicYear}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('grades')}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-102"
        >
          <PenTool className="w-4 h-4" />
          Accéder à la Saisie des Notes
        </button>
      </div>

      {/* Scope Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Mes Classes Attribuées
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{assignedClasses.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {assignedClasses.map((c) => c.name).join(', ') || 'Aucune classe assignée'}
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Mes Matières
            </span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{assignedSubjects.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {assignedSubjects.map((s) => s.name).join(', ') || 'Aucune matière assignée'}
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Élèves à Noter
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{assignedStudents.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Sur l'ensemble de vos classes</p>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Classes list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Vos Classes
          </h3>
          <div className="space-y-3">
            {assignedClasses.map((cls) => {
              const studentsCount = db.students.filter(
                (s) => s.classId === cls.id && s.status === 'active'
              ).length;
              return (
                <div
                  key={cls.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-between transition-colors"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{cls.name}</h4>
                    <span className="text-[11px] text-slate-500">
                      {cls.level} · {studentsCount} élèves
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('grades')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-indigo-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1"
                  >
                    Noter
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subjects list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Vos Matières Enseignées
          </h3>
          <div className="space-y-3">
            {assignedSubjects.map((sub) => (
              <div
                key={sub.id}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-between transition-colors"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{sub.name}</h4>
                  <span className="text-[11px] text-slate-500">
                    Code: {sub.code} · Coeff base: {sub.defaultCoefficient} · {sub.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('grades')}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-indigo-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1"
                >
                  Saisir
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
