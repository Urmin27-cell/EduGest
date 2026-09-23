import React, { useState } from 'react';
import { SchoolDatabase, Student, ClassRoom } from '../types';
import { dbService } from '../services/dbService';
import {
  Users,
  Search,
  PlusCircle,
  Upload,
  Download,
  FileText,
  UserCheck,
  Archive,
  RotateCcw,
  Edit,
  Eye,
  Filter,
} from 'lucide-react';
import { exportStudentsCSV } from '../utils/csvHelpers';
import { StudentModal } from './StudentModal';
import { StudentProfileModal } from './StudentProfileModal';
import { CsvImportExportModal } from './CsvImportExportModal';

interface StudentsListViewProps {
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT'; teacherId?: string };
  onNavigateToBulletin: (student: Student, termId: string) => void;
  onUpdate: () => void;
}

export const StudentsListView: React.FC<StudentsListViewProps> = ({
  db,
  currentUser,
  onNavigateToBulletin,
  onUpdate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'archived' | 'ALL'>('active');

  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // If teacher, can only see students from their classes
  const currentTeacher = currentUser.teacherId
    ? db.teachers.find((t) => t.id === currentUser.teacherId)
    : null;

  const accessibleClasses = db.classes.filter((c) => {
    if (currentUser.role === 'DIRECTEUR') return true;
    return currentTeacher?.assignedClassIds.includes(c.id);
  });

  const accessibleStudents = db.students.filter((s) => {
    if (currentUser.role === 'DIRECTEUR') return true;
    return currentTeacher?.assignedClassIds.includes(s.classId);
  });

  const filteredStudents = accessibleStudents.filter((s) => {
    if (selectedClassId !== 'ALL' && s.classId !== selectedClassId) return false;
    if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = `${s.lastName} ${s.firstName}`.toLowerCase().includes(q);
      const matchMatricule = s.matricule.toLowerCase().includes(q);
      const matchPhone = (s.guardianPhone || '').includes(q);
      if (!matchName && !matchMatricule && !matchPhone) return false;
    }

    return true;
  });

  const handleSaveStudent = async (data: any) => {
    if (data.id) {
      await dbService.updateStudent(data, currentUser.name);
    } else {
      await dbService.createStudent(data, currentUser.name);
    }
    onUpdate();
  };

  const handleToggleArchive = async (student: Student) => {
    const newStatus = student.status === 'active' ? 'archived' : 'active';
    await dbService.updateStudent({ ...student, status: newStatus }, currentUser.name);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Gestion des Élèves ({filteredStudents.length} élèves)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Effectif scolaire, fiches individuelles, dossiers scolaires et inscriptions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'DIRECTEUR' && (
            <>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                Importer CSV
              </button>

              <button
                type="button"
                onClick={() => exportStudentsCSV(accessibleStudents, db.classes)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Exporter CSV
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForModal(null);
                  setIsEditModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Inscrire un élève
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, prénom ou matricule..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">Toutes les classes ({accessibleClasses.length})</option>
              {accessibleClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
            >
              <option value="active">Élèves Actifs uniquement</option>
              <option value="archived">Élèves Archivés</option>
              <option value="ALL">Tous les statuts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Aucun élève ne correspond à votre recherche.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="p-3 w-10 text-center">N°</th>
                  <th className="p-3 w-28">Matricule</th>
                  <th className="p-3">Nom & Prénom(s)</th>
                  <th className="p-3 w-16 text-center">Sexe</th>
                  <th className="p-3 w-32">Classe</th>
                  <th className="p-3 w-36">Contact Parent</th>
                  <th className="p-3 w-24 text-center">Statut</th>
                  <th className="p-3 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((stu, idx) => {
                  const cls = db.classes.find((c) => c.id === stu.classId);

                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-indigo-900">{stu.matricule}</td>
                      <td className="p-3">
                        <span className="font-extrabold text-slate-900 uppercase">
                          {stu.lastName}
                        </span>{' '}
                        <span className="text-slate-700">{stu.firstName}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-semibold ${
                            stu.gender === 'F' ? 'text-pink-600' : 'text-blue-600'
                          }`}
                        >
                          {stu.gender}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800">
                          {cls ? cls.name : stu.classId}
                        </span>
                        <span className="block text-[10px] text-slate-400">{cls?.level}</span>
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">
                        {stu.guardianPhone || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stu.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {stu.status === 'active' ? 'Actif' : 'Archivé'}
                        </span>
                      </td>

                      {/* Row Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForProfile(stu)}
                            title="Consulter le dossier"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onNavigateToBulletin(
                                stu,
                                db.settings.availableTerms[0]?.id || 'T1'
                              )
                            }
                            title="Générer / Voir le bulletin"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {currentUser.role === 'DIRECTEUR' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentForModal(stu);
                                  setIsEditModalOpen(true);
                                }}
                                title="Modifier l'élève"
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleArchive(stu)}
                                title={stu.status === 'active' ? 'Archiver' : 'Désarchiver'}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              >
                                {stu.status === 'active' ? (
                                  <Archive className="w-4 h-4" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Edit/Create Modal */}
      <StudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveStudent}
        classes={accessibleClasses}
        academicYear={db.settings.activeAcademicYear}
        initialStudent={selectedStudentForModal}
      />

      {/* Student Profile Modal */}
      <StudentProfileModal
        isOpen={Boolean(selectedStudentForProfile)}
        onClose={() => setSelectedStudentForProfile(null)}
        student={selectedStudentForProfile}
        classes={db.classes}
        db={db}
        onOpenBulletin={(s, termId) => {
          setSelectedStudentForProfile(null);
          onNavigateToBulletin(s, termId);
        }}
      />

      {/* CSV Bulk Import Modal */}
      <CsvImportExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        classes={accessibleClasses}
        onImportSuccess={() => onUpdate()}
        user={currentUser.name}
      />
    </div>
  );
};
