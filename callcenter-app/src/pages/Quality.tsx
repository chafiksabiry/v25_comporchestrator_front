import { Sparkles } from 'lucide-react';
import { formatEur, tokenChargeUnits } from '@/domain/billing';
import { useAppState } from '@/store/store';
import { evaluateCallWithAi } from '@/store/actions';
import { Badge, Empty, Gate, Notice, PageHeader } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';

function QualityInner() {
  const { calls, settings } = useAppState();
  const answered = calls.filter((c) => c.answered || c.legs.some((l) => l.seconds > 0));
  return (
    <div className="space-y-4">
      <Notice tone="info">
        Le forfait donne accès aux fonctions IA ; chaque utilisation est débitée du solde prépayé (jetons au coût fournisseur + marge). Évaluation simulée en mode démonstration.
      </Notice>
      {answered.length === 0 ? (
        <Empty title="Aucun appel à évaluer" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-wider text-harx-muted"><th className="pb-2">Appel</th><th className="pb-2">Évaluation</th><th /></tr></thead>
            <tbody className="divide-y divide-harx-border">
              {answered.map((c) => {
                const seconds = c.legs.reduce((s, l) => s + l.seconds, 0);
                const estimate = tokenChargeUnits(1500 + seconds * 20, settings.tokenCard);
                return (
                  <tr key={c.id}>
                    <td className="py-2"><p className="font-bold">{c.remote}</p><p className="text-xs text-harx-muted">{fmtDateTime(c.at)}</p></td>
                    <td className="py-2">
                      {c.aiEvaluation ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={c.aiEvaluation.sentiment === 'positif' ? 'good' : c.aiEvaluation.sentiment === 'négatif' ? 'bad' : 'default'}>{c.aiEvaluation.sentiment}</Badge>
                          <Badge tone={c.aiEvaluation.outcome === 'résolu' ? 'good' : 'warn'}>{c.aiEvaluation.outcome}</Badge>
                          {c.aiEvaluation.fraudSuspected ? <Badge tone="bad">Fraude suspectée</Badge> : null}
                          <span className="text-xs text-harx-muted">{c.aiEvaluation.tokens.toLocaleString('fr-FR')} jetons</span>
                        </div>
                      ) : <span className="text-xs text-harx-muted">Non évalué</span>}
                    </td>
                    <td className="py-2 text-right">
                      {!c.aiEvaluation ? (
                        <button className="btn-secondary !py-1.5 !text-xs" onClick={() => evaluateCallWithAi(c.id)}>
                          <Sparkles className="h-3.5 w-3.5" /> Évaluer (≈ {formatEur(estimate, 4)})
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Quality() {
  return (
    <div>
      <PageHeader title="Qualité et IA" subtitle="Évaluation des appels : sentiment, résultat, fraude." />
      <Gate group="E"><QualityInner /></Gate>
    </div>
  );
}
