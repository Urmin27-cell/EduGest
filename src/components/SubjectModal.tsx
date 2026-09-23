import React, { useState } from 'react';
import { Subject, ClassRoom } from '../types';
import { BookOpen, X, Check, Sliders } from 'lucide-react';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subjectData: any) => void;
  classes: ClassRoom[];
  initialSubject?: Subject | null;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  classes,
  initialSubject,
}) => {
  const [name, setName] = useState(initialSubject?.name || '');
  const [code, setCode] = useState(initialSubject?.code || '');
  const [defaultCoeff, setDefaultCoeff] = useState<number>(
    initialSubject?.defaultCoefficient ?? 2
  );
  const [category, setCategory] = useState<Subject['category']>(
    initialSubject?.category || 'Scientifique'
  );
  const [displayOrder, setDisplayOrder] = useState<number>(
    initialSubject?.displayOrder ?? 1
  );
  const [classCoefficients, setClassCoefficients] = useState<Record<string, number>>(
    initialSubject?.classCoefficients || {}
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClassCoeffChange = (clsId: string, val: number) => {
    setClassCoefficients((prev) => ({
      ...prev,
      [clsId]: val,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez spécifier le nom de la matière.');
      return;
    }
    const cleanCode = code.trim().toUpperCase() || name.substring(0, 4).toUpperCase();

    const payload = {
      ...(initialSubject || {}),
      name: name.trim(),
      code: cleanCode,
      defaultCoefficient: Number(defaultCoeff) || 1,
      category,
      displayOrder: Number(displayOrder) || 1,
      classCoefficients,
      isArchived: initialSubject?.isArchived || false,
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">
                {initialSubject ? 'Modifier la matière' : 'Ajouter une matière'}
              </h3>
              <p className="text-xs text-slate-300">Coefficients et ordre sur le bulletin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Nom de la matière *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!code) setCode(e.target.value.substring(0, 4).toUpperCase());
                }}
                placeholder="ex: Mathématiques, Malagasy..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Code Matière
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="MATH"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Coefficient par défaut *
              </label>
              <div className="space-y-1.5">
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  required
                  value={defaultCoeff}
                  onChange={(e) => setDefaultCoeff(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm font-bold text-indigo-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">Haingana:</span>
                  {[1, 2, 3, 4, 5, 6].map((cf) => (
                    <button
                      key={cf}
                      type="button"
                      onClick={() => setDefaultCoeff(cf)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                        defaultCoeff === cf
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Ordre sur le bulletin
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Catégorie disciplinaire
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="Scientifique">Scientifique (Maths, Physique, SVT...)</option>
              <option value="Littéraire">Littéraire (Français, Malagasy, Philo...)</option>
              <option value="Langues">Langues vivantes (Anglais, Espagnol...)</option>
              <option value="Sport">Éducation Physique & Sportive (EPS)</option>
              <option value="Artistique">Artistique & Musical</option>
              <option value="Autre">Autre discipline</option>
            </select>
          </div>

          {/* Per-class specific coefficients */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Coefficients personnalisés par classe
              </span>
              <span className="text-[11px] text-slate-400">Si différent du défaut</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto p-1">
              {classes
                .filter((c) => !c.isArchived)
                .map((cls) => {
                  const currentVal = classCoefficients[cls.id] ?? defaultCoeff;
                  return (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <span className="text-xs font-medium text-slate-800">
                        {cls.name} <span className="text-slate-400 font-normal">({cls.level})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Coeff :</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={currentVal}
                          onChange={(e) =>
                            handleClassCoeffChange(cls.id, parseInt(e.target.value) || 1)
                          }
                          className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white font-semibold text-center focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              {initialSubject ? 'Enregistrer' : 'Créer la matière'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
