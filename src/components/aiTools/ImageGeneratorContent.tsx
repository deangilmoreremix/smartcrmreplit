import React, { useState } from 'react';
import { Image as ImageIcon, RefreshCw, Download, Wand2, Upload, X, Sparkles } from 'lucide-react';
import { openaiImageService, IMAGE_MODELS, type ImageEditOptions } from '../../services/openaiImageService';
import { fileToDataURL } from '../../services/openaiVisionService';

type Mode = 'generate' | 'edit';
type Format = NonNullable<ImageEditOptions['output_format']>;

const SAMPLE_PROMPTS = [
  'Professional business team collaborating in a modern office, natural light',
  'Clean product hero shot of a CRM dashboard on a laptop, studio lighting',
  'Minimal flat illustration of a sales funnel with upward growth arrows',
  'Friendly mascot logo for a sales app on a transparent background',
];

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // the serverless request body limit is ~6 MB in total

const Select: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
  id: string;
}> = ({ label, value, onChange, options, id }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  </div>
);

/** GPT Image 2.6: generate or edit images (Flare / Sunburst) with streaming previews, GIF and SVG output. */
const ImageGeneratorContent: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<string>('gpt-image-2.6-flare');
  const [size, setSize] = useState('auto');
  const [quality, setQuality] = useState('auto');
  const [complexity, setComplexity] = useState('low');
  const [background, setBackground] = useState('auto');
  const [format, setFormat] = useState<Format>('png');
  const [frameCount, setFrameCount] = useState(9);
  const [frameDuration, setFrameDuration] = useState(200);

  const [sources, setSources] = useState<Array<{ name: string; url: string }>>([]);
  const [guide, setGuide] = useState<{ kind: 'mask' | 'markup'; name: string; url: string } | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setModel(m === 'edit' ? 'gpt-image-2.6-sunburst' : 'gpt-image-2.6-flare');
    setError(null);
  };

  const readFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const added: Array<{ name: string; url: string }> = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) throw new Error(`${f.name} is not an image.`);
        if (f.size > MAX_UPLOAD_BYTES) throw new Error(`${f.name} is larger than 4 MB.`);
        added.push({ name: f.name, url: await fileToDataURL(f) });
      }
      setSources((prev) => [...prev, ...added].slice(0, 16));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the image');
    }
  };

  const readGuide = async (kind: 'mask' | 'markup', file?: File) => {
    if (!file) return;
    if (file.type !== 'image/png') return setError(`The ${kind} must be a PNG with transparency.`);
    if (file.size > MAX_UPLOAD_BYTES) return setError(`The ${kind} is larger than 4 MB.`);
    setGuide({ kind, name: file.name, url: await fileToDataURL(file) });
  };

  const run = async () => {
    if (!prompt.trim()) return setError('Describe the image you want.');
    if (mode === 'edit' && !sources.length) return setError('Upload at least one image to edit.');
    setIsLoading(true);
    setError(null);
    setPreview(null);
    setResult(null);

    const opts: ImageEditOptions = {
      model: model as ImageEditOptions['model'],
      size,
      quality: quality as ImageEditOptions['quality'],
      complexity: complexity as ImageEditOptions['complexity'],
      background: background as ImageEditOptions['background'],
      output_format: format,
      ...(format === 'gif' ? { frame_count: frameCount, frame_duration_ms: frameDuration } : {}),
      ...(mode === 'edit' && guide ? { [guide.kind]: guide.url } : {}),
    };
    try {
      const res =
        mode === 'edit'
          ? await openaiImageService.edit(prompt, sources.map((s) => s.url), opts, (url) => setPreview(url))
          : await openaiImageService.generate(prompt, opts, (url) => setPreview(url));
      setResult(res.images[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    a.download = `smartcrm-image-${Date.now()}.${format === 'jpeg' ? 'jpg' : format}`;
    a.click();
  };

  const shown = result || preview;
  const transparentOk = format === 'png' || format === 'webp';

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-start">
        <ImageIcon className="text-indigo-600 mt-1 mr-3 h-5 w-5" />
        <div>
          <h3 className="font-medium text-indigo-800">Image Studio — GPT Image 2.6</h3>
          <p className="text-sm text-indigo-700 mt-1">
            Generate new images or edit your own. Flare is fastest; Sunburst gives more detail and more consistent edits.
          </p>
        </div>
      </div>

      <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden" role="tablist">
        {(['generate', 'edit'] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`px-4 py-2 text-sm ${mode === m ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
          >
            {m === 'generate' ? 'Generate' : 'Edit images'}
          </button>
        ))}
      </div>

      {mode === 'edit' && (
        <div className="space-y-3">
          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
            <Upload size={16} /> Upload images to edit or combine (up to 16, 4 MB each)
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => { readFiles(e.target.files); e.target.value = ''; }} />
          </label>
          {sources.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sources.map((s, i) => (
                <div key={i} className="relative">
                  <img src={s.url} alt={s.name} className="h-16 w-16 object-cover rounded border" />
                  <button aria-label={`Remove ${s.name}`} onClick={() => setSources(sources.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-white rounded-full border p-0.5">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {(['mask', 'markup'] as const).map((kind) => (
              <label key={kind} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                <Upload size={14} />
                <span>
                  {kind === 'mask' ? 'Optional mask PNG (transparent = area to change)' : 'Optional markup PNG (draw marks over the first image)'}
                </span>
                <input type="file" accept="image/png" className="hidden" onChange={(e) => { readGuide(kind, e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            ))}
          </div>
          {guide && (
            <p className="text-xs text-gray-600">
              Using {guide.kind}: {guide.name}{' '}
              <button className="underline" onClick={() => setGuide(null)}>remove</button>
              {guide.kind === 'markup' && ' — must be the same size as the first image.'}
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="img-prompt" className="block text-sm font-medium text-gray-700 mb-1">
          {mode === 'edit' ? 'What should change?' : 'Describe the image'}
        </label>
        <textarea
          id="img-prompt"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg"
          placeholder={mode === 'edit' ? 'e.g. Replace the background with a bright office and add our logo top-right' : 'e.g. A clean product photo of…'}
        />
        {mode === 'generate' && (
          <div className="flex flex-wrap gap-2 mt-2">
            {SAMPLE_PROMPTS.map((p) => (
              <button key={p} type="button" onClick={() => setPrompt(p)} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Select id="img-model" label="Model" value={model} onChange={setModel} options={IMAGE_MODELS.map((m) => [m.id, `${m.name} — ${m.description}`])} />
        <Select id="img-size" label="Size" value={size} onChange={setSize} options={[['auto', 'Auto'], ['1024x1024', 'Square 1024×1024'], ['1536x1024', 'Landscape 1536×1024'], ['1024x1536', 'Portrait 1024×1536']]} />
        <Select id="img-quality" label="Quality" value={quality} onChange={setQuality} options={[['auto', 'Auto'], ['low', 'Low (fastest)'], ['medium', 'Medium'], ['high', 'High'], ['xhigh', 'Extra high'], ['max', 'Max']]} />
        <Select id="img-complexity" label="Planning (complexity)" value={complexity} onChange={setComplexity} options={[['low', 'Low — fastest, best for edits'], ['medium', 'Medium'], ['high', 'High — most planning']]} />
        <Select id="img-format" label="Format" value={format} onChange={(v) => { setFormat(v as Format); if (v !== 'png' && v !== 'webp' && background === 'transparent') setBackground('auto'); }} options={[['png', 'PNG'], ['jpeg', 'JPEG'], ['webp', 'WebP'], ['gif', 'Animated GIF (preview access)'], ['svg', 'SVG vector (preview access)']]} />
        <Select id="img-bg" label="Background" value={background} onChange={setBackground} options={[['auto', 'Auto'], ['opaque', 'Opaque'], ...(transparentOk ? [['transparent', 'Transparent'] as [string, string]] : [])]} />
      </div>

      {format === 'gif' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="img-frames" className="block text-sm font-medium text-gray-700 mb-1">Frames (2–16)</label>
            <input id="img-frames" type="number" min={2} max={16} value={frameCount} onChange={(e) => setFrameCount(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="img-duration" className="block text-sm font-medium text-gray-700 mb-1">Frame duration (ms)</label>
            <input id="img-duration" type="number" min={20} step={10} value={frameDuration} onChange={(e) => setFrameDuration(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md" />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={run}
          disabled={isLoading || !prompt.trim()}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {isLoading ? <RefreshCw size={18} className="animate-spin mr-2" /> : mode === 'edit' ? <Wand2 size={18} className="mr-2" /> : <Sparkles size={18} className="mr-2" />}
          {isLoading ? (preview ? 'Refining…' : 'Working…') : mode === 'edit' ? 'Apply edit' : 'Generate image'}
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      {shown && (
        <div className="space-y-2">
          <div className="rounded-xl border overflow-hidden bg-[repeating-conic-gradient(#f3f4f6_0_25%,#fff_0_50%)] bg-[length:20px_20px]">
            <img src={shown} alt={prompt} data-testid="generated-image" className={`w-full max-h-[60vh] object-contain ${result ? '' : 'opacity-80 blur-[1px]'}`} />
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>{result ? 'Done' : 'Preview — refining…'}</span>
            {result && (
              <button onClick={download} className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200">
                <Download size={14} className="mr-1" /> Download
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGeneratorContent;
