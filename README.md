# tzm-os

A fake-OS CRT terminal that lives at [thezakman.github.io](https://thezakman.github.io) — the
personal site of Pedro "TheZakMan" Araujo. It's a green-phosphor tube you talk to: type
commands, and it answers like a machine that's been running since 1987.

No build step — React 18 (UMD) + Babel Standalone, plus `app.jsx`, `styles.css` and
`tweaks-panel.jsx`. Every visual effect (the boot, the demos, the dust, the glass) is done
in the browser.

---

## Getting in

The tube opens dark, waiting. **Click / tap / press any key** to jack in — that first
gesture is what lets the sound play. One of several intros rolls, then the BIOS boots into
the shell. Any input skips straight to the prompt.

Once you're at `tzm@cyberspace:~$`, type. `help` lists the main commands; the numbered strip
along the bottom is clickable, and the whole thing tab-completes.

### Keyboard

| Key | Does |
|-----|------|
| `Tab` | complete the command you're typing |
| `↑` / `↓` | walk back and forth through your command history |
| `F1`–`F9` (or `Alt`+`1`–`9`) | run the matching button on the bottom strip |
| `Esc` | leave tzm-paint |
| any key | wake the monitor when it's off, or skip the boot |

### Random intros

A different opening every visit, all one tap from the shell:

| Intro | What plays |
|-------|-----------|
| **matrix** | "Wake up… The Matrix has you." |
| **dialup** | a 33.6k modem handshake — dial tones, carrier, hiss (with sound) |
| **login** | `cyberspace login: tzm` → `password: ***` → ACCESS GRANTED |
| **vhs** | a tape rewinding from 00:47:13, then PLAY + tracking |
| **post** | BIOS memory count to 640K, detecting the disk and the guitar |
| **tuner** | TV static surfing channels until it lands on TZM-TV |
| **ghost** | *Ghost in the Shell* — "the net is vast and infinite" |
| **lain** | *Serial Experiments Lain* — "present day, present time" |

---

## Commands

### About / contact

| Command | What it does | Aliases |
|---------|--------------|---------|
| `about` | short intro | `whoami` |
| `man tzm` | the full story, typeset as a man page — English default, `--pt` for pt-br | `man thezakman`, `cat about.txt`, `about --full` |
| `social` | where else I exist | `ls`, `ll` |
| `ls -la` | the same, as symlinks | `ls -l`, `ls -al` |
| `contact` | how to reach me (irc, email, timezone, status) | `irc` |
| `donate` | buy me a beer — carbonated ASCII mug + tap list | `beer` |
| `neofetch` | system summary card | `hardware`, `specs` |

### Toys & effects

| Command | What it does | Aliases |
|---------|--------------|---------|
| `demo` | a random procedural effect | `fx` |
| `demo <name>` | run a specific effect (e.g. `demo fireworks`) | |
| `demo list` | list every effect | |
| `matrix` | digital rain (it's a demo now) | |
| `paint` | tzm-paint — an ASCII art studio; draw, burn, mirror, copy | `draw`, `studio` |
| `screensaver` | After Dark: a demo takes the whole tube | `saver`, `afterdark` |
| `phosphor <color>` | swap the tube: `green amber white cyan magenta blue` | |
| `weather` | live sky over Rio (fixed coords — nothing about you is sent) | `clima`, `wttr` |
| `neofetch` | system summary | |
| `cats` | the archive | `cat cats` |

### Hardware / session

| Command | What it does | Aliases |
|---------|--------------|---------|
| `degauss` | fire the coil | |
| `sound` | toggle the flyback whine | `mute`, `unmute` |
| `date` | the clock on the desk | |
| `clear` | wipe the phosphor (it decays, doesn't cut) | `cls` |
| `exit` | cut the signal (shell stays up — any key wakes it) | `logout`, `quit`, `poweroff`, `shutdown` |
| `help` | the command list | `?` |

### Procedural effects (`demo <name>`)

Every effect rolls its own constants, so no two runs look alike:

`plasma` · `tunnel` · `metaballs` · `ripples` · `moire` · `vortex` · `mandelbrot` · `julia` ·
`boing` · `fire` · `shadebobs` · `vector balls` · `wormhole` · `checkerfloor` · `fireworks` ·
`tesseract` · `static` · `matrix` · `donut` · `rotozoom` · `scroller` · `twister` · `kefrens` ·
`voxel` · `water` · `copper bars` · `gray-scott` · `life` · `rule 30` · `rule 110` ·
`sierpinski` · `10 print` · `cube` · `starfield` · `lorenz` · `langton's ant`

---

## Things that happen on their own

- **Leave it idle ~3 minutes** → the screensaver takes over with a full-screen demo.
- **Power the tube off** (⏻) and wait → someone starts typing in the dark. It's the
  film's whisper, gone further: after the white rabbit it runs a trace on *you* — all read
  from your own browser, nothing sent anywhere. Sometimes it offers a choice:
  **green pill** (back to the phosphor) or **blue pill** (stays dark).
- The bezel has real controls: two **knobs** (brightness / contrast), a **sound** button,
  **degauss**, and **power**. They all work and all click.

---

## Easter eggs

Not in `help` — muscle memory is the key. Try the things a terminal person types by reflex.

### The forbidden boot

| Type | What happens |
|------|--------------|
| `win95` | "booting the other guy…" → Starting Windows 95 → the only ending it ever had: a **blue screen**. Any key comes home. |

### Pentester reflexes

| Type | What happens |
|------|--------------|
| `cat /etc/passwd` | the whole file — root runs `/bin/tzm-sh`, `neo` is `the one`, `cat` is a daemon |
| `cat /etc/shadow` | permission denied. even here. |
| `id` | `uid=1999(guest) … groups=…,1337(believers),17527(cat-people)` |
| `uname -a` | `TZM-OS … 1.3.37-vt-glow … GNU/Cathode` |
| `ps` / `top` | process table, with `whisper <defunct>` and you as PID 31337 |
| `ifconfig` / `ip a` | interface `cyberspace0`, MAC `de:ad:be:ef:19:87` |
| `nmap` | ports open: tzm-sh, van-halen, elite; secrets closed (there are none) |
| `ping` | replies with `ttl=1987` |
| `ping google` | google won't exist for eleven more years |
| `ping tzm` | always online, since 1987 |
| `ssh` / `curl` / `wget` | no outbound uplink — the only line out goes to the sky |
| `pwd` | `/home/tzm/cyberspace` |
| `history` | the résumé as shell history, ending with the commands *you* just ran |
| `sudo rm -rf / --no-preserve-root` | the ghost in the tube refuses |

### Cinema & games

| Type | What happens |
|------|--------------|
| `ghost` / `dive` | *Ghost in the Shell* — the net is vast and infinite | 
| `lain` / `wired` | *Serial Experiments Lain* — close the world, open the nExt |
| `konami` | 30 lives + a phosphor that never shipped (magenta) |
| `iddqd` | god mode: phosphor at maximum |
| `idkfa` | all weapons granted: one (1) keyboard |
| `hack the planet` | HACK THE PLANET! |
| `42` | the answer | 

### Terminal folklore

| Type | What happens |
|------|--------------|
| `sl` | you meant `ls`. the locomotive crosses the screen anyway |
| `cowsay <text>` | the cow says it |
| `vim` / `emacs` | the editor jokes |
| `xyzzy` | nothing happens (that IS the reference) |
| `fortune` | a hacker/artist proverb |
| `coffee` | a fresh cup, gpu overclocked |
| `moon` / `phase` | the current moon, from a tube with no window |
| `sudo make me a sandwich` | okay. (you said the magic word.) 🥪 |
| `make me a sandwich` | make it yourself |

*(and a few more — keep typing.)*

---

## Tweaks

There's a settings panel (the gear) to tune the tube: phosphor color, glow, bloom,
emission, misconvergence, burn-in, reflection, scanlines, curvature, flicker, jitter,
dust & wear, dead-pixel odds, flyback volume, and the terminal font (VT323 or mono).

Everything respects `prefers-reduced-motion`, is keyboard-reachable, and adapts down to
mobile.

---

## Links

- Portfolio — [tzm.ink](https://tzm.ink/)
- GitHub — [@thezakman](https://github.com/thezakman)

*online since 1987 · (c) TheZakMan*
