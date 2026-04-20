import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Device, Call } from '@twilio/voice-sdk';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { AIAssistantAPI } from './GlobalAIAssistant';
import { useNavigate } from 'react-router-dom';

type CallStatus = 'idle' | 'initiating' | 'active' | 'ended';

interface AIAssistantMessage {
  role: 'assistant' | 'system';
  content: string;
  timestamp: Date;
  category: 'suggestion' | 'alert' | 'info' | 'action';
  priority: 'high' | 'medium' | 'low';
  isProcessed?: boolean;
}

interface CallInterfaceProps {
  phoneNumber: string;
  agentId: string;
  onEnd: () => void;
  onCallSaved?: () => void;
  provider?: 'twilio';
  keepAIPanelAfterCall?: boolean;
  callId: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function CallInterface({ phoneNumber, agentId, onEnd, onCallSaved, provider = 'twilio', keepAIPanelAfterCall = true, callId }: CallInterfaceProps) {
  // Constants for audio processing and transcription
  const SPEECH_THRESHOLD = 0.015;
  const SILENCE_TIMEOUT = 2000;
  const TRANSCRIPT_PROCESS_DELAY = 2000;

  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [connection, setConnection] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [audioProcessor, setAudioProcessor] = useState<AudioWorkletNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const { currentUser } = useAuth();

  const [lastProcessedTranscript, setLastProcessedTranscript] = useState<string>('');
  const [transcriptBuffer, setTranscriptBuffer] = useState<string>('');
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false);
  const [lastProcessedText, setLastProcessedText] = useState<string>('');
  const [currentSpeechSegment, setCurrentSpeechSegment] = useState<string>('');
  const [lastSpeechTimestamp, setLastSpeechTimestamp] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const navigate = useNavigate();
  const socketRef = useRef<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialement, s'assurer que le panel AI est visible
  useEffect(() => {
    // Ensure AI panel is visible at start
    AIAssistantAPI.showPanel();
    AIAssistantAPI.setCallEnded(false);
    AIAssistantAPI.clearMessages();
  }, []);

