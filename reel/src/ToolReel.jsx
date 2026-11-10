// SmallBigTools Reel: one tool, shown working. Built from a tool-reel.json spec.
// Order (research/2026-11-09-smallbigtools-reel-format.md): hook over the demo, 2–3 demo beats,
// the catch (free plan / price / platforms, from the manager-verified research), comment-keyword CTA.
// Footage is either a screen recording ("video") or the official store screenshots ("screens").
// Everything sits inside Instagram's safe area so the app's buttons and caption never cover it.
import React from 'react';
import {
  AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

const {fontFamily: SANS} = loadInter('normal', {weights: ['500', '700', '800', '900'], subsets: ['latin']});
const {fontFamily: MONO} = loadMono('normal', {weights: ['500', '700'], subsets: ['latin']});

// Proposed SmallBigTools look; override any of these with "brand" in the spec.
const BRAND = {bg: '#0B0B0F', panel: '#17171D', ink: '#F5F5F7', muted: '#A1A1AA', accent: '#FFC83D', good: '#4ADE80'};
const SAFE = {top: 230, bottom: 420, left: 72, right: 140};
const W = 1080;
const H = 1920;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const sec = (fps, s) => Math.round(s * fps);

// Timeline: hook, beats, catch, cta. Durations in seconds.
export const toolReelPlan = (p, fps) => {
  const parts = [];
  let t = 0;
  const add = (kind, dur, extra = {}) => { parts.push({kind, from: sec(fps, t), dur: sec(fps, dur), ...extra}); t += dur; };
  add('hook', p.hookDur || 2.2);
  (p.beats || []).forEach((b, i) => add('beat', b.dur || Math.max(2.2, ((b.to ?? 0) - (b.from ?? 0)) / (b.speed || 1)), {i}));
  add('catch', p.catchDur || 3.4);
  add('cta', p.ctaDur || 2.6);
  return {parts, frames: sec(fps, t)};
};
export const toolReelFrames = (p, fps) => toolReelPlan(p, fps).frames;

// "*word*" = accent colour. "\n" = line break. Words pop in one after another.
const Headline = ({text, size = 96, start = 0, b, align = 'left'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let i = 0;
  return (
    <div style={{fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: 1.05, letterSpacing: -2, color: b.ink, textAlign: align}}>
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
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - start, fps, config: {damping: 200}});
  return <div style={{opacity: s, transform: `translateY(${(1 - s) * 24}px)`, ...style}}>{children}</div>;
};

const Chip = ({children, b, solid}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 14, padding: '12px 22px', borderRadius: 999,
    background: solid ? b.accent : 'rgba(255,255,255,0.08)', color: solid ? b.bg : b.ink, fontFamily: SANS, fontWeight: 700,
    fontSize: 32, border: solid ? 'none' : '2px solid rgba(255,255,255,0.14)'}}>{children}</div>
);

// The footage, cropped to "focus" ([x, y, w, h] as fractions of the source) and slowly pushed in.
// Video: plays from "from" seconds at "speed". Screens: shows screenshot number "screen".
const Footage = ({p, beat, frames, boxW, boxH, push = 0.06}) => {
  const frame = useCurrentFrame();
  const m = p.media;
  const [fx, fy, fw, fh] = beat.focus || [0, 0, 1, 1];
  const srcW = m.width || 1920;
  const srcH = m.height || 1080;
  // "cover" (the hook background): fill the box around the focus centre.
  // Otherwise fit the focus area's width to the box, aligned to its top-left, so the
  // left-hand column of a window (file names, menu) is always in view.
  const z = interpolate(frame, [0, frames], [1, 1 + push], clamp);
  let style;
  if (beat.cover) {
    const k = Math.max(boxW / (fw * srcW), boxH / (fh * srcH)) * z;
    style = {left: boxW / 2 - (fx + fw / 2) * srcW * k, top: boxH / 2 - (fy + fh / 2) * srcH * k, width: srcW * k, height: srcH * k};
  } else {
    const k = (boxW / (fw * srcW)) * z;
    style = {left: -fx * srcW * k, top: -fy * srcH * k, width: srcW * k, height: srcH * k};
  }
  style = {position: 'absolute', ...style};
  return (
    <div style={{position: 'relative', width: boxW, height: boxH, overflow: 'hidden', background: '#000'}}>
      {m.type === 'screens'
        ? <Img src={staticFile(m.screens[beat.screen || 0])} style={style} />
        : <OffthreadVideo src={staticFile(m.src)} muted startFrom={Math.round((beat.from || 0) * 30)} playbackRate={beat.speed || 1} style={style} />}
    </div>
  );
};

