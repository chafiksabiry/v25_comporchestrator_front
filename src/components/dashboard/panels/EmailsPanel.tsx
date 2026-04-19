import React, { useState, useEffect } from 'react';
import {
  Mail,
  Inbox,
  Send,
  Clock,
  Archive,
  Filter,
  Calendar,
  Share2,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { ZohoTokenService } from '../services/zohoService';
import { useNavigate } from 'react-router-dom';

interface Email {
  id: string;
  subject: string;
  sender: string;
  receivedTime: string;
  status: string;
  fromAddress: string;
  toAddress?: string;
  summary?: string;
}

function EmailsPanel() {
  const [activeFilter, setActiveFilter] = useState('inbox');
  const [emails, setEmails] = useState<Email[]>([]);
  const [sentEmailsCount, setSentEmailsCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    content: ''
  });
  const navigate = useNavigate();
  const [isZohoConnected, setIsZohoConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isEmailDetailOpen, setIsEmailDetailOpen] = useState(false);

  const fetchEmails = async () => {
    let accessToken = localStorage.getItem("zoho_access_token");
    if (!accessToken) {
      window.location.href = `${import.meta.env.VITE_API_URL}/zoho/auth`;
      return;
    }
    try {
      setLoading(true);
      const endpoints = {
        inbox: '/zoho/emails/inbox',
        sent: '/zoho/emails/sent',
        archived: '/zoho/emails/archived'
      };

      const endpoint = endpoints[activeFilter as keyof typeof endpoints] || '/zoho/emails/inbox';
      const response = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.data.success) {
        const emailsData = response.data.data.data;
        const cleanedEmails = (Array.isArray(emailsData) ? emailsData : emailsData.data || []).map((email: Email) => ({
          ...email,
          toAddress: email.toAddress
            ?.replace(/&quot;/g, '"')
            ?.replace(/&lt;/g, '<')
            ?.replace(/&gt;/g, '>')
        }));
        setEmails(cleanedEmails);

        if (activeFilter === 'inbox') {
          setInboxCount(cleanedEmails.length);
          setUnreadCount(cleanedEmails.filter((email: { status: string; }) => email.status === "0").length);
        } else if (activeFilter === 'sent') {
          setSentEmailsCount(cleanedEmails.length);
        } else if (activeFilter === 'archived') {
          setArchivedCount(cleanedEmails.length);
        }
      }
    } catch (err) {
      setError("Erreur lors de la récupération des emails");
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string | number) => {
    const parsedTime = Number(timestamp); // Assure que c'est bien un nombre
    if (isNaN(parsedTime)) return "Date invalide"; // Gestion des erreurs

    return new Date(parsedTime).toLocaleString();
  };

  const cleanEmailAddress = (email: string = '') => {
    // Décode d'abord tous les caractères HTML
    let cleaned = email
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    // Extrait le nom ou l'email
    const matches = cleaned.match(/["']?([^"'<]*?)["']?\s*<(.+?)>/);
    if (matches) {
      // Retourne le nom s'il existe, sinon la partie locale de l'email
      return matches[1].trim() || matches[2].split('@')[0];
    }

    // Si pas de format spécial, retourner la partie avant @ ou l'email complet
    return cleaned.split('@')[0];
  };

  const getEmailPart = (email: string) => {
    return email
      ?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] // Extrait l'adresse email
      || email;
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implémenter l'envoi d'email
    console.log('Email à envoyer:', emailForm);
    setIsComposeOpen(false);
    setEmailForm({ to: '', subject: '', content: '' });
  };

  const handleReply = (email: Email) => {
    setEmailForm({
      to: email.fromAddress,
      subject: `Re: ${email.subject}`,
      content: `\n\n-------- Original Message --------\nFrom: ${email.sender}\nSubject: ${email.subject}\n`
    });
    setIsComposeOpen(true);
  };

  const handleArchive = async (email: Email) => {
    const accessToken = localStorage.getItem("zoho_access_token");
    if (!accessToken) return;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/zoho/emails/${email.id}/archive`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Rafraîchir les données après l'archivage
      await fetchEmails();
      await fetchAllCounts(); // Mettre à jour tous les compteurs

      // Optionnel : Afficher un message de succès
      alert("Email archivé avec succès");
    } catch (err) {
      console.error("Erreur lors de l'archivage:", err);
      setError("Erreur lors de l'archivage de l'email");
      alert("Erreur lors de l'archivage de l'email");
    }
  };

  const handleShare = async (email: Email) => {
    // Créer un lien partageble
    const shareText = `
Sujet: ${email.subject}
De: ${email.sender}
Date: ${formatDate(email.receivedTime)}
    `;

    try {
      await navigator.clipboard.writeText(shareText);
      alert("Détails de l'email copiés dans le presse-papier !");
    } catch (err) {
      console.error("Erreur lors de la copie:", err);
      alert("Erreur lors de la copie des détails");
    }
  };

  const handleZohoConnect = async () => {
    try {
      setIsLoading(true);

      const configData = {
        clientId: "1000.xxxx", // Remplacer par votre vrai Client ID
        clientSecret: "xxxx", // Remplacer par votre vrai Client Secret
        refreshToken: "xxxx" // Remplacer par votre vrai Refresh Token
      };

      console.log("Tentative de configuration avec:", configData);

      // Première étape : Configuration
      const configResponse = await fetch('https://harxv25dashboardfrontend.netlify.app/api/zoho/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      const configResult = await configResponse.json();
      console.log("Configuration response:", configResult);

      if (!configResponse.ok) {
        throw new Error(configResult.message || 'Erreur lors de la configuration de Zoho');
      }

      if (configResult.success) {
        console.log("Configuration réussie, récupération du token...");
        // Deuxième étape : Récupération du token
        const tokenResponse = await fetch('https://harxv25dashboardfrontend.netlify.app/api/zoho/token', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!tokenResponse.ok) {
          throw new Error('Erreur lors de la récupération du token');
        }

        const tokenResult = await tokenResponse.json();
        console.log("Token response:", tokenResult);

        if (tokenResult.access_token) {
          console.log("Nouveau token récupéré:", tokenResult.access_token);
          localStorage.setItem('zoho_access_token', tokenResult.access_token);
          setIsZohoConnected(true);
          // Vous pouvez ajouter ici d'autres actions après la connexion réussie
        } else {
          throw new Error('Token non reçu');
        }
      }

    } catch (error) {
      console.error('Erreur lors de la configuration:', error);
      setIsZohoConnected(false);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const checkZohoConnection = () => {
    const token = localStorage.getItem('zoho_access_token');
    return !!token;
  };

  const fetchAllCounts = async () => {
    let accessToken = localStorage.getItem("zoho_access_token");
    if (!accessToken) return;

    try {
      const [sentResponse, archivedResponse, inboxResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/zoho/emails/sent`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/zoho/emails/archived`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/zoho/emails/inbox`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      ]);

      if (sentResponse.data.success) {
        const sentEmails = sentResponse.data.data.data;
        setSentEmailsCount(Array.isArray(sentEmails) ? sentEmails.length : (sentEmails.data || []).length);
      }

      if (archivedResponse.data.success) {
        const archivedEmails = archivedResponse.data.data.data;
        setArchivedCount(Array.isArray(archivedEmails) ? archivedEmails.length : (archivedEmails.data || []).length);
      }

      if (inboxResponse.data.success) {
        const inboxEmails = inboxResponse.data.data.data;
        const cleanedInbox = Array.isArray(inboxEmails) ? inboxEmails : (inboxEmails.data || []);
        setInboxCount(cleanedInbox.length);
        setUnreadCount(cleanedInbox.filter((email: { status: string }) => email.status === "0").length);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des compteurs:", err);
    }
  };

  const handleDisconnect = () => {
    // Supprimer le token
    localStorage.removeItem('zoho_access_token');

    // Réinitialiser les états
    setIsZohoConnected(false);
    setEmails([]);
    setSentEmailsCount(0);
    setInboxCount(0);
    setArchivedCount(0);
    setUnreadCount(0);
    setError(null);

    // Rediriger vers la page d'intégrations
    navigate('/integrations');
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    setIsEmailDetailOpen(true);
  };

  useEffect(() => {
    const token = localStorage.getItem('zoho_access_token');
    console.log("=== Initialisation ===");
    console.log("Token au démarrage:", token ? "Présent" : "Absent");

    if (token) {
      console.log("Token value:", token);
      setIsZohoConnected(true);
      fetchAllCounts();
    } else {
      console.log("Aucun token trouvé - Configuration de Zoho");
      setIsZohoConnected(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isZohoConnected) {
      fetchEmails();
    }
  }, [activeFilter, isZohoConnected]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isZohoConnected && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                Vous devez vous connecter à Zoho CRM pour accéder aux emails.
                <button
                  onClick={() => navigate('/integrations')}
                  className="ml-2 text-amber-700 underline hover:text-amber-800"
                >
                  Se connecter maintenant
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Email Management</h2>
          </div>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Compose
          </button>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-rose-50 p-6 rounded-xl hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <Inbox className="w-6 h-6 text-rose-500" />
              <span className="font-semibold text-rose-500">Inbox</span>
            </div>
            <div className="text-3xl font-bold text-rose-500">{inboxCount}</div>
            <div className="text-sm font-medium text-rose-500">
              {unreadCount} unread
            </div>
          </div>
          <div className="bg-green-50 p-6 rounded-xl hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <Send className="w-6 h-6 text-green-600" />
              <span className="font-semibold text-green-800">Sent</span>
            </div>
            <div className="text-3xl font-bold text-green-800">{sentEmailsCount}</div>
            <div className="text-sm font-medium text-green-600">Total sent</div>
          </div>
          <div className="bg-yellow-50 p-6 rounded-xl hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-6 h-6 text-yellow-600" />
              <span className="font-semibold text-yellow-800">Average Response</span>
            </div>
            <div className="text-3xl font-bold text-yellow-800">2.4h</div>
            <div className="text-sm font-medium text-yellow-600">Last 7 days</div>
          </div>
          <div className="bg-gray-50 p-6 rounded-xl hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <Archive className="w-6 h-6 text-gray-600" />
              <span className="font-semibold text-gray-800">Archived</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">{archivedCount}</div>
            <div className="text-sm font-medium text-gray-600">Total</div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <button
            className={`px-4 py-2 rounded-lg ${activeFilter === 'inbox'
                ? 'bg-purple-600 text-white shadow-md transform scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow'
              }`}
          >
            <Inbox className="w-4 h-4" />
            Inbox
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${activeFilter === 'sent'
                ? 'bg-purple-600 text-white shadow-md transform scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow'
              }`}
          >
            Sent
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${activeFilter === 'archived'
                ? 'bg-purple-600 text-white shadow-md transform scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow'
              }`}
          >
            Archived
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3">From</th>
                <th className="pb-3">Subject</th>
                <th className="pb-3">Time</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://i.pravatar.cc/32?img=${i + 15}`}
                        alt="Sender"
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="font-medium">Sarah Johnson</div>
                        <div className="text-sm text-gray-500">sarah@example.com</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">Question about product features</td>
                  <td className="py-3">3 hours ago</td>
                  <td className="py-3">
                    <span className="px-2 py-1 bg-rose-100 text-rose-500 rounded-full text-sm">
                      New
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Mail className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Archive className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EmailsPanel;
