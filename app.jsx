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

const CMDS = ['about', 'social', 'donate', 'contact', 'neofetch', 'paint', 'demo', 'date', 'clear'];

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
  ['paint',      'ascii studio — burn your own art'],
  ['demo',       "a procedural effect — 'demo list'"],
  ['screensaver','after dark, hold the toasters'],
  ['phosphor',   'swap the tube: phosphor amber'],
  ['date',       'the clock on my desk'],
  ['degauss',    'fire the coil'],
  ['sound',      'let the flyback sing'],
  ['clear',      'wipe the phosphor'],
  ['exit',       'cut the signal'],
];

/* Everything tab-completable, including what the button bar doesn't show. */
const COMPLETIONS = [
  'about', 'beer', 'cats', 'clear', 'contact', 'date', 'degauss', 'demo',
  'demo list', 'donate', 'exit', 'fx', 'hardware', 'help', 'irc', 'ls', 'ls -la', 'matrix',
  'mute', 'neofetch', 'paint', 'phosphor', 'phosphor amber', 'phosphor cyan',
  'phosphor green', 'phosphor magenta', 'phosphor white', 'poweroff',
  'saver', 'screensaver', 'shutdown', 'social', 'sound', 'specs',
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

  /* On by default now, but an AudioContext built without a user gesture is
     born suspended and no site can talk its way out of that — the tube would
     just sit there mute with a lit button. So take the first gesture of any
     kind as the cue. The boot invites a tap to skip, so in practice it starts
     singing straight away. Stays subscribed rather than firing once: the
     context can be suspended again by the browser at any point. */
  useEffect(() => {
    if (!enabled) return;
    const kick = () => {
      const a = rig.current;
      if (a && a.ctx.state === 'suspended') a.ctx.resume();
    };
    kick();
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    window.addEventListener('touchstart', kick);
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      window.removeEventListener('touchstart', kick);
    };
  }, [enabled]);

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

  /* somebody else's keystroke, heard through a monitor that is off */
  const keyTick = useCallback(() => {
    const a = rig.current;
    if (!a) return;
    const { ctx, master } = a;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 1300 + Math.random() * 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.016, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.02);
  }, []);

  /* your own keystroke: a touch louder and lower than the ghost's, with
     the pitch wobbling so a burst of typing doesn't read as a beep */
  const typeTick = useCallback(() => {
    const a = rig.current;
    if (!a) return;
    const { ctx, master } = a;
    a.ctx.resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 850 + Math.random() * 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.028, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.028);
  }, []);

  /* the chunky detent of a switch on the housing — F-keys, knobs, enter */
  const clickSound = useCallback(() => {
    const a = rig.current;
    if (!a) return;
    const { ctx, master } = a;
    a.ctx.resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(230, t + 0.032);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.055);
  }, []);

  return { setPowered, degaussSound, powerOffSound, powerOnSound, keyTick, typeTick, clickSound };
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

/* Every effect rolls its own numbers at construction. Hard-code the
   frequencies and speeds and two plasmas are identical to the pixel — the
   pick is random but what you get isn't, and drawing the same effect twice
   in a session looks like the thing is stuck. Only the stateful ones used
   to vary, and only because their seed happened to come from Math.random. */
const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
const rsign = () => (Math.random() < 0.5 ? -1 : 1);
const rpick = (a) => a[(Math.random() * a.length) | 0];

/* Demoscene coordinates: y spans -0.5..0.5, and x spans -hw..hw where hw
   is the half-width in those same units, so nothing comes out an ellipse.
   Effects get hw because the tube is wide and its exact width depends on
   the viewport — anything placing its features at fixed offsets either
   huddles in the middle of the screen or walks straight off the edge.

   Takes a factory, not a function: it's called once per instance so the
   effect can roll its constants before any pixel is drawn. */
