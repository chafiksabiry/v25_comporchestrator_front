import { useState, useCallback, useEffect } from "react";

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  status: string;
  value?: number;
  probability?: number;
  metadata?: {
    ai_analysis?: {
      score?: number;
      sentiment?: string;
    };
  };
  updated_at: string;
}

export function useLeads(p0: (prevLeads: any) => any[]) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true); // Démarre le chargement
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/leads`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch leads");
      }
      const data = await response.json();
      setLeads(data.data); // Met à jour l'état avec les données récupérées
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message); // Gère l'erreur
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false); // Arrête le chargement
    }
  };

  useEffect(() => {
    fetchLeads(); // Appel à l'API lors du premier rendu
  }, []);

  const analyzeLead = useCallback(async (lead: Lead) => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedLead = {
        ...lead,
        metadata: {
          ...lead.metadata,
          ai_analysis: {
            score: Math.floor(Math.random() * 30) + 70,
            sentiment: Math.random() > 0.5 ? "Positive" : "Neutral",
          },
        },
      };

      setLeads((prevLeads) =>
        prevLeads.map((l) => (l.id === lead.id ? updatedLead : l))
      );
    } catch (err) {
      setError("Failed to analyze lead");
    } finally {
      setLoading(false);
    }
  }, []);

  const generateScript = useCallback(
    async (lead: Lead, type: "email" | "call") => {
      try {
        setLoading(true);
        // Simulated API call for script generation
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        setError("Failed to generate script");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const generateResponse = useCallback(async (lead: Lead, context: string) => {
    try {
      setLoading(true);
      // Simulated API call for response generation
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      setError("Failed to generate response");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    leads,
    loading,
    error,
    analyzeLead,
    generateScript,
    generateResponse,
  };
}
