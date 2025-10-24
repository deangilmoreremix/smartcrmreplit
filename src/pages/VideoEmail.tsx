import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useOpenAI } from '../services/openaiService';
import { useGemini } from '../services/geminiService';
import * as edgeFunctionService from '../services/edgeFunctionService';
import { 
  Video, 
  Download, 
  Trash, 
  Play, 
  Pause, 
  RefreshCw, 
  Camera, 
  X, 
  Check, 
  Clock, 
  Scissors, 
  FileVideo, 
  Copy, 
  Mail, 
  Sliders, 
  PenTool, 
  List, 
  Brain, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  Upload as UploadIcon, 
  Edit,
  Link,
  AlertCircle,
  MessageSquare,
  Share2,
  Send,
  UserCircle,
  BarChart3,
  Lightbulb,
  Eye,
  Mic
} from 'lucide-react';

import './VideoEmail.css';

interface VideoRecordingData {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
  title: string;
  recipients?: string[];
  status?: 'draft' | 'sent';
  thumbnailUrl?: string;
  size: number;
  viewCount?: number;
  watchTimePercentage?: number;
}

interface TalkingPoint {
  id: string;
  text: string;
  completed: boolean;
}

interface RecipientPersona {
  name: string;
  company?: string;
  position?: string;
  interests?: string[];
  painPoints?: string[];
  communicationStyle?: string;
  previousInteractions?: string[];
}

interface VideoFeedback {
  quality: 'poor' | 'average' | 'good' | 'excellent';
  confidence: number;
  pacing: 'too slow' | 'good' | 'too fast';
  clarity: number;
  engagement: number;
  suggestions: string[];
}

