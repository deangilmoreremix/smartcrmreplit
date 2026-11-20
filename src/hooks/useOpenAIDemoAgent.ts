/**
 * AI demo agent used by DemoAgentModal. Text generation runs on OpenAI via the
 * server-side gateway; speech uses the browser's speechSynthesis; recording uses
 * MediaRecorder + /api/ai/transcribe.
 */
import { aiClient } from '../services/aiClient';
import { fileToDataURL } from '../services/openaiVisionService';

const SYSTEM =
  'You are an expert product demo agent for a sales team. Be concise, specific and persuasive without exaggerating.';

const HISTORY_KEY = 'smartcrm.demoAgent.history';

type Turn = { role: 'user' | 'assistant'; content: string };

function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export const useOpenAIDemoAgent = () => {
  const ask = (prompt: string) => aiClient.text(prompt, { system: SYSTEM, temperature: 0.6 });

  return {
    async loadPreviousDemo(product: string): Promise<any[]> {
      try {
        const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        return all.filter((d: any) => !product || String(d.input).includes(product));
      } catch {
        return [];
      }
    },

    async extractPDFSummary(file: File) {
      const dataUrl = await fileToDataURL(file);
      const res = await aiClient.analyzeImage('Summarize this document for a product demo: product, audience, key features, proof points.', [dataUrl]);
      return res.text;
    },

    async extractDocxSummary(file: File) {
      // DOCX is a zip; read whatever text is extractable and let the model clean it up.
      const raw = (await file.text()).replace(/<[^>]+>/g, ' ').replace(/[^\x20-\x7E\n]+/g, ' ').slice(0, 20000);
      return ask(`Summarize this document text for a product demo (product, audience, key features, proof points):\n\n${raw}`);
    },

    async enrichFromURL(input: string) {
      return ask(`The user provided: ${input}\nYou cannot browse; describe what a demo for this product/URL should cover, based only on the text given.`);
    },

    coAnalyzeContent: (input: string) => ask(`Extract the core value propositions, target personas and differentiators from:\n\n${input}`),

    runAgent: (analysis: string) => ask(`Write a 3-minute live demo script (opening, 3 feature walkthroughs tied to pains, proof, close) based on:\n\n${analysis}`),

    async speakAgent(text: string) {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text.slice(0, 3000)));
    },

    async saveDemoToSupabase(input: string, result: string) {
      // Stored locally; there is no demos table in the Supabase schema.
      try {
        const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        all.unshift({ input, result, createdAt: new Date().toISOString() });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(all.slice(0, 20)));
      } catch {
        /* storage unavailable */
      }
    },

    async handleQAFlow(input: string): Promise<string[]> {
      const r = await aiClient.json<{ questions: string[] }>(
        `List the 5 questions a prospect is most likely to ask after this demo. Return JSON {"questions":["..."]}.\n\n${input}`,
      );
      return r.questions || [];
    },

    async suggestNextSteps(input: string): Promise<string[]> {
      const r = await aiClient.json<{ steps: string[] }>(
        `Suggest 4 concrete next steps after this demo. Return JSON {"steps":["..."]}.\n\n${input}`,
      );
      return r.steps || [];
    },

    async startRecording(durationMs = 8000): Promise<string> {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
      recorder.start();
      setTimeout(() => recorder.stop(), durationMs);
      await done;
      stream.getTracks().forEach((t) => t.stop());
      return aiClient.transcribe(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }), 'recording.webm');
    },

    async detectEmotion(text: string): Promise<string> {
      const r = await aiClient.json<{ emotion: string }>(`What emotion does this prospect express? Return JSON {"emotion":"one word"}.\n\n${text}`);
      return r.emotion || 'neutral';
    },

    handleObjections: (objection: string) => ask(`Respond to this sales objection with empathy, a reframe and a question:\n\n${objection}`),

    async detectIntent(message: string): Promise<string> {
      const r = await aiClient.json<{ intent: string }>(
        `Classify the intent of this message (question, objection, buying_signal, small_talk, other). Return JSON {"intent":"..."}.\n\n${message}`,
      );
      return r.intent || 'other';
    },

    continueConversation: async (message: string, history: Turn[] = []) =>
      (await aiClient.chat('', { system: SYSTEM, messages: [...history.slice(-20), { role: 'user', content: message }] })).text,

    async exportDemoToVideo(history: Turn[]) {
      // Video rendering isn't available; export the transcript so it can be recorded.
      download('demo-transcript.json', JSON.stringify(history, null, 2));
    },

    async generateTeaserClip(history: Turn[]) {
      const script = await ask(`Write a 30-second teaser script from this demo conversation:\n\n${JSON.stringify(history).slice(0, 8000)}`);
      download('demo-teaser.txt', script, 'text/plain');
      return script;
    },

    async generateSlidesWithVoiceOver(history: Turn[]) {
      const slides = await ask(
        `Turn this demo into 6 slides. For each: title, 3 bullets, and voice-over text. Markdown.\n\n${JSON.stringify(history).slice(0, 8000)}`,
      );
      download('demo-slides.md', slides, 'text/markdown');
      return slides;
    },
  };
};

export default useOpenAIDemoAgent;