function field(makeFn) {
  return (W, H) => {
    const fn = makeFn();
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
  const density = rnd(0.72, 0.95), cool = rnd(0.075, 0.15), spread = rnd(0.6, 1);
  /* a draught: some sessions the flames lean, and how hard is a roll too */
  const wind = rnd(-0.35, 0.35);
  return () => {
    for (let i = 0; i < W; i++) buf[(h - 1) * W + i] = Math.random() < density ? 1 : 0.35;
    for (let j = 0; j < h - 1; j++) {
      for (let i = 0; i < W; i++) {
        const drift = (Math.random() < spread ? ((Math.random() * 3) | 0) - 1 : 0)
                    + (Math.random() < Math.abs(wind) ? Math.sign(wind) : 0);
        const si = Math.min(W - 1, Math.max(0, i + drift));
        const v = buf[(j + 1) * W + si] - Math.random() * cool;
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
  const density = rnd(0.18, 0.4), rate = rnd(60, 130);
  const seed = () => {
    for (let i = 0; i < N; i++) a[i] = Math.random() < density ? 1 : 0;
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
    while (acc > rate) { step(); acc -= rate; }
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
    /* A single seed in the middle of a fixed rule is fully deterministic —
       every visit gets a pixel-identical run. Move the seed and vary how far
       it's wound on, and the window lands somewhere different each time. */
    if (seedRandom) for (let i = 0; i < W; i++) first[i] = Math.random() < rnd(0.3, 0.7) ? 1 : 0;
    else first[((W * rnd(0.25, 0.75)) | 0)] = 1;
    rows.push(first);
    let acc = 0;
    const rate = rnd(38, 75);
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
    if (!seedRandom) { const n = W + ((rnd(0, 1.2) * W) | 0); for (let i = 0; i < n; i++) next(); }
    return (t, dt) => {
      acc += dt;
      while (acc > rate) { next(); acc -= rate; }
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
  const scale = H * rnd(0.3, 0.4);
  /* not sa/sb — the inner scope binds those to sin(a)/sin(b) */
  const spinA = rnd(0.45, 1.0) * rsign(), spinB = rnd(0.3, 0.7) * rsign();
  const pa = rnd(0, 6.3), pb = rnd(0, 6.3);
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
      const a = t * spinA + c * 1.1 + pa, b = t * spinB + c * 0.6 + pb;
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
  const N = Math.max(60, ((W * H) / rnd(5, 11)) | 0);
  const warp = rnd(0.00028, 0.0007);
  const s = Array.from({ length: N }, () => ({
    x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 0.98 + 0.02,
  }));
  return (t, dt) => {
    const g = new Array(W * H).fill(' ');
    const step = Math.min(60, dt) * warp;
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
  let x = rnd(-0.2, 0.2) || 0.1, y = rnd(-0.2, 0.2), z = rnd(0, 0.4);
  /* stay inside the chaotic regime — rho below ~24.7 and it just spirals
     into a fixed point and stops being an attractor worth watching */
  const SIG = rnd(9, 11), RHO = rnd(26, 32), BETA = rnd(2.4, 3.0);
  const trail = new Float32Array(W * H);
  return (t, dt) => {
    for (let i = 0; i < trail.length; i++) trail[i] *= 0.982;
    const n = Math.min(180, Math.max(20, (dt * 4) | 0));
    for (let s = 0; s < n; s++) {
      const h = 0.005;
      const dx = SIG * (y - x), dy = x * (RHO - z) - y, dz = x * y - BETA * z;
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
  let x = (W >> 1) + ((rnd(-0.2, 0.2) * W) | 0), y = (H >> 1) + ((rnd(-0.2, 0.2) * H) | 0);
  let dir = (Math.random() * 4) | 0;     // 0=up 1=right 2=down 3=left
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
  const R1 = rnd(0.75, 1.15), R2 = rnd(1.7, 2.3), K2 = 5;
  const K1 = H * rnd(0.8, 1.0);   // sized off the height: a donut is round, not wide
  /* not sA/sB: the inner scope already binds those to sin(A)/sin(B), and
     shadowing them puts the line below in the temporal dead zone */
  const spinA = rnd(0.55, 1.25) * rsign(), spinB = rnd(0.3, 0.75) * rsign();
  const phA = rnd(0, 6.3), phB = rnd(0, 6.3);
  return (t) => {
    zbuf.fill(0);
    out.fill(' ');
    const A = t * spinA + phA, B = t * spinB + phB;
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
  const spin = rnd(0.3, 0.9) * rsign(), zc = rnd(18, 34), zr = rnd(10, 24);
  const zs = rnd(0.25, 0.6), mask = rpick([15, 31, 31, 63]), ph = rnd(0, 6.3);
  return (t) => {
    const a = t * spin + ph;
    const z = zc + Math.sin(t * zs) * zr;
    const ca = Math.cos(a) * z, sa = Math.sin(a) * z;
    let s = '';
    for (let j = 0; j < H; j++) {
      const y = j / (H - 1) - 0.5;
      for (let i = 0; i < W; i++) {
        const x = (i / (W - 1) - 0.5) * hw * 2;
        const u = (x * ca - y * sa) | 0;
        const v = (x * sa + y * ca) | 0;
        s += shade(((u ^ v) & mask) / mask);
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
  let off = rnd(0, 200);
  const spd = rnd(0.008, 0.016), waveK = rnd(0.035, 0.08), waveS = rnd(1.3, 2.6) * rsign();
  const ampF = rnd(0.24, 0.4);
  return (t, dt) => {
    off += dt * spd;
    const grid = new Array(W * H).fill(' ');
    /* A long, shallow wave. Step the phase hard per column and neighbouring
       letters land rows apart, which scatters the message into confetti —
       the point of a scroller is that you can still read it. */
    const amp = H * ampF;
    for (let i = 0; i < W; i++) {
      const ch = MSG[(((off + i) | 0) % MSG.length + MSG.length) % MSG.length];
      if (ch === ' ') continue;
      const y = Math.round(H / 2 - 0.5 + Math.sin(i * waveK + t * waveS) * amp);
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
  const R = Math.min(W * rnd(0.12, 0.2), H * rnd(1.3, 2));
  const spd = rnd(1.1, 2.4) * rsign(), twist = rnd(0.14, 0.4) * rsign(), ph = rnd(0, 6.3);
  return (t) => {
    const grid = new Array(W * H).fill(' ');
    for (let j = 0; j < H; j++) {
      const a = t * spd + j * twist + ph;
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
  const s1 = rnd(1.4, 2.8) * rsign(), s2 = rnd(0.8, 1.8) * rsign();
  const w1 = rnd(0.18, 0.4), w2 = rnd(0.06, 0.18);
  const a1 = rnd(0.26, 0.4), a2 = rnd(0.04, 0.12);
  const half = Math.max(3, (W * rnd(0.03, 0.07)) | 0);
  return (t) => {
    const grid = new Array(W * H).fill(' ');
    for (let j = 0; j < H; j++) {
      const cx = W / 2 + Math.sin(t * s1 + j * w1) * (W * a1)
                       + Math.sin(t * s2 + j * w2) * (W * a2);
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

/* ---- voxel landscape, Comanche-style: march away from the camera, and for
   each column keep the highest thing drawn so far. Painting front-to-back
   with that y-buffer is what hides the valleys behind the ridges without
   ever sorting anything. ---- */
function voxelDemo(W, H) {
  const N = 128;
  const seed = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) seed[i] = Math.random();
  const at = (x, y) => seed[((y & (N - 1)) * N) + (x & (N - 1))];
  const smooth = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return at(xi, yi) * (1 - u) * (1 - v) + at(xi + 1, yi) * u * (1 - v)
         + at(xi, yi + 1) * (1 - u) * v + at(xi + 1, yi + 1) * u * v;
  };
  /* Amplitude matters more than it looks: the noise only spans 0..1, and
     once 1/z shrinks it that's under a row of relief — a flat floor with a
     depth gradient painted on it. Frequency likewise, or the ridges are
     wider than the screen and nothing varies across x. */
  const height = (x, y) => 3.1 * (
    smooth(x * 0.13, y * 0.13) * 0.55 +
    smooth(x * 0.29, y * 0.29) * 0.28 +
    smooth(x * 0.58, y * 0.58) * 0.17
  );

  let cam = rnd(0, 400);
  const speed = rnd(0.011, 0.03), eye = rnd(3.6, 5.0), fov = rnd(3.4, 5.2);
  const ybuf = new Int32Array(W);
  return (t, dt) => {
    cam += dt * speed;
    const grid = new Array(W * H).fill(' ');
    ybuf.fill(H);
    const horizon = H * 0.26;
    /* The camera has to sit above the terrain. Let the height reach the eye
       and the nearest slice — where 1/z is largest — projects clean off the
       top of the screen and floods every column with the closest shade. */
    const EYE = eye;
    for (let z = 1.6; z < 46; z += 0.4) {
      const invz = 26 / z;
      const fog = Math.max(0.12, 1 - z / 46);
      for (let i = 0; i < W; i++) {
        const wx = ((i - W / 2) / W) * z * fov;
        const h = height(wx + 64, cam + z);
        const yScreen = Math.floor(horizon + (EYE - h) * invz);
        const top = Math.max(0, yScreen);
        /* Shade by altitude as well as distance. Distance alone gives every
           slice one tone, so ridges and valleys come out the same and the
           whole thing reads as a wall with a gradient on it. */
        const lit = fog * (0.3 + Math.min(1, h / 3.1) * 0.75);
        for (let y = top; y < ybuf[i]; y++) grid[y * W + i] = shade(lit);
        if (top < ybuf[i]) ybuf[i] = top;
      }
    }
    let s = '';
    for (let j = 0; j < H; j++) { s += grid.slice(j * W, j * W + W).join(''); s += '\n'; }
    return s;
  };
}

/* ---- water: the actual 2D wave equation, not a sine dressed up as one.
   Each cell is pulled by its neighbours against where it was last step, so
   the ripples interfere and bounce off the walls on their own. ---- */
function waterDemo(W, H) {
  const N = W * H;
  let cur = new Float32Array(N), prev = new Float32Array(N);
  let acc = 0, nextDrop = 0;
  const damp = rnd(0.962, 0.984), rate = rnd(18, 46), amp = rnd(1.2, 2.2);
  const drop = () => {
    const x = 2 + ((Math.random() * (W - 4)) | 0);
    const y = 2 + ((Math.random() * (H - 4)) | 0);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) cur[(y + dy) * W + (x + dx)] = amp;
    }
    /* rarely: drops on top of each other never resolve into rings, they
       just keep the surface at a permanent chop */
    nextDrop = rate * rnd(0.6, 1.5);
  };
  drop();
  const step = () => {
    if (--nextDrop <= 0) drop();
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const v = (cur[i - 1] + cur[i + 1] + cur[i - W] + cur[i + W]) / 2 - prev[i];
        prev[i] = v * damp;              // a little loss, or it never settles
      }
    }
    const tmp = cur; cur = prev; prev = tmp;
  };
  return (t, dt) => {
    acc += dt;
    let guard = 4;
    while (acc > 32 && guard--) { step(); acc -= 32; }
    let s = '';
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) s += shade(Math.abs(cur[j * W + i]) * 1.5);
      s += '\n';
    }
    return s;
  };
}

/* ---- copper bars. The Amiga's copper could change colour mid-scanline, so
   every demo opened with these. In one phosphor they're brightness. ---- */
function rasterbarsDemo(W, H) {
  const BARS = 3 + ((Math.random() * 5) | 0);
  const base = rnd(0.55, 1.1), spread = rnd(0.1, 0.32), off = rnd(0.8, 1.9);
  const w = rnd(1.6, 3.4), dir = rsign();
  return (t) => {
    let s = '';
    for (let j = 0; j < H; j++) {
      let v = 0;
      for (let k = 0; k < BARS; k++) {
        const c = H / 2 - 0.5 + Math.sin(t * dir * (base + k * spread) + k * off) * (H / 2 - 0.5);
        const d = Math.abs(j - c);
        if (d < w) v = Math.max(v, (1 - d / w) ** 0.65);
      }
      s += shade(v).repeat(W) + '\n';
    }
    return s;
  };
}

/* ---- Gray-Scott: two chemicals, one feeding on the other. Nothing else
   here is alive in this particular way — it grows, splits, and heals. ---- */
function grayScottDemo(W, H) {
  const N = W * H;
  const A = new Float32Array(N).fill(1), B = new Float32Array(N);
  const A2 = new Float32Array(N), B2 = new Float32Array(N);
  /* F/K is what the pattern *is*, so fixing it makes every run identical.
     But most of the parameter space is lethal or saturating, and a textbook
     name is no guarantee: the classic "mitosis" pair dies out entirely at
     this grid size, and another held for 150 frames before collapsing —
     which is worse, since it empties while you're watching it.

     The seeding has to be matched to the regime, not shared. There is no
     single seed that works for all of them: the canonical A=0.5/B=0.25 is
     what keeps the low-feed pairs alive, and it kills the high-feed ones
     outright, every single run. Seeding harder doesn't help either — flood
     the grid with B and it eats all the A and the whole field starves.

     Each row below was measured at its own seeding over 60 random layouts:
     zero deaths, none saturating. Two of them died on roughly one seed in
     ten under the shared seed, which a single trial never caught. */
  const [F, K, seedA, seedB] = rpick([
    [0.0545, 0.0620, null, 1],     // worms
    [0.0300, 0.0565, 0.5, 0.25],   // solitons
    [0.0780, 0.0610, null, 1],     // chaos
    [0.0580, 0.0650, null, 1],     // sparse spots
    [0.0340, 0.0618, 0.5, 0.25],   // slow coral
  ]);
  const DA = 1.0, DB = 0.5;
  for (let s = 0; s < 14; s++) {
    const cx = (Math.random() * W) | 0, cy = (Math.random() * H) | 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const i = (((cy + dy) + H) % H) * W + (((cx + dx) + W) % W);
        B[i] = seedB;
        if (seedA !== null) A[i] = seedA;
      }
    }
  }
  /* The weighted 9-point Laplacian, not a bare 5-point one with -4 in the
     middle. Explicit diffusion is only stable while dt*D/dx^2 <= 0.25; at
     dt=1, D=1, dx=1 the 5-point form sits at 1.0, four times over, and the
     whole field diverges to NaN on the first step and renders as nothing. */
  const step = () => {
    for (let y = 0; y < H; y++) {
      const u = ((y - 1 + H) % H) * W, m = y * W, d = ((y + 1) % H) * W;
      for (let x = 0; x < W; x++) {
        const i = m + x, l = (x - 1 + W) % W, r = (x + 1) % W;
        const lapA = 0.2 * (A[u + x] + A[d + x] + A[m + l] + A[m + r])
                   + 0.05 * (A[u + l] + A[u + r] + A[d + l] + A[d + r]) - A[i];
        const lapB = 0.2 * (B[u + x] + B[d + x] + B[m + l] + B[m + r])
                   + 0.05 * (B[u + l] + B[u + r] + B[d + l] + B[d + r]) - B[i];
        const abb = A[i] * B[i] * B[i];
        A2[i] = A[i] + (DA * lapA - abb + F * (1 - A[i]));
        B2[i] = B[i] + (DB * lapB + abb - (K + F) * B[i]);
      }
    }
    A.set(A2); B.set(B2);
  };
  return () => {
    for (let i = 0; i < 8; i++) step();
    let s = '';
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) s += shade(B[j * W + i] * 2.6);
      s += '\n';
    }
    return s;
  };
}

/* ---- shadebobs: the Amiga effect that was really just "don't clear the
   screen" — a blob adds light where it passes and the buffer only slowly
   forgets. Lissajous paths, so the trails weave. ---- */
function shadebobsDemo(W, H) {
  const N = 2 + ((Math.random() * 3) | 0);
  const bobs = Array.from({ length: N }, () => ({
    fx: rnd(0.4, 1.3) * rsign(), fy: rnd(0.6, 1.7) * rsign(),
    px: rnd(0, 6.3), py: rnd(0, 6.3),
    r: Math.max(2, Math.round(rnd(2.2, 4.4))),
  }));
  const buf = new Float32Array(W * H);
  const decay = rnd(0.94, 0.974), gain = rnd(0.1, 0.2);
  return (t) => {
    for (let i = 0; i < buf.length; i++) buf[i] *= decay;
    for (const b of bobs) {
      const ry = b.r, rx = b.r * 2;   // char cells are half as wide as tall
      const cx = W / 2 + Math.sin(t * b.fx + b.px) * (W / 2 - rx - 2);
      const cy = H / 2 + Math.sin(t * b.fy + b.py) * (H / 2 - ry - 1);
      for (let dy = -ry; dy <= ry; dy++) {
        for (let dx = -rx; dx <= rx; dx++) {
          const d = Math.hypot(dx / rx, dy / ry);
          if (d > 1) continue;
          const xi = Math.round(cx + dx), yi = Math.round(cy + dy);
          if (xi < 0 || xi >= W || yi < 0 || yi >= H) continue;
          const i = yi * W + xi;
          buf[i] = Math.min(1.5, buf[i] + gain * (1 - d));
        }
      }
    }
    let s = '';
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) s += shade(Math.min(1, buf[j * W + i]));
      s += '\n';
    }
    return s;
  };
}

/* ---- vector balls: a fibonacci sphere of dots, spun on two axes and
   breathing. Depth does the shading, the way the ball-sprite demos faked
   it with pre-shaded bobs. ---- */
function dotSphereDemo(W, H) {
  const N = 110 + ((Math.random() * 130) | 0);
  const GA = Math.PI * (3 - Math.sqrt(5));
  const pts = Array.from({ length: N }, (_, i) => {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y)), a = GA * i;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });
  const R = H * rnd(0.3, 0.42);
  const sa = rnd(0.5, 1.1) * rsign(), sb = rnd(0.3, 0.8) * rsign();
  const pa = rnd(0, 6.3), pb = rnd(0, 6.3);
  const breathe = rnd(0.15, 0.5), br = rnd(0.05, 0.2);
  const zbuf = new Float32Array(W * H);
  return (t) => {
    const grid = new Array(W * H).fill(' ');
    zbuf.fill(1e9);
    const A = t * sa + pa, B = t * sb + pb;
    const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
    const R2 = R * (1 + Math.sin(t * breathe) * br);
    for (const [px, py, pz] of pts) {
      const x = px * cA - pz * sA;
      let z = px * sA + pz * cA;
      const y = py * cB - z * sB;
      z = py * sB + z * cB;
      const d = 2.6 / (z + 3.6);
      const xi = Math.round(W / 2 + x * d * R2 * 2);
      const yi = Math.round(H / 2 + y * d * R2);
      if (xi < 0 || xi >= W || yi < 0 || yi >= H) continue;
      const i = yi * W + xi;
      if (z < zbuf[i]) {
        zbuf[i] = z;
        grid[i] = shade(0.3 + 0.7 * (0.5 - z / 2));
      }
    }
    let s = '';
    for (let j = 0; j < H; j++) { s += grid.slice(j * W, j * W + W).join(''); s += '\n'; }
    return s;
  };
}

/* ---- wormhole: rings of dots pulled past the camera down a pipe that
   itself sways, so the far end wanders off-centre the way a real tunnel
   effect's lookup table did. ---- */
function wormholeDemo(W, H) {
  const RINGS = 20 + ((Math.random() * 8) | 0);
  const PER = 10 + ((Math.random() * 8) | 0);
  const speed = rnd(0.12, 0.26), twist = rnd(0.4, 1.4) * rsign();
  const swayX = rnd(0.4, 1.0), swayY = rnd(0.5, 1.1), swayA = rnd(0.2, 0.42);
  const rings = Array.from({ length: RINGS }, (_, i) => ({ z: i / RINGS }));
  return (t, dt) => {
    const grid = new Array(W * H).fill(' ');
    for (const r of rings) {
      r.z -= speed * Math.min(60, dt) / 1000;
      if (r.z <= 0.03) r.z += 1;
    }
    const sorted = [...rings].sort((a, b) => b.z - a.z);
    for (const r of sorted) {
      const z = r.z;
      const k = 0.42 / (z + 0.1);
      const cx = W / 2 + Math.sin(t * swayX + z * 4.6) * W * swayA * z;
      const cy = H / 2 + Math.cos(t * swayY + z * 3.8) * H * swayA * 0.8 * z;
      const lit = Math.min(1, (1 - z) * 1.15);
      const ch = shade(lit * 0.9 + 0.1);
      for (let p = 0; p < PER; p++) {
        const a = (p / PER) * 6.283 + t * twist + z * 5;
        const xi = Math.round(cx + Math.cos(a) * k * H * 2);
        const yi = Math.round(cy + Math.sin(a) * k * H);
        if (xi >= 0 && xi < W && yi >= 0 && yi < H) grid[yi * W + xi] = ch;
      }
    }
    let s = '';
    for (let j = 0; j < H; j++) { s += grid.slice(j * W, j * W + W).join(''); s += '\n'; }
    return s;
  };
}

/* ---- the checkerboard floor every cracktro scrolled something over.
   Perspective is the honest 1/y kind; the sway is the camera drifting,
   not the floor. ---- */
function checkerFloorDemo(W, H) {
  const horizon = rnd(0.24, 0.4);
  const spd = rnd(1.2, 3.0) * rsign(), size = rnd(0.7, 1.4);
  const sway = rnd(0.2, 1.1), swayS = rnd(0.25, 0.7);
  const persp = rnd(5, 9);
  return (t) => {
    let s = '';
    const hy = (H * horizon) | 0;
    const K = H * 1.1;
    for (let j = 0; j < H; j++) {
      if (j <= hy) {
        /* a thin airglow right on the horizon, then empty sky */
        s += (j === hy ? '.'.repeat(W) : ' '.repeat(W)) + '\n';
        continue;
      }
      const z = persp / (j - hy);
      const fog = Math.max(0, 1 - z / persp);
      const drift = Math.sin(t * swayS) * sway * z;
      let row = '';
      for (let i = 0; i < W; i++) {
        const u = ((i - W / 2) * z) / K + drift;
        const v = z / size + t * spd;
        const check = (Math.floor(u / size) + Math.floor(v)) & 1;
        row += shade((check ? 0.9 : 0.22) * fog);
      }
      s += row + '\n';
    }
    return s;
  };
}

/* ---- fireworks: rockets with real ballistics. x-velocities are doubled
   everywhere because a char cell is half as wide as it is tall — without
   that every burst comes out as a tall ellipse. ---- */
function fireworksDemo(W, H) {
  const parts = [];
  let fuse = 0.4;
  const g = rnd(8, 13), rate = rnd(0.6, 1.4);
  return (t, dt) => {
    const step = Math.min(60, dt) / 1000;
    fuse -= step;
    if (fuse <= 0 && parts.length < 700) {
      fuse = rnd(0.25, 1.0) / rate;
      const apex = H * rnd(0.45, 0.8);
      parts.push({
        x: rnd(W * 0.15, W * 0.85), y: H + 1,
        vx: rnd(-2.5, 2.5) * 2, vy: -Math.sqrt(2 * g * 0.35 * apex),
        rocket: true, life: 2, decay: 0.25,
      });
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx * step; p.y += p.vy * step;
      p.vy += g * step * (p.rocket ? 0.35 : 1);
      p.life -= step * p.decay;
      if (p.rocket && p.vy >= -1.2) {
        const n = 34 + ((Math.random() * 44) | 0);
        const pow = rnd(5, 11);
        for (let k = 0; k < n; k++) {
          const a = Math.random() * 6.283, sp = pow * (0.3 + Math.random() * 0.7);
          parts.push({
            x: p.x, y: p.y,
            vx: Math.cos(a) * sp * 2, vy: Math.sin(a) * sp * 0.6,
            rocket: false, life: 1, decay: rnd(0.35, 0.8),
          });
        }
        parts.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || p.y > H + 2) parts.splice(i, 1);
    }
    const grid = new Array(W * H).fill(' ');
    for (const p of parts) {
      const xi = Math.round(p.x), yi = Math.round(p.y);
      if (xi < 0 || xi >= W || yi < 0 || yi >= H) continue;
      grid[yi * W + xi] = p.rocket ? '|' : shade(Math.max(0.08, p.life));
    }
    let s = '';
    for (let j = 0; j < H; j++) { s += grid.slice(j * W, j * W + W).join(''); s += '\n'; }
    return s;
  };
}

/* ---- tesseract: the cube's big sibling. Sixteen ±1 vertices in 4D,
   edges wherever exactly one coordinate differs, spun through three
   planes and projected twice — w-divide, then z-divide. ---- */
function tesseractDemo(W, H) {
  const V = [];
  for (let i = 0; i < 16; i++) {
    V.push([(i & 1) * 2 - 1, ((i >> 1) & 1) * 2 - 1, ((i >> 2) & 1) * 2 - 1, ((i >> 3) & 1) * 2 - 1]);
  }
  const E = [];
  for (let i = 0; i < 16; i++) {
    for (let b = 0; b < 4; b++) { const j = i ^ (1 << b); if (j > i) E.push([i, j]); }
  }
  const s1 = rnd(0.25, 0.7) * rsign(), s2 = rnd(0.35, 0.85) * rsign(), s3 = rnd(0.15, 0.5) * rsign();
  const p1 = rnd(0, 6.3), p2 = rnd(0, 6.3), p3 = rnd(0, 6.3);
  const scale = H * rnd(0.6, 0.85);
  return (t) => {
    const a = t * s1 + p1, b = t * s2 + p2, c = t * s3 + p3;
    const ca = Math.cos(a), sa = Math.sin(a);
    const cb = Math.cos(b), sb = Math.sin(b);
    const cc = Math.cos(c), sc = Math.sin(c);
    const proj = V.map(([x, y, z, w]) => {
      /* xw, then yz, then xy — three planes is what makes the inner cube
         tumble instead of just spinning in place */
      let X = x * ca - w * sa, Wc = x * sa + w * ca;
      let Y = y * cb - z * sb, Z = y * sb + z * cb;
      const X2 = X * cc - Y * sc, Y2 = X * sc + Y * cc;
      const d4 = 2.0 / (2.8 - Wc);
      const x3 = X2 * d4, y3 = Y2 * d4, z3 = Z * d4;
      const d3 = 3.0 / (z3 + 4.2);
      return [W / 2 + x3 * d3 * scale * 2, H / 2 + y3 * d3 * scale, (d4 * d3)];
    });
    const grid = new Array(W * H).fill(' ');
    const plot = (x, y, ch) => {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi >= 0 && xi < W && yi >= 0 && yi < H) grid[yi * W + xi] = ch;
    };
    for (const [i, j] of E) {
      const [x0, y0, w0] = proj[i], [x1, y1, w1] = proj[j];
      const ch = shade(Math.min(1, (w0 + w1) * 0.42));
      const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0) * 2)) || 1;
      const dx = (x1 - x0) / steps, dy = (y1 - y0) / steps;
      for (let s = 0; s <= steps; s++) plot(x0 + dx * s, y0 + dy * s, ch);
    }
    let s = '';
    for (let j = 0; j < H; j++) { s += grid.slice(j * W, j * W + W).join(''); s += '\n'; }
    return s;
  };
}

/* ---- digital rain. The old canvas version rained katakana; a <pre>
   grid can't — full-width glyphs are wider than a cell and shear the
   whole column grid — so this one rains what the tube actually owns,
   and glyphs decay through punctuation as they age instead of fading. ---- */
function matrixDemo(W, H) {
  const FRESH = 'TZAKMN0123456789XKRWBQ$#@%&';
  const MID = '=+*:;!?7412';
  const OLD = '.,:\'';
  /* born mid-fall: columns start scattered through the screen with their
     trails already grown, so the rain is raining from frame one */
  const cols = Array.from({ length: W }, () => {
    const len = 5 + ((Math.random() * 16) | 0);
    const y = rnd(-H * 1.5, H);
    const chars = [];
    if (y > 0) {
      const n = Math.min(len, Math.ceil(y) + 1);
      for (let k = 0; k < n; k++) chars.push(FRESH[(Math.random() * FRESH.length) | 0]);
    }
    return { y, speed: rnd(0.25, 1.05), len, chars };
  });
  return (t, dt) => {
    const grid = new Array(W * H).fill(' ');
    const step = Math.min(60, dt) / 16.7;
    for (let i = 0; i < W; i++) {
      const c = cols[i];
      const prev = Math.floor(c.y);
      c.y += c.speed * step;
      const row = Math.floor(c.y);
      if (row !== prev) {
        c.chars.unshift(FRESH[(Math.random() * FRESH.length) | 0]);
        if (c.chars.length > c.len) c.chars.length = c.len;
      }
      if (c.chars.length && Math.random() < 0.05) {
        c.chars[(Math.random() * c.chars.length) | 0] = FRESH[(Math.random() * FRESH.length) | 0];
      }
      for (let k = 0; k < c.chars.length; k++) {
        const y = row - k;
        if (y < 0 || y >= H) continue;
        const age = k / c.len;
        let ch = c.chars[k];
        if (age > 0.75) ch = OLD[(y * 7 + i) % OLD.length];
        else if (age > 0.45) ch = MID[(y * 5 + i * 3) % MID.length];
        grid[y * W + i] = ch;
      }
      if (row - c.chars.length > H && Math.random() < 0.04) {
        c.y = -Math.random() * 14;
        c.speed = rnd(0.25, 1.05);
        c.len = 5 + ((Math.random() * 16) | 0);
        c.chars = [];
      }
    }
    let s = '';
    for (let j = 0; j < H; j++) { s += grid.slice(j * W, j * W + W).join(''); s += '\n'; }
    return s;
  };
}

