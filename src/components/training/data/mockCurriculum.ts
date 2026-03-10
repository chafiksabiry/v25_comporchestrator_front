/**
 * Mock Curriculum Data pour tester l'export PowerPoint
 * Peut être utilisé directement dans CurriculumDesigner pour tests
 */

export const mockCurriculumForPPT = {
  title: "Formation Customer Success Excellence",
  description: "Programme complet de formation pour les représentants Customer Success couvrant toutes les compétences essentielles de l'onboarding à la maîtrise.",
  totalDuration: 480,
  methodology: "360° Methodology",
  modules: [
    {
      title: "Module 1: Introduction et Fondamentaux",
      description: "Découvrez les principes fondamentaux du Customer Success, la culture d'entreprise et les valeurs essentielles qui guident notre approche client.",
      duration: 80,
      difficulty: "beginner",
      contentItems: 6,
      assessments: 1,
      enhancedElements: [
        "Vidéo d'Introduction Interactive",
        "Infographie Valeurs d'Entreprise",
        "Quiz de Connaissances",
        "Scénario de Bienvenue"
      ],
      learningObjectives: [
        "Comprendre la mission et les valeurs de l'entreprise",
        "Maîtriser les principes du Customer Success",
        "Identifier les compétences clés requises",
        "S'approprier la méthodologie 360°"
      ]
    },
    {
      title: "Module 2: Connaissance Produit Approfondie",
      description: "Exploration complète de notre suite de produits, fonctionnalités avancées, capacités d'intégration et modèles de tarification pour une expertise totale.",
      duration: 90,
      difficulty: "intermediate",
      contentItems: 8,
      assessments: 2,
      enhancedElements: [
        "Démos Produit Vidéo",
        "Laboratoire Pratique Interactif",
        "Documentation Technique",
        "Quiz de Certification",
        "Cas d'Usage Clients"
      ],
      learningObjectives: [
        "Maîtriser toutes les fonctionnalités du produit",
        "Comprendre les capacités d'intégration",
        "Expliquer les modèles de tarification",
        "Démontrer le produit efficacement",
        "Résoudre les problèmes techniques basiques"
      ]
    },
    {
      title: "Module 3: Méthodologie Customer Success",
      description: "Apprenez notre framework éprouvé pour le succès client incluant les métriques, le parcours client, les stratégies de rétention et les techniques d'upselling.",
      duration: 85,
      difficulty: "intermediate",
      contentItems: 7,
      assessments: 2,
      enhancedElements: [
        "Framework Méthodologique",
        "Études de Cas Réels",
        "Simulations de Scénarios",
        "Outils d'Analyse",
        "Templates et Playbooks"
      ],
      learningObjectives: [
        "Appliquer le framework Customer Success",
        "Mesurer et analyser les métriques clés",
        "Gérer le parcours client de bout en bout",
        "Développer des stratégies de rétention",
        "Identifier les opportunités d'upselling"
      ]
    },
    {
      title: "Module 4: Communication et Soft Skills",
      description: "Développez des compétences essentielles en communication incluant l'écoute active, la résolution de conflits, les présentations professionnelles et l'étiquette email.",
      duration: 75,
      difficulty: "intermediate",
      contentItems: 6,
      assessments: 1,
      enhancedElements: [
        "Ateliers de Communication",
        "Exercices de Jeu de Rôle",
        "Analyses de Conversations",
        "Feedback en Temps Réel",
        "Meilleures Pratiques"
      ],
      learningObjectives: [
        "Pratiquer l'écoute active efficace",
        "Gérer les situations de conflit",
        "Créer des présentations impactantes",
        "Rédiger des emails professionnels",
        "Adapter la communication au contexte"
      ]
    },
    {
      title: "Module 5: Outils et Systèmes",
      description: "Maîtrisez tous les outils et systèmes utilisés quotidiennement : CRM, plateforme de support, tableau de bord analytique et outils de reporting.",
      duration: 80,
      difficulty: "advanced",
      contentItems: 8,
      assessments: 2,
      enhancedElements: [
        "Tutoriels Système Interactifs",
        "Environnement de Pratique",
        "Workflows Automatisés",
        "Tableaux de Bord Personnalisés",
        "Intégrations Avancées"
      ],
      learningObjectives: [
        "Naviguer efficacement dans le CRM",
        "Utiliser la plateforme de support",
        "Analyser les données et créer des rapports",
        "Automatiser les tâches répétitives",
        "Personnaliser les workflows",
        "Intégrer les outils externes"
      ]
    },
    {
      title: "Module 6: Évaluation Finale et Certification",
      description: "Évaluation complète des compétences acquises, feedback personnalisé, certification officielle et plan de développement continu pour votre progression.",
      duration: 70,
      difficulty: "advanced",
      contentItems: 5,
      assessments: 3,
      enhancedElements: [
        "Évaluation Complète",
        "Simulation Client Réel",
        "Feedback AI Personnalisé",
        "Certificat de Compétence",
        "Plan de Développement"
      ],
      learningObjectives: [
        "Démontrer la maîtrise complète des compétences",
        "Réussir les évaluations de certification",
        "Recevoir un feedback détaillé",
        "Obtenir la certification officielle",
        "Planifier le développement professionnel continu"
      ]
    }
  ]
};

