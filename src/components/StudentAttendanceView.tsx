import React, { useState, useEffect } from 'react';
import { SchoolDatabase, ClassRoom, Student } from '../types';
import { dbService } from '../services/dbService';
import {
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Save,
  CheckCheck,
  Filter,
  Users,
} from 'lucide-react';

interface StudentAttendanceViewProps {
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT' };
  onUpdate: () => void;
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({
  db,
  currentUser,
  onUpdate,
}) => {
  const activeClasses = db.classes.filter((c) => !c.isArchived);
  const [selectedClassId, setSelectedClassId] = useState<string>(activeClasses[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTermId, setSelectedTermId] = useState<string>(
    db.settings.availableTerms[0]?.id || 'T1'
  );
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: 'present' | 'absent' | 'late'; isJustified: boolean; observation: string }>
  >({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const students = db.students.filter(
    (s) => s.classId === selectedClassId && s.status === 'active'
  );

  // Load existing attendances for the date and class
  useEffect(() => {
    const existing = db.studentAttendances.filter(
      (a) => a.classId === selectedClassId && a.date === selectedDate
    );

    const initial: Record<
      string,
      { status: 'present' | 'absent' | 'late'; isJustified: boolean; observation: string }
    > = {};

    students.forEach((stu) => {
      const rec = existing.find((e) => e.studentId === stu.id);
      if (rec) {
        initial[stu.id] = {
          status: rec.status,
          isJustified: rec.isJustified,
          observation: rec.observation || '',
        };
      } else {
        // default to present
        initial[stu.id] = {
          status: 'present',
          isJustified: true,
          observation: '',
        };
      }
    });

    setAttendanceState(initial);
  }, [selectedClassId, selectedDate, db.studentAttendances]);

  const setStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        isJustified: status === 'present' ? true : prev[studentId]?.isJustified ?? false,
      },
    }));
  };

  const setJustified = (studentId: string, isJustified: boolean) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isJustified,
      },
    }));
  };

  const setObservation = (studentId: string, observation: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        observation,
      },
    }));
  };

  const markAllPresent = () => {
    const updated: typeof attendanceState = {};
    students.forEach((stu) => {
      updated[stu.id] = {
        status: 'present',
        isJustified: true,
        observation: attendanceState[stu.id]?.observation || '',
      };
    });
    setAttendanceState(updated);
  };

  const handleSave = async () => {
    const currentTime = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const entries = students.map((stu) => {
      const state = attendanceState[stu.id] || {
        status: 'present' as const,
        isJustified: true,
        observation: '',
      };
      return {
        date: selectedDate,
        time: currentTime,
        classId: selectedClassId,
        studentId: stu.id,
        termId: selectedTermId,
        academicYear: db.settings.activeAcademicYear,
        status: state.status,
        isJustified: state.isJustified,
        observation: state.observation,
        recordedBy: currentUser.name,
      };
    });

    await dbService.recordStudentAttendances(entries, currentUser.name);
    setSaveStatus('Appel de présence enregistré avec succès.');
    setTimeout(() => setSaveStatus(null), 3000);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Filter / Selector Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Classe
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {activeClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Date du jour
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Trimestre
              </label>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {db.settings.availableTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllPresent}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              Tous présents
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              Enregistrer l'appel
            </button>
          </div>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Attendance Roll-Call Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Feuille d'Appel des Élèves ({students.length} inscrits)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Date : <strong>{selectedDate}</strong>
          </span>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Aucun élève inscrit dans cette classe pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-3 w-10 text-center">N°</th>
                  <th className="p-3">Matricule</th>
                  <th className="p-3">Nom & Prénom(s)</th>
                  <th className="p-3 text-center w-64">Statut d'assiduité</th>
                  <th className="p-3 text-center w-28">Motif Justifié ?</th>
                  <th className="p-3">Observation / Remarque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((stu, idx) => {
                  const state = attendanceState[stu.id] || {
                    status: 'present',
                    isJustified: true,
                    observation: '',
                  };

                  return (
                    <tr
                      key={stu.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        state.status === 'absent'
                          ? 'bg-red-50/40'
                          : state.status === 'late'
                          ? 'bg-amber-50/40'
                          : ''
                      }`}
                    >
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-medium text-slate-600">{stu.matricule}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900">{stu.lastName}</span>{' '}
                        <span className="text-slate-700">{stu.firstName}</span>
                      </td>

                      {/* Presence Action Buttons */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setStatus(stu.id, 'present')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all ${
                              state.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Présent
                          </button>

                          <button
                            type="button"
                            onClick={() => setStatus(stu.id, 'late')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all ${
                              state.status === 'late'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Retard
                          </button>

                          <button
                            type="button"
                            onClick={() => setStatus(stu.id, 'absent')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all ${
                              state.status === 'absent'
                                ? 'bg-red-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Absent
                          </button>
                        </div>
                      </td>

                      {/* Justified Checkbox */}
                      <td className="p-3 text-center">
                        {state.status !== 'present' && (
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.isJustified}
                              onChange={(e) => setJustified(stu.id, e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-slate-600">
                              {state.isJustified ? 'Oui' : 'Non'}
                            </span>
                          </label>
                        )}
                      </td>

                      {/* Observation */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={state.observation}
                          onChange={(e) => setObservation(stu.id, e.target.value)}
                          placeholder="Motif d'absence, retard..."
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
    </div>
  );
};