const VideoEmail: React.FC = () => {
  // Video Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<VideoRecordingData[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<VideoRecordingData | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Video Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // Email Composition States
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  
  // Talking Points States
  const [talkingPoints, setTalkingPoints] = useState<TalkingPoint[]>([]);
  const [showTalkingPoints, setShowTalkingPoints] = useState(false);
  const [isGeneratingTalkingPoints, setIsGeneratingTalkingPoints] = useState(false);
  
  // Player States
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Trim States
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);
  const [showTrimControls, setShowTrimControls] = useState(false);
  
  // AI Enhancement States
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [videoFeedback, setVideoFeedback] = useState<VideoFeedback | null>(null);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [showRecipientPersona, setShowRecipientPersona] = useState(false);
  const [recipientPersona, setRecipientPersona] = useState<RecipientPersona | null>(null);
  const [isLoadingPersona, setIsLoadingPersona] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [aiSuggestedFilters, setAiSuggestedFilters] = useState<string[]>([]);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Errors and UI states
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'record' | 'library'>('record');
  
  // AI Services
  const openai = useOpenAI();
  const gemini = useGemini();
  
  // Mock recipients for demo (in a real app, this would come from your contacts)
  const availableRecipients = [
    { email: "john.doe@acme.com", name: "John Doe", company: "Acme Inc", position: "CTO" },
    { email: "sarah.smith@globex.com", name: "Sarah Smith", company: "Globex Corp", position: "Marketing Director" },
    { email: "mike.johnson@initech.com", name: "Mike Johnson", company: "Initech", position: "CEO" }
  ];
  
  // Init and cleanup
  useEffect(() => {
    // Load saved recordings from localStorage
    const savedRecordings = localStorage.getItem('videoRecordings');
    if (savedRecordings) {
      const parsedRecordings = JSON.parse(savedRecordings);
      
      // Convert the parsed data to VideoRecordingData objects with proper Blobs
      const loadedRecordings: VideoRecordingData[] = [];
      
      parsedRecordings.forEach((recording: any) => {
        // Skip loading if url is not available
        if (!recording.url) return;
        
        loadedRecordings.push({
          ...recording,
          blob: new Blob(), // We cannot really restore the blob from localStorage
          timestamp: new Date(recording.timestamp)
        });
      });
      
      setRecordings(loadedRecordings);
    }
    
    // Clean up on unmount
    return () => {
      stopRecording();
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Save recordings to localStorage when they change
  useEffect(() => {
    // Save a simplified version without the blob to localStorage
    const simplifiedRecordings = recordings.map(recording => ({
      ...recording,
      blob: null // Don't store the blob
    }));
    
    localStorage.setItem('videoRecordings', JSON.stringify(simplifiedRecordings));
  }, [recordings]);
  
  // Set up video filter on canvas when filter changes
  useEffect(() => {
    if (videoRef.current && canvasRef.current && videoStream && !isPlaying) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Apply filter
      ctx.filter = getFilterValue(selectedFilter);
      
      // Draw video frame on canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
  }, [selectedFilter, videoStream, isPlaying]);
  
  // Initialize video recorder
  const initializeRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: !isMuted
      });
      
      setVideoStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        const newRecording: VideoRecordingData = {
          id: Date.now().toString(),
          blob,
          url,
          duration: recordingTime,
          timestamp: new Date(),
          title: `Video Recording - ${new Date().toLocaleDateString()}`,
          size: blob.size
        };
        
        // Generate thumbnail
        if (videoRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          if (context) {
            // Make sure the video has loaded the first frame
            videoRef.current.currentTime = 0;
            videoRef.current.onloadeddata = () => {
              // Draw the video frame to the canvas
              context.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);
              // Get the data URL from the canvas
              try {
                const thumbnailUrl = canvas.toDataURL('image/jpeg');
                newRecording.thumbnailUrl = thumbnailUrl;
              } catch (error) {
                console.error('Error creating thumbnail:', error);
              }
              
              // Update recordings with the new recording
              setRecordings(prev => [newRecording, ...prev]);
              setSelectedRecording(newRecording);
              
              // Auto-analyze the video for quality feedback
              analyzeVideoContent(newRecording);
            };
          }
        } else {
          setRecordings(prev => [newRecording, ...prev]);
          setSelectedRecording(newRecording);
          
          // Auto-analyze the video for quality feedback
          analyzeVideoContent(newRecording);
        }
        
        chunksRef.current = [];
      };
      
      mediaRecorderRef.current = mediaRecorder;
      
    } catch (err) {
      setError('Error accessing camera: ' + (err instanceof Error ? err.message : String(err)));
      console.error('Error accessing media devices:', err);
    }
  };
  
  // Start recording
  const startRecording = () => {
    if (mediaRecorderRef.current && videoStream) {
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      
      // Start the timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      chunksRef.current = [];
      mediaRecorderRef.current.start(1000);
    } else {
      initializeRecorder().then(() => {
        // Start recording after initialization
        if (mediaRecorderRef.current) {
          setIsRecording(true);
          setRecordingTime(0);
          
          // Start the timer
          timerRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
          }, 1000);
          
          chunksRef.current = [];
          mediaRecorderRef.current.start(1000);
        }
      });
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
    setIsPaused(false);
  };
  
  // Pause/resume recording
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      // Resume recording
      mediaRecorderRef.current.resume();
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      // Pause recording
      mediaRecorderRef.current.pause();
      
      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    setIsPaused(!isPaused);
  };
  
  // Format time (seconds to MM:SS)
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Play the selected recording
  const playRecording = () => {
    if (videoRef.current && selectedRecording) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };
  
  // Pause the selected recording
  const pauseRecording = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  // Delete the selected recording
  const deleteRecording = (id: string) => {
    // Find the recording
    const recordingToDelete = recordings.find(rec => rec.id === id);
    
    if (recordingToDelete) {
      // Revoke the URL to prevent memory leaks
      URL.revokeObjectURL(recordingToDelete.url);
      
      // Update the recordings list
      setRecordings(recordings.filter(rec => rec.id !== id));
      
      // If the deleted recording was selected, clear selection
      if (selectedRecording && selectedRecording.id === id) {
        setSelectedRecording(null);
      }
    }
  };
  
  // Handle timeupdate event from video player
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Handle end of video
      if (videoRef.current.ended) {
        setIsPlaying(false);
      }
    }
  };
  
  // Set the filter value based on the selected filter
  const getFilterValue = (filter: string): string => {
    switch (filter) {
      case 'grayscale':
        return 'grayscale(100%)';
      case 'sepia':
        return 'sepia(100%)';
      case 'blur':
        return 'blur(2px)';
      case 'brightness':
        return 'brightness(130%)';
      case 'contrast':
        return 'contrast(150%)';
      case 'professional':
        return 'contrast(110%) brightness(105%)';
      case 'warmth':
        return 'sepia(30%) brightness(105%)';
      default:
        return 'none';
    }
  };
  
  // Process the video with the selected filter
  const processVideo = async () => {
    if (!selectedRecording) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      // In a production app, we would actually process the video 
      // For this demo, we'll simulate processing with a progress indicator
      
      // Simulate progress
      const interval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 300);
      
      // Simulate processing completion
      setTimeout(() => {
        clearInterval(interval);
        setProcessingProgress(100);
        
        setTimeout(() => {
          setIsProcessing(false);
          
          // Create a "processed" copy by just creating a new entry
          // In a real app, we would apply the filter to the video
          const processedVideo: VideoRecordingData = {
            ...selectedRecording,
            id: Date.now().toString(),
            title: `${selectedRecording.title} (Processed)`,
            timestamp: new Date()
          };
          
          setRecordings(prev => [processedVideo, ...prev]);
          setSelectedRecording(processedVideo);
        }, 500);
      }, 3000);
      
    } catch (err) {
      setError('Error processing video: ' + (err instanceof Error ? err.message : String(err)));
      console.error('Error processing video:', err);
      setIsProcessing(false);
    }
  };
  
  // Trim the video
  const trimVideo = () => {
    if (!selectedRecording || !videoRef.current) return;
    
    setIsTrimming(false);
    setIsProcessing(true);
    setProcessingProgress(0);
    
    // In a real implementation, we would actually trim the video
    // For this demo, we'll simulate processing
    
    // Simulate progress
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
    
    // Simulate processing completion
    setTimeout(() => {
      clearInterval(interval);
      setProcessingProgress(100);
      
      setTimeout(() => {
        setIsProcessing(false);
        
        // Create a "trimmed" copy
        // In a real app, we would actually trim the video
        const trimmedVideo: VideoRecordingData = {
          ...selectedRecording,
          id: Date.now().toString(),
          title: `${selectedRecording.title} (Trimmed)`,
          timestamp: new Date(),
          duration: trimEnd - trimStart
        };
        
        setRecordings(prev => [trimmedVideo, ...prev]);
        setSelectedRecording(trimmedVideo);
        setShowTrimControls(false);
      }, 500);
    }, 2000);
  };
  
  // Generate talking points with Gemini 2.5 Pro
  const generateTalkingPoints = async () => {
    if (!selectedRecording) return;
    
    setIsGeneratingTalkingPoints(true);
    
    try {
      let context = '';
      
      // Add recipient context if available
      if (selectedRecipient) {
        const recipient = availableRecipients.find(r => r.email === selectedRecipient);
        if (recipient) {
          context = `This is a video message for ${recipient.name}, who is the ${recipient.position} at ${recipient.company}.`;
        }
      }
      
      // Add transcription context if available
      if (transcription) {
        context += `\nThe video contains the following content: ${transcription}`;
      } else {
        context += `\nThe video is about ${selectedRecording.title} and is ${formatTime(selectedRecording.duration)} in duration.`;
      }
      
      // Call Gemini to generate talking points
      const result = await gemini.generateCustomerPersona(
        context,
        "mid-market",
        ["personalized video messages", "sales follow-up", "engagement"]
      );
      
      // Parse the response to extract talking points
      // For demo purposes, we'll manually extract bullet points
      const points = result.split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(line => line.length > 0);
      
      const formattedPoints: TalkingPoint[] = points.slice(0, 5).map((text, index) => ({
        id: `point-${index}`,
        text,
        completed: false
      }));
      
      setTalkingPoints(formattedPoints);
      setShowTalkingPoints(true);
    } catch (err) {
      console.error('Error generating talking points:', err);
      setError('Failed to generate talking points: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGeneratingTalkingPoints(false);
    }
  };
  
  // Analyze video content using OpenAI Vision API
  const analyzeVideoContent = async (recording: VideoRecordingData) => {
    setIsAnalyzingVideo(true);
    
    try {
      // In a real implementation, we would:
      // 1. Extract frames from the video
      // 2. Send those frames to OpenAI's Vision API
      // 3. Process the response
      
      // For the demo, we'll simulate this analysis
      await simulateTranscription(recording);
      
      setTimeout(() => {
        // Sample video feedback
        const feedback: VideoFeedback = {
          quality: 'good',
          confidence: 0.85,
          pacing: 'good',
          clarity: 0.78,
          engagement: 0.82,
          suggestions: [
            "Maintain eye contact with the camera throughout the video",
            "Consider adding more pauses after key points",
            "The lighting is good, but could be improved by facing a window",
            "Speak slightly louder for better audio quality"
          ]
        };
        
        setVideoFeedback(feedback);
        
        // Suggest AI filters based on analysis
        setAiSuggestedFilters(['professional', 'brightness']);
        
        setIsAnalyzingVideo(false);
      }, 2000);
    } catch (err) {
      console.error('Error analyzing video:', err);
      setIsAnalyzingVideo(false);
    }
  };
  
  // Simulate video transcription (in a real app, use OpenAI Whisper API)
  const simulateTranscription = async (recording: VideoRecordingData) => {
    setIsTranscribing(true);
    
    try {
      // In a real implementation, you would:
      // 1. Extract audio from the video
      // 2. Send to OpenAI's Whisper API
      // 3. Process and store the transcription
      
      // For the demo, we'll simulate a delay and provide a mock transcription
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockTranscriptions = [
        "Hi there, I wanted to follow up on our conversation about the enterprise features you were interested in. As you can see, we've made significant improvements to the dashboard that I think will address your team's needs.",
        "Thank you for your time last week. I've prepared this short video to walk you through the analytics capabilities we discussed. I think you'll find that our solution offers exactly what you're looking for.",
        "Following our call yesterday, I wanted to quickly demonstrate how our platform handles the use case you mentioned. As you can see, the workflow is streamlined and requires minimal steps.",
        "I'm reaching out with a quick video to address the questions you had about our security features. As you'll see in this demonstration, we offer end-to-end encryption and role-based access controls."
      ];
      
      // Select a random transcription
      const randomIndex = Math.floor(Math.random() * mockTranscriptions.length);
      setTranscription(mockTranscriptions[randomIndex]);
    } catch (err) {
      console.error('Error transcribing video:', err);
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Generate email draft with OpenAI
  const generateEmailDraft = async () => {
    if (!selectedRecording) return;
    
    setIsProcessing(true);
    
    try {
      // Prepare context for the AI
      let emailContext = selectedRecording.title;
      
      // Add transcription if available
      if (transcription) {
        emailContext += ` Video content: "${transcription}"`;
      }
      
      // Add talking points if available
      if (talkingPoints.length > 0) {
        emailContext += ` Key points covered: ${talkingPoints.map(tp => tp.text).join(', ')}`;
      }
      
      // Add recipient context if available
      if (selectedRecipient) {
        const recipient = availableRecipients.find(r => r.email === selectedRecipient);
        if (recipient) {
          emailContext += ` The recipient is ${recipient.name}, ${recipient.position} at ${recipient.company}.`;
        }
      }
      
      // Call OpenAI to generate email draft
      const result = await openai.generateEmailDraft(
        selectedRecipient ? availableRecipients.find(r => r.email === selectedRecipient)?.name || "there" : "there", 
        "Sharing a personalized video message",
        emailContext
      );
      
      setEmailDraft(result);
      setEmailBody(result);
      setEmailSubject(`Video message: ${selectedRecording.title}`);
      setShowEmailComposer(true);
    } catch (err) {
      console.error('Error generating email draft:', err);
      setError('Failed to generate email draft: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Load recipient persona data
  const loadRecipientPersona = async (recipientEmail: string) => {
    setIsLoadingPersona(true);
    setSelectedRecipient(recipientEmail);
    
    try {
      const recipient = availableRecipients.find(r => r.email === recipientEmail);
      
      if (!recipient) {
        throw new Error("Recipient not found");
      }
      
      // In a real implementation, you would fetch historical data about this recipient
      // and then use Gemini to generate a comprehensive persona
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call Gemini to generate a persona
      const result = await gemini.generateCustomerPersona(
        recipient.company ? recipient.company : "Technology", 
        "mid-market", 
        ["streamlined operations", "improved security", "cost reduction"]
      );
      
      // Extract insights from the result
      const interests = result.split('\n')
        .filter(line => line.toLowerCase().includes('interest') || line.toLowerCase().includes('goals'))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 3);
        
      const painPoints = result.split('\n')
        .filter(line => line.toLowerCase().includes('pain') || line.toLowerCase().includes('challenge') || line.toLowerCase().includes('frustration'))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 3);
      
      // Create a structured persona object
      const persona: RecipientPersona = {
        name: recipient.name,
        company: recipient.company,
        position: recipient.position,
        interests: interests,
        painPoints: painPoints,
        communicationStyle: result.toLowerCase().includes('formal') ? "Formal" : "Conversational",
        previousInteractions: [
          "Last contacted: 2 weeks ago",
          "Expressed interest in enterprise features",
          "Attended product webinar last month"
        ]
      };
      
      setRecipientPersona(persona);
      setShowRecipientPersona(true);
    } catch (err) {
      console.error('Error loading recipient persona:', err);
      setError('Failed to load recipient persona: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoadingPersona(false);
    }
  };
  
  // Send the video email
  const sendVideoEmail = async () => {
    if (!selectedRecording) return;
    
    setIsProcessing(true);
    
    try {
      // In a real app, we would upload the video to a hosting service,
      // and then send the email with the video link
      
      // Simulate sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark as sent in our local state
      const updatedRecording = {
        ...selectedRecording,
        status: 'sent' as const,
        recipients: emailRecipients,
        viewCount: 0,
        watchTimePercentage: 0
      };
      
      setRecordings(prev => 
        prev.map(rec => rec.id === selectedRecording.id ? updatedRecording : rec)
      );
      
      setSelectedRecording(updatedRecording);
      setShowEmailComposer(false);
      alert('Email sent successfully!');
    } catch (err) {
      console.error('Error sending video email:', err);
      setError('Failed to send email: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Download the recording
  const downloadRecording = () => {
    if (!selectedRecording) return;
    
    const a = document.createElement('a');
    a.href = selectedRecording.url;
    a.download = `${selectedRecording.title}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Get optimal video length recommendation
  const getOptimalLength = () => {
    if (selectedRecipient) {
      const recipient = availableRecipients.find(r => r.email === selectedRecipient);
      if (recipient) {
        // In a real app, we'd use personalization data to determine the best length
        if (recipient.position.includes("CTO") || recipient.position.includes("Technical")) {
          return "90-120 seconds";
        } else if (recipient.position.includes("CEO")) {
          return "60-90 seconds";
        }
      }
    }
    return "60-90 seconds";
  };
  
  // Generate AI-powered video title
  const generateVideoTitle = async () => {
    if (!selectedRecording) return;
    
    setIsProcessing(true);
    
    try {
      let context = '';
      
      // Add transcription if available
      if (transcription) {
        context = `Based on this video content: "${transcription}"`;
      } else {
        context = "Based on a sales follow-up video";
      }
      
      // Add recipient context if available
      if (selectedRecipient) {
        const recipient = availableRecipients.find(r => r.email === selectedRecipient);
        if (recipient) {
          context += ` for ${recipient.name} (${recipient.position} at ${recipient.company})`;
        }
      }
      
      // Using Gemini to generate a title
      const title = await gemini.optimizeVoiceTone(
        context,
        "sales professionals",
        "concise, personalized video titles"
      );
      
      // Extract just the first line as the title
      const firstLine = title.split('\n')[0].replace(/["']|Title:|\d+\./g, '').trim();
      
      // Update the recording title
      const updatedRecording = {
        ...selectedRecording,
        title: firstLine
      };
      
      setRecordings(prev => 
        prev.map(rec => rec.id === selectedRecording.id ? updatedRecording : rec)
      );
      
      setSelectedRecording(updatedRecording);
    } catch (err) {
      console.error('Error generating title:', err);
      setError('Failed to generate title: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Video Email</h1>
        <p className="text-gray-600 mt-1">Record and send personalized video messages to your contacts</p>
      </header>
      
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('record')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'record' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Video size={18} className="inline mr-1.5" />
            Record
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'library' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileVideo size={18} className="inline mr-1.5" />
            Library ({recordings.length})
          </button>
        </div>
        
        <div className="mt-4">
          {activeTab === 'record' ? (
            <div className="space-y-4">
              {/* Recipient Selection */}
              {!isRecording && !isPaused && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Recipient (Optional)
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={selectedRecipient || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        loadRecipientPersona(e.target.value);
                      } else {
                        setSelectedRecipient(null);
                        setShowRecipientPersona(false);
                        setRecipientPersona(null);
                      }
                    }}
                  >
                    <option value="">-- Select a recipient --</option>
                    {availableRecipients.map(recipient => (
                      <option key={recipient.email} value={recipient.email}>
                        {recipient.name} ({recipient.position}, {recipient.company})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Recipient Persona Card */}
              {showRecipientPersona && recipientPersona && (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="flex justify-between items-start">
                    <div className="flex">
                      <UserCircle size={40} className="text-blue-500 mr-3" />
                      <div>
                        <h3 className="font-medium text-gray-900">{recipientPersona.name}</h3>
                        <p className="text-sm text-gray-600">{recipientPersona.position}, {recipientPersona.company}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowRecipientPersona(!showRecipientPersona)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showRecipientPersona ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recipientPersona.interests && recipientPersona.interests.length > 0 && (
                      <div className="bg-white p-3 rounded border border-blue-100">
                        <h4 className="text-sm font-medium text-blue-800 mb-1">Key Interests</h4>
                        <ul className="list-disc pl-4 text-xs text-gray-800 space-y-1">
                          {recipientPersona.interests.map((interest, idx) => (
                            <li key={idx}>{interest}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {recipientPersona.painPoints && recipientPersona.painPoints.length > 0 && (
                      <div className="bg-white p-3 rounded border border-blue-100">
                        <h4 className="text-sm font-medium text-blue-800 mb-1">Pain Points</h4>
                        <ul className="list-disc pl-4 text-xs text-gray-800 space-y-1">
                          {recipientPersona.painPoints.map((point, idx) => (
                            <li key={idx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {recipientPersona.previousInteractions && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Previous Interactions</h4>
                      <ul className="list-disc pl-4 text-xs text-gray-800">
                        {recipientPersona.previousInteractions.map((interaction, idx) => (
                          <li key={idx}>{interaction}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <div className="relative">
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    muted={isMuted}
                    playsInline
                    className={`w-full h-full object-cover ${selectedFilter !== 'none' ? 'filter' : ''}`}
                    style={{ filter: selectedFilter !== 'none' ? 'var(--filter-value)' : 'none' }}
                    onTimeUpdate={handleTimeUpdate}
                  />
                  
                  {/* Canvas for thumbnails and effects */}
                  <canvas ref={canvasRef} className="hidden" width="640" height="360"></canvas>
                  
                  {/* Filters CSS Variable */}
                  <style>
                    {`:root { --filter-value: ${getFilterValue(selectedFilter)}; }`}
                  </style>
                  
                  {/* Video controls overlay */}
                  {isRecording && (
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center">
                      <span className="h-2 w-2 bg-white rounded-full mr-2 animate-pulse"></span>
                      {isPaused ? "Paused" : "Recording"} {formatTime(recordingTime)}
                    </div>
                  )}
                  
                  {/* Center playback controls - shown when video is loaded but not when recording */}
                  {!isRecording && selectedRecording && (
                    <div className="absolute inset-0 flex items-center justify-center video-controls">
                      <div className="bg-black bg-opacity-50 p-3 rounded-full">
                        {isPlaying ? (
                          <button onClick={pauseRecording} className="text-white p-2 hover:text-gray-200">
                            <Pause size={30} />
                          </button>
                        ) : (
                          <button onClick={playRecording} className="text-white p-2 hover:text-gray-200">
                            <Play size={30} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Trim indicator */}
                  {showTrimControls && selectedRecording && (
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col">
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${(currentTime / selectedRecording.duration) * 100}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <input
                          type="range"
                          min="0"
                          max={selectedRecording.duration}
                          value={trimStart}
                          onChange={(e) => setTrimStart(Number(e.target.value))}
                          className="trim-slider w-full bg-blue-200"
                        />
                        <span className="text-white text-sm bg-black bg-opacity-60 px-2 py-1 rounded ml-2">
                          {formatTime(trimStart)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <input
                          type="range"
                          min="0"
                          max={selectedRecording.duration}
                          value={trimEnd}
                          onChange={(e) => setTrimEnd(Number(e.target.value))}
                          className="trim-slider w-full bg-blue-200"
                        />
                        <span className="text-white text-sm bg-black bg-opacity-60 px-2 py-1 rounded ml-2">
                          {formatTime(trimEnd)}
                        </span>
                      </div>
                      
                      <div className="flex justify-center space-x-2 mt-2">
                        <button 
                          onClick={trimVideo} 
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                        >
                          Apply Trim
                        </button>
                        <button 
                          onClick={() => setShowTrimControls(false)} 
                          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Talking points overlay */}
                  {showTalkingPoints && talkingPoints.length > 0 && !isRecording && !showEmailComposer && (
                    <div className="absolute top-4 right-4 w-1/3 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-900 font-medium">Talking Points</h3>
                        <button 
                          onClick={() => setShowTalkingPoints(false)} 
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <ul className="space-y-2">
                        {talkingPoints.map((point, index) => (
                          <li key={point.id} className="flex items-start talking-point">
                            <input
                              type="checkbox"
                              checked={point.completed}
                              onChange={() => {
                                const updatedPoints = [...talkingPoints];
                                updatedPoints[index].completed = !updatedPoints[index].completed;
                                setTalkingPoints(updatedPoints);
                              }}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className={`ml-2 text-sm ${point.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {point.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Video feedback overlay */}
                  {videoFeedback && !isRecording && !isPlaying && !showEmailComposer && (
                    <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-gray-900">AI Video Analysis</h4>
                        <button
                          onClick={() => setVideoFeedback(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Quality</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${videoFeedback.confidence * 100}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Pacing</div>
                          <div className="flex justify-center">
                            <span className="text-xs font-medium text-blue-600">{videoFeedback.pacing}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Clarity</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${videoFeedback.clarity * 100}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Engagement</div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${videoFeedback.engagement * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                      
                      {videoFeedback.suggestions.length > 0 && (
                        <div className="text-xs">
                          <div className="text-gray-700 font-medium mb-1 flex items-center">
                            <Lightbulb size={12} className="mr-1 text-amber-500" />
                            Tips for improvement:
                          </div>
                          <ul className="text-gray-600 pl-4 list-disc">
                            {videoFeedback.suggestions.slice(0, 2).map((suggestion, index) => (
                              <li key={index}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Optimal length recommendation */}
                  {selectedRecipient && !isRecording && !selectedRecording && (
                    <div className="absolute top-4 left-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm border border-blue-200">
                      <Clock size={14} className="inline-block mr-1" /> Recommended length: {getOptimalLength()}
                    </div>
                  )}
                  
                  {/* Recording overlay control buttons */}
                  {!isRecording && !selectedRecording && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                      <button 
                        onClick={startRecording}
                        className="bg-red-600 text-white p-5 rounded-full hover:bg-red-700 shadow-lg"
                      >
                        <Camera size={30} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Recording/Playback controls */}
              {isRecording ? (
                <div className="flex justify-center space-x-4">
                  {isPaused ? (
                    <button 
                      onClick={togglePauseRecording} 
                      className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700"
                    >
                      <Play size={18} className="mr-1" />
                      Resume
                    </button>
                  ) : (
                    <button 
                      onClick={togglePauseRecording} 
                      className="bg-yellow-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-yellow-700"
                    >
                      <Pause size={18} className="mr-1" />
                      Pause
                    </button>
                  )}
                  <button 
                    onClick={stopRecording} 
                    className="bg-red-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-red-700"
                  >
                    <X size={18} className="mr-1" />
                    Stop
                  </button>
                </div>
              ) : selectedRecording ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 flex-wrap gap-2">
                    <button 
                      onClick={showTrimControls ? trimVideo : () => setShowTrimControls(true)} 
                      className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md flex items-center hover:bg-gray-200 text-sm"
                    >
                      <Scissors size={16} className="mr-1" />
                      {showTrimControls ? 'Apply Trim' : 'Trim Video'}
                    </button>
                    
                    <div className="relative">
                      <button 
                        onClick={() => setIsConfigOpen(!isConfigOpen)} 
                        className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md flex items-center hover:bg-gray-200 text-sm"
                      >
                        <Sliders size={16} className="mr-1" />
                        Enhance
                      </button>
                      
                      {isConfigOpen && (
                        <div className="absolute z-10 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Video Enhancements</h4>
                          
                          <div className="mb-4">
                            <label className="block text-sm text-gray-700 mb-1">Filter</label>
                            <select
                              value={selectedFilter}
                              onChange={(e) => setSelectedFilter(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="none">None</option>
                              <option value="professional">Professional</option>
                              <option value="warmth">Warmth</option>
                              <option value="brightness">Brightness</option>
                              <option value="contrast">Contrast</option>
                              <option value="grayscale">Grayscale</option>
                              <option value="sepia">Sepia</option>
                            </select>
                            
                            {aiSuggestedFilters.length > 0 && (
                              <div className="mt-1 text-xs">
                                <span className="text-gray-500">AI Suggestions:</span> 
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {aiSuggestedFilters.map((filter, idx) => (
                                    <button 
                                      key={idx} 
                                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100"
                                      onClick={() => setSelectedFilter(filter)}
                                    >
                                      {filter}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="mb-4">
                            <label className="block text-sm text-gray-700 mb-1">Volume</label>
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.1" 
                              value={volume}
                              onChange={(e) => setVolume(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          
                          <div className="mb-4">
                            <label className="block text-sm text-gray-700 mb-1">Playback Speed</label>
                            <select
                              value={playbackRate}
                              onChange={(e) => setPlaybackRate(Number(e.target.value))}
                              className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="0.5">0.5x</option>
                              <option value="0.75">0.75x</option>
                              <option value="1">1x</option>
                              <option value="1.25">1.25x</option>
                              <option value="1.5">1.5x</option>
                              <option value="2">2x</option>
                            </select>
                          </div>
                          
                          <button 
                            onClick={processVideo} 
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                          >
                            Apply Changes & Process
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={generateTalkingPoints}
                      disabled={isGeneratingTalkingPoints} 
                      className={`${
                        isGeneratingTalkingPoints 
                          ? 'bg-gray-300 cursor-not-allowed' 
                          : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                      } px-3 py-1.5 rounded-md flex items-center text-sm`}
                    >
                      {isGeneratingTalkingPoints ? (
                        <>
                          <RefreshCw size={16} className="mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <List size={16} className="mr-1" />
                          {showTalkingPoints ? 'Hide' : 'Show'} Talking Points
                        </>
                      )}
                    </button>
                    
                    <button 
                      onClick={generateVideoTitle}
                      className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-md flex items-center hover:bg-indigo-200 text-sm"
                    >
                      <Edit size={16} className="mr-1" />
                      AI Title
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={downloadRecording} 
                      className="bg-green-600 text-white px-3 py-1.5 rounded-md flex items-center hover:bg-green-700 text-sm"
                    >
                      <Download size={16} className="mr-1" />
                      Download
                    </button>
                    
                    <button 
                      onClick={() => setShowEmailComposer(true)} 
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-md flex items-center hover:bg-blue-700 text-sm"
                    >
                      <Mail size={16} className="mr-1" />
                      Send as Email
                    </button>
                  </div>
                </div>
              ) : null}
              
              {/* Video info display */}
              {selectedRecording && (
                <div className="p-4 bg-gray-50 rounded-lg mt-4 border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium text-gray-900">{selectedRecording.title}</h3>
                        <button className="ml-2 text-blue-600 hover:text-blue-800" onClick={generateVideoTitle}>
                          <Edit size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">
                        <Clock size={14} className="inline mr-1" />
                        {formatTime(selectedRecording.duration)} • 
                        <span className="ml-1">{(selectedRecording.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => setSelectedRecording(null)} 
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  {/* Transcription display */}
                  {transcription && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center">
                          <Mic size={14} className="mr-1 text-gray-500" /> 
                          Transcription
                        </h4>
                        <button className="text-xs text-blue-600 hover:text-blue-800">
                          Edit
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                        {transcription}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Email composer form */}
              {showEmailComposer && selectedRecording && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Send Video Email</h3>
                    <button 
                      onClick={() => setShowEmailComposer(false)} 
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="recipients" className="block text-sm font-medium text-gray-700">
                        Recipients
                      </label>
                      <input
                        type="text"
                        id="recipients"
                        value={emailRecipients.join(', ')}
                        onChange={(e) => setEmailRecipients(e.target.value.split(',').map(r => r.trim()))}
                        placeholder="email@example.com, email2@example.com"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Video message: [Topic]"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                        Email Body
                      </label>
                      <div className="flex justify-end mb-2">
                        <button 
                          onClick={generateEmailDraft}
                          className="text-sm text-blue-600 flex items-center"
                        >
                          <Brain size={16} className="mr-1" />
                          Generate with AI
                        </button>
                      </div>
                      <textarea
                        id="body"
                        rows={6}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Enter your email message here..."
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      ></textarea>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setShowEmailComposer(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={sendVideoEmail}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <Send size={16} className="mr-1.5" />
                        Send Video Email
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Video Library</h3>
                
                {recordings.length === 0 ? (
                  <div className="text-center py-12">
                    <FileVideo size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-2">No videos recorded yet</p>
                    <button 
                      onClick={() => setActiveTab('record')}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700"
                    >
                      Record Your First Video
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {recordings.map(recording => (
                      <div 
                        key={recording.id}
                        className={`bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer ${
                          selectedRecording?.id === recording.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => {
                          setSelectedRecording(recording);
                          setActiveTab('record');
                          setShowTrimControls(false);
                          setIsConfigOpen(false);
                          setShowEmailComposer(false);
                          
                          // Reset trim values to full video length
                          setTrimStart(0);
                          setTrimEnd(recording.duration);
                          
                          // Analyze the video on selection if not already analyzed
                          if (!videoFeedback) {
                            analyzeVideoContent(recording);
                          }
                        }}
                      >
                        <div className="aspect-video bg-gray-200 relative thumbnail-preview">
                          {recording.thumbnailUrl ? (
                            <img 
                              src={recording.thumbnailUrl} 
                              alt={recording.title} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <FileVideo size={36} className="text-gray-400" />
                            </div>
                          )}
                          
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                            {formatTime(recording.duration)}
                          </div>
                          
                          {recording.status === 'sent' && (
                            <div className="absolute top-2 left-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              Sent
                            </div>
                          )}
                        </div>
                        
                        <div className="p-3">
                          <h3 className="font-medium text-gray-900 text-sm truncate">{recording.title}</h3>
                          <p className="text-xs text-gray-500 flex justify-between mt-1">
                            <span>{new Date(recording.timestamp).toLocaleDateString()}</span>
                            <span>{(recording.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </p>
                          
                          {/* Performance metrics for sent videos */}
                          {recording.status === 'sent' && recording.viewCount !== undefined && (
                            <div className="mt-2 border-t pt-2 border-gray-100">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500 flex items-center">
                                  <Eye size={12} className="mr-1" />{recording.viewCount} views
                                </span>
                                <span className="text-gray-500 flex items-center">
                                  <BarChart3 size={12} className="mr-1" />{recording.watchTimePercentage || 0}% watched
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between mt-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRecording(recording.id);
                              }}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            >
                              <Trash size={16} />
                            </button>
                            
                            <div className="flex space-x-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Implement share functionality
                                  alert('Share functionality would go here');
                                }}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              >
                                <Share2 size={16} />
                              </button>
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRecording(recording);
                                  setActiveTab('record');
                                  setShowEmailComposer(true);
                                }}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                              >
                                <Mail size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Video Analytics (For demo purposes) */}
              {recordings.length > 0 && (
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Video Performance</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-700">
                        {recordings.filter(r => r.status === 'sent').length}
                      </div>
                      <div className="text-sm text-blue-600">Videos Sent</div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-700">68%</div>
                      <div className="text-sm text-green-600">Average View Rate</div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-700">42%</div>
                      <div className="text-sm text-purple-600">Response Rate</div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-800 mb-3">Recent Activity</h4>
                    
                    <div className="space-y-3">
                      {recordings
                        .filter(r => r.status === 'sent')
                        .slice(0, 3)
                        .map(recording => (
                          <div key={recording.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                            <div>
                              <div className="font-medium">{recording.title}</div>
                              <div className="text-sm text-gray-500">
                                Sent to: {recording.recipients?.join(', ')}
                              </div>
                            </div>
                            <div className="text-sm text-green-600">
                              <Check size={16} className="inline mr-1" />
                              Viewed
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
          <AlertCircle size={18} className="mr-2" />
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={18} />
          </button>
        </div>
      )}
      
      {/* AI suggestions for video messages */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <div className="col-span-1 md:col-span-3">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center">
              <Brain size={20} className="text-indigo-600 mr-2" />
              AI-Powered Video Email Tips
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                <h4 className="font-medium text-indigo-700 mb-2 text-sm">Ideal Video Length</h4>
                <p className="text-gray-600 text-sm">Keep videos under 2 minutes for highest engagement. 60-90 seconds is optimal for most prospects.</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                <h4 className="font-medium text-indigo-700 mb-2 text-sm">Best Sending Times</h4>
                <p className="text-gray-600 text-sm">Tuesday and Wednesday mornings between 9-11 AM have the highest open rates for video emails.</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                <h4 className="font-medium text-indigo-700 mb-2 text-sm">Personalization Impact</h4>
                <p className="text-gray-600 text-sm">Mentioning the recipient's name and specific pain points increases response rates by 35%.</p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center">
                See all tips <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-span-1">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Quick Actions</h3>
            
            <div className="space-y-2">
              <button 
                onClick={() => setActiveTab('record')}
                className="w-full flex items-center p-2 text-left text-sm hover:bg-gray-50 rounded"
              >
                <Camera size={16} className="mr-2 text-red-600" />
                Record New Video
              </button>
              
              <button 
                onClick={() => {
                  if (selectedRecording) {
                    generateTalkingPoints();
                    setShowTalkingPoints(true);
                  } else {
                    setError("Please select a video first");
                  }
                }}
                className={`w-full flex items-center p-2 text-left text-sm hover:bg-gray-50 rounded ${
                  !selectedRecording || isGeneratingTalkingPoints ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!selectedRecording || isGeneratingTalkingPoints}
              >
                <Brain size={16} className="mr-2 text-purple-600" />
                Generate Talking Points
              </button>
              
              <button 
                onClick={() => {
                  if (selectedRecording) {
                    generateEmailDraft();
                  } else {
                    setError("Please select a video first");
                  }
                }}
                className={`w-full flex items-center p-2 text-left text-sm hover:bg-gray-50 rounded ${
                  !selectedRecording ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!selectedRecording}
              >
                <MessageSquare size={16} className="mr-2 text-blue-600" />
                Draft Email Copy
              </button>
              
              <div className="border-t border-gray-200 my-2"></div>
              
              <button 
                onClick={() => {/* Show analytics */}}
                className="w-full flex items-center p-2 text-left text-sm hover:bg-gray-50 rounded"
              >
                <BarChart3 size={16} className="mr-2 text-green-600" />
                View Performance Analytics
              </button>
              
              <button 
                onClick={() => {/* Show settings */}}
                className="w-full flex items-center p-2 text-left text-sm hover:bg-gray-50 rounded"
              >
                <Settings size={16} className="mr-2 text-gray-600" />
                Video Settings
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Video</h3>
            
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              <p className="text-right mt-1 text-sm text-gray-600">{processingProgress}%</p>
            </div>
            
            <p className="text-gray-500 text-sm text-center">
              This may take a moment...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoEmail;