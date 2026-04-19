import React from "react";
import BaseChatComponent from "./BaseChatComponent";
import { Image, Video } from "lucide-react";
import { channelConfig } from "./channelConfig";

const InstagramChat: React.FC = () => {
  const styles = {
    icon: channelConfig.instagram.icon,
    label: channelConfig.instagram.label,
    chatBg: "bg-gradient-to-br from-purple-50 to-pink-50",
    headerBg: "bg-gradient-to-r from-purple-600 to-pink-600",
    headerText: "text-white",
    messageSenderBg: "bg-gradient-to-r from-purple-500 to-pink-500",
    messageReceiverBg: "bg-white",
    messageReceiverText: "text-gray-800",
    messageSenderText: "text-white",
    messageSenderName: "text-pink-100",
    messageReceiverName: "text-purple-700 font-semibold",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
    ringColor: "focus:ring-purple-500",
    nameColor: "text-purple-600",
    statsBg: "bg-purple-50",
    statsIcon: "text-purple-600",
    statsTitle: "text-purple-700",
    statsValue: "text-purple-800",
    statsSubtext: "text-purple-600",
    activeChatBg: "bg-purple-100",
    addButtonBg: "bg-purple-100 text-purple-600",
    statusColor: "text-gray-200"
  };

  const actionButtons = (
    <>
      <button className="p-2 rounded-full bg-purple-50 hover:bg-purple-100 transition-all">
        <Image className="w-5 h-5 text-purple-600" />
      </button>
      <button className="p-2 rounded-full bg-purple-50 hover:bg-purple-100 transition-all">
        <Video className="w-5 h-5 text-purple-600" />
      </button>
    </>
  );

  const inputButtons = (
    <div className="flex gap-2">
      <button className="p-2 rounded-full bg-purple-50 hover:bg-purple-100 transition-all">
        <Image className="w-5 h-5 text-purple-600" />
      </button>
    </div>
  );

  return (
    <BaseChatComponent 
      channelType="instagram" 
      styles={styles} 
      actionButtons={actionButtons}
      inputButtons={inputButtons}
    />
  );
};

export default InstagramChat; 
