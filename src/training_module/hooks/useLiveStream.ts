import { useState, useRef, useCallback, useEffect } from 'react';
import { LiveStreamSession, ChatMessage, Poll } from '../types';

export const useLiveStream = (session: LiveStreamSession) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(session.chatMessages);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    initializeStream();
    return () => {
      cleanup();
    };
  }, []);

  const initializeStream = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: session.streamSettings.quality === '4K' ? 3840 : session.streamSettings.quality === '1080p' ? 1920 : 1280 },
          height: { ideal: session.streamSettings.quality === '4K' ? 2160 : session.streamSettings.quality === '1080p' ? 1080 : 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: session.streamSettings.audioQuality === 'studio' ? 48000 : 44100
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            mediaSource: 'screen',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: session.streamSettings.screenShareEnabled
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        
        streamRef.current = screenStream;
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
  }, [isScreenSharing, session.streamSettings.screenShareEnabled]);

  const startRecording = useCallback(() => {
    if (streamRef.current && !isRecording) {
      recordedChunksRef.current = [];
      
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: session.streamSettings.bitrate * 1000
      };
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // In a real implementation, upload to server
        console.log('Recording saved:', url);
      };
      
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
    }
  }, [isRecording, session.streamSettings.bitrate]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const sendChatMessage = useCallback((message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message,
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    
    // In a real implementation, send to server via WebSocket
    console.log('Sending message:', newMessage);
  }, []);

  const createPoll = useCallback((question: string, options: string[]) => {
    const newPoll: Poll = {
      id: Date.now().toString(),
      question,
      options,
      type: 'single',
      isActive: true,
      responses: [],
      createdAt: new Date().toISOString()
    };
    
    setActivePoll(newPoll);
    
    // Auto-close poll after 5 minutes
    setTimeout(() => {
      setActivePoll(prev => prev?.id === newPoll.id ? { ...prev, isActive: false, endedAt: new Date().toISOString() } : prev);
    }, 5 * 60 * 1000);
  }, []);

  const submitPollResponse = useCallback((pollId: string, answer: string | number) => {
    setActivePoll(prev => {
      if (prev?.id === pollId) {
        return {
          ...prev,
          responses: [...prev.responses, {
            participantId: 'current-user',
            answer,
            timestamp: new Date().toISOString()
          }]
        };
      }
      return prev;
    });
  }, []);

  return {
    isVideoOn,
    isAudioOn,
    isScreenSharing,
    isRecording,
    chatMessages,
    activePoll,
    videoRef,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    startRecording,
    stopRecording,
    sendChatMessage,
    createPoll,
    submitPollResponse
  };
};