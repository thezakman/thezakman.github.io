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

const CMDS = ['about', 'social', 'donate', 'contact', 'neofetch', 'matrix', 'cats', 'date', 'clear'];

/* Everything tab-completable, including what the button bar doesn't show. */
const COMPLETIONS = [
  'about', 'beer', 'cats', 'clear', 'contact', 'date', 'degauss', 'donate',
  'exit', 'hardware', 'help', 'irc', 'ls', 'ls -la', 'matrix', 'neofetch',
  'poweroff', 'shutdown', 'social', 'specs', 'whoami',
];

/* ==================== helpers ==================== */

function nowStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
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

function CmdKbd({ cmd, onRun }) {
  return (
    <span
      className="kbd"
      role="button"
      tabIndex={0}
      onClick={(e) => { e.preventDefault(); onRun(cmd); }}
      onTouchEnd={(e) => { e.preventDefault(); onRun(cmd); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRun(cmd); } }}
    >
      {cmd}
    </span>
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

function NeofetchBlock() {
  return (
    <div className="out neofetch">
      <PhosphorImage src="tzm.png" alt="tzm" className="neofetch-logo" />
      <div className="specs">
        <div><span className="dim">os       </span> tzm-os (cyberspace)</div>
        <div><span className="dim">host     </span> thezakman.github.io</div>
        <div><span className="dim">kernel   </span> 1.3.37-vt-glow</div>
        <div><span className="dim">shell    </span> tzm-sh 1.0</div>
        <div><span className="dim">resolution</span> 1024 {'×'} 768 (CRT)</div>
        <div><span className="dim">de       </span> phosphor + scanlines</div>
        <div><span className="dim">cpu      </span> heart {'×'} 1 @ 60bpm</div>
        <div><span className="dim">gpu      </span> caffeine + cold beer</div>
        <div><span className="dim">memory   </span> 17527 cat photos / {'∞'}</div>
        <div><span className="dim">uptime   </span> since 1987</div>
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

function MatrixRain() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = 200;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01THEZAKMAN'.split('');
    const cols = Math.floor(w / 12);
    const drops = Array(cols).fill(0).map(() => Math.random() * h);
    let raf;
    const draw = () => {
      ctx.fillStyle = 'rgba(2, 9, 6, 0.18)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '16px VT323, monospace';
      ctx.fillStyle = getComputedStyle(canvas).color;
      for (let i = 0; i < drops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * 12, drops[i]);
        drops[i] += 14;
        if (drops[i] > h && Math.random() > 0.96) drops[i] = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const stop = setTimeout(() => cancelAnimationFrame(raf), 6000);
    return () => { cancelAnimationFrame(raf); clearTimeout(stop); };
  }, []);
  return <canvas className="matrix" ref={ref}></canvas>;
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
    "burnin": 0.55,
    "deadpix": 0.2,
    "grime": true,
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
  const [degaussing, setDegaussing] = useState(false);
  const [wiping, setWiping] = useState(false);
  const timers = useRef([]);

  const after = useCallback((ms, fn) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const degauss = useCallback(() => {
    setDegaussing(true);
    after(1100, () => setDegaussing(false));
  }, [after]);

  const powerOff = useCallback(() => {
    setCollapsing(true);
    after(620, () => { setPower('off'); setCollapsing(false); });
  }, [after]);

  const powerOn = useCallback(() => {
    setPower('on');
    degauss();
    after(60, () => { if (inputRef.current) inputRef.current.focus(); });
  }, [after, degauss]);

  /* the tube degausses when it warms up, like every CRT ever made */
  useEffect(() => { degauss(); }, []);

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
      if (e.target.tagName === 'A' || e.target.closest('a') ||
          e.target.tagName === 'BUTTON' || e.target.closest('button') ||
          e.target.closest('.twk-panel') ||
          e.target.classList.contains('kbd') || e.target.closest('.kbd')) return;
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
    } else if (c === 'cats' || c === 'cat cats') {
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
  }, [after, degauss, powerOff]);

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
                    <div key={i} className="out cmd-bar">
                      {CMDS.map(c => <CmdKbd key={c} cmd={c} onRun={runCommand} />)}
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

          {/* FIXED BOTTOM: cmd-bar + input */}
          {phase === 'done' && (
            <div className="screen-bottom">
              <div className="cmd-bar">
                {CMDS.map(c => <CmdKbd key={c} cmd={c} onRun={runCommand} />)}
              </div>
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
            </div>
          )}

          </div>{/* /.raster */}
        </div>

        <div className="bezel-tag">
          <span className={`led ${power === 'on' ? 'on' : 'standby'}`}></span>
          <span className="copyleft">since 1987 / (c) TheZakMan</span>
          <span className="hw-controls">
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
