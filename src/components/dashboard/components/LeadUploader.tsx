import React, { useEffect, useState } from "react";
import { Upload, X, FileText, AlertCircle, Database } from "lucide-react";
import Swal from "sweetalert2";
import axios from "axios";

interface LeadUploaderProps {
  onComplete: () => void;
  onClose: () => void;
}

export function LeadUploader({ onComplete, onClose }: LeadUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zohoConnected, setZohoConnected] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "text/csv" || droppedFile?.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please upload a CSV or Excel file");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === "text/csv" || selectedFile?.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please upload a CSV or Excel file");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);

      const response = await fetch(
        `${import.meta.env.VITE_COMPANY_API_URL}/leads/upload-csv`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();
      if (data.success) {
        Swal.fire({
          title: "Succès",
          text: "Le fichier a été importé avec succès !",
          icon: "success",
          confirmButtonText: "OK",
        });
        onComplete();
      } else {
        throw new Error(data.message || "Échec de l'importation.");
      }
    } catch (err) {
      setError("Erreur lors de l'importation du fichier.");
      Swal.fire({
        title: "Erreur",
        text: "Une erreur est survenue lors de l'importation.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("zoho_access_token", token);
      window.history.replaceState({}, document.title, "/leads");
    }
    // Vérifie la connexion Zoho
    const zohoToken = localStorage.getItem("zoho_access_token");
    setZohoConnected(!!zohoToken);
  }, []);

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem("zoho_refresh_token");
      if (!refreshToken) {
        throw new Error("Aucun refresh token disponible.");
      }

      const response = await axios.post(
        `${import.meta.env.VITE_COMPANY_API_URL}/zoho/refresh-token`,
        {
          refresh_token: refreshToken,
        }
      );

      if (response.data.access_token) {
        localStorage.setItem("zoho_access_token", response.data.access_token);
        return response.data.access_token;
      } else {
        throw new Error("Impossible de rafraîchir le token.");
      }
    } catch (error) {
      console.error("Erreur lors du rafraîchissement du token:", error);
      return null;
    }
  };

  const fetchLeads = async () => {
    setError("");

    let accessToken = localStorage.getItem("zoho_access_token");
    if (!accessToken) {
      window.location.href = `${import.meta.env.VITE_COMPANY_API_URL}/zoho/auth`;
      return;
    }

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/zoho/leads`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      console.log("Zoho API Response:", response.data);

      Swal.fire({
        title: "Succès",
        text: "Leads importés et enregistrés avec succès !",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des leads:", error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Token expiré, essayons de le rafraîchir
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          fetchLeads(); // Réessayer avec le nouveau token
        } else {
          window.location.href = `${import.meta.env.VITE_COMPANY_API_URL}/zoho/auth`;
        }
      } else {
        setError(
          "Impossible de récupérer les leads. Vérifiez votre connexion."
        );
      }
    }
  };

  const checkZohoConnection = async () => {
    const accessToken = localStorage.getItem("zoho_access_token");

    if (!accessToken) {
      // Utilisateur non connecté
      Swal.fire({
        title: "Connecter à Zoho",
        text: "Vous devez vous connecter à Zoho CRM pour importer les leads.",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Se connecter",
        cancelButtonText: "Annuler",
      }).then((result) => {
        if (result.isConfirmed) {
          // Redirige vers Zoho pour la connexion
          window.location.href = `${import.meta.env.VITE_COMPANY_API_URL}/zoho/auth`;
        }
      });
    } else {
      // Utilisateur connecté
      Swal.fire({
        title: "Importer les leads depuis Zoho",
        text: "Voulez-vous importer les leads maintenant ?",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Importer",
        cancelButtonText: "Annuler",
      }).then((result) => {
        if (result.isConfirmed) {
          // Appelle la fonction pour importer les leads
          fetchLeads();
        }
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Import Leads</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed rounded-lg p-8 text-center"
      >
        <div className="mb-4">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            Drag and drop your CSV or Excel file here, or{" "}
            <label className="text-rose-500 hover:text-rose-600 cursor-pointer">
              browse
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-sm text-gray-500">Supported formats: CSV, Excel (.xlsx)</p>
        </div>

        {file && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>{file.name}</span>
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          API Integration
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <button className="p-4 border rounded-lg text-left hover:border-rose-400 hover:bg-rose-50">
            <h5 className="font-medium mb-1">Salesforce</h5>
            <p className="text-sm text-gray-500">
              Import leads from Salesforce CRM
            </p>
          </button>
          {!zohoConnected && (
            <button
              className="p-4 border rounded-lg text-left hover:border-rose-400 hover:bg-rose-50"
              onClick={checkZohoConnection}
            >
              <h5 className="font-medium mb-1">Zoho CRM</h5>
              <p className="text-sm text-gray-500">Import leads from Zoho CRM</p>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:bg-orange-400 flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Upload className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload
            </>
          )}
        </button>
      </div>
    </div>
  );
}
