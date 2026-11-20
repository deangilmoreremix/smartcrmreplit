import React, { useRef, useState } from 'react';
import { Mic, Square, Upload, RefreshCw, Volume2 } from 'lucide-react';
import AIToolContent from '../shared/AIToolContent';
import { aiClient } from '../../services/aiClient';

/**
 * Record (or upload) a sales call snippet, transcribe it with OpenAI and get
 * tone, sentiment and coaching feedback.
 */
const VoiceAnalysisRealtime: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const analyze = async (audio: Blob, filename: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      if (audio.size > 4 * 1024 * 1024) throw new Error('Audio is too large (max 4 MB). Record a shorter clip.');
      const text = await aiClient.transcribe(audio, filename);
      setTranscript(text);
      if (!text.trim()) throw new Error('No speech was detected in the recording.');
      const result = await aiClient.text(
        `Analyze this sales conversation transcript:
"""
${text}
"""
Provide in Markdown: ## Tone & Sentiment, ## Talk Patterns (pace, filler words, questions asked), ## Buying Signals / Concerns, ## Coaching Tips (3-5 specific bullets).`,
        { temperature: 0.4 },
      );
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        analyze(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }), 'recording.webm');
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setError('Microphone access was denied or is unavailable.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-start">
        <Volume2 className="text-indigo-600 mt-1 mr-3 h-5 w-5" />
        <div>
          <h3 className="font-medium text-indigo-800">Voice Analysis</h3>
          <p className="text-sm text-indigo-700 mt-1">Record or upload a call clip to get a transcript, sentiment and coaching tips.</p>
        </div>
      </div>

      <AIToolContent isLoading={isLoading} error={error} result={analysis} loadingMessage="Transcribing and analyzing..." resultTitle="Voice Analysis">
        <div className="flex flex-wrap gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
            >
              <Mic size={18} className="mr-2" /> Start recording
            </button>
          ) : (
            <button onClick={stopRecording} className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
              <Square size={18} className="mr-2" /> Stop &amp; analyze
            </button>
          )}
          <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
            <Upload size={18} className="mr-2" /> Upload audio
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) analyze(f, f.name);
                e.target.value = '';
              }}
            />
          </label>
          {isLoading && <RefreshCw className="animate-spin text-indigo-600 self-center" size={18} />}
        </div>
        {transcript && (
          <div className="mt-4 p-3 bg-gray-50 border rounded text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
            <strong>Transcript:</strong> {transcript}
          </div>
        )}
      </AIToolContent>
    </div>
  );
};

export default VoiceAnalysisRealtime;
