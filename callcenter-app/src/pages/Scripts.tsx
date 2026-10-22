import { useEffect, useState } from 'react';
import { saveScript } from '@/store/actions';
import { useAppState } from '@/store/store';
import { Gate, PageHeader } from '@/components/ui';

function ScriptsInner() {
  const { script } = useAppState();
  const [text, setText] = useState(script);
  useEffect(() => setText(script), [script]);
  return (
    <div className="card space-y-3">
      <label className="label" htmlFor="script-edit">Script d’appel</label>
      <textarea id="script-edit" className="input min-h-[300px] font-mono" value={text} onChange={(e) => setText(e.target.value)} />
      <p className="text-xs font-medium text-harx-muted">Variables : {'{{entreprise}}'}, {'{{agent}}'}, {'{{contact}}'}.</p>
      <button className="btn-primary" disabled={text === script} onClick={() => saveScript(text)}>Enregistrer</button>
    </div>
  );
}

export default function Scripts() {
  return (
    <div>
      <PageHeader title="Scripts" subtitle="Le script s’affiche à l’agent pendant l’appel." />
      <Gate group="C"><ScriptsInner /></Gate>
    </div>
  );
}
