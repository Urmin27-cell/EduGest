import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  Share,
  PlusSquare,
  Globe,
} from 'lucide-react';

export const PWAInstallModal: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showIOSSteps, setShowIOSSteps] = useState<boolean>(false);

  useEffect(() => {
    // If already running in standalone mode, never show
    if (isInstalled) return;

    // Check if dismissed in this session
    const hasDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
    if (hasDismissed) return;

    // Automatically display the centered modal after 1.2s on first visit
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSSteps(true);
      return;
    }

    if (isInstallable) {
      const success = await install();
      if (success) {
        setIsOpen(false);
      }
    } else {
      // Fallback for browsers that don't emit beforeinstallprompt (e.g., Firefox, Safari desktop)
      setShowIOSSteps(true);
    }
  };

  if (isInstalled || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      {/* Centered Modal Container */}
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl shadow-2xl border border-indigo-500/30 overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* App Logo & Title */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-amber-400 via-indigo-600 to-indigo-900 p-1 shadow-xl shadow-indigo-950/60 flex items-center justify-center">
              <img
                src="/pwa-192x192.png"
                alt="ColéGestion Logo"
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  // Fallback to SVG if PNG not yet generated
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-md">
              PWA APP
            </span>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Application Installable
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1.5">
              EduGest Madagascar
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
              Ampidiro mivantana amin'ny solosainao na findainao ity fampiharana EduGest ity mba hahafahana mampiasa azy toy ny logiciel tena izy !
            </p>
          </div>
        </div>

        {/* Highlights */}
        {!showIOSSteps && (
          <div className="grid grid-cols-2 gap-2.5 py-1">
            <div className="flex items-center gap-2.5 p-2.5 bg-white/5 border border-white/10 rounded-2xl">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">Haingana be</div>
                <div className="text-[10px] text-slate-400">Tsy mila navigateur</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 bg-white/5 border border-white/10 rounded-2xl">
              <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">Mode Hors-ligne</div>
                <div className="text-[10px] text-slate-400">Mandeha foana</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 bg-white/5 border border-white/10 rounded-2xl">
              <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">Ecran d'accueil</div>
                <div className="text-[10px] text-slate-400">Kisary eo amin'ny birao</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 bg-white/5 border border-white/10 rounded-2xl">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">Voaaro 100%</div>
                <div className="text-[10px] text-slate-400">Firebase Real-time</div>
              </div>
            </div>
          </div>
        )}

        {/* Step by step for iOS / Unsupported browsers */}
        {showIOSSteps && (
          <div className="p-4 bg-white/10 border border-white/15 rounded-2xl text-left space-y-3">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              Torolàlana amin'ny fametrahana (iPhone, iPad na Safari) :
            </div>
            <ol className="text-xs text-slate-200 space-y-2 list-decimal list-inside">
              <li className="flex items-start gap-2">
                <Share className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
                <span>Kitiho ny bokotra <strong>« Partager / Share »</strong> eo amin'ny navigateur-nao.</span>
              </li>
              <li className="flex items-start gap-2">
                <PlusSquare className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>Safidio ny <strong>« Sur l'écran d'accueil / Add to Home Screen »</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <span>Kitiho ny <strong>« Ajouter / Add »</strong> dia ho hita eo amin'ny findainao avy hatrany !</span>
              </li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-indigo-600/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Installer EduGest
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Aoka ihany (Continuer sur navigateur)
          </button>
        </div>
      </div>
    </div>
  );
};

export const PWAInstallHeaderButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState<boolean>(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
        title="Installer l'application sur votre appareil"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Installer App</span>
        <span className="sm:hidden">Install</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 text-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-700 space-y-4">
            <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Installation de l'application
            </h3>
            <p className="text-xs text-slate-300">
              Raha mampiasa Chrome na Edge ianao dia kitiho ny kisary <strong>Install</strong> eo amin'ny bara adiresy.
              <br />
              Raha amin'ny iPhone/iPad dia kitiho ny <strong>Partager</strong> ➔ <strong>Sur l'écran d'accueil</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              Mazava tsara (Fermer)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
