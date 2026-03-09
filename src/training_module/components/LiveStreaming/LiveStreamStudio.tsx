import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Users, MessageSquare, Settings, Sword as Record, Square, Play, Pause, Volume2, VolumeX, Maximize, Minimize, Camera, Palette, Zap, BarChart3, Eye, Hand, ThumbsUp, Heart, Smile } from 'lucide-react';
import { LiveStreamSession, LiveParticipant, Poll, ChatMessage } from '../../types';

interface LiveStreamStudioProps {
  session: LiveStreamSession;
  isInstructor: boolean;
  onSessionUpdate: (session: LiveStreamSession) => void;
}

export default function LiveStreamStudio({ session, isInstructor, onSessionUpdate }: LiveStreamStudioProps) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeStream();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'screen' },
          audio: true
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          initializeStream();
        };
      } else {
        setIsScreenSharing(false);
        initializeStream();
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Implement recording logic with MediaRecorder API
  };

  const sendChatMessage = () => {
    if (chatMessage.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'user',
        message: chatMessage,
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      
      onSessionUpdate({
        ...session,
        chatMessages: [...session.chatMessages, newMessage]
      });
      
      setChatMessage('');
    }
  };

  const createPoll = () => {
    const newPoll: Poll = {
      id: Date.now().toString(),
      question: 'How well do you understand the current topic?',
      options: ['Very well', 'Somewhat', 'Need more explanation', 'Confused'],
      type: 'single',
      isActive: true,
      responses: [],
      createdAt: new Date().toISOString()
    };
    
    setActivePoll(newPoll);
    onSessionUpdate({
      ...session,
      polls: [...session.polls, newPoll]
    });
  };

  const sendReaction = (reaction: string) => {
    setSelectedReaction(reaction);
    setTimeout(() => setSelectedReaction(null), 2000);
    
    // Send reaction to other participants
    const reactionMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: `reacted with ${reaction}`,
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    onSessionUpdate({
      ...session,
      chatMessages: [...session.chatMessages, reactionMessage]
    });
  };

  const reactions = [
    { emoji: '👍', name: 'thumbs-up', icon: ThumbsUp },
    { emoji: '❤️', name: 'heart', icon: Heart },
    { emoji: '😊', name: 'smile', icon: Smile },
    { emoji: '✋', name: 'hand', icon: Hand },
  ];

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${session.status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-white font-medium">{session.title}</span>
          </div>
          {session.status === 'live' && (
            <div className="flex items-center space-x-2 text-red-400">
              <Record className="h-4 w-4" />
              <span className="text-sm">LIVE</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-white">
          <Eye className="h-4 w-4" />
          <span className="text-sm">{session.participants.length} viewers</span>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Video Area */}
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-cover bg-black"
          />
          
          {/* Video Overlay Controls */}
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 group">
            {/* Top Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black bg-opacity-50 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2 text-white text-sm">
                  <BarChart3 className="h-4 w-4" />
                  <span>Quality: 1080p</span>
                  <span>•</span>
                  <span>Latency: 2.3s</span>
                </div>
              </div>
              
              {isInstructor && (
                <div className="bg-black bg-opacity-50 rounded-lg px-3 py-2">
                  <div className="flex items-center space-x-2 text-white text-sm">
                    <Users className="h-4 w-4" />
                    <span>{session.analytics.totalViewers} total</span>
                    <span>•</span>
                    <span>{session.analytics.peakViewers} peak</span>
                  </div>
                </div>
              )}
            </div>

            {/* Center Play/Pause for recorded content */}
            {session.status !== 'live' && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="bg-black bg-opacity-50 rounded-full p-4 text-white hover:bg-opacity-70 transition-colors">
                  <Play className="h-8 w-8" />
                </button>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black bg-opacity-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleVideo}
                      className={`p-2 rounded-lg transition-colors ${
                        isVideoOn ? 'bg-gray-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </button>
                    
                    <button
                      onClick={toggleAudio}
                      className={`p-2 rounded-lg transition-colors ${
                        isAudioOn ? 'bg-gray-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>

                    {isInstructor && (
                      <>
                        <button
                          onClick={toggleScreenShare}
                          className={`p-2 rounded-lg transition-colors ${
                            isScreenSharing ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
                          }`}
                        >
                          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                        </button>
                        
                        <button
                          onClick={toggleRecording}
                          className={`p-2 rounded-lg transition-colors ${
                            isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-600 text-white'
                          }`}
                        >
                          {isRecording ? <Square className="h-5 w-5" /> : <Record className="h-5 w-5" />}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Reactions */}
                    <div className="flex items-center space-x-1">
                      {reactions.map((reaction) => (
                        <button
                          key={reaction.name}
                          onClick={() => sendReaction(reaction.emoji)}
                          className="p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                          title={reaction.name}
                        >
                          <span className="text-lg">{reaction.emoji}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reaction Animation */}
          {selectedReaction && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce">
              {selectedReaction}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 flex flex-col">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setShowChat(true)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                showChat ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare className="h-4 w-4 mx-auto mb-1" />
              Chat
            </button>
            <button
              onClick={() => setShowParticipants(true)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                showParticipants ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4 mx-auto mb-1" />
              People ({session.participants.length})
            </button>
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {session.chatMessages.map((message) => (
                  <div key={message.id} className="text-sm">
                    <div className="text-gray-400 text-xs mb-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-white">{message.message}</div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendChatMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Participants Panel */}
          {showParticipants && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {session.participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {participant.rep.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">{participant.rep.name}</div>
                        <div className="text-gray-400 text-xs">
                          {participant.status === 'joined' ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {participant.permissions.canSpeak && (
                        <Mic className="h-4 w-4 text-green-400" />
                      )}
                      {participant.permissions.canVideo && (
                        <Video className="h-4 w-4 text-blue-400" />
                      )}
                      {participant.permissions.isModerator && (
                        <Zap className="h-4 w-4 text-yellow-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {isInstructor && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <button
                    onClick={createPoll}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Poll
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Poll Overlay */}
      {activePoll && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{activePoll.question}</h3>
            <div className="space-y-2">
              {activePoll.options.map((option, index) => (
                <button
                  key={index}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setActivePoll(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Submit Vote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}