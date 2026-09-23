import React, { useState } from 'react';
import { SchoolDatabase } from '../types';
import { dbService } from '../services/dbService';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Layers,
  Clock,
  PieChart,
} from 'lucide-react';
import { formatRank } from '../utils/formatters';

interface StatsViewProps {
  db: SchoolDatabase;
}

export const StatsView: React.FC<StatsViewProps> = ({ db }) => {
  const [selectedTermId, setSelectedTermId] = useState<string>(
    db.settings.availableTerms[0]?.id || 'T1'
  );

  const activeStudents = db.students.filter((s) => s.status === 'active');
  const boysCount = activeStudents.filter((s) => s.gender === 'M').length;
  const girlsCount = activeStudents.filter((s) => s.gender === 'F').length;

  const activeClasses = db.classes.filter((c) => !c.isArchived);

  // Compute class averages and top students
  const classStats = activeClasses.map((cls) => {
    const students = activeStudents.filter((s) => s.classId === cls.id);
    const reports = students.map((stu) =>
      dbService.calculateStudentReport(
        stu.id,
        cls.id,
        selectedTermId,
        db.settings.activeAcademicYear,
        db
      )
    );

    const validAverages = reports
      .map((r) => r.generalAverage)
      .filter((avg): avg is number => avg !== null);

    const classAverage =
      validAverages.length > 0
        ? (validAverages.reduce((sum, v) => sum + v, 0) / validAverages.length).toFixed(2)
        : 'N/A';

    // Best student in class
    let bestStudentName = '-';
    let bestAverage = -1;
    reports.forEach((r, idx) => {
      if (r.generalAverage !== null && r.generalAverage > bestAverage) {
        bestAverage = r.generalAverage;
        bestStudentName = `${students[idx]?.lastName} ${students[idx]?.firstName}`;
      }
    });

    return {
      class: cls,
      studentCount: students.length,
      average: classAverage,
      bestAverage: bestAverage >= 0 ? bestAverage.toFixed(2) : 'N/A',
      bestStudent: bestStudentName,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Statistiques & Performances Pédagogiques
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Indicateurs clés, parité de genre, moyennes de classe et palmarès académique
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase">Trimestre :</span>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
          >
            {db.settings.availableTerms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Demographics & Gender Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Effectif Total des Élèves
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{activeStudents.length}</span>
            <span className="text-xs text-slate-500">élèves inscrits</span>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 p-2 bg-blue-50 border border-blue-100 rounded-lg text-center">
              <span className="block text-base font-bold text-blue-900">{boysCount}</span>
              <span className="text-[10px] uppercase font-semibold text-blue-700">Garçons</span>
            </div>
            <div className="flex-1 p-2 bg-pink-50 border border-pink-100 rounded-lg text-center">
              <span className="block text-base font-bold text-pink-900">{girlsCount}</span>
              <span className="text-[10px] uppercase font-semibold text-pink-700">Filles</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Parité Filles / Garçons
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-900">
              {activeStudents.length > 0
                ? Math.round((girlsCount / activeStudents.length) * 100)
                : 0}
              %
            </span>
            <span className="text-xs text-slate-500">de filles</span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mt-4 flex">
            <div
              style={{
                width: `${activeStudents.length > 0 ? (boysCount / activeStudents.length) * 100 : 50}%`,
              }}
              className="bg-blue-500 h-full"
            />
            <div
              style={{
                width: `${activeStudents.length > 0 ? (girlsCount / activeStudents.length) * 100 : 50}%`,
              }}
              className="bg-pink-500 h-full"
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>Garçons : {activeStudents.length > 0 ? Math.round((boysCount / activeStudents.length) * 100) : 0}%</span>
            <span>Filles : {activeStudents.length > 0 ? Math.round((girlsCount / activeStudents.length) * 100) : 0}%</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Classes Ouvertes
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{activeClasses.length}</span>
            <span className="text-xs text-slate-500">divisions actives</span>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Moyenne de{' '}
            <strong>
              {activeClasses.length > 0
                ? Math.round(activeStudents.length / activeClasses.length)
                : 0}{' '}
              élèves
            </strong>{' '}
            par division.
          </p>
        </div>
      </div>

      {/* Class Comparison Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Moyennes Générales et Palmarès par Classe — {db.settings.availableTerms.find((t) => t.id === selectedTermId)?.name}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-3">Classe</th>
                <th className="p-3">Niveau</th>
                <th className="p-3 text-center">Effectif</th>
                <th className="p-3 text-center">Moyenne Générale Classe</th>
                <th className="p-3 text-center">Meilleure Moyenne</th>
                <th className="p-3">Premier(ère) de la classe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStats.map((st) => (
                <tr key={st.class.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-extrabold text-slate-900">{st.class.name}</td>
                  <td className="p-3 text-slate-600">{st.class.level}</td>
                  <td className="p-3 text-center font-bold">{st.studentCount}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 font-black text-sm">
                      {st.average} / {db.settings.maxGrade}
                    </span>
                  </td>
                  <td className="p-3 text-center font-black text-emerald-700 text-sm">
                    {st.bestAverage} / {db.settings.maxGrade}
                  </td>
                  <td className="p-3 font-semibold text-slate-800 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    {st.bestStudent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
