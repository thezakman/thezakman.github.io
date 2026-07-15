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

    const ro = new ResizeObserver(layout);
    ro.observe(canvas);

    let raf = 0, last = 0, running = true;

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
      raf = requestAnimationFrame(draw);
    };

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
   Each effect is just intensity = f(x, y, t) over centred, aspect-corrected
   coordinates; the renderer maps that through an ASCII ramp. Drawn as text
   rather than to a canvas, so it inherits the phosphor glow, the scanlines
   and the tube's curvature instead of sitting on top of them as a pasted
   rectangle. */

const ASCII_RAMP = ' .:-=+*#%@';

/* Coordinates follow the demoscene convention: y spans -0.5..0.5 and x is
   scaled by the aspect `k`, so nothing comes out an ellipse. Effects get k
   too — a 21:9 tube is nearly 4 units wide, and anything that places its
   features in ±0.6 ends up huddled in the middle of the screen. */
const DEMOS = [
  {
    name: 'plasma',
    fn: (x, y, t) => {
      const v = Math.sin(x * 4 + t)
              + Math.sin(y * 5 - t * 0.8)
              + Math.sin((x + y) * 3 + t * 1.2)
              + Math.sin(Math.hypot(x, y) * 7 - t * 1.7);
      return (v + 4) / 8;
    },
  },
  {
    name: 'tunnel',
    fn: (x, y, t) => {
      const r = Math.hypot(x, y) + 1e-3;
      const a = Math.atan2(y, x);
      const v = Math.sin(0.5 / r * 5 + t * 3) * 0.5 + Math.sin(a * 6 - t) * 0.5;
      return ((v + 1) / 2) * Math.min(1, r * 3.5);
    },
  },
  {
    name: 'metaballs',
    fn: (x, y, t, k) => {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        const bx = Math.sin(t * (0.7 + i * 0.23) + i * 2.1) * k * 0.6;
        const by = Math.cos(t * (0.5 + i * 0.31) + i * 1.3) * 0.32;
        s += 0.03 / ((x - bx) ** 2 + (y - by) ** 2 + 0.003);
      }
      return Math.min(1, s * 0.6);
    },
  },
  {
    name: 'ripples',
    fn: (x, y, t, k) => {
      let s = 0;
      for (let i = 0; i < 4; i++) {
        const px = Math.sin(i * 2.3 + 1) * k * 0.7;
        const py = Math.cos(i * 3.1) * 0.34;
        const d = Math.hypot(x - px, y - py);
        s += Math.sin(d * 16 - t * 4 + i) / (1 + d * 1.6);
      }
      /* only the crests light up — a trough that lands on mid-grey paints
         the whole background a flat '+' */
      return Math.max(0, s);
    },
  },
  {
    name: 'moire',
    fn: (x, y, t, k) => {
      const o = Math.sin(t * 0.6) * k * 0.4;
      const a = Math.hypot(x - o, y) * 22;
      const b = Math.hypot(x + o, y) * 22;
      return (Math.sin(a) * Math.sin(b) + 1) / 2;
    },
  },
  {
    name: 'vortex',
    fn: (x, y, t) => {
      const r = Math.hypot(x, y);
      const a = Math.atan2(y, x) + r * 4 - t * 1.5;
      return (Math.sin(a * 3) * Math.cos(r * 8 - t * 2) + 1) / 2;
    },
  },
  {
    name: 'interference',
    fn: (x, y, t, k) => {
      /* two point sources beating against each other, like the moire but
         travelling — the crests drift instead of standing still */
      const o = k * 0.45;
      const d1 = Math.hypot(x - o, y);
      const d2 = Math.hypot(x + o, y);
      const v = Math.sin(d1 * 14 - t * 3) + Math.sin(d2 * 14 - t * 3);
      return (v + 2) / 4;
    },
  },
];

const DEMO_ROWS = 26;

function DemoFX() {
  const ref = useRef(null);
  const pick = useRef(null);
  if (!pick.current) pick.current = DEMOS[(Math.random() * DEMOS.length) | 0];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { fn } = pick.current;
    const H = DEMO_ROWS;
    let W = 80;

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
      if (cw > 0.5) W = Math.max(24, Math.min(240, Math.floor(el.clientWidth / cw)));
    };
    measure();
    /* VT323 may still be in flight on first paint, and the fallback is a
       wider face — remeasure once it lands */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const t0 = performance.now();
    let raf = 0, running = false, last = 0;

    const frame = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return;         // 30fps is plenty for ASCII
      last = now;

      const t = (now - t0) / 1000;
      /* Char cells are about twice as tall as wide, so the field is W/(H*2)
         as wide as it is tall. y spans 1 unit; x spans k of them. */
      const k = W / (H * 2);
      let out = '';
      for (let j = 0; j < H; j++) {
        const y = j / (H - 1) - 0.5;
        for (let i = 0; i < W; i++) {
          const x = (i / (W - 1) - 0.5) * k;
          let v = fn(x, y, t, k);
          v = v < 0 ? 0 : v > 1 ? 1 : v;
          out += ASCII_RAMP[Math.min(ASCII_RAMP.length - 1, (v * ASCII_RAMP.length) | 0)];
        }
        out += '\n';
      }
      el.textContent = out;
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
                      <p>I'm a <span className="hi">Hacker  / Graphic &amp; CGI Artist</span> that loves to play guitar and mess around with python <span className="heart">{'♥'}</span></p>
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
                    <div key={i} className="out grid2">
                      <div><span className="dim">irc      </span> TheZakMan @ freenode</div>
                      <div><span className="dim">email    </span> thezakman<span className="dim">[at]</span>icloud.com</div>
                      <div><span className="dim">timezone </span> UTC-3 / America/Sao_Paulo</div>
                      <div><span className="dim">status   </span> <span className="ok">{'●'}</span> available for freelance</div>
                    </div>
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
