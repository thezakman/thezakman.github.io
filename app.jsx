const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* =========================================================
   TZM-OS — CRT terminal landing page
   ========================================================= */

/* Every social is a symlink out of /home/tzm — which is what they
   literally are. `kb` is the weight of me on the other end. */
const SOCIALS = [
  { glyph: '@', name: 'upwork',     handle: '~freelancer',    url: 'https://www.upwork.com/freelancers/~013c497232fa2ab3ad',   kb: '256',  mtime: 'Nov 12  2021' },
  { glyph: '✦', name: 'portfolio',  handle: 'tzm.ink',        url: 'https://tzm.ink/',                                         kb: '4.2K', mtime: 'Feb 28  2024' },
  { glyph: '#', name: 'github',     handle: '@thezakman',     url: 'https://github.com/thezakman',                             kb: '92K',  mtime: 'Jul 14 23:41' },
  { glyph: 'S', name: 'substack',   handle: '@thezakman',     url: 'https://thezakman.substack.com/',                          kb: '1.7K', mtime: 'Jan 09  2025' },
  { glyph: '○', name: 'instagram',  handle: '@thezakman',     url: 'https://www.instagram.com/thezakman',                      kb: '3.1K', mtime: 'Jun 30 18:02' },
  { glyph: 'X', name: 'twitter',    handle: '@thezakman',     url: 'https://twitter.com/thezakman',                            kb: '8.0K', mtime: 'Mar 02  2023' },
  { glyph: '♫', name: 'soundcloud', handle: '/thezakman',     url: 'https://soundcloud.com/thezakman',                         kb: '12M',  mtime: 'Aug 17  2016' },
  { glyph: 'R', name: 'reddit',     handle: 'u/thezakman87',  url: 'https://www.reddit.com/user/thezakman87/',                 kb: '666',  mtime: 'Oct 31  2019' },
  { glyph: '▶', name: 'steam',      handle: 'thezakman87',    url: 'http://steamcommunity.com/id/thezakman87',                 kb: '888K', mtime: 'Dec 24  2022' },
];

const CMDS = ['about', 'social', 'donate', 'contact', 'neofetch', 'matrix', 'demo', 'date', 'clear'];

/* The function-key strip every DOS-era file manager ended with. The digit
   is real: F1-F9 fire it, and so does Alt+digit, since macOS eats bare
   F-keys unless you've turned that off. */
const FKEYS = CMDS.map((cmd, i) => ({ n: i + 1, cmd }));

/* What `help` prints. Includes the commands the strip has no room for —
   otherwise degauss, sound and the ls flags are only findable by tabbing
   blindly. */
const HELP = [
  ['about',      'who you are talking to'],
  ['social',     'where else I exist'],
  ['ls -la',     'the same, as symlinks'],
  ['donate',     'buy me a beer'],
  ['contact',    'how to reach me'],
  ['neofetch',   'system summary'],
  ['matrix',     'you already know'],
  ['demo',       'a random procedural effect'],
  ['date',       'the clock on my desk'],
  ['degauss',    'fire the coil'],
  ['sound',      'let the flyback sing'],
  ['clear',      'wipe the phosphor'],
  ['exit',       'cut the signal'],
];

/* Everything tab-completable, including what the button bar doesn't show. */
const COMPLETIONS = [
  'about', 'beer', 'cats', 'clear', 'contact', 'date', 'degauss', 'demo',
  'donate', 'exit', 'fx', 'hardware', 'help', 'irc', 'ls', 'ls -la', 'matrix',
  'mute', 'neofetch', 'poweroff', 'shutdown', 'social', 'sound', 'specs',
  'unmute', 'whoami',
];

/* ==================== helpers ==================== */

/* This box sits on a desk in Rio, and a terminal reads its own clock — not
   the visitor's, and not UTC. `contact` already says the machine is at
   UTC-3/America/Sao_Paulo; the status bar just wasn't listening.
   Resolved through Intl so it stays right from any visitor's timezone, and
   the offset is read back rather than hardcoded — Brazil dropped DST in
   2019 but has flip-flopped on that before. */
const TZ = 'America/Sao_Paulo';

const timeFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'shortOffset',
});