  const processMarkdownResponse = (markdown: string): { content: string, category: 'suggestion' | 'alert' | 'info' | 'action', priority: 'high' | 'medium' | 'low' } => {
    // Extract the main content without markdown headers and formatting
    const content = markdown
      .replace(/^#+\s*.*?\n/gm, '')    // Remove headers
      .replace(/\*\*/g, '')            // Remove bold
      .replace(/\n+/g, ' ')            // Replace newlines with space
      .replace(/^\d+\.\s+/g, '')       // Remove numbered lists
      .replace(/^[-*]\s+/gm, '')       // Remove bullet points
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .trim();

    // Skip pure sentiment analysis messages unless they contain actionable info
    if (content.toLowerCase().includes('customer sentiment') &&
      !content.toLowerCase().includes('suggest') &&
      !content.toLowerCase().includes('should') &&
      !content.toLowerCase().includes('please')) {
      return { content: '', category: 'info', priority: 'low' };
    }

    let category: 'suggestion' | 'alert' | 'info' | 'action' = 'info';
    let priority: 'high' | 'medium' | 'low' = 'medium';

    const lowerContent = content.toLowerCase();

    // Improved categorization logic
    if (lowerContent.includes('warning') || lowerContent.includes('caution') ||
      lowerContent.includes('important') || lowerContent.includes('urgent')) {
      category = 'alert';
      priority = 'high';
    } else if (lowerContent.includes('please') || lowerContent.includes('need to') ||
      lowerContent.includes('should') || lowerContent.includes('must')) {
      category = 'action';
      priority = lowerContent.includes('immediately') ? 'high' : 'medium';
    } else if (lowerContent.includes('suggest') || lowerContent.includes('recommend') ||
      lowerContent.includes('might want to') || lowerContent.includes('consider')) {
      category = 'suggestion';
      priority = lowerContent.includes('strongly') ? 'medium' : 'low';
    }

    return { content, category, priority };
  };

  const handleTranscription = async (transcription: string) => {
    if (!transcription?.trim()) {
      
      return;
    }

    try {
      
      const apiUrl = `${import.meta.env.VITE_API_URL_CALL}/api/calls/ai-assist`;

      // Get current messages from global state for context
      const currentMessages = (window as any).AIAssistant.getMessages?.() || [];

      const payload = {
        transcription,
        callSid: callSid || 'unknown',
        isAgent: false,
        context: currentMessages.slice(-5).map((msg: AIAssistantMessage) => ({
          role: msg.role,
          content: msg.content,
          category: msg.category,
          priority: msg.priority,
          timestamp: msg.timestamp
        }))
      };

      const response = await axios.post(apiUrl, payload);
      

      if (response.data?.suggestion) {
        const { content, category, priority } = processMarkdownResponse(response.data.suggestion);

        if (content.trim()) {
          const newMessage: AIAssistantMessage = {
            role: 'assistant',
            content,
            timestamp: new Date(),
            category,
            priority,
            isProcessed: false
          };

          

          // Add message directly to global state
          AIAssistantAPI.addMessage(newMessage);
          
        }
      }
    } catch (error) {
      console.error('🚨 Error processing transcription:', error);
    }
  };

  // Nouvelle fonction pour vérifier si on a eu assez de silence
  const hasEnoughSilence = () => {
    const now = Date.now();
    return now - lastSpeechTimestamp > SILENCE_TIMEOUT;
  };

  // Nouvelle fonction pour traiter la transcription
  const processTranscriptionSegment = async (segment: string, isFinal: boolean) => {
    if (!segment?.trim()) return;

    // Ne traiter que si:
    // 1. C'est un segment final OU
    // 2. On a eu assez de silence ET ce n'est pas déjà en cours de traitement
    if ((isFinal || hasEnoughSilence()) && !isProcessingTranscript) {
      
      setIsProcessingTranscript(true);
      try {
        await handleTranscription(segment);
        setLastProcessedText(segment);
        setCurrentSpeechSegment('');
      } finally {
        setIsProcessingTranscript(false);
      }
    } else if (!isFinal) {
      // Si ce n'est pas final et pas assez de silence, juste mettre à jour le segment courant
      setCurrentSpeechSegment(segment);
    }
  };

  // Mise à jour de la fonction d'analyse audio
  const analyzeAudio = useCallback((dataArray: Float32Array) => {
    let rms = 0;
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const amplitude = Math.abs(dataArray[i]);
      rms += amplitude * amplitude;
      peak = Math.max(peak, amplitude);
    }

    rms = Math.sqrt(rms / dataArray.length);
    const now = Date.now();
    const isActive = rms > SPEECH_THRESHOLD;

    if (isActive) {
      setLastSpeechTimestamp(now);
      if (!isSpeaking) {
        setIsSpeaking(true);
        
      }
    } else if (isSpeaking && hasEnoughSilence()) {
      setIsSpeaking(false);
      
      if (currentSpeechSegment && currentSpeechSegment.trim().length > 0) {
        processTranscriptionSegment(currentSpeechSegment, false);
      }
    }

    return { rms, peak, isActive };
  }, [isSpeaking, lastSpeechTimestamp, currentSpeechSegment]);

  // Mise à jour du gestionnaire de messages WebSocket
  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      

      if (data.error) {
        console.error('❌ Speech recognition error:', data.error);
        return;
      }

      let transcriptToProcess = '';

      if (data.transcript) {
        transcriptToProcess = data.transcript;
      } else if (data.results?.[0]?.alternatives?.[0]?.transcript) {
        transcriptToProcess = data.results[0].alternatives[0].transcript;
      }