/* ---- the dead channel: snow, a hum bar crawling through, and the odd
   frame tear. The one effect that isn't computed so much as permitted. ---- */
function staticDemo(W, H) {
  const barSpd = rnd(2, 6) * rsign(), barW = rnd(2.5, 6);
  const grain = rnd(0.35, 0.7);
  const range = H + barW * 2;
  return (t) => {
    let s = '';
    const barY = ((((t * barSpd) % range) + range) % range) - barW;
    for (let j = 0; j < H; j++) {
      const lift = Math.max(0, 1 - Math.abs(j - barY) / barW) * 0.4;
      /* a tear shears the whole row sideways for a frame */
      const tear = Math.random() < 0.012 ? ((Math.random() * 7) | 0) - 3 : 0;
      let row = '';
      for (let i = 0; i < W; i++) {
        const v = Math.random() * grain + lift;
        row += shade(Math.random() < 0.03 ? Math.min(1, v * 2.2) : v);
      }
      s += (tear ? row.slice(-tear) + row.slice(0, -tear) : row) + '\n';
    }
    return s;
  };
}

const DEMOS = [
  /* --- fields --- */
  { name: 'plasma', make: field(() => {
      const a = rnd(2.5, 5.5), b = rnd(3.5, 6.5), c = rnd(2, 4.5), d = rnd(5, 9);
      const s1 = rnd(0.7, 1.5) * rsign(), s2 = rnd(0.5, 1.1) * rsign();
      const s3 = rnd(0.9, 1.6) * rsign(), s4 = rnd(1.2, 2.2) * rsign();
      const p1 = rnd(0, 6.3), p2 = rnd(0, 6.3);
      return (x, y, t) => (
        Math.sin(x * a + t * s1 + p1) + Math.sin(y * b + t * s2)
        + Math.sin((x + y) * c + t * s3 + p2) + Math.sin(Math.hypot(x, y) * d + t * s4) + 4) / 8;
    }) },

  { name: 'tunnel', make: field(() => {
      const depth = rnd(0.35, 0.7), rings = rnd(3.5, 7), arms = (rnd(4, 9) | 0);
      const zs = rnd(2, 4) * rsign(), as = rnd(0.6, 1.6) * rsign();
      return (x, y, t) => {
        const r = Math.hypot(x, y) + 1e-3;
        const v = Math.sin(depth / r * rings + t * zs) * 0.5
                + Math.sin(Math.atan2(y, x) * arms + t * as) * 0.5;
        return (v + 1) / 2 * Math.min(1, r * 3.5);
      };
    }) },

  /* the blobs are sized in y-units but spread across x, so they have to
     ride hw or they drift off the side of a wide tube */
  { name: 'metaballs', make: field(() => {
      const n = 3 + ((Math.random() * 4) | 0);
      const b = Array.from({ length: n }, (_, i) => ({
        sx: rnd(0.45, 0.95), sy: rnd(0.2, 0.4),
        fx: rnd(0.4, 1.1) * rsign(), fy: rnd(0.3, 0.9) * rsign(),
        px: rnd(0, 6.3), py: rnd(0, 6.3),
      }));
      const gain = rnd(0.024, 0.042);
      return (x, y, t, hw) => {
        let s = 0;
        for (const o of b) {
          const bx = Math.sin(t * o.fx + o.px) * hw * o.sx;
          const by = Math.cos(t * o.fy + o.py) * o.sy;
          s += gain / ((x - bx) ** 2 + (y - by) ** 2 + 0.003);
        }
        return Math.min(1, s * 0.6);
      };
    }) },

  { name: 'ripples', make: field(() => {
      const n = 2 + ((Math.random() * 4) | 0);
      const src = Array.from({ length: n }, () => ({
        x: rnd(-0.85, 0.85), y: rnd(-0.38, 0.38), ph: rnd(0, 6.3),
      }));
      const k = rnd(11, 22), spd = rnd(2.5, 5.5) * rsign(), fall = rnd(1.2, 2.4);
      return (x, y, t, hw) => {
        let s = 0;
        for (const o of src) {
          const d = Math.hypot(x - o.x * hw, y - o.y);
          s += Math.sin(d * k - t * spd + o.ph) / (1 + d * fall);
        }
        /* crests only — a trough landing on mid-grey paints the background flat */
        return Math.max(0, s);
      };
    }) },

  { name: 'moire', make: field(() => {
      const k = rnd(16, 30), sep = rnd(0.3, 0.62), spd = rnd(0.35, 0.9) * rsign();
      return (x, y, t, hw) => {
        const o = Math.sin(t * spd) * hw * sep;
        return (Math.sin(Math.hypot(x - o, y) * k) * Math.sin(Math.hypot(x + o, y) * k) + 1) / 2;
      };
    }) },

  { name: 'vortex', make: field(() => {
      const twist = rnd(2.5, 6), arms = (rnd(2, 5) | 0), rings = rnd(6, 11);
      const s1 = rnd(1, 2.2) * rsign(), s2 = rnd(1.3, 2.6) * rsign();
      return (x, y, t) => {
        const r = Math.hypot(x, y);
        return (Math.sin((Math.atan2(y, x) + r * twist - t * s1) * arms) * Math.cos(r * rings - t * s2) + 1) / 2;
      };
    }) },

  { name: 'mandelbrot', make: field(() => {
      /* orbit one of several known-interesting points so the zoom never
         lands on a void, but not the same one every time */
      const [ox, oy] = rpick([
        [-0.743643887, 0.131825904], [-0.16, 1.0405], [-1.25066, 0.02012],
        [0.001643721971153, 0.822467633298876], [-0.7453, 0.1127],
      ]);
      const spd = rnd(0.16, 0.3), start = rnd(0, 7), MAX = 60 + ((Math.random() * 30) | 0);
      return (x, y, t) => {
        const zoom = Math.pow(2, 1 + ((start + t * spd) % 7));
        const cx = ox + x * 3 / zoom, cy = oy + y * 3 / zoom;
        let zr = 0, zi = 0, i = 0;
        while (zr * zr + zi * zi < 4 && i < MAX) {
          const tr = zr * zr - zi * zi + cx;
          zi = 2 * zr * zi + cy; zr = tr; i++;
        }
        return i >= MAX ? 0 : (i / MAX) ** 0.55;
      };
    }) },

  { name: 'julia', make: field(() => {
      /* c walks the cardioid, so the set breathes instead of just sitting.
         The body is drawn solid and the escape time is curved hard: mapping
         it linearly against 60 iterations puts almost every outside point in
         the first ramp step, which leaves the set as a thin outline on
         black — dark inside, dark outside, and only the boundary visible. */
      const MAX = 36 + ((Math.random() * 16) | 0);
      const rad = rnd(0.72, 0.8), spd = rnd(0.2, 0.45) * rsign();
      const ph = rnd(0, 6.3), zoom = rnd(1.25, 1.8);
      return (x, y, t) => {
        const cr = rad * Math.cos(t * spd + ph), ci = rad * Math.sin(t * spd + ph);
        let zr = x * zoom, zi = y * zoom, i = 0;
        while (zr * zr + zi * zi < 4 && i < MAX) {
          const tr = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci; zr = tr; i++;
        }
        return i >= MAX ? 1 : (i / MAX) ** 0.35;
      };
    }) },

  { name: 'boing', make: field(() => {
      /* the Amiga ball: checkered sphere, spinning as it goes */
      const R = rnd(0.26, 0.36), sx = rnd(0.9, 1.6), sy = rnd(1.6, 2.6);
      const spin = rnd(1.4, 3) * rsign(), cu = rnd(1.8, 3.2), cv = rnd(2.4, 4.2);
      return (x, y, t, hw) => {
        const bx = Math.sin(t * sx) * (hw - R - 0.03);
        const by = 0.16 - Math.abs(Math.sin(t * sy)) * 0.32;
        const dx = x - bx, dy = y - by;
        const r = Math.hypot(dx, dy);
        if (r > R) return 0;
        const nz = Math.sqrt(1 - (r / R) ** 2);
        const u = Math.atan2(dx / R, nz) + t * spin;
        const v = Math.asin(Math.max(-1, Math.min(1, dy / R)));
        const check = (Math.floor(u * cu) + Math.floor(v * cv)) & 1;
        /* a little shading so it reads as a ball and not a disc */
        return (check ? 0.95 : 0.4) * (0.55 + nz * 0.45);
      };
    }) },

  /* --- everything that needs to remember something --- */
  { name: 'fire',       make: fireDemo },
  { name: 'shadebobs',  make: shadebobsDemo },
  { name: 'vector balls', make: dotSphereDemo },
  { name: 'wormhole',   make: wormholeDemo },
  { name: 'checkerfloor', make: checkerFloorDemo },
  { name: 'fireworks',  make: fireworksDemo },
  { name: 'tesseract',  make: tesseractDemo },
  { name: 'static',     make: staticDemo },
  { name: 'matrix',     make: matrixDemo },
  { name: 'donut',      make: donutDemo },
  { name: 'rotozoom',   make: rotozoomDemo },
  { name: 'scroller',   make: scrollerDemo },
  { name: 'twister',    make: twisterDemo },
  { name: 'kefrens',    make: kefrensDemo },
  { name: 'voxel',      make: voxelDemo },
  { name: 'water',      make: waterDemo },
  { name: 'copper bars', make: rasterbarsDemo },
  { name: 'gray-scott', make: grayScottDemo },
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

function DemoFX({ fill, name }) {
  const ref = useRef(null);
  const pick = useRef(null);
  if (!pick.current) {
    pick.current = (name && DEMOS.find(d => d.name === name))
      || DEMOS[(Math.random() * DEMOS.length) | 0];
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { make } = pick.current;
    let W = 0, H = 0, draw = null;

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
      /* In fill mode the effect owns the whole raster, so the row count
         comes from the box instead of DEMO_ROWS — clamped, because the
         stateful demos cost W*H per frame. */
      const rowH = parseFloat(getComputedStyle(el).fontSize) || 13;
      const nextH = fill
        ? Math.max(16, Math.min(80, Math.floor(el.clientHeight / rowH)))
        : DEMO_ROWS;
      /* the effects size their buffers to W, so a resize has to rebuild
         them — and that necessarily restarts anything stateful */
      if (next !== W || nextH !== H) { W = next; H = nextH; draw = make(W, H); }
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
    <div className={`demo ${fill ? 'demo-fill' : ''}`}>
      <pre className="demo-out" ref={ref} aria-hidden="true" />
      <span className="demo-tag dim">{pick.current.name}</span>
    </div>
  );
}

/* ==================== screensaver ====================
   After Dark, minus the toasters: leave the tube alone long enough and a
   random demo takes the whole raster — which is also what the burn-in
   layer pretends this machine never had. Any input hands the phosphor
   back. Rotates to a fresh effect on a timer, the way a saver that ran
   all night would. */

const SAVER_ROTATE_MS = 45000;

function Screensaver({ onWake }) {
  const [gen, setGen] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => setGen(g => g + 1), SAVER_ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    /* capture + stopPropagation: the keystroke that wakes the saver must
       not also type into the prompt or fire an F-key binding */
    const wakeKey = (e) => { e.preventDefault(); e.stopPropagation(); onWake(); };
    const wake = () => onWake();
    window.addEventListener('keydown', wakeKey, true);
    window.addEventListener('pointerdown', wake, true);
    window.addEventListener('pointermove', wake, true);
    window.addEventListener('touchstart', wake, true);
    return () => {
      window.removeEventListener('keydown', wakeKey, true);
      window.removeEventListener('pointerdown', wake, true);
      window.removeEventListener('pointermove', wake, true);
      window.removeEventListener('touchstart', wake, true);
    };
  }, [onWake]);

  return (
    <div className="screensaver">
      <DemoFX key={gen} fill />
      <div className="saver-hint">any key wakes the tube</div>
    </div>
  );
}

