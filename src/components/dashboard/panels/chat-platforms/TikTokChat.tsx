import React from "react";
import BaseChatComponent from "./BaseChatComponent";
import { Video, Share2 } from "lucide-react";
import { channelConfig } from "./channelConfig";

const TikTokChat: React.FC = () => {
  const styles = {
    icon: channelConfig.tiktok.icon,
    label: channelConfig.tiktok.label,
    chatBg: "bg-slate-50",
    headerBg: "bg-black",
    headerText: "text-white",
    messageSenderBg: "bg-black",
    messageReceiverBg: "bg-gray-100",
    messageReceiverText: "text-gray-800",
    messageSenderText: "text-white",
    messageSenderName: "text-gray-300",
    messageReceiverName: "text-gray-700 font-semibold",
    buttonColor: "bg-black hover:bg-gray-800",
    ringColor: "focus:ring-black",
    nameColor: "text-black",
    statsBg: "bg-slate-50",
    statsIcon: "text-black",
    statsTitle: "text-black",
    statsValue: "text-black",
    statsSubtext: "text-gray-600",
    activeChatBg: "bg-gray-200",
    addButtonBg: "bg-gray-200 text-gray-700",
    statusColor: "text-gray-500"
  };

  const actionButtons = (
    <>
      <button className="p-2 rounded-lg hover:bg-opacity-20 hover:bg-white">
        <Video className="w-5 h-5 text-white" />
      </button>
      <button className="p-2 rounded-lg hover:bg-opacity-20 hover:bg-white">
        <Share2 className="w-5 h-5 text-white" />
      </button>
    </>
  );

  const inputButtons = null;

  return (
    <BaseChatComponent 
      channelType="tiktok" 
      styles={styles} 
      actionButtons={actionButtons}
      inputButtons={inputButtons}
    />
  );
};

export default TikTokChat; 
