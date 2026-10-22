import { describe, expect, it } from 'vitest';
import { dunningState, formatCountdown } from './dunning';

const failed = new Date('2026-03-01T10:00:00Z');
const plus = (days: number) => new Date(failed.getTime() + days * 86_400_000);

describe('relance en cas d’échec de paiement', () => {
  it('aucun échec : tout est autorisé', () => {
    const s = dunningState(null, plus(0));
    expect(s.stage).toBe('ok');
    expect(s.outboundAllowed && s.inboundAllowed).toBe(true);
    expect(s.msUntilRelease).toBeNull();
  });

  it('jour 1 : nouvelle tentative, tout reste actif', () => {
    const s = dunningState(failed, plus(1));
    expect(s.stage).toBe('retrying');
    expect(s.outboundAllowed).toBe(true);
    expect(s.nextEventLabel).toBe('Nouvelle tentative de prélèvement');
  });

  it('jour 3 : sortant suspendu, entrant actif', () => {
    const s = dunningState(failed, plus(3));
    expect(s.stage).toBe('outbound_suspended');
    expect(s.outboundAllowed).toBe(false);
    expect(s.inboundAllowed).toBe(true);
  });

  it('jour 6 : dernier avertissement avec compte à rebours d’un jour', () => {
    const s = dunningState(failed, plus(6));
    expect(s.stage).toBe('release_warning');
    expect(s.msUntilRelease).toBe(86_400_000);
    expect(formatCountdown(s.msUntilRelease!)).toBe('1 j 0 h');
  });

  it('jour 7 : numéro libéré, plus rien d’actif', () => {
    const s = dunningState(failed, plus(7));
    expect(s.stage).toBe('released');
    expect(s.inboundAllowed).toBe(false);
    expect(s.msUntilRelease).toBe(0);
    expect(s.nextEventAt).toBeNull();
  });
});
