import React, { useState, useEffect } from 'react';
import { SchoolDatabase, Teacher, SchoolSummary } from '../types';
import { dbService } from '../services/dbService';
import { PWAInstallHeaderButton } from './PWAInstallModal';
import {
  ShieldCheck,
  GraduationCap,
  KeyRound,
  Eye,
  EyeOff,
  User,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  School,
  Sparkles,
  Lock,
  ArrowRight,
  UserPlus,
  LogIn,
  Phone,
  Mail,
  MapPin,
  Building2,
  RefreshCw,
} from 'lucide-react';

interface AuthViewProps {
  db: SchoolDatabase;
  onSuccess: (user: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT'; teacherId?: string }) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ db, onSuccess }) => {
  // Main view mode: 'connexion' | 'inscription'
  const [authMode, setAuthMode] = useState<'connexion' | 'inscription'>('connexion');

  // Active role tab in Connexion mode: 'director' | 'teacher'
  const [activeTab, setActiveTab] = useState<'director' | 'teacher'>('director');

  // Multi-school state
  const [schoolsList, setSchoolsList] = useState<SchoolSummary[]>(() => dbService.getSchoolsList());
  const [activeSchoolId, setActiveSchoolId] = useState<string>(() => dbService.getActiveSchoolId());
  const [isSwitchingSchool, setIsSwitchingSchool] = useState(false);

  // Director PIN state
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Director Setup / Reset state
  const [isResetMode, setIsResetMode] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Teacher Login state: MOT DE PASSE ENSEIGNANT ONLY!
  const [teacherPassword, setTeacherPassword] = useState('');
  const [showTeacherPass, setShowTeacherPass] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [multipleTeacherMatches, setMultipleTeacherMatches] = useState<Teacher[] | null>(null);
  const [isTeacherLoggingIn, setIsTeacherLoggingIn] = useState(false);

  // Inscription (Registration) Form State
  const [schoolName, setSchoolName] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [directorTitle, setDirectorTitle] = useState('Le Directeur');
  const [schoolAddress, setSchoolAddress] = useState('Antananarivo, Madagascar');
  const [schoolPhone, setSchoolPhone] = useState('+261 34 00 000 00');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');
  const [regRecoveryQuestion, setRegRecoveryQuestion] = useState(
    'Inona ny tanàna nahaterahan\'ny Tale ? / Ville de naissance du Directeur ?'
  );
  const [regRecoveryAnswer, setRegRecoveryAnswer] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  // Subscribe to schools directory updates from Firestore
  useEffect(() => {
    const unsub = dbService.subscribeSchools((list) => {
      setSchoolsList(list);
      const current = dbService.getActiveSchoolId();
      setActiveSchoolId(current);
    });
    return () => unsub();
  }, []);

  const handleSelectSchool = async (newSchoolId: string) => {
    if (newSchoolId === activeSchoolId) return;
    setIsSwitchingSchool(true);
    setActiveSchoolId(newSchoolId);
    setPin('');
    setTeacherPassword('');
    setPinError(null);
    setTeacherError(null);
    setMultipleTeacherMatches(null);
    try {
      await dbService.switchActiveSchool(newSchoolId);
    } finally {
      setIsSwitchingSchool(false);
    }
  };

  // 1. Director Login Handler
  const handleDirectorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!pin.trim()) {
      setPinError('Ampidiro ny Code PIN anao azafady / Veuillez renseigner votre code PIN.');
      return;
    }

