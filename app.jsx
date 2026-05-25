const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* =========================================================
   TZM-OS — CRT terminal landing page
   ========================================================= */

const TZM_LOGO = String.raw`
            ooo"
           $$
           $$                                ooooo"""$"""o
           $$o                            o""  $    o"    $
oo$        $$oo                       oo"""    o"   o"     $
 "$o        ""$$$o                oo"     oo"""""""""""ooo"
  "$o          ""$$o          oo"     oo"               $
   ""$$$$ooo     "$$o     oo"     oo"     o$"""$"""ooo"
         """$o     "$$ooo""    oo"     oo""      $    o"
             "$o    o$$"oo" oo""    oo""oooo    oo"  o"
       oo     $o$$$""o"o"oo$$"  oo""        "o$"  oo$$$$$$$$$
    o$$$$$ o$""$$"  " o"o$oo" oo""              $o$o
   $$$$$$"$"o$$o$$$$$ o"o$o""               $o$
  o$$$$$$"$o$$$$""""""$$$$oo$oo o       oo$$$$$$oo
"o$$$$$$$o$$$$$$$$$$$o$$$$$$$$$$$$ooooo$$$$$$$$$$$$$o
 "$$$$$$$ $$$$$$$$$$$$ ""$$$$$$$$$$$$$$$$$$$$$$$$$$$$
  o$ooo$$ $$$$$$$$$$$$  "$$o$$$$$$$$$$$$$$$$$$$$$$$$$
o"$$$$$$$o$$$$$$$$$$$$o$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
  $$$$$$$ $$$$$$"""""  $$$$$$$$$$$"""""$$$$$$$$$$$"
   $$$$$$"$"$$$$$$$$$o$$$$""$"           ""$$$$$$""
    $$$$$$"$o""o$"""" "o"$ ""oo            $"$"
      ""$$"  """$$$oo" "o"$""o  ""oo    o"$o  ""$$$$$$$$$$
              o$ """"$$o"o""$$o   ""o""    ""o          $
            o$"       "$$$$"o  ""o    ""o    $    "o    $
     oooo$$$"       o$$" ""o    ""o     "$ooo$ooooo"""o
   $$""""        o$$"        ""o    ""o              $
  $$           oo$$"            ""o    ""o            $
o$$         o$$""                  ""o    ""ooooo"""o
  "        $$$                        ""ooo  "o   "o $
           $$                              "oo $    "o$
           $$                                  """""o$$"
           $$
          o$$
`;

const SOCIALS = [
  { glyph: 'T', name: 'tumblr',     handle: '@thezakman',     url: 'https://thezakman.tumblr.com/',                            kb: '4.2K' },
  { glyph: '♫', name: 'soundcloud', handle: '/thezakman',     url: 'https://soundcloud.com/thezakman',                         kb: '12M'  },
  { glyph: '▶', name: 'steam',      handle: 'thezakman87',    url: 'http://steamcommunity.com/id/thezakman87',                 kb: '888K' },
  { glyph: 'R', name: 'reddit',     handle: 'u/thezakman87',  url: 'https://www.reddit.com/user/thezakman87/',                 kb: '666'  },
  { glyph: '○', name: 'instagram',  handle: '@thezakman',     url: 'https://www.instagram.com/thezakman',                      kb: '3.1K' },
  { glyph: '#', name: 'github',     handle: '@thezakman',     url: 'https://github.com/thezakman',                             kb: '92K'  },
  { glyph: '$', name: 'gumroad',    handle: '/thezakman',     url: 'https://gumroad.com/thezakman',                            kb: '512'  },
  { glyph: 'W', name: 'wordpress',  handle: '@thezakman',     url: 'https://thezakman.wordpress.com/',                         kb: '1.7K' },
  { glyph: 'X', name: 'twitter',    handle: '@thezakman',     url: 'https://twitter.com/thezakman',                            kb: '8.0K' },
  { glyph: '@', name: 'upwork',     handle: '~freelancer',    url: 'https://www.upwork.com/freelancers/~013c497232fa2ab3ad',   kb: '256'  },
];

/* ---------- helpers ---------- */
function nowStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}
function dateStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function uptimeSince(start) {
  const s = Math.floor((Date.now() - start) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function rndHex(len = 8) {
  const c = '0123456789ABCDEF';
  let s = '';
  for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * 16)];
  return s;
}