// A device around the footage: a laptop-style window for desktop and web, a phone for phone apps.
const Device = ({p, beat, frames, b}) => {
  const kind = p.media.frame || 'window';
  const phone = kind === 'phone';
  if (kind === 'card') { // finished store artwork: no device around it, just a rounded card
    return (
      <div style={{borderRadius: 36, overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,0.55)', border: '2px solid rgba(255,255,255,0.10)'}}>
        <Footage p={p} beat={beat} frames={frames} boxW={760} boxH={p.media.boxH || 1040} push={0.04} />
      </div>
    );
  }
  const boxW = phone ? 600 : W - SAFE.left - 60;
  const boxH = phone ? 1080 : (p.media.boxH || 760);
  return (
    <div style={{borderRadius: phone ? 64 : 26, padding: phone ? 18 : 0, background: phone ? '#2A2A30' : b.panel, overflow: 'hidden',
      boxShadow: '0 40px 120px rgba(0,0,0,0.55)', border: `2px solid ${phone ? '#3A3A42' : 'rgba(255,255,255,0.10)'}`}}>
      {!phone && (
        <div style={{display: 'flex', gap: 12, alignItems: 'center', padding: '16px 22px', background: '#202027'}}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{width: 18, height: 18, borderRadius: 9, background: c}} />)}
          <div style={{marginLeft: 16, fontFamily: SANS, fontWeight: 600, fontSize: 26, color: b.muted}}>{p.tool.name}</div>
        </div>
      )}
      <div style={{borderRadius: phone ? 48 : 0, overflow: 'hidden'}}>
        <Footage p={p} beat={beat} frames={frames} boxW={boxW} boxH={boxH} />
      </div>
    </div>
  );
};

