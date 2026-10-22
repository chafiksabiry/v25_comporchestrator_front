// Parcours complet dans un navigateur réel (nécessite Playwright + Chromium). Lancer d'abord : npm run build && npx vite preview --port 5190
// Puis : node e2e/walkthrough.cjs
const { chromium } = require('playwright');
const assert = require('assert');
const URL = 'http://localhost:5190';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  const errors = []; p.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
  p.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = (n) => p.screenshot({ path: `e2e/shots/${n}.png`, fullPage: true });
  const t0 = Date.now();

  await p.goto(URL + '/');
  await p.waitForURL('**/onboarding');
  await shot('01-company');

  // 1 Entreprise
  await p.fill('#co-name', 'Acme Services');
  await p.fill('#co-siren', '123');
  assert(await p.getByText('SIREN invalide').isVisible(), 'SIREN invalide doit être signalé');
  assert(await p.getByRole('button', { name: 'Continuer' }).isDisabled(), 'Continuer désactivé tant que le formulaire est invalide');
  await p.fill('#co-siren', '732 829 320');
  await p.fill('#co-email', 'direction@acme.fr');
  await p.setInputFiles('#co-docs', { name: 'kbis.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') });
  await p.getByRole('button', { name: 'Continuer' }).click();

  // 2 Modèle
  await p.getByRole('button', { name: /Équipe commerciale sortante/ }).click();
  assert(await p.getByText(/consentement préalable du contact/).isVisible(), 'avertissement consentement attendu');
  await p.getByRole('button', { name: /Service client entrant/ }).click();
  await shot('02-template');
  await p.getByRole('button', { name: 'Continuer' }).click();

  // 3 Équipe
  await p.fill('#emails', 'marie.dupont@acme.fr, jean.martin@acme.fr; pasunemail\nmarie.dupont@acme.fr');
  assert(await p.getByText('pasunemail · invalide').isVisible());
  assert(await p.getByText('marie.dupont@acme.fr · doublon').isVisible());
  await p.getByRole('button', { name: 'Envoyer les invitations' }).click();
  await p.getByText('2 invitation(s) envoyée(s)').waitFor();
  await shot('03-team');
  await p.getByRole('button', { name: 'Continuer' }).click();

  // 4 Forfait et solde
  assert(await p.getByRole('button', { name: 'Continuer' }).isDisabled());
  await p.getByRole('button', { name: /Équipe Piloter/ }).click();
  await p.getByRole('button', { name: 'Enregistrer une carte de démonstration' }).click();
  await p.getByRole('button', { name: '50 €' }).click();
  await p.getByRole('button', { name: 'Recharger' }).click();
  await shot('04-plan');
  await p.getByRole('button', { name: 'Continuer' }).click();

  // 5 Téléphonie
  await p.getByRole('button', { name: 'Rechercher' }).click();
  await p.getByRole('button', { name: 'Choisir' }).first().click();
  await shot('05-telephony');
  await p.getByRole('button', { name: 'Continuer' }).click();

  // 6 File et script
  await p.getByRole('button', { name: 'Valider' }).click();

  // 7 Appel test (mobile)
  await p.getByLabel('Numéro à appeler').fill('06 12 34 56 78');
  await p.getByRole('button', { name: 'Appeler' }).click();
  await p.getByTestId('active-call').waitFor();
  assert(await p.getByText('la sonnerie n’est pas facturée').isVisible(), 'sonnerie non facturée');
  await p.getByText('Sortant · En conversation').waitFor({ timeout: 6000 });
  await shot('07-test-call');
  await p.waitForTimeout(1200);
  await p.getByTestId('hangup').click();
  await p.getByText('Appel de test réussi.').waitFor();
  const elapsed = Date.now() - t0;
  await p.getByRole('button', { name: 'Terminer la mise en route' }).click();
  await p.waitForURL('**/app/dashboard');
  await shot('08-dashboard');

  // Solde : 50 € - 1 min mobile (0,0525 €)
  const chip = await p.getByTestId('wallet-chip').innerText();
  console.log('Solde après appel test :', chip.replace(/\s+/g, ' '));
  assert(/49,9475/.test(chip.replace(/ | /g, ' ')), 'débit attendu : 1 min mobile = 0,0525 €');

  // Appels : détail facturé
  await p.goto(URL + '/app/calls');
  const row = await p.getByTestId('calls-table').innerText();
  assert(/Sortant — mobile France/.test(row) && /1 min/.test(row), 'ligne de facturation attendue');

  // Appel entrant simulé avec transfert
  await p.getByRole('button', { name: 'Simuler un appel entrant' }).click();
  await p.getByText('Entrant · Menu vocal').waitFor();
  await p.getByText('Entrant · File d’attente').waitFor({ timeout: 6000 });
  await p.getByText('Entrant · En conversation').waitFor({ timeout: 10000 });
  await p.getByRole('button', { name: 'Transférer' }).click();
  await p.waitForTimeout(800);
  await p.getByTestId('hangup').click();
  await p.waitForTimeout(300);
  await shot('09-calls');
  const rows = await p.getByTestId('calls-table').innerText();
  assert(/Entrant — France/.test(rows) && /Transfert/.test(rows), 'entrant + transfert attendus');

  // Facturation : simulateur (2 min 10 + transfert 20 s = 3 + 1 min)
  await p.goto(URL + '/app/billing');
  await p.getByLabel('Conversation (s)').fill('130');
  await p.getByLabel('Transfert (s)').fill('20');
  const sim = await p.getByTestId('sim-result').innerText();
  assert(/3 min/.test(sim) && /1 min/.test(sim) && /Total : 4 min/.test(sim), 'simulateur 3+1 min : ' + sim);
  await p.getByRole('button', { name: 'Simuler : échec il y a 6 j' }).click();
  assert(await p.getByText('dernier avertissement').first().isVisible());
  const cd = await p.getByTestId('release-countdown').innerText();
  console.log('Compte à rebours libération (jour 6) :', cd);
  await shot('10-billing-dunning');
  // sortant suspendu à J+3, entrant actif
  await p.goto(URL + '/app/calls');
  assert(await p.getByText('Appels sortants suspendus').first().isVisible(), 'sortant suspendu');
  assert(await p.getByRole('button', { name: 'Simuler un appel entrant' }).isEnabled(), 'entrant encore actif');
  await p.goto(URL + '/app/billing');
  await p.getByRole('button', { name: 'Régulariser le paiement' }).click();
  await p.getByText('Aucun incident de paiement.').waitFor();

  // Planning (forfait Équipe)
  await p.goto(URL + '/app/planning');
  await p.getByRole('button', { name: /Lun 9h/ }).click();
  await p.getByRole('button', { name: /Lun 9h : 1 agent/ }).waitFor();
  await p.waitForTimeout(500);
  const bg = await p.getByRole('button', { name: /Lun 9h : 1 agent/ }).evaluate((el) => getComputedStyle(el).backgroundColor);
  console.log('Couleur case planning sélectionnée :', bg);
  assert(bg === 'rgb(237, 28, 36)', 'la case de l’agent sélectionné doit être pleine : ' + bg);
  await shot('11-planning');

  // Qualité & IA : débit de jetons
  await p.goto(URL + '/app/quality');
  const before = await p.getByTestId('wallet-chip').innerText();
  await p.getByRole('button', { name: /Évaluer/ }).first().click();
  await p.waitForTimeout(300);
  const after = await p.getByTestId('wallet-chip').innerText();
  assert(before !== after, 'les jetons IA doivent être débités du solde');
  await shot('12-quality');

  // Forfait Essentiel : fonctions verrouillées
  await p.goto(URL + '/app/billing');
  await p.locator('div', { hasText: /^Essentiel/ }).getByRole('button', { name: 'Choisir' }).first().click();
  await p.goto(URL + '/app/quality');
  assert(await p.getByText('Cette fonction n’est pas incluse dans votre forfait').isVisible(), 'verrou IA sous Essentiel');
  await shot('13-locked');

  // Solde nul : appels bloqués
  await p.evaluate(() => {
    const k = 'harx-callcenter-state-v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.wallet.balanceUnits = 0;
    localStorage.setItem(k, JSON.stringify(s));
  });
  await p.goto(URL + '/app/calls');
  assert(await p.getByText('Solde épuisé').first().isVisible(), 'solde épuisé affiché');
  assert(await p.getByRole('button', { name: 'Appeler' }).isDisabled(), 'appel bloqué à solde nul');
  await shot('14-empty-wallet');

  console.log('Durée du parcours de démonstration (automatisé) :', Math.round(elapsed / 1000), 's');
  console.log('Erreurs console :', errors.length ? errors : 'aucune');
  await b.close();
  if (errors.length) process.exit(1);
  console.log('E2E OK');
})().catch((e) => { console.error('E2E ÉCHEC :', e.message); process.exit(1); });