    const isValid = await dbService.verifyAdminPin(pin.trim());
    if (isValid) {
      onSuccess({
        name: db.settings.directorName || 'Directeur de l\'Établissement',
        role: 'DIRECTEUR',
      });
    } else {
      setPinError('Code PIN diso. Hamarino tsara na ampiasao ny fanarenana (Code PIN incorrect pour cet établissement).');
    }
  };

  // 2. PIN Reset Handler
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    const { simpleHash } = await import('../demoData');
    if (simpleHash(recoveryAnswer.toLowerCase().trim()) !== db.adminAuth.recoveryAnswerHash) {
      setPinError('Tsy marina ny valin\'ny fanontaniana miafina / La réponse secrète est inexacte.');
      return;
    }

    if (newPin.length < 4) {
      setPinError('Mila isa 4 farafahakeliny ny Code PIN vaovao / Le nouveau code PIN doit comporter au moins 4 chiffres.');
      return;
    }

    await dbService.setAdminPin(newPin, db.adminAuth.recoveryQuestion, recoveryAnswer);
    setResetSuccess('Voaova soa aman-tsara ny Code PIN ! Midira amin\'ny Code vaovao ianao.');
    setIsResetMode(false);
    setPin('');
  };

  // 3. Teacher Password-Only Login Handler
  const handleTeacherPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherError(null);
    setMultipleTeacherMatches(null);

    if (!teacherPassword.trim()) {
      setTeacherError('Ampidiro ny teny miafin\'ny mpampianatra azafady (Veuillez saisir votre mot de passe enseignant).');
      return;
    }

    setIsTeacherLoggingIn(true);
    try {
      const result = await dbService.verifyTeacherByPasswordOnly(teacherPassword.trim());

      if (result.teacher) {
        const teacher = result.teacher;
        await dbService.logActivity(
          `${teacher.firstName} ${teacher.lastName}`,
          'ENSEIGNANT',
          'CONNEXION_ENSEIGNANT',
          `Fidirana nahomby tamin'ny alalan'ny teny miafin'i Prof. ${teacher.firstName} ${teacher.lastName}.`
        );
        onSuccess({
          name: `${teacher.firstName} ${teacher.lastName}`,
          role: 'ENSEIGNANT',
          teacherId: teacher.id,
        });
      } else if (result.multipleMatches && result.multipleMatches.length > 0) {
        setMultipleTeacherMatches(result.multipleMatches);
      } else {
        setTeacherError(
          'Teny miafina tsy mifanaraka amina mpampianatra ato amin\'ity sekoly ity. Hamarino ny sekoly voafidy na manatona ny Tale. (Mot de passe enseignant incorrect pour cet établissement).'
        );
      }
    } catch {
      setTeacherError('Nisy olana teo am-pidirana. Andramo indray azafady.');
    } finally {
      setIsTeacherLoggingIn(false);
    }
  };

  // Select teacher from ambiguous matches
  const handleSelectMatchingTeacher = async (teacher: Teacher) => {
    await dbService.logActivity(
      `${teacher.firstName} ${teacher.lastName}`,
      'ENSEIGNANT',
      'CONNEXION_ENSEIGNANT',
      `Fidirana nataon'i Prof. ${teacher.firstName} ${teacher.lastName}.`
    );
    onSuccess({
      name: `${teacher.firstName} ${teacher.lastName}`,
      role: 'ENSEIGNANT',
      teacherId: teacher.id,
    });
  };

  // 4. Inscription (New Isolated School & Director PIN Registration) Handler
  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!schoolName.trim()) {
      setRegError('Ampidiro ny anaran\'ny sekoly (Nom de l\'établissement requis).');
      return;
    }
    if (!directorName.trim()) {
      setRegError('Ampidiro ny anarana fenon\'ny Tale (Nom du Directeur requis).');
      return;
    }
    if (regPin.trim().length < 4) {
      setRegError('Mila isa 4 farafahakeliny ny Code PIN Directeur (4 chiffres minimum).');
      return;
    }
    if (regPin.trim() !== regPinConfirm.trim()) {
      setRegError('Tsy mitovy ny Code PIN sy ny fanamarinana (Les deux codes PIN ne correspondent pas).');
      return;
    }
    if (!regRecoveryAnswer.trim()) {
      setRegError('Valio ny fanontaniana miafina mba hahafahana manarina ny PIN raha hadino.');
      return;
    }

    setIsSubmittingReg(true);
    try {
      const res = await dbService.registerSchoolAndDirector({
        schoolName: schoolName.trim(),
        directorName: directorName.trim(),
        directorTitle: directorTitle.trim(),
        address: schoolAddress.trim(),
        phone: schoolPhone.trim(),
        email: schoolEmail.trim(),
        pin: regPin.trim(),
        recoveryQuestion: regRecoveryQuestion.trim(),
        recoveryAnswer: regRecoveryAnswer.trim(),
      });

      // Auto login as Director into the new empty establishment
      onSuccess({
        name: res.directorName,
        role: 'DIRECTEUR',
      });
    } catch (err: any) {
      setRegError('Nisy olana teo am-pisoratana anarana. Andramo indray azafady.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const currentSchoolInfo = schoolsList.find((s) => s.id === activeSchoolId);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden py-10 font-sans">
      {/* Decorative backdrop glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with PWA install button */}
      <div className="absolute top-4 right-4 z-20">
        <PWAInstallHeaderButton />
      </div>

      {/* Brand Header */}
      <div className="text-center mb-6 relative z-10 max-w-lg">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-indigo-600 to-indigo-900 p-1 shadow-2xl shadow-indigo-950/80 mb-3.5">
          <img
            src="/pwa-192x192.png"
            alt="EduGest Logo"
            className="w-full h-full object-cover rounded-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/icon.svg';
            }}
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {db.settings.schoolName || 'EDUGEST MADAGASCAR'}
        </h1>
        <p className="text-xs text-amber-300 mt-1 uppercase tracking-widest font-bold">
          Logiciel Professionnel de Gestion Scolaire & Bulletins Officiels (EduGest)
        </p>
      </div>

      {/* Main Switcher: Connexion vs Inscription */}
      <div className="relative z-10 w-full max-w-lg mb-4">
        <div className="bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 flex gap-1 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setAuthMode('connexion');
              setIsResetMode(false);
            }}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              authMode === 'connexion'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Fidirana / Connexion
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('inscription');
              setRegError(null);
            }}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              authMode === 'inscription'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Fisoratana Anarana Sekoly Vaovao
          </button>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-700 relative z-10">
        {/* ========================================================================= */}
        {/* 1. CONNEXION MODE */}
        {/* ========================================================================= */}
        {authMode === 'connexion' && (
          <div>
            {/* Multi-School Selector in Connexion Mode */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 text-white">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  Sekoly idirana / Établissement scolaire :
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {schoolsList.length} voasoratra
                </span>
              </div>
              <div className="relative">
                <select
                  value={activeSchoolId}
                  onChange={(e) => handleSelectSchool(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  {schoolsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.isDemo ? '🏫 [DÉMO] ' : '🏫 '} {s.schoolName} — (Tale: {s.directorName})
                    </option>
                  ))}
                </select>
                {isSwitchingSchool && (
                  <RefreshCw className="w-4 h-4 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin pointer-events-none" />
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">
                  📍 {currentSchoolInfo?.address || 'Madagascar'}
                </span>
                {currentSchoolInfo?.isDemo ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[9px]">
                    Sekoly Santionany (Démo)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-bold text-[9px]">
                    Sekoly Voasoratra ao amin'ny Firestore
                  </span>
                )}
              </div>
            </div>

            {/* Role Switcher: DIRECTEUR vs ENSEIGNANT */}
            <div className="p-2 bg-slate-100 border-b border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('director');
                  setIsResetMode(false);
                }}
                className={`flex-1 py-3 px-3 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'director'
                    ? 'bg-white text-indigo-950 shadow-md border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${activeTab === 'director' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>Directeur (Admin / PIN)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('teacher');
                  setTeacherError(null);
                  setMultipleTeacherMatches(null);
                }}
                className={`flex-1 py-3 px-3 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'teacher'
                    ? 'bg-white text-indigo-950 shadow-md border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${activeTab === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span>Enseignant (Mot de passe)</span>
              </button>
            </div>

            {/* TAB: DIRECTEUR */}
            {activeTab === 'director' && (
              <div className="p-6 sm:p-8">
                {!isResetMode ? (
                  <form onSubmit={handleDirectorLogin} className="space-y-5">
                    <div className="text-center mb-4">
                      <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-2 border border-indigo-100 shadow-inner">
                        <KeyRound className="w-7 h-7" />
                      </div>
                      <h2 className="text-lg font-black text-slate-900">
                        Fidirana Tale — Espace Direction
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Ampidiro ny Code PIN Directeur anao hidirana amin'ny fitantanana ankapobeny (Mpampianatra, Kilasy, Taranja, Mpianatra, Bulletins).
                      </p>
                    </div>

                    {resetSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{resetSuccess}</span>
                      </div>
                    )}

                    {pinError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span className="font-medium">{pinError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Code PIN Tale / Code PIN Directeur
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          autoFocus
                          required
                          value={pin}
                          onChange={(e) => {
                            setPin(e.target.value);
                            setPinError(null);
                          }}
                          placeholder="••••"
                          maxLength={8}
                          className="w-full px-4 py-3.5 text-sm border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pl-11 pr-11 font-mono shadow-xs text-center tracking-widest text-lg"
                        />
                        <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[11px] text-slate-400">
                          {currentSchoolInfo?.isDemo ? 'PIN Démo : 1234' : 'PIN namboarin\'ny Tale'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsResetMode(true);
                            setPinError(null);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          Hadino ny PIN ? / PIN oublié ?
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Hiditra amin'ny Fitantanana (Espace Directeur)
                    </button>
                  </form>
                ) : (
                  /* Reset PIN Form */
                  <form onSubmit={handleResetPin} className="space-y-4">
                    <div className="text-center mb-3">
                      <div className="inline-flex p-2.5 rounded-2xl bg-amber-50 text-amber-600 mb-2 border border-amber-200">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                      <h2 className="text-base font-bold text-slate-900">
                        Fanarenana Code PIN / Récupération du PIN
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Valio ny fanontaniana miafina natsanganao mba hahafahana mametraka Code PIN vaovao.
                      </p>
                    </div>

                    {pinError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span className="font-medium">{pinError}</span>
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="text-slate-500 font-medium mb-1">Fanontaniana miafina :</div>
                      <div className="font-bold text-slate-800">
                        {db.adminAuth.recoveryQuestion || 'Tanàna nahaterahan\'ny Tale ?'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ny valiny miafinao / Votre réponse secrète
                      </label>
                      <input
                        type="text"
                        required
                        value={recoveryAnswer}
                        onChange={(e) => setRecoveryAnswer(e.target.value)}
                        placeholder="Ampidiro eto ny valiny..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Code PIN vaovao (4 isa farafahakeliny)
                      </label>
                      <input
                        type="password"
                        required
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="••••"
                        maxLength={8}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-center"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetMode(false);
                          setPinError(null);
                        }}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                      >
                        Hiverina
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                      >
                        Hamarino & Hanova PIN
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB: ENSEIGNANT */}
            {activeTab === 'teacher' && (
              <div className="p-6 sm:p-8 space-y-5">
                <div className="text-center mb-2">
                  <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-2 border border-indigo-100 shadow-inner">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <h2 className="text-lg font-black text-slate-900">
                    Fidirana Mpampianatra — Espace Enseignant
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Ampidiro eto fotsiny ny <span className="font-bold text-indigo-700">teny miafin'ny mpampianatra</span> (mot de passe enseignant) nomen'ny Tale anao. Tsy mila manoratra anarana !
                  </p>
                </div>

                {teacherError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="font-medium">{teacherError}</span>
                  </div>
                )}

                {/* Multiple matches disambiguation if two teachers have the same password */}
                {multipleTeacherMatches && multipleTeacherMatches.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                    <p className="text-xs font-bold text-amber-900">
                      Misy mpampianatra maromaro mampiasa an'io teny miafina io. Safidio ny anaranao :
                    </p>
                    <div className="space-y-1.5">
                      {multipleTeacherMatches.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectMatchingTeacher(t)}
                          className="w-full text-left px-3.5 py-2.5 bg-white hover:bg-amber-100/70 border border-amber-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div>
                            <span className="text-indigo-700">Prof. {t.firstName} {t.lastName}</span>
                            <span className="text-[10px] text-slate-400 font-mono ml-2">({t.matricule})</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-amber-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleTeacherPasswordLogin} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Teny Miafina Enseignant / Mot de Passe</span>
                      <span className="text-[10px] text-indigo-600 font-normal lowercase">
                        (Tsy mila manoratra anarana)
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type={showTeacherPass ? 'text' : 'password'}
                        autoFocus
                        required
                        value={teacherPassword}
                        onChange={(e) => {
                          setTeacherPassword(e.target.value);
                          setTeacherError(null);
                          setMultipleTeacherMatches(null);
                        }}
                        placeholder="••••••••"
                        className="w-full px-4 py-3.5 text-sm border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pl-11 pr-11 font-mono shadow-xs text-center tracking-widest text-lg"
                      />
                      <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowTeacherPass(!showTeacherPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showTeacherPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isTeacherLoggingIn}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <GraduationCap className="w-4 h-4" />
                    {isTeacherLoggingIn ? 'Eo am-panamarinana...' : 'Hijery ny Kilasiko & Hampiditra Naoty'}
                  </button>
                </form>

                {/* Demo Quick Chips (only displayed if viewing the Demo school) */}
                {currentSchoolInfo?.isDemo && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Teny miafina santionany amin'ny Sekoly Démo (1-Clic) :
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherPassword('razafy123');
                          setTeacherError(null);
                        }}
                        className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-left border border-slate-200 transition-colors text-[11px] cursor-pointer"
                      >
                        <div className="font-bold">Prof. RAZAFY Hery</div>
                        <div className="text-[10px] text-slate-500 font-mono">mdp: razafy123 (Maths/PC)</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherPassword('andrianina123');
                          setTeacherError(null);
                        }}
                        className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-left border border-slate-200 transition-colors text-[11px] cursor-pointer"
                      >
                        <div className="font-bold">Prof. ANDRIANINA Mamy</div>
                        <div className="text-[10px] text-slate-500 font-mono">mdp: andrianina123 (Fr/Mlg)</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. INSCRIPTION MODE (Fisoratana Anarana Sekoly Vaovao ao amin'ny Firestore) */}
        {/* ========================================================================= */}
        {authMode === 'inscription' && (
          <div className="p-6 sm:p-8 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="text-center mb-4">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-2 border border-indigo-100 shadow-inner">
                <School className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Fisoratana Anarana Sekoly Vaovao
              </h2>
              <div className="mt-2 p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-left">
                <p className="text-xs text-indigo-950 font-bold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  Fanombohana madio tanteraka (Données Isolées) :
                </p>
                <p className="text-[11px] text-indigo-900/90 leading-relaxed">
                  Ny sekoly vaovao dia manana toerana manokana ao amin'ny Firestore (tsy mifangaro amin'ny sekoly hafa). Manomboka madio (vide) tsy misy mpianatra na mpampianatra. Ny Tale no hampiditra ny kilasy, taranja, mpampianatra ary mpianatra ao aminy.
                </p>
              </div>
            </div>

            {regError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium">{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSchool} className="space-y-4">
              {/* Field 1: School Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Anaran'ny Sekoly / Nom de l'Établissement *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="ex: COLLÈGE PRIVÉ SAINTE-FAMILLE"
                    className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pl-10"
                  />
                  <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Field 2 & 3: Director Name & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Anaran'ny Tale / Nom Directeur *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={directorName}
                      onChange={(e) => setDirectorName(e.target.value)}
                      placeholder="ex: RAKOTO Jean"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pl-10 font-medium"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Titre Officiel
                  </label>
                  <input
                    type="text"
                    value={directorTitle}
                    onChange={(e) => setDirectorTitle(e.target.value)}
                    placeholder="ex: Le Directeur Général"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Field 4 & 5: Phone & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Finday / Téléphone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={schoolPhone}
                      onChange={(e) => setSchoolPhone(e.target.value)}
                      placeholder="+261 34 00 000 00"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pl-10"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Toerana / Ville / Adresse
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={schoolAddress}
                      onChange={(e) => setSchoolAddress(e.target.value)}
                      placeholder="Antananarivo"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pl-10"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email (Safidy)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    placeholder="contact@ecole.mg"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pl-10"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Field 6 & 7: PIN & PIN Confirm */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-700" />
                  <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    Famoronana Code PIN Directeur (Secret)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                      Code PIN Vaovao (Isa 4-8) *
                    </label>
                    <input
                      type="password"
                      required
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      placeholder="••••"
                      maxLength={8}
                      className="w-full px-3 py-2 text-sm border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-center tracking-widest bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                      Hamarino ny Code PIN *
                    </label>
                    <input
                      type="password"
                      required
                      value={regPinConfirm}
                      onChange={(e) => setRegPinConfirm(e.target.value)}
                      placeholder="••••"
                      maxLength={8}
                      className="w-full px-3 py-2 text-sm border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-center tracking-widest bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Field 8: Recovery Question & Answer */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fanontaniana & Valiny Miafina (Fanarenana PIN) *
                </label>
                <input
                  type="text"
                  required
                  value={regRecoveryQuestion}
                  onChange={(e) => setRegRecoveryQuestion(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  required
                  value={regRecoveryAnswer}
                  onChange={(e) => setRegRecoveryAnswer(e.target.value)}
                  placeholder="Ny valiny miafinao (ex: antananarivo)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReg}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmittingReg ? 'Eo am-pamoronana ao amin\'ny Firestore...' : 'Mamorona ny Sekoly & Hiditra amin\'ny Fitantanana'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('connexion')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                >
                  Efa manana kaonty sekoly ? Midira eto (Connexion)
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-6 relative z-10 text-center">
        © 2026 {db.settings.schoolName} · Rafitra Fitantanana Sekoly, Bulletins & Naoty Ofisialy
      </p>
    </div>
  );
};
