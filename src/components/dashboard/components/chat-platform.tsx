import React from 'react';
import { MessageSquare, Users, Clock, CheckCircle2, Video, Share2, BarChart2, ChevronDown } from 'lucide-react';

type ChannelType = 'whatsapp' | 'tiktok';

interface ChannelConfig {
  icon: React.ReactNode;
  label: string;
  color: string;
}

const channelConfig: Record<ChannelType, ChannelConfig> = {
  whatsapp: {
    icon: <MessageSquare className="w-5 h-5 text-green-600" />,
    label: 'WhatsApp',
    color: 'green'
  },
  tiktok: {
    icon: <MessageSquare className="w-5 h-5 text-rose-500" />,
    label: 'TikTok',
    color: 'blue'
  }
};

interface ChatPlatformProps {
  activeChannel: ChannelType;
  setActiveChannel: (channel: ChannelType) => void;
  showChannelMenu: boolean;
  setShowChannelMenu: (show: boolean) => void;
}

export function ChatPlatform({ activeChannel, setActiveChannel, showChannelMenu, setShowChannelMenu }: ChatPlatformProps) {
  return (
    <div className="relative">
      <button 
        className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-all font-medium"
        onClick={() => setShowChannelMenu(!showChannelMenu)}
      >
        {channelConfig[activeChannel].icon}
        {channelConfig[activeChannel].label}
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>
      
      {showChannelMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg z-10 border border-gray-100">
          {(Object.keys(channelConfig) as ChannelType[]).map((channel) => (
            <button
              key={channel}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center ${
                activeChannel === channel ? 'bg-gray-50 font-medium' : ''
              } ${channel !== 'tiktok' ? 'border-b border-gray-100' : ''}`}
              onClick={() => {
                setActiveChannel(channel);
                setShowChannelMenu(false);
              }}
            >
              {channelConfig[channel].icon}
              <span className={`text-${channelConfig[channel].color}-600`}>
                {channelConfig[channel].label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 