const Hook = ({p, b, frames}) => {
  const frame = useCurrentFrame();
  const first = (p.beats || [])[0] || {};
  const dim = interpolate(frame, [0, 10], [0.25, 0.62], clamp);
  return (
    <AbsoluteFill style={{background: b.bg}}>
      <div style={{position: 'absolute', inset: 0, opacity: dim, filter: 'blur(2px) saturate(0.9)'}}>
        <Footage p={p} beat={{...first, focus: first.hookFocus || first.focus, cover: true}} frames={frames} boxW={W} boxH={H} push={0.08} />
      </div>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${b.bg}F2 0%, ${b.bg}99 45%, ${b.bg}E6 100%)`}} />
      <div style={{position: 'absolute', left: SAFE.left, right: SAFE.right, top: SAFE.top + 120, display: 'flex', flexDirection: 'column', gap: 40}}>
        <Pop><Chip b={b}>🧰 {p.tool.name}{p.tool.platforms ? ` · ${p.tool.platforms}` : ''}</Chip></Pop>
        <Headline text={p.hook} size={p.hookSize || 104} start={4} b={b} />
      </div>
    </AbsoluteFill>
  );
};

const Beat = ({p, b, i, frames}) => {
  const beat = p.beats[i];
  const frame = useCurrentFrame();
  const enter = spring({frame, fps: 30, config: {damping: 200}});
  return (
    <AbsoluteFill style={{background: b.bg}}>
      <div style={{position: 'absolute', left: SAFE.left, right: SAFE.right, top: SAFE.top, display: 'flex', gap: 22, alignItems: 'flex-start'}}>
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 44, color: b.bg, background: b.accent, borderRadius: 14, padding: '4px 16px'}}>{i + 1}</div>
        <Headline text={beat.caption} size={60} start={2} b={b} />
      </div>
      <div style={{position: 'absolute', left: p.media.frame === 'phone' ? (W - 636) / 2 : p.media.frame === 'card' ? (W - 764) / 2 - 30 : SAFE.left - 30, top: SAFE.top + 230,
        transform: `translateY(${(1 - enter) * 80}px) scale(${0.96 + 0.04 * enter})`, opacity: enter}}>
        <Device p={p} beat={beat} frames={frames} b={b} />
      </div>
      {p.credit && <div style={{position: 'absolute', left: SAFE.left, bottom: SAFE.bottom - 70, fontFamily: SANS, fontSize: 24, color: b.muted}}>{p.credit}</div>}
    </AbsoluteFill>
  );
};

const Catch = ({p, b}) => (
  <AbsoluteFill style={{background: b.bg}}>
    <div style={{position: 'absolute', left: SAFE.left, right: SAFE.right, top: SAFE.top + 40, display: 'flex', flexDirection: 'column', gap: 34}}>
      <Pop><div style={{display: 'flex', alignItems: 'center', gap: 26}}>
        {p.tool.icon && <Img src={staticFile(p.tool.icon)} style={{width: 120, height: 120, borderRadius: 28}} />}
        <div>
          <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 76, color: b.ink, letterSpacing: -1}}>{p.tool.name}</div>
          {p.tool.by && <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 32, color: b.muted}}>by {p.tool.by}</div>}
        </div>
      </div></Pop>
      <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 10}}>
        {(p.facts || []).map(([k, v], i) => (
          <Pop key={k} start={8 + i * 5}>
            <div style={{display: 'flex', justifyContent: 'space-between', gap: 30, padding: '26px 30px', borderRadius: 22, background: b.panel,
              fontFamily: SANS, fontSize: 38}}>
              <span style={{color: b.muted, fontWeight: 600}}>{k}</span>
              <span style={{color: b.ink, fontWeight: 800, textAlign: 'right'}}>{v}</span>
            </div>
          </Pop>
        ))}
      </div>
      {p.verdict && <Pop start={10 + (p.facts || []).length * 5}><div style={{fontFamily: SANS, fontWeight: 700, fontSize: 40, color: b.accent, lineHeight: 1.25}}>{p.verdict}</div></Pop>}
    </div>
  </AbsoluteFill>
);

const Cta = ({p, b}) => {
  const frame = useCurrentFrame();
  const pulse = 1 + 0.03 * Math.sin(frame / 4);
  return (
    <AbsoluteFill style={{background: b.bg}}>
      <div style={{position: 'absolute', left: SAFE.left, right: SAFE.right, top: SAFE.top + 220, display: 'flex', flexDirection: 'column', gap: 44, alignItems: 'flex-start'}}>
        <Headline text={'want the link?'} size={92} b={b} />
        <Pop start={8}><div style={{display: 'flex', alignItems: 'center', gap: 22, fontFamily: SANS, fontWeight: 800, fontSize: 54, color: b.ink}}>
          comment
          <span style={{display: 'inline-block', transform: `scale(${pulse})`, background: b.accent, color: b.bg, borderRadius: 18, padding: '10px 26px',
            fontFamily: MONO, fontWeight: 700, letterSpacing: 2}}>{p.cta.keyword}</span>
        </div></Pop>
        <Pop start={14}><div style={{fontFamily: SANS, fontWeight: 600, fontSize: 44, color: b.muted}}>{p.cta.line || "and I'll DM it to you"}</div></Pop>
        <Pop start={22}><Chip b={b}>🔖 save this for later</Chip></Pop>
        {p.handle && <Pop start={28}><div style={{fontFamily: SANS, fontWeight: 700, fontSize: 36, color: b.ink}}>{p.handle}</div></Pop>}
      </div>
    </AbsoluteFill>
  );
};

export const ToolReel = (p) => {
  const {fps} = useVideoConfig();
  const b = {...BRAND, ...(p.brand || {})};
  const {parts} = toolReelPlan(p, fps);
  return (
    <AbsoluteFill style={{background: b.bg}}>
      {parts.map((x, k) => (
        <Sequence key={k} from={x.from} durationInFrames={x.dur}>
          <Fade frames={x.dur} first={k === 0}>
            {x.kind === 'hook' && <Hook p={p} b={b} frames={x.dur} />}
            {x.kind === 'beat' && <Beat p={p} b={b} i={x.i} frames={x.dur} />}
            {x.kind === 'catch' && <Catch p={p} b={b} />}
            {x.kind === 'cta' && <Cta p={p} b={b} />}
          </Fade>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// Quick fade between parts (cuts feel abrupt on screen footage).
const Fade = ({frames, first, children}) => {
  const frame = useCurrentFrame();
  const o = first ? 1 : interpolate(frame, [0, 6], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const out = interpolate(frame, [frames - 4, frames], [1, 0.85], clamp);
  return <AbsoluteFill style={{opacity: o * out}}>{children}</AbsoluteFill>;
};