      if (transcriptToProcess?.trim()) {
        // Nettoyer la transcription des répétitions précédentes
        const cleanedTranscript = transcriptToProcess.replace(lastProcessedText, '').trim();

        if (cleanedTranscript) {
          

          // Effacer tout timeout existant
          if (transcriptTimeoutRef.current) {
            clearTimeout(transcriptTimeoutRef.current);
          }

          // Si c'est un résultat final, le traiter immédiatement
          if (data.isFinal) {
            
            const fullSegment = `${currentSpeechSegment} ${cleanedTranscript}`.trim();
            processTranscriptionSegment(fullSegment, true);
          } else {
            // Pour les résultats intermédiaires, mettre à jour le segment courant
            const newSegment = `${currentSpeechSegment} ${cleanedTranscript}`.trim();
            setCurrentSpeechSegment(newSegment);

            // Définir un timeout pour le traitement, mais seulement si on a assez de silence
            transcriptTimeoutRef.current = setTimeout(() => {
              if (hasEnoughSilence()) {
                processTranscriptionSegment(newSegment, false);
              }
            }, TRANSCRIPT_PROCESS_DELAY);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  };

  useEffect(() => {
    const initiateCall = async () => {
      if (!currentUser) {
        setError('You must be logged in to make calls');
        return;
      }

      

      try {
        // Existing Twilio implementation
        const response = await axios.get(`${import.meta.env.VITE_API_URL_CALL}/api/calls/token`);
        const token = response.data.token;

        const newDevice = new Device(token, {
          codecPreferences: ['pcmu', 'pcma'] as any,
          edge: ['ashburn', 'dublin', 'sydney']
        });

        await newDevice.register();
        const conn = await newDevice.connect({
          params: {
            To: phoneNumber,
            MediaStream: true,
          },
          rtcConfiguration: {
            sdpSemantics: "unified-plan",
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' }
            ]
          },
          audio: {
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true
          }
        } as any);

        setConnection(conn);
        setCallStatus("initiating");

        conn.on('connect', () => {
          const callSid = conn.parameters.CallSid;
          
        });

        conn.on('accept', () => {
          
          const Sid = conn.parameters.CallSid;
          
          setCallSid(Sid);
          // Set call details in global state
          AIAssistantAPI.setCallDetails(Sid, agentId);
          setCallStatus("active");

          // Wait a moment for the media stream to be ready
          setTimeout(() => {
            const stream = conn.getRemoteStream();
            

            if (stream) {
              try {
                // Create an audio context to process the stream
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                setAudioContext(audioContext);
                const source = audioContext.createMediaStreamSource(stream);

                // Create audio analyzer to monitor audio levels
                const analyzer = audioContext.createAnalyser();
                analyzer.fftSize = 2048;
                source.connect(analyzer);

                let isCallActive = true;
                let cleanupInitiated = false;

                const getLanguageFromPhoneNumber = (phone: string): string => {
                  if (phone.startsWith('+33') || phone.startsWith('0033')) {
                    return 'fr-FR';
                  } else if (phone.startsWith('+212') || phone.startsWith('00212')) {
                    return 'ar-MA';
                  } else if (phone.startsWith('+34') || phone.startsWith('0034')) {
                    return 'es-ES';
                  } else if (phone.startsWith('+49') || phone.startsWith('0049')) {
                    return 'de-DE';
                  } else {
                    return 'en-US'; // Default to English
                  }
                };

                const cleanup = async () => {
                  if (cleanupInitiated) return;
                  cleanupInitiated = true;
                  

                  isCallActive = false;

                  // Close WebSocket first
                  if (ws?.readyState === WebSocket.OPEN) {
                    
                    ws.close(1000, "Call ended normally");
                  }

                  // Wait a bit for WebSocket to close cleanly
                  await new Promise(resolve => setTimeout(resolve, 500));

                  // Then cleanup audio
                  try {
                    
                    if (analyzer) {
                      analyzer.disconnect();
                    }
                    if (source) {
                      source.disconnect();
                    }
                    if (audioProcessor) {
                      audioProcessor.disconnect();
                    }
                    if (audioContext) {
                      await audioContext.close();
                    }
                  } catch (error) {
                    console.error("❌ Error during audio cleanup:", error);
                  }

                  
                };

                // Initialize WebSocket connection for streaming audio to backend
                const wsUrl = import.meta.env.VITE_WS_URL || `${import.meta.env.VITE_API_URL_CALL.replace('http', 'ws')}/speech-to-text`;
                
                const newWs = new WebSocket(wsUrl);
                setWs(newWs);
                let newAudioProcessor: AudioWorkletNode | null = null;

                newWs.onopen = async () => {
                  if (!isCallActive) {
                    
                    newWs.close(1000, "Call already ended");
                    return;
                  }

                  
                  try {
                    // Create audio worklet for processing after WebSocket is ready
                    await audioContext.audioWorklet.addModule('/audio-processor.js');
                    newAudioProcessor = new AudioWorkletNode(audioContext, 'audio-processor', {
                      numberOfInputs: 1,
                      numberOfOutputs: 1,
                      channelCount: 1,
                      processorOptions: {
                        sampleRate: audioContext.sampleRate
                      }
                    });
                    setAudioProcessor(newAudioProcessor);

                    source.connect(newAudioProcessor);
                    newAudioProcessor.connect(audioContext.destination);

                    // Send configuration message with improved settings
                    const config = {
                      config: {
                        encoding: 'LINEAR16',
                        sampleRateHertz: audioContext.sampleRate,
                        languageCode: getLanguageFromPhoneNumber(phoneNumber),
                        enableAutomaticPunctuation: true,
                        model: 'phone_call',
                        useEnhanced: true,
                        audioChannelCount: 1,
                        enableWordConfidence: true,
                        enableSpeakerDiarization: true,
                        diarizationConfig: {
                          enableSpeakerDiarization: true,
                          minSpeakerCount: 2,
                          maxSpeakerCount: 2
                        },
                        enableAutomaticLanguageIdentification: true,
                        alternativeLanguageCodes: ['en-US', 'fr-FR', 'ar-MA', 'es-ES', 'de-DE'],
                        interimResults: true,
                        singleUtterance: false,
                        metadata: {
                          interactionType: 'PHONE_CALL',
                          industryNaicsCodeOfAudio: 518,
                          originalMediaType: 'PHONE_CALL',
                          recordingDeviceType: 'PHONE_LINE',
                          microphoneDistance: 'NEARFIELD',
                          originalMimeType: 'audio/x-raw',
                          audioTopic: 'customer_service'
                        }
                      }
                    };

                    
                    newWs.send(JSON.stringify(config));

                    // Handle audio data from worklet with improved error handling
                    newAudioProcessor.port.onmessage = (event) => {
                      if (newWs.readyState === WebSocket.OPEN && isCallActive) {
                        try {
                          const audioData = event.data;
                          if (!(audioData instanceof ArrayBuffer)) {
                            console.error('❌ Invalid audio data format:', typeof audioData);
                            return;
                          }

                          // Convert to 16-bit PCM
                          const view = new DataView(audioData);
                          const pcmData = new Int16Array(audioData.byteLength / 2);
                          for (let i = 0; i < pcmData.length; i++) {
                            pcmData[i] = view.getInt16(i * 2, true);
                          }

                          // Send audio data with error handling
                          try {
                            newWs.send(pcmData.buffer);
                          } catch (wsError) {
                            console.error('❌ WebSocket send error:', wsError);
                            if (isCallActive && newWs.readyState !== WebSocket.OPEN) {
                              
                              reconnectWebSocket();
                            }
                          }
                        } catch (error) {
                          console.error('❌ Error processing audio data:', error);
                        }
                      }
                    };

                    // Start monitoring audio levels with improved thresholds
                    const analyzeAudio = () => {
                      if (!isCallActive) return;

                      const dataArray = new Float32Array(analyzer.frequencyBinCount);
                      analyzer.getFloatTimeDomainData(dataArray);

                      let rms = 0;
                      let peak = 0;
                      for (let i = 0; i < dataArray.length; i++) {
                        const amplitude = Math.abs(dataArray[i]);
                        rms += amplitude * amplitude;
                        peak = Math.max(peak, amplitude);
                      }

                      rms = Math.sqrt(rms / dataArray.length);
                      const isActive = rms > 0.02; // Adjusted threshold

                      // Only log if there's significant audio or status change
                      if (rms > 0.01) {
                        console.debug('Audio level', {
                          rms: rms.toFixed(3),
                          peak: peak.toFixed(3),
                          bufferSize: dataArray.length,
                          isActive
                        });
                      }

                      if (isCallActive) {
                        requestAnimationFrame(analyzeAudio);
                      }
                    };
                    analyzeAudio();

                  } catch (error) {
                    console.error('❌ Error initializing audio worklet:', error);
                    console.error('Error details:', error);
                  }
                };

                const reconnectWebSocket = () => {
                  if (isCallActive && (!newWs || newWs.readyState === WebSocket.CLOSED)) {
                    
                    const reconnectWs = new WebSocket(wsUrl);
                    setWs(reconnectWs);
                  }
                };

                newWs.onerror = (error) => {
                  console.error('❌ WebSocket error:', error);
                  if (isCallActive) {
                    setTimeout(reconnectWebSocket, 2000);
                  }
                };

                newWs.onclose = (event) => {
                  
                  if (isCallActive && event.code !== 1000) {
                    
                    setTimeout(reconnectWebSocket, 2000);
                  }
                };

                // Mise à jour du gestionnaire de messages WebSocket
                newWs.onmessage = handleWebSocketMessage;

                // Set up cleanup for call end
                conn.on("disconnect", async () => {

                  

                  const currentCallSid = conn.parameters.CallSid;
                  onEnd();
                  try {
                    // First do the cleanup to ensure resources are released
                    await cleanup();
                    

                    // Save call details using global state
                    if (currentCallSid) {
                      await AIAssistantAPI.saveCallToDB();
                      
                      if (onCallSaved) {
                        onCallSaved();
                      }
                    } else {
                      console.warn("⚠️ No CallSid available for saving call details");
                    }
                  } catch (error) {
                    console.error("❌ Error during cleanup or save:", error);
                  } finally {
                    setCallStatus("ended");
                    /* onEnd(); */
                  }
                });

                // Return cleanup function for component unmount
                return () => {
                  cleanup();
                };

              } catch (error) {
                console.error('Error initializing audio processing:', error);
              }
            } else {
              console.error("No media stream available - Make sure media permissions are granted");
            }
          }, 1000);
        });
      }
      catch (err) {
        console.error("Error initiating call:", err);
        setError('Failed to initiate call');
        onEnd();
      }
    };

    initiateCall();
  }, [phoneNumber, onEnd, agentId, provider]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callStatus === 'active') {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMuteToggle = () => {
    if (connection) {
      const newMutedStatus = !isMuted;
      connection.mute(newMutedStatus);
      setIsMuted(newMutedStatus);
    }
  };

  const handleAudioToggle = () => {
    setIsAudioEnabled(!isAudioEnabled);
  };

  const handleEndCall = async () => {
    try {
      

      // Mark call as ended in global component
      AIAssistantAPI.setCallEnded(true);

      // Stop video capture if exists
      if (localStream) {
        localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }

      // Close socket connection if exists
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Update call status
      setCallStatus('ended');

      // The disconnect handler will handle cleanup and saving
      if (connection) {
        connection.disconnect();
      }

      // Close the interface
      onEnd();
    } catch (error) {
      console.error('❌ Error ending call:', error);
      onEnd();
    }
  };

  if (error) {
    return (
      <div className="text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="text-xl font-semibold mb-2">{phoneNumber}</div>
        <div className="text-gray-500">{formatDuration(duration)}</div>
        {callStatus === 'initiating' && (
          <div className="text-rose-500">Initiating call...</div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={handleMuteToggle}
          className={`p-4 rounded-full ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
        >
          {isMuted ? <MicOff className="w-6 h-6 mx-auto" /> : <Mic className="w-6 h-6 mx-auto" />}
        </button>
        <button
          onClick={handleEndCall}
          className="p-4 rounded-full bg-red-600 text-white"
        >
          <Phone className="w-6 h-6 mx-auto transform rotate-135" />
        </button>
        <button
          onClick={handleAudioToggle}
          className={`p-4 rounded-full ${!isAudioEnabled ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
        >
          {isAudioEnabled ? (
            <Volume2 className="w-6 h-6 mx-auto" />
          ) : (
            <VolumeX className="w-6 h-6 mx-auto" />
          )}
        </button>
      </div>

      <div className="text-sm text-gray-500">
        {callStatus === 'active' ? 'Call in progress...' : 'Connecting...'}
      </div>
    </div>
  );
}
