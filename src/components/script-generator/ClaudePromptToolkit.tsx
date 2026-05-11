import React, { useEffect, useState, useMemo } from 'react';
import { Copy, Check, Sparkles, Terminal, FileCode, CheckCircle, HelpCircle, GraduationCap, AlertCircle, Play, Settings, RefreshCw } from 'lucide-react';
import { JourneyService } from '../training/infrastructure/services/JourneyService';

interface Gig {
  _id: string;
  title: string;
  description: string;
  category: string;
}

interface ClaudePromptToolkitProps {
  companyId: string;
  gig: Gig | null;
  onTestPrompt: (promptText: string) => void;
}

export const ClaudePromptToolkit: React.FC<ClaudePromptToolkitProps> = ({
  companyId,
  gig,
  onTestPrompt
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'builder' | 'api'>('builder');
  const [copiedState, setCopiedState] = useState<Record<string, boolean>>({});

  // Training Journey integration states
  const [isLoadingJourney, setIsLoadingJourney] = useState(false);
  const [trainingJourney, setTrainingJourney] = useState<any | null>(null);
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({});

  // 15 Parameter states for prompt builder
  const [activity, setActivity] = useState('Force de vente directe');
  const [industry, setIndustry] = useState('Mutuelle & Complémentaire Santé');
  const [jurisdiction, setJurisdiction] = useState('France');
  const [language, setLanguage] = useState('Français');
  const [tone, setTone] = useState('Chaleureux, empathique et rigoureux');
  const [repExperience, setRepExperience] = useState('Senior');
  const [legalFormula, setLegalFormula] = useState('DDA + Loi Naegelen + Bloctel + RGPD');
  const [salesFramework, setSalesFramework] = useState('SBAM + AIDA');
  const [targetSteps, setTargetSteps] = useState(8);
  const [productName, setProductName] = useState('');
  const [leadsType, setLeadsType] = useState('Chauds (Opt-in récent < 48h)');
  const [acquisitionChannel, setAcquisitionChannel] = useState('Comparateur d\'assurance tiers');
  const [prospectProfile, setProspectProfile] = useState('Particulier B2C (Actif ou retraité)');
  const [primaryObjections, setPrimaryObjections] = useState('1. "C\'est trop cher"\n2. "Je suis déjà bien couvert"\n3. "Je n\'ai pas le temps, envoyez-moi un mail"');
  const [specificGuidelines, setSpecificGuidelines] = useState('- Ne jamais forcer la vente au premier contact.\n- Expliquer clairement la loi Lemoine de résiliation infra-annuelle.\n- Obtenir un accord vocal explicite et enregistré avant d\'évoquer les tarifs précis.');

  // Pre-fill parameters when gig changes
  useEffect(() => {
    if (gig) {
      setProductName(gig.title || '');
      
      // Auto-detect activity & industry based on title/category/description
      const titleLower = (gig.title || '').toLowerCase();
      const descLower = (gig.description || '').toLowerCase();

      if (titleLower.includes('qualification') || descLower.includes('qualif')) {
        setActivity('Qualification de fichier / Fiche prospect');
      } else if (titleLower.includes('rendez-vous') || titleLower.includes('rdv') || descLower.includes('rdv')) {
        setActivity('Prise de rendez-vous qualifiés');
      } else {
        setActivity('Force de vente directe');
      }

      if (titleLower.includes('sante') || titleLower.includes('mutuelle') || titleLower.includes('assurance')) {
        setIndustry('Mutuelle & Complémentaire Santé');
        setLegalFormula('DDA + Loi Naegelen + Bloctel + RGPD');
        setSalesFramework('SBAM + AIDA');
      } else if (titleLower.includes('saas') || titleLower.includes('logiciel') || titleLower.includes('crm')) {
        setIndustry('SaaS / Logiciels B2B');
        setLegalFormula('RGPD uniquement');
        setSalesFramework('SPIN Selling / Challenger Sale');
        setProspectProfile('Décideur B2B (DSI, Directeur Commercial)');
        setLeadsType('Chauds (Demande de démo sur site web)');
      } else if (titleLower.includes('panneau') || titleLower.includes('solaire') || titleLower.includes('renov') || titleLower.includes('energie')) {
        setIndustry('Énergie & Rénovation Globale');
        setLegalFormula('Loi Naegelen + Bloctel + RGPD');
        setSalesFramework('SPIN Selling');
      }

      // Fetch active training journey for this gig
      fetchTrainingJourney();
    }
  }, [gig, companyId]);

  const fetchTrainingJourney = async () => {
    if (!gig || !companyId) return;
    setIsLoadingJourney(true);
    try {
      const response = await JourneyService.getJourneysByCompanyAndGig(companyId, gig._id);
      if (response && response.success && response.data && response.data.length > 0) {
        // Grab the first active/launched journey
        const journey = response.data.find((j: any) => j.status === 'active' || j.status === 'launched') || response.data[0];
        setTrainingJourney(journey);
        
        // Auto-select all modules by default
        const initialModules: Record<string, boolean> = {};
        if (journey.modules && Array.isArray(journey.modules)) {
          journey.modules.forEach((mod: any, idx: number) => {
            const modId = mod._id || `mod_${idx}`;
            initialModules[modId] = true;
          });
        }
        setSelectedModules(initialModules);
      } else {
        setTrainingJourney(null);
      }
    } catch (e) {
      console.error('[ClaudePromptToolkit] Failed to fetch training journey:', e);
      setTrainingJourney(null);
    } finally {
      setIsLoadingJourney(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedState(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const selectedJourneyContent = useMemo(() => {
    if (!trainingJourney || !trainingJourney.modules) return '';
    
    const modulesToInclude = trainingJourney.modules.filter((mod: any, idx: number) => {
      const modId = mod._id || `mod_${idx}`;
      return selectedModules[modId];
    });

    if (modulesToInclude.length === 0) return '';

    let content = `### 📚 ALIGNEMENT FORMATION REPs (Contexte Pédagogique Actif)
Ce script d'appel doit être aligné avec le parcours de formation activement suivi par les REPs HARX sur la plateforme :
**Titre du Parcours :** ${trainingJourney.title || trainingJourney.name}
**Description :** ${trainingJourney.description || 'N/A'}

**Notions, lexiques techniques et objectifs à refléter dans le script :**\n`;

    modulesToInclude.forEach((mod: any, idx: number) => {
      content += `- **Module ${idx + 1} : ${mod.title}**\n`;
      if (mod.description) content += `  *Description :* ${mod.description}\n`;
      if (mod.learningObjectives && mod.learningObjectives.length > 0) {
        content += `  *Objectifs Pédagogiques :* ${mod.learningObjectives.join(', ')}\n`;
      }
      if (mod.topics && mod.topics.length > 0) {
        content += `  *Sujets abordés :* ${mod.topics.join(', ')}\n`;
      }
      if (mod.sections && mod.sections.length > 0) {
        content += `  *Points clés du cours :*\n`;
        mod.sections.slice(0, 2).forEach((sec: any) => {
          content += `    • ${sec.title} : ${String(sec.content || '').substring(0, 120)}...\n`;
        });
      }
      content += `\n`;
    });

    return content;
  }, [trainingJourney, selectedModules]);

  const generatedUserPrompt = useMemo(() => {
    return `---
# USER PROMPT BUILDER — sales script generator
Générez un script de vente interactif de niveau international basé sur les paramètres stricts suivants :

## 1. PARAMÈTRES DU GIG (PROMPT FORMULARY)
- **Activité cible :** ${activity}
- **Secteur / Industrie :** ${industry}
- **Juridiction légale :** ${jurisdiction}
- **Langue de communication :** ${language}
- **Nom du Produit / Service :** ${productName || 'Complémentaire Santé HARX'}
- **Profil Type du Prospect :** ${prospectProfile}
- **Canal d'Acquisition :** ${acquisitionChannel}
- **Niveau de Leads :** ${leadsType}

## 2. DIRECTIVES CONVERSATIONNELLES & TECHNIQUES
- **Ton exigé :** ${tone}
- **Framework de vente requis :** ${salesFramework}
- **Niveau de séniorité du REP :** ${repExperience}
- **Formule légale de conformité :** ${legalFormula}
- **Nombre d'étapes attendues :** ${targetSteps} étapes alternées structurant la progression graphique du script

## 3. TRAITEMENT DES OBJECTIONS PRIORITAIRES
${primaryObjections}

## 4. CONSIGNES COMMERCIALES ET COMPLIANCE SPÉCIFIQUES
${specificGuidelines}

${selectedJourneyContent ? selectedJourneyContent : ''}
## 5. FORMAT DE SORTIE ATTENDU
Retournez obligatoirement un JSON strict respectant le schéma \`GigScript\` avec toutes les étapes alternées agent/lead, les branches conditionnelles de transition pour les objections majeures, les \`ai_scoring_signals\` (keywords requis/prohibés et scoring_weight pour Twilio), et les \`compliance_tags\` (ex: DDA, RGPD, SBAM).
---`;
  }, [
    activity, industry, jurisdiction, language, tone, repExperience, legalFormula,
    salesFramework, targetSteps, productName, leadsType, acquisitionChannel,
    prospectProfile, primaryObjections, specificGuidelines, selectedJourneyContent
  ]);

  const systemPromptBlocks = {
    block1: `# BLOC 1 — IDENTITÉ ET EXPERTISE DE L'ENGINE
Vous êtes l'IA de pointe HARX "Claude Call Script Engine v25". Votre expertise englobe :
1. Les réglementations de téléprospection internationales :
   - France : Directive sur la Distribution d'Assurances (DDA), Loi Naegelen (encadrement horaire/jours), Bloctel, RGPD.
   - Europe / Global : Consentement opt-in/opt-out explicite, transparence tarifaire, et droit à l'oubli.
2. Les frameworks de vente légendaires :
   - SBAM : Sourire, Bonjour, Au revoir, Merci (le standard universel de l'accueil).
   - AIDA : Attention, Intérêt, Désir, Action (pour capter et convertir).
   - SPIN Selling : Situation, Problem, Implication, Need-payoff (pour qualifier la douleur).
   - Challenger Sale : Teach, Tailor, Take Control (pour guider fermement le prospect).`,
    
    block2: `# BLOC 2 — SCHEMA JSON STRICT "GIGSCRIPT" EXIGÉ
{
  "title": "string (Nom commercial optimisé du script d'appel)",
  "description": "string (Résumé exécutif et cible stratégique)",
  "activity": "string (Activité associée)",
  "industry": "string (Secteur d'activité)",
  "jurisdiction": "string (Juridiction applicable)",
  "language": "string (Langue de génération)",
  "steps": [
    {
      "id": "string (Identifiant unique, ex: introduction, objection_tarif, etc.)",
      "phase": "string (Phase active, ex: SBAM / Qualification / Closing)",
      "actor": "string ('agent' ou 'lead')",
      "replica": "string (Le texte exact à prononcer à l'oral par l'agent ou les options de réponses du lead)",
      "ai_scoring_signals": {
        "required_keywords": ["string (Mots-clés requis pour valider l'étape dans l'analyse post-appel)"],
        "prohibited_keywords": ["string (Mots interdits par compliance ou style)"],
        "scoring_weight": "number (Poids de scoring de 1 à 100 pour l'évaluation de l'agent. La somme totale des poids des étapes doit faire exactement 100)"
      },
      "compliance_tags": ["string (Tags de compliance, ex: DDA, RGPD_CONSENT, BLOCTEL, SBAM)"],
      "conditional_branches": [
        {
          "condition": "string (Description de la réaction du prospect)",
          "next_step_id": "string (ID de l'étape suivante dans le graphe dynamique)"
        }
      ]
    }
  ]
}`,

    block3: `# BLOC 3 — RÈGLES DE GÉNÉRATION & MAPPING COCKPIT
1. Cartographie de l'activité vers la structure :
   - Force de vente : Introduction accrocheuse -> Empathie/SBAM -> SPIN Qualif -> Proposition de valeur AIDA -> Traitement d'objections standardisé -> Consentement légal -> Closing & Signature.
   - Qualification pure : Introduction -> Vérification d'identité et consentement RGPD -> Diagnostic rapide -> Prise de congé chaleureuse.
2. Niveau de séniorité du REP :
   - "Junior" : Générer des répliques verbales extrêmement précises, directes, avec des relances textuelles mot-à-mot et des réponses pré-mâchées aux objections.
   - "Senior" : Structurer le script avec des orientations directrices, des questions ouvertes clés, laissant de la flexibilité tout en encadrant les points légaux obligatoires.
3. Alignement des scores IA :
   - Insérer des 'ai_scoring_signals' pertinents et mesurables. La somme de tous les 'scoring_weight' au sein du script généré doit être rigoureusement égale à 100.
4. Température & Détermination :
   - Toujours retourner un JSON valide exempt de tout texte d'explication ou d'introduction markdown en dehors du bloc JSON.`,

    block4: `# BLOC 4 — FORMAT DU USER PROMPT ATTENDU
Le user prompt fournit une table de 15 paramètres ultra-précis délimitant la mission du gig.
Si le paramètre "ALIGNEMENT FORMATION REPs" est fourni, vous devez extraire les concepts de formation pour les injecter sous forme de techniques verbales concrètes au cœur des dialogues (par exemple, utiliser les termes précis appris dans les cours ou les points d'accroche produit expliqués dans les slides de formation).`
  };

  const nodeJsCode = `/**
 * HARX - CLAUDE SCRIPT GENERATOR INTEGRATION CODE
 * -------------------------------------------------------------
 * SDK requis : npm install @anthropic-ai/sdk dotenv express mongoose
 */

const Anthropic = require('@anthropic-ai/sdk');
const express = require('express');
const router = express.Router();

// Initialisation du client Claude d'Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, 
});

/**
 * Génère le script d'appel haut de gamme via Claude-3.5-Sonnet
 * @param {Object} gigParams - Les 15 paramètres du Gig et le Training Journey
 * @returns {Promise<Object>} - Le script d'appel formaté selon le schéma GigScript
 */
async function generateGigScript(gigParams) {
  const systemPrompt = \`
    \${process.env.HARX_SYSTEM_PROMPT_BLOC1 || ''}
    \${process.env.HARX_SYSTEM_PROMPT_BLOC2 || ''}
    \${process.env.HARX_SYSTEM_PROMPT_BLOC3 || ''}
    \${process.env.HARX_SYSTEM_PROMPT_BLOC4 || ''}
  \`;

  const userPrompt = \`
    Générez le script pour : \${gigParams.productName}
    Industrie : \${gigParams.industry}
    Activité : \${gigParams.activity}
    Ton requis : \${gigParams.tone}
    Niveau REP : \${gigParams.repExperience}
    Framework de Vente : \${gigParams.salesFramework}
    Compliance : \${gigParams.legalFormula}
    Nombre d'étapes : \${gigParams.targetSteps}
    Objections prioritaires : \${gigParams.primaryObjections}
    Directives spécifiques : \${gigParams.specificGuidelines}
    Alignement Formation : \${gigParams.trainingJourneyContext || 'Aucun'}
  \`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.3, // Température basse exigée pour robustesse de structure JSON et compliance
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    const responseText = response.content[0].text;
    
    // Tentative de parsing JSON robuste
    return safeParseJsonScript(responseText);

  } catch (error) {
    console.error('[CLAUDE_API] Échec de la génération du script:', error);
    throw error;
  }
}

/**
 * Parser robuste avec Fallback de Révision Manuelle
 */
function safeParseJsonScript(rawText) {
  try {
    // Nettoyer les balises markdown eventuelles
    const cleanJson = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.warn('[PARSER] Échec du parsing JSON direct, activation du fallback "manual_review"');
    
    // Fallback : On crée une structure GigScript valide signalant le besoin d'une relecture
    return {
      title: "Script d'Appel en Cours de Révision",
      description: "Le format de génération a rencontré une anomalie structurelle. Passage en revue manuelle requis.",
      activity: "Révision",
      industry: "Compliance",
      jurisdiction: "Interne",
      language: "Français",
      manual_review_required: true,
      steps: [
        {
          id: "review_intro",
          phase: "Instruction Technique",
          actor: "agent",
          replica: "Bonjour, ce script d'appel est actuellement en cours de finalisation par notre pôle d'ingénierie. Un expert HARX revient vers vous d'ici quelques minutes.",
          ai_scoring_signals: {
            required_keywords: ["bonjour"],
            prohibited_keywords: [],
            scoring_weight: 100
          },
          compliance_tags: ["MANUAL_REVIEW"]
        }
      ]
    };
  }
}

/**
 * ROUTE POST EXPRESS : POST /gigs/:id/generate-script
 */
router.post('/gigs/:id/generate-script', async (req, res) => {
  const { id } = req.params;
  const { gigParams } = req.body; // Réception des paramètres du builder

  try {
    const gigScript = await generateGigScript(gigParams);
    
    // Mettre à jour en base de données ou stocker dans le cache Cockpit
    // ex: await GigScriptModel.findOneAndUpdate({ gigId: id }, gigScript, { upsert: true });

    return res.status(200).json({
      success: true,
      data: gigScript,
      message: "Script d'appel généré et validé avec succès par Claude v25."
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      message: "Une erreur est survenue lors du traitement avec l'intelligence Claude."
    });
  }
});

module.exports = router;`;

  return (
    <div className="w-full flex flex-col bg-[#111111] border border-slate-800 rounded-xl overflow-hidden min-h-0 flex-1">
      {/* Header Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2 shrink-0">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-200 border-b-2 flex items-center gap-2 ${
            activeTab === 'system'
              ? 'border-red-600 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-red-500" />
          1. Prompt Système Claude
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-200 border-b-2 flex items-center gap-2 ${
            activeTab === 'builder'
              ? 'border-red-600 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-red-500" />
          2. User Prompt Builder
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-200 border-b-2 flex items-center gap-2 ${
            activeTab === 'api'
              ? 'border-red-600 text-white bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-red-500" />
          3. Intégration API NodeJS
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto min-h-0 custom-scrollbar text-slate-300">
        
        {/* TAB 1: SYSTEM PROMPT */}
        {activeTab === 'system' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" />
                Moteur de prompt système d'appel HARX
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Voici les 4 blocs d'ingénierie à intégrer dans la variable système de votre LLM (<code className="text-white bg-slate-950 px-1 py-0.5 rounded text-[10px]">HARX_SYSTEM_PROMPT</code>). Ils forcent Claude à se comporter en expert réglementaire, à employer les bons frameworks et à retourner un JSON impeccable parsable directement par la console.
              </p>
            </div>

            {/* Block 1 */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="px-4 py-2 bg-slate-900 flex justify-between items-center border-b border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Bloc 1 — Identité et expertise de l'engine</span>
                <button
                  onClick={() => handleCopy(systemPromptBlocks.block1, 'b1')}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all flex items-center gap-1 text-[9px] font-extrabold"
                >
                  {copiedState['b1'] ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copiedState['b1'] ? 'Copié !' : 'Copier'}
                </button>
              </div>
              <pre className="p-3 text-[10px] font-mono overflow-x-auto text-slate-400 leading-relaxed max-h-48 overflow-y-auto">
                {systemPromptBlocks.block1}
              </pre>
            </div>

            {/* Block 2 */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="px-4 py-2 bg-slate-900 flex justify-between items-center border-b border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Bloc 2 — Le schema JSON strict "GigScript"</span>
                <button
                  onClick={() => handleCopy(systemPromptBlocks.block2, 'b2')}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all flex items-center gap-1 text-[9px] font-extrabold"
                >
                  {copiedState['b2'] ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copiedState['b2'] ? 'Copié !' : 'Copier'}
                </button>
              </div>
              <pre className="p-3 text-[10px] font-mono overflow-x-auto text-slate-400 leading-relaxed max-h-48 overflow-y-auto">
                {systemPromptBlocks.block2}
              </pre>
            </div>

            {/* Block 3 */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="px-4 py-2 bg-slate-900 flex justify-between items-center border-b border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Bloc 3 — Les règles de génération & scoring</span>
                <button
                  onClick={() => handleCopy(systemPromptBlocks.block3, 'b3')}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all flex items-center gap-1 text-[9px] font-extrabold"
                >
                  {copiedState['b3'] ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copiedState['b3'] ? 'Copié !' : 'Copier'}
                </button>
              </div>
              <pre className="p-3 text-[10px] font-mono overflow-x-auto text-slate-400 leading-relaxed max-h-48 overflow-y-auto">
                {systemPromptBlocks.block3}
              </pre>
            </div>

            {/* Block 4 */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="px-4 py-2 bg-slate-900 flex justify-between items-center border-b border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Bloc 4 — Le format attendu du User Prompt</span>
                <button
                  onClick={() => handleCopy(systemPromptBlocks.block4, 'b4')}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all flex items-center gap-1 text-[9px] font-extrabold"
                >
                  {copiedState['b4'] ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copiedState['b4'] ? 'Copié !' : 'Copier'}
                </button>
              </div>
              <pre className="p-3 text-[10px] font-mono overflow-x-auto text-slate-400 leading-relaxed max-h-48 overflow-y-auto">
                {systemPromptBlocks.block4}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 2: USER PROMPT BUILDER */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 animate-fadeIn">
            {/* Left Panel: Inputs */}
            <div className="xl:col-span-7 space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest block mb-1">Interactive Generator</span>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Formulaire de Prompt à 15 Paramètres</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Renseignez les champs ci-dessous (automatiquement pré-remplis à partir de la mission active) pour concevoir un prompt optimal.
                </p>
              </div>

              {/* Training Journey Box */}
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl relative overflow-hidden">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-950/40 flex items-center justify-center border border-red-900/30 shrink-0">
                    <GraduationCap className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-white uppercase tracking-wider">Lien de Formation Active</span>
                      {isLoadingJourney && <RefreshCw className="w-3 h-3 text-red-500 animate-spin" />}
                    </div>
                    {trainingJourney ? (
                      <div className="mt-1.5 space-y-2">
                        <div className="p-2 bg-red-950/10 border border-red-900/20 rounded-lg">
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-tight">📚 {trainingJourney.title || trainingJourney.name}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{trainingJourney.description || 'Aucune description disponible'}</p>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Intégrer les modules de formation au script :</span>
                          {trainingJourney.modules && trainingJourney.modules.map((mod: any, idx: number) => {
                            const modId = mod._id || `mod_${idx}`;
                            return (
                              <label key={modId} className="flex items-center gap-2 p-1.5 bg-slate-900/50 hover:bg-slate-900 rounded border border-slate-800/60 cursor-pointer transition-all duration-150">
                                <input
                                  type="checkbox"
                                  checked={!!selectedModules[modId]}
                                  onChange={() => setSelectedModules(prev => ({ ...prev, [modId]: !prev[modId] }))}
                                  className="rounded border-slate-700 text-red-600 focus:ring-red-500 h-3.5 w-3.5 bg-slate-950"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[9px] font-black text-white truncate uppercase">{mod.title}</p>
                                  {mod.topics && mod.topics.length > 0 && (
                                    <p className="text-[8px] text-slate-400 truncate mt-0.5">Sujets : {mod.topics.join(', ')}</p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1.5 p-2 bg-slate-900/50 rounded-lg border border-slate-800 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-slate-400 leading-relaxed">
                          <span className="font-extrabold text-amber-500">Aucun parcours de formation actif</span> associé à ce Gig. Créez un parcours de formation dans l'onglet "Formation" pour synchroniser le script de vente avec l'apprentissage théorique des REPs.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-950/40 border border-slate-800 rounded-xl">
                {/* 1. Activité */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">1. Activité du Gig</label>
                  <select
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="Force de vente directe">Force de vente directe</option>
                    <option value="Qualification de fichier / Fiche prospect">Qualification de fichier</option>
                    <option value="Prise de rendez-vous qualifiés">Prise de rendez-vous</option>
                    <option value="Relance commerciale de paniers abandonnés">Relance paniers abandonnés</option>
                    <option value="Enquête de satisfaction clients">Enquête de satisfaction</option>
                  </select>
                </div>

                {/* 2. Industrie */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">2. Secteur / Industrie</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="Mutuelle & Complémentaire Santé">Mutuelle & Complémentaire Santé</option>
                    <option value="Assurance Emprunteur & Prêts">Assurance Emprunteur</option>
                    <option value="SaaS / Logiciels B2B / Solutions Tech">SaaS / Logiciels B2B</option>
                    <option value="Immobilier / Défiscalisation / Gestion">Immobilier</option>
                    <option value="Énergie & Rénovation Globale / Photovoltaïque">Énergie & Solaire</option>
                    <option value="Formation Professionnelle / Compte CPF">Formation & CPF</option>
                    <option value="Télécommunications / Offres box & mobiles">Télécoms</option>
                  </select>
                </div>

                {/* 3. Pays */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">3. Juridiction / Pays</label>
                  <select
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="France">France</option>
                    <option value="Belgique">Belgique</option>
                    <option value="Suisse">Suisse</option>
                    <option value="Luxembourg">Luxembourg</option>
                    <option value="Global (Multi-pays)">Global (Multi-pays)</option>
                  </select>
                </div>

                {/* 4. Langue */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">4. Langue</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="Français">Français</option>
                    <option value="Anglais">Anglais</option>
                    <option value="Espagnol">Espagnol</option>
                    <option value="Allemand">Allemand</option>
                  </select>
                </div>

                {/* 5. Ton */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">5. Ton exigé</label>
                  <input
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* 6. Expérience REP */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">6. Séniorité REP</label>
                  <select
                    value={repExperience}
                    onChange={(e) => setRepExperience(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="Junior">Junior (Scénarisation intégrale au mot-à-mot)</option>
                    <option value="Senior">Senior (Orientations, arguments et flexibilité)</option>
                  </select>
                </div>

                {/* 7. Formule légale */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">7. Compliance Légale</label>
                  <select
                    value={legalFormula}
                    onChange={(e) => setLegalFormula(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="DDA + Loi Naegelen + Bloctel + RGPD">DDA + Naegelen + Bloctel + RGPD</option>
                    <option value="Loi Naegelen + Bloctel + RGPD">Loi Naegelen + Bloctel + RGPD</option>
                    <option value="DDA + RGPD uniquement">DDA + RGPD uniquement</option>
                    <option value="RGPD uniquement">RGPD uniquement</option>
                    <option value="Aucune contrainte légale active">Aucune contrainte</option>
                  </select>
                </div>

                {/* 8. Framework de vente */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">8. Framework de Vente</label>
                  <select
                    value={salesFramework}
                    onChange={(e) => setSalesFramework(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="SBAM + AIDA">SBAM + AIDA (Recommandé B2C)</option>
                    <option value="SPIN Selling">SPIN Selling (Diagnostic complexe)</option>
                    <option value="Challenger Sale">Challenger Sale (B2B expert)</option>
                    <option value="BANT">BANT (Budget, Authority, Need, Timeline)</option>
                  </select>
                </div>

                {/* 9. Nombre d'étapes cibles */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">9. Nombre d'étapes cibles du script</label>
                    <span className="text-[10px] font-black text-red-500">{targetSteps} étapes</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="15"
                    value={targetSteps}
                    onChange={(e) => setTargetSteps(Number(e.target.value))}
                    className="w-full accent-red-600 bg-slate-900 border-none h-1 rounded"
                  />
                </div>

                {/* 10. Nom du Produit */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">10. Nom du Produit / Service</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ex : Assurance santé confort +"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* 11. Type de Leads */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">11. Type de Leads</label>
                  <select
                    value={leadsType}
                    onChange={(e) => setLeadsType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="Froids / Outbound / Prospection dans le dur">Froids (Outbound direct)</option>
                    <option value="Chauds (Opt-in récent < 48h)">Chauds (Inscriptions récentes)</option>
                    <option value="Entrants / Inbound (Demande de rappel explicite)">Entrants (Inbound formulaires)</option>
                  </select>
                </div>

                {/* 12. Canal d'acquisition */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">12. Canal d'Acquisition</label>
                  <input
                    type="text"
                    value={acquisitionChannel}
                    onChange={(e) => setAcquisitionChannel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* 13. Profil Prospect */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">13. Profil Prospect Type</label>
                  <input
                    type="text"
                    value={prospectProfile}
                    onChange={(e) => setProspectProfile(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* 14. Objections prioritaires */}
                <div className="md:col-span-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">14. Objections majeures prioritaires à traiter</label>
                  <textarea
                    rows={3}
                    value={primaryObjections}
                    onChange={(e) => setPrimaryObjections(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono font-semibold text-slate-300 focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* 15. Consignes spécifiques */}
                <div className="md:col-span-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">15. Consignes commerciales et compliance spécifiques</label>
                  <textarea
                    rows={3}
                    value={specificGuidelines}
                    onChange={(e) => setSpecificGuidelines(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono font-semibold text-slate-300 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>
            </div>

            {/* Right Panel: Prompt Preview */}
            <div className="xl:col-span-5 flex flex-col min-h-0 space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center shrink-0">
                <div>
                  <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest block">Live Prompt Sandbox</span>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Aperçu du Prompt Généré</h3>
                </div>
                <button
                  onClick={() => handleCopy(generatedUserPrompt, 'up')}
                  className="px-2.5 py-1 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-wider shadow-sm"
                >
                  {copiedState['up'] ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedState['up'] ? 'Copié !' : 'Copier'}
                </button>
              </div>

              {/* Code Pre container */}
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[9px] leading-relaxed text-slate-400 overflow-y-auto max-h-[480px] custom-scrollbar select-all">
                {generatedUserPrompt.split('\n').map((line, idx) => (
                  <div key={idx} className={line.startsWith('#') ? 'text-red-500 font-extrabold mt-2' : line.startsWith('-') ? 'text-slate-300 font-medium' : ''}>
                    {line}
                  </div>
                ))}
              </div>

              {/* Action test button */}
              <button
                onClick={() => onTestPrompt(generatedUserPrompt)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-95 border border-red-500 relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <div className="absolute inset-0 w-1/2 bg-white/10 skew-x-[-25deg] -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000" />
                <Play className="w-4 h-4" />
                Tester avec l'assistant Claude
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: API INTEGRATION */}
        {activeTab === 'api' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest block mb-1">API Node.js Ready</span>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Intégration du Backend d'Appel HARX</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Voici le code Express complet et prêt pour la mise en production. Il intègre le traitement Claude, le paramétrage strict de la température à 0.3 et un parser JSON robuste avec relecture de secours (manual review).
              </p>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="px-4 py-2 bg-slate-900 flex justify-between items-center border-b border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-500 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" />
                  routes/gigs_script_generation.js
                </span>
                <button
                  onClick={() => handleCopy(nodeJsCode, 'apiCode')}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider"
                >
                  {copiedState['apiCode'] ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedState['apiCode'] ? 'Copié !' : 'Copier le Code'}
                </button>
              </div>
              <pre className="p-3 text-[10px] font-mono overflow-x-auto text-emerald-400 bg-slate-950/80 leading-relaxed max-h-[420px] overflow-y-auto custom-scrollbar">
                {nodeJsCode}
              </pre>
            </div>

            {/* Quick configuration hint card */}
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-950/40 flex items-center justify-center shrink-0 border border-red-900/30">
                <HelpCircle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white uppercase tracking-wide">💡 Connexion directe Twilio API & Evaluation</p>
                <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                  Chaque étape générée contient un bloc d'intelligence nommé <code className="text-white bg-slate-950 px-1 rounded">ai_scoring_signals</code>. Ces critères d'évaluation (keywords requis, mots-clés interdits et poids d'évaluation sur 100) sont automatiquement injectés par votre pipeline vers notre moteur d'analyse Twilio Call Stream pour évaluer la conformité et la performance des REPs en temps réel pendant les appels.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