/* ---------- type-on hook ---------- */
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

/* ---------- presentational ---------- */
function Prompt({ cmd, children }) {
  return (
    <div className="line">
      <span className="ps1"><span className="ps1-user">tzm</span><span className="ps1-at">@</span><span className="ps1-host">cyberspace</span><span className="ps1-colon">:</span><span className="ps1-path">~</span><span className="ps1-dollar">$</span></span>
      <span className="ps1-cmd"> {cmd}</span>
      {children}
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
      <span className={ok ? 'ok' : 'warn'}>{ok ? '  OK  ' : ' WARN ' }</span>
      <span className="dim">]</span>
      <span> {typed}</span>
      {done && ok && <span className="trail dim"> ✓</span>}
    </div>
  );
}

function AsciiLogo() {
  return (
    <pre className="ascii" aria-hidden="true">{TZM_LOGO}</pre>
  );
}

function CmdKbd({ cmd, onRun }) {
  return (
    <span
      className="kbd"
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onRun(cmd); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRun(cmd); } }}
    >
      {cmd}
    </span>
  );
}

function SocialRow({ s, idx, onFocus }) {
  const date = dateStr();
  return (
    <a
      className="socrow"
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => onFocus && onFocus(idx)}
      onTouchStart={() => onFocus && onFocus(idx)}
      data-idx={idx}
    >
      <span className="perms">lrwxrwxrwx</span>
      <span className="links">1</span>
      <span className="owner">tzm</span>
      <span className="group">www</span>
      <span className="size">{s.kb.padStart(6, ' ')}</span>
      <span className="date">{date}</span>
      <span className="glyph">[{s.glyph}]</span>
      <span className="name">{s.name}</span>
      <span className="arrow">{'─►'}</span>
      <span className="handle">{s.handle}</span>
      <span className="url dim">{s.url.replace(/^https?:\/\//, '')}</span>
    </a>
  );
}

/* ---------- live status bar ---------- */
function StatusBar({ bootStart, phosphor }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);
  const sysid = useMemo(() => `0x${rndHex(8)}`, []);
  const load = useMemo(() => (0.3 + Math.sin(tick / 7) * 0.25 + Math.random() * 0.1).toFixed(2), [tick]);
  return (
    <div className="statusbar">
      <span className="seg"><span className="dim">SYS</span> TZM-OS v25.04</span>
      <span className="seg hide-mobile"><span className="dim">PID</span> {sysid}</span>
      <span className="seg hide-mobile"><span className="dim">PHOSPHOR</span> {phosphor.toUpperCase()}</span>
      <span className="seg"><span className="dim">LOAD</span> {load}</span>
      <span className="seg"><span className="dim">UP</span> {uptimeSince(bootStart)}</span>
      <span className="seg right"><span className="dim">{'▮'}</span> {nowStr()}</span>
    </div>
  );
}

