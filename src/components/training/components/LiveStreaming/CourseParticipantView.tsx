import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Hand, 
  MessageSquare, 
  BookOpen, 
  CheckSquare, 
  Target, 
  Clock,
  ThumbsUp,
  Heart,
  Smile,
  Eye,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Award,
  BarChart3,
  Play,
  Pause,
  Send,
  Users,
  Zap
} from 'lucide-react';
import { LiveStreamSession, TrainingModule, ChatMessage, Poll } from '../../types';

interface CourseParticipantViewProps {
  session: LiveStreamSession;
  course: TrainingModule;
  participantId: string;
  onProgress: (progress: number) => void;
  onEngagement: (score: number) => void;
}

export default function CourseParticipantView({ 
  session, 
  course, 
  participantId, 
  onProgress, 
  onEngagement 
}: CourseParticipantViewProps) {
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showCourseContent, setShowCourseContent] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [engagementScore, setEngagementScore] = useState(85);
  const [attentionLevel, setAttentionLevel] = useState(90);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Simulate course progress
    const interval = setInterval(() => {
      setCurrentProgress(prev => {
        const newProgress = Math.min(prev + 0.5, 100);
        onProgress(newProgress);
        return newProgress;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onProgress]);

  useEffect(() => {
    // Track engagement based on interactions
    const engagementInterval = setInterval(() => {
      const randomVariation = Math.random() * 10 - 5; // ±5 variation
      const newEngagement = Math.max(0, Math.min(100, engagementScore + randomVariation));
      setEngagementScore(newEngagement);
      onEngagement(newEngagement);
    }, 5000);

    return () => clearInterval(engagementInterval);
  }, [engagementScore, onEngagement]);

  const toggleVideo = async () => {
    if (!isVideoOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setIsVideoOn(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsVideoOn(false);
    }
  };

  const toggleAudio = async () => {
    if (!isAudioOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsAudioOn(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    } else {
      setIsAudioOn(false);
    }
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
      
      setChatMessage('');
      // In real implementation, send to session
    }
  };

  const sendReaction = (reaction: string) => {
    setSelectedReaction(reaction);
    setTimeout(() => setSelectedReaction(null), 2000);
    
    // Boost engagement for reactions
    setEngagementScore(prev => Math.min(prev + 5, 100));
  };

  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    setEngagementScore(prev => Math.min(prev + 3, 100));
  };

  const markModuleComplete = (moduleId: string) => {
    if (!completedModules.includes(moduleId)) {
      setCompletedModules(prev => [...prev, moduleId]);
      setEngagementScore(prev => Math.min(prev + 10, 100));
    }
  };

  const reactions = [
    { emoji: '👍', name: 'thumbs-up', icon: ThumbsUp },
    { emoji: '❤️', name: 'heart', icon: Heart },
    { emoji: '😊', name: 'smile', icon: Smile },
    { emoji: '👏', name: 'clap', icon: ThumbsUp },
  ];

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium">{course.title}</span>
            <span className="text-red-400 text-sm">LIVE</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-white">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm">{session.participants.length} participants</span>
          </div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">Engagement: {Math.round(engagementScore)}%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Video Area */}
        <div className="flex-1 relative">
          {/* Instructor Video */}
          <div className="w-full h-full bg-black flex items-center justify-center">
            <div className="text-center text-white">
              <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Instructor Video Stream</p>
              <p className="text-gray-400">Live course in progress...</p>
            </div>
          </div>

          {/* Participant Video (Picture-in-Picture) */}
          {isVideoOn && (
            <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-blue-500">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                You
              </div>
            </div>
          )}

          {/* Course Progress Overlay */}
          <div className="absolute top-4 left-4 right-4 bg-black bg-opacity-75 text-white rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Course Progress</h3>
              <span className="text-sm bg-blue-600 px-2 py-1 rounded">
                {Math.round(currentProgress)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>

          {/* Controls Overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleVideo}
                  className={`p-2 rounded-lg transition-colors ${
                    isVideoOn ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
                  }`}
                >
                  {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>
                
                <button
                  onClick={toggleAudio}
                  className={`p-2 rounded-lg transition-colors ${
                    isAudioOn ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                  }`}
                >
                  {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>

                <button
                  onClick={toggleHandRaise}
                  className={`p-2 rounded-lg transition-colors ${
                    isHandRaised ? 'bg-yellow-600 text-white animate-pulse' : 'bg-gray-600 text-white'
                  }`}
                >
                  <Hand className="h-5 w-5" />
                </button>

                {/* Volume Control */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="w-20"
                  />
                </div>
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
                      <span className="text-sm">{reaction.emoji}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                >
                  <Maximize className="h-4 w-4" />
                </button>

                <button className="p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors">
                  <Settings className="h-4 w-4" />
                </button>
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
              onClick={() => { setShowChat(true); setShowCourseContent(false); }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                showChat ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare className="h-4 w-4 mx-auto mb-1" />
              Chat
            </button>
            <button
              onClick={() => { setShowCourseContent(true); setShowChat(false); }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                showCourseContent ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4 mx-auto mb-1" />
              Course
            </button>
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {session.chatMessages.map((message) => (
                  <div key={message.id} className="text-sm">
                    <div className="text-gray-400 text-xs mb-1 flex items-center justify-between">
                      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                      {message.sender === 'trainer' && (
                        <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                          Instructor
                        </span>
                      )}
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
                    placeholder="Ask a question or share thoughts..."
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendChatMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Course Content Panel */}
          {showCourseContent && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Current Module */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-2">Current Module</h3>
                  <div className="text-gray-300 text-sm mb-3">
                    Module 1: Introduction to Customer Success
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs">Your Progress</span>
                    <span className="text-gray-400 text-xs">{Math.round(currentProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                </div>

                {/* Course Outline */}
                <div className="space-y-2">
                  <h4 className="text-white font-medium">Course Modules</h4>
                  {course.content.map((content, index) => (
                    <div
                      key={content.id}
                      className={`p-3 rounded-lg ${
                        completedModules.includes(content.id)
                          ? 'bg-green-600 text-white'
                          : index === 0
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {completedModules.includes(content.id) ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : index === 0 ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{content.title}</div>
                          <div className="text-xs opacity-75">{content.duration} min</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Learning Objectives */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Learning Objectives</h4>
                  <ul className="space-y-1">
                    {course.learningObjectives.slice(0, 3).map((objective, index) => (
                      <li key={index} className="text-gray-300 text-sm flex items-start space-x-2">
                        <Target className="h-3 w-3 text-blue-400 mt-1 flex-shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Engagement Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{Math.round(engagementScore)}%</div>
                    <div className="text-xs text-gray-400">Engagement</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{Math.round(attentionLevel)}%</div>
                    <div className="text-xs text-gray-400">Attention</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => markModuleComplete('module-1')}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Mark Current Module Complete
                  </button>
                  <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                    Take Notes
                  </button>
                </div>
              </div>
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