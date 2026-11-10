// Voiceover for a tool Reel with Kokoro (open source, Apache-2.0, runs on the CPU, no account or key).
// Reads spec.vo = {hook, beats: [..], catch, cta}, writes <dir>/vo/<part>.wav and adds spec.voice
// (file + length of every line) so the template sizes each part to its line.
// Usage: node voice/make.mjs <dir containing tool-reel.json> [voice=af_heart]
import fs from 'node:fs';
import path from 'node:path';
import { KokoroTTS } from 'kokoro-js';

const [dir, voiceArg] = process.argv.slice(2);
const specPath = path.join(dir, 'tool-reel.json');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
if (!spec.vo) { console.log('No vo lines in the spec; skipping voiceover'); process.exit(0); }
const voice = voiceArg || spec.vo.voice || 'af_heart';
const lines = { hook: spec.vo.hook, catch: spec.vo.catch, cta: spec.vo.cta };
(spec.vo.beats || []).forEach((t, i) => { lines[`beat${i}`] = t; });

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
fs.mkdirSync(path.join(dir, 'vo'), { recursive: true });
const parts = {};
for (const [key, text] of Object.entries(lines)) {
  if (!text) continue;
  const a = await tts.generate(text, { voice, speed: spec.vo.speed || 1.05 });
  const src = `vo/${key}.wav`;
  await a.save(path.join(dir, src));
  parts[key] = { src, dur: +(a.audio.length / a.sampling_rate).toFixed(2), text };
  console.log(`${key}: ${parts[key].dur}s  ${text}`);
}
spec.voice = { engine: 'kokoro-82m', voice, parts, aiLabel: 'Tick "AI info" when posting: the voiceover is AI-generated.' };
fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
