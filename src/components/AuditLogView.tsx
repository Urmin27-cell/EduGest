import React, { useState } from 'react';
import { SchoolDatabase } from '../types';
import { formatDateTimeFr } from '../utils/formatters';
import { History, Search, ShieldCheck, Filter } from 'lucide-react';

interface AuditLogViewProps {
  db: SchoolDatabase;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ db }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  const logs = db.activityLogs || [];

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'ALL' && !log.action.includes(selectedAction)) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchUser = log.userName.toLowerCase().includes(q);
      if (!matchAction && !matchDetails && !matchUser) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          Journal d'Audit & Traçabilité ({filteredLogs.length} événements)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Historique immuable de toutes les opérations administratives, saisies de notes et validations
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par action, utilisateur ou détail..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
            >
              <option value="ALL">Toutes les actions</option>
              <option value="NOTE">Saisie & Modifications de notes</option>
              <option value="BULLETIN">Validations de bulletins</option>
              <option value="ELEVE">Gestion des élèves</option>
              <option value="ENSEIGNANT">Gestion des enseignants</option>
              <option value="PRESENCE">Appel & Présences</option>
              <option value="PARAMETRES">Paramètres système</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-3 w-40">Date & Heure</th>
                <th className="p-3 w-44">Utilisateur / Auteur</th>
                <th className="p-3 w-52">Action</th>
                <th className="p-3">Détails de l'opération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-mono text-slate-500 text-[11px]">
                    {formatDateTimeFr(log.timestamp)}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-800">{log.userName}</span>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      {log.userRole || 'Utilisateur'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-900 font-semibold text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
