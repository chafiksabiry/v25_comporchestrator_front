import React from "react";
import BaseChatComponent from "./BaseChatComponent";
import { Video, Share2 } from "lucide-react";
import { channelConfig } from "./channelConfig";

const MessengerChat: React.FC = () => {
  const styles = {
    icon: channelConfig.messenger.icon,
    label: channelConfig.messenger.label,
    chatBg: "bg-rose-50",
    headerBg: "bg-rose-500",
    headerText: "text-white",
    messageSenderBg: "bg-rose-500", 
    messageReceiverBg: "bg-gray-100",
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
    activeChatBg: "bg-rose-100",
    addButtonBg: "bg-rose-100 text-rose-500",
    statusColor: "text-gray-200"
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
      channelType="messenger" 
      styles={styles} 
      actionButtons={actionButtons}
      inputButtons={inputButtons}
    />
  );
};

export default MessengerChat; 
