import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, AlertTriangle } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-600/95 text-white px-4 py-2.5 text-xs font-bold shadow-2xl backdrop-blur-md border border-amber-400/40 animate-bounce">
      <WifiOff className="w-4 h-4 text-amber-200" />
      <span>Miasa Hors-Ligne (Tsy misy Internet) — Mbola azo ampiasaina ny angona voatahiry.</span>
    </div>
  );
};