/* ---------- main app ---------- */
function App() {
  const tweaksDefaults = /*EDITMODE-BEGIN*/{
    "phosphor": "green",
    "scanlines": 0.35,
    "curvature": true,
    "glow": 0.7,
    "flicker": true,
    "jitter": true,
    "font": "vt323"
  }/*EDITMODE-END*/;

  const [v, setTweak] = (window.useTweaks || ((d) => [d, () => {}]))(tweaksDefaults);

  const [phase, setPhase] = useState('boot');
  const [bootStart] = useState(Date.now());
  const [bootDone, setBootDone] = useState(0);
  const totalBoot = 8;

  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const cmdHistory = useRef([]);
  const cmdHistoryIdx = useRef(-1);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [history, phase, bootDone, scrollToBottom]);

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
      if (e.target.tagName === 'A' || e.target.closest('a') ||
          e.target.tagName === 'BUTTON' || e.target.closest('button') ||
          e.target.closest('.twk-panel')) return;
      if (inputRef.current) inputRef.current.focus();
    };
    window.addEventListener('click', focus);
    window.addEventListener('touchend', focus);
    return () => {
      window.removeEventListener('click', focus);
      window.removeEventListener('touchend', focus);
    };
  }, []);

  const phosphorMap = {
    green:  { fg: '#39ff7a', bg: '#020906', glow: '#3fffa1' },
    amber:  { fg: '#ffb000', bg: '#0a0500', glow: '#ffd166' },
    white:  { fg: '#e8f4ff', bg: '#02060a', glow: '#a8d8ff' },
    cyan:   { fg: '#4fe6ff', bg: '#011014', glow: '#7af0ff' },
    magenta:{ fg: '#ff5fd1', bg: '#0a0410', glow: '#ff9be4' },
  };
  const ph = phosphorMap[v.phosphor] || phosphorMap.green;

  const cssVars = {
    '--fg': ph.fg,
    '--bg': ph.bg,
    '--glow': ph.glow,
    '--scanline-a': v.scanlines,
    '--text-shadow': `0 0 ${4 * v.glow}px ${ph.glow}, 0 0 ${10 * v.glow}px ${ph.glow}88`,
    '--font-body': v.font === 'vt323' ? "'VT323', 'IBM Plex Mono', monospace" : "'JetBrains Mono', 'IBM Plex Mono', monospace",
    '--font-size': v.font === 'vt323' ? '20px' : '15px',
  };

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
    } else if (c === 'ls' || c === 'social' || c === 'ls -la' || c === 'ls -la /social') {
      out = { kind: 'social' };
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
      setHistory([]);
      return;
    } else if (c === 'exit' || c === 'logout' || c === 'quit') {
      out = { kind: 'text', text: "you can't leave the internet. you've been here since 1999." };
    } else if (c.startsWith('sudo')) {
      out = { kind: 'text', text: `[sudo] password for ${c.slice(5) || 'guest'}: incorrect. try 'help'.`, warn: true };
    } else if (c === 'rm -rf /' || c === 'rm -rf') {
      out = { kind: 'text', text: 'nice try. /dev/null is full.', warn: true };
    } else {
      out = { kind: 'text', text: `tzm-sh: ${cmd}: command not found. try 'help'`, warn: true };
    }
    setHistory(h => [...h, echo, out]);
  }, []);

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      runCommand(input);
      setInput('');
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

  const CMDS = ['about', 'social', 'donate', 'contact', 'neofetch', 'matrix', 'cats', 'date', 'clear'];

  return (
    <div className={`crt ph-${v.phosphor} font-${v.font} ${v.curvature ? 'curved' : ''} ${v.flicker ? 'flicker' : ''} ${v.jitter ? 'jitter' : ''}`} style={cssVars}>
      <div className="bezel">
        <div className="screen">
          <div className="scanlines"></div>
          <div className="vignette"></div>
          <div className="rgb"></div>

          <StatusBar bootStart={bootStart} phosphor={v.phosphor} />

          <div className="terminal" ref={scrollRef}>
            <div className="boot-block">
              <BootLine delay={50}   text="TZM-BIOS v25.04.18  © 1999-2026 TheZakMan Industries" onDone={() => setBootDone(b => Math.max(b,1))} />
              <BootLine delay={250}  text="CPU... Pentium IV @ 3.2GHz (overclocked w/ vibes)"   onDone={() => setBootDone(b => Math.max(b,2))} />
              <BootLine delay={420}  text="Memory test ... 640K (should be enough for anybody)" onDone={() => setBootDone(b => Math.max(b,3))} />
              <BootLine delay={650}  text="Detecting devices: guitar /dev/strat ... python /dev/snek" onDone={() => setBootDone(b => Math.max(b,4))} />
              <BootLine delay={900}  text="Mounting /home/tzm ... loading cat photos archive (1999→)" onDone={() => setBootDone(b => Math.max(b,5))} />
              <BootLine delay={1150} text="Initializing CRT phosphor matrix ... aligning scanlines" onDone={() => setBootDone(b => Math.max(b,6))} />
              <BootLine delay={1400} text="Network: IRC → freenode/#thezakman ... ONLINE" onDone={() => setBootDone(b => Math.max(b,7))} />
              <BootLine delay={1650} text="Starting tzm-sh ... ready" onDone={() => setBootDone(b => Math.max(b,8))} />
            </div>

            {phase === 'done' && (
              <>
                <div className="spacer" />

                <div className="logo-frame">
                  <AsciiLogo />
                  <div className="logo-tag">
                    <span className="tag-big">TheZakMan</span>
                    <span className="tag-sm">Graphic + CGI artist · plays guitar · codes in python {'♥'}</span>
                    <span className="tag-sm dim">// signal from cyberspace since 1999</span>
                  </div>
                </div>

                <div className="spacer" />

                <Prompt cmd="whoami" />
                <div className="out">
                  <span>TheZakMan</span> <span className="dim">{'—'} Graphic &amp; CGI Artist · guitarist · python wrangler · cat-photo archivist · online since 1999</span>
                </div>

                <div className="spacer" />

                <Prompt cmd="cat /etc/social.conf" />
                <div className="out">
                  <span className="dim"># this page is a portal to all my social media accounts.</span><br/>
                  <span className="dim"># click any handle below to jump out.</span>
                </div>

                <div className="spacer" />

                <Prompt cmd="ls -la /social" />
                <div className="out">
                  <div className="socrow head">
                    <span className="perms dim">PERMS</span>
                    <span className="links dim">L</span>
                    <span className="owner dim">USER</span>
                    <span className="group dim">GROUP</span>
                    <span className="size dim">FOLLOWERS</span>
                    <span className="date dim">MTIME</span>
                    <span className="glyph dim">GLYPH</span>
                    <span className="name dim">NAME</span>
                    <span className="arrow dim"></span>
                    <span className="handle dim">HANDLE</span>
                    <span className="url dim">{'→'} TARGET</span>
                  </div>
                  {SOCIALS.map((s, i) => (
                    <SocialRow key={s.name} s={s} idx={i} onFocus={setFocusedIdx} />
                  ))}
                  <div className="socfoot dim">
                    total {SOCIALS.length} symlinks · all destinations off-site · open with: <CmdKbd cmd="click" onRun={() => {}} />
                  </div>
                </div>

                <div className="spacer" />

                <Prompt cmd="cat about.txt" />
                <div className="out">
                  <p>I'm a <span className="hi">Graphic &amp; CGI Artist</span> that loves to play guitar and code in <span className="hi">python</span> <span className="heart">{'♥'}</span></p>
                  <p>I have been on the internet since <span className="hi">1999</span>, learning and enjoying photos of cats.</p>
                  <p className="dim">tags: art · cgi · music · code · cats · beer · crts · old-internet</p>
                </div>

                <div className="spacer" />

                <Prompt cmd="./donate --beer" />
                <div className="out">
                  <pre className="beer">{String.raw`
        .~~~~.
        i====i_
        |cccc|_)   "If you like my art or anything I do,
        |cccc|      send me a beer. I do most of my cool
        \__,/       stuff with a cold one." — tzm
`}</pre>
                  <a className="btn" href="https://www.paypal.com/donate?business=thezakman@icloud.com&amount=5&currency_code=USD" target="_blank" rel="noopener noreferrer">
                    [ paypal · $5 · cheers {'🍺'} ]
                  </a>
                  <span className="dim"> {'←'} click to pour one</span>
                </div>

                <div className="spacer" />

                <Prompt cmd="cat /etc/contact" />
                <div className="out grid2">
                  <div><span className="dim">irc      </span> TheZakMan @ freenode</div>
                  <div><span className="dim">email    </span> thezakman<span className="dim">[at]</span>icloud.com</div>
                  <div><span className="dim">timezone </span> UTC-3 / America/Sao_Paulo</div>
                  <div><span className="dim">status   </span> <span className="ok">{'●'}</span> available for freelance</div>
                </div>

                <div className="spacer" />

                <Prompt cmd="neofetch" />
                <div className="out neofetch">
                  <pre className="tinylogo">{String.raw`   _____ ____  __
  /_  _//_  / /  |
   / /   / / / /\|
  /_/   /_/ /_/`}</pre>
                  <div className="specs">
                    <div><span className="dim">os       </span> tzm-os 25.04 (cyberspace)</div>
                    <div><span className="dim">host     </span> thezakman.github.io</div>
                    <div><span className="dim">kernel   </span> 6.9.1-vt323-glow</div>
                    <div><span className="dim">shell    </span> tzm-sh 1.0</div>
                    <div><span className="dim">resolution</span> 1024 {'×'} 768 (CRT)</div>
                    <div><span className="dim">de       </span> phosphor + scanlines</div>
                    <div><span className="dim">cpu      </span> heart {'×'} 1 @ 60bpm</div>
                    <div><span className="dim">gpu      </span> caffeine + cold beer</div>
                    <div><span className="dim">memory   </span> 17527 cat photos / {'∞'}</div>
                    <div><span className="dim">uptime   </span> since 1999</div>
                  </div>
                </div>

                <div className="spacer" />

                <Prompt cmd="help" />
                <div className="out cmds">
                  {CMDS.map(c => <CmdKbd key={c} cmd={c} onRun={runCommand} />)}
                  <span className="dim"> · try typing or tapping one {'↓'}</span>
                </div>

                <div className="spacer" />

                {history.map((h, i) => {
                  if (h.kind === 'echo') return <Prompt key={i} cmd={h.cmd} />;
                  if (h.kind === 'text') return <div key={i} className={`out ${h.warn ? 'warn' : ''}`}>{h.text}</div>;
                  if (h.kind === 'help') return (
                    <div key={i} className="out cmds">
                      {CMDS.map(c => <CmdKbd key={c} cmd={c} onRun={runCommand} />)}
                    </div>
                  );
                  if (h.kind === 'about') return (
                    <div key={i} className="out">
                      <p>I'm a <span className="hi">Graphic &amp; CGI Artist</span> that loves guitar and python <span className="heart">{'♥'}</span></p>
                      <p>On the internet since <span className="hi">1999</span>. cat photos collected: {'∞'}.</p>
                    </div>
                  );
                  if (h.kind === 'social') return (
                    <div key={i} className="out">
                      {SOCIALS.map((s, j) => <SocialRow key={s.name} s={s} idx={j} />)}
                    </div>
                  );
                  if (h.kind === 'donate') return (
                    <div key={i} className="out">
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
                  if (h.kind === 'hardware') return (
                    <div key={i} className="out neofetch">
                      <pre className="tinylogo">{String.raw`   _____ ____  __
  /_  _//_  / /  |
   / /   / / / /\|
  /_/   /_/ /_/`}</pre>
                      <div className="specs">
                        <div><span className="dim">os       </span> tzm-os 25.04 (cyberspace)</div>
                        <div><span className="dim">host     </span> thezakman.github.io</div>
                        <div><span className="dim">kernel   </span> 6.9.1-vt323-glow</div>
                        <div><span className="dim">shell    </span> tzm-sh 1.0</div>
                        <div><span className="dim">cpu      </span> heart {'×'} 1 @ 60bpm</div>
                        <div><span className="dim">gpu      </span> caffeine + cold beer</div>
                        <div><span className="dim">memory   </span> 17527 cat photos / {'∞'}</div>
                        <div><span className="dim">uptime   </span> since 1999</div>
                      </div>
                    </div>
                  );
                  if (h.kind === 'matrix') return <MatrixRain key={i} />;
                  if (h.kind === 'cats') return (
                    <div key={i} className="out">
                      <pre className="catart">{String.raw`
   /\_/\     /\_/\     /\_/\     /\_/\
  ( o.o )   ( -.- )   ( ^.^ )   ( o.- )
   > ^ <     > ^ <     > ^ <     > ^ <
`}</pre>
                      <span className="dim">17527 cat photos archived since 1999.</span>
                    </div>
                  );
                  return null;
                })}

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

                <div className="spacer big" />
              </>
            )}
          </div>
        </div>

        <div className="bezel-tag">
          <span className="led on"></span>
          <span className="brand">ZAKtron 1701</span>
          <span className="model">14" monochrome · 60 Hz · 1999</span>
        </div>
      </div>

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
            </TweakSection>
            <TweakSection title="CRT">
              <TweakSlider label="Scanlines" value={v.scanlines} min={0} max={0.8} step={0.02} onChange={(x) => setTweak('scanlines', x)} />
              <TweakToggle label="Curvature" value={v.curvature} onChange={(x) => setTweak('curvature', x)} />
              <TweakToggle label="Flicker" value={v.flicker} onChange={(x) => setTweak('flicker', x)} />
              <TweakToggle label="Jitter" value={v.jitter} onChange={(x) => setTweak('jitter', x)} />
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

/* ---------- matrix rain (easter egg) ---------- */
function MatrixRain() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = 200 * (window.devicePixelRatio || 1);
    canvas.style.height = '200px';
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    const w = canvas.clientWidth;
    const h = 200;
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
