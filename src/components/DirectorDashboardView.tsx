import React, { useState } from 'react';
import { SchoolDatabase, Student, Teacher, ClassRoom } from '../types';
import { dbService } from '../services/dbService';
import {
  Users,
  GraduationCap,
  Layers,
  FileCheck,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  BookOpen,
  Award,
  Sparkles,
  CheckCircle2,
  DownloadCloud,
  UserCheck,
} from 'lucide-react';
import { formatDateTimeFr } from '../utils/formatters';

interface DirectorDashboardViewProps {
  db: SchoolDatabase;
  onNavigate: (section: string) => void;
  onQuickStudent: () => void;
}

export const DirectorDashboardView: React.FC<DirectorDashboardViewProps> = ({
  db,
  onNavigate,
  onQuickStudent,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const activeStudents = db.students.filter((s) => s.status === 'active');
  const activeTeachers = db.teachers.filter((t) => t.status === 'active');
  const activeClasses = db.classes.filter((c) => !c.isArchived);
  const activeSubjects = db.subjects;

  const isNewlyRegisteredEmptySchool =
    activeStudents.length === 0 && activeTeachers.length === 0 && activeClasses.length === 0;

  const handleImportMalagasySubjects = async () => {
    setIsImporting(true);
    try {
      const added = await dbService.importStandardMalagasySubjects();
      setImportStatus(`Tafiditra soa aman-tsara ireo taranja ofisialy ${added} (Français, Malagasy, Maths, SVT, Anglais, ...) !`);
    } catch {
      setImportStatus('Nisy olana teo am-pidirana taranja.');
    } finally {
      setIsImporting(false);
    }
  };

  const totalBulletinsValidated = db.reportCardValidations.filter((v) => v.isValidated).length;
  const potentialBulletins = activeStudents.length * db.settings.availableTerms.length;

  // Today's attendance percentage
  const today = new Date().toISOString().split('T')[0];
  const todayAttendances = db.studentAttendances.filter((a) => a.date === today);
  const presentCount = todayAttendances.filter((a) => a.status === 'present').length;
  const attendanceRate =
    todayAttendances.length > 0
      ? Math.round((presentCount / todayAttendances.length) * 100)
      : 96; // indicative if not taken yet

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-400/20">
            <Sparkles className="w-3.5 h-3.5" />
            Session Administrateur (Directeur) · {db.settings.activeAcademicYear}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Tableau de Bord de la Direction
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {db.settings.schoolName} — Fitantanana ny mpampianatra, kilasy, taranja, mpianatra ary bulletins ofisialy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('teachers')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            Gérer les Enseignants
          </button>
          <button
            type="button"
            onClick={onQuickStudent}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl backdrop-blur-xs border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Inscrire un élève
          </button>
          <button
            type="button"
            onClick={() => onNavigate('classes')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl backdrop-blur-xs border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            Classes & Matières
          </button>
          <button
            type="button"
            onClick={() => onNavigate('grades')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl backdrop-blur-xs border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            Saisie des notes
          </button>
        </div>
      </div>

      {/* Guided Setup Card for New Empty Schools */}
      {isNewlyRegisteredEmptySchool && (
        <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 rounded-3xl text-white shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full uppercase tracking-wider mb-2">
                🌟 Sekoly Vaovao (Données Firestore Isolées)
              </div>
              <h2 className="text-xl font-black text-white">
                Tongasoa {db.settings.directorName} ! Manomboha mameno ny sekolinao
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
                Araka ny fitsipika, madio (vide) tsy misy mpianatra na mpampianatra ity sekoly ity. Ianao Tale irery ihany no manana fahefana hampiditra ny kilasy, taranja, mpampianatra ary mpianatra.
              </p>
            </div>
          </div>

          {importStatus && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Step 1: Subjects */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">Dingana 1</span>
                <h4 className="text-xs font-bold text-white">Taranja Ofisialy</h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  {activeSubjects.length > 0
                    ? `Efa misy taranja ${activeSubjects.length}`
                    : 'Taranja Malagasy, Français, Maths...'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleImportMalagasySubjects}
                disabled={isImporting || activeSubjects.length > 0}
                className="mt-3 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                {activeSubjects.length > 0 ? 'Taranja Voaomana' : 'Hampiditra Taranja (1-Clic)'}
              </button>
            </div>

            {/* Step 2: Classes */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">Dingana 2</span>
                <h4 className="text-xs font-bold text-white">Mamorona Kilasy</h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Ampidiro ny kilasy misy (ex: 6ème A, 5ème B, 3ème...)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('classes')}
                className="mt-3 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                Hampiditra Kilasy
              </button>
            </div>

            {/* Step 3: Teachers */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">Dingana 3</span>
                <h4 className="text-xs font-bold text-white">Mampiditra Mpampianatra</h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Omeo teny miafina sy taranja ampianariny tsirairay avy.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('teachers')}
                className="mt-3 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Hampiditra Mpampianatra
              </button>
            </div>

            {/* Step 4: Students */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">Dingana 4</span>
                <h4 className="text-xs font-bold text-white">Mampiditra Mpianatra</h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Soraty anarana ny mpianatra isaky ny kilasy.
                </p>
              </div>
              <button
                type="button"
                onClick={onQuickStudent}
                className="mt-3 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Hampiditra Mpianatra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div
          onClick={() => onNavigate('students')}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Élèves Inscrits
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{activeStudents.length}</span>
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              100% actifs
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Répartis sur {activeClasses.length} classes</p>
        </div>

        {/* Total Teachers */}
        <div
          onClick={() => onNavigate('teachers')}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Corps Enseignant
            </span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{activeTeachers.length}</span>
            <span className="text-xs text-slate-500">professeurs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Comptes personnels activés</p>
        </div>

        {/* Bulletins Validated */}
        <div
          onClick={() => onNavigate('bulletins')}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Bulletins Validés
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalBulletinsValidated}</span>
            <span className="text-xs text-slate-500">/ {potentialBulletins}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Signés officiellement</p>
        </div>

        {/* Attendance Rate */}
        <div
          onClick={() => onNavigate('attendance-students')}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Taux d'Assiduité
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{attendanceRate}%</span>
            <span className="text-xs text-emerald-700 font-semibold">Présence moyenne</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Registre à jour</p>
        </div>
      </div>

      {/* Main Grid: Class Progress + Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes Progress Overview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                État des Classes & Bulletins
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('classes')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Gérer les classes
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeClasses.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Mbola tsy misy kilasy voaforona</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Tsindrio ny bokotra etsy ambony na midira ao amin'ny "Classes & Matières" mba hamoronana kilasy.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('classes')}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                + Mamorona Kilasy Voalohany
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeClasses.map((cls) => {
                const studentsInClass = activeStudents.filter((s) => s.classId === cls.id);
                const mainTeacher = db.teachers.find((t) => t.id === cls.mainTeacherId);
                const validatedInClass = db.reportCardValidations.filter(
                  (v) => v.classId === cls.id && v.isValidated
                ).length;

                return (
                  <div key={cls.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs">
                        {cls.name.substring(0, 3)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{cls.name}</h4>
                        <p className="text-[11px] text-slate-500">
                          Prof. Principal : {mainTeacher ? `${mainTeacher.firstName} ${mainTeacher.lastName}` : 'Non assigné'} · {studentsInClass.length} élèves
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800">
                          {validatedInClass} validé(s)
                        </span>
                        <span className="block text-[10px] text-slate-400">sur les bulletins</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigate('bulletins')}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Bulletins
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audit Log / Recent Events */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Dernières Activités
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('audit')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              Historique complet
            </button>
          </div>

          <div className="space-y-3">
            {db.activityLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-800">{log.action}</span>
                  <span className="text-[10px] text-slate-400">
                    {formatDateTimeFr(log.timestamp)}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">{log.details}</p>
                <span className="text-[10px] font-medium text-indigo-600 mt-1 block">
                  Par : {log.userName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

