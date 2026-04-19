import React, { useState } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  BarChart2,
  PlusCircle,
  Send,
  Video,
  Share2
} from "lucide-react";

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
  };
}

interface BaseChatProps {
  channelType: string;
  styles: any;
  actionButtons?: React.ReactNode;
  inputButtons?: React.ReactNode;
}

const BaseChatComponent: React.FC<BaseChatProps> = ({ 
  channelType, 
  styles, 
  actionButtons,
  inputButtons
}) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      time: new Date().toISOString(),
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

    setMessages(prev => [...prev, newMessage]);
    setMessage("");
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
          <div className={`text-3xl font-bold ${styles.statsValue}`}>0</div>
          <div className={`text-sm mt-1 ${styles.statsSubtext}`}>Online now</div>
        </div>
        <div className="bg-rose-50 p-5 rounded-xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-6 h-6 text-rose-500" />
            <span className="font-semibold text-rose-600">Resolved</span>
          </div>
          <div className="text-3xl font-bold text-rose-500">0</div>
          <div className="text-sm text-rose-500 mt-1">Today</div>
        </div>
        <div className="bg-yellow-50 p-5 rounded-xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-6 h-6 text-yellow-600" />
            <span className="font-semibold text-yellow-700">Average Time</span>
          </div>
          <div className="text-3xl font-bold text-yellow-800">0m</div>
          <div className="text-sm text-yellow-600 mt-1">Response time</div>
        </div>
        <div className="bg-purple-50 p-5 rounded-xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-3">
            <BarChart2 className="w-6 h-6 text-purple-600" />
            <span className="font-semibold text-purple-700">Satisfaction</span>
          </div>
          <div className="text-3xl font-bold text-purple-800">0%</div>
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
            <div className="text-center text-gray-500 p-6">
              Aucune conversation active sur {styles.label}
            </div>
          </div>
        </div>

        <div className="col-span-2 border rounded-xl overflow-hidden bg-white shadow-sm">
          <div className={`p-4 border-b flex items-center justify-between ${styles.headerBg}`}>
            <div className="flex items-center gap-3">
              <img
                src="https://ui-avatars.com/api/?name=User&background=random"
                alt="Customer"
                className="w-12 h-12 rounded-full"
              />
              <div>
                <div className={`font-medium ${styles.headerText} flex items-center`}>
                  {styles.icon} 
                  Sélectionnez une conversation
                </div>
                <div className={`text-sm ${styles.statusColor}`}>
                  Offline
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {actionButtons}
            </div>
          </div>
          <div className={`h-[600px] p-6 overflow-y-auto ${styles.chatBg}`}>
            {messages.length > 0 ? (
              messages.map((msg, index) => {
                const isOperator = msg.sender?.type === "operator";
                return (
                  <div
                    key={index}
                    className={`mb-4 p-4 rounded-xl flex w-full max-w-[70%] ${
                      isOperator
                        ? `${styles.messageSenderBg} ml-auto rounded-tr-none shadow-md`
                        : `${styles.messageReceiverBg} mr-auto rounded-tl-none shadow-sm border border-gray-100`
                    }`}
                  >
                    <img
                      src={isOperator
                        ? "https://harx25pageslinks.netlify.app/favicon.png"
                        : "https://ui-avatars.com/api/?name=User&background=random"
                      }
                      alt={msg.sender?.type === "visitor" ? "Visitor" : "Operator"}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className={`flex flex-col ${isOperator ? 'items-end' : ''}`}>
                      <div className={`text-sm ${isOperator ? styles.messageSenderName : styles.messageReceiverName}`}>
                        {msg.sender?.name || "Unknown"}
                      </div>
                      {msg.type === "file" && msg.message.file?.type === "audio" ? (
                        <audio controls>
                          <source
                            src={msg.message.file.url}
                            type={msg.message.file.type}
                          />
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <div className={`text-md ${isOperator ? styles.messageSenderText : styles.messageReceiverText}`}>
                          {msg.message.text}
                        </div>
                      )}
                      <div className={`text-xs ${isOperator ? "text-rose-100" : "text-gray-500"}`}>
                        {formatDate(msg.time)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 mt-32">
                Sélectionnez une conversation pour afficher les messages
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-white flex items-center gap-3">
            {inputButtons}
            
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
        </div>
      </div>
    </>
  );
};

export default BaseChatComponent; 