function nowStr() {
  const p = timeFmt.formatToParts(new Date())
    .reduce((a, x) => (a[x.type] = x.value, a), {});
  const off = (p.timeZoneName || 'GMT-3').replace('GMT', 'UTC');
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} ${off}`;
}

function uptimeSince(start) {
  const s = Math.floor((Date.now() - start) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

/* '#3fffa1' + 0.35 -> '#3fffa159' */
function withA(hex, a) {
  const n = Math.round(Math.max(0, Math.min(1, a)) * 255);
  return hex + n.toString(16).padStart(2, '0');
}

/* Phosphor bloom, built from stacked text-shadows.
   text-shadow paints *behind* the glyph, so the halo can be as wide as we
   like and the character stays razor sharp. A blur filter over the top of
   the text would veil it instead — bloom lights the area around a source,
   it never fogs the source. */
function phosphorShadow(glow, bloom, converge, color) {
  const layers = [];

  /* Misconvergence: the three guns never land on exactly the same spot, so
     each stroke carries a red edge on one side and a blue one on the other.
     Done as zero-blur shadows, which sit behind the glyph — displacing the
     real channels would mean running the text through a filter, and that
     resamples it. Earliest shadow paints on top, so fringes go first. */
  if (converge > 0) {
    layers.push(`${(-converge).toFixed(2)}px 0 0 rgba(255, 42, 42, 0.4)`);
    layers.push(`${converge.toFixed(2)}px 0 0 rgba(60, 90, 255, 0.34)`);
  }

  layers.push(`0 0 ${(1.5 * glow).toFixed(1)}px ${withA(color, 0.9)}`);
  layers.push(`0 0 ${(4 * glow).toFixed(1)}px ${withA(color, 0.5)}`);

  if (bloom > 0) {
    layers.push(`0 0 ${(12 * glow).toFixed(1)}px ${withA(color, 0.34 * bloom)}`);
    layers.push(`0 0 ${(26 * glow).toFixed(1)}px ${withA(color, 0.2 * bloom)}`);
  }
  return layers.join(', ');
}

/* Where the phosphor gave up.
   Most tubes are fine, so most sessions roll no damage at all — a speck
   every visitor sees is decoration, one you only sometimes catch is a
   find. When a tube does come up damaged it always gets one stuck-on
   speck, because the dark ones only announce themselves when text runs
   under them and a purely dark roll would read as nothing. */
function rollDeadPixels(chance) {
  if (Math.random() >= chance) return [];

  const speck = (stuck) => ({
    x: 5 + Math.random() * 90,
    y: 8 + Math.random() * 84,
    stuck,
    size: Math.random() < 0.25 ? 3 : 2,
  });

  const px = [speck(true)];
  const dark = Math.floor(Math.random() * 3); // plus 0–2 dead ones
  for (let i = 0; i < dark; i++) px.push(speck(false));
  return px;
}

/* Held in a ref rather than state: the tube's damage must not move while
   you're using the terminal, but it should re-roll if the odds change. */
function DeadPixels({ chance }) {
  const cache = useRef({ chance: null, px: [] });
  if (cache.current.chance !== chance) {
    cache.current = { chance, px: rollDeadPixels(chance) };
  }
  if (cache.current.px.length === 0) return null;
  return (
    <div className="deadpix">
      {cache.current.px.map((p, i) => (
        <span
          key={i}
          className={`px ${p.stuck ? 'stuck' : 'dead'}`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
        />
      ))}
    </div>
  );
}

function rndHex(len = 8) {
  const c = '0123456789ABCDEF';
  let s = '';
  for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * 16)];
  return s;
}

/* ==================== the glass has a front and a back ====================
   A reflection that never moves is just a light patch painted on the
   phosphor. What sells glass as a physical surface sitting in front of the
   picture is parallax: the room slides across it as you shift, while the
   image underneath stays put. The pointer stands in for where your head is.

   Written straight to CSS custom properties on rAF rather than through
   React state, because this fires on every mouse move and has no business
   re-rendering the terminal to move a highlight. */
function useViewerParallax(ref, enabled) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    /* a pointer is a head; a finger is not — and coarse pointers have no
       hover position to track anyway */
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (prefersReducedMotion()) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;   // -1..1
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); };

    const tick = () => {
      /* ease toward the pointer: glass doesn't snap, and raw mouse deltas
         read as jitter on something this subtle */
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty('--vx', cx.toFixed(4));
      el.style.setProperty('--vy', cy.toFixed(4));
      raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001)
        ? requestAnimationFrame(tick) : 0;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [ref, enabled]);
}

/* The CSS @media rule can't reach an animation driven by requestAnimationFrame,
   and matrix and demo are by far the most motion-heavy things here — the two
   that most need to hold still. They render one frame and stop instead of
   rendering nothing: the effect is still there to look at, it just doesn't
   move. */
function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ==================== the noise a tube makes ====================
   A powered CRT is never silent: the flyback transformer sings at the
   horizontal scan rate (15.734kHz on NTSC — which is the joke, since
   most adults have lost the top of their hearing and won't catch it),
   the mains hums underneath, and the degauss coil goes wooomp.

   All of it hangs off the power state, so the whine dies with the tube.
   Off by default and only ever built from a real click: nobody's landing
   page gets to make noise uninvited. */

function useCrtSound(enabled, volume) {
  const rig = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);

    const tone = (type, freq, gain) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(master);
      osc.start();
      return { osc, gain: g, level: gain };
    };

    /* Sine, not triangle: every harmonic of a 15.734kHz wave lands above
       the Nyquist limit of any real output device, so the band-limited
       oscillator strips them and hands back a sine anyway — just 19%
       quieter (8/π²). At this frequency a sine is the only thing that
       physically survives sampling. */
    const whine = tone('sine', 15734, 0.02);  // flyback
    const hum   = tone('sine', 60, 0.008);    // mains

    rig.current = { ctx, master, whine, hum };
    return () => {
      try { whine.osc.stop(); hum.osc.stop(); ctx.close(); } catch (e) { /* already gone */ }
      rig.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    const a = rig.current;
    if (a) a.master.gain.value = volume;
  }, [volume, enabled]);

  /* the tube stops singing when it stops scanning */
  const setPowered = useCallback((on) => {
    const a = rig.current;
    if (!a) return;
    a.ctx.resume();
    const t = a.ctx.currentTime;
    for (const v of [a.whine, a.hum]) {
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setValueAtTime(v.gain.gain.value, t);
      v.gain.gain.linearRampToValueAtTime(on ? v.level : 0, t + (on ? 0.5 : 0.12));
    }
  }, []);

  /* the coil: mains frequency, wobbled and decaying, with a relay clack */
  const degaussSound = useCallback(() => {
    const a = rig.current;
    if (!a) return;
    const { ctx, master } = a;
    a.ctx.resume();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(62, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 1.1);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 6.5;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 12;
    lfo.connect(lfoDepth);
    lfoDepth.connect(osc.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);

    osc.connect(g);
    g.connect(master);
    osc.start(t); osc.stop(t + 1.2);
    lfo.start(t); lfo.stop(t + 1.2);
  }, []);

  /* the static crack of the raster snapping to a point */
  const powerOffSound = useCallback(() => {
    const a = rig.current;
    if (!a) return;
    const { ctx, master } = a;
    a.ctx.resume();
    const t = ctx.currentTime;

    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.value = 0.35;

    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(t);
  }, []);

  /* the clack of the switch and the flyback spinning up to pitch */
  const powerOnSound = useCallback(() => {
    const a = rig.current;
    if (!a) return;
    const { ctx, master } = a;
    a.ctx.resume();
    const t = ctx.currentTime;

    const clack = ctx.createOscillator();
    clack.type = 'square';
    clack.frequency.setValueAtTime(180, t);
    clack.frequency.exponentialRampToValueAtTime(60, t + 0.07);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.28, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    clack.connect(cg); cg.connect(master);
    clack.start(t); clack.stop(t + 0.1);

    /* the horizontal oscillator sliding up to lock */
    const sweep = ctx.createOscillator();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(4000, t + 0.05);
    sweep.frequency.exponentialRampToValueAtTime(15734, t + 0.7);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t + 0.05);
    sg.gain.exponentialRampToValueAtTime(0.03, t + 0.2);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    sweep.connect(sg); sg.connect(master);
    sweep.start(t + 0.05); sweep.stop(t + 0.8);
  }, []);

  return { setPowered, degaussSound, powerOffSound, powerOnSound };
}

/* ==================== type-on hook ==================== */

function useTypeOn(text, speed = 8, start = true) {
  const [out, setOut] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!start) return;
    setOut(''); setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i += Math.max(1, Math.floor(Math.random() * 3));
      if (i >= text.length) { setOut(text); setDone(true); clearInterval(id); }
      else setOut(text.slice(0, i));
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, start]);
  return [out, done];
}

/* ==================== components ==================== */

function PhosphorImage({ src, alt, className }) {
  return (
    <div
      className={`phosphor-img ${className || ''}`}
      style={{ '--img': `url(${src})` }}
      role="img"
      aria-label={alt}
    >
      <img src={src} alt={alt} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
    </div>
  );
}

function FullPrompt({ cmd }) {
  return (
    <div className="line">
      <span className="ps1"><span className="ps1-user">tzm</span><span className="ps1-at">@</span><span className="ps1-host">cyberspace</span><span className="ps1-colon">:</span><span className="ps1-path">~</span><span className="ps1-dollar">$</span></span>
      <span className="ps1-cmd"> {cmd}</span>
    </div>
  );
}

function BootLine({ text, ok = true, delay = 0, onDone }) {
  const [show, setShow] = useState(false);
  const [typed, done] = useTypeOn(text, 3, show);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  useEffect(() => { if (done && onDone) onDone(); }, [done]);
  if (!show) return null;
  return (
    <div className="line boot">
      <span className="dim">[</span>
      <span className={ok ? 'ok' : 'warn'}>{ok ? '  OK  ' : ' WARN '}</span>
      <span className="dim">]</span>
      <span> {typed}</span>
      {done && ok && <span className="trail dim"> ✓</span>}
    </div>
  );
}

function FKeyBar({ onRun }) {
  return (
    <div className="fkeys">
      {FKEYS.map((f) => (
        <button
          key={f.n}
          className="fkey"
          onClick={() => onRun(f.cmd)}
          title={`F${f.n} — ${f.cmd}`}
        >
          <span className="fk-n">{f.n}</span>
          <span className="fk-label">{f.cmd}</span>
        </button>
      ))}
    </div>
  );
}

function SocialRow({ s }) {
  return (
    <a className="socrow" href={s.url} target="_blank" rel="noopener noreferrer">
      <span className="glyph">[{s.glyph}]</span>
      <span className="name">{s.name}</span>
      <span className="handle">{s.handle}</span>
    </a>
  );
}

function LsRow({ s }) {
  return (
    <a className="lsrow" href={s.url} target="_blank" rel="noopener noreferrer">
      <span className="perm">lrwxrwxrwx</span>
      <span className="dim">1</span>
      <span className="dim">tzm</span>
      <span className="dim">tzm</span>
      <span className="size">{s.kb}</span>
      <span className="mtime">{s.mtime}</span>
      <span className="name">{s.name}</span>
      <span className="arrow">{'->'}</span>
      <span className="target">{s.url}</span>
    </a>
  );
}

function LsBlock() {
  return (
    <div className="out ls">
      <div className="dim">total 108</div>
      <div className="lsrow static">
        <span className="perm">drwxr-xr-x</span>
        <span className="dim">2</span><span className="dim">tzm</span><span className="dim">tzm</span>
        <span className="size">4.0K</span><span className="mtime">Jul 15 04:55</span>
        <span className="name">.</span><span /><span />
      </div>
      <div className="lsrow static">
        <span className="perm">drwxr-xr-x</span>
        <span className="dim">18</span><span className="dim">root</span><span className="dim">root</span>
        <span className="size">4.0K</span><span className="mtime">Jan  1  1987</span>
        <span className="name">..</span><span /><span />
      </div>
      {SOCIALS.map((s) => <LsRow key={s.name} s={s} />)}
    </div>
  );
}

const SPECS = [
  ['os',         'tzm-os (cyberspace)'],
  ['host',       'thezakman.github.io'],
  ['kernel',     '1.3.37-vt-glow'],
  ['shell',      'tzm-sh 1.0'],
  ['resolution', '1024 × 768 (CRT)'],
  ['de',         'phosphor + scanlines'],
  ['cpu',        'heart × 1 @ 60bpm'],
  ['gpu',        'caffeine + cold beer'],
  ['memory',     '17527 cat photos / ∞'],
  ['uptime',     'since 1987'],
];

/* Real neofetch signs off with the terminal's 16 ANSI swatches. A tube
   with one phosphor has no palette to show — what it has is intensity,
   so the ramp is the honest translation. */
const RAMP = [0.12, 0.24, 0.36, 0.5, 0.64, 0.78, 0.9, 1];

function NeofetchBlock() {
  return (
    <div className="out neofetch">
      <PhosphorImage src="tzm.png" alt="tzm" className="neofetch-logo" />
      <div className="specs">
        <div className="specs-hd">
          <span className="ps1-user">tzm</span>
          <span className="ps1-at">@</span>
          <span className="ps1-host">cyberspace</span>
        </div>
        <div className="specs-rule" />
        <dl className="specs-list">
          {SPECS.map(([k, val]) => (
            <React.Fragment key={k}>
              <dt>{k}</dt>
              <dd>{val}</dd>
            </React.Fragment>
          ))}
        </dl>
        <div className="ramp" aria-hidden="true">
          {RAMP.map((a) => (
            <span key={a} style={{ background: `color-mix(in oklab, var(--fg) ${a * 100}%, var(--bg))` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==================== status bar ==================== */

function StatusBar({ bootStart, phosphor }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  const sysid = useMemo(() => `0x${rndHex(8)}`, []);
  const load = useMemo(() => (0.3 + Math.sin(tick / 7) * 0.25 + Math.random() * 0.1).toFixed(2), [tick]);
  return (
    <div className="statusbar">
      <span className="seg"><span className="dim">SYS</span> TZM-OS</span>
      <span className="seg hide-mobile"><span className="dim">PID</span> {sysid}</span>
      <span className="seg hide-mobile"><span className="dim">PHOSPHOR</span> {phosphor.toUpperCase()}</span>
      <span className="seg"><span className="dim">LOAD</span> {load}</span>
      <span className="seg"><span className="dim">UP</span> {uptimeSince(bootStart)}</span>
      <span className="seg right"><span className="dim">{'▮'}</span> {nowStr()}</span>
    </div>
  );
}

/* ==================== matrix rain ==================== */

/* Every column runs its own speed, trail length and reset odds — a single
   shared cadence is what made the old one read as a screensaver. The head
   glyph burns near-white and the trail decays behind it, glyphs mutate in
   place, and the whole thing takes its colour from the live phosphor. */
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホミムメモヤユヨラリルレロワヲン0123456789THEZAKMAN:."=*+-<>¦'.split('');

function MatrixRain() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const CELL = 14, FONT = 15;
    let w = 0, h = 0, cols = [];

    const phosphor = getComputedStyle(canvas);
    const fg = phosphor.color;
    const bg = phosphor.backgroundColor;

    const rgb = fg.match(/[\d.]+/g).map(Number);
    const shade = (a) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
    /* the leading glyph is hotter than the phosphor can render — that's
       what makes it read as a strike rather than a bright letter */
    const head = `rgb(${Math.min(255, rgb[0] + 150)}, ${Math.min(255, rgb[1] + 90)}, ${Math.min(255, rgb[2] + 150)})`;

    const layout = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      const n = Math.ceil(w / CELL);
      cols = Array.from({ length: n }, () => ({
        y: Math.random() * -40,
        speed: 0.35 + Math.random() * 0.85,
        len: 8 + Math.floor(Math.random() * 22),
        chars: [],
      }));
    };
    layout();

    let raf = 0, last = 0, running = true, repaint = null;
    /* rain that won't stop is exactly what reduced-motion is asking about:
       run it far enough that the columns have real trails, then freeze */
    const still = prefersReducedMotion();

    /* layout() wipes the canvas, so a frozen frame would be resized to blank
       and never come back — re-run the pre-roll instead */
    const ro = new ResizeObserver(() => { layout(); if (repaint) repaint(); });
    ro.observe(canvas);

    const draw = (now) => {
      if (!running) return;
      const dt = Math.min(50, now - (last || now));
      last = now;

      /* fade rather than clear: the trails are phosphor decay */
      ctx.fillStyle = bg.replace(/rgba?\(([^)]+)\)/, (m, p) => {
        const c = p.split(',').map(s => parseFloat(s));
        return `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.10)`;
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${FONT}px VT323, monospace`;
      ctx.textBaseline = 'top';

      const step = dt / 16.67;
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        const prev = Math.floor(c.y);
        c.y += c.speed * step;
        const row = Math.floor(c.y);

        if (row !== prev) {
          c.chars.unshift(GLYPHS[(Math.random() * GLYPHS.length) | 0]);
          if (c.chars.length > c.len) c.chars.length = c.len;
        }
        /* a glyph already on screen sometimes flips to another */
        if (c.chars.length && Math.random() < 0.06) {
          c.chars[(Math.random() * c.chars.length) | 0] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }

        for (let j = 0; j < c.chars.length; j++) {
          const y = (row - j) * CELL;
          if (y < -CELL || y > h) continue;
          if (j === 0) {
            ctx.fillStyle = head;
            ctx.shadowColor = fg;
            ctx.shadowBlur = 8;
          } else {
            ctx.fillStyle = shade(Math.max(0, 1 - j / c.len) * 0.85);
            ctx.shadowBlur = 0;
          }
          ctx.fillText(c.chars[j], i * CELL, y);
        }
        ctx.shadowBlur = 0;

        if ((row - c.chars.length) * CELL > h && Math.random() < 0.03) {
          c.y = -Math.random() * 20;
          c.speed = 0.35 + Math.random() * 0.85;
          c.len = 8 + Math.floor(Math.random() * 22);
          c.chars = [];
        }
      }
      if (still) { running = false; raf = 0; return; }
      raf = requestAnimationFrame(draw);
    };

    if (still) {
      repaint = () => {
        let clock = 0;
        for (let i = 0; i < 120; i++) { running = true; last = clock; draw(clock += 33); }
        running = false;
      };
      repaint();
      return () => { ro.disconnect(); };
    }

    /* scroll it out of the tube and it stops costing frames */
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !raf) { running = true; last = 0; raf = requestAnimationFrame(draw); }
      else if (!e.isIntersecting && raf) { running = false; cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0.01 });
    io.observe(canvas);

    return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, []);

  return <canvas className="matrix" ref={ref} aria-label="matrix rain" />;
}