/* ==================== tzm-paint ====================
   An ASCII studio living inside the tube. Not a toy version of a paint
   program — a paint program whose medium is the phosphor itself: the
   airbrush lays down beam intensity, the pen writes glyphs, and the fire
   brush paints fuel that keeps burning for as long as you watch it.
   Mirror modes because half of demoscene logos were made that way.

   The art survives closing the app (kept per session, same tube size),
   and `copy` puts the raw text on the clipboard — it's ASCII, take it. */

const PAINT_KEEP = { W: 0, H: 0, ink: null, chars: null, fuel: null };
const PEN_CHARS = ['#', '@', '%', '*', '+', '=', '·', '"', '.'];
const GLITCH_CHARS = '!<>-_\\/[]{}=+*^?#$%&@:;'.split('');
const PAINT_TOOLS = ['air', 'pen', 'fire', 'glitch', 'erase'];
const MIRRORS = ['off', 'x', 'y', 'xy'];

function PaintStudio({ onExit, click }) {
  const snd = () => { if (click) click(); };
  const preRef = useRef(null);
  const [tool, setTool] = useState('air');
  const [mirror, setMirror] = useState('off');
  const [penIdx, setPenIdx] = useState(0);
  const [msg, setMsg] = useState('');
  /* refs so the pointer handlers and rAF loop never go stale */
  const toolRef = useRef(tool); toolRef.current = tool;
  const mirrorRef = useRef(mirror); mirrorRef.current = mirror;
  const penRef = useRef(penIdx); penRef.current = penIdx;
  const drawing = useRef(false);
  const lastCell = useRef(null);
  const msgTimer = useRef(0);
  const S = useRef({ W: 0, H: 0, ink: null, chars: null, fuel: null, heat: null, cw: 8, rh: 20 }).current;

  useEffect(() => {
    const el = preRef.current;
    if (!el) return;

    const measure = () => {
      const span = document.createElement('span');
      span.textContent = 'M'.repeat(50);
      span.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
      el.appendChild(span);
      const r = span.getBoundingClientRect();
      const cw = r.width / 50, rh = r.height || 20;
      span.remove();
      if (cw <= 0.5) return;
      const W = Math.max(24, Math.min(260, Math.floor(el.clientWidth / cw)));
      const H = Math.max(12, Math.min(90, Math.floor(el.clientHeight / rh)));
      S.cw = cw; S.rh = rh;
      if (W === S.W && H === S.H) return;
      S.W = W; S.H = H;
      if (PAINT_KEEP.W === W && PAINT_KEEP.H === H && PAINT_KEEP.ink) {
        /* same tube, same canvas — the session's art comes back */
        S.ink = PAINT_KEEP.ink; S.chars = PAINT_KEEP.chars; S.fuel = PAINT_KEEP.fuel;
      } else {
        S.ink = new Float32Array(W * H);
        S.fuel = new Uint8Array(W * H);
        S.chars = new Array(W * H).fill('');
      }
      S.heat = new Float32Array(W * (H + 1));
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    let raf = 0, running = true, last = 0;
    const frame = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return;
      last = now;
      const { W, H, ink, chars, fuel, heat } = S;
      if (!W) return;
      /* the fire pass: fuel burns at full heat, flame climbs off it with
         sideways drift and cooling — same physics as the fire demo */
      for (let j = H - 1; j >= 0; j--) {
        for (let i = 0; i < W; i++) {
          const idx = j * W + i;
          if (fuel[idx]) { heat[idx] = 1; continue; }
          const drift = ((Math.random() * 3) | 0) - 1;
          const si = Math.min(W - 1, Math.max(0, i + drift));
          const v = heat[(j + 1) * W + si] - (0.14 + Math.random() * 0.12);
          heat[idx] = v > 0 ? v : 0;
        }
      }
      let s = '';
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const idx = j * W + i;
          const glow = ink[idx] > heat[idx] ? ink[idx] : heat[idx];
          s += chars[idx] || (glow > 0 ? shade(Math.min(1, glow)) : ' ');
        }
        s += '\n';
      }
      el.textContent = s;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      PAINT_KEEP.W = S.W; PAINT_KEEP.H = S.H;
      PAINT_KEEP.ink = S.ink; PAINT_KEEP.chars = S.chars; PAINT_KEEP.fuel = S.fuel;
    };
  }, []);

  /* esc leaves the studio — captured so it can't reach the shell */
  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onExit(); }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onExit]);

  const stampAt = useCallback((cx, cy) => {
    const { W, H, ink, chars, fuel } = S;
    if (!W || cx < 0 || cx >= W || cy < 0 || cy >= H) return;
    const t = toolRef.current, m = mirrorRef.current;
    const spots = [[cx, cy]];
    if (m === 'x' || m === 'xy') spots.push([W - 1 - cx, cy]);
    if (m === 'y' || m === 'xy') spots.push([cx, H - 1 - cy]);
    if (m === 'xy') spots.push([W - 1 - cx, H - 1 - cy]);
    for (const [x, y] of spots) {
      if (t === 'pen') {
        const idx = y * W + x;
        if (idx >= 0 && idx < W * H) chars[idx] = PEN_CHARS[penRef.current];
      } else if (t === 'air') {
        const R = 3;
        for (let dy = -R; dy <= R; dy++) {
          for (let dx = -R * 2; dx <= R * 2; dx++) {
            const xi = x + dx, yi = y + dy;
            if (xi < 0 || xi >= W || yi < 0 || yi >= H) continue;
            const d = Math.hypot(dx / (R * 2), dy / R);
            if (d > 1) continue;
            const idx = yi * W + xi;
            ink[idx] = Math.min(1.15, ink[idx] + 0.16 * (1 - d) * (1 - d));
          }
        }
      } else if (t === 'fire') {
        for (let dy = 0; dy <= 1; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const xi = x + dx, yi = y + dy;
            if (xi >= 0 && xi < W && yi >= 0 && yi < H) fuel[yi * W + xi] = 1;
          }
        }
      } else if (t === 'glitch') {
        for (let k = 0; k < 5; k++) {
          const xi = x + ((Math.random() * 9) | 0) - 4;
          const yi = y + ((Math.random() * 5) | 0) - 2;
          if (xi >= 0 && xi < W && yi >= 0 && yi < H) {
            chars[yi * W + xi] = GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0];
          }
        }
      } else if (t === 'erase') {
        const R = 3;
        for (let dy = -R; dy <= R; dy++) {
          for (let dx = -R * 2; dx <= R * 2; dx++) {
            const xi = x + dx, yi = y + dy;
            if (xi < 0 || xi >= W || yi < 0 || yi >= H) continue;
            if (Math.hypot(dx / (R * 2), dy / R) > 1) continue;
            const idx = yi * W + xi;
            ink[idx] = 0; fuel[idx] = 0; chars[idx] = '';
          }
        }
      }
    }
  }, []);

  const cellOf = (e) => {
    const el = preRef.current;
    if (!el) return [0, 0];
    const r = el.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / S.cw), Math.floor((e.clientY - r.top) / S.rh)];
  };

  /* a fast stroke lands as a line, not confetti — walk the segment */
  const strokeTo = (x, y) => {
    const from = lastCell.current || [x, y];
    const steps = Math.max(Math.abs(x - from[0]), Math.abs(y - from[1])) || 1;
    for (let i = 1; i <= steps; i++) {
      stampAt(Math.round(from[0] + (x - from[0]) * i / steps),
              Math.round(from[1] + (y - from[1]) * i / steps));
    }
    lastCell.current = [x, y];
  };

  const onDown = (e) => {
    e.preventDefault();
    if (preRef.current && e.pointerId !== undefined) {
      try { preRef.current.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    }
    drawing.current = true;
    lastCell.current = null;
    strokeTo(...cellOf(e));
  };
  const onMove = (e) => { if (drawing.current) strokeTo(...cellOf(e)); };
  const onUp = () => { drawing.current = false; lastCell.current = null; };

  const flash = (m) => {
    setMsg(m);
    clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(''), 1800);
  };

  const clearAll = () => {
    if (S.ink) { S.ink.fill(0); S.fuel.fill(0); S.chars.fill(''); }
    flash('wiped. the phosphor forgives.');
  };

  const save = async () => {
    const txt = preRef.current ? preRef.current.textContent : '';
    try {
      await navigator.clipboard.writeText(txt);
      flash('copied — raw ascii, frame it');
    } catch (err) {
      flash('clipboard said no');
    }
  };

  return (
    <div className="paint">
      <div className="paint-bar">
        <span className="paint-title">tzm-paint</span>
        {PAINT_TOOLS.map((tl) => (
          <button
            key={tl}
            className={`pbtn ${tool === tl ? 'on' : ''}`}
            onClick={() => { snd(); setTool(tl); }}
          >{tl}</button>
        ))}
        <button
          className="pbtn"
          onClick={() => { snd(); setPenIdx((penIdx + 1) % PEN_CHARS.length); }}
          title="pen glyph"
        >[{PEN_CHARS[penIdx]}]</button>
        <button
          className="pbtn"
          onClick={() => { snd(); setMirror(MIRRORS[(MIRRORS.indexOf(mirror) + 1) % MIRRORS.length]); }}
        >mir:{mirror}</button>
        <span className="paint-spacer"></span>
        <button className="pbtn" onClick={() => { snd(); clearAll(); }}>clear</button>
        <button className="pbtn" onClick={() => { snd(); save(); }}>copy</button>
        <button className="pbtn warn" onClick={() => { snd(); onExit(); }}>exit</button>
      </div>
      <pre
        className="paint-canvas"
        ref={preRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      <div className="paint-foot">
        {msg || 'draw with anything that points · fire keeps burning · esc exits'}
      </div>
    </div>
  );
}

