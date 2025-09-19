import axios from 'axios';

interface RequirementUpdate {
  requirementId: string;
  value: string;
}

export const requirementGroupService = {
  // Mettre à jour les requirements d'un groupe
  async updateRequirements(groupId: string, requirements: RequirementUpdate[]): Promise<void> {
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL}/requirement-groups/${groupId}/requirements`,
        { requirements }
      );
    } catch (error) {
      console.error('Error updating requirements:', error);
      throw error;
    }
  },

  // Mettre à jour une seule valeur textuelle
  async updateTextValue(groupId: string, requirementId: string, value: string): Promise<void> {
    return this.updateRequirements(groupId, [{
      requirementId,
      value
    }]);
  }
};
