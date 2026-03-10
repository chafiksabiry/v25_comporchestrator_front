// Service pour gérer la sauvegarde automatique des brouillons de formation
import { Company, TrainingJourney, ContentUpload, TrainingModule, TrainingMethodology } from '../../types';
import { JourneyService } from './JourneyService';
import Cookies from 'js-cookie';
import { extractObjectId, normalizeObjectIds, toExtendedJson } from '../../lib/mongoUtils';

const DRAFT_STORAGE_KEY = 'training_journey_draft';
const DRAFT_SAVE_INTERVAL = 30000; // Sauvegarder toutes les 30 secondes

export interface JourneyDraft {
  company: Company | null;
  journey: TrainingJourney | null;
  methodology: TrainingMethodology | null;
  uploads: ContentUpload[];
  modules: TrainingModule[];
  currentStep: number;
  selectedGigId: string | null;
  lastSaved: string;
  draftId?: string; // ID du brouillon sauvegardé dans le backend
}

export class DraftService {
  private static saveTimeout: NodeJS.Timeout | null = null;
  private static isCleaning: boolean = false; // Flag to prevent infinite recursion during cleanup

  /**
   * Sauvegarder le brouillon localement (localStorage)
   * IMPORTANT: Validates and cleans IDs to ensure only MongoDB ObjectIds are stored
   * Stores IDs in Extended JSON format: {"$oid": "..."}
   */
  static saveDraftLocally(draft: Partial<JourneyDraft>): void {
    try {
      const existingDraft = this.getDraftLocally();
      const updatedDraft: JourneyDraft = {
        ...existingDraft,
        ...draft,
        lastSaved: new Date().toISOString()
      };

      // CRITICAL: Clean up invalid IDs before saving to localStorage
      // Only store MongoDB ObjectIds (24 hex characters), not UUIDs or timestamps
      const isValidMongoId = (id: string | undefined) => id && /^[0-9a-fA-F]{24}$/.test(id);

      // Extract ObjectId from Extended JSON format if present
      let journeyId = updatedDraft.journey ? extractObjectId((updatedDraft.journey as any).id) : null;
      if (journeyId && !isValidMongoId(journeyId)) {
        journeyId = null;
        if (updatedDraft.journey) {
          delete (updatedDraft.journey as any).id;
        }
      }

      // Extract draftId from Extended JSON format if present
      let draftIdStr = extractObjectId(updatedDraft.draftId);
      if (draftIdStr && !isValidMongoId(draftIdStr)) {
        draftIdStr = null;
        updatedDraft.draftId = undefined;
      }

      // Clean module IDs (remove UUIDs, keep only ObjectIds)
      if (updatedDraft.modules && Array.isArray(updatedDraft.modules)) {
        updatedDraft.modules = updatedDraft.modules.map(module => {
          const cleanedModule = { ...module };
          // Extract and validate module ID
          const moduleId = extractObjectId(cleanedModule.id);
          if (moduleId && !isValidMongoId(moduleId)) {
            delete cleanedModule.id;
          } else if (moduleId) {
            cleanedModule.id = moduleId; // Ensure it's a string, not Extended JSON
          }

          // Clean section IDs if present
          if ((cleanedModule as any).sections && Array.isArray((cleanedModule as any).sections)) {
            (cleanedModule as any).sections = (cleanedModule as any).sections.map((section: any) => {
              const sectionId = extractObjectId(section.id);
              if (sectionId && !isValidMongoId(sectionId)) {
                const cleanedSection = { ...section };
                delete cleanedSection.id;
                return cleanedSection;
              } else if (sectionId) {
                return { ...section, id: sectionId }; // Ensure it's a string
              }
              return section;
            });
          }

          // Clean content IDs if present
          if (cleanedModule.content && Array.isArray(cleanedModule.content)) {
            cleanedModule.content = cleanedModule.content.map((content: any) => {
              const contentId = extractObjectId(content.id);
              if (contentId && !isValidMongoId(contentId)) {
                const cleanedContent = { ...content };
                delete cleanedContent.id;
                return cleanedContent;
              } else if (contentId) {
                return { ...content, id: contentId }; // Ensure it's a string
              }
              return content;
            });
          }
          return cleanedModule;
        });
      }

      // Convert to Extended JSON format before saving to localStorage
      const extendedDraft = toExtendedJson(updatedDraft);
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(extendedDraft));
      // Removed verbose logging
    } catch (error) {
      console.error('[DraftService] Error saving draft locally:', error);
    }
  }

  /**
   * Récupérer le brouillon depuis localStorage
   * Converts Extended JSON ObjectIds back to strings for use in the application
   */
  static getDraftLocally(): JourneyDraft {
    try {
      const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftJson) {
        const rawDraft = JSON.parse(draftJson);

        // Normalize ObjectIds from Extended JSON format to strings
        const draft = normalizeObjectIds<JourneyDraft>(rawDraft);

        // CRITICAL: Clean up invalid draftId (timestamps) from localStorage
        // If journey.id is a timestamp (not MongoDB ObjectId), remove it
        // Use a flag to prevent infinite recursion
        if (!this.isCleaning) {
          this.isCleaning = true;
          try {
            const isValidMongoId = (id: string | undefined) => id && /^[0-9a-fA-F]{24}$/.test(id);
            let needsSave = false;

            // Extract journey.id (now normalized to string)
            if (draft.journey && (draft.journey as any).id) {
              const journeyId = extractObjectId((draft.journey as any).id);
              if (journeyId && !isValidMongoId(journeyId)) {
                console.warn('[DraftService] Found invalid journey.id (timestamp) in localStorage:', journeyId, '- removing it');
                delete (draft.journey as any).id;
                // Also clear draftId if it's the same invalid value
                const draftIdStr = extractObjectId(draft.draftId);
                if (draftIdStr === journeyId) {
                  console.warn('[DraftService] Clearing invalid draftId:', draftIdStr);
                  draft.draftId = undefined;
                }
                needsSave = true;
              } else if (journeyId) {
                // Ensure it's stored as a string
                (draft.journey as any).id = journeyId;
              }
            }

            // Also validate draftId (now normalized to string)
            const draftIdStr = extractObjectId(draft.draftId);
            if (draftIdStr && !isValidMongoId(draftIdStr)) {
              console.warn('[DraftService] Found invalid draftId (timestamp) in localStorage:', draftIdStr, '- clearing it');
              draft.draftId = undefined;
              needsSave = true;
            } else if (draftIdStr) {
              draft.draftId = draftIdStr; // Ensure it's a string
            }

            // CRITICAL: Clean module IDs (remove UUIDs, keep only ObjectIds)
            if (draft.modules && Array.isArray(draft.modules)) {
              draft.modules = draft.modules.map((module: any) => {
                const cleanedModule = { ...module };
                // Extract and validate module ID
                const moduleId = extractObjectId(cleanedModule.id);
                if (moduleId && !isValidMongoId(moduleId)) {
                  console.warn('[DraftService] Found invalid module.id (UUID/timestamp) in localStorage:', moduleId, '- removing it');
                  delete cleanedModule.id;
                  needsSave = true;
                } else if (moduleId) {
                  cleanedModule.id = moduleId; // Ensure it's a string
                }

                // Clean section IDs if present
                if (cleanedModule.sections && Array.isArray(cleanedModule.sections)) {
                  cleanedModule.sections = cleanedModule.sections.map((section: any) => {
                    const sectionId = extractObjectId(section.id);
                    if (sectionId && !isValidMongoId(sectionId)) {
                      console.warn('[DraftService] Found invalid section.id (UUID/timestamp) in localStorage:', sectionId, '- removing it');
                      const cleanedSection = { ...section };
                      delete cleanedSection.id;
                      needsSave = true;
                      return cleanedSection;
                    } else if (sectionId) {
                      return { ...section, id: sectionId }; // Ensure it's a string
                    }
                    return section;
                  });
                }

                // Clean content IDs if present
                if (cleanedModule.content && Array.isArray(cleanedModule.content)) {
                  cleanedModule.content = cleanedModule.content.map((content: any) => {
                    const contentId = extractObjectId(content.id);
                    if (contentId && !isValidMongoId(contentId)) {
                      console.warn('[DraftService] Found invalid content.id (UUID/timestamp) in localStorage:', contentId, '- removing it');
                      const cleanedContent = { ...content };
                      delete cleanedContent.id;
                      needsSave = true;
                      return cleanedContent;
                    } else if (contentId) {
                      return { ...content, id: contentId }; // Ensure it's a string
                    }
                    return content;
                  });
                }
                return cleanedModule;
              });
            }

            // Save cleaned draft back to localStorage only if changes were made
            if (needsSave) {
              // Convert back to Extended JSON format before saving
              const extendedDraft = toExtendedJson(draft);
              // Use direct localStorage.setItem to avoid recursion
              localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(extendedDraft));
            }
          } finally {
            this.isCleaning = false;
          }
        }

        return draft;
      }
    } catch (error) {
      console.error('[DraftService] Error loading draft from localStorage:', error);
    }
    return {
      company: null,
      journey: null,
      methodology: null,
      uploads: [],
      modules: [],
      currentStep: 0,
      selectedGigId: null,
      lastSaved: new Date().toISOString()
    };
  }

  /**
   * Sauvegarder le brouillon dans le backend (avec debounce)
   */
  static async saveDraftToBackend(draft: Partial<JourneyDraft>): Promise<void> {
    // Annuler la sauvegarde précédente si elle est en attente
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Programmer une sauvegarde après un délai
    this.saveTimeout = setTimeout(async () => {
      // Prevent concurrent saves
      if (this.isSaving) {
        console.log('[DraftService] Save already in progress, skipping debounced save...');
        return;
      }

      this.isSaving = true;

      try {
        const fullDraft = this.getDraftLocally();
        const updatedDraft: JourneyDraft = {
          ...fullDraft,
          ...draft,
          lastSaved: new Date().toISOString()
        };

        // Sauvegarder localement d'abord
        this.saveDraftLocally(updatedDraft);

        // Si on a un journey et des modules, sauvegarder dans le backend
        if (updatedDraft.journey && updatedDraft.modules.length > 0) {
          const companyId = Cookies.get('companyId');
          const gigId = updatedDraft.selectedGigId || null;

          // Préparer le journey avec status="draft"
          const journeyToSave: TrainingJourney = {
            ...updatedDraft.journey,
            status: 'draft',
            title: (updatedDraft.journey as any).title || updatedDraft.journey.name
          };

          try {
            // CRITICAL: Re-read draft from localStorage to get the most recent draftId
            // This ensures we don't create duplicates if draftId was saved by another call
            const latestDraft = this.getDraftLocally();

            // IMPORTANT: Only use MongoDB ObjectId format (24 hex characters)
            // Don't use timestamps or other non-MongoDB IDs from journey.id
            const isValidMongoId = (id: string | undefined) => id && /^[0-9a-fA-F]{24}$/.test(id);

            // Priority: latestDraft.draftId > updatedDraft.draftId > journey._id (never use journey.id as it might be a timestamp)
            let existingJourneyId = latestDraft.draftId || updatedDraft.draftId || (updatedDraft.journey as any)._id;

            // Validate that it's a MongoDB ObjectId
            if (existingJourneyId && !isValidMongoId(existingJourneyId)) {
              console.warn('[DraftService] ⚠️ Invalid draftId format (debounced, not MongoDB ObjectId):', existingJourneyId, '- will create new journey');
              existingJourneyId = null;
            }

            console.log('[DraftService] DraftId sources (debounced):', {
              fromLatestDraft: latestDraft.draftId,
              fromUpdatedDraft: updatedDraft.draftId,
              fromJourneyId: (updatedDraft.journey as any).id,
              fromJourney_id: (updatedDraft.journey as any)._id,
              finalJourneyId: existingJourneyId,
              isValid: existingJourneyId ? isValidMongoId(existingJourneyId) : false
            });

            if (!existingJourneyId) {
              console.warn('[DraftService] ⚠️ No valid draftId found (debounced), will create new journey.');
            } else {
              console.log('[DraftService] ✓ Found valid existing draftId (debounced):', existingJourneyId);
            }

            console.log('[DraftService] Saving draft (debounced) with journeyId:', existingJourneyId || 'NEW');

            const response = await JourneyService.saveJourney(
              journeyToSave,
              updatedDraft.modules,
              companyId,
              gigId,
              undefined, // finalExam
              existingJourneyId // Pass existing journeyId to update instead of create
            );

            // Spring Data MongoDB uses 'id' (not '_id') in Java entities
            // Backend can return journey directly or wrapped in response.journey
            const savedJourney = response.journey || response;
            const savedJourneyId = savedJourney?.id || savedJourney?._id || response.journeyId;

            if (response.success && savedJourneyId) {
              // Validate that it's a MongoDB ObjectId
              const isValidMongoId = (id: string | undefined) => id && /^[0-9a-fA-F]{24}$/.test(id);

              if (!isValidMongoId(savedJourneyId)) {
                console.error('[DraftService] ✗ Invalid journeyId returned from backend (debounced):', savedJourneyId);
              } else {
                // CRITICAL: Re-read draft again to merge with any concurrent updates
                const finalDraft = this.getDraftLocally();
                finalDraft.draftId = savedJourneyId;
                finalDraft.modules = updatedDraft.modules; // Update modules
                finalDraft.lastSaved = new Date().toISOString();
                this.saveDraftLocally(finalDraft);

                console.log('[DraftService] ✓ Draft saved successfully (debounced), journeyId:', savedJourneyId);
                console.log('[DraftService] ✓ draftId saved to localStorage (debounced):', savedJourneyId);
              }
            }
          } catch (error) {
            console.warn('[DraftService] Could not save draft to backend (will retry):', error);
            // Ne pas bloquer l'utilisateur si la sauvegarde backend échoue
          }
        }
      } catch (error) {
        console.error('[DraftService] Error saving draft to backend:', error);
      } finally {
        this.isSaving = false;
      }
    }, DRAFT_SAVE_INTERVAL);
  }

  /**
   * Sauvegarder immédiatement (sans debounce)
   * Prevents concurrent saves to avoid creating multiple journeys
   */
  static async saveDraftImmediately(draft: Partial<JourneyDraft>): Promise<void> {
    // Prevent concurrent saves
    if (this.isSaving) {
      console.log('[DraftService] Save already in progress, skipping...');
      return;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    this.isSaving = true;

    try {
      // CRITICAL: Always get the latest draft from localStorage to ensure we have the most recent draftId
      const fullDraft = this.getDraftLocally();

      // CRITICAL: Preserve draftId if it exists - don't overwrite it
      // Priority: draft.draftId (explicitly passed) > fullDraft.draftId (from localStorage)
      const updatedDraft: JourneyDraft = {
        ...fullDraft,
        ...draft,
        draftId: draft.draftId || fullDraft.draftId, // Preserve existing draftId
        lastSaved: new Date().toISOString()
      };

      // Sauvegarder localement AVANT de sauvegarder dans le backend
      this.saveDraftLocally(updatedDraft);

      console.log('[DraftService] Local draft updated, draftId:', updatedDraft.draftId);

      // Sauvegarder dans le backend si possible
      // IMPORTANT: Only save if we have both journey AND modules (to avoid creating empty journeys)
      if (updatedDraft.journey && updatedDraft.modules.length > 0) {
        const companyId = Cookies.get('companyId');
        const gigId = updatedDraft.selectedGigId || null;

        const journeyToSave: TrainingJourney = {
          ...updatedDraft.journey,
          status: 'draft',
          title: (updatedDraft.journey as any).title || updatedDraft.journey.name
        };

        try {
          // CRITICAL: Re-read draft from localStorage MULTIPLE TIMES to get the most recent draftId
          // This ensures we don't create duplicates if draftId was saved by another call
          let latestDraft = this.getDraftLocally();

          // IMPORTANT: Only use MongoDB ObjectId format (24 hex characters)
          // Don't use timestamps or other non-MongoDB IDs from journey.id
          const isValidMongoId = (id: string | undefined) => id && /^[0-9a-fA-F]{24}$/.test(id);

          // Priority: draft.draftId > latestDraft.draftId > journey._id (never use journey.id as it might be a timestamp)
          let existingJourneyId = draft.draftId || latestDraft.draftId || (updatedDraft.journey as any)._id;

          // Double-check: read again right before saving to catch any last-second updates
          latestDraft = this.getDraftLocally();
          existingJourneyId = draft.draftId || latestDraft.draftId || existingJourneyId || (updatedDraft.journey as any)._id;

          // Validate that it's a MongoDB ObjectId
          if (existingJourneyId && !isValidMongoId(existingJourneyId)) {
            console.warn('[DraftService] ⚠️ Invalid draftId format (not MongoDB ObjectId):', existingJourneyId, '- will create new journey');
            existingJourneyId = null;
          }

          console.log('[DraftService] DraftId sources:', {
            fromParam: draft.draftId,
            fromLatestDraft: latestDraft.draftId,
            fromJourneyId: (updatedDraft.journey as any).id,
            fromJourney_id: (updatedDraft.journey as any)._id,
            finalJourneyId: existingJourneyId,
            isValid: existingJourneyId ? isValidMongoId(existingJourneyId) : false
          });

          if (!existingJourneyId) {
            console.warn('[DraftService] ⚠️ No valid draftId found, will create new journey. Make sure draftId is saved after first creation.');
          } else {
            console.log('[DraftService] ✓ Found valid existing draftId:', existingJourneyId);
          }

          console.log('[DraftService] Saving draft with journeyId:', existingJourneyId || 'NEW');

          const response = await JourneyService.saveJourney(
            journeyToSave,
            updatedDraft.modules,
            companyId,
            gigId,
            undefined, // finalExam
            existingJourneyId // Pass existing journeyId to update instead of create
          );

          // Spring Data MongoDB uses 'id' (not '_id') in Java entities
          // Backend can return journey directly or wrapped in response.journey
          const savedJourney = response.journey || response;
          const savedJourneyId = savedJourney?.id || savedJourney?._id || response.journeyId;

          if (response.success && savedJourneyId) {
            // Validate that it's a MongoDB ObjectId
            const isValidMongoId = (id: string | undefined) => id && /^[0-9a-fA-F]{24}$/.test(id);

            if (!isValidMongoId(savedJourneyId)) {
              console.error('[DraftService] ✗ Invalid journeyId returned from backend:', savedJourneyId);
            } else {
              // CRITICAL: Save draftId immediately to localStorage to prevent duplicate creation
              // Re-read draft again to merge with any concurrent updates
              const finalDraft = this.getDraftLocally();
              finalDraft.draftId = savedJourneyId;
              finalDraft.modules = updatedDraft.modules; // Update modules
              finalDraft.lastSaved = new Date().toISOString();
              this.saveDraftLocally(finalDraft);

              console.log('[DraftService] ✓ Draft saved immediately, journeyId:', savedJourneyId);
              console.log('[DraftService] ✓ draftId saved to localStorage:', savedJourneyId);
            }
          } else {
            console.error('[DraftService] ✗ Save failed - response:', response);
          }
        } catch (error) {
          console.warn('[DraftService] Could not save draft immediately to backend:', error);
        }
      } else {
        console.log('[DraftService] Skipping save - missing journey or modules:', {
          hasJourney: !!updatedDraft.journey,
          modulesCount: updatedDraft.modules.length
        });
      }
    } catch (error) {
      console.error('[DraftService] Error saving draft immediately:', error);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Restaurer le brouillon
   */
  static getDraft(): JourneyDraft {
    return this.getDraftLocally();
  }

  /**
   * Supprimer le brouillon
   */
  static clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      // Draft cleared
    } catch (error) {
      console.error('[DraftService] Error clearing draft:', error);
    }
  }

  /**
   * Vérifier si un brouillon existe
   */
  static hasDraft(): boolean {
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      return draft !== null && draft !== '{}';
    } catch (error) {
      return false;
    }
  }
}

