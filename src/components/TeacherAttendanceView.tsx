import React, { useState, useEffect } from 'react';
import { SchoolDatabase, Teacher, TeacherAttendance } from '../types';
import { dbService } from '../services/dbService';
import { CheckCircle2, Clock, XCircle, Save, Calendar, UserCheck } from 'lucide-react';

interface TeacherAttendanceViewProps {
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT' };
  onUpdate: () => void;
}

export const TeacherAttendanceView: React.FC<TeacherAttendanceViewProps> = ({
  db,
  currentUser,
  onUpdate,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const activeTeachers = db.teachers.filter((t) => t.status === 'active');

  const [attendanceState, setAttendanceState] = useState<
    Record<
      string,
      {
        status: 'present' | 'absent' | 'late';
        arrivalTime: string;
        departureTime: string;
        observation: string;
      }
    >
  >({});

  useEffect(() => {
    const existing = db.teacherAttendances.filter((a) => a.date === selectedDate);
    const initial: typeof attendanceState = {};

    activeTeachers.forEach((t) => {
      const rec = existing.find((e) => e.teacherId === t.id);
      if (rec) {
        initial[t.id] = {
          status: rec.status,
          arrivalTime: rec.arrivalTime || '07:30',
          departureTime: rec.departureTime || '16:00',
          observation: rec.observation || '',
        };
      } else {
        initial[t.id] = {
          status: 'present',
          arrivalTime: '07:30',
          departureTime: '16:00',
          observation: '',
        };
      }
    });

    setAttendanceState(initial);
  }, [selectedDate, db.teacherAttendances]);

  const setStatus = (teacherId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceState((prev) => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        status,
      },
    }));
  };

  const updateField = (
    teacherId: string,
    field: 'arrivalTime' | 'departureTime' | 'observation',
    value: string
  ) => {
    setAttendanceState((prev) => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    for (const t of activeTeachers) {
      const state = attendanceState[t.id] || {
        status: 'present' as const,
        arrivalTime: '07:30',
        departureTime: '16:00',
        observation: '',
      };

      await dbService.recordTeacherAttendance(
        {
          date: selectedDate,
          teacherId: t.id,
          arrivalTime: state.arrivalTime,
          departureTime: state.departureTime,
          status: state.status,
          observation: state.observation,
          recordedBy: currentUser.name,
        },
        currentUser.name
      );
    }

    setSaveStatus('Présences du corps enseignant enregistrées avec succès.');
    setTimeout(() => setSaveStatus(null), 3000);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase">
            Date de pointage :
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Save className="w-4 h-4" />
          Enregistrer le registre des enseignants
        </button>
      </div>

      {saveStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveStatus}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Pointage Quotidien des Enseignants ({activeTeachers.length} professeurs)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Enregistré par : <strong>{currentUser.name}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-3">Matricule</th>
                <th className="p-3">Nom & Prénom</th>
                <th className="p-3 text-center w-60">Statut</th>
                <th className="p-3 w-28 text-center">Arrivée</th>
                <th className="p-3 w-28 text-center">Départ</th>
                <th className="p-3">Observation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTeachers.map((t) => {
                const state = attendanceState[t.id] || {
                  status: 'present',
                  arrivalTime: '07:30',
                  departureTime: '16:00',
                  observation: '',
                };

                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      state.status === 'absent'
                        ? 'bg-red-50/40'
                        : state.status === 'late'
                        ? 'bg-amber-50/40'
                        : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-medium text-slate-500">{t.matricule}</td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900">{t.lastName}</span>{' '}
                      <span className="text-slate-700">{t.firstName}</span>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setStatus(t.id, 'present')}
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
                          onClick={() => setStatus(t.id, 'late')}
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
                          onClick={() => setStatus(t.id, 'absent')}
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

                    <td className="p-3 text-center">
                      <input
                        type="time"
                        value={state.arrivalTime}
                        onChange={(e) => updateField(t.id, 'arrivalTime', e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white font-mono"
                      />
                    </td>

                    <td className="p-3 text-center">
                      <input
                        type="time"
                        value={state.departureTime}
                        onChange={(e) => updateField(t.id, 'departureTime', e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-white font-mono"
                      />
                    </td>

                    <td className="p-3">
                      <input
                        type="text"
                        value={state.observation}
                        onChange={(e) => updateField(t.id, 'observation', e.target.value)}
                        placeholder="Raison du retard, cours rattrapé..."
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