/* ==================== procedural demos ====================
   Drawn as text rather than to a canvas, so every effect inherits the
   phosphor glow, the scanlines and the tube's curvature instead of sitting
   on top of them as a pasted rectangle.

   Contract: make(W, H) -> (t, dt) => string. A factory, not a pure
   function, because the good effects have memory — fire propagates a
   buffer, Life needs last generation, an attractor needs where it was.
   Field effects that really are f(x,y,t) get wrapped by field() below.

   The families are deliberately far apart. Seven flavours of sine field
   still reads as one effect with the knobs moved, however random the pick
   is: cellular automata, combustion, particles, 3D and escape-time
   fractals are what actually make it feel like a different program ran. */

const ASCII_RAMP = ' .:-=+*#%@';

const shade = (v) => ASCII_RAMP[v <= 0 ? 0 : v >= 1 ? 9 : (v * 10) | 0];

/* Demoscene coordinates: y spans -0.5..0.5, and x spans -hw..hw where hw
   is the half-width in those same units, so nothing comes out an ellipse.
   Effects get hw because the tube is wide and its exact width depends on
   the viewport — anything placing its features at fixed offsets either
   huddles in the middle of the screen or walks straight off the edge. */
function field(fn) {
  return (W, H) => {
    const hw = W / (H * 4);
    return (t) => {
      let out = '';
      for (let j = 0; j < H; j++) {
        const y = j / (H - 1) - 0.5;
        for (let i = 0; i < W; i++) {
          out += shade(fn((i / (W - 1) - 0.5) * hw * 2, y, t, hw));
        }
        out += '\n';
      }
      return out;
    };
  };
}

/* ---- fire: the demoscene's oldest party trick. Seed the row below the
   screen white-hot, pull each cell from the one under it with a random
   sideways drift, subtract a little on the way up. ---- */
function fireDemo(W, H) {
  const h = H + 1;
  const buf = new Float32Array(W * h);
  return () => {
    for (let i = 0; i < W; i++) buf[(h - 1) * W + i] = Math.random() < 0.88 ? 1 : 0.35;
    for (let j = 0; j < h - 1; j++) {
      for (let i = 0; i < W; i++) {
        const drift = ((Math.random() * 3) | 0) - 1;
        const si = Math.min(W - 1, Math.max(0, i + drift));
        const v = buf[(j + 1) * W + si] - Math.random() * 0.11;
        buf[j * W + i] = v > 0 ? v : 0;
      }
    }
    let out = '';
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) out += shade(buf[j * W + i]);
      out += '\n';
    }
    return out;
  };
}

/* ---- Conway. Reseeds when it stalls, which it always does — a still life
   sitting there for the rest of the session is not an effect. ---- */
function lifeDemo(W, H) {
  const N = W * H;
  let a = new Uint8Array(N), b = new Uint8Array(N);
  let acc = 0, gen = 0, lastPop = -1, stale = 0;
  const seed = () => {
    for (let i = 0; i < N; i++) a[i] = Math.random() < 0.28 ? 1 : 0;
    gen = 0; stale = 0; lastPop = -1;
  };
  seed();
  const step = () => {
    let pop = 0;
    for (let j = 0; j < H; j++) {
      const up = ((j - 1 + H) % H) * W, mid = j * W, dn = ((j + 1) % H) * W;
      for (let i = 0; i < W; i++) {
        const l = (i - 1 + W) % W, r = (i + 1) % W;
        const n = a[up + l] + a[up + i] + a[up + r]
                + a[mid + l] + a[mid + r]
                + a[dn + l] + a[dn + i] + a[dn + r];
        const alive = a[mid + i] ? (n === 2 || n === 3) : (n === 3);
        b[mid + i] = alive ? 1 : 0;
        pop += alive ? 1 : 0;
      }
    }
    const tmp = a; a = b; b = tmp;
    gen++;
    if (pop === lastPop) stale++; else stale = 0;
    lastPop = pop;
    if (stale > 40 || pop < N * 0.01 || gen > 900) seed();
  };
  return (t, dt) => {
    acc += dt;
    while (acc > 85) { step(); acc -= 85; }
    let out = '';
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) out += a[j * W + i] ? '#' : ' ';
      out += '\n';
    }
    return out;
  };
}

