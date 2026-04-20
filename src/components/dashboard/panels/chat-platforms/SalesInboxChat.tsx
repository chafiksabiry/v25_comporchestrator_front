import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Video, Share2, Users, Clock, CheckCircle2, BarChart2, PlusCircle, Send } from "lucide-react";
import { channelConfig } from "./channelConfig";
import { ZohoTokenService } from '../../services/zohoService';

interface Chat {
  id: string;
  chat_id: string;
  visitor: {
    name: string;
  };
  visitor_name: string;
  last_modified_time: number;
  status: string;
  question: string;
  owner: {
    id: string;
    name: string;
    email: string;
    image_key: string;
  };
  department: {
    id: string;
    name: string;
  };
}

interface Message {
  id: string;
  time: string;
  sender: {
    name: string;
    type: string;
    id: string;
  };
  type: string;
  message: {
    text?: string;
    file?: {
      name: string;
      url: string;
      type: string;
    };
    operation_user?: any;
    chat_close_by?: string;
  };
}

const SalesInboxChat: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isZohoConnected, setIsZohoConnected] = useState(false);

  const styles = {
    icon: channelConfig.salesinbox.icon,
    label: channelConfig.salesinbox.label,
    chatBg: "bg-gray-50",
    headerBg: "bg-white",
    headerText: "text-gray-800",
    messageSenderBg: "bg-rose-500",
    messageReceiverBg: "bg-white",
    messageReceiverText: "text-gray-800",
    messageSenderText: "text-white",
    messageSenderName: "text-rose-100",
    messageReceiverName: "text-rose-600 font-semibold",
    buttonColor: "bg-rose-500 hover:bg-rose-600",
    ringColor: "focus:ring-rose-400",
    nameColor: "text-rose-500",
    statsBg: "bg-rose-50",
    statsIcon: "text-rose-500",
    statsTitle: "text-rose-600",
    statsValue: "text-rose-500",
    statsSubtext: "text-rose-500",
    activeChatBg: "bg-gray-100",
    addButtonBg: "bg-rose-100 text-rose-500",
    statusColor: "text-gray-500"
  };

  const actionButtons = (
    <>
      <button className="p-2 rounded-lg hover:bg-rose-100">
        <Video className="w-5 h-5 text-rose-500" />
      </button>
      <button className="p-2 rounded-lg hover:bg-rose-100">
        <Share2 className="w-5 h-5 text-rose-500" />
      </button>
    </>
  );

  const fetchChats = async () => {
    setLoading(true);
    const token = ZohoTokenService.getToken();

    if (!token) {
      setIsZohoConnected(false);
      handleZohoConnect();
      return;
    }

    try {
      const res = await axios.get(`${import.meta.env.VITE_COMPANY_API_URL}/zoho/chats`, {
        headers: {
          "Authorization": `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.data?.success && res.data?.data?.success && Array.isArray(res.data?.data?.data?.data)) {
        const chatData = res.data.data.data.data.map((chat: any) => ({
          id: chat.id,
          chat_id: chat.id,
          visitor: {
            name: chat.visitor?.name || 'Unknown User'
          },
          visitor_name: chat.visitor?.name || 'Unknown User',
          last_modified_time: chat.last_modified_time || Date.now(),
          status: chat.status,
          question: chat.question,
          owner: chat.owner,
          department: chat.department
        }));

        setChats(chatData);
        setIsZohoConnected(true);
      } else {
        setChats([]);
      }
    } catch (err: any) {
      console.error(`Erreur de récupération des discussions pour salesinbox:`, err);

      if (err.response?.status === 401) {
        setIsZohoConnected(false);
        handleZohoConnect();
      } else {
        setChats([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    setLoadingMessages(true);
    const token = ZohoTokenService.getToken();

    if (!token) {
      setIsZohoConnected(false);
      handleZohoConnect();
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_COMPANY_API_URL}/zoho/chats/${chatId}/messages`,
        {
          headers: {
            "Authorization": `Zoho-oauthtoken ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (res.data?.success && res.data?.data?.data) {
        const messagesData = res.data.data.data.data.map((msg: any) => ({
          id: msg.id,
          time: msg.time,
          sender: msg.sender,
          type: msg.type,
          message: msg.message
        }));
        setMessages(messagesData);
        
      } else {
        setMessages([]);
      }
      setActiveChat(chatId);
    } catch (err: any) {
      console.error(`Erreur de récupération des messages pour salesinbox:`, err);

      if (err.response?.status === 401) {
        setIsZohoConnected(false);
        handleZohoConnect();
      } else {
        setMessages([]);
      }
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!activeChat || !message.trim()) return;

    const token = ZohoTokenService.getToken();
    if (!token) {
      setIsZohoConnected(false);
      handleZohoConnect();
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_COMPANY_API_URL}/zoho/chats/${activeChat}`,
        { text: message },
        {
          headers: {
            "Authorization": `Zoho-oauthtoken ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const newMessageObj: Message = {
        id: Date.now().toString(),
        time: Date.now().toString(),
        sender: {
          type: "operator",
          name: "Vous",
          id: "operator-1"
        },
        type: "text",
        message: {
          text: message
        }
      };

      setMessages((prevMessages) => [...prevMessages, newMessageObj]);
      setMessage("");
    } catch (err) {
      console.error(`Erreur d'envoi du message pour salesinbox:`, err);

      const newMessageObj: Message = {
        id: Date.now().toString(),
        time: Date.now().toString(),
        sender: {
          type: "operator",
          name: "Vous",
          id: "operator-1"
        },
        type: "text",
        message: {
          text: message
        }
      };

      setMessages((prevMessages) => [...prevMessages, newMessageObj]);
      setMessage("");
    }
  };

  const handleZohoConnect = async () => {
    try {
      setLoading(true);
      const configData = {
        clientId: "1000.xxxx",
        clientSecret: "xxxx",
        refreshToken: "xxxx"
      };

      const configResponse = await fetch('https://harxv25dashboardfrontend.netlify.app/api/zoho/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      const configResult = await configResponse.json();

      if (!configResponse.ok) {
        throw new Error(configResult.message || 'Erreur lors de la configuration de Zoho');
      }

      if (configResult.success) {
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

        if (tokenResult.access_token) {
          ZohoTokenService.setToken(tokenResult.access_token);
          setIsZohoConnected(true);
          fetchChats();
        } else {
          throw new Error('Token non reçu');
        }
      }

    } catch (error) {
      console.error('Erreur lors de la configuration:', error);
      setIsZohoConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string | number) => {
    const parsedTime = Number(timestamp);
    if (isNaN(parsedTime)) return "Date invalide";
    return new Date(parsedTime).toLocaleString();
  };

  // Ajout d'une fonction utilitaire pour le jour abrégé en français
  const getDayShortFr = (date: Date) => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  };

  // Ajout d'une fonction utilitaire pour le mois en français
  const getMonthFr = (date: Date) => {
    const months = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return months[date.getMonth()];
  };

  // Fonction utilitaire pour décoder les entités HTML
  function decodeHtmlEntities(text: string) {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  }

  useEffect(() => {
    const token = ZohoTokenService.getToken();
    if (!token) {
      setIsZohoConnected(false);
      handleZohoConnect();
    } else {
      setIsZohoConnected(true);
      fetchChats();
    }
  }, []);

  if (!isZohoConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg p-4">
        <p className="text-gray-600 mb-4">
          You need to connect to Zoho CRM to use the SalesInbox.
        </p>
        <a
          href="/integrations"
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
        >
          Go to Integrations
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 px-2">
        <h3 className="text-xl font-bold text-gray-700 flex items-center">
          {styles.icon}
          {styles.label} Conversations
        </h3>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className={`p-5 rounded-xl shadow-sm hover:shadow-md transition-all ${styles.statsBg}`}>
          <div className="flex items-center gap-3 mb-3">
            <Users className={`w-6 h-6 ${styles.statsIcon}`} />
            <span className={`font-semibold ${styles.statsTitle}`}>Active Chats</span>
          </div>
          <div className={`text-3xl font-bold ${styles.statsValue}`}>{chats.length}</div>
          <div className={`text-sm mt-1 ${styles.statsSubtext}`}>Online now</div>
        </div>
        <div className="bg-rose-50 p-5 rounded-xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-6 h-6 text-rose-500" />
            <span className="font-semibold text-rose-600">Resolved</span>
          </div>
          <div className="text-3xl font-bold text-rose-500">48</div>
          <div className="text-sm text-rose-500 mt-1">Today</div>
        </div>
        <div className="bg-yellow-50 p-5 rounded-xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-6 h-6 text-yellow-600" />
            <span className="font-semibold text-yellow-700">Average Time</span>
          </div>
          <div className="text-3xl font-bold text-yellow-800">8m</div>
          <div className="text-sm text-yellow-600 mt-1">Response time</div>
        </div>
        <div className="bg-purple-50 p-5 rounded-xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-3">
            <BarChart2 className="w-6 h-6 text-purple-600" />
            <span className="font-semibold text-purple-700">Satisfaction</span>
          </div>
          <div className="text-3xl font-bold text-purple-800">94%</div>
          <div className="text-sm text-purple-600 mt-1">Last 7 days</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className={`col-span-1 border rounded-xl overflow-hidden ${styles.chatBg}`}>
          <div className={`p-4 border-b ${styles.headerBg} sticky top-0 flex justify-between items-center`}>
            <h3 className={`font-semibold text-lg ${styles.headerText} flex items-center`}>
              {styles.icon}
              {styles.label} Conversations
            </h3>
            <button className={`p-1.5 rounded-full ${styles.addButtonBg}`}>
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="divide-y h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : chats.length > 0 ? (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  className={`w-full p-4 text-left hover:bg-gray-100 flex items-center gap-4 transition-all ${activeChat === chat.id ? styles.activeChatBg : ""
                    }`}
                  onClick={() => loadMessages(chat.id)}
                >
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(chat.visitor.name)}&background=random`}
                    alt=""
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <div className={`font-medium text-lg ${styles.nameColor}`}>
                      {chat.visitor.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(chat.last_modified_time)}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center text-gray-500 p-6">
                Aucune conversation active sur {styles.label}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className={`p-4 border-b flex items-center justify-between ${styles.headerBg}`}>
            <div className="flex items-center gap-3">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  activeChat
                    ? chats.find((chat) => chat.id === activeChat)?.visitor_name || "User"
                    : "User"
                )}&background=random`}
                alt="Customer"
                className="w-12 h-12 rounded-full"
              />
              <div>
                <div className={`font-medium ${styles.headerText} flex items-center`}>
                  {styles.icon}
                  {activeChat
                    ? chats.find((chat) => chat.id === activeChat)?.visitor_name || "Sélectionnez une conversation"
                    : "Sélectionnez une conversation"}
                </div>
                <div className={`text-sm ${styles.statusColor}`}>
                  {activeChat ? "Online" : ""}
                </div>
              </div>
            </div>
            {activeChat && (
              <div className="flex gap-2">
                {actionButtons}
              </div>
            )}
          </div>
          <div className={`h-[600px] p-6 overflow-y-auto ${styles.chatBg}`}>
            {loadingMessages ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : activeChat ? (
              messages.length > 0 ? (
                messages.map((msg, index) => {
                  if (!msg.message.text || !msg.message.text.trim()) return null;
                  const isOperator = msg.sender?.type === "operator" || msg.sender?.type === "bot";
                  const currentTime = Number(msg.time);
                  let showTimestamp = false;
                  if (index === 0) {
                    showTimestamp = true;
                  } else {
                    const prevMsg = messages[index - 1];
                    const prevTime = Number(prevMsg.time);
                    if (!isNaN(currentTime) && !isNaN(prevTime) && currentTime - prevTime > 900000) {
                      showTimestamp = true;
                    }
                  }
                  // Formatage du timestamp selon l'ancienneté
                  let timestampLabel = '';
                  if (showTimestamp && !isNaN(currentTime)) {
                    const dateObj = new Date(currentTime);
                    const now = new Date();
                    const diff = now.getTime() - dateObj.getTime();
                    const oneWeek = 7 * 24 * 60 * 60 * 1000;
                    const oneYear = 365 * 24 * 60 * 60 * 1000;
                    const day = getDayShortFr(dateObj);
                    const hour = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    if (diff < oneWeek) {
                      timestampLabel = `${day} ${hour}`;
                    } else if (diff < oneYear) {
                      const dayNum = dateObj.getDate();
                      const month = getMonthFr(dateObj);
                      timestampLabel = `${day} ${dayNum} ${month} ${hour}`;
                    } else {
                      const dayNum = dateObj.getDate();
                      const month = getMonthFr(dateObj);
                      const year = dateObj.getFullYear();
                      timestampLabel = `${day} ${dayNum} ${month} ${year} ${hour}`;
                    }
                  }
                  return (
                    <React.Fragment key={index}>
                      {showTimestamp && timestampLabel && (
                        <div className="w-full flex justify-center my-2">
                          <span className="text-xs text-gray-300 bg-transparent px-2 rounded-full">
                            {timestampLabel}
                          </span>
                        </div>
                      )}
                      <div
                        className={`mb-3 flex w-full ${isOperator ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`p-4 rounded-2xl shadow max-w-[70%] break-words ${isOperator
                              ? "bg-rose-500 text-white"
                              : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          <div className="text-md">
                            {decodeHtmlEntities(msg.message.text)}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center text-gray-500 mb-4">
                    Aucun message dans cette conversation
                  </div>
                  <div className="text-sm text-gray-400">
                    Commencez la conversation en envoyant un message
                  </div>
                </div>
              )
            ) : (
              <div className="text-center text-gray-500 mt-32">
                Sélectionnez une conversation pour afficher les messages
              </div>
            )}
          </div>

          {activeChat && (
            <div className="p-4 border-t bg-white flex items-center gap-3">
              <input
                type="text"
                className={`flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 ${styles.ringColor} focus:border-transparent`}
                placeholder={`Type your message on ${styles.label}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
              />
              <button
                className={`px-6 py-3 text-white rounded-xl transition-all font-medium ${styles.buttonColor} flex items-center`}
                onClick={sendMessage}
              >
                <Send className="w-4 h-4 mr-2" /> Send
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SalesInboxChat; 
