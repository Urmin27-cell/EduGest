import React, { useState } from 'react';
import { SchoolDatabase, ClassRoom } from '../types';
import { dbService } from '../services/dbService';
import {
  Layers,
  PlusCircle,
  Users,
  Edit,
  Archive,
  RotateCcw,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { ClassModal } from './ClassModal';

interface ClassesListViewProps {
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT' };
  onSelectClassForStudents: (classId: string) => void;
  onUpdate: () => void;
}

export const ClassesListView: React.FC<ClassesListViewProps> = ({
  db,
  currentUser,
  onSelectClassForStudents,
  onUpdate,
}) => {
  const [selectedClassForEdit, setSelectedClassForEdit] = useState<ClassRoom | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeClasses = db.classes.filter((c) => !c.isArchived);

  const handleSaveClass = async (data: any) => {
    if (data.id) {
      await dbService.updateClass(data, currentUser.name);
    } else {
      await dbService.createClass(data, currentUser.name);
    }
    onUpdate();
  };

  const handleToggleArchive = async (cls: ClassRoom) => {
    await dbService.updateClass({ ...cls, isArchived: !cls.isArchived }, currentUser.name);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Gestion des Classes ({activeClasses.length} actives)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Niveaux d'enseignement, salles de cours et professeurs principaux
          </p>
        </div>

        {currentUser.role === 'DIRECTEUR' && (
          <button
            type="button"
            onClick={() => {
              setSelectedClassForEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Créer une classe
          </button>
        )}
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeClasses.map((cls) => {
          const studentsInClass = db.students.filter(
            (s) => s.classId === cls.id && s.status === 'active'
          );
          const mainTeacher = db.teachers.find((t) => t.id === cls.mainTeacherId);

          return (
            <div
              key={cls.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {cls.level}
                  </span>
                  {cls.roomNumber && (
                    <span className="text-[11px] text-slate-400 font-mono">{cls.roomNumber}</span>
                  )}
                </div>

                <h3 className="text-lg font-black text-slate-900">{cls.name}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Prof. Principal :</span>
                    <span className="font-semibold text-slate-800">
                      {mainTeacher ? `${mainTeacher.firstName} ${mainTeacher.lastName}` : 'Non assigné'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Effectif actuel :</span>
                    <span className="font-bold text-indigo-900">
                      {studentsInClass.length} élèves inscrits
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Année scolaire :</span>
                    <span className="text-slate-700">{cls.academicYear}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectClassForStudents(cls.id)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  Voir la liste ({studentsInClass.length})
                </button>

                {currentUser.role === 'DIRECTEUR' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClassForEdit(cls);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                      title="Modifier la classe"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleArchive(cls)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                      title="Archiver la classe"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClass}
        teachers={db.teachers}
        academicYear={db.settings.activeAcademicYear}
        initialClass={selectedClassForEdit}
      />
    </div>
  );
};