/* ---- elementary cellular automata, scrolling up. Rule 30 is Wolfram's
   noise generator, 90 is Sierpinski, 110 is Turing complete. ---- */
function caDemo(rule, seedRandom) {
  return (W, H) => {
    const rows = [];
    const first = new Uint8Array(W);
    if (seedRandom) for (let i = 0; i < W; i++) first[i] = Math.random() < 0.5 ? 1 : 0;
    else first[W >> 1] = 1;
    rows.push(first);
    let acc = 0;
    const next = () => {
      const p = rows[rows.length - 1];
      const n = new Uint8Array(W);
      for (let i = 0; i < W; i++) {
        const idx = (p[(i - 1 + W) % W] << 2) | (p[i] << 1) | p[(i + 1) % W];
        n[i] = (rule >> idx) & 1;
      }
      rows.push(n);
      if (rows.length > H) rows.shift();
    };
    /* A single seed grows one cell per side per generation, so on a wide
       tube it spends its first several seconds as a small triangle adrift
       in the middle. Pre-roll enough generations for the pattern to reach
       both edges before anyone sees it. */
    if (!seedRandom) for (let i = 0; i < W; i++) next();
    return (t, dt) => {
      acc += dt;
      while (acc > 55) { next(); acc -= 55; }
      const pad = H - rows.length;
      let out = '';
      for (let j = 0; j < H; j++) {
        const r = j >= pad ? rows[j - pad] : null;
        for (let i = 0; i < W; i++) out += (r && r[i]) ? '#' : ' ';
        out += '\n';
      }
      return out;
    };
  };
}

/* ---- 10 PRINT CHR$(205.5+RND(1)); 20 GOTO 10 ---- */
function tenPrintDemo(W, H) {
  const rows = [];
  const row = () => {
    let s = '';
    for (let i = 0; i < W; i++) s += Math.random() < 0.5 ? '/' : '\\';
    return s;
  };
  for (let j = 0; j < H; j++) rows.push(row());
  let acc = 0;
  return (t, dt) => {
    acc += dt;
    while (acc > 110) { rows.push(row()); rows.shift(); acc -= 110; }
    return rows.join('\n') + '\n';
  };
}

/* ---- a wireframe cube, because a tube this old deserves one ---- */
function cubeDemo(W, H) {
  const V = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  const E = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const scale = H * 0.36;
  /* A cube is square, so one of them fills the height and leaves most of a
     21:9 tube empty. Three, out of phase, is what a demo would have done
     with the room. */
  const N = Math.max(1, Math.min(3, Math.round(W / (scale * 5))));
  return (t) => {
    const g = new Uint8Array(W * H);
    const plot = (x, y) => {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi >= 0 && xi < W && yi >= 0 && yi < H) g[yi * W + xi] = 1;
    };
    for (let c = 0; c < N; c++) {
      const cx = W * (c + 0.5) / N;
      const a = t * 0.7 + c * 1.1, b = t * 0.47 + c * 0.6;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const p = V.map(([x, y, z]) => {
        const X = x * ca - z * sa;
        let Z = x * sa + z * ca;
        const Y = y * cb - Z * sb;
        Z = y * sb + Z * cb;
        const d = 3.6 / (Z + 4.2);
        /* x gets twice the scale: char cells are half as wide as they're tall */
        return [cx + X * d * scale * 2, H / 2 + Y * d * scale];
      });
      for (const [i, j] of E) {
        const [x0, y0] = p[i], [x1, y1] = p[j];
        const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0) * 2)) || 1;
        const dx = (x1 - x0) / steps, dy = (y1 - y0) / steps;
        for (let s = 0; s <= steps; s++) plot(x0 + dx * s, y0 + dy * s);
      }
    }
    let out = '';
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) out += g[j * W + i] ? '#' : ' ';
      out += '\n';
    }
    return out;
  };
}

/* ---- actual particles this time. The per-pixel attempt at this hashed
   the angle into lanes and came out as scattered noise. ---- */
function starDemo(W, H) {
  const N = Math.max(60, ((W * H) / 7) | 0);
  const s = Array.from({ length: N }, () => ({
    x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 0.98 + 0.02,
  }));
  return (t, dt) => {
    const g = new Array(W * H).fill(' ');
    const step = Math.min(60, dt) * 0.00042;
    for (const p of s) {
      p.z -= step;
      if (p.z <= 0.02) { p.x = Math.random() * 2 - 1; p.y = Math.random() * 2 - 1; p.z = 1; }
      const k = 0.42 / p.z;
      const xi = Math.round(W / 2 + p.x * k * H * 2);
      const yi = Math.round(H / 2 + p.y * k * H);
      if (xi < 0 || xi >= W || yi < 0 || yi >= H) continue;
      g[yi * W + xi] = shade(Math.min(1, (1 - p.z) * 1.2) * 0.95 + 0.05);
    }
    let out = '';
    for (let j = 0; j < H; j++) { out += g.slice(j * W, j * W + W).join(''); out += '\n'; }
    return out;
  };
}

/* ---- Lorenz. The trail decays like phosphor, which is the whole point of
   drawing it here. ---- */
function lorenzDemo(W, H) {
  let x = 0.1, y = 0, z = 0;
  const trail = new Float32Array(W * H);
  return (t, dt) => {
    for (let i = 0; i < trail.length; i++) trail[i] *= 0.982;
    const n = Math.min(180, Math.max(20, (dt * 4) | 0));
    for (let s = 0; s < n; s++) {
      const h = 0.005;
      const dx = 10 * (y - x), dy = x * (28 - z) - y, dz = x * y - (8 / 3) * z;
      x += dx * h; y += dy * h; z += dz * h;
      const xi = Math.round(W / 2 + x * (W / 62));
      const yi = Math.round(H - 1 - z * (H / 52));
      if (xi >= 0 && xi < W && yi >= 0 && yi < H) trail[yi * W + xi] = 1;
    }
    let out = '';
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) out += shade(trail[j * W + i]);
      out += '\n';
    }
    return out;
  };
}

/* ---- Langton's ant: two rules, and it builds a highway out of chaos after
   about ten thousand steps. Worth the wait. ---- */
function antDemo(W, H) {
  const g = new Uint8Array(W * H);
  let x = W >> 1, y = H >> 1, dir = 0;   // 0=up 1=right 2=down 3=left
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  let acc = 0;
  return (t, dt) => {
    acc += dt;
    const steps = Math.min(900, Math.max(30, (acc * 2.2) | 0));
    acc = 0;
    for (let s = 0; s < steps; s++) {
      const i = y * W + x;
      if (g[i]) { dir = (dir + 3) & 3; g[i] = 0; } else { dir = (dir + 1) & 3; g[i] = 1; }
      x = (x + DX[dir] + W) % W;
      y = (y + DY[dir] + H) % H;
    }
    let out = '';
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) out += g[j * W + i] ? '#' : ' ';
      out += '\n';
    }
    return out;
  };
}

/* ---- the donut. Andy Sloane's torus, which is the reason anyone believes
   ASCII can do 3D. Surface normals shaded by a Lambert term against a fixed
   light, z-buffered so the far side is properly hidden. ---- */
function donutDemo(W, H) {
  const LUM = '.,-~:;=!*#$@';
  const zbuf = new Float32Array(W * H);
  const out = new Array(W * H);
  const R1 = 1, R2 = 2, K2 = 5;
  const K1 = H * 0.92;   // sized off the height: a donut is round, not wide
  return (t) => {
    zbuf.fill(0);
    out.fill(' ');
    const A = t * 0.9, B = t * 0.45;
    const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
    for (let th = 0; th < 6.283; th += 0.06) {
      const ct = Math.cos(th), st = Math.sin(th);
      for (let ph = 0; ph < 6.283; ph += 0.018) {
        const cp = Math.cos(ph), sp = Math.sin(ph);
        const cx = R2 + R1 * ct, cy = R1 * st;
        const x = cx * (cB * cp + sA * sB * sp) - cy * cA * sB;
        const y = cx * (sB * cp - sA * cB * sp) + cy * cA * cB;
        const z = K2 + cA * cx * sp + cy * sA;
        const ooz = 1 / z;
        /* x doubled because a char cell is half as wide as it is tall */
        const xp = (W / 2 + K1 * ooz * x * 2) | 0;
        const yp = (H / 2 - K1 * ooz * y) | 0;
        const L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);
        if (L <= 0 || xp < 0 || xp >= W || yp < 0 || yp >= H) continue;
        const i = xp + yp * W;
        if (ooz > zbuf[i]) {
          zbuf[i] = ooz;
          out[i] = LUM[Math.min(11, (L * 8) | 0)];
        }
      }
    }
    let s = '';
    for (let j = 0; j < H; j++) { s += out.slice(j * W, j * W + W).join(''); s += '\n'; }
    return s;
  };
}

