import React, { useState } from 'react';
import { Teacher, Subject, ClassRoom } from '../types';
import { GraduationCap, Lock, BookOpen, Layers, X, Check, Shield } from 'lucide-react';
import { SignatureModal } from './SignatureModal';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacherData: any) => void;
  subjects: Subject[];
  classes: ClassRoom[];
  initialTeacher?: Teacher | null;
  initialTab?: 'info' | 'password' | 'subjects' | 'classes' | 'signature';
}

export const TeacherModal: React.FC<TeacherModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjects,
  classes,
  initialTeacher,
  initialTab = 'info',
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'subjects' | 'classes' | 'signature'>(
    initialTab
  );

  const [lastName, setLastName] = useState(initialTeacher?.lastName || '');
  const [firstName, setFirstName] = useState(initialTeacher?.firstName || '');
  const [phone, setPhone] = useState(initialTeacher?.phone || '');
  const [email, setEmail] = useState(initialTeacher?.email || '');
  const [password, setPassword] = useState('');
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>(
    initialTeacher?.assignedSubjectIds || []
  );
  const [assignedClasses, setAssignedClasses] = useState<string[]>(
    initialTeacher?.assignedClassIds || []
  );
  const [signatureUrl, setSignatureUrl] = useState<string>(initialTeacher?.signatureUrl || '');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSubject = (subId: string) => {
    setAssignedSubjects((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const toggleClass = (clsId: string) => {
    setAssignedClasses((prev) =>
      prev.includes(clsId) ? prev.filter((id) => id !== clsId) : [...prev, clsId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim() || !firstName.trim()) {
      setError('Veuillez renseigner le nom et le prénom de l\'enseignant.');
      setActiveTab('info');
      return;
    }

    if (!initialTeacher && !password.trim()) {
      setError('Veuillez définir un mot de passe initial pour l\'enseignant.');
      setActiveTab('password');
      return;
    }

    const payload = {
      ...(initialTeacher || {}),
      lastName: lastName.trim().toUpperCase(),
      firstName: firstName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      assignedSubjectIds: assignedSubjects,
      assignedClassIds: assignedClasses,
      signatureUrl,
      status: initialTeacher?.status || 'active',
      ...(password.trim() ? { initialPassword: password.trim() } : {}),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">
                {initialTeacher ? `Enseignant : ${initialTeacher.firstName} ${initialTeacher.lastName}` : "Ajouter un Enseignant"}
              </h3>
              <p className="text-xs text-slate-300">
                {initialTeacher ? `Matricule: ${initialTeacher.matricule}` : "Compte d'accès personnel pour la saisie des notes"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Informations Générales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'subjects'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Matières ({assignedSubjects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('classes')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Classes ({assignedClasses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'password'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Mot de passe
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signature')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'signature'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Signature
          </button>
        </div>

        {/* Tab Contents */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Nom de famille *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="ex: RAZAFY"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Prénom(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="ex: Hery"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Adresse Email (Identifiant de connexion)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hery.razafy@saintmichel.mg"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Numéro de Téléphone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+261 34 55 101 22"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="space-y-3 animate-in fade-in-50">
              <p className="text-xs text-slate-500">
                Sélectionnez les matières que cet enseignant a le droit d'évaluer. Il ne verra que ces matières lors de la saisie des notes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1 border border-slate-200 rounded-lg">
                {subjects
                  .filter((s) => !s.isArchived)
                  .map((sub) => {
                    const isChecked = assignedSubjects.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSubject(sub.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="text-xs">{sub.name}</span>
                          <span className="block text-[10px] text-slate-400">
                            Code: {sub.code} · Coeff base: {sub.defaultCoefficient}
                          </span>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-3 animate-in fade-in-50">
              <p className="text-xs text-slate-500">
                Sélectionnez les classes assignées à cet enseignant. Il ne pourra accéder qu'aux élèves et notes de ces classes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1 border border-slate-200 rounded-lg">
                {classes
                  .filter((c) => !c.isArchived)
                  .map((cls) => {
                    const isChecked = assignedClasses.includes(cls.id);
                    return (
                      <label
                        key={cls.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleClass(cls.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-xs font-semibold">{cls.name}</span>
                          <span className="block text-[10px] text-slate-400">{cls.level}</span>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-3 animate-in fade-in-50">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 leading-relaxed">
                <strong>Fidirana amin'ny Teny Miafina fotsiny :</strong> Ny mpampianatra dia hampiditra ity teny miafina ity fotsiny eo amin'ny pejin'ny fidirana (tsy mila manoratra anarana), dia hiseho avy hatrany ireo kilasy sy taranja ampianariny.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  {initialTeacher ? "Teny miafina vaovao / Nouveau mot de passe (avelao banga raha tsy ovaina)" : "Teny miafin'ny Mpampianatra / Mot de passe personnel *"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ex: prof2026, razafy123..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleanName = (lastName || 'prof').toLowerCase().replace(/[^a-z]/g, '');
                      setPassword(`${cleanName}${Math.floor(100 + Math.random() * 900)}`);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 cursor-pointer"
                  >
                    Mamorona ho azy
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Omeo an'ity mpampianatra ity ity teny miafina ity rehefa avy tahirizinao.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'signature' && (
            <div className="space-y-4 animate-in fade-in-50">
              <p className="text-xs text-slate-500">
                Signature numérique de l'enseignant pour les bulletins ou visas officiels.
              </p>
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 flex flex-col items-center justify-center">
                {signatureUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={signatureUrl}
                      alt="Signature Enseignant"
                      className="max-h-24 object-contain bg-white p-2 rounded border border-slate-200 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setIsSignModalOpen(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Modifier la signature
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSignModalOpen(true)}
                    className="px-4 py-2 bg-white border border-slate-300 hover:border-indigo-500 text-xs font-medium text-slate-700 rounded-lg shadow-2xs transition-colors"
                  >
                    Dessiner ou Importer la signature
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {assignedSubjects.length} matière(s) · {assignedClasses.length} classe(s)
            </span>
            <div className="flex items-center gap-2">
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
                {initialTeacher ? 'Mettre à jour l\'enseignant' : 'Créer le compte enseignant'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <SignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onSave={(url) => {
          setSignatureUrl(url);
          setIsSignModalOpen(false);
        }}
        title={`Signature de ${firstName || 'l\'enseignant'} ${lastName || ''}`}
        subtitle="Cette signature figurera sur les visas de bulletins"
        initialSignature={signatureUrl}
      />
    </div>
  );
};
