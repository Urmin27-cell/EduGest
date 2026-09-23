import React, { useState } from 'react';
import { ClassRoom, Student } from '../types';
import { parseStudentsCSV, downloadCSV } from '../utils/csvHelpers';
import { Upload, Download, FileText, Check, AlertCircle, X } from 'lucide-react';

interface CsvImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  onImportSuccess: (count: number) => void;
  user: string;
}

export const CsvImportExportModal: React.FC<CsvImportExportModalProps> = ({
  isOpen,
  onClose,
  classes,
  onImportSuccess,
  user,
}) => {
  const [targetClassId, setTargetClassId] = useState<string>(classes[0]?.id || '');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedStudents, setParsedStudents] = useState<Array<Partial<Student>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const sample = [
      'Nom;Prenom;Sexe;Date_Naissance;Telephone_Parent;Adresse',
      'ANDRIAMANAMPISOA;Tojo;M;2012-05-14;+261 34 12 345 67;Lot II B 12 Antananarivo',
      'RAVAOARIMANANA;Miora;F;2012-09-21;+261 33 98 765 43;Lot IV K 45 Mahamasina',
      'RAKOTONDRABE;Hery;M;2012-02-03;+261 32 44 556 67;Lot I J 78 Analakely',
    ].join('\n');
    downloadCSV(sample, 'modele_import_eleves.csv');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      try {
        const parsed = parseStudentsCSV(text, targetClassId);
        if (parsed.length === 0) {
          setError('Aucun élève valide trouvé dans le fichier. Vérifiez les séparateurs (point-virgule ou virgule).');
        } else {
          setParsedStudents(parsed);
        }
      } catch (err) {
        setError('Erreur lors de la lecture du fichier CSV.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedStudents.length === 0) {
      setError('Aucun élève à importer.');
      return;
    }
    setLoading(true);
    try {
      const { dbService } = await import('../services/dbService');
      const count = await dbService.importStudentsBatch(parsedStudents, user);
      onImportSuccess(count);
      onClose();
    } catch (err) {
      setError("Erreur lors de l'enregistrement des élèves.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Importer des élèves par fichier CSV</h3>
              <p className="text-xs text-slate-300">Ajout rapide de classes entières</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs">
            <span className="text-slate-700">Besoin du format exact ?</span>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger le modèle CSV
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Classe de destination pour ces élèves *
            </label>
            <select
              value={targetClassId}
              onChange={(e) => {
                setTargetClassId(e.target.value);
                if (fileContent) {
                  setParsedStudents(parseStudentsCSV(fileContent, e.target.value));
                }
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {classes
                .filter((c) => !c.isArchived)
                .map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.level})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Fichier CSV / Excel exporté
            </label>
            <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20 transition-all">
              <FileText className="w-8 h-8 text-indigo-600 mb-2" />
              <span className="text-sm font-semibold text-slate-700">
                {fileName ? fileName : 'Cliquez pour sélectionner votre fichier .csv'}
              </span>
              <span className="text-xs text-slate-400 mt-1">Encodage UTF-8 recommandé</span>
              <input
                type="file"
                accept=".csv, text/csv, text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {parsedStudents.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>{parsedStudents.length} élève(s) détecté(s) :</span>
                <span className="text-emerald-700">Format valide</span>
              </div>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                {parsedStudents.map((s, idx) => (
                  <div key={idx} className="p-2 flex justify-between items-center bg-white hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900">{s.lastName}</span>{' '}
                      <span className="text-slate-700">{s.firstName}</span>
                      <span className="text-slate-400 ml-2">({s.gender === 'F' ? 'F' : 'M'})</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">{s.guardianPhone || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={loading || parsedStudents.length === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Importation en cours...' : `Confirmer l'importation (${parsedStudents.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