/* ---- rotozoomer: an XOR texture spun and scaled about its centre. The
   effect every demo had once someone worked out you could skip the
   multiply per pixel. ---- */
function rotozoomDemo(W, H) {
  const hw = W / (H * 4);
  return (t) => {
    const a = t * 0.55;
    const z = 26 + Math.sin(t * 0.42) * 20;
    const ca = Math.cos(a) * z, sa = Math.sin(a) * z;
    let s = '';
    for (let j = 0; j < H; j++) {
      const y = j / (H - 1) - 0.5;
      for (let i = 0; i < W; i++) {
        const x = (i / (W - 1) - 0.5) * hw * 2;
        const u = (x * ca - y * sa) | 0;
        const v = (x * sa + y * ca) | 0;
        s += shade(((u ^ v) & 31) / 31);
      }
      s += '\n';
    }
    return s;
  };
}

/* ---- the sine scroller. Every demo ended with one. ---- */
function scrollerDemo(W, H) {
  const MSG = '   ***   T H E Z A K M A N   ///   T Z M - O S   ***   '
            + 'GREETINGS TO EVERYONE STILL RUNNING A TUBE   ...   '
            + 'ONLINE SINCE THE PHOSPHOR WAS WARM   ...   ';
  let off = 0;
  return (t, dt) => {
    off += dt * 0.011;
    const grid = new Array(W * H).fill(' ');
    /* A long, shallow wave. Step the phase hard per column and neighbouring
       letters land rows apart, which scatters the message into confetti —
       the point of a scroller is that you can still read it. */
    const amp = H * 0.34;
    for (let i = 0; i < W; i++) {
      const ch = MSG[(((off + i) | 0) % MSG.length + MSG.length) % MSG.length];
      if (ch === ' ') continue;
      const y = Math.round(H / 2 - 0.5 + Math.sin(i * 0.055 + t * 1.9) * amp);
      if (y >= 0 && y < H) grid[y * W + i] = ch;
    }
    let s = '';
    for (let j = 0; j < H; j++) { s += grid.slice(j * W, j * W + W).join(''); s += '\n'; }
    return s;
  };
}

/* ---- twister: a square column, each scanline rotated a little further than
   the one above. Only the faces turned toward the viewer are drawn — draw
   all four and let depth sort them and they overlap into a shapeless
   column instead of a ribbon, because at any angle two of them are behind
   the other two and span the same x. ---- */
function twisterDemo(W, H) {
  const R = Math.min(W * 0.17, H * 1.7);
  return (t) => {
    const grid = new Array(W * H).fill(' ');
    for (let j = 0; j < H; j++) {
      const a = t * 1.7 + j * 0.26;
      for (let k = 0; k < 4; k++) {
        const th1 = a + k * Math.PI / 2;
        const th2 = th1 + Math.PI / 2;
        /* the face's outward normal sits between its two corners */
        const nz = Math.sin(th1 + Math.PI / 4);
        if (nz >= 0) continue;                       // pointing away
        const x1 = W / 2 + Math.cos(th1) * R;
        const x2 = W / 2 + Math.cos(th2) * R;
        /* lambert against a light off to the left and front */
        const lit = 0.2 + Math.abs(Math.cos(th1 + Math.PI / 4)) * 0.8;
        const lo = Math.round(Math.min(x1, x2)), hi = Math.round(Math.max(x1, x2));
        for (let x = lo; x <= hi; x++) {
          if (x >= 0 && x < W) grid[j * W + x] = shade(lit);
        }
      }
    }
    let s = '';
    for (let j = 0; j < H; j++) { s += grid.slice(j * W, j * W + W).join(''); s += '\n'; }
    return s;
  };
}

/* ---- kefrens bars: one scanline's worth of bar, redrawn down the screen
   with the phase advancing per row, which is what makes the column of bars
   snake. ---- */
function kefrensDemo(W, H) {
  return (t) => {
    const grid = new Array(W * H).fill(' ');
    const half = Math.max(3, (W * 0.045) | 0);
    for (let j = 0; j < H; j++) {
      const cx = W / 2 + Math.sin(t * 2.1 + j * 0.28) * (W * 0.36)
                       + Math.sin(t * 1.3 + j * 0.11) * (W * 0.08);
      for (let d = -half; d <= half; d++) {
        const x = Math.round(cx + d);
        if (x < 0 || x >= W) continue;
        grid[j * W + x] = shade(1 - Math.abs(d) / (half + 1));
      }
    }
    let s = '';
    for (let j = 0; j < H; j++) { s += grid.slice(j * W, j * W + W).join(''); s += '\n'; }
    return s;
  };
}

const DEMOS = [
  /* --- fields --- */
  { name: 'plasma', make: field((x, y, t) => (
      Math.sin(x * 4 + t) + Math.sin(y * 5 - t * 0.8)
      + Math.sin((x + y) * 3 + t * 1.2) + Math.sin(Math.hypot(x, y) * 7 - t * 1.7) + 4) / 8) },

  { name: 'tunnel', make: field((x, y, t) => {
      const r = Math.hypot(x, y) + 1e-3;
      const v = Math.sin(0.5 / r * 5 + t * 3) * 0.5 + Math.sin(Math.atan2(y, x) * 6 - t) * 0.5;
      return (v + 1) / 2 * Math.min(1, r * 3.5);
    }) },

  /* the blobs are sized in y-units but spread across x, so they have to
     ride hw or they drift off the side of a wide tube */
  { name: 'metaballs', make: field((x, y, t, hw) => {
      let s = 0;
      for (let i = 0; i < 5; i++) {
        const bx = Math.sin(t * (0.7 + i * 0.23) + i * 2.1) * hw * 0.78;
        const by = Math.cos(t * (0.5 + i * 0.31) + i * 1.3) * 0.32;
        s += 0.05 / ((x - bx) ** 2 + (y - by) ** 2 + 0.004);
      }
      return Math.min(1, s * 0.6);
    }) },

  { name: 'ripples', make: field((x, y, t, hw) => {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        const d = Math.hypot(x - Math.sin(i * 2.3 + 1) * hw * 0.8, y - Math.cos(i * 3.1) * 0.34);
        s += Math.sin(d * 16 - t * 4 + i) / (1 + d * 1.6);
      }
      /* crests only — a trough landing on mid-grey paints the background flat */
      return Math.max(0, s);
    }) },

  { name: 'moire', make: field((x, y, t, hw) => {
      const o = Math.sin(t * 0.6) * hw * 0.5;
      return (Math.sin(Math.hypot(x - o, y) * 22) * Math.sin(Math.hypot(x + o, y) * 22) + 1) / 2;
    }) },

  { name: 'vortex', make: field((x, y, t) => {
      const r = Math.hypot(x, y);
      return (Math.sin((Math.atan2(y, x) + r * 4 - t * 1.5) * 3) * Math.cos(r * 8 - t * 2) + 1) / 2;
    }) },

  { name: 'mandelbrot', make: field((x, y, t) => {
      /* orbit a known-interesting point so the zoom never lands on a void */
      const zoom = Math.pow(2, 1 + ((t * 0.22) % 7));
      const cx = -0.743643887 + x * 3 / zoom;
      const cy = 0.131825904 + y * 3 / zoom;
      let zr = 0, zi = 0, i = 0;
      while (zr * zr + zi * zi < 4 && i < 70) {
        const tr = zr * zr - zi * zi + cx;
        zi = 2 * zr * zi + cy; zr = tr; i++;
      }
      return i >= 70 ? 0 : (i / 70) ** 0.55;
    }) },

  { name: 'julia', make: field((x, y, t) => {
      /* c walks the cardioid, so the set breathes instead of just sitting.
         The body is drawn solid and the escape time is curved hard: mapping
         it linearly against 60 iterations puts almost every outside point in
         the first ramp step, which leaves the set as a thin outline on
         black — dark inside, dark outside, and only the boundary visible. */
      const MAX = 42;
      const cr = 0.7885 * Math.cos(t * 0.32), ci = 0.7885 * Math.sin(t * 0.32);
      let zr = x * 1.5, zi = y * 1.5, i = 0;
      while (zr * zr + zi * zi < 4 && i < MAX) {
        const tr = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci; zr = tr; i++;
      }
      return i >= MAX ? 1 : (i / MAX) ** 0.35;
    }) },

  { name: 'boing', make: field((x, y, t, hw) => {
      /* the Amiga ball: checkered sphere, spinning as it goes */
      const bx = Math.sin(t * 1.2) * (hw - 0.36);
      const by = 0.16 - Math.abs(Math.sin(t * 2.0)) * 0.32;
      const dx = x - bx, dy = y - by, R = 0.33;
      const r = Math.hypot(dx, dy);
      if (r > R) return 0;
      const nz = Math.sqrt(1 - (r / R) ** 2);
      const u = Math.atan2(dx / R, nz) + t * 2.2;
      const v = Math.asin(Math.max(-1, Math.min(1, dy / R)));
      const check = (Math.floor(u * 2.4) + Math.floor(v * 3.2)) & 1;
      /* a little shading so it reads as a ball and not a disc */
      const lit = 0.55 + nz * 0.45;
      return (check ? 0.95 : 0.4) * lit;
    }) },

  /* --- everything that needs to remember something --- */
  { name: 'fire',       make: fireDemo },
  { name: 'donut',      make: donutDemo },
  { name: 'rotozoom',   make: rotozoomDemo },
  { name: 'scroller',   make: scrollerDemo },
  { name: 'twister',    make: twisterDemo },
  { name: 'kefrens',    make: kefrensDemo },
  { name: 'life',       make: lifeDemo },
  { name: 'rule 30',    make: caDemo(30, false) },
  { name: 'rule 110',   make: caDemo(110, true) },
  { name: 'sierpinski', make: caDemo(90, false) },
  { name: '10 print',   make: tenPrintDemo },
  { name: 'cube',       make: cubeDemo },
  { name: 'starfield',  make: starDemo },
  { name: 'lorenz',     make: lorenzDemo },
  { name: "langton's ant", make: antDemo },
];

