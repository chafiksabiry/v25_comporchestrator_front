import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  Users,
  Clock,
  CheckCircle2,
  Video,
  Share2,
  BarChart2
} from 'lucide-react';

function ChatPanel() {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // Charger les discussions
  useEffect(() => {
    axios.get("https://harxv25dashboardfrontend.netlify.app/api/zoho/chats")
      .then((res) => {
        setChats(res.data.chats || []);
      })
      .catch((err) => {
        console.error("Erreur de récupération des discussions :", err);
      });
  }, []);

  // Charger les messages de la discussion sélectionnée
  const loadMessages = async (chatId: string) => {
    try {
      const res = await axios.get(`https://harxv25dashboardfrontend.netlify.app/api/zoho/chats/${chatId}/transcript`);
      setMessages(res.data.transcript || []);
      setActiveChat(chatId);
    } catch (err) {
      console.error("Erreur de récupération des messages :", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Liste des discussions */}
          <div className="col-span-1 border rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-semibold">Active Conversations</h3>
            </div>
            <div className="divide-y">
              {chats.map((chat) => (
                <button
                  key={chat.chat_id}
                  className="w-full p-4 text-left hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => loadMessages(chat.chat_id)}
                >
                  <img
                    src={`https://i.pravatar.cc/32?img=${Math.floor(Math.random() * 50)}`}
                    alt="Customer"
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="font-medium">{chat.visitor_name || "Unknown User"}</div>
                    <div className="text-sm text-gray-500">{chat.last_message_time}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Zone des messages */}
          <div className="col-span-2 border rounded-lg">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-semibold">
                {activeChat ? `Discussion avec ${activeChat}` : "Sélectionnez une conversation"}
              </h3>
            </div>
            <div className="h-96 p-4 bg-gray-50 overflow-y-auto">
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div key={index} className={`mb-3 p-2 rounded-lg w-fit ${msg.sender === "visitor" ? "bg-green-100 self-start" : "bg-gray-200 self-end"}`}>
                    <p className="text-sm">{msg.message}</p>
                    <div className="text-xs text-gray-500">{msg.timestamp}</div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 mt-32">
                  Sélectionnez une conversation pour afficher les messages.
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tapez votre message..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
