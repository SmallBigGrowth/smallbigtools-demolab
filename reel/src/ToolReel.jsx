// SmallBigTools Reel (template v2) and its carousel twin, both built from one tool-reel.json spec.
// v2 follows the 10 Nov 2026 research (research/2026-11-09-smallbigtools-reel-format.md in the content repo):
//  - voiceover with our verdict (Kokoro, free), keyword captions only; each part lasts as long as its line
//  - opens on the OUTCOME (the finished result) with the claim, not a dimmed interface
//  - no flat colour cards: a blurred copy of the demo sits behind every part
//  - our own callouts (box + label) on the footage, so store screens add information instead of reposting
//  - CTA asks for comments AND sends
// Footage is a screen recording ("video") or official store screenshots ("screens").
import React, {createContext, useContext} from 'react';
import {
  AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

const {fontFamily: SANS} = loadInter('normal', {weights: ['500', '700', '800', '900'], subsets: ['latin']});
const {fontFamily: MONO} = loadMono('normal', {weights: ['500', '700'], subsets: ['latin']});

// Proposed SmallBigTools look; override any of these with "brand" in the spec.
const BRAND = {bg: '#0B0B0F', panel: 'rgba(23,23,29,0.82)', ink: '#F5F5F7', muted: '#B4B4BE', accent: '#FFC83D'};
const W = 1080;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const sec = (fps, s) => Math.round(s * fps);

// Carousel slides are stills: every animation shows its end state.
const Still = createContext(false);
const useAnim = () => {
  const still = useContext(Still);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {still, frame: still ? 999 : frame, fps};
};

// Reel layout (1080x1920) keeps clear of Instagram's buttons and caption; carousel (1080x1350) has no overlays.
const layout = (h) => (h > 1500
  ? {H: h, top: 270, bottom: 1250, left: 72, right: 1008}
  : {H: h, top: 90, bottom: 1260, left: 80, right: 1000});

const voDur = (p, key) => p.voice?.parts?.[key]?.dur || 0;

// Timeline: hook, beats, catch, cta. Each part lasts at least as long as its voiceover line.
export const toolReelPlan = (p, fps) => {
  const parts = [];
  let t = 0;
  const add = (kind, key, base, extra = {}) => {
    const dur = Math.max(base, voDur(p, key) ? voDur(p, key) + 0.35 : 0);
    parts.push({kind, key, from: sec(fps, t), dur: sec(fps, dur), ...extra});
    t += dur;
  };
  add('hook', 'hook', p.hookDur || 2.4);
  (p.beats || []).forEach((b, i) => add('beat', `beat${i}`, b.dur || Math.max(2.2, ((b.to ?? 0) - (b.from ?? 0)) / (b.speed || 1)), {i}));
  add('catch', 'catch', p.catchDur || 2.4);
  add('cta', 'cta', p.ctaDur || 2.4);
  return {parts, frames: sec(fps, t)};
};
export const toolReelFrames = (p, fps) => toolReelPlan(p, fps).frames;

// "*word*" = accent colour. "\n" = line break. Words pop in one after another.
const Headline = ({text, size = 96, start = 0, b, align = 'left'}) => {
  const {frame, fps} = useAnim();
  let i = 0;
  return (
    <div style={{fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: 1.05, letterSpacing: -2, color: b.ink, textAlign: align,
      textShadow: '0 4px 30px rgba(0,0,0,0.6)'}}>
      {text.split('\n').map((line, li) => (
        <div key={li} style={{display: 'flex', flexWrap: 'wrap', gap: `0 ${size * 0.25}px`, justifyContent: align === 'center' ? 'center' : 'flex-start'}}>
          {line.split(' ').filter(Boolean).map((raw, wi) => {
            const hi = raw.includes('*');
            const s = spring({frame: frame - start - i++ * 3, fps, config: {damping: 14, stiffness: 170, mass: 0.6}});
            return (
              <span key={wi} style={{display: 'inline-block', color: hi ? b.accent : b.ink, opacity: interpolate(s, [0, 0.4], [0, 1], clamp),
                transform: `translateY(${(1 - s) * 50}px)`}}>{raw.replace(/\*/g, '')}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const Pop = ({start = 0, children, style}) => {
  const {frame, fps} = useAnim();
  const s = spring({frame: frame - start, fps, config: {damping: 200}});
  return <div style={{opacity: s, transform: `translateY(${(1 - s) * 24}px)`, ...style}}>{children}</div>;
};

const Chip = ({children, b, solid, size = 32}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 14, padding: '12px 22px', borderRadius: 999,
    background: solid ? b.accent : 'rgba(0,0,0,0.45)', color: solid ? b.bg : b.ink, fontFamily: SANS, fontWeight: 700,
    fontSize: size, border: solid ? 'none' : '2px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)'}}>{children}</div>
);

// The footage, cropped to "focus" ([x, y, w, h] as fractions of the source) and slowly pushed in, with an
// optional callout: {box: [x, y, w, h] (source fractions), label: "..."} drawn on top.
const Footage = ({p, shot, frames, boxW, boxH, push = 0.06, cover, b}) => {
  const {frame, still} = useAnim();
  const m = p.media;
  const [fx, fy, fw, fh] = shot.focus || [0, 0, 1, 1];
  const srcW = m.width || 1920;
  const srcH = m.height || 1080;
  const z = still ? 1 : interpolate(frame, [0, frames], [1, 1 + push], clamp);
  let k; let left; let top;
  if (cover) {
    k = Math.max(boxW / (fw * srcW), boxH / (fh * srcH)) * z;
    left = boxW / 2 - (fx + fw / 2) * srcW * k; top = boxH / 2 - (fy + fh / 2) * srcH * k;
  } else { // fit the focus width, aligned top-left, so a window's left column stays in view
    k = (boxW / (fw * srcW)) * z;
    left = -fx * srcW * k; top = -fy * srcH * k;
  }
  const style = {position: 'absolute', left, top, width: srcW * k, height: srcH * k};
  const c = shot.callout;
  const cIn = still ? 1 : interpolate(frame, [8, 18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <div style={{position: 'relative', width: boxW, height: boxH, overflow: 'hidden', background: '#000'}}>
      {m.type === 'screens'
        ? <Img src={staticFile(m.screens[shot.screen || 0])} style={style} />
        : <OffthreadVideo src={staticFile(m.src)} muted startFrom={Math.round((shot.from || 0) * 30)} playbackRate={shot.speed || 1} style={style} />}
      {c && b && (() => {
        const [bx, by, bw, bh] = c.box;
        const r = {left: left + bx * srcW * k, top: top + by * srcH * k, width: bw * srcW * k, height: bh * srcH * k};
        const below = r.top + r.height + 70 < boxH;
        return (
          <>
            <div style={{position: 'absolute', ...r, border: `6px solid ${b.accent}`, borderRadius: 18, opacity: cIn,
              boxShadow: `0 0 0 4000px rgba(0,0,0,${0.35 * cIn})`, transform: `scale(${1.08 - 0.08 * cIn})`}} />
            {c.label && (
              <div style={{position: 'absolute', left: Math.max(12, Math.min(r.left, boxW - 520)), top: below ? r.top + r.height + 14 : Math.max(12, r.top - 70),
                opacity: cIn, background: b.accent, color: b.bg, fontFamily: SANS, fontWeight: 800, fontSize: 30, padding: '8px 18px', borderRadius: 12,
                maxWidth: 500}}>{c.label}</div>
            )}
          </>
        );
      })()}
    </div>
  );
};

// A device around the footage: a laptop-style window, a phone, or a plain card (store artwork, shown smaller).
const deviceBox = (p, L) => {
  const kind = p.media.frame || 'window';
  const tall = L.H > 1500;
  if (kind === 'phone') return {kind, w: tall ? 560 : 470, h: tall ? 1010 : 850};
  if (kind === 'card') return {kind, w: tall ? 640 : 560, h: p.media.boxH || (tall ? 900 : 760)};
  return {kind, w: W - 2 * 60, h: p.media.boxH || (tall ? 760 : 640)};
};
const Device = ({p, shot, frames, b, L}) => {
  const {kind, w, h} = deviceBox(p, L);
  const shadow = '0 40px 120px rgba(0,0,0,0.6)';
  if (kind === 'card') {
    return <div style={{borderRadius: 30, overflow: 'hidden', boxShadow: shadow, border: '2px solid rgba(255,255,255,0.14)'}}>
      <Footage p={p} shot={shot} frames={frames} boxW={w} boxH={h} push={0.04} b={b} />
    </div>;
  }
  if (kind === 'phone') {
    return <div style={{borderRadius: 64, padding: 16, background: '#26262C', boxShadow: shadow, border: '2px solid #3A3A42'}}>
      <div style={{borderRadius: 50, overflow: 'hidden'}}><Footage p={p} shot={shot} frames={frames} boxW={w} boxH={h} b={b} /></div>
    </div>;
  }
  return (
    <div style={{borderRadius: 24, overflow: 'hidden', boxShadow: shadow, border: '2px solid rgba(255,255,255,0.12)', background: '#1D1D23'}}>
      <div style={{display: 'flex', gap: 12, alignItems: 'center', padding: '14px 22px', background: '#24242B'}}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c}} />)}
        <div style={{marginLeft: 14, fontFamily: SANS, fontWeight: 600, fontSize: 24, color: b.muted}}>{p.tool.name}</div>
      </div>
      <Footage p={p} shot={shot} frames={frames} boxW={w} boxH={h} b={b} />
    </div>
  );
};
const Centered = ({children, top}) => <div style={{position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>{children}</div>;

// Behind every part: the demo, blurred and darkened, so no part is a flat colour card.
const Backdrop = ({p, b, L, shot}) => (
  <AbsoluteFill style={{background: b.bg}}>
    <div style={{position: 'absolute', inset: -60, filter: 'blur(38px) saturate(1.2)', opacity: 0.55}}>
      <Footage p={p} shot={{...shot, callout: null}} frames={1} boxW={W + 120} boxH={L.H + 120} push={0} cover />
    </div>
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${b.bg}CC 0%, ${b.bg}66 45%, ${b.bg}D9 100%)`}} />
  </AbsoluteFill>
);

const outcomeShot = (p) => p.outcome || (p.beats || [])[(p.beats || []).length - 1] || {};

// Rough line count of a headline once it wraps (Inter Black is ~0.56 em per character).
const lineCount = (text, size, width) => text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.replace(/\*/g, '').length * size * 0.56 / width)), 0);

const Hook = ({p, b, frames, L}) => {
  const shot = outcomeShot(p);
  const {h} = deviceBox(p, L);
  const tall = L.H > 1500;
  const size = p.hookSize || (tall ? 92 : 78);
  const textH = 70 + 26 + lineCount(p.hook, size, L.right - L.left) * size * 1.05;
  const dTop = L.top + textH + 40;
  const room = (tall ? L.bottom + 230 : L.H - 70) - dTop;
  const scale = Math.min(1, room / (h + 70));
  return (
    <AbsoluteFill>
      <Backdrop p={p} b={b} L={L} shot={shot} />
      <div style={{position: 'absolute', left: L.left, right: W - L.right, top: L.top, display: 'flex', flexDirection: 'column', gap: 26}}>
        <Pop><Chip b={b}>{p.tool.name}{p.tool.platforms ? ` · ${p.tool.platforms}` : ''}</Chip></Pop>
        <Headline text={p.hook} size={size} start={3} b={b} />
      </div>
      <Centered top={dTop}>
        <div style={{transform: `scale(${scale})`, transformOrigin: 'top center'}}>
          <Pop start={2}><Device p={p} shot={shot} frames={frames} b={b} L={L} /></Pop>
        </div>
      </Centered>
    </AbsoluteFill>
  );
};

const Beat = ({p, b, i, frames, L}) => {
  const shot = p.beats[i];
  const {frame, fps, still} = useAnim();
  const enter = still ? 1 : spring({frame, fps, config: {damping: 200}});
  return (
    <AbsoluteFill>
      <Backdrop p={p} b={b} L={L} shot={shot} />
      <div style={{position: 'absolute', left: L.left, right: W - L.right, top: L.top, display: 'flex', gap: 22, alignItems: 'flex-start'}}>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 44, color: b.bg, background: b.accent, borderRadius: 14, padding: '4px 16px'}}>{i + 1}</div>
        <Headline text={shot.caption} size={62} start={2} b={b} />
      </div>
      <Centered top={L.top + 220}>
        <div style={{transform: `translateY(${(1 - enter) * 80}px) scale(${0.96 + 0.04 * enter})`, opacity: enter}}>
          <Device p={p} shot={shot} frames={frames} b={b} L={L} />
        </div>
      </Centered>
      {p.credit && <div style={{position: 'absolute', left: 0, right: 0, textAlign: 'center', top: L.top + 236 + deviceBox(p, L).h + (p.media.frame === 'phone' ? 32 : p.media.frame === 'card' ? 4 : 56),
        fontFamily: SANS, fontSize: 24, color: b.muted}}>{p.credit}</div>}
    </AbsoluteFill>
  );
};

const Catch = ({p, b, L}) => (
  <AbsoluteFill>
    <Backdrop p={p} b={b} L={L} shot={outcomeShot(p)} />
    <div style={{position: 'absolute', left: L.left, right: W - L.right, top: L.top + 40, display: 'flex', flexDirection: 'column', gap: 24}}>
      <Pop><div style={{display: 'flex', alignItems: 'center', gap: 26}}>
        {p.tool.icon && <Img src={staticFile(p.tool.icon)} style={{width: 110, height: 110, borderRadius: 26}} />}
        <div>
          <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 72, color: b.ink, letterSpacing: -1}}>{p.tool.name}</div>
          {p.tool.by && <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 30, color: b.muted}}>by {p.tool.by}</div>}
        </div>
      </div></Pop>
      {(p.facts || []).map(([k, v], i) => (
        <Pop key={k} start={4 + i * 3}>
          <div style={{display: 'flex', justifyContent: 'space-between', gap: 30, padding: '24px 28px', borderRadius: 22, background: b.panel,
            fontFamily: SANS, fontSize: 36, border: '1px solid rgba(255,255,255,0.08)'}}>
            <span style={{color: b.muted, fontWeight: 600}}>{k}</span>
            <span style={{color: b.ink, fontWeight: 800, textAlign: 'right'}}>{v}</span>
          </div>
        </Pop>
      ))}
      {p.verdict && <Pop start={6 + (p.facts || []).length * 3}><div style={{fontFamily: SANS, fontWeight: 800, fontSize: 40, color: b.accent, lineHeight: 1.25}}>{p.verdict}</div></Pop>}
    </div>
  </AbsoluteFill>
);

const Cta = ({p, b, L}) => {
  const {frame, still} = useAnim();
  const pulse = still ? 1 : 1 + 0.03 * Math.sin(frame / 4);
  return (
    <AbsoluteFill>
      <Backdrop p={p} b={b} L={L} shot={outcomeShot(p)} />
      <div style={{position: 'absolute', left: L.left, right: W - L.right, top: L.top + (L.H > 1500 ? 160 : 120), display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'flex-start'}}>
        <Pop><div style={{display: 'flex', alignItems: 'center', gap: 22, fontFamily: SANS, fontWeight: 900, fontSize: 70, color: b.ink}}>
          comment
          <span style={{display: 'inline-block', transform: `scale(${pulse})`, background: b.accent, color: b.bg, borderRadius: 18, padding: '8px 26px',
            fontFamily: MONO, fontWeight: 700, letterSpacing: 2}}>{p.cta.keyword}</span>
        </div></Pop>
        <Pop start={5}><div style={{fontFamily: SANS, fontWeight: 600, fontSize: 44, color: b.muted}}>{p.cta.line || "and I'll DM you the link"}</div></Pop>
        {p.cta.send && <Pop start={10}><div style={{fontFamily: SANS, fontWeight: 800, fontSize: 48, color: b.ink, lineHeight: 1.2}}>↗ {p.cta.send}</div></Pop>}
        <Pop start={15}><Chip b={b}>🔖 save this for later</Chip></Pop>
        {p.handle && <Pop start={18}><div style={{fontFamily: SANS, fontWeight: 700, fontSize: 36, color: b.ink}}>{p.handle}</div></Pop>}
      </div>
    </AbsoluteFill>
  );
};

// Quick fade between parts (hard cuts feel abrupt on screen footage).
const Fade = ({frames, first, children}) => {
  const frame = useCurrentFrame();
  const o = first ? 1 : interpolate(frame, [0, 6], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const out = interpolate(frame, [frames - 4, frames], [1, 0.85], clamp);
  return <AbsoluteFill style={{opacity: o * out}}>{children}</AbsoluteFill>;
};

const Part = ({x, p, b, L}) => (
  <>
    {x.kind === 'hook' && <Hook p={p} b={b} frames={x.dur} L={L} />}
    {x.kind === 'beat' && <Beat p={p} b={b} i={x.i} frames={x.dur} L={L} />}
    {x.kind === 'catch' && <Catch p={p} b={b} L={L} />}
    {x.kind === 'cta' && <Cta p={p} b={b} L={L} />}
  </>
);

export const ToolReel = (p) => {
  const {fps, height} = useVideoConfig();
  const b = {...BRAND, ...(p.brand || {})};
  const L = layout(height);
  const {parts} = toolReelPlan(p, fps);
  return (
    <AbsoluteFill style={{background: b.bg}}>
      {parts.map((x, k) => {
        const vo = p.voice?.parts?.[x.key];
        return (
          <Sequence key={k} from={x.from} durationInFrames={x.dur}>
            <Fade frames={x.dur} first={k === 0}><Part x={x} p={p} b={b} L={L} /></Fade>
            {vo && <Sequence from={x.kind === 'hook' ? 2 : 4}><Audio src={staticFile(vo.src)} volume={p.voice.volume ?? 1} /></Sequence>}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Carousel (1080x1350): frame N is slide N: cover, the beats, the catch, the CTA.
export const carouselSlides = (p) => 3 + (p.beats || []).length;
export const ToolCarousel = (p) => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();
  const b = {...BRAND, ...(p.brand || {})};
  const L = layout(height);
  const n = (p.beats || []).length;
  const x = frame === 0 ? {kind: 'hook', dur: 1} : frame <= n ? {kind: 'beat', i: frame - 1, dur: 1} : frame === n + 1 ? {kind: 'catch'} : {kind: 'cta'};
  return (
    <Still.Provider value>
      <AbsoluteFill style={{background: b.bg}}>
        <Part x={x} p={p} b={b} L={L} />
        <div style={{position: 'absolute', right: 40, bottom: 34, fontFamily: SANS, fontWeight: 700, fontSize: 26, color: b.muted}}>
          {frame + 1}/{carouselSlides(p)}{frame === 0 ? '  swipe →' : ''}
        </div>
      </AbsoluteFill>
    </Still.Provider>
  );
};