/**
 * Mock Curriculum simplifié pour tests rapides
 */
export const mockSimpleCurriculum = {
  title: "Formation Rapide Test",
  description: "Curriculum simplifié pour tests d'export PowerPoint",
  totalDuration: 240,
  methodology: "Blended Learning",
  modules: [
    {
      title: "Module 1: Introduction",
      description: "Introduction au sujet principal",
      duration: 40,
      difficulty: "beginner",
      contentItems: 3,
      assessments: 1,
      enhancedElements: ["Vidéo", "Quiz", "Exercice"],
      learningObjectives: ["Comprendre les bases", "Appliquer les concepts"]
    },
    {
      title: "Module 2: Concepts Avancés",
      description: "Exploration des concepts avancés",
      duration: 50,
      difficulty: "intermediate",
      contentItems: 4,
      assessments: 1,
      enhancedElements: ["Vidéo", "Simulation", "Quiz"],
      learningObjectives: ["Maîtriser les techniques", "Résoudre des problèmes"]
    },
    {
      title: "Module 3: Applications Pratiques",
      description: "Mise en pratique des connaissances",
      duration: 60,
      difficulty: "intermediate",
      contentItems: 5,
      assessments: 2,
      enhancedElements: ["Projet", "Exercices", "Évaluation"],
      learningObjectives: ["Appliquer en pratique", "Créer des solutions"]
    },
    {
      title: "Module 4: Techniques Avancées",
      description: "Techniques pour experts",
      duration: 50,
      difficulty: "advanced",
      contentItems: 4,
      assessments: 1,
      enhancedElements: ["Lab", "Cas d'étude", "Quiz"],
      learningObjectives: ["Optimiser les processus", "Innover"]
    },
    {
      title: "Module 5: Intégration",
      description: "Intégration de toutes les compétences",
      duration: 30,
      difficulty: "advanced",
      contentItems: 3,
      assessments: 1,
      enhancedElements: ["Synthèse", "Projet", "Présentation"],
      learningObjectives: ["Synthétiser", "Présenter"]
    },
    {
      title: "Module 6: Certification",
      description: "Évaluation finale et certification",
      duration: 10,
      difficulty: "intermediate",
      contentItems: 2,
      assessments: 2,
      enhancedElements: ["Examen", "Certificat"],
      learningObjectives: ["Valider les compétences", "Obtenir la certification"]
    }
  ]
};

/**
 * Fonction helper pour injecter le mock curriculum dans l'état
 */
export const loadMockCurriculum = () => {
  return mockCurriculumForPPT;
};

/**
 * Fonction pour générer un curriculum aléatoire pour tests
 */
export const generateRandomCurriculum = (moduleCount: number = 6) => {
  const difficulties = ["beginner", "intermediate", "advanced"];
  const modules = [];
  
  for (let i = 0; i < moduleCount; i++) {
    modules.push({
      title: `Module ${i + 1}: Sujet ${i + 1}`,
      description: `Description détaillée du module ${i + 1} avec objectifs et contenu`,
      duration: 60 + Math.floor(Math.random() * 40),
      difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
      contentItems: 3 + Math.floor(Math.random() * 5),
      assessments: 1 + Math.floor(Math.random() * 2),
      enhancedElements: ["Vidéo", "Quiz", "Exercice", "Simulation"].slice(0, 2 + Math.floor(Math.random() * 3)),
      learningObjectives: [
        `Objectif 1 du module ${i + 1}`,
        `Objectif 2 du module ${i + 1}`,
        `Objectif 3 du module ${i + 1}`
      ]
    });
  }
  
  return {
    title: "Formation Générée Aléatoirement",
    description: "Curriculum généré automatiquement pour tests",
    totalDuration: modules.reduce((sum, m) => sum + m.duration, 0),
    methodology: "360° Methodology",
    modules
  };
};