const DEMO_ROWS = 26;

function DemoFX() {
  const ref = useRef(null);
  const pick = useRef(null);
  if (!pick.current) pick.current = DEMOS[(Math.random() * DEMOS.length) | 0];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { make } = pick.current;
    const H = DEMO_ROWS;
    let W = 0, draw = null;

    /* Measure the advance with an absolutely-positioned inline span that
       inherits the <pre>'s font. It has to be inline — a block's scrollWidth
       is floored at its clientWidth, so measuring that way just hands back
       the box width and the field comes out 2.4x too narrow. */
    const measure = () => {
      const span = document.createElement('span');
      span.textContent = 'M'.repeat(100);
      span.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
      el.appendChild(span);
      const cw = span.getBoundingClientRect().width / 100;
      span.remove();
      if (cw <= 0.5) return;
      const next = Math.max(24, Math.min(240, Math.floor(el.clientWidth / cw)));
      /* the effects size their buffers to W, so a resize has to rebuild
         them — and that necessarily restarts anything stateful */
      if (next !== W) { W = next; draw = make(W, H); }
    };
    measure();
    /* VT323 may still be in flight on first paint, and the fallback is a
       wider face — remeasure once it lands */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const t0 = performance.now();
    let raf = 0, running = false, last = 0;

    /* one frame, then hold. Some effects need a moment to become themselves —
       an ant on an empty grid or a cold Lorenz is not worth looking at — so
       wind them forward before the single frame that gets kept. */
    const still = prefersReducedMotion();
    if (still && draw) for (let i = 0; i < 90; i++) draw(i / 30, 33);

    const frame = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      /* prime the clock on the first frame and bail — deriving dt from an
         unset `last` gives 0, which fails the throttle below and returns
         before `last` is ever assigned, so nothing draws again */
      if (!last) { last = now; return; }
      const dt = now - last;
      if (dt < 33) return;                 // 30fps is plenty for ASCII
      last = now;
      if (draw) el.textContent = draw((now - t0) / 1000, Math.min(80, dt));
      if (still) { running = false; cancelAnimationFrame(raf); }
    };

    /* scrolled out of the tube, it stops costing frames */
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0.01 });
    io.observe(el);

    return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, []);

  return (
    <div className="demo">
      <pre className="demo-out" ref={ref} aria-hidden="true" />
      <span className="demo-tag dim">{pick.current.name}</span>
    </div>
  );
}

/* ==================== main app ==================== */