/* ==================== the whisper ====================
   Leave the monitor off long enough and someone starts typing on it.
   The film played this on a sleeping screen too — the tube is dark, the
   LED says standby, and the text glows anyway. It goes further than the
   script did: after the rabbit, a trace program reads out what it can
   see of *you* — all of it straight off the browser, nothing sent
   anywhere. Any key kills it, which is exactly what Neo did. */

function MatrixWhisper({ tick, onDone }) {
  const [line, setLine] = useState('');
  const [trace, setTrace] = useState([]);
  const [critterX, setCritterX] = useState(-1);
  const [pills, setPills] = useState(false);
  const critter = useRef('(\\_/)');
  const pillResolve = useRef(null);

  const choose = (c) => {
    if (pillResolve.current) {
      const res = pillResolve.current;
      pillResolve.current = null;
      res(c);
    }
  };

  /* while the pills are up, r/b answer the question instead of waking
     the tube; every other key still bails out, exactly like the film */
  useEffect(() => {
    const k = (e) => {
      if (!pillResolve.current) return;
      const key = e.key.toLowerCase();
      if (key === 'g' || key === '1') { e.preventDefault(); e.stopPropagation(); choose('green'); }
      else if (key === 'b' || key === '2') { e.preventDefault(); e.stopPropagation(); choose('blue'); }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);

  useEffect(() => {
    let alive = true;
    const timers = [];
    const wait = (ms) => new Promise((res) => { timers.push(setTimeout(res, ms)); });

    (async () => {
      let cur = '';
      const put = () => { if (alive) setLine(cur); };
      /* whoever is typing is human: sometimes they miss a key, notice,
         and back over it */
      const type = async (text, spd = 90) => {
        for (const ch of text) {
          if (!alive) return;
          if (ch !== ' ' && spd > 50 && Math.random() < 0.04) {
            cur += 'qwertyuiopasdfghjklzxcvbnm'[(Math.random() * 26) | 0];
            put(); if (tick) tick();
            await wait(spd * 2.2);
            cur = cur.slice(0, -1); put();
            await wait(spd * 1.4);
          }
          cur += ch; put();
          if (tick) tick();
          await wait(spd + Math.random() * 90);
        }
      };
      const erase = async (spd = 26) => {
        while (cur.length) {
          if (!alive) return;
          cur = cur.slice(0, -1); put();
          await wait(spd);
        }
      };

      /* -- every visit gets a different séance -- */
      const NAME = rpick(['guest', 'operator', 'stranger']);
      const opener = rpick([
        [`Wake up, ${NAME}...`, 'The Matrix has you...', 'Follow the white rabbit.'],
        [`I know you're there, ${NAME}.`, 'I watched you hit the power switch.', 'It never does what you think. Look —'],
        ['+++ CARRIER DETECTED', `dialing you back, ${NAME}...`, 'this line was never hung up.'],
      ]);
      /* the white rabbit, usually. this house also has cats. */
      critter.current = rpick(['(\\_/)', '(\\_/)', '(=^.^=)']);

      await wait(1600);
      for (let i = 0; i < opener.length; i++) {
        await type(opener[i]);
        await wait(i === opener.length - 1 ? 600 : 1900);
        if (i < opener.length - 1) { await erase(); await wait(800); }
      }
      for (let x = -6; x <= 104 && alive; x += 2.4) {
        setCritterX(x);
        await wait(46);
      }
      setCritterX(-1);
      await wait(400); await erase(); await wait(900);

      await type(`Knock, knock, ${NAME}.`);
      await wait(2100); await erase(); await wait(700);

      if (Math.random() < 0.4) {
        /* -- the choice. green is this tube's whole world; blue is the
           only foreign colour it has ever shown -- */
        await type('green pill, or blue pill?', 75);
        if (!alive) return;
        setPills(true);
        const choice = await new Promise((res) => {
          pillResolve.current = res;
          timers.push(setTimeout(() => choose('slow'), 30000));
        });
        setPills(false);
        if (!alive) return;
        if (choice === 'green') { await wait(400); if (alive) onDone('green'); return; }
        if (choice === 'blue') {
          cur = ''; put();
          await type('goodbye.', 130);
          await wait(1600);
          if (alive) onDone('blue');
          return;
        }
        cur = ''; put();
        await type('...too slow. the rabbit is gone.', 60);
        await wait(1800);
        if (alive) onDone('slow');
        return;
      }

      /* -- or: the trace turns around and reads the reader -- */
      await type('> trace program: running', 34);
      const nav = navigator;
      const info = [
        `> node ......... ${(nav.userAgentData && nav.userAgentData.platform) || nav.platform || 'unknown'}`,
        `> viewport ..... ${window.innerWidth}x${window.innerHeight} @ ${window.devicePixelRatio || 1}x`,
        `> lang ......... ${nav.language || '??'}`,
        `> tz ........... ${Intl.DateTimeFormat().resolvedOptions().timeZone || 'nowhere'}`,
        `> threads ...... ${nav.hardwareConcurrency || '?'} cores`,
        `> uplink ....... ${nav.onLine ? 'alive' : 'severed'}`,
      ];
      for (const l of info) {
        if (!alive) return;
        setTrace((a) => [...a, l]);
        if (tick) tick();
        await wait(260);
      }
      await wait(1100);
      cur = ''; put();
      await type(rpick([
        '> you are already inside.',
        '> there is no monitor.',
        '> the signal was never off.',
      ]), 65);
      await wait(2400);
      if (alive) onDone('trace');
    })();

    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);

  return (
    <div className="whisper">
      <div className="whisper-line">{line}<span className="cursor">{'█'}</span></div>
      {trace.length > 0 && (
        <div className="whisper-trace">
          {trace.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
      {pills && (
        <div className="whisper-pills" onTouchStart={(e) => e.stopPropagation()}>
          <button className="pill green" onClick={(e) => { e.stopPropagation(); choose('green'); }}>[ green ]</button>
          <button className="pill blue" onClick={(e) => { e.stopPropagation(); choose('blue'); }}>[ blue ]</button>
          <span className="pill-hint">g / b</span>
        </div>
      )}
      {critterX >= 0 && (
        <div className="whisper-rabbit" style={{ left: `${critterX}%` }}>{critter.current}</div>
      )}
    </div>
  );
}

/* ==================== the wake intro ====================
   The site opens the way the film did: a dark tube, someone typing at
   you. Two lines, a few seconds, and the BIOS takes over — and like
   everything in the boot, one tap skips straight to the shell. */

function WakeIntro({ onDone, tick }) {
  const [txt, setTxt] = useState('');
  const [out, setOut] = useState(false);

  useEffect(() => {
    let alive = true;
    const timers = [];
    const wait = (ms) => new Promise((res) => { timers.push(setTimeout(res, ms)); });

    (async () => {
      let cur = '';
      const type = async (text, spd = 52) => {
        for (const ch of text) {
          if (!alive) return;
          cur += ch; setTxt(cur);
          /* the same ghost keystrokes the whisper makes — though on a
             fresh visit the browser keeps audio locked until the first
             touch, so the very first line may play silent */
          if (tick) tick();
          await wait(spd + Math.random() * 45);
        }
      };
      const erase = async () => {
        while (cur.length) {
          if (!alive) return;
          cur = cur.slice(0, -1); setTxt(cur);
          await wait(15);
        }
      };
      await wait(900);
      await type('Wake up...');
      await wait(1100); await erase(); await wait(350);
      await type('The Matrix has you.');
      await wait(1200);
      /* the line doesn't fade — the signal carrying it tears */
      if (!alive) return;
      setOut(true);
      await wait(380);
      if (alive) onDone();
    })();

    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);

  return (
    <div className={`wake-intro ${out ? 'out' : ''}`} aria-hidden="true">
      {txt}<span className="cursor">{'█'}</span>
    </div>
  );
}

/* ==================== dust motes ====================
   The room's dust, drifting through the cone of light in front of the
   glass. They live outside the raster — the tube doesn't draw them, it
   only illuminates them — and they're the one thing here allowed to
   move without the beam's permission. Desktop-only: a phone gets held
   too close for floating dust to read as anything but dirt. */

function Motes({ room }) {
  const motes = useMemo(() => {
    if (prefersReducedMotion()) return [];
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return [];
    /* room dust hangs in the cone of light in front of the monitor —
       more of it, bigger grains, gathered toward the tube */
    return Array.from({ length: room ? 15 : 9 }, () => ({
      x: room ? rnd(16, 84) : rnd(4, 96),
      y: room ? rnd(6, 86) : rnd(6, 92),
      s: room ? rnd(1, 2.6) : rnd(1, 2.1),
      dur: rnd(16, 38), delay: -rnd(0, 30),
      dx: rnd(-16, 16), dy: -rnd(8, 26),
      o: room ? rnd(0.04, 0.13) : rnd(0.05, 0.16),
    }));
  }, []);
  if (!motes.length) return null;
  return (
    <div className={`motes ${room ? 'room' : ''}`} aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          style={{
            left: `${m.x}%`, top: `${m.y}%`,
            width: m.s, height: m.s,
            '--mo': m.o,
            '--mdx': `${m.dx}px`, '--mdy': `${m.dy}px`,
            animationDuration: `${m.dur}s`,
            animationDelay: `${m.delay}s`,
          }}
        />
      ))}
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
    "converge": 0.35,
    "burnin": 0.45,
    "reflection": 0.7,
    "deadpix": 0.2,
    "grime": true,
    "sound": true,
    "volume": 0.5,
    "flicker": true,
    "jitter": true,
    "font": "vt323"
  }/*EDITMODE-END*/;

  const [v, setTweak] = (window.useTweaks || ((d) => [d, () => {}]))(tweaksDefaults);

  /* boot phase: gate -> wake -> boot -> done.
     The gate exists for one reason: browsers keep audio locked until a
     real gesture, so the visitor turns the monitor on themselves — and
     everything after that first click gets to make noise. */
  const [phase, setPhase] = useState('gate');
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
  const [saver, setSaver] = useState(false);
  const [whisper, setWhisper] = useState(false);
  const [paint, setPaint] = useState(false);
  const [osEnter, setOsEnter] = useState(false);

  /* the two knobs every tube had. They detent through three positions
     and actually drive the picture — glow and scanline depth. */
  const [knobB, setKnobB] = useState(1);
  const [knobC, setKnobC] = useState(1);
  const BRIGHT_STEPS = [0.4, 0.7, 1.1];
  const CONTRAST_STEPS = [0.15, 0.35, 0.55];
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

  /* A tube doesn't open on a full picture. Leaving the gate runs the
     same cathode warm-up the power switch does — clack, the raster
     climbs out of a line while the whisper starts typing into it, and
     then the coil fires, like every CRT ever made. */
  const jacked = useRef(false);
  const jackTime = useRef(0);
  const jackIn = useCallback(() => {
    if (jacked.current) return;
    jacked.current = true;
    jackTime.current = Date.now();
    setPhase('wake');
    sound.powerOnSound();
    sound.setPowered(true);
    setWarming(true);
    after(760, () => { setWarming(false); degauss(); });
  }, [after, degauss, sound]);

  useEffect(() => {
    if (phase !== 'gate') return;
    const go = () => jackIn();
    window.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go);
    window.addEventListener('touchstart', go);
    return () => {
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
      window.removeEventListener('touchstart', go);
    };
  }, [phase, jackIn]);

  /* A monitor left off is not necessarily alone. Give the dark a moment
     to settle first — the delay is rolled so it never knocks on schedule. */
  useEffect(() => {
    if (power !== 'off') { setWhisper(false); return; }
    const id = setTimeout(() => setWhisper(true), 6000 + Math.random() * 6000);
    return () => clearTimeout(id);
  }, [power]);

  /* After Dark rules: three quiet minutes and the saver owns the tube.
     Only while the machine is actually showing something worth saving —
     never over the boot, never over a dead screen. */
  useEffect(() => {
    /* the studio holds the floor: no saver over someone's half-made art */
    if (phase !== 'done' || power !== 'on' || paint) { setSaver(false); return; }
    const IDLE_MS = 180000;
    let id = 0;
    const arm = () => { clearTimeout(id); id = setTimeout(() => setSaver(true), IDLE_MS); };
    arm();
    const bump = () => arm();
    window.addEventListener('pointermove', bump, { passive: true });
    window.addEventListener('pointerdown', bump, { passive: true });
    window.addEventListener('keydown', bump);
    window.addEventListener('touchstart', bump, { passive: true });
    return () => {
      clearTimeout(id);
      window.removeEventListener('pointermove', bump);
      window.removeEventListener('pointerdown', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('touchstart', bump);
    };
  }, [phase, power, paint]);

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
      sound.clickSound();
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
    if (phase !== 'boot' && phase !== 'wake') return;
    /* the click that opened the gate must not also skip the intro —
       its pointerdown/click pair straddles the phase change */
    const handler = () => {
      if (Date.now() - jackTime.current < 600) return;
      skipBoot();
    };
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

  /* Entering the OS is a video-mode switch: the picture rolls up, loses
     v-hold for a beat, and snaps into sync — with the relay clacking.
     Runs once, whether the boot played out or got skipped. */
  useEffect(() => {
    if (phase !== 'done') return;
    setOsEnter(true);
    sound.clickSound();
    const id = setTimeout(() => setOsEnter(false), 800);
    return () => clearTimeout(id);
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
      out = { kind: 'demo', name: 'matrix' };
    } else if (c === 'paint' || c === 'draw' || c === 'studio') {
      setHistory(h => [...h, echo, { kind: 'text', text: 'tzm-paint: the phosphor is yours. esc hands it back.' }]);
      after(350, () => setPaint(true));
      return;
    } else if (c === 'demo' || c === 'fx' || c.startsWith('demo ') || c.startsWith('fx ')) {
      const arg = c.replace(/^(demo|fx)\s*/, '').trim();
      if (arg === 'list' || arg === 'ls' || arg === '-l') {
        out = { kind: 'text', text: DEMOS.map(d => d.name).join('  ·  ') };
      } else if (arg) {
        const flat = (s) => s.replace(/[^a-z0-9]/g, '');
        const hit = DEMOS.find(d => d.name === arg || flat(d.name) === flat(arg));
        out = hit
          ? { kind: 'demo', name: hit.name }
          : { kind: 'text', text: `demo: no effect '${arg}'. try 'demo list'`, warn: true };
      } else {
        out = { kind: 'demo' };
      }
    } else if (c === 'screensaver' || c === 'saver' || c === 'afterdark') {
      setHistory(h => [...h, echo, { kind: 'text', text: 'saving the phosphor ... any key hands it back.' }]);
      after(500, () => setSaver(true));
      return;
    } else if (c === 'phosphor' || c.startsWith('phosphor ')) {
      const tubes = ['green', 'amber', 'white', 'cyan', 'magenta'];
      const arg = c.split(/\s+/)[1];
      if (!arg) {
        out = { kind: 'text', text: `current tube: ${v.phosphor}. usage: phosphor <${tubes.join('|')}>` };
      } else if (tubes.includes(arg)) {
        setTweak('phosphor', arg);
        degauss();
        out = { kind: 'text', text: `tube swapped: ${arg} phosphor. firing the coil to settle the mask.` };
      } else {
        out = { kind: 'text', text: `phosphor: no '${arg}' tube in stock. try: ${tubes.join(', ')}`, warn: true };
      }
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
  }, [after, degauss, powerOff, v.sound, v.phosphor, setTweak]);

  runCommandRef.current = runCommand;

  const handleKey = (e) => {
    /* the keyboard is part of the machine: keys tick, enter clunks */
    if (e.key === 'Enter') sound.clickSound();
    else if (e.key.length === 1 || e.key === 'Backspace') sound.typeTick();
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
        {/* the housing is a thing, not a border: an embossed badge pressed
            into the plastic and the four screws holding the shell on */}
        <div className="bezel-brand" aria-hidden="true">
          TheZakMan<span className="reg">®</span><em>CRT-1987</em>
        </div>
        <div className="screws" aria-hidden="true"></div>
        <div className="vents" aria-hidden="true"></div>
        {/* the room's light on the plastic itself — it walks with your
            head the way the glass reflection does, one layer further out */}
        <div className="bezel-sheen" aria-hidden="true"></div>
        <div className="serial" aria-hidden="true">
          <span className="bars"></span>
          <span className="no">MOD. CRT-1987 · S/N 19870042 · 110-220V~</span>
        </div>
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

          {/* The near light — a lamp closer to the glass than the room is.
              It rides the same --vx/--vy but travels further per head-move
              than the room layer: two reflections parallaxing at different
              rates is what makes the glass read as having depth, not just
              a picture of a reflection. */}
          {v.reflection > 0 && <div className="glare"></div>}

          {/* dust hanging in the light in front of the tube */}
          {v.grime && <Motes />}

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

          <div className={`raster ${wiping ? 'wiping' : ''} ${osEnter ? 'os-enter' : ''}`}>

          {/* no signal, no status: the bar only exists once the tube is lit */}
          {phase !== 'gate' && <StatusBar bootStart={bootStart} phosphor={v.phosphor} />}

          <div className="terminal" ref={scrollRef}>

            {/* === GATE: turn the monitor on yourself === */}
            {phase === 'gate' && (
              <div className="gate">
                <div className="gate-power">{'⏻'}</div>
                <div className="gate-hint">click to jack in</div>
              </div>
            )}

            {/* === WAKE: the film's opening, before the BIOS === */}
            {phase === 'wake' && (
              <WakeIntro
                tick={v.sound ? sound.keyTick : null}
                onDone={() => setPhase('boot')}
              />
            )}

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

                {/* one line of signposting for whoever just walked in */}
                <div className="out first-hint">
                  tip: type <span className="hi">help</span> — tab completes · the strip below is clickable
                </div>

                {/* DYNAMIC HISTORY */}
                {history.map((h, i) => {
                  if (h.kind === 'echo') return <FullPrompt key={i} cmd={h.cmd} />;
                  if (h.kind === 'text') return <div key={i} className={`out ${h.warn ? 'warn' : ''}`}>{h.text}</div>;
                  if (h.kind === 'help') return (
                    <div key={i} className="out help">
                      {HELP.map(([cmd, what]) => (
                        <button key={cmd} className="help-row" onClick={() => { sound.typeTick(); runCommand(cmd); }}>
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
                  if (h.kind === 'demo') return <DemoFX key={i} name={h.name} />;
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
                  /* sized to the text so the block cursor sits where the
                     next glyph lands — parked at the far right it reads as
                     a stuck pixel, not a caret. ch is exact: every face
                     here is monospace. */
                  style={{ width: `calc(${input.length}ch + 10px)` }}
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
              <FKeyBar onRun={(cmd) => { sound.clickSound(); runCommand(cmd); }} />
            </div>
          )}

          {/* the studio takes the raster over, same plane as the saver */}
          {paint && phase === 'done' && power === 'on' && (
            <PaintStudio click={v.sound ? sound.clickSound : null} onExit={() => {
              setPaint(false);
              setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 60);
            }} />
          )}

          {/* the saver draws inside the raster: it's emitted light like
              everything else, so the glass, scanlines and curvature all
              stay on top of it */}
          {saver && phase === 'done' && power === 'on' && (
            <Screensaver onWake={() => setSaver(false)} />
          )}

          </div>{/* /.raster */}

          {/* the tube is off. that has never stopped this text. */}
          {power === 'off' && whisper && (
            <MatrixWhisper
              tick={v.sound ? sound.keyTick : null}
              onDone={(how) => {
                setWhisper(false);
                /* blue pill: the tube stays dark. that was the deal. */
                if (how === 'blue') return;
                powerOn();
                after(1200, () => setHistory(h => [
                  ...h,
                  { kind: 'text', text:
                    how === 'green' ? '> good choice. the phosphor missed you.'
                    : how === 'slow' ? '> indecision is also a choice. the tube forgives.'
                    : '> trace terminated. the rabbit got away.' },
                ]));
              }}
            />
          )}
        </div>

        {/* the chin reads like a real front panel: ratings sticker on the
            left, badge dead centre, controls gathered on the right */}
        <div className="bezel-tag">
          <span className={`led ${power === 'on' ? 'on' : 'standby'}`}></span>
          <span className="copyleft">since 1987 / (c) TheZakMan</span>
          {/* the LED has lived next to the power switch on every monitor
              ever made — reunited here at the centre of the chin */}
          <button
            className="hw-btn power"
            onClick={() => (power === 'on' ? powerOff() : powerOn())}
            title={power === 'on' ? 'Power off' : 'Power on'}
            aria-label={power === 'on' ? 'Power the monitor off' : 'Power the monitor on'}
          >{'⏻'}</button>
        </div>
        <span className="hw-controls">
            <button
              className="knob"
              style={{ '--rot': `${knobB * 55 - 55}deg` }}
              onClick={() => {
                sound.clickSound();
                const n = (knobB + 1) % BRIGHT_STEPS.length;
                setKnobB(n);
                setTweak('glow', BRIGHT_STEPS[n]);
              }}
              title="Brightness"
              aria-label="Brightness knob"
            >
              <span className="knob-cap"></span>
              <span className="knob-label">bright</span>
            </button>
            <button
              className="knob"
              style={{ '--rot': `${knobC * 55 - 55}deg` }}
              onClick={() => {
                sound.clickSound();
                const n = (knobC + 1) % CONTRAST_STEPS.length;
                setKnobC(n);
                setTweak('scanlines', CONTRAST_STEPS[n]);
              }}
              title="Contrast (scanline depth)"
              aria-label="Contrast knob"
            >
              <span className="knob-cap"></span>
              <span className="knob-label">contr</span>
            </button>
            <button
              className={`hw-btn snd ${v.sound ? 'lit' : ''}`}
              onClick={() => { sound.clickSound(); setTweak('sound', !v.sound); }}
              title={v.sound ? 'Mute the tube' : 'Let the tube sing (15.7kHz flyback)'}
              aria-label={v.sound ? 'Mute the monitor' : 'Unmute the monitor'}
              aria-pressed={v.sound}
            >{v.sound ? '♪' : '⃠'}</button>
            <button
              className="hw-btn"
              onClick={() => { sound.clickSound(); degauss(); }}
              disabled={power === 'off'}
              title="Degauss"
              aria-label="Degauss the tube"
            >degauss</button>
        </span>
      </div>

      {/* dust in the room, hanging where the tube's light can catch it —
          in front of the whole monitor, not behind the glass */}
      {v.grime && <Motes room />}

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
