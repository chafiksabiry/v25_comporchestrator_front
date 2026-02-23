import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  Shield,
  FileText,
  Phone,
  Users,
  BookOpen,
  MessageSquare,
  BarChart,
  CheckCircle,
  ChevronRight,
  AlertCircle,
  Upload,
  Globe,
  Calendar,
  Settings,
  Rocket,
} from "lucide-react";
import TelephonySetup from "./TelephonySetup";
import CompanyProfile from "./onboarding/CompanyProfile";
import KYCVerification from "./onboarding/KYCVerification";
import SubscriptionPlan from "./onboarding/SubscriptionPlan";
import CallScript from "./onboarding/CallScript";
import ReportingSetup from "./onboarding/ReportingSetup";
import UploadContacts from "./onboarding/UploadContacts";
import MatchHarxReps from "./onboarding/MatchHarxReps";
import RepOnboarding from "./onboarding/RepOnboarding";
import SessionPlanning from "./onboarding/SessionPlanning";
import Cookies from "js-cookie";
import axios from "axios";
import GigDetails from "./onboarding/GigDetails";
import KnowledgeBase from "./onboarding/KnowledgeBase";
import ApprovalPublishing from "./ApprovalPublishing";
import ZohoService from "../services/zohoService";
import { checkMatchRepsStepCompletion } from "../api/matching";

interface BaseStep {
  id: number;
  title: string;
  description: string;
  status: string;
  disabled?: boolean;
}

interface ComponentStep extends BaseStep {
  component: React.ComponentType;
}

interface NonComponentStep extends BaseStep {
  component?: never;
}

type Step = ComponentStep | NonComponentStep;

interface Phase {
  id: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  steps: Step[];
}

interface OnboardingProgressResponse {
  currentPhase: number;
  completedSteps: number[];
  phases: {
    id: number;
    status: "pending" | "in_progress" | "completed";
    steps: {
      id: number;
      status: "pending" | "in_progress" | "completed";
      completedAt?: Date;
    }[];
  }[];
}

interface HasGigsResponse {
  message: string;
  data: {
    hasGigs: boolean;
  };
}

interface HasLeadsResponse {
  success: boolean;
  hasLeads: boolean;
  count: number;
}

interface CompanyResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    // Add other company fields as needed
  };
}

interface GigResponse {
  success: boolean;
  message: string;
  data: Array<{
    _id: string;
    title: string;
    status: string;
    // Add other gig fields as needed
  }>;
}