function App() {
  const tweaksDefaults = /*EDITMODE-BEGIN*/{
    "phosphor": "green",
    "scanlines": 0.35,
    "curvature": true,
    "glow": 0.7,
    "bloom": 0.5,
    "emission": 0.8,
    "converge": 0.5,
    "burnin": 0.45,
    "reflection": 0.7,
    "deadpix": 0.2,
    "grime": true,
    "sound": false,
    "volume": 0.5,
    "flicker": true,
    "jitter": true,
    "font": "vt323"
  }/*EDITMODE-END*/;

  const [v, setTweak] = (window.useTweaks || ((d) => [d, () => {}]))(tweaksDefaults);

  /* boot phase */
  const [phase, setPhase] = useState('boot');
  const [bootStart] = useState(Date.now());
  const [bootDone, setBootDone] = useState(0);
  const totalBoot = 8;
  const wasSkipped = useRef(false);

  /* ---- the monitor itself, independent of the machine driving it ----
     Powering the tube off doesn't reboot tzm-sh, so the scrollback is
     still there when it comes back — same as unplugging a real display. */
  const [power, setPower] = useState('on');   // 'on' | 'off'
  const [collapsing, setCollapsing] = useState(false);
  const [warming, setWarming] = useState(false);
  const [degaussing, setDegaussing] = useState(false);
  const [wiping, setWiping] = useState(false);
  const timers = useRef([]);
  const crtRef = useRef(null);

  useViewerParallax(crtRef, v.reflection > 0);

  const after = useCallback((ms, fn) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const sound = useCrtSound(v.sound, v.volume);

  const degauss = useCallback(() => {
    setDegaussing(true);
    sound.degaussSound();
    after(1100, () => setDegaussing(false));
  }, [after, sound]);

  const powerOff = useCallback(() => {
    setCollapsing(true);
    sound.powerOffSound();
    sound.setPowered(false);
    after(620, () => { setPower('off'); setCollapsing(false); });
  }, [after, sound]);

  /* A tube doesn't just appear. The cathode has to heat before it emits, so
     the picture arrives as a dot, springs into a line, opens vertically,
     overshoots and settles — then the coil fires. Sequenced rather than
     simultaneous: both animate .raster, so running them together means one
     silently wins. */
  const powerOn = useCallback(() => {
    setPower('on');
    setWarming(true);
    sound.powerOnSound();
    sound.setPowered(true);
    after(760, () => { setWarming(false); degauss(); });
    after(60, () => { if (inputRef.current) inputRef.current.focus(); });
  }, [after, degauss, sound]);

  /* the tube degausses when it warms up, like every CRT ever made */
  useEffect(() => { degauss(); }, []);

  /* switching sound on mid-session: the tube is already scanning, so it
     should already be singing — don't wait for the next power cycle */
  useEffect(() => {
    if (v.sound) sound.setPowered(power === 'on');
  }, [v.sound, power, sound]);

  /* The strip's digits have to actually do something or they're a lie.
     F1-F9 is the period-correct binding, but macOS claims bare F-keys for
     brightness and volume unless you've opted out, so Alt+digit covers
     everyone. Plain digits stay untouched — you have to be able to type
     "1987" at the prompt. */
  useEffect(() => {
    if (phase !== 'done' || power !== 'on') return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey) return;
      let n = null;
      const fkey = /^F([1-9])$/.exec(e.key);
      if (fkey) n = +fkey[1];
      else if (e.altKey && /^[1-9]$/.test(e.key)) n = +e.key;
      if (n === null) return;
      const hit = FKEYS.find(f => f.n === n);
      if (!hit) return;
      e.preventDefault();
      runCommandRef.current(hit.cmd);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, power]);

  /* any input wakes a sleeping monitor */
  useEffect(() => {
    if (power !== 'off') return;
    const wake = () => powerOn();
    window.addEventListener('click', wake);
    window.addEventListener('keydown', wake);
    window.addEventListener('touchstart', wake);
    return () => {
      window.removeEventListener('click', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('touchstart', wake);
    };
  }, [power, powerOn]);

  const skipBoot = useCallback(() => {
    wasSkipped.current = true;
    setBootDone(totalBoot);
    setPhase('done');
  }, []);

  useEffect(() => {
    if (phase !== 'boot') return;
    const handler = () => skipBoot();
    window.addEventListener('click', handler);
    window.addEventListener('touchstart', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [phase, skipBoot]);

  /* terminal state */
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const cmdHistory = useRef([]);
  const cmdHistoryIdx = useRef(-1);
  /* the F-key listener reads through this so it binds once, instead of
     re-registering on every keystroke as `input` changes */
  const runCommandRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  useEffect(() => {
    if (wasSkipped.current) {
      wasSkipped.current = false;
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      return;
    }
    scrollToBottom();
  }, [history, phase, bootDone, scrollToBottom]);

  useEffect(() => {
    if (phase === 'boot' && bootDone >= totalBoot) {
      const id = setTimeout(() => setPhase('done'), 250);
      return () => clearTimeout(id);
    }
  }, [bootDone, phase]);

  useEffect(() => {
    if (phase === 'done' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  useEffect(() => {
    const focus = (e) => {
      if (phase !== 'done') return;
      /* the f-key strip and the bezel switches are real buttons, so the
         button check already covers them */
      if (e.target.tagName === 'A' || e.target.closest('a') ||
          e.target.tagName === 'BUTTON' || e.target.closest('button') ||
          e.target.closest('.twk-panel')) return;
      if (inputRef.current) inputRef.current.focus();
    };
    window.addEventListener('click', focus);
    return () => window.removeEventListener('click', focus);
  }, [phase]);

  /* phosphor */
  const phosphorMap = {
    green:  { fg: '#39ff7a', bg: '#020906', glow: '#3fffa1', hue: '90deg' },
    amber:  { fg: '#ffb000', bg: '#0a0500', glow: '#ffd166', hue: '25deg' },
    white:  { fg: '#e8f4ff', bg: '#02060a', glow: '#a8d8ff', hue: '0deg'  },
    cyan:   { fg: '#4fe6ff', bg: '#011014', glow: '#7af0ff', hue: '150deg' },
    magenta:{ fg: '#ff5fd1', bg: '#0a0410', glow: '#ff9be4', hue: '270deg' },
  };
  const ph = phosphorMap[v.phosphor] || phosphorMap.green;

  const cssVars = {
    '--fg': ph.fg,
    '--bg': ph.bg,
    '--glow': ph.glow,
    '--phosphor-hue': ph.hue,
    '--scanline-a': v.scanlines,
    '--emission': v.emission,
    '--burnin': v.burnin,
    '--reflection': v.reflection,
    '--converge': `${v.converge}px`,
    '--text-shadow': phosphorShadow(v.glow, v.bloom, v.converge, ph.glow),
    '--font-body': v.font === 'vt323' ? "'VT323', 'IBM Plex Mono', monospace" : "'JetBrains Mono', 'IBM Plex Mono', monospace",
    '--font-size': v.font === 'vt323' ? '20px' : '15px',
  };

  /* command handler */
  const runCommand = useCallback((raw) => {
    const cmd = raw.trim();
    const echo = { kind: 'echo', cmd: raw };
    let out;
    const c = cmd.toLowerCase();

    if (c !== '') {
      cmdHistory.current.push(cmd);
    }
    cmdHistoryIdx.current = -1;

    if (c === '') {
      setHistory(h => [...h, echo]);
      return;
    }
    if (c === 'help' || c === '?') {
      out = { kind: 'help' };
    } else if (c === 'about' || c === 'whoami' || c === 'cat about.txt') {
      out = { kind: 'about' };
    } else if (c === 'social' || c === 'ls' || c === 'll') {
      out = { kind: 'social' };
    } else if (c === 'ls -la' || c === 'ls -l' || c === 'ls -al' || c === 'ls -la /social') {
      out = { kind: 'ls' };
    } else if (c === 'donate' || c === 'beer' || c === 'donate --beer') {
      out = { kind: 'donate' };
    } else if (c === 'contact' || c === 'irc') {
      out = { kind: 'contact' };
    } else if (c === 'hardware' || c === 'specs' || c === 'neofetch') {
      out = { kind: 'hardware' };
    } else if (c === 'matrix') {
      out = { kind: 'matrix' };
    } else if (c === 'demo' || c === 'fx') {
      out = { kind: 'demo' };
    } else if (c === 'cats' || c === 'cat cats') {
      /* off the strip and out of help, but neofetch's "17527 cat photos"
         sets it up, so it stays here for anyone who goes looking */
      out = { kind: 'cats' };
    } else if (c === 'date') {
      out = { kind: 'text', text: nowStr() };
    } else if (c === 'clear' || c === 'cls') {
      /* phosphor doesn't cut to black — let the old frame decay out */
      setWiping(true);
      after(220, () => {
        setHistory([]);
        setWiping(false);
        if (inputRef.current) inputRef.current.focus();
      });
      return;
    } else if (c === 'degauss') {
      degauss();
      out = { kind: 'text', text: 'degaussing coil energized ... field collapsed.' };
    } else if (c === 'sound' || c === 'mute' || c === 'unmute') {
      const on = c === 'mute' ? false : c === 'unmute' ? true : !v.sound;
      setTweak('sound', on);
      out = { kind: 'text', text: on
        ? 'flyback at 15.734kHz. if you hear nothing, the tube is fine — your ears are just older than it.'
        : 'tube muted.' };
    } else if (c === 'exit' || c === 'logout' || c === 'quit' || c === 'poweroff' || c === 'shutdown') {
      setHistory(h => [...h, echo, { kind: 'text', text: 'signal lost. (the shell is still running — wake it with any key)' }]);
      after(420, powerOff);
      return;
    } else if (c.startsWith('sudo')) {
      out = { kind: 'text', text: `[sudo] password for ${c.slice(5) || 'guest'}: incorrect. try 'help'.`, warn: true };
    } else if (c === 'rm -rf /' || c === 'rm -rf') {
      out = { kind: 'text', text: 'nice try. /dev/null is full.', warn: true };
    } else {
      out = { kind: 'text', text: `tzm-sh: ${cmd}: command not found. try 'help'`, warn: true };
    }
    setHistory(h => [...h, echo, out]);
    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 100);
  }, [after, degauss, powerOff, v.sound, setTweak]);

  runCommandRef.current = runCommand;

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      runCommand(input);
      setInput('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const cur = input.trim().toLowerCase();
      if (!cur) return;
      const hits = COMPLETIONS.filter(c => c.startsWith(cur));
      if (hits.length === 0) return;
      if (hits.length === 1) { setInput(hits[0]); return; }
      /* ambiguous: fill in as far as they agree, then list the rest */
      let prefix = hits[0];
      for (const h of hits) {
        while (!h.startsWith(prefix)) prefix = prefix.slice(0, -1);
      }
      setInput(prefix);
      setHistory(h => [...h, { kind: 'echo', cmd: input }, { kind: 'hits', hits }]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const hist = cmdHistory.current;
      if (hist.length === 0) return;
      const next = cmdHistoryIdx.current + 1;
      if (next < hist.length) {
        cmdHistoryIdx.current = next;
        setInput(hist[hist.length - 1 - next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIdx.current > 0) {
        cmdHistoryIdx.current--;
        setInput(cmdHistory.current[cmdHistory.current.length - 1 - cmdHistoryIdx.current]);
      } else {
        cmdHistoryIdx.current = -1;
        setInput('');
      }
    }
  };

  /* ==================== render ==================== */

  return (
    <div
      className={[
        'crt', `ph-${v.phosphor}`, `font-${v.font}`,
        v.curvature && 'curved',
        v.flicker && 'flicker',
        v.jitter && 'jitter',
        power === 'off' && 'powered-off',
        collapsing && 'collapsing',
        warming && 'warming',
        degaussing && 'degaussing',
      ].filter(Boolean).join(' ')}
      style={cssVars}
      ref={crtRef}
    >
      <div className="bezel">
        <div className="screen">
          <div className="scanlines"></div>
          <div className="vignette"></div>
          <div className="rgb"></div>

          {/* 39 years of the same status bar and prompt etched into the phosphor */}
          <div className="burnin"></div>

          {/* convergence drifts the further the beam has to travel */}
          <div className="converge-edge"></div>

          {/* The room, hanging on the front of the glass. It parallaxes
              against the picture, which is what makes the glass read as a
              surface in front rather than a texture on top. */}
          {v.reflection > 0 && <div className="reflection"></div>}

          {/* The rim is a separate layer on purpose: it comes from the
              curvature, which belongs to the tube, not to where you're
              standing — so it must not slide with the viewer. It also can't
              live on the parallax layer, which is inset past the glass edge
              to give the room room to move; the rim's brightest stop would
              land outside the screen and get clipped away. */}
          {v.reflection > 0 && <div className="rim"></div>}

          {/* the glass itself: 30 years of dust, fingerprints and dead subpixels */}
          {v.grime && (
            <>
              <div className="dust"></div>
              <div className="smudge"></div>
              <DeadPixels chance={v.deadpix} />
            </>
          )}

          {/* the dot the raster collapses into when the tube cuts out */}
          <div className="dot"></div>
          <div className="degauss-fx"></div>

          <div className={`raster ${wiping ? 'wiping' : ''}`}>

          <StatusBar bootStart={bootStart} phosphor={v.phosphor} />

          <div className="terminal" ref={scrollRef}>

            {/* === BOOT PHASE === */}
            {phase === 'boot' && (
              <div className="boot-block">
                <BootLine delay={50}   text="TZM-BIOS v25.04.18  © 1987-2026 TheZakMan Industries" onDone={() => setBootDone(b => Math.max(b,1))} />
                <BootLine delay={250}  text="CPU... Pentium IV @ 3.2GHz (overclocked w/ vibes)"   onDone={() => setBootDone(b => Math.max(b,2))} />
                <BootLine delay={420}  text="Memory test ... 640K (should be enough for anybody)" onDone={() => setBootDone(b => Math.max(b,3))} />
                <BootLine delay={650}  text="Detecting devices: guitar /dev/strat ... python /dev/snek" onDone={() => setBootDone(b => Math.max(b,4))} />
                <BootLine delay={900}  text="Mounting /home/tzm ... loading cat photos archive (1987→)" onDone={() => setBootDone(b => Math.max(b,5))} />
                <BootLine delay={1150} text="Initializing CRT phosphor matrix ... aligning scanlines" onDone={() => setBootDone(b => Math.max(b,6))} />
                <BootLine delay={1400} text="Network: IRC → freenode/#thezakman ... ONLINE" onDone={() => setBootDone(b => Math.max(b,7))} />
                <BootLine delay={1650} text="Starting tzm-sh ... ready" onDone={() => setBootDone(b => Math.max(b,8))} />
                <div className="boot-skip-hint">tap anywhere to skip</div>
              </div>
            )}

            {/* === MAIN CONTENT === */}
            {phase === 'done' && (
              <>
                {/* NEOFETCH */}
                <FullPrompt cmd="neofetch" />
                <NeofetchBlock />

                {/* DYNAMIC HISTORY */}
                {history.map((h, i) => {
                  if (h.kind === 'echo') return <FullPrompt key={i} cmd={h.cmd} />;
                  if (h.kind === 'text') return <div key={i} className={`out ${h.warn ? 'warn' : ''}`}>{h.text}</div>;
                  if (h.kind === 'help') return (
                    <div key={i} className="out help">
                      {HELP.map(([cmd, what]) => (
                        <button key={cmd} className="help-row" onClick={() => runCommand(cmd)}>
                          <span className="help-cmd">{cmd}</span>
                          <span className="help-what">{what}</span>
                        </button>
                      ))}
                      <div className="help-foot dim">
                        tab completes · {'↑'}{'↓'} walks history · F1-F9 (or alt+1-9) run the strip below
                      </div>
                    </div>
                  );
                  if (h.kind === 'about') return (
                    <div key={i} className="out">
                      <p>I'm a <span className="hi">Hacker / Graphic &amp; CGI Artist</span> that loves to play guitar and mess around with python <span className="heart">{'♥'}</span></p>
                      <p>On the internet breaking and fixing stuff, since <span className="hi">1997</span>.</p>
                    </div>
                  );
                  if (h.kind === 'social') return (
                    <div key={i} className="out">
                      {SOCIALS.map((s) => <SocialRow key={s.name} s={s} />)}
                    </div>
                  );
                  if (h.kind === 'ls') return <LsBlock key={i} />;
                  if (h.kind === 'hits') return (
                    <div key={i} className="out hits">
                      {h.hits.map(x => <span key={x}>{x}</span>)}
                    </div>
                  );
                  if (h.kind === 'donate') return (
                    <div key={i} className="out">
                      <pre className="beer">{String.raw`
        .~~~~.
        i====i_
        |cccc| |   "If you like my art or anything I do,
        |cccc|_/    send me a beer. I do most of my cool
        \___,/      stuff with a cold one." — tzm
`}</pre>
                      <a className="btn" href="https://www.paypal.com/donate?business=thezakman@icloud.com&amount=5&currency_code=USD" target="_blank" rel="noopener noreferrer">[ paypal · $5 · cheers {'🍺'} ]</a>
                    </div>
                  );
                  if (h.kind === 'contact') return (
                    /* same dl/grid as neofetch — this block was still padding
                       its labels with trailing spaces to line the values up */
                    <dl key={i} className="out kv">
                      <dt>irc</dt>
                      <dd>TheZakMan @ freenode</dd>
                      <dt>email</dt>
                      <dd>thezakman<span className="dim">[at]</span>icloud.com</dd>
                      <dt>timezone</dt>
                      <dd>UTC-3 / America/Sao_Paulo</dd>
                      <dt>status</dt>
                      <dd><span className="ok">{'●'}</span> available for freelance</dd>
                    </dl>
                  );
                  if (h.kind === 'hardware') return <NeofetchBlock key={i} />;
                  if (h.kind === 'matrix') return <MatrixRain key={i} />;
                  if (h.kind === 'demo') return <DemoFX key={i} />;
                  if (h.kind === 'cats') return (
                    <div key={i} className="out">
                      <pre className="catart">{String.raw`
   /\_/\     /\_/\     /\_/\     /\_/\
  ( o.o )   ( -.- )   ( ^.^ )   ( o.- )
   > ^ <     > ^ <     > ^ <     > ^ <
`}</pre>
                      <span className="dim">17527 cat photos archived since 1987.</span>
                    </div>
                  );
                  return null;
                })}

              </>
            )}
          </div>

          {/* FIXED BOTTOM: command line, then the function-key strip flush
              to the tube's edge — the order every DOS file manager used */}
          {phase === 'done' && (
            <div className="screen-bottom">
              <div className="line live">
                <span className="ps1"><span className="ps1-user">tzm</span><span className="ps1-at">@</span><span className="ps1-host">cyberspace</span><span className="ps1-colon">:</span><span className="ps1-path">~</span><span className="ps1-dollar">$</span></span>
                <input
                  ref={inputRef}
                  className="cmd-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  enterKeyHint="send"
                  aria-label="terminal input"
                />
                <span className="cursor">{'█'}</span>
              </div>
              <FKeyBar onRun={runCommand} />
            </div>
          )}

          </div>{/* /.raster */}
        </div>

        <div className="bezel-tag">
          <span className={`led ${power === 'on' ? 'on' : 'standby'}`}></span>
          <span className="copyleft">since 1987 / (c) TheZakMan</span>
          <span className="hw-controls">
            <button
              className={`hw-btn ${v.sound ? 'lit' : ''}`}
              onClick={() => setTweak('sound', !v.sound)}
              title={v.sound ? 'Mute the tube' : 'Let the tube sing (15.7kHz flyback)'}
              aria-label={v.sound ? 'Mute the monitor' : 'Unmute the monitor'}
              aria-pressed={v.sound}
            >{v.sound ? '♪' : '⃠'}</button>
            <button
              className="hw-btn"
              onClick={degauss}
              disabled={power === 'off'}
              title="Degauss"
              aria-label="Degauss the tube"
            >degauss</button>
            <button
              className="hw-btn power"
              onClick={() => (power === 'on' ? powerOff() : powerOn())}
              title={power === 'on' ? 'Power off' : 'Power on'}
              aria-label={power === 'on' ? 'Power the monitor off' : 'Power the monitor on'}
            >{'⏻'}</button>
          </span>
        </div>
      </div>

      {/* Tweaks panel */}
      {window.TweaksPanel && (() => {
        const { TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakSelect } = window;
        return (
          <TweaksPanel title="Tweaks">
            <TweakSection title="Phosphor">
              <TweakSelect
                label="Color"
                value={v.phosphor}
                onChange={(x) => setTweak('phosphor', x)}
                options={[
                  { value: 'green',   label: 'Green (P1)' },
                  { value: 'amber',   label: 'Amber (P3)' },
                  { value: 'white',   label: 'White (P4)' },
                  { value: 'cyan',    label: 'Cyan' },
                  { value: 'magenta', label: 'Magenta' },
                ]}
              />
              <TweakSlider label="Glow" value={v.glow} min={0} max={1.5} step={0.05} onChange={(x) => setTweak('glow', x)} />
              <TweakSlider label="Bloom" value={v.bloom} min={0} max={1} step={0.05} onChange={(x) => setTweak('bloom', x)} />
              <TweakSlider label="Emission" value={v.emission} min={0} max={2} step={0.05} onChange={(x) => setTweak('emission', x)} />
              <TweakSlider label="Misconvergence" value={v.converge} min={0} max={2} step={0.1} onChange={(x) => setTweak('converge', x)} />
              <TweakSlider label="Burn-in" value={v.burnin} min={0} max={1.5} step={0.05} onChange={(x) => setTweak('burnin', x)} />
              <TweakSlider label="Reflection" value={v.reflection} min={0} max={1.5} step={0.05} onChange={(x) => setTweak('reflection', x)} />
            </TweakSection>
            <TweakSection title="CRT">
              <TweakSlider label="Scanlines" value={v.scanlines} min={0} max={0.8} step={0.02} onChange={(x) => setTweak('scanlines', x)} />
              <TweakToggle label="Curvature" value={v.curvature} onChange={(x) => setTweak('curvature', x)} />
              <TweakToggle label="Flicker" value={v.flicker} onChange={(x) => setTweak('flicker', x)} />
              <TweakToggle label="Jitter" value={v.jitter} onChange={(x) => setTweak('jitter', x)} />
              <TweakToggle label="Dust & wear" value={v.grime} onChange={(x) => setTweak('grime', x)} />
              <TweakSlider label="Dead pixel odds" value={v.deadpix} min={0} max={1} step={0.05} onChange={(x) => setTweak('deadpix', x)} />
            </TweakSection>
            <TweakSection title="Sound">
              <TweakToggle label="Flyback whine" value={v.sound} onChange={(x) => setTweak('sound', x)} />
              <TweakSlider label="Volume" value={v.volume} min={0} max={1} step={0.05} onChange={(x) => setTweak('volume', x)} />
            </TweakSection>
            <TweakSection title="Typography">
              <TweakRadio
                label="Font"
                value={v.font}
                onChange={(x) => setTweak('font', x)}
                options={[
                  { value: 'vt323', label: 'VT323' },
                  { value: 'mono',  label: 'Mono' },
                ]}
              />
            </TweakSection>
          </TweaksPanel>
        );
      })()}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
