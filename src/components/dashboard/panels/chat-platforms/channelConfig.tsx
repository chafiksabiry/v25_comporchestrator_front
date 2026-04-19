import {
  MessageSquare,
  MessageCircle,
  Instagram,
  Send,
  Video
} from "lucide-react";
import React from "react";

export const channelConfig = {
  salesinbox: { 
    color: "blue", 
    label: "SalesInbox",
    icon: <MessageSquare className="w-5 h-5 mr-2" /> 
  },
  whatsapp: { 
    color: "green", 
    label: "WhatsApp",
    icon: <MessageCircle className="w-5 h-5 mr-2" /> 
  },
  messenger: { 
    color: "blue", 
    label: "Messenger",
    icon: <Send className="w-5 h-5 mr-2" /> 
  },
  instagram: { 
    color: "purple", 
    label: "Instagram",
    icon: <Instagram className="w-5 h-5 mr-2" /> 
  },
  tiktok: { 
    color: "black", 
    label: "TikTok",
    icon: <Video className="w-5 h-5 mr-2" /> 
  }
};

// Types réutilisables
export interface ChatMessage {
  sender: {
    type: string;
    name: string;
  };
  message: {
    text: string;
    file?: {
      url: string;
      type: string;
      att_type: string;
    };
  };
  time: string;
}

export interface Chat {
  id: string;
  chat_id?: string;
  visitor: {
    name: string;
  };
  visitor_name?: string;
  last_modified_time: string | number;
} 
