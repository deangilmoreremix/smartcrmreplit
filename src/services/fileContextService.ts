/**
 * Turn uploaded files into plain-text context for AI prompts.
 * Text-like files are read directly; spreadsheets via the xlsx package;
 * PDFs and images are read by OpenAI vision on the server.
 */
import { aiClient } from './aiClient';
import { fileToDataURL } from './openaiVisionService';

const MAX_VISION_BYTES = 4 * 1024 * 1024;

export async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (file.type.startsWith('text/') || /\.(txt|csv|md|json)$/.test(name)) {
    return (await file.text()).slice(0, 30000);
  }

  if (/\.(xlsx|xls)$/.test(name)) {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return wb.SheetNames.map((sheet) => `# ${sheet}\n${XLSX.utils.sheet_to_csv(wb.Sheets[sheet])}`)
      .join('\n\n')
      .slice(0, 30000);
  }

  if (file.type === 'application/pdf' || file.type.startsWith('image/') || /\.(pdf|png|jpe?g|webp)$/.test(name)) {
    if (file.size > MAX_VISION_BYTES) throw new Error(`${file.name} is too large (max 4 MB).`);
    const res = await aiClient.analyzeImage(
      'Extract the important facts, figures, claims and pricing from this file as concise plain-text notes.',
      [await fileToDataURL(file)],
    );
    return res.text;
  }

  throw new Error(`${file.name}: unsupported file type. Use PDF, image, TXT, CSV or XLSX.`);
}

export async function extractFilesText(files: File[]): Promise<string> {
  const parts = await Promise.all(files.map(async (f) => `--- ${f.name} ---\n${await extractFileText(f)}`));
  return parts.join('\n\n');
}
