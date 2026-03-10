import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff, 
  Users, 
  MessageSquare, 
  Settings, 
  Square, 
  Play, 
  Pause,
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Camera, 
  Palette, 
  Zap, 
  BarChart3, 
  Eye, 
  Hand, 
  ThumbsUp, 
  Heart, 
  Smile,
  BookOpen,
  CheckSquare,
  Target,
  Clock,
  Award,
  Send,
  MoreVertical,
  UserPlus,
  UserMinus,
  Shield,
  AlertTriangle,
  Presentation
} from 'lucide-react';
import { LiveStreamSession, LiveParticipant, Poll, ChatMessage, TrainingModule } from '../../types';

interface CourseStreamingStudioProps {
  session: LiveStreamSession;
  course: TrainingModule;
  isInstructor: boolean;
  onSessionUpdate: (session: LiveStreamSession) => void;
  onCourseProgress: (moduleId: string, progress: number) => void;
}

export default function CourseStreamingStudio({ 
  session, 
  course, 
  isInstructor, 
  onSessionUpdate, 
  onCourseProgress 
}: CourseStreamingStudioProps) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showCourseContent, setShowCourseContent] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [contentProgress, setContentProgress] = useState(0);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [participantPermissions, setParticipantPermissions] = useState<Record<string, any>>({});
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const whiteboardRef = useRef<HTMLCanvasElement>(null);

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

  const sendChatMessage = () => {
    if (chatMessage.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: isInstructor ? 'trainer' : 'user',
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

  const createQuickPoll = () => {
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
  };

  const nextContent = () => {
    if (currentContentIndex < course.content.length - 1) {
      setCurrentContentIndex(prev => prev + 1);
      setContentProgress(0);
    }
  };

  const previousContent = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(prev => prev - 1);
      setContentProgress(0);
    }
  };

  const updateParticipantPermissions = (participantId: string, permission: string, value: boolean) => {
    setParticipantPermissions(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [permission]: value
      }
    }));
  };

  const reactions = [
    { emoji: '👍', name: 'thumbs-up', icon: ThumbsUp },
    { emoji: '❤️', name: 'heart', icon: Heart },
    { emoji: '😊', name: 'smile', icon: Smile },
    { emoji: '✋', name: 'hand', icon: Hand },
  ];

  const currentContent = course.content[currentContentIndex];
  const overallProgress = ((currentContentIndex + 1) / course.content.length) * 100;

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${session.status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-white font-medium">{course.title}</span>
          </div>
          {session.status === 'live' && (
            <div className="flex items-center space-x-2 text-red-400">
              <Square className="h-4 w-4" />
              <span className="text-sm">LIVE COURSE</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4 text-white">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span className="text-sm">{session.participants.length} participants</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{Math.round(overallProgress)}% complete</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Video/Content Display */}
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-cover bg-black"
            />
            
            {/* Course Content Overlay */}
            {showCourseContent && currentContent && (
              <div className="absolute top-4 left-4 right-4 bg-black bg-opacity-75 text-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{currentContent.title}</h3>
                  <span className="text-sm bg-blue-600 px-2 py-1 rounded">
                    {currentContentIndex + 1}/{course.content.length}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-300">
                  Duration: {currentContent.duration} min • Type: {currentContent.type}
                </p>
              </div>
            )}

            {/* Whiteboard Overlay */}
            {showWhiteboard && (
              <div className="absolute inset-4 bg-white rounded-lg">
                <canvas
                  ref={whiteboardRef}
                  className="w-full h-full rounded-lg"
                  style={{ cursor: 'crosshair' }}
                />
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button className="p-2 bg-red-500 text-white rounded">
                    Clear
                  </button>
                  <button 
                    onClick={() => setShowWhiteboard(false)}
                    className="p-2 bg-gray-500 text-white rounded"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Video Controls Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 group">
              {/* Bottom Controls */}
              <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black bg-opacity-75 rounded-lg p-4">
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
                            onClick={() => setIsRecording(!isRecording)}
                            className={`p-2 rounded-lg transition-colors ${
                              isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-600 text-white'
                            }`}
                          >
                            {isRecording ? <Square className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                          </button>

                          <button
                            onClick={() => setShowWhiteboard(!showWhiteboard)}
                            className="p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                          >
                            <Presentation className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Course Navigation */}
                      {isInstructor && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={previousContent}
                            disabled={currentContentIndex === 0}
                            className="p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-50 transition-colors"
                          >
                            ←
                          </button>
                          <span className="text-white text-sm">
                            {currentContentIndex + 1}/{course.content.length}
                          </span>
                          <button
                            onClick={nextContent}
                            disabled={currentContentIndex === course.content.length - 1}
                            className="p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-50 transition-colors"
                          >
                            →
                          </button>
                        </div>
                      )}

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

                      <button className="p-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500 transition-colors">
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

          {/* Course Progress Bar */}
          <div className="bg-gray-800 px-6 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-medium">Course Progress</span>
              <span className="text-white text-sm">{Math.round(overallProgress)}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-gray-800 flex flex-col">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => { setShowChat(true); setShowParticipants(false); setShowCourseContent(false); }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                showChat ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare className="h-4 w-4 mx-auto mb-1" />
              Chat
            </button>
            <button
              onClick={() => { setShowParticipants(true); setShowChat(false); setShowCourseContent(false); }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                showParticipants ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4 mx-auto mb-1" />
              People ({session.participants.length})
            </button>
            <button
              onClick={() => { setShowCourseContent(true); setShowChat(false); setShowParticipants(false); }}
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
                    placeholder="Type a message..."
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

          {/* Participants Panel */}
          {showParticipants && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {session.participants.map((participant) => (
                  <div key={participant.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
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
                      
                      {isInstructor && (
                        <div className="relative">
                          <button className="text-gray-400 hover:text-white">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          participant.permissions.canSpeak ? 'bg-green-400' : 'bg-gray-500'
                        }`} />
                        <span className="text-gray-400">Mic</span>
                        
                        <div className={`w-2 h-2 rounded-full ${
                          participant.permissions.canVideo ? 'bg-blue-400' : 'bg-gray-500'
                        }`} />
                        <span className="text-gray-400">Video</span>
                      </div>
                      
                      <div className="text-gray-400">
                        Engagement: {participant.engagementScore}%
                      </div>
                    </div>

                    {isInstructor && (
                      <div className="mt-2 flex space-x-2">
                        <button
                          onClick={() => updateParticipantPermissions(participant.id, 'canSpeak', !participant.permissions.canSpeak)}
                          className={`p-1 rounded text-xs ${
                            participant.permissions.canSpeak ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                          }`}
                        >
                          <Mic className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => updateParticipantPermissions(participant.id, 'canVideo', !participant.permissions.canVideo)}
                          className={`p-1 rounded text-xs ${
                            participant.permissions.canVideo ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                          }`}
                        >
                          <Video className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {isInstructor && (
                <div className="mt-6 pt-4 border-t border-gray-700 space-y-2">
                  <button
                    onClick={createQuickPoll}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    Quick Poll
                  </button>
                  <button
                    onClick={() => setShowWhiteboard(!showWhiteboard)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Whiteboard
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Course Content Panel */}
          {showCourseContent && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-2">Current: {currentContent?.title}</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    {currentContent?.type === 'video' ? 'Video Content' :
                     currentContent?.type === 'interactive' ? 'Interactive Element' :
                     currentContent?.type === 'quiz' ? 'Knowledge Check' :
                     'Learning Content'}
                  </p>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs">Progress</span>
                    <span className="text-gray-400 text-xs">{Math.round(contentProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${contentProgress}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-white font-medium">Course Outline</h4>
                  {course.content.map((content, index) => (
                    <div
                      key={content.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        index === currentContentIndex 
                          ? 'bg-blue-600 text-white' 
                          : index < currentContentIndex
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      onClick={() => isInstructor && setCurrentContentIndex(index)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {index < currentContentIndex ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : index === currentContentIndex ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{content.title}</div>
                          <div className="text-xs opacity-75">{content.duration} min • {content.type}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Learning Objectives */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Learning Objectives</h4>
                  <ul className="space-y-1">
                    {course.learningObjectives.map((objective, index) => (
                      <li key={index} className="text-gray-300 text-sm flex items-start space-x-2">
                        <Target className="h-3 w-3 text-blue-400 mt-1 flex-shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Course Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{course.duration}</div>
                    <div className="text-xs text-gray-400">Total Duration</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{course.assessments.length}</div>
                    <div className="text-xs text-gray-400">Assessments</div>
                  </div>
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