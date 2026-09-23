import React, { useState } from 'react';
import { SchoolDatabase, SchoolSettings } from '../types';
import { dbService } from '../services/dbService';
import { SignatureModal } from './SignatureModal';
import {
  School,
  Save,
  KeyRound,
  Upload,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Stamp,
  Calendar,
  Layers,
  Lock,
} from 'lucide-react';

interface SettingsViewProps {
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT' };
  onUpdate: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  db,
  currentUser,
  onUpdate,
}) => {
  const [settings, setSettings] = useState<SchoolSettings>({ ...db.settings });

  // PIN change state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState(
    db.adminAuth.recoveryQuestion || 'Quelle est la ville de naissance du directeur ?'
  );
  const [recoveryAnswer, setRecoveryAnswer] = useState('');

  // Modals & feedback
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);

    await dbService.updateSettings(settings, currentUser.name);
    setSaveStatus("Paramètres de l'établissement enregistrés avec succès.");
    setTimeout(() => setSaveStatus(null), 3000);
    onUpdate();
  };

  const handlePinChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);

    const isCurrentValid = await dbService.verifyAdminPin(currentPin);
    if (!isCurrentValid) {
      setErrorStatus('Le code PIN actuel est incorrect.');
      return;
    }

    if (newPin.length < 4) {
      setErrorStatus('Le nouveau code PIN doit comporter au moins 4 caractères.');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorStatus('La confirmation du code PIN ne correspond pas.');
      return;
    }

    await dbService.setAdminPin(newPin, recoveryQuestion, recoveryAnswer || 'antananarivo');
    setSaveStatus('Votre code PIN Directeur a été mis à jour avec succès.');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setRecoveryAnswer('');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute(
      'download',
      `sauvegarde_ecole_${new Date().toISOString().split('T')[0]}.json`
    );
    dlAnchor.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.settings && parsed.students && parsed.classes) {
          await dbService.importDatabase(parsed, currentUser.name);
          setSaveStatus('Base de données restaurée avec succès !');
          onUpdate();
        } else {
          setErrorStatus('Le fichier JSON sélectionné n\'est pas une sauvegarde valide.');
        }
      } catch (err) {
        setErrorStatus('Erreur lors du décodage du fichier JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = async () => {
    if (
      window.confirm(
        'Attention : voulez-vous restaurer l\'ensemble des données de démonstration officielles ?'
      )
    ) {
      await dbService.resetDemoDatabase(currentUser.name);
      setSaveStatus('Données de démonstration réinitialisées avec succès.');
      onUpdate();
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const newStamp = uploadEvent.target?.result as string;
        const updated = {
          ...settings,
          schoolStampUrl: newStamp,
        };
        setSettings(updated);
        await dbService.updateSettings(updated, currentUser.name);
        setSaveStatus("Cachet officiel enregistré et appliqué avec succès sur tous les bulletins !");
        setTimeout(() => setSaveStatus(null), 3500);
        onUpdate();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveStamp = async () => {
    const updated = {
      ...settings,
      schoolStampUrl: '',
    };
    setSettings(updated);
    await dbService.updateSettings(updated, currentUser.name);
    setSaveStatus("Cachet officiel retiré.");
    setTimeout(() => setSaveStatus(null), 3000);
    onUpdate();
  };

  const handleGenerateOfficialStamp = async () => {
    const cleanName = (settings.schoolName || 'COLLEGE PRIVE').toUpperCase();
    const cleanCity = (settings.address || 'ANTANANARIVO').split(',')[0].toUpperCase();
    const svgStamp = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220"><circle cx="110" cy="110" r="100" fill="none" stroke="%23b91c1c" stroke-width="4.5"/><circle cx="110" cy="110" r="90" fill="none" stroke="%23b91c1c" stroke-width="1.8" stroke-dasharray="5,2.5"/><circle cx="110" cy="110" r="66" fill="none" stroke="%23b91c1c" stroke-width="2.5"/><path id="stampTop" fill="none" d="M 28 110 A 82 82 0 0 1 192 110" /><text fill="%23b91c1c" font-size="11" font-weight="900" font-family="Arial, sans-serif" letter-spacing="2"><textPath href="%23stampTop" startOffset="50%" text-anchor="middle">REPOBLIKAN'I MADAGASIKARA</textPath></text><path id="stampBottom" fill="none" d="M 192 110 A 82 82 0 0 1 28 110" /><text fill="%23b91c1c" font-size="10" font-weight="800" font-family="Arial, sans-serif" letter-spacing="1.5"><textPath href="%23stampBottom" startOffset="50%" text-anchor="middle">★ ${encodeURIComponent(cleanCity)} ★</textPath></text><text x="110" y="98" fill="%23b91c1c" font-size="10" font-weight="900" font-family="Arial, sans-serif" text-anchor="middle">CACHET</text><text x="110" y="115" fill="%23b91c1c" font-size="11" font-weight="900" font-family="Arial, sans-serif" text-anchor="middle">OFFICIEL</text><text x="110" y="132" fill="%23b91c1c" font-size="8.5" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">DIRECTION</text></svg>`;
    const updated = {
      ...settings,
      schoolStampUrl: svgStamp,
    };
    setSettings(updated);
    await dbService.updateSettings(updated, currentUser.name);
    setSaveStatus("Nouveau cachet officiel généré et activé avec succès !");
    setTimeout(() => setSaveStatus(null), 3500);
    onUpdate();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const newLogo = uploadEvent.target?.result as string;
        const updated = {
          ...settings,
          logoUrl: newLogo,
        };
        setSettings(updated);
        await dbService.updateSettings(updated, currentUser.name);
        setSaveStatus("Logo de l'établissement mis à jour avec succès.");
        setTimeout(() => setSaveStatus(null), 3000);
        onUpdate();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {saveStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {errorStatus && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorStatus}</span>
        </div>
      )}

      {/* School General Info Form */}
      <form onSubmit={handleSettingsSubmit} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <School className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Paramètres de l'Établissement</h2>
              <p className="text-xs text-slate-500">
                Informations administratives et en-tête des bulletins officiels
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-4 h-4" />
            Enregistrer les paramètres
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Nom de l'établissement scolaire *
            </label>
            <input
              type="text"
              required
              value={settings.schoolName}
              onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Devise / Slogan de l'école
            </label>
            <input
              type="text"
              value={settings.motto}
              onChange={(e) => setSettings({ ...settings, motto: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Année Scolaire Active *
            </label>
            <input
              type="text"
              required
              value={settings.activeAcademicYear}
              onChange={(e) => setSettings({ ...settings, activeAcademicYear: e.target.value })}
              placeholder="2026-2027"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Barème des Notes (Max)
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={settings.maxGrade}
              onChange={(e) => setSettings({ ...settings, maxGrade: parseInt(e.target.value) || 20 })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Téléphone Contact
            </label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Adresse Géographique Complète
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Adresse Email Officielle
            </label>
            <input
              type="email"
              value={settings.email || ''}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Director Profile & Signatures */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Signature Officielle & Cachet de la Direction
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Nom du Directeur *
              </label>
              <input
                type="text"
                required
                value={settings.directorName}
                onChange={(e) => setSettings({ ...settings, directorName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Titre Officiel du Directeur
              </label>
              <input
                type="text"
                value={settings.directorTitle}
                onChange={(e) => setSettings({ ...settings, directorTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Signature Pad / Image */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-700 mb-2">Signature du Directeur</span>
              {settings.directorSignatureUrl ? (
                <div className="space-y-2 flex flex-col items-center">
                  <img
                    src={settings.directorSignatureUrl}
                    alt="Signature Directeur"
                    className="max-h-20 object-contain bg-white p-2 rounded border border-slate-200 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSignModalOpen(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Modifier la signature
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSignModalOpen(true)}
                  className="px-4 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-700 rounded-lg hover:border-indigo-500 shadow-2xs"
                >
                  Tracer ou importer la signature
                </button>
              )}
            </div>

            {/* School Stamp upload */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-slate-700 mb-2">
                Cachet Officiel de l'Établissement
              </span>
              {settings.schoolStampUrl ? (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-center">
                    <img
                      src={settings.schoolStampUrl}
                      alt="Cachet de l'établissement"
                      className="max-h-24 max-w-[150px] object-contain drop-shadow-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <label className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors border border-indigo-200">
                      Remplacer le fichier (PNG/JPG)
                      <input type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveStamp}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors border border-red-200"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 flex flex-col items-center">
                  <label className="px-4 py-2 bg-white border border-slate-300 text-xs font-semibold text-slate-700 rounded-lg hover:border-indigo-500 shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors">
                    <Stamp className="w-4 h-4 text-indigo-600" />
                    Importer l'image du cachet (PNG/JPG)
                    <input type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateOfficialStamp}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    Ou générer automatiquement un cachet officiel rond
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* PIN Security Update Form */}
      <form onSubmit={handlePinChangeSubmit} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <KeyRound className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Sécurité du Code PIN Administrateur</h3>
            <p className="text-xs text-slate-500">
              Modifiez votre code PIN secret de connexion et votre question de récupération
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Code PIN Actuel *
            </label>
            <input
              type="password"
              required
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="••••"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-center tracking-widest focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Nouveau Code PIN *
            </label>
            <input
              type="password"
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="••••"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-center tracking-widest focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Confirmer Nouveau PIN *
            </label>
            <input
              type="password"
              required
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="••••"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-center tracking-widest focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Question secrète de récupération
            </label>
            <input
              type="text"
              value={recoveryQuestion}
              onChange={(e) => setRecoveryQuestion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Réponse secrète (utilisée en cas d'oubli)
            </label>
            <input
              type="text"
              value={recoveryAnswer}
              onChange={(e) => setRecoveryAnswer(e.target.value)}
              placeholder="Nouvelle réponse secrète..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Mettre à jour le code PIN
          </button>
        </div>
      </form>

      {/* Database Backup & Export Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Download className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Sauvegarde & Restauration de la Base de Données
            </h3>
            <p className="text-xs text-slate-500">
              Exportez ou restaurez l'intégralité des élèves, classes, notes et bulletins en un clic
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter la base de données (JSON)
          </button>

          <label className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors">
            <Upload className="w-4 h-4 text-indigo-600" />
            Importer une sauvegarde (JSON)
            <input type="file" accept=".json, application/json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleResetDemo}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser données démo
          </button>
        </div>
      </div>

      <SignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onSave={async (dataUrl) => {
          const updated = { ...settings, directorSignatureUrl: dataUrl };
          setSettings(updated);
          await dbService.updateSettings(updated, currentUser.name);
          setSaveStatus("Signature du Directeur mise à jour et enregistrée avec succès.");
          setTimeout(() => setSaveStatus(null), 3500);
          onUpdate();
          setIsSignModalOpen(false);
        }}
        title="Signature du Directeur"
        subtitle="Cette signature par défaut figurera sur les bulletins"
        initialSignature={settings.directorSignatureUrl}
      />
    </div>
  );
};
