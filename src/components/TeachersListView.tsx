import React, { useState } from 'react';
import { SchoolDatabase, Teacher } from '../types';
import { dbService } from '../services/dbService';
import {
  GraduationCap,
  PlusCircle,
  Search,
  Lock,
  BookOpen,
  Layers,
  Shield,
  Edit,
  Archive,
  RotateCcw,
  Phone,
  Mail,
  PenTool,
} from 'lucide-react';
import { TeacherModal } from './TeacherModal';
import { SignatureModal } from './SignatureModal';

interface TeachersListViewProps {
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT' };
  onUpdate: () => void;
}

export const TeachersListView: React.FC<TeachersListViewProps> = ({
  db,
  currentUser,
  onUpdate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacherForModal, setSelectedTeacherForModal] = useState<Teacher | null>(null);
  const [modalTab, setModalTab] = useState<'info' | 'password' | 'subjects' | 'classes' | 'signature'>('info');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Direct signature editing for any teacher
  const [signingTeacher, setSigningTeacher] = useState<Teacher | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const filteredTeachers = db.teachers.filter((t) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
      t.matricule.toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q)
    );
  });

  const handleOpenModal = (
    teacher: Teacher | null,
    tab: 'info' | 'password' | 'subjects' | 'classes' | 'signature' = 'info'
  ) => {
    setSelectedTeacherForModal(teacher);
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const handleSaveTeacher = async (data: any) => {
    if (data.id) {
      await dbService.updateTeacher(data, currentUser.name);
      if (data.initialPassword) {
        await dbService.updateTeacherPassword(data.id, data.initialPassword, currentUser.name);
      }
    } else {
      await dbService.createTeacher(data, currentUser.name, data.initialPassword || 'prof123');
    }
    onUpdate();
  };

  const handleSaveDirectSignature = async (dataUrl: string) => {
    if (!signingTeacher) return;
    await dbService.updateTeacher(
      {
        ...signingTeacher,
        signatureUrl: dataUrl,
      },
      currentUser.name
    );
    setSaveFeedback(`Signature de l'enseignant ${signingTeacher.firstName} ${signingTeacher.lastName} enregistrée avec succès !`);
    setTimeout(() => setSaveFeedback(null), 3500);
    setSigningTeacher(null);
    onUpdate();
  };

  const handleRemoveDirectSignature = async (teacher: Teacher) => {
    await dbService.updateTeacher(
      {
        ...teacher,
        signatureUrl: '',
      },
      currentUser.name
    );
    setSaveFeedback(`Signature de ${teacher.firstName} ${teacher.lastName} retirée.`);
    setTimeout(() => setSaveFeedback(null), 3000);
    onUpdate();
  };

  const handleToggleArchive = async (teacher: Teacher) => {
    const nextStatus = teacher.status === 'active' ? 'archived' : 'active';
    await dbService.updateTeacher({ ...teacher, status: nextStatus }, currentUser.name);
    onUpdate();
  };

  if (currentUser.role !== 'DIRECTEUR') {
    return (
      <div className="p-8 text-center text-slate-600 bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto my-12 space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Fidirana Voafetra / Accès Restreint</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Ny Tale ihany no manana alalana amin'ny fitantanana mpampianatra sy ny fanovana rehetra. Ny mpampianatra dia manao fampidirana naoty sy sonia ihany.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold mb-1.5">
            <Shield className="w-3.5 h-3.5" />
            Fitantanana Manokana ho an'ny Tale (Admin)
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Gestion des Enseignants ({filteredTeachers.length} professeurs)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fampidirana mpampianatra vaovao, teny miafina, kilasy, taranja, ary sonia nomerika
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal(null, 'info')}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Mampiditra Mpampianatra Vaovao
        </button>
      </div>

      {saveFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
          {saveFeedback}
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, prénom, email ou matricule enseignant..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Teachers List Table with Quick Attribution Actions */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-3 w-28">Matricule</th>
                <th className="p-3">Enseignant & Signature</th>
                <th className="p-3">Matières Attribuées</th>
                <th className="p-3">Classes Attribuées</th>
                <th className="p-3">Contact</th>
                <th className="p-3 w-20 text-center">Statut</th>
                <th className="p-3 text-right">Actions rapides de gestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((t) => {
                const subjects = db.subjects.filter((s) => t.assignedSubjectIds.includes(s.id));
                const classes = db.classes.filter((c) => t.assignedClassIds.includes(c.id));

                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-indigo-900">{t.matricule}</td>
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900 uppercase">
                        {t.lastName} <span className="font-normal capitalize">{t.firstName}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {t.signatureUrl ? (
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                            <img
                              src={t.signatureUrl}
                              alt={`Signature ${t.lastName}`}
                              className="h-5 max-w-[65px] object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => setSigningTeacher(t)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                              title="Modifier la signature"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDirectSignature(t)}
                              className="text-[11px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
                              title="Supprimer la signature"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSigningTeacher(t)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-200 cursor-pointer"
                          >
                            <PenTool className="w-3 h-3" />
                            + Ajouter signature
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Assigned Subjects */}
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {subjects.length > 0 ? (
                          subjects.map((sub) => (
                            <span
                              key={sub.id}
                              className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-medium"
                            >
                              {sub.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Aucune matière
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Assigned Classes */}
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {classes.length > 0 ? (
                          classes.map((cls) => (
                            <span
                              key={cls.id}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold"
                            >
                              {cls.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Aucune classe
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="p-3 space-y-0.5 text-slate-600 text-[11px]">
                      {t.phone && (
                        <div className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {t.phone}
                        </div>
                      )}
                      {t.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {t.email}
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.status === 'active' ? 'Actif' : 'Archivé'}
                      </span>
                    </td>

                    {/* Prompt-specified quick actions */}
                    <td className="p-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(t, 'password')}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Modifier le mot de passe"
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          Mot de passe
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenModal(t, 'subjects')}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Attribution des matières"
                        >
                          <BookOpen className="w-3 h-3 text-slate-400" />
                          Matières
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenModal(t, 'classes')}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Attribution des classes"
                        >
                          <Layers className="w-3 h-3 text-slate-400" />
                          Classes
                        </button>

                        <button
                          type="button"
                          onClick={() => setSigningTeacher(t)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors border border-indigo-200"
                          title="Modifier la signature de l'enseignant"
                        >
                          <Shield className="w-3 h-3 text-indigo-600" />
                          Signature
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenModal(t, 'info')}
                          className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleArchive(t)}
                          className="p-1 text-slate-500 hover:text-amber-600 rounded hover:bg-amber-50 transition-colors"
                          title={t.status === 'active' ? 'Archiver' : 'Désarchiver'}
                        >
                          {t.status === 'active' ? (
                            <Archive className="w-3.5 h-3.5" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <TeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTeacher}
        subjects={db.subjects}
        classes={db.classes}
        initialTeacher={selectedTeacherForModal}
        initialTab={modalTab}
      />

      {/* Direct Signature Modal for Teacher */}
      {signingTeacher && (
        <SignatureModal
          isOpen={Boolean(signingTeacher)}
          onClose={() => setSigningTeacher(null)}
          onSave={handleSaveDirectSignature}
          title={`Signature de l'enseignant : ${signingTeacher.firstName} ${signingTeacher.lastName}`}
          subtitle="Cette signature numérique figurera sur les bulletins et visas des élèves de ses matières et classes"
          initialSignature={signingTeacher.signatureUrl}
        />
      )}
    </div>
  );
};
