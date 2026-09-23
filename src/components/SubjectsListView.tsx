import React, { useState } from 'react';
import { SchoolDatabase, Subject } from '../types';
import { dbService } from '../services/dbService';
import {
  BookOpen,
  PlusCircle,
  Edit,
  Archive,
  Sliders,
  Layers,
  CheckCircle2,
  Table,
  Sparkles,
} from 'lucide-react';
import { SubjectModal } from './SubjectModal';

interface SubjectsListViewProps {
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT' };
  onUpdate: () => void;
}

export const SubjectsListView: React.FC<SubjectsListViewProps> = ({
  db,
  currentUser,
  onUpdate,
}) => {
  const [selectedSubjectForEdit, setSelectedSubjectForEdit] = useState<Subject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'list' | 'matrix'>('list');
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeSubjects = db.subjects.filter((s) => !s.isArchived).sort((a, b) => a.displayOrder - b.displayOrder);
  const activeClasses = db.classes.filter((c) => !c.isArchived);

  const handleSaveSubject = async (data: any) => {
    if (data.id) {
      await dbService.updateSubject(data, currentUser.name);
      showFeedback(`Voaova soa aman-tsara ny taranja ${data.name} (Coefficient : ${data.defaultCoefficient}) !`);
    } else {
      await dbService.createSubject(data, currentUser.name);
      showFeedback(`Voaforona soa aman-tsara ny taranja ${data.name} !`);
    }
    onUpdate();
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleQuickCoeffChange = async (subject: Subject, newCoeff: number) => {
    if (newCoeff < 1 || newCoeff > 20) return;
    await dbService.updateSubjectCoefficient(subject.id, newCoeff, subject.classCoefficients, currentUser.name);
    showFeedback(`Coefficient ho an'ny "${subject.name}" nohavaozina ho ${newCoeff} !`);
    onUpdate();
  };

  const handleMatrixCellCoeffChange = async (subject: Subject, classId: string, coeff: number) => {
    if (coeff < 1 || coeff > 20) return;
    const updatedClassCoeffs = { ...(subject.classCoefficients || {}), [classId]: coeff };
    await dbService.updateSubject(
      {
        ...subject,
        classCoefficients: updatedClassCoeffs,
      },
      currentUser.name
    );
    const clsName = db.classes.find((c) => c.id === classId)?.name || 'Classe';
    showFeedback(`Coefficient "${subject.name}" amin'ny ${clsName} nohavaozina ho ${coeff} !`);
    onUpdate();
  };

  const handleToggleArchive = async (sub: Subject) => {
    await dbService.updateSubject({ ...sub, isArchived: !sub.isArchived }, currentUser.name);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
              <Sliders className="w-3.5 h-3.5" />
              Fanovana Coefficients & Taranja
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Matières & Coefficients ({activeSubjects.length} matières)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Azonao ovaina mivantana eto ny coefficient isaky ny taranja sy isaky ny kilasy. Mihatra avy hatrany amin'ny bulletin rehetra.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Vue Liste
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeViewMode === 'matrix'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Grille par Classe ({activeClasses.length})
            </button>
          </div>

          {currentUser.role === 'DIRECTEUR' && (
            <button
              type="button"
              onClick={() => {
                setSelectedSubjectForEdit(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Ajouter une matière
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* VIEW MODE 1: LIST VIEW WITH DIRECT INLINE COEFFICIENT CHANGER */}
      {activeViewMode === 'list' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-3.5 w-16 text-center">Ordre</th>
                  <th className="p-3.5 w-24">Code</th>
                  <th className="p-3.5">Matière</th>
                  <th className="p-3.5 w-32">Catégorie</th>
                  <th className="p-3.5 w-48 text-center bg-indigo-50/50 text-indigo-950">
                    Coefficient Standard
                  </th>
                  <th className="p-3.5">Coefficients Spécifiques par Classe</th>
                  <th className="p-3.5 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Mbola tsy misy taranja voasoratra.
                    </td>
                  </tr>
                ) : (
                  activeSubjects.map((sub) => {
                    const specificEntries = Object.entries(sub.classCoefficients || {});

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 text-center font-mono font-bold text-slate-400">
                          {sub.displayOrder}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-indigo-900">{sub.code}</td>
                        <td className="p-3.5">
                          <span className="font-black text-slate-900 text-sm block">{sub.name}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {sub.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-center bg-indigo-50/30">
                          {currentUser.role === 'DIRECTEUR' ? (
                            <div className="inline-flex items-center gap-1 bg-white border border-indigo-200 rounded-xl p-1 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleQuickCoeffChange(sub, sub.defaultCoefficient - 1)}
                                disabled={sub.defaultCoefficient <= 1}
                                className="w-6 h-6 flex items-center justify-center font-black text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 cursor-pointer"
                                title="Hampihena (-1)"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={sub.defaultCoefficient}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) handleQuickCoeffChange(sub, val);
                                }}
                                className="w-10 text-center font-black text-indigo-700 text-sm focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuickCoeffChange(sub, sub.defaultCoefficient + 1)}
                                disabled={sub.defaultCoefficient >= 20}
                                className="w-6 h-6 flex items-center justify-center font-black text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 cursor-pointer"
                                title="Hampitombo (+1)"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="font-bold text-indigo-900 text-sm">
                              {sub.defaultCoefficient}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {specificEntries.length > 0 ? (
                              specificEntries.map(([clsId, coeff]) => {
                                const cls = db.classes.find((c) => c.id === clsId);
                                return (
                                  <span
                                    key={clsId}
                                    className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-[11px] font-bold flex items-center gap-1"
                                  >
                                    <span>{cls?.name || clsId} :</span>
                                    <span className="bg-amber-200/60 px-1 rounded text-amber-950 font-black">
                                      coeff {coeff}
                                    </span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                Coeff standard ({sub.defaultCoefficient}) amin'ny kilasy rehetra
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-right">
                          {currentUser.role === 'DIRECTEUR' && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSubjectForEdit(sub);
                                  setIsModalOpen(true);
                                }}
                                className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                                title="Modifier la matière et coefficients"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleArchive(sub)}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                                title="Archiver"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: MATRIX VIEW (Matière x Classe) */}
      {activeViewMode === 'matrix' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                Tableau Matriciel des Coefficients par Classe
              </h3>
              <p className="text-[11px] text-slate-500">
                Azonao ovaina mivantana ao amin'ny tsanganana isaky ny kilasy ny coefficient.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <th className="p-3 min-w-[180px] sticky left-0 bg-slate-900 z-10">Matière</th>
                  <th className="p-3 text-center w-24 bg-slate-800">Défaut</th>
                  {activeClasses.map((cls) => (
                    <th key={cls.id} className="p-3 text-center min-w-[90px] border-l border-slate-800">
                      <div>{cls.name}</div>
                      <div className="text-[9px] font-normal text-slate-300">{cls.level}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSubjects.map((sub) => {
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-900 sticky left-0 bg-white shadow-xs">
                        <div>{sub.name}</div>
                        <div className="text-[10px] text-indigo-600 font-mono">{sub.code}</div>
                      </td>
                      <td className="p-3 text-center bg-slate-50 font-black text-indigo-700 text-sm">
                        {sub.defaultCoefficient}
                      </td>
                      {activeClasses.map((cls) => {
                        const currentVal = sub.classCoefficients?.[cls.id] ?? sub.defaultCoefficient;
                        const isSpecific = sub.classCoefficients?.[cls.id] !== undefined;

                        return (
                          <td
                            key={cls.id}
                            className={`p-2 text-center border-l border-slate-100 ${
                              isSpecific ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            {currentUser.role === 'DIRECTEUR' ? (
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={currentVal}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) handleMatrixCellCoeffChange(sub, cls.id, val);
                                }}
                                className={`w-12 px-1.5 py-1 text-center font-bold text-xs rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:outline-hidden ${
                                  isSpecific
                                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                                    : 'bg-white border-slate-200 text-slate-800'
                                }`}
                              />
                            ) : (
                              <span className="font-bold text-xs">{currentVal}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSubject}
        classes={db.classes}
        initialSubject={selectedSubjectForEdit}
      />
    </div>
  );
};
