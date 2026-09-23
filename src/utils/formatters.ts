export function formatDateFr(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeFr(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export function formatRank(rank: number | null | undefined): string {
  if (rank === null || rank === undefined) return '-';
  if (rank === 1) return '1er';
  return `${rank}ème`;
}

export function formatScore(score: number | null | undefined, maxGrade = 20): string {
  if (score === null || score === undefined) return 'Non renseigné';
  return `${score.toFixed(2)} / ${maxGrade}`;
}

export function getAppreciationPreset(average: number | null): string {
  if (average === null) return 'Non évalué';
  if (average >= 16) return 'Excellent trimestre. Félicitations du Conseil de Classe.';
  if (average >= 14) return 'Très bon travail. Tableau d\'honneur.';
  if (average >= 12) return 'Bon trimestre dans l\'ensemble. Poursuivez vos efforts.';
  if (average >= 10) return 'Trimestre convenable. Des progrès sont encore possibles.';
  if (average >= 8) return 'Résultats insuffisants. Doit redoubler d\'efforts et de rigueur.';
  return 'Très insuffisant. Un sérieux ressaisissement est indispensable.';
}
