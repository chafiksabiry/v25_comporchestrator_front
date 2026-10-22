import { describe, expect, it } from 'vitest';
import {
  balanceLevel,
  billedMinutes,
  callCharge,
  canPlaceCall,
  credit,
  debit,
  inboundLeg,
  outboundLeg,
  pricePerMinuteUnits,
  shouldCutOngoingCall,
  tokenChargeUnits,
  toUnits,
  transferLeg,
  type RateCard,
} from './billing';

// Tarifs de test uniquement (aucune valeur contractuelle).
const card: RateCard = {
  currency: 'EUR',
  costPerMinute: { outbound_fixed_fr: 0.02, outbound_mobile_fr: 0.04, inbound_fr: 0.01 },
  marginRate: 0.5,
};

describe('minute commencée = minute facturée', () => {
  it.each([
    [0, 0],
    [1, 1],
    [10, 1],
    [60, 1],
    [61, 2],
    [62, 2],
    [125, 3],
  ])('%i s -> %i min', (s, m) => expect(billedMinutes(s)).toBe(m));

  it('ignore les valeurs invalides', () => {
    expect(billedMinutes(-5)).toBe(0);
    expect(billedMinutes(NaN)).toBe(0);
  });
});

describe('prix par minute = coût + marge', () => {
  it('applique la marge prédéfinie', () => {
    expect(pricePerMinuteUnits(card, 'outbound_fixed_fr')).toBe(toUnits(0.03));
    expect(pricePerMinuteUnits(card, 'outbound_mobile_fr')).toBe(toUnits(0.06));
    expect(pricePerMinuteUnits(card, 'inbound_fr')).toBe(toUnits(0.015));
  });
});

describe('sortant : décompte à partir du décroché', () => {
  it('un appel sans réponse ne coûte rien', () => {
    const c = callCharge(card, [outboundLeg({ id: 'a', rateClass: 'outbound_fixed_fr', talkSeconds: 0 })]);
    expect(c.minutes).toBe(0);
    expect(c.units).toBe(0);
  });

  it('5 secondes de discussion = 1 minute', () => {
    const c = callCharge(card, [outboundLeg({ id: 'a', rateClass: 'outbound_fixed_fr', talkSeconds: 5 })]);
    expect(c.minutes).toBe(1);
    expect(c.units).toBe(toUnits(0.03));
  });
});

describe('entrant : menu vocal + file d’attente + conversation', () => {
  it('additionne les trois durées avant d’arrondir', () => {
    const leg = inboundLeg({ id: 'i', ivrSeconds: 20, queueSeconds: 100, talkSeconds: 61 });
    expect(leg.seconds).toBe(181);
    const c = callCharge(card, [leg]);
    expect(c.minutes).toBe(4);
    expect(c.units).toBe(4 * toUnits(0.015));
  });

  it('un appelant qui raccroche dans la file est facturé', () => {
    const c = callCharge(card, [inboundLeg({ id: 'i', ivrSeconds: 10, queueSeconds: 40, talkSeconds: 0 })]);
    expect(c.minutes).toBe(1);
  });
});

describe('transfert = seconde communication arrondie séparément', () => {
  it('2 min 10 + transfert de 20 s = 3 + 1 minutes', () => {
    const c = callCharge(card, [
      outboundLeg({ id: 'm', rateClass: 'outbound_fixed_fr', talkSeconds: 130 }),
      transferLeg({ id: 't', rateClass: 'outbound_fixed_fr', talkSeconds: 20 }),
    ]);
    expect(c.legs.map((l) => l.minutes)).toEqual([3, 1]);
    expect(c.minutes).toBe(4);
  });
});

describe('solde prépayé à zéro', () => {
  it('autorise un appel avec un solde positif', () => {
    expect(canPlaceCall({ balanceUnits: 1 })).toBe(true);
  });

  it('bloque les nouveaux appels à zéro ou en négatif', () => {
    expect(canPlaceCall({ balanceUnits: 0 })).toBe(false);
    expect(canPlaceCall({ balanceUnits: -10 })).toBe(false);
  });

  it('l’appel en cours se termine même si le solde devient négatif', () => {
    const w = debit({ balanceUnits: 100 }, 400);
    expect(w.balanceUnits).toBe(-300);
    expect(shouldCutOngoingCall({ balanceUnits: 100 }, 400, null)).toBe(false);
  });

  it('coupe seulement si un plafond de dépassement est configuré et dépassé', () => {
    expect(shouldCutOngoingCall({ balanceUnits: 100 }, 400, 200)).toBe(true);
    expect(shouldCutOngoingCall({ balanceUnits: 100 }, 250, 200)).toBe(false);
  });

  it('une recharge relève le solde', () => {
    expect(credit({ balanceUnits: -300 }, 1000).balanceUnits).toBe(700);
  });

  it('alerte avant le zéro', () => {
    const perMin = toUnits(0.03);
    expect(balanceLevel({ balanceUnits: perMin * 100 }, perMin)).toBe('ok');
    expect(balanceLevel({ balanceUnits: perMin * 10 }, perMin)).toBe('low');
    expect(balanceLevel({ balanceUnits: 0 }, perMin)).toBe('empty');
  });
});

describe('jetons IA', () => {
  it('coût + marge, proportionnel au nombre de jetons', () => {
    const tokens = { costPerMillionTokens: 10, marginRate: 0.5 };
    expect(tokenChargeUnits(1_000_000, tokens)).toBe(toUnits(15));
    expect(tokenChargeUnits(100_000, tokens)).toBe(toUnits(1.5));
    expect(tokenChargeUnits(0, tokens)).toBe(0);
  });
});
