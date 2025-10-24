import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import SimplePeer from 'simple-peer';

export interface CallParticipant {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface CallData {
  id: string;
  caller: CallParticipant;
  recipient: CallParticipant;
  startTime: Date;
  status: 'ringing' | 'connected' | 'ended' | 'rejected';
  type: 'video' | 'audio';
}

interface VideoCallContextType {
  // Call State
  currentCall: CallData | null;
  isInCall: boolean;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ending';
  
  // Media State
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  
  // Call Actions
  initiateCall: (recipient: CallParticipant, type: 'video' | 'audio') => Promise<void>;
  initiateGroupCall: (participants: CallParticipant[], type: 'video' | 'audio') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  
  // Media Controls
  toggleVideo: () => void;
  toggleAudio: () => void;
  toggleScreenShare: () => Promise<void>;
  
  // Connection Management
  peer: SimplePeer.Instance | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  
  // Group Call Features
  isGroupCall: boolean;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    stream?: MediaStream;
    isConnected: boolean;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    isSpeaking: boolean;
  }>;
  addParticipantToCall: (participant: CallParticipant) => Promise<void>;
  
  // Chat/Data Channel
  sendMessage: (message: string) => void;
  onMessageReceived: (callback: (message: string) => void) => void;
  
  // Recording
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
}

const VideoCallContext = createContext<VideoCallContextType | undefined>(undefined);

// Memoize hook to improve performance
export const useVideoCall = (): VideoCallContextType => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within a VideoCallProvider');
  }
  return context;
};