const CompanyOnboarding = () => {
  // Remove early return - we need to render the component to show onboarding interface

  const [currentPhase, setCurrentPhase] = useState(1);
  const [displayedPhase, setDisplayedPhase] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [showTelephonySetup, setShowTelephonySetup] = useState(false);
  const [showUploadContacts, setShowUploadContacts] = useState(false);

  // Single useEffect to handle UploadContacts state and parsed leads cleanup
  useEffect(() => {
    const hasParsedLeads = localStorage.getItem("parsedLeads");
    const wasManuallyClosed = sessionStorage.getItem("uploadContactsManuallyClosed");

    // Only restore if we have leads AND we're not manually closed AND we're in the right phase
    if (hasParsedLeads && !wasManuallyClosed && displayedPhase >= 2 && !showUploadContacts) {
      console.log("🔄 Restoring UploadContacts view - parsed leads exist and phase allows it");
      setShowUploadContacts(true);
    }

    // Debug: log the current state
    console.log("🔍 UploadContacts restoration check:", {
      hasParsedLeads: !!hasParsedLeads,
      wasManuallyClosed: !!wasManuallyClosed,
      displayedPhase,
      showUploadContacts,
      shouldRestore: hasParsedLeads && !wasManuallyClosed && displayedPhase >= 2 && !showUploadContacts
    });
  }, [displayedPhase]); // Remove showUploadContacts to prevent loops

  // Clean up parsed leads when phase changes and component is not showing
  useEffect(() => {
    if (displayedPhase < 2 && showUploadContacts) {
      console.log("🧹 Cleaning parsed leads - current phase too early:", displayedPhase);
      localStorage.removeItem("parsedLeads");
      setShowUploadContacts(false);
    }
  }, [displayedPhase, showUploadContacts]);

  // Prevent any automatic restoration when manually closed
  useEffect(() => {
    if (!showUploadContacts) {
      // Set the flag immediately when component is closed
      sessionStorage.setItem("uploadContactsManuallyClosed", "true");
      console.log("🚫 Set manual close flag - preventing auto-restoration");
    }
  }, [showUploadContacts]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGigs, setHasGigs] = useState(false);
  const [hasLeads, setHasLeads] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showGigDetails, setShowGigDetails] = useState(false);
  const userId = Cookies.get("userId");

  // Define API URL with fallback
  const API_BASE_URL = import.meta.env.VITE_COMPANY_API_URL || 'https://v25searchcompanywizardbackend-production.up.railway.app/api';

  // Fetch company ID using user ID
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (import.meta.env.VITE_NODE_ENV === "development") {
        const devCompanyId = "6830839c641398dc582eb897";
        setCompanyId(devCompanyId);
        Cookies.set("companyId", devCompanyId);
        return;
      }

      if (!userId) {
        console.error("User ID not found in cookies");
        // Rediriger vers /auth si pas d'userId
        window.location.href = "/auth";
        return;
      }

      try {
        const response = await axios.get<CompanyResponse>(
          `${API_BASE_URL}/companies/user/${userId}`
        );
        if (response.data.success && response.data.data) {
          setCompanyId(response.data.data._id);
          // Store company ID in cookie for backward compatibility
          Cookies.set("companyId", response.data.data._id);
          console.log(
            "✅ Company ID fetched and stored:",
            response.data.data._id
          );
        } else {
          console.error("No company data found for user:", userId);
          // Ne pas rediriger immédiatement, afficher un message d'erreur à la place
        }
      } catch (error) {
        console.error("Error fetching company ID:", error);
        // Ne pas rediriger immédiatement, afficher un message d'erreur à la place
      }
    };

    fetchCompanyId();
  }, [userId]);

  // Load company progress and check gigs when company ID is available
  useEffect(() => {
    if (companyId) {
      console.log(
        "🔄 Company ID available, loading progress and checking gigs..."
      );
      loadCompanyProgress();
      checkCompanyGigs();
      // checkCompanyLeads();

      // Vérifier si l'utilisateur vient de se connecter à Zoho
      checkZohoConnection();
    }
  }, [companyId]);

  // Add listener for step completion messages from child components
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "STEP_COMPLETED") {
        console.log("Received step completion message:", event.data);
        const { stepId, phaseId, data } = event.data;

        // Update local state
        setCompletedSteps((prev: string | any[]) => {
          if (!prev.includes(stepId)) {
            return [...prev, stepId];
          }
          return prev;
        });

        // Refresh onboarding progress
        loadCompanyProgress();

        // Show success message
        console.log(`✅ Step ${stepId} completed successfully`);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Add listener for custom step completion events from child components
  useEffect(() => {
    const handleStepCompleted = (event: CustomEvent) => {
      const { stepId, phaseId, status, completedSteps } = event.detail;
      console.log('🎯 Step completion event received:', { stepId, phaseId, status, completedSteps });

      // Mettre à jour l'état local des étapes complétées
      if (completedSteps && Array.isArray(completedSteps)) {
        setCompletedSteps(completedSteps);

        // Mettre à jour le localStorage
        const currentProgress = {
          currentPhase: phaseId,
          completedSteps: completedSteps,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

        console.log('💾 Local state updated from step completion event');

        // Force reload onboarding progress to get fresh data from API
        setTimeout(() => {
          console.log('🔄 Reloading onboarding progress after step completion');
          loadCompanyProgress();
        }, 500);
      }
    };

    // Add listener for contacts upload completion
    const handleContactsUploadCompleted = () => {
      console.log('📞 Contacts upload completed - refreshing onboarding state');
      // Close UploadContacts and refresh progress
      setShowUploadContacts(false);
      // Clear manual close flag to allow future auto-restoration if needed
      sessionStorage.removeItem("uploadContactsManuallyClosed");
      // Immediately check for leads and auto-complete step 5
      checkCompanyLeadsForAutoCompletion();
      // Also reload progress after a short delay
      setTimeout(() => {
        loadCompanyProgress();
      }, 1000);
    };

    // Ajouter l'écouteur d'événement
    window.addEventListener('stepCompleted', handleStepCompleted as EventListener);
    window.addEventListener('contactsUploadCompleted', handleContactsUploadCompleted);

    // Nettoyer l'écouteur d'événement
    return () => {
      window.removeEventListener('stepCompleted', handleStepCompleted as EventListener);
      window.removeEventListener('contactsUploadCompleted', handleContactsUploadCompleted);
    };
  }, []);

  // Recharger les données périodiquement pour détecter les changements
  // Désactivé car cause trop de rafraîchissements
  // useEffect(() => {
  //   if (!companyId) return;

  //   const interval = setInterval(() => {
  //     loadCompanyProgress();
  //   }, 5000); // Recharger toutes les 5 secondes

  //   return () => clearInterval(interval);
  // }, [companyId]);

  // Vérifier périodiquement si l'étape 6 doit être marquée comme complétée
  useEffect(() => {
    if (!companyId) return;

    const interval = setInterval(() => {
      // Vérifier si la company a des leads mais que l'étape 6 n'est pas marquée comme complétée
      checkCompanyLeadsForAutoCompletion();
    }, 10000); // Vérifier toutes les 10 secondes

    return () => clearInterval(interval);
  }, [companyId, completedSteps]);





  // Fonction pour auto-compléter l'étape 6 si des leads existent
  const checkCompanyLeadsForAutoCompletion = async () => {
    try {
      if (!companyId || completedSteps.includes(5)) {
        return; // Step already completed or no company ID
      }

      const response = await axios.get<HasLeadsResponse>(
        `${import.meta.env.VITE_DASHBOARD_API}/leads/company/${companyId}/has-leads`
      );

      if (response.data.hasLeads && response.data.count > 0) {
        console.log('✅ Company has leads - auto-completing step 5');
        try {
          await axios.put(
            `${API_BASE_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/6`,
            { status: 'completed' }
          );

          // Update local state to reflect the completed step
          setCompletedSteps((prev: any) => {
            if (!prev.includes(6)) {
              const newSteps = [...prev, 6];
              console.log('✅ Step 6 auto-completed successfully - updating local state');

              // Update localStorage as well
              const currentProgress = {
                currentPhase: 2,
                completedSteps: newSteps,
                lastUpdated: new Date().toISOString()
              };
              localStorage.setItem('companyOnboardingProgress', JSON.stringify(currentProgress));

              return newSteps;
            }
            return prev;
          });

          // Set hasLeads state
          setHasLeads(true);

        } catch (error) {
          console.error('Error auto-completing step 5:', error);
        }
      }
    } catch (error) {
      console.error('Error checking company leads for auto-completion:', error);
    }
  };

  // Si l'URL contient ?startStep=6 ou si on est sur l'URL spécifique avec session, on lance handleStartStep(6)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Vérifier si l'URL contient le paramètre startStep=6
    if (params.get("session") === "someGeneratedSessionId" && companyId) {
      handleStartStep(6);
    }
  }, [companyId]);

  const checkCompanyGigs = async () => {
    try {
      // Vérifier que companyId est disponible
      if (!companyId) {
        console.error("❌ Company ID not available for checking gigs");
        return;
      }

      const response = await axios.get<HasGigsResponse>(
        `${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}/has-gigs`
      );
      const hasGigs = response.data.data.hasGigs;
      setHasGigs(hasGigs);

      // If company has gigs, update the onboarding progress for step 3
      if (hasGigs) {
        try {
          await axios.put(
            `${import.meta.env.VITE_COMPANY_API_URL
            }/onboarding/companies/${companyId}/onboarding/phases/2/steps/4`,
            { status: "completed" }
          );
          // Update local state to reflect the completed step
          setCompletedSteps((prev: any) => [...prev, 4]);
        } catch (error) {
          console.error("Error updating onboarding progress:", error);
          // Ne pas faire échouer toute la fonction si cette mise à jour échoue
        }
      }
    } catch (error) {
      console.error("Error checking company gigs:", error);
      // Ne pas faire échouer toute la fonction si cette vérification échoue
    }
  };

  const checkCompanyLeads = async () => {
    try {
      // Vérifier que companyId est disponible
      if (!companyId) {
        console.error("❌ Company ID not available for checking leads");
        return;
      }

      const response = await axios.get<HasLeadsResponse>(
        `${import.meta.env.VITE_DASHBOARD_API
        }/leads/company/${companyId}/has-leads`
      );
      const hasLeads = response.data.hasLeads;
      setHasLeads(hasLeads);

      // Auto-complete step 5 if company has leads
      if (hasLeads) {
        console.log("✅ Company has leads - auto-completing step 5");
        try {
          await axios.put(
            `${import.meta.env.VITE_COMPANY_API_URL
            }/onboarding/companies/${companyId}/onboarding/phases/2/steps/5`,
            { status: "completed" }
          );
          // Update local state to reflect the completed step
          setCompletedSteps((prev: number[]) => {
            if (!prev.includes(5)) {
              return [...prev, 5];
            }
            return prev;
          });
          console.log("✅ Step 5 auto-completed successfully");
        } catch (error) {
          console.error("Error auto-completing step 5:", error);
        }
      } else {
        console.log("⚠️ Company has no leads - step 5 needs manual completion");
      }
    } catch (error) {
      console.error("Error checking company leads:", error);
      // Ne pas faire échouer toute la fonction si cette vérification échoue
    }
  };

  // Fonction utilitaire pour mettre à jour l'état d'onboarding sans recharger tout le projet
  const updateOnboardingState = async () => {
    if (!companyId) {
      console.error(
        "❌ Company ID not available for updating onboarding state"
      );
      return;
    }

    try {
      // Vérifier les leads
      // await checkCompanyLeads();

      // Vérifier les gigs actifs
      await checkActiveGigs();

      // Fonction pour vérifier si toutes les étapes non-désactivées d'une phase sont complétées
      const isPhaseFullyCompleted = (phaseId: number) => {
        const phase = phases[phaseId - 1];
        if (!phase) return false;

        const nonDisabledSteps = phase.steps.filter((step) => !step.disabled);
        return nonDisabledSteps.every((step) =>
          completedSteps.includes(step.id)
        );
      };

      // Déterminer la phase valide en vérifiant que toutes les phases précédentes sont complétées
      let validPhase = 1;

      // Vérifier chaque phase séquentiellement
      for (let phaseId = 1; phaseId <= 4; phaseId++) {
        if (phaseId === 1) {
          // Phase 1 est toujours accessible
          validPhase = 1;
        } else {
          // Pour les phases 2, 3, 4, vérifier que la phase précédente est complétée
          const previousPhaseCompleted = isPhaseFullyCompleted(phaseId - 1);

          if (previousPhaseCompleted) {
            validPhase = phaseId;
            console.log(
              `✅ Phase ${phaseId - 1
              } is fully completed, allowing access to phase ${phaseId}`
            );
          } else {
            console.log(
              `⚠️ Phase ${phaseId - 1
              } is not fully completed, stopping at phase ${validPhase}`
            );
            break; // Arrêter ici, ne pas avancer plus loin
          }
        }
      }

      // Vérifications spéciales pour les cas particuliers
      if (completedSteps.includes(6) && validPhase < 3) {
        // Si step 6 (Knowledge Base) est complété, on peut aller en phase 3
        // MAIS seulement si la phase 2 est complétée
        if (isPhaseFullyCompleted(2)) {
          validPhase = 3;
          console.log(
            "🔄 Step 6 completed and phase 2 is fully completed - setting phase to 3"
          );
        } else {
          console.log(
            "⚠️ Step 6 completed but phase 2 is not fully completed - staying in phase 2"
          );
          validPhase = 2;
        }
      }

      if (completedSteps.includes(12) && validPhase < 4) {
        // Si step 12 (Match HARX REPS) est complété, on peut aller en phase 4
        // MAIS seulement si la phase 3 est complétée
        if (isPhaseFullyCompleted(3)) {
          validPhase = 4;
          console.log(
            "🔄 Step 12 completed and phase 3 is fully completed - setting phase to 4"
          );
        } else {
          console.log(
            "⚠️ Step 12 completed but phase 3 is not fully completed - staying in phase 3"
          );
          validPhase = 3;
        }
      }

      if (completedSteps.includes(10) && validPhase < 4) {
        // Si step 10 (Gig Activation) est complété, on peut aller en phase 4
        // MAIS seulement si la phase 3 est complétée
        if (isPhaseFullyCompleted(3)) {
          validPhase = 4;
          console.log(
            "🔄 Step 10 completed and phase 3 is fully completed - setting phase to 4"
          );
        } else {
          console.log(
            "⚠️ Step 10 completed but phase 3 is not fully completed - staying in phase 3"
          );
          validPhase = 3;
        }
      }

      // Mettre à jour la phase seulement si elle a changé
      if (validPhase !== currentPhase) {
        console.log("🔄 Updating phase from", currentPhase, "to", validPhase);
        setCurrentPhase(validPhase);
        setDisplayedPhase(validPhase);
      }

      console.log("✅ Onboarding state updated successfully");
    } catch (error) {
      console.error("Error updating onboarding state:", error);
      // Ne pas faire échouer toute la fonction si cette mise à jour échoue
    }
  };

  const checkActiveGigs = async () => {
    try {
      console.log("🔍 Checking for active gigs...");

      // Vérifier que companyId est disponible
      if (!companyId) {
        console.error("❌ Company ID not available for checking active gigs");
        return;
      }

      const response = await axios.get<GigResponse>(
        `${import.meta.env.VITE_GIGS_API}/gigs/company/${companyId}`
      );

      if (response.data && response.data.data) {
        const gigs = response.data.data;
        const hasActiveGig = gigs.some(
          (gig: any) =>
            gig.status === "active" ||
            gig.status === "approved" ||
            gig.status === "published"
        );
        const hasAnyGig = gigs.length > 0;

        console.log("🔍 Active gigs check:", {
          totalGigs: gigs.length,
          hasActiveGig,
          hasAnyGig,
          gigStatuses: gigs.map((g: any) => g.status),
        });

        // Auto-complete Step 3 (Create Gigs) if the company has ANY gig
        if (hasAnyGig && !completedSteps.includes(3)) {
          try {
            console.log("✅ Company has gigs - auto-completing Step 3 (Create Gigs)");
            await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/2/steps/3`,
              { status: "completed" }
            );
            setCompletedSteps((prev: number[]) => {
              const next = [...prev];
              if (!next.includes(3)) next.push(3);
              return next;
            });
            console.log("✅ Step 3 marked as completed - gig exists");
          } catch (error) {
            console.error("Error auto-completing step 3:", error);
          }
        }

        // If at least one gig is active, complete the last phase and step
        if (hasActiveGig) {
          try {
            console.log("✅ Found active gig - completing last phase and step");
            const completeResponse = await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL
              }/onboarding/companies/${companyId}/onboarding/complete-last`
            );

            if (completeResponse.data) {
              console.log(
                "✅ Last phase and step completed successfully:",
                completeResponse.data
              );
              // Update local state without reloading the entire project
              setCompletedSteps((prev: any) => {
                const newSteps = [...prev];
                if (!newSteps.includes(12)) {
                  newSteps.push(12);
                }
                return newSteps;
              });

              // Mettre à jour les cookies avec le nouveau progrès
              const currentProgress = {
                currentPhase: 4, // Phase 4 car step 12 est dans la phase 4
                completedSteps: [...completedSteps, 12],
              };
              Cookies.set(
                "companyOnboardingProgress",
                JSON.stringify(currentProgress)
              );

              console.log("✅ Step 12 marked as completed - active gig found");
            }
          } catch (error) {
            console.error("Error completing last phase and step:", error);
            // Ne pas faire échouer toute la fonction si cette mise à jour échoue
          }
        }

        // If no gigs are active and step 12 was previously completed, mark it as in_progress
        else {
          try {
            console.log("⚠️ No active gigs found - updating step 12 status");

            // Mark step 12 as in_progress - seulement si on est en phase 4
            if (currentPhase >= 4) {
              await axios.put(
                `${import.meta.env.VITE_COMPANY_API_URL
                }/onboarding/companies/${companyId}/onboarding/phases/4/steps/12`,
                { status: "in_progress" }
              );
            }

            // Update local state to remove the completed step
            setCompletedSteps((prev: any[]) => prev.filter((step: number) => step !== 12));
            console.log(
              "⚠️ Step 12 removed from completed steps and marked as in_progress"
            );

            // Mettre à jour les cookies avec le nouveau progrès
            const currentProgress = {
              currentPhase: 3, // Retour à la phase 3 car step 12 n'est plus complété
              completedSteps: completedSteps.filter((step: number) => step !== 12),
            };
            Cookies.set(
              "companyOnboardingProgress",
              JSON.stringify(currentProgress)
            );

            console.log(
              "⚠️ Step 12 marked as in_progress - no active gigs found"
            );
          } catch (error) {
            console.error(
              "Error updating onboarding progress for step 12:",
              error
            );
            // Ne pas faire échouer toute la fonction si cette mise à jour échoue
          }
        }
      }
    } catch (error) {
      console.error("Error checking active gigs:", error);
      // Ne pas rediriger vers /auth pour cette erreur, juste la logger
    }
  };

  // Initial check for leads and gigs when component mounts
  useEffect(() => {
    if (companyId) {
      console.log("🔄 Initial check for leads and gigs...");
      checkCompanyLeads();
      checkActiveGigs();
    }
  }, [companyId]);

  // Load company progress when component mounts
  useEffect(() => {
    if (companyId) {
      console.log("🔄 Loading company progress on mount...");
      loadCompanyProgress();
    }
  }, [companyId]);

  const loadCompanyProgress = async () => {
    setIsLoading(true);
    try {
      // Vérifier que companyId est disponible
      if (!companyId) {
        console.error("❌ Company ID not available for loading progress");
        setIsLoading(false);
        return;
      }

      const response = await axios.get<OnboardingProgressResponse>(
        `${import.meta.env.VITE_COMPANY_API_URL
        }/onboarding/companies/${companyId}/onboarding`
      );
      const progress = response.data;
      console.log("🔄 API Response:", response.data);
      console.log("🔄 currentPhase from API:", progress.currentPhase);
      console.log("🔄 completedSteps from API:", progress.completedSteps);

      // Store the progress in cookies
      Cookies.set("companyOnboardingProgress", JSON.stringify(progress));

      // 🛠️ AUTO-FIX: Check if Phase 1 status is mismatching (it should be 'completed' if step 1 is done)
      // This fixes the 400 Bad Request error when trying to access Phase 2
      if (progress.phases && progress.phases[0]) {
        const phase1 = progress.phases[0];
        const step1Completed = progress.completedSteps.includes(1);

        if (step1Completed && phase1.status !== 'completed') {
          console.log("🔧 Phase 1 status mismatch detected: Step 1 is done but Phase 1 is not 'completed'. Attempting auto-fix...");
          try {
            // Re-complete Step 1 to trigger backend logic to update Phase 1 status
            await axios.put(
              `${import.meta.env.VITE_COMPANY_API_URL}/onboarding/companies/${companyId}/onboarding/phases/1/steps/1`,
              { status: "completed" }
            );
            console.log("✅ Phase 1 auto-fix request sent successfully");
            // Optionally reload to reflect changes, but maybe not needed immediately
          } catch (fixError) {
            console.error("❌ Failed to auto-fix Phase 1 status:", fixError);
          }
        }
      }

      // Fonction pour vérifier si toutes les étapes non-désactivées d'une phase sont complétées
      const isPhaseFullyCompleted = (phaseId: number) => {
        const phase = phases[phaseId - 1];
        if (!phase) return false;

        const nonDisabledSteps = phase.steps.filter((step) => !step.disabled);
        return nonDisabledSteps.every((step) =>
          progress.completedSteps.includes(step.id)
        );
      };

      // Déterminer la phase valide en vérifiant que toutes les phases précédentes sont complétées
      let validPhase = 1;

      // Vérifier chaque phase séquentiellement
      for (let phaseId = 1; phaseId <= 4; phaseId++) {
        if (phaseId === 1) {
          // Phase 1 est toujours accessible
          validPhase = 1;
        } else {
          // Pour les phases 2, 3, 4, vérifier que la phase précédente est complétée
          const previousPhaseCompleted = isPhaseFullyCompleted(phaseId - 1);

          if (previousPhaseCompleted) {
            validPhase = phaseId;
            console.log(
              `✅ Phase ${phaseId - 1
              } is fully completed, allowing access to phase ${phaseId}`
            );
          } else {
            console.log(
              `⚠️ Phase ${phaseId - 1
              } is not fully completed, stopping at phase ${validPhase}`
            );
            break; // Arrêter ici, ne pas avancer plus loin
          }
        }
      }

      console.log(
        "🔄 Final valid phase determined:",
        validPhase,
        "from API currentPhase:",
        progress.currentPhase
      );
      console.log("🔄 Setting completed steps:", progress.completedSteps);
      setCurrentPhase(validPhase);
      setDisplayedPhase(validPhase);
      setCompletedSteps(progress.completedSteps);

      // Check for leads and auto-complete step 4 if necessary
      if (!progress.completedSteps.includes(4)) {
        setTimeout(() => {
          checkCompanyLeadsForAutoCompletion();
        }, 100);
      }

      // Force a re-render to ensure the UI updates
      setTimeout(() => {
        console.log("🔄 Forcing re-render after state update");
        setCurrentPhase((prev: any) => prev); // This will trigger a re-render
      }, 50);
    } catch (error) {
      console.error("Error loading company progress:", error);
      // En cas d'erreur, utiliser les valeurs par défaut
      setCurrentPhase(1);
      setDisplayedPhase(1);
      setCompletedSteps([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour vérifier si l'utilisateur vient de se connecter à Zoho
  const checkZohoConnection = async () => {
    try {
      // Vérifier si Zoho est configuré pour cet utilisateur
      const zohoService = ZohoService.getInstance();
      const isConfigured = zohoService.isConfigured();

      // Log the status but don't auto-show UploadContacts
      if (isConfigured) {
        console.log("✅ Zoho est configuré - ready for manual upload");
      }
    } catch (error) {
      console.error("Error checking Zoho connection:", error);
    }
  };

  const handleStartStep = async (stepId: number) => {
    if (!companyId) {
      console.error("Company ID not available for starting step");
      return;
    }

    try {
      // Vérifier si le step est déjà complété
      const isStepCompleted = completedSteps.includes(stepId);

      // Si le step est déjà complété, ne pas changer son statut
      if (isStepCompleted) {
        console.log(`✅ Step ${stepId} is already completed, not changing status`);
      } else {
        // Mettre à jour le statut de l'étape à "in_progress" seulement si pas déjà complétée
        const phaseId =
          phases.findIndex((phase) =>
            phase.steps.some((step) => step.id === stepId)
          ) + 1;

        await axios.put(
          `${import.meta.env.VITE_COMPANY_API_URL
          }/onboarding/companies/${companyId}/onboarding/phases/${phaseId}/steps/${stepId}`,
          { status: "in_progress" }
        );
        console.log(`🔄 Step ${stepId} status updated to in_progress`);
      }

      const allSteps = phases.flatMap((phase) => phase.steps);
      const step = allSteps.find((s) => s.id === stepId);

      // Special handling for Knowledge Base step
      if (stepId === 8) {
        localStorage.setItem("activeTab", "knowledge-base");
        window.dispatchEvent(
          new CustomEvent("tabChange", {
            detail: { tab: "knowledge-base" },
          })
        );
        return;
      }

      // Special handling for Call Script step
      if (stepId === 6) {
        localStorage.setItem("activeTab", "script-generator");
        window.dispatchEvent(
          new CustomEvent("tabChange", {
            detail: { tab: "script-generator" },
          })
        );
        return;
      }

      // Special handling for Gig Activation step (step 12) - redirect to Approval & Publishing
      if (stepId === 12) {
        // Set the active tab to approval-publishing in the App component
        localStorage.setItem("activeTab", "approval-publishing");
        // Trigger a custom event to notify the App component
        window.dispatchEvent(
          new CustomEvent("tabChange", {
            detail: { tab: "approval-publishing" },
          })
        );
        return;
      }

      if (stepId === 3) {
        if (hasGigs || completedSteps.includes(3)) {
          window.location.href = "/app11";
        } else {
          window.location.href = "/app6";
        }
        return;
      }

      if (step?.component) {
        if (stepId === 4) {
          setShowTelephonySetup(true);
        } else {
          setActiveStep(stepId);
        }
      }
    } catch (error: any) {
      console.error("Error updating step status:", error);

      // Handle the specific 400 error regarding previous phases
      if (error.response && error.response.status === 400) {
        alert("Unable to start this step because previous phases are not fully completed. \n\nPlease try the 'Reset Onboarding' button at the bottom of the page to fix potential data inconsistencies.");
      }

      // Afficher un message d'erreur plus informatif
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    }
  };

  const handleResetOnboarding = async () => {
    if (!companyId) return;

    if (confirm("⚠️ WARNING: This will reset your onboarding progress tracking. \n\nYour actual company data (created gigs, profile info) will NOT be deleted, but the 'checklist' progress will be reset to the beginning. \n\nThis is useful to fix 'stuck' phases. Do you want to proceed?")) {
      try {
        await axios.put(`${API_BASE_URL}/onboarding/companies/${companyId}/onboarding/reset`);
        alert("Onboarding progress has been reset. The page will now reload.");
        window.location.reload();
      } catch (error) {
        console.error("Error resetting onboarding:", error);
        alert("Failed to reset onboarding. Please check console for details.");
      }
    }
  };

  // Nouvelle fonction pour gérer la révision des steps complétés
  const handleReviewStep = async (stepId: number) => {
    if (!companyId) {
      console.error("Company ID not available for reviewing step");
      return;
    }

    try {
      console.log(`🔍 Reviewing step ${stepId} (already completed)`);

      const allSteps = phases.flatMap((phase) => phase.steps);
      const step = allSteps.find((s) => s.id === stepId);

      // Special handling for Knowledge Base step
      if (stepId === 8) {
        localStorage.setItem("activeTab", "knowledge-base");
        window.dispatchEvent(
          new CustomEvent("tabChange", {
            detail: { tab: "knowledge-base" },
          })
        );
        return;
      }

      // Special handling for Call Script step
      if (stepId === 6) {
        localStorage.setItem("activeTab", "script-generator");
        window.dispatchEvent(
          new CustomEvent("tabChange", {
            detail: { tab: "script-generator" },
          })
        );
        return;
      }

      // Special handling for Gig Activation step (step 12) - redirect to Approval & Publishing
      if (stepId === 12) {
        // Set the active tab to approval-publishing in the App component
        localStorage.setItem("activeTab", "approval-publishing");
        // Trigger a custom event to notify the App component
        window.dispatchEvent(
          new CustomEvent("tabChange", {
            detail: { tab: "approval-publishing" },
          })
        );
        return;
      }

      if (stepId === 3) {
        console.log("✅ Opening GigDetails for review");
        setShowGigDetails(true);
        return;
      }

      if (step?.component) {
        if (stepId === 4) {
          setShowTelephonySetup(true);
        } else {
          setActiveStep(stepId);
        }
      }
    } catch (error) {
      console.error("Error reviewing step:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    }
  };

  const handleStepComplete = async (stepId: number) => {
    if (!companyId) {
      console.error("Company ID not available for step completion");
      return;
    }

    try {
      const phaseId =
        phases.findIndex((phase) =>
          phase.steps.some((step) => step.id === stepId)
        ) + 1;

      await axios.put(
        `${import.meta.env.VITE_COMPANY_API_URL
        }/onboarding/companies/${companyId}/onboarding/phases/${phaseId}/steps/${stepId}`,
        { status: "completed" }
      );

      setCompletedSteps((prev: any) => [...prev, stepId]);
    } catch (error) {
      console.error("Error completing step:", error);
      // Afficher un message d'erreur plus informatif
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    }
  };

  const handlePhaseChange = async (newPhase: number) => {
    if (!companyId) return;

    // Fonction pour vérifier si toutes les étapes non-désactivées d'une phase sont complétées
    const isPhaseFullyCompleted = (phaseId: number) => {
      const phase = phases[phaseId - 1];
      if (!phase) return false;

      const nonDisabledSteps = phase.steps.filter((step) => !step.disabled);
      return nonDisabledSteps.every((step) => completedSteps.includes(step.id));
    };

    // Vérifier si on peut accéder à la nouvelle phase
    let canAccessPhase = true;

    if (newPhase > 1) {
      // Vérifier que toutes les phases précédentes sont complétées
      for (let phaseId = 1; phaseId < newPhase; phaseId++) {
        if (!isPhaseFullyCompleted(phaseId)) {
          console.log(
            `⚠️ Cannot access phase ${newPhase} - phase ${phaseId} is not fully completed`
          );
          canAccessPhase = false;
          break;
        }
      }
    }

    if (canAccessPhase) {
      // Mettre à jour seulement la phase affichée
      setDisplayedPhase(newPhase);

      // On ne met à jour l'API que si:
      // 1. La nouvelle phase est accessible
      // 2. La nouvelle phase est inférieure ou égale à la phase actuelle
      // 3. La phase n'est pas déjà complétée (currentPhase > newPhase)
      if (
        isPhaseAccessible(newPhase) &&
        newPhase <= currentPhase &&
        !isPhaseCompleted(newPhase)
      ) {
        try {
          await axios.put(
            `${import.meta.env.VITE_COMPANY_API_URL
            }/onboarding/companies/${companyId}/onboarding/current-phase`,
            { phase: newPhase }
          );
          setCurrentPhase(newPhase);
          console.log(`✅ Successfully changed to phase ${newPhase}`);
        } catch (error) {
          console.error("Error updating phase:", error);
        }
      }
    } else {
      console.log(
        `❌ Cannot change to phase ${newPhase} - previous phases not completed`
      );
      // Suppressed popup as requested by user
      console.log(
        `Vous devez compléter toutes les étapes de la phase précédente avant d'accéder à la phase ${newPhase}`
      );
    }
  };

  const isPhaseCompleted = (phaseId: number) => {
    const phase = phases[phaseId - 1];
    return phase.steps
      .filter((step) => !step.disabled)
      .every((step) => completedSteps.includes(step.id));
  };

  const handlePreviousPhase = () => {
    const newPhase = Math.max(1, displayedPhase - 1);
    // Pour Previous, on met juste à jour la phase affichée
    setDisplayedPhase(newPhase);
  };

  const handleNextPhase = () => {
    const newPhase = Math.min(4, displayedPhase + 1);

    // Fonction pour vérifier si toutes les étapes non-désactivées d'une phase sont complétées
    const isPhaseFullyCompleted = (phaseId: number) => {
      const phase = phases[phaseId - 1];
      if (!phase) return false;

      const nonDisabledSteps = phase.steps.filter((step) => !step.disabled);
      return nonDisabledSteps.every((step) => completedSteps.includes(step.id));
    };

    // Vérifier si la phase actuelle est complétée avant d'avancer
    if (displayedPhase < 4) {
      if (isPhaseFullyCompleted(displayedPhase)) {
        console.log(
          `✅ Phase ${displayedPhase} is fully completed, proceeding to phase ${newPhase}`
        );
        handlePhaseChange(newPhase);
      } else {
        console.log(
          `⚠️ Cannot proceed to phase ${newPhase} - current phase ${displayedPhase} is not fully completed`
        );
        console.log(
          `Vous devez compléter toutes les étapes de la phase ${displayedPhase} avant de passer à la phase suivante`
        );
        return;
      }
    } else if (displayedPhase === 4) {
      // Rediriger seulement si on est déjà en phase 4
      window.location.href = "/company#/company";
    }
  };

  const isPhaseAccessible = (phaseId: number) => {
    if (phaseId === 1) return true;

    const previousPhase = phases[phaseId - 2];
    return previousPhase.steps
      .filter((step) => !step.disabled)
      .every((step) => completedSteps.includes(step.id));
  };

  const phases: Phase[] = [
    {
      id: 1,
      title: "Company Account Setup & Identity",
      icon: Building2,
      color: "blue",
      steps: [
        {
          id: 1,
          title: "Create Company Profile",
          description:
            "Legal and commercial details, key contacts, terms agreement",
          status: "completed",
          component: CompanyProfile,
        },
        {
          id: 2,
          title: "KYC / KYB Verification",
          description:
            "Identity verification through Stripe Identity or Sumsub",
          status: "current",
          component: KYCVerification,
          disabled: true,
        },
      ],
    },
    {
      id: 2,
      title: "Operational Setup",
      icon: Settings,
      color: "yellow",
      steps: [
        {
          id: 3,
          title: "Create Gigs",
          description: "Define multi-channel gigs and requirements",
          status: "pending",
          component: GigDetails,
        },
        {
          id: 4,
          title: "Telephony Setup",
          description: "Phone numbers, call tracking, and dialer configuration",
          status: "pending",
          component: TelephonySetup,
        },
        {
          id: 5,
          title: "Upload Contacts",
          description: "Import contacts for multi-channel engagement",
          status: "pending",
          component: UploadContacts,
        },
        {
          id: 6,
          title: "Call Script",
          description: "Define script and conversation flows",
          status: "pending",
          component: CallScript,
        },
        {
          id: 7,
          title: "Reporting Setup",
          description: "Configure KPIs and reporting preferences",
          status: "pending",
          component: ReportingSetup,
          disabled: true,
        },
      ],
    },
    {
      id: 3,
      title: "REPS Engagement",
      icon: Users,
      color: "green",
      steps: [
        {
          id: 8,
          title: "Knowledge Base",
          description: "Create training materials and FAQs",
          status: "pending",
          component: KnowledgeBase,
        },
        {
          id: 9,
          title: "REP Onboarding",
          description: "Training, validation, and contract acceptance",
          status: "pending",
          component: RepOnboarding,
        },
        {
          id: 10,
          title: "Session Planning",
          description: "Schedule call slots and prioritize leads",
          status: "pending",
          component: SessionPlanning,
        },
      ],
    },
    {
      id: 4,
      title: "Activation",
      icon: Rocket,
      color: "red",
      steps: [
        {
          id: 11,
          title: "Subscription Plan",
          description: "Select plan: Free, Standard, or Premium",
          status: "pending",
          component: SubscriptionPlan,
        },
        {
          id: 12,
          title: "Gig Activation",
          description: "Launch multi-channel operations",
          status: "pending",
          component: ApprovalPublishing,
        },
        {
          id: 13,
          title: "MATCH HARX REPS",
          description: "Connect with qualified REPS based on requirements",
          status: "pending",
          component: MatchHarxReps,
        },
      ],
    },
  ];

  const getStepIcon = (step: any) => {
    switch (step.id) {
      case 1:
        return Building2;
      case 2:
        return Shield;
      case 3:
        return MessageSquare;
      case 4:
        return Phone;
      case 5:
        return Upload;
      case 6:
        return FileText;
      case 7:
        return BarChart;
      case 8:
        return BookOpen;
      case 9:
        return Users;
      case 10:
        return Calendar;
      case 11:
        return FileText; // Subscription Plan
      case 12:
        return Rocket;
      case 13:
        return Users; // MATCH HARX REPS
      default:
        return CheckCircle;
    }
  };

  const handleBackToOnboarding = () => {
    // If UploadContacts is showing, cancel processing and return immediately
    if (showUploadContacts) {
      console.log(
        "🛑 Back to onboarding clicked while UploadContacts is active - cancelling processing"
      );

      // Try to call the normal cancel processing function first
      if ((window as any).cancelUploadProcessing) {
        console.log("✅ Calling cancelUploadProcessing function");
        try {
          (window as any).cancelUploadProcessing();
          console.log("✅ cancelUploadProcessing executed successfully");
        } catch (error) {
          console.error("❌ Error calling cancelUploadProcessing:", error);
          // If normal cancellation fails, try emergency cancellation
          if ((window as any).emergencyCancelUpload) {
            console.log("🚨 Trying emergency cancellation...");
            try {
              (window as any).emergencyCancelUpload();
              console.log("✅ Emergency cancellation executed successfully");
            } catch (emergencyError) {
              console.error("❌ Emergency cancellation also failed:", emergencyError);
            }
          }
        }
      } else {
        console.warn("⚠️ cancelUploadProcessing function not found on window");
        // Try emergency cancellation as fallback
        if ((window as any).emergencyCancelUpload) {
          console.log("🚨 Trying emergency cancellation as fallback...");
          try {
            (window as any).emergencyCancelUpload();
            console.log("✅ Emergency cancellation executed successfully");
          } catch (emergencyError) {
            console.error("❌ Emergency cancellation failed:", emergencyError);
          }
        }
      }

      // Remove parsed leads from localStorage to prevent auto-restore
      localStorage.removeItem("parsedLeads");
      localStorage.removeItem("validationResults");
      localStorage.removeItem("uploadProcessing");
      sessionStorage.removeItem("uploadProcessing");
      sessionStorage.removeItem("parsedLeads");
      sessionStorage.removeItem("validationResults");
      console.log("🧹 Removed all storage items");

      // Force close the component immediately
      setShowUploadContacts(false);
      console.log("✅ Set showUploadContacts to false");

      // Simply close UploadContacts and return to normal CompanyOnboarding state
      console.log(
        "✅ Closing UploadContacts and returning to normal onboarding state"
      );
      return;
    }

    // For other cases, just close the active step
    setActiveStep(null);
  };

  const handleStepClick = (stepId: number) => {
    const allSteps = phases.flatMap((phase) => phase.steps);
    const step = allSteps.find((s) => s.id === stepId);
    const currentPhaseSteps = phases[currentPhase - 1].steps;

    // Trouver l'index du step cliqué dans la phase courante
    const stepIndex = currentPhaseSteps.findIndex((s) => s.id === stepId);
    const previousSteps = currentPhaseSteps.slice(0, stepIndex);

    // Vérifier si tous les steps précédents sont complétés
    const allPreviousCompleted = previousSteps.every(
      (s) => s.disabled || completedSteps.includes(s.id)
    );

    // Redirection spéciale pour Create Gigs
    if (stepId === 3) {
      if (completedSteps.includes(stepId)) {
        setShowGigDetails(true);
      } else if (hasGigs) {
        window.location.href = "/app11";
      } else {
        window.location.href = "/app6";
      }
      return;
    }

    // Pour Knowledge Base
    if (stepId === 8) {
      if (allPreviousCompleted) {
        localStorage.setItem("activeTab", "knowledge-base");
        window.dispatchEvent(
          new CustomEvent("tabChange", {
            detail: { tab: "knowledge-base" },
          })
        );
      }
      return;
    }

    // Pour Call Script
    if (stepId === 6) {
      if (allPreviousCompleted) {
        localStorage.setItem("activeTab", "script-generator");
        window.dispatchEvent(
          new CustomEvent("tabChange", {
            detail: { tab: "script-generator" },
          })
        );
      }
      return;
    }

    // Pour Telephony Setup
    if (stepId === 4) {
      if (allPreviousCompleted) {
        setShowTelephonySetup(true);
      }
      return;
    }

    // Pour Upload Contacts
    if (stepId === 5) {
      if (allPreviousCompleted) {
        // Check if UploadContacts was manually closed
        const wasManuallyClosed = sessionStorage.getItem("uploadContactsManuallyClosed");
        if (!wasManuallyClosed) {
          setShowUploadContacts(true);
          console.log("✅ Opening UploadContacts via step click");
        } else {
          console.log("🚫 UploadContacts was manually closed - not reopening");
        }
      }
      return;
    }

    // Pour les autres steps, vérifier la complétion des étapes précédentes
    if (step?.component && allPreviousCompleted && !step.disabled) {
      setActiveStep(stepId);
    }
  };

  // Vérifier si l'utilisateur est authentifié
  if (!userId) {
    console.log("User ID not found, redirecting to /auth");
    window.location.href = "/auth";
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to authentication...</p>
        </div>
      </div>
    );
  }

  // Find the active step component
  const ActiveStepComponent = activeStep
    ? phases
      .flatMap((phase) => phase.steps)
      .find((step) => step.id === activeStep)?.component
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Don't skip rendering - allow component to render normally
  // Navigation will be handled directly by the child components

  // Déterminer quel composant afficher
  let activeComponent = null;
  let onBack: () => void = () => { };

  if (showGigDetails) {
    activeComponent = <GigDetails />;
    onBack = () => {
      setShowGigDetails(false);
    };
  } else if (showTelephonySetup) {
    activeComponent = (
      <TelephonySetup
        onBackToOnboarding={async () => {
          setShowTelephonySetup(false);

          // Force reload onboarding state after telephony setup completion
          if (companyId) {
            try {
              await loadCompanyProgress();
              console.log("✅ Onboarding state reloaded successfully");
            } catch (error) {
              console.error("❌ Error reloading onboarding state:", error);
            }
          }
        }}
      />
    );
    onBack = () => {
      setShowTelephonySetup(false);
    };
  } else if (showUploadContacts) {
    activeComponent = <UploadContacts />;
    onBack = () => {
      // Clean up localStorage when manually closing UploadContacts
      localStorage.removeItem("parsedLeads");
      localStorage.removeItem("validationResults");
      localStorage.removeItem("uploadProcessing");
      sessionStorage.removeItem("uploadProcessing");
      sessionStorage.removeItem("parsedLeads");
      sessionStorage.removeItem("validationResults");
      sessionStorage.removeItem("uploadContactsManuallyClosed");
      console.log("🧹 Manual cleanup - UploadContacts closed");
      setShowUploadContacts(false);
    };
  } else if (ActiveStepComponent) {
    activeComponent = <ActiveStepComponent />;
    onBack = handleBackToOnboarding;
  }

  if (activeComponent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              onBack();
            }}
            className="flex items-center transition-colors text-gray-600 hover:text-gray-900"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
            <span>Back to Onboarding</span>
          </button>
        </div>
        {activeComponent}
      </div>
    );
  }

  // Allow normal rendering - navigation is handled directly by child components

  // Utiliser displayedPhase au lieu de currentPhase pour afficher les steps
  const displayedPhaseData = phases[displayedPhase - 1];
  if (!displayedPhaseData) {
    return (
      <div className="text-center text-red-600">
        Error: Phase data not found. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Company Onboarding</h1>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Save Progress
        </button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-5 gap-4">
        {phases.map((phase) => {
          const PhaseIcon = phase.icon;
          const isActive = displayedPhase === phase.id;
          const isCompleted = isPhaseCompleted(phase.id);
          const isAccessible = isPhaseAccessible(phase.id);



          return (
            <div
              key={phase.id}
              className={`relative rounded-lg p-4 ${isActive
                ? "bg-indigo-50 border-2 border-indigo-500"
                : isCompleted
                  ? "bg-green-50 border border-green-500"
                  : !isAccessible
                    ? "bg-gray-50 border border-gray-300"
                    : "bg-white border border-gray-200"
                } cursor-pointer`}
              onClick={() => handlePhaseChange(phase.id)}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`rounded-full p-2 ${isActive
                    ? "bg-indigo-100 text-indigo-600"
                    : isCompleted
                      ? "bg-green-100 text-green-600"
                      : !isAccessible
                        ? "bg-gray-200 text-gray-500"
                        : "bg-gray-100 text-gray-500"
                    }`}
                >
                  <PhaseIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Phase {phase.id}
                  </p>
                  <p className="text-xs text-gray-500">{phase.title}</p>
                  {!isAccessible && phase.id > 1 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Complete previous phase first
                    </p>
                  )}
                </div>
              </div>
              {phase.id < 4 && (
                <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current Phase Details */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Phase {displayedPhaseData.id}: {displayedPhaseData.title}
          </h2>
          <p className="text-sm text-gray-500">
            {isPhaseAccessible(displayedPhaseData.id)
              ? "Complete the following steps to proceed to the next phase"
              : "Complete all steps in the previous phase to unlock this phase"}
          </p>
        </div>

        <div className="space-y-4">
          {displayedPhaseData.steps.map((step) => {
            const StepIcon = getStepIcon(step);
            const isClickable = !!step.component || step.id === 3;
            const isCompleted = completedSteps.includes(step.id);
            const canAccessPhase = isPhaseAccessible(displayedPhaseData.id);
            const isCurrentStep =
              !isCompleted &&
              !step.disabled &&
              displayedPhaseData.steps
                .slice(
                  0,
                  displayedPhaseData.steps.findIndex((s) => s.id === step.id)
                )
                .every((s) => s.disabled || completedSteps.includes(s.id));

            // A step is accessible if phase is accessible AND (it's completed OR it's the current step)
            const canAccessStep = canAccessPhase && (isCompleted || isCurrentStep);

            return (
              <div
                key={step.id}
                className={`rounded-lg border p-4 ${!canAccessPhase || (!isCompleted && !isCurrentStep && !step.disabled)
                  ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                  : step.disabled
                    ? "opacity-50 cursor-not-allowed border-gray-200"
                    : isCompleted
                      ? "border-green-200 bg-green-50"
                      : isCurrentStep
                        ? "border-indigo-200 bg-indigo-50 ring-2 ring-indigo-500"
                        : "border-gray-200 bg-white"
                  } ${isClickable && !step.disabled && canAccessStep
                    ? "cursor-pointer hover:border-indigo-300"
                    : ""
                  }`}
                onClick={() =>
                  isClickable &&
                  !step.disabled &&
                  canAccessStep &&
                  handleStepClick(step.id)
                }
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`rounded-full p-2 ${!canAccessPhase || (!isCompleted && !isCurrentStep && !step.disabled)
                      ? "bg-gray-200 text-gray-400"
                      : step.disabled
                        ? "bg-gray-200 text-gray-400"
                        : isCompleted
                          ? "bg-green-100 text-green-600"
                          : isCurrentStep
                            ? "bg-indigo-100 text-indigo-600"
                            : "bg-gray-100 text-gray-500"
                      }`}
                  >
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">
                        {step.title}
                      </h3>
                      {!canAccessPhase ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Locked
                        </span>
                      ) : step.disabled ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Coming Soon
                        </span>
                      ) : isCompleted ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Completed
                        </span>
                      ) : isCurrentStep ? (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Current Step
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {step.description}
                    </p>
                    {isClickable && !step.disabled && canAccessStep && (
                      <button
                        className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          isCompleted ? handleReviewStep(step.id) : handleStartStep(step.id);
                        }}
                      >
                        {isCompleted ? "Review Step" : "Start Step"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            disabled={displayedPhase === 1}
            onClick={handlePreviousPhase}
          >
            Previous Phase
          </button>
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            disabled={false}
            onClick={handleNextPhase}
          >
            {displayedPhase === 4 ? "Go to Dashboard" : "Next Phase"}
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Need Help?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button className="flex items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <MessageSquare className="mr-2 h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">
              Chat with Support
            </span>
          </button>
          <button className="flex items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <BookOpen className="mr-2 h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">
              View Documentation
            </span>
          </button>
          <button className="flex items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
            <Calendar className="mr-2 h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">
              Schedule a Call
            </span>
          </button>
        </div>
      </div>

      {/* Debug / Troubleshooting Section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">Troubleshooting Tools</summary>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium mb-2 text-gray-700">Fix Stuck Onboarding</h4>
            <p className="mb-4">If you are unable to proceed to the next phase or get "Bad Request" errors, try resetting the progress tracker.</p>
            <button
              onClick={handleResetOnboarding}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
            >
              Reset Onboarding Progress
            </button>
          </div>
        </details>
      </div>
    </div>
  );
};

export default CompanyOnboarding;
