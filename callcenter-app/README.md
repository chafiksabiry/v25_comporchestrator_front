# HARX Call Center

Application dédiée aux petits centres d'appels (internes à une entreprise ou externes) : **opérationnel en 10 minutes**.
Elle est séparée de l'offre Transaction-as-a-Service (pas de place de marché, pas de mise en relation d'agents)
mais réutilise les briques et les API HARX existantes.

> Statut : première version fonctionnelle en **mode démonstration**. Les règles de facturation, le parcours,
> les forfaits et l'interface sont réels et testés. La téléphonie, l'achat de numéros, les files et le planning
> sont simulés (voir « Ce qui reste à brancher »).

## Lancer

```bash
npm install
npm run dev        # http://localhost:5190
npm test           # règles métier (34 tests)
npm run build      # typecheck + build
```

`VITE_DATA_MODE=live` (voir `.env.example`) branche l'invitation des agents et la lecture du solde sur les API HARX
existantes ; tout le reste reste simulé. Sans cette variable, tout fonctionne en local (localStorage).

## Parcours (budget : 9 min dans l'application + 1 min de création de compte en amont)

| # | Étape | Budget |
|---|---|---|
| 1 | Entreprise et justificatifs KYB (SIREN contrôlé) | 1 min |
| 2 | Modèle : service client entrant / équipe commerciale sortante / support interne | 1 min |
| 3 | Équipe : saisie des adresses email | 1 min |
| 4 | Forfait (carte) et première recharge du solde prépayé | 2 min |
| 5 | Numéro français (acheté au besoin) | 2 min |
| 6 | File et script pré-remplis par le modèle | 1 min |
| 7 | Appel de test | 1 min |

Le chronomètre du parcours est affiché ; un dépassement de budget d'étape est signalé.

## Règles de facturation (src/domain/billing.ts)

- Minute commencée = minute facturée, **par communication**.
- Sortant : décompte à partir du décroché (la sonnerie n'est pas facturée).
- Entrant : menu vocal + file d'attente + conversation facturés.
- Transfert : seconde communication, arrondie séparément.
- Minutes et jetons IA : coût fournisseur + marge prédéfinie, débités d'un solde prépayé.
- Solde nul : l'appel en cours se termine, les suivants sont bloqués (plafond de dépassement optionnel).
- Abonnement, lignes et numéros : paiement par carte en début de période ; échec → relance, suspension du sortant,
  avertissement, libération du numéro avec compte à rebours (`src/domain/dunning.ts`, durées par défaut à valider).
- Une ligne incluse par abonnement ; les suivantes sont des licences facturées.

## Forfaits (src/domain/plans.ts)

Onze groupes de fonctionnalités (A–K) et trois paliers (Essentiel, Équipe, Multi-clients) qui varient par les
fonctions accessibles. L'IA est un accès (groupe E) ; son usage est facturé au jeton. **Aucun prix** n'est défini.

## À définir avant la mise en production

- `src/store/store.ts` : `DEMO_RATE_CARD` et `DEMO_TOKEN_CARD` sont des valeurs de démonstration. Les remplacer par
  les coûts opérateur par destination et les marges prédéfinies.
- Prix des forfaits, des lignes supplémentaires et des numéros.
- Durées de relance de paiement (`DEFAULT_DUNNING_POLICY`).
- Règle d'arrondi de l'opérateur retenu (Twilio ou Telnyx) : à aligner pour ne pas perdre de marge.
- Coût éventuel de la liaison du softphone web chez l'opérateur.

## Ce qui reste à brancher

| Fonction | État | Piste |
|---|---|---|
| Agents (invitation) | API réelle en mode `live` | `/api/call-center/agents` (le champ `phone` est typé obligatoire côté client existant : envoyé vide, à vérifier côté serveur) |
| Solde | Lecture réelle en mode `live` | `/wallet-company/:id`. Le modèle existant gère un solde en euros **et** des minutes en packs (`/minutes-company`) ; il faut l'aligner sur le débit par destination décidé ici |
| Achat de numéros | Simulé | `/phone-numbers/search/twilio`, `/phone-numbers/purchase`, `/phone-numbers/checkout/*` (contrat non vérifié) |
| Softphone | Moteur simulé (`features/softphone/callEngine.ts`) | Implémenter `SoftphoneProvider` avec `@twilio/voice-sdk` ou `@telnyx/webrtc`, déjà utilisés dans le micro-frontend entreprise |
| Abonnement | Simulé | `/api/subscriptions` et paiement intégré Stripe du micro-frontend entreprise |
| Files, planning, présence | Simulés (état local) | Backend à créer ; le Scheduler existant est à réorienter vers la planification par file |
| Évaluation IA | Simulée, jetons facturés | Moteur d'analyse d'appels HARX existant |
| Preuve de consentement (prospection) | Avertissement dans le parcours seulement | Registre de consentement par contact à créer ; vérifier le texte applicable avant de lancer une campagne |
| Stockage des justificatifs KYB | Noms de fichiers uniquement | Envoi à HARX et conservation légale |

## Mutualisation avec le reste de HARX

La session est partagée avec l'application d'inscription (cookies `userId`, `companyId`, `localStorage.token`),
donc le même compte fonctionne. Les composants communs (thème Tailwind HARX, règle de minute commencée,
SDK téléphoniques) sont repris tels quels. L'étape suivante est d'extraire les briques réutilisables
(téléphonie, scripts, base de connaissances, évaluation d'appels) dans un paquet partagé consommé par les deux produits.

## Vérification

`e2e/walkthrough.cjs` parcourt l'application dans Chromium : mise en route complète, appel sortant mobile,
appel entrant avec transfert, simulateur 3 min + 1 min, relance de paiement aux jours 3, 6 et 7,
planning, évaluation IA débitée, verrouillage par forfait, blocage à solde nul.