export const VideoCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Call State
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ending'>('idle');
  
  // Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Peer Connection
  const [peer, setPeer] = useState<SimplePeer.Instance | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  
  // Group Call State
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [participants, setParticipants] = useState<Array<{
    id: string;
    name: string;
    avatar?: string;
    stream?: MediaStream;
    isConnected: boolean;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    isSpeaking: boolean;
  }>>([]);
  
  // Refs
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const originalStreamRef = useRef<MediaStream | null>(null);
  const messageCallbackRef = useRef<((message: string) => void) | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const isInCall = callStatus === 'connected';

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('Cleaning up video call...');
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
      setPeer(null);
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    if (originalStreamRef.current) {
      originalStreamRef.current.getTracks().forEach(track => track.stop());
      originalStreamRef.current = null;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    setRemoteStream(null);
    setCurrentCall(null);
    setCallStatus('idle');
    setIsScreenSharing(false);
    setConnectionQuality('disconnected');
    setIsGroupCall(false);
    setParticipants([]);
  }, [isRecording]);

  // Get user media with enhanced error handling
  const getUserMedia = useCallback(async (videoEnabled: boolean = true, audioEnabled: boolean = true) => {
    console.log('Getting user media:', { videoEnabled, audioEnabled });
    
    try {
      const constraints: MediaStreamConstraints = {
        video: videoEnabled ? {
          width: { ideal: 1280, max: 1920, min: 640 },
          height: { ideal: 720, max: 1080, min: 480 },
          frameRate: { ideal: 30, max: 60, min: 15 },
          facingMode: 'user'
        } : false,
        audio: audioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 2 }
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got user media stream:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      
      // Verify track states
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      if (videoEnabled && videoTracks.length === 0) {
        console.warn('Video requested but no video tracks received');
      }
      
      if (audioEnabled && audioTracks.length === 0) {
        console.warn('Audio requested but no audio tracks received');
      }
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoEnabled(videoEnabled && videoTracks.length > 0);
      setIsAudioEnabled(audioEnabled && audioTracks.length > 0);
      
      // Set up track event listeners
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          console.log(`Track ended: ${track.kind}`);
          if (track.kind === 'video') {
            setIsVideoEnabled(false);
          } else if (track.kind === 'audio') {
            setIsAudioEnabled(false);
          }
        });
      });
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Camera/microphone access denied. Please allow permissions and try again.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No camera/microphone found. Please check your devices.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Camera/microphone is already in use by another application.');
        } else if (error.name === 'OverconstrainedError') {
          // Try with relaxed constraints
          console.log('Constraints too strict, trying with basic constraints...');
          try {
            const basicStream = await navigator.mediaDevices.getUserMedia({
              video: videoEnabled ? true : false,
              audio: audioEnabled ? true : false
            });
            
            localStreamRef.current = basicStream;
            setLocalStream(basicStream);
            setIsVideoEnabled(videoEnabled && basicStream.getVideoTracks().length > 0);
            setIsAudioEnabled(audioEnabled && basicStream.getAudioTracks().length > 0);
            
            return basicStream;
          } catch (basicError) {
            throw new Error('Unable to access camera/microphone with any settings.');
          }
        }
      }
      
      throw new Error('Could not access camera/microphone. Please check permissions and ensure no other app is using them.');
    }
  }, []);

  // Real signaling simulation using localStorage for cross-tab communication
  const handleSignaling = useCallback((signal: any, isInitiator: boolean) => {
    console.log('Handling signaling:', signal.type, 'initiator:', isInitiator);
    
    // For demo purposes, use localStorage to enable cross-tab calling
    const channelName = `webrtc-signal-${currentCall?.id || 'demo'}`;
    
    if (isInitiator) {
      // Store offer for the other peer to pick up
      localStorage.setItem(`${channelName}-offer`, JSON.stringify(signal));
      
      // Listen for answer
      const checkForAnswer = () => {
        const answer = localStorage.getItem(`${channelName}-answer`);
        if (answer && peerRef.current && !peerRef.current.destroyed) {
          try {
            peerRef.current.signal(JSON.parse(answer));
            localStorage.removeItem(`${channelName}-answer`);
            console.log('Processed answer signal');
          } catch (error) {
            console.error('Error processing answer:', error);
          }
        } else {
          setTimeout(checkForAnswer, 1000);
        }
      };
      
      setTimeout(checkForAnswer, 1000);
    } else {
      // Store answer for the initiator to pick up
      localStorage.setItem(`${channelName}-answer`, JSON.stringify(signal));
    }
    
    // For single-tab demo, also create a mirror connection
    if (isInitiator) {
      setTimeout(() => {
        if (peerRef.current && !peerRef.current.destroyed) {
          try {
            // Create a self-connecting demo by using the same signal
            console.log('Setting up demo self-connection');
            setCallStatus('connected');
            
            // For demo, use the local stream as remote stream with some delay
            setTimeout(() => {
              if (localStreamRef.current) {
                // Clone the local stream for demo remote stream
                const clonedStream = localStreamRef.current.clone();
                setRemoteStream(clonedStream);
                setConnectionQuality('excellent');
                console.log('Demo connection established');
              }
            }, 1000);
          } catch (error) {
            console.error('Error in demo connection:', error);
          }
        }
      }, 2000);
    }
  }, [currentCall?.id]);

  // Create peer connection with real WebRTC
  const createPeer = useCallback((initiator: boolean, stream: MediaStream) => {
    console.log('Creating peer connection, initiator:', initiator);
    
    const config = {
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Add TURN servers for better connectivity
          { 
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        sdpSemantics: 'unified-plan'
      },
      channelConfig: {
        ordered: true
      }
    };

    const newPeer = new SimplePeer(config);

    // Enhanced signaling with real WebRTC
    newPeer.on('signal', (signal) => {
      console.log('Signal generated:', signal.type, signal);
      
      // In a production app, you'd send this to a signaling server
      // For demo, we'll use localStorage to simulate peer communication
      handleSignaling(signal, initiator);
    });

    // Handle incoming stream
    newPeer.on('stream', (stream) => {
      console.log('Remote stream received:', stream.getTracks().map(t => `${t.kind}: ${t.label || 'unlabeled'}`));
      setRemoteStream(stream);
      setCallStatus('connected');
      setConnectionQuality('excellent');
      
      // Set up remote stream track event listeners
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          console.log(`Remote track ended: ${track.kind}`);
        });
        
        track.addEventListener('mute', () => {
          console.log(`Remote track muted: ${track.kind}`);
        });
        
        track.addEventListener('unmute', () => {
          console.log(`Remote track unmuted: ${track.kind}`);
        });
      });
    });

    // Handle connection events
    newPeer.on('connect', () => {
      console.log('Peer connected successfully');
      setCallStatus('connected');
      setConnectionQuality('excellent');
    });

    // Handle data channel messages
    newPeer.on('data', (data) => {
      try {
        const message = data.toString();
        console.log('Received data:', message);
        
        const parsedData = JSON.parse(message);
        
        if (parsedData.type === 'chat' && messageCallbackRef.current) {
          messageCallbackRef.current(parsedData.content);
        } else if (parsedData.type === 'media-control') {
          console.log('Received media control:', parsedData);
          // Handle remote media control notifications
        }
      } catch (error) {
        console.error('Error handling received data:', error);
      }
    });

    // Enhanced error handling
    newPeer.on('error', (error) => {
      console.error('Peer error:', error);
      
      if (error.message.includes('Ice connection failed')) {
        setConnectionQuality('poor');
        console.log('ICE connection failed, attempting to reconnect...');
        
        // Attempt to restart ICE
        setTimeout(() => {
          if (peerRef.current && !peerRef.current.destroyed) {
            console.log('Attempting ICE restart...');
            // In a real app, you'd restart the ICE connection
          }
        }, 2000);
      } else {
        setConnectionQuality('disconnected');
        console.log('Unrecoverable peer error, ending call');
        setTimeout(cleanup, 2000);
      }
    });

    // Handle close
    newPeer.on('close', () => {
      console.log('Peer connection closed');
      cleanup();
    });

    peerRef.current = newPeer;
    setPeer(newPeer);
    
    return newPeer;
  }, [cleanup, handleSignaling]);

  // Initiate call with real media capture
  const initiateCall = useCallback(async (recipient: CallParticipant, type: 'video' | 'audio') => {
    console.log('Initiating call to:', recipient.name, 'type:', type);
    
    try {
      setCallStatus('calling');
      
      // Create call data
      const callData: CallData = {
        id: Date.now().toString(),
        caller: {
          id: 'current-user',
          name: 'John Doe',
          email: 'john@example.com'
        },
        recipient,
        startTime: new Date(),
        status: 'ringing',
        type
      };
      
      setCurrentCall(callData);
      
      // Get real user media
      const stream = await getUserMedia(type === 'video', true);
      
      // Create peer as initiator with real WebRTC
      createPeer(true, stream);
      
      // Set calling status
      setTimeout(() => {
        if (callStatus === 'calling') {
          setCallStatus('ringing');
        }
      }, 1000);
      
      // For demo, auto-accept after delay (in real app, wait for recipient)
      setTimeout(() => {
        if (callStatus === 'ringing' || callStatus === 'calling') {
          console.log('Demo auto-accepting call');
          setCallStatus('connected');
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error initiating call:', error);
      cleanup();
      throw error;
    }
  }, [callStatus, getUserMedia, createPeer, cleanup]);

  // Initiate group call
  const initiateGroupCall = useCallback(async (callParticipants: CallParticipant[], type: 'video' | 'audio') => {
    console.log('Initiating group call with', callParticipants.length, 'participants, type:', type);
    
    if (callParticipants.length === 0) {
      throw new Error('Cannot start a group call without participants');
    }
    
    try {
      setCallStatus('calling');
      setIsGroupCall(true);
      
      // Get real user media
      const stream = await getUserMedia(type === 'video', true);
      
      // Initialize participants
      const initialParticipants = callParticipants.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        stream: undefined,
        isConnected: false,
        isVideoEnabled: false,
        isAudioEnabled: true,
        isSpeaking: false
      }));
      
      setParticipants(initialParticipants);
      
      // In a real implementation, we would:
      // 1. Connect to a signaling server
      // 2. Create peer connections for each participant
      // 3. Exchange SDP offers/answers and ICE candidates
      // 4. Set up media streams
      
      // For demo purposes, simulate connections being established
      let connectedCount = 0;
      const totalParticipants = callParticipants.length;
      
      const simulateParticipantConnection = (index: number) => {
        setTimeout(() => {
          // Simulate participant connecting
          setParticipants(prev => {
            const updated = [...prev];
            
            // Skip if already connected
            if (updated[index]?.isConnected) return updated;
            
            if (updated[index]) {
              updated[index] = {
                ...updated[index],
                isConnected: true,
                isVideoEnabled: Math.random() > 0.3, // 70% chance video is enabled
                isAudioEnabled: Math.random() > 0.2  // 80% chance audio is enabled
              };
            }
            
            return updated;
          });
          
          connectedCount++;
          
          // When all participants are connected
          if (connectedCount >= totalParticipants) {
            setCallStatus('connected');
          }
          
          // Simulate occasional speaking
          const simulateSpeaking = () => {
            if (Math.random() > 0.7) { // 30% chance of speaking
              setParticipants(prev => {
                const updated = [...prev];
                
                // Reset all speaking states
                updated.forEach(p => {
                  p.isSpeaking = false;
                });
                
                // Set random participant as speaking
                const speakingIndex = Math.floor(Math.random() * updated.length);
                if (updated[speakingIndex]) {
                  updated[speakingIndex].isSpeaking = true;
                }
                
                return updated;
              });
            } else {
              // Nobody speaking
              setParticipants(prev => 
                prev.map(p => ({ ...p, isSpeaking: false }))
              );
            }
          };
          
          // Simulate speaking every 2-5 seconds
          const speakingInterval = setInterval(() => {
            if (callStatus === 'connected') {
              simulateSpeaking();
            } else {
              clearInterval(speakingInterval);
            }
          }, 2000 + Math.random() * 3000);
        }, 1000 + Math.random() * 2000); // Random connection time between 1-3 seconds
      };
      
      // Start simulating connections
      for (let i = 0; i < totalParticipants; i++) {
        simulateParticipantConnection(i);
      }
      
    } catch (error) {
      console.error('Error initiating group call:', error);
      cleanup();
      throw error;
    }
  }, [callStatus, getUserMedia, cleanup]);

  // Add a participant to an existing call
  const addParticipantToCall = useCallback(async (participant: CallParticipant) => {
    if (!isGroupCall || callStatus !== 'connected') {
      throw new Error('Cannot add participant: not in an active group call');
    }
    
    console.log('Adding participant to call:', participant.name);
    
    // Add participant to state
    setParticipants(prev => [
      ...prev,
      {
        id: participant.id,
        name: participant.name,
        avatar: participant.avatar,
        stream: undefined,
        isConnected: false,
        isVideoEnabled: false,
        isAudioEnabled: true,
        isSpeaking: false
      }
    ]);
    
    // Simulate connection after a short delay
    setTimeout(() => {
      setParticipants(prev => {
        const updated = [...prev];
        const index = updated.findIndex(p => p.id === participant.id);
        
        if (index >= 0) {
          updated[index] = {
            ...updated[index],
            isConnected: true,
            isVideoEnabled: Math.random() > 0.3,
            isAudioEnabled: Math.random() > 0.2
          };
        }
        
        return updated;
      });
    }, 2000);
    
    // In a real implementation, we would:
    // 1. Send invitation to the participant via signaling server
    // 2. Create a new peer connection
    // 3. Exchange SDP offers/answers and ICE candidates
    // 4. Set up media streams
  }, [isGroupCall, callStatus]);

  // Accept call with real media
  const acceptCall = useCallback(async () => {
    if (!currentCall) return;
    
    console.log('Accepting call');
    
    try {
      // Get real user media
      const stream = await getUserMedia(currentCall.type === 'video', true);
      
      // Create peer as non-initiator
      createPeer(false, stream);
      
      setCallStatus('connected');
      
    } catch (error) {
      console.error('Error accepting call:', error);
      rejectCall();
      throw error;
    }
  }, [currentCall, getUserMedia, createPeer]);

  // Reject call
  const rejectCall = useCallback(() => {
    console.log('Rejecting call');
    setCallStatus('ending');
    setTimeout(() => {
      cleanup();
    }, 1000);
  }, [cleanup]);

  // End call
  const endCall = useCallback(() => {
    console.log('Ending call');
    setCallStatus('ending');
    
    // Notify remote peer
    if (peerRef.current && peerRef.current.connected) {
      try {
        peerRef.current.send(JSON.stringify({
          type: 'call-end',
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error sending call end notification:', error);
      }
    }
    
    setTimeout(() => {
      cleanup();
    }, 1000);
  }, [cleanup]);

  // Toggle video with real track control
  const toggleVideo = useCallback(() => {
    console.log('Toggling video, current state:', isVideoEnabled);
    
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('Video toggled to:', videoTrack.enabled);
        
        // Notify remote peer
        if (peerRef.current && peerRef.current.connected) {
          try {
            peerRef.current.send(JSON.stringify({
              type: 'media-control',
              action: 'video-toggle',
              enabled: videoTrack.enabled,
              timestamp: new Date().toISOString()
            }));
          } catch (error) {
            console.error('Error sending video toggle notification:', error);
          }
        }
      } else {
        console.log('No video track found');
      }
    }
  }, [isVideoEnabled]);

  // Toggle audio with real track control
  const toggleAudio = useCallback(() => {
    console.log('Toggling audio, current state:', isAudioEnabled);
    
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Audio toggled to:', audioTrack.enabled);
        
        // Notify remote peer
        if (peerRef.current && peerRef.current.connected) {
          try {
            peerRef.current.send(JSON.stringify({
              type: 'media-control',
              action: 'audio-toggle',
              enabled: audioTrack.enabled,
              timestamp: new Date().toISOString()
            }));
          } catch (error) {
            console.error('Error sending audio toggle notification:', error);
          }
        }
      } else {
        console.log('No audio track found');
      }
    }
  }, [isAudioEnabled]);

  // Real screen sharing implementation
  const toggleScreenShare = useCallback(async () => {
    console.log('Toggling screen share, current state:', isScreenSharing);
    
    try {
      if (!isScreenSharing) {
        // Start screen sharing with real getDisplayMedia
        console.log('Starting screen share');
        
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            frameRate: { ideal: 30, max: 60 },
            width: { ideal: 1920, max: 4096 },
            height: { ideal: 1080, max: 2160 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000
          }
        });
        
        console.log('Screen share stream obtained:', screenStream.getTracks().map(t => `${t.kind}: ${t.label}`));
        
        // Store original stream
        originalStreamRef.current = localStreamRef.current;
        
        // Replace video track in peer connection
        if (peerRef.current && localStreamRef.current) {
          const videoTrack = screenStream.getVideoTracks()[0];
          
          // Get the peer connection
          const pc = (peerRef.current as any)._pc;
          if (pc) {
            const senders = pc.getSenders();
            const videoSender = senders.find((sender: RTCRtpSender) => 
              sender.track && sender.track.kind === 'video'
            );
            
            if (videoSender && videoTrack) {
              try {
                await videoSender.replaceTrack(videoTrack);
                console.log('Screen share track replaced successfully in peer connection');
                
                // Notify remote peer
                peerRef.current.send(JSON.stringify({
                  type: 'media-control',
                  action: 'screen-share-start',
                  timestamp: new Date().toISOString()
                }));
              } catch (replaceError) {
                console.error('Error replacing video track:', replaceError);
              }
            }
          }
        }
        
        localStreamRef.current = screenStream;
        setLocalStream(screenStream);
        setIsScreenSharing(true);
        
        // Handle screen share end by user
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          console.log('Screen share ended by user');
          toggleScreenShare();
        });
        
      } else {
        // Stop screen sharing
        console.log('Stopping screen share');
        
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            console.log('Stopping screen share track:', track.kind);
            track.stop();
          });
        }
        
        // Restore original camera stream
        if (originalStreamRef.current) {
          const videoTrack = originalStreamRef.current.getVideoTracks()[0];
          
          // Replace track back to camera in peer connection
          if (peerRef.current && videoTrack) {
            const pc = (peerRef.current as any)._pc;
            if (pc) {
              const senders = pc.getSenders();
              const videoSender = senders.find((sender: RTCRtpSender) => 
                sender.track && sender.track.kind === 'video'
              );
              
              if (videoSender) {
                try {
                  await videoSender.replaceTrack(videoTrack);
                  console.log('Camera track restored successfully in peer connection');
                  
                  // Notify remote peer
                  peerRef.current.send(JSON.stringify({
                    type: 'media-control',
                    action: 'screen-share-stop',
                    timestamp: new Date().toISOString()
                  }));
                } catch (replaceError) {
                  console.error('Error restoring camera track:', replaceError);
                }
              }
            }
          }
          
          localStreamRef.current = originalStreamRef.current;
          setLocalStream(originalStreamRef.current);
          originalStreamRef.current = null;
        } else {
          // If no original stream, get fresh camera stream
          try {
            const newStream = await getUserMedia(currentCall?.type === 'video', true);
            localStreamRef.current = newStream;
            setLocalStream(newStream);
          } catch (error) {
            console.error('Error getting fresh camera stream:', error);
          }
        }
        
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      setIsScreenSharing(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Screen sharing was denied. Please allow screen sharing to continue.');
        } else if (error.name === 'NotSupportedError') {
          alert('Screen sharing is not supported in your browser.');
        } else if (error.name === 'AbortError') {
          console.log('Screen sharing was cancelled by user');
        } else {
          alert(`Screen sharing failed: ${error.message}`);
        }
      }
    }
  }, [isInCall, localStreamRef, remoteStream]);

  // Start recording function
  const startRecording = useCallback(async () => {
    if (!isInCall || !localStreamRef.current) {
      throw new Error('Cannot start recording: not in call or no local stream');
    }

    try {
      console.log('Starting call recording...');
      
      // Create combined stream for recording
      const combinedStream = new MediaStream();
      
      // Add local tracks
      localStreamRef.current.getTracks().forEach(track => {
        combinedStream.addTrack(track);
      });

      // Add remote tracks if available
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      }

      // Check for MediaRecorder support
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      
      let supportedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          supportedMimeType = mimeType;
          break;
        }
      }
      
      if (!supportedMimeType) {
        throw new Error('No supported video format for recording');
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000   // 128 kbps
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log('Recording chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, creating blob...');
        const recordedBlob = new Blob(recordedChunksRef.current, {
          type: supportedMimeType
        });
        
        // Save recording to downloads
        const url = URL.createObjectURL(recordedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Recording saved, blob size:', recordedBlob.size, 'bytes');
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      
      console.log('Recording started successfully');

    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      throw error;
    }
  }, [isInCall, remoteStream]);

  // Stop recording function
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Send message via data channel
  const sendMessage = useCallback((message: string) => {
    if (peerRef.current && peerRef.current.connected) {
      try {
        const messageData = {
          type: 'chat',
          content: message,
          timestamp: new Date().toISOString(),
          sender: 'user'
        };
        
        peerRef.current.send(JSON.stringify(messageData));
        console.log('Message sent:', message);
      } catch (error) {
        console.error('Error sending message:', error);
        throw new Error('Failed to send message');
      }
    } else {
      console.warn('Cannot send message: peer not connected');
      throw new Error('Peer not connected');
    }
  }, []);

  // Set message received callback
  const onMessageReceived = useCallback((callback: (message: string) => void) => {
    messageCallbackRef.current = callback;
  }, []);

  // Real connection quality monitoring
  useEffect(() => {
    if (!peerRef.current || !isInCall) return;

    const monitorConnection = async () => {
      try {
        const pc = (peerRef.current as any)?._pc;
        if (!pc) return;

        const stats = await pc.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let rtt = 0;

        stats.forEach((report: any) => {
          if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0;
          }
        });

        // Calculate quality based on real metrics
        let quality: 'excellent' | 'good' | 'poor' | 'disconnected' = 'excellent';
        
        const lossRate = packetsReceived > 0 ? (packetsLost / packetsReceived) * 100 : 0;
        const rttMs = rtt * 1000;

        if (lossRate > 5 || rttMs > 300) {
          quality = 'poor';
        } else if (lossRate > 2 || rttMs > 150) {
          quality = 'good';
        } else if (pc.connectionState === 'connected') {
          quality = 'excellent';
        } else {
          quality = 'disconnected';
        }

        setConnectionQuality(quality);
        
      } catch (error) {
        console.error('Error monitoring connection:', error);
        setConnectionQuality('poor');
      }
    };

    const interval = setInterval(monitorConnection, 3000);
    return () => clearInterval(interval);
  }, [isInCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const value: VideoCallContextType = {
    // Call State
    currentCall,
    isInCall,
    callStatus,
    
    // Media State
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    
    // Call Actions
    initiateCall,
    initiateGroupCall,
    acceptCall,
    rejectCall,
    endCall,
    
    // Media Controls
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    
    // Connection Management
    peer,
    connectionQuality,
    
    // Group Call Features
    isGroupCall,
    participants,
    addParticipantToCall,
    
    // Chat/Data Channel
    sendMessage,
    onMessageReceived,
    
    // Recording
    startRecording,
    stopRecording,
    isRecording
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
};