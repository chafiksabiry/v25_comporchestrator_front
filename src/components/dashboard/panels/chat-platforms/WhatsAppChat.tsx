import React from "react";
import BaseChatComponent from "./BaseChatComponent";
import { Phone, Video, Mic } from "lucide-react";
import { channelConfig } from "./channelConfig";

const WhatsAppChat: React.FC = () => {
  const styles = {
    icon: channelConfig.whatsapp.icon,
    label: channelConfig.whatsapp.label,
    chatBg: "bg-green-50",
    headerBg: "bg-green-500",
    headerText: "text-white",
    messageSenderBg: "bg-green-600",
    messageReceiverBg: "bg-white",
    messageReceiverText: "text-gray-800",
    messageSenderText: "text-white",
    messageSenderName: "text-green-100",
    messageReceiverName: "text-green-700 font-semibold",
    buttonColor: "bg-green-600 hover:bg-green-700",
    ringColor: "focus:ring-green-500",
    nameColor: "text-green-600",
    statsBg: "bg-green-50",
    statsIcon: "text-green-600",
    statsTitle: "text-green-700",
    statsValue: "text-green-800",
    statsSubtext: "text-green-600",
    activeChatBg: "bg-green-100",
    addButtonBg: "bg-green-100 text-green-600",
    statusColor: "text-gray-200"
  };

  const actionButtons = (
    <>
      <button className="p-2 rounded-full bg-green-50 hover:bg-green-100 transition-all">
        <Phone className="w-5 h-5 text-green-600" />
      </button>
      <button className="p-2 rounded-full bg-green-50 hover:bg-green-100 transition-all">
        <Video className="w-5 h-5 text-green-600" />
      </button>
    </>
  );

  const inputButtons = (
    <div className="flex gap-2">
      <button className="p-2 rounded-full bg-green-50 hover:bg-green-100 transition-all">
        <Mic className="w-5 h-5 text-green-600" />
      </button>
    </div>
  );

  return (
    <BaseChatComponent 
      channelType="whatsapp" 
      styles={styles} 
      actionButtons={actionButtons}
      inputButtons={inputButtons}
    />
  );
};

export default WhatsAppChat; 
