/**
 * NeoCode startup screen — filled-block text logo with Matrix gradient.
 * Called once at CLI startup before the Ink UI renders.
 *
 * Addresses: https://github.com/neocode/cli/issues/55
 */

import { isLocalProviderUrl } from '../services/api/providerConfig.js'
import { getLocalOpenAICompatibleProviderLabel } from '../utils/providerDiscovery.js'
import { SCENE_W, SCENE_H, SCENE_PIXELS } from '../assets/matrixScene.js'
import { t } from '../utils/i18n.js'

declare const MACRO: { VERSION: string; DISPLAY_VERSION?: string }

const ESC = '\x1b['
const RESET = `${ESC}0m`
const DIM = `${ESC}2m`

type RGB = [number, number, number]
const rgb = (r: number, g: number, b: number) => `${ESC}38;2;${r};${g};${b}m`

// ─── Animation helpers ────────────────────────────────────────────────────────

const HIDE_CURSOR = '\x1b[?25l'
const SHOW_CURSOR = '\x1b[?25h'
const CLEAR_SCREEN = '\x1b[2J\x1b[H'
const CURSOR_HOME = '\x1b[H'

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))

const NO_SPLASH =
  process.env.NEOCODE_NO_SPLASH === '1' ||
  process.env.NEOCODE_NO_ANIMATIONS === '1' ||
  process.env.NO_COLOR != null

// Katakana half-width + digits/symbols — classic Matrix charset
const RAIN_CHARS =
  'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ012345789:・."=*+-<>¦|'

function rndChar(): string {
  return RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)]!
}

// ─── Matrix Rain (2 s) ────────────────────────────────────────────────────────

async function matrixRain(): Promise<void> {
  const cols = Math.min(process.stdout.columns || 80, 120)
  const rows = Math.min(process.stdout.rows || 24, 20)
  const FRAMES = 36          // 36 × 50 ms = 1.8 s

  // Per-column head position (< 0 = inactive / waiting)
  const head: number[] = Array.from({ length: cols }, () =>
    Math.random() > 0.55 ? -Math.floor(Math.random() * rows) : -1,
  )
  // Per-cell rendered character (with ANSI color already embedded)
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array<string>(cols).fill(' '),
  )

  process.stdout.write(HIDE_CURSOR + CLEAR_SCREEN)

  // ── Render frames ──────────────────────────────────────────────────────────
  for (let f = 0; f < FRAMES; f++) {
    // Advance heads
    for (let c = 0; c < cols; c++) {
      const h = head[c]!
      if (h >= 0 && h < rows) {
        grid[h]![c] = `${rgb(0, 255, 65)}${rndChar()}${RESET}`             // head: bright
        if (h > 0) grid[h - 1]![c] = `${rgb(0, 210, 55)}${rndChar()}${RESET}` // neck: medium
        if (h > 2) grid[h - 2]![c] = `${rgb(0, 150, 35)}${rndChar()}${RESET}` // body
        if (h > 5) grid[h - 5]![c] = `${rgb(0, 80, 20)}${rndChar()}${RESET}`  // tail
        if (h > 10) grid[h - 10]![c] = ' '                                  // erase old
        head[c] = h + 1
      } else if (h >= rows) {
        // Cleanup & maybe restart
        const tail = Math.max(0, h - 10)
        for (let r = tail; r < rows; r++) grid[r]![c] = ' '
        head[c] = Math.random() > 0.4 ? -(Math.floor(Math.random() * 6)) : -1
      } else {
        // Inactive: small chance to spawn
        head[c] = h < -1 ? h + 1 : (Math.random() > 0.97 ? 0 : -1)
      }
    }

    // Write frame (single write avoids flicker)
    let frame = CURSOR_HOME
    for (let r = 0; r < rows; r++) {
      frame += grid[r]!.join('') + (r < rows - 1 ? '\r\n' : '')
    }
    process.stdout.write(frame)
    await sleep(50)
  }

  // ── Fade to black ──────────────────────────────────────────────────────────
  const fadeColors: RGB[] = [
    [0, 100, 25],
    [0, 60, 15],
    [0, 30, 8],
    [0, 10, 3],
    [0, 0, 0],
  ]
  for (const fc of fadeColors) {
    let frame = CURSOR_HOME
    for (let r = 0; r < rows; r++) {
      const row = grid[r]!.map(cell => {
        const bare = cell.replace(/\x1b\[[^m]*m/g, '')
        return bare.trim() ? `${rgb(...fc)}${bare}${RESET}` : ' '
      })
      frame += row.join('') + (r < rows - 1 ? '\r\n' : '')
    }
    process.stdout.write(frame)
    await sleep(60)
  }

  process.stdout.write(CLEAR_SCREEN + SHOW_CURSOR)
}

function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function gradAt(stops: RGB[], t: number): RGB {
  const c = Math.max(0, Math.min(1, t))
  const s = c * (stops.length - 1)
  const i = Math.floor(s)
  if (i >= stops.length - 1) return stops[stops.length - 1]
  return lerp(stops[i], stops[i + 1], s - i)
}

function paintLine(text: string, stops: RGB[], lineT: number): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const t = text.length > 1 ? lineT * 0.5 + (i / (text.length - 1)) * 0.5 : lineT
    const [r, g, b] = gradAt(stops, t)
    out += `${rgb(r, g, b)}${text[i]}`
  }
  return out + RESET
}

// ─── Colors ───────────────────────────────────────────────────────────────────
// NeoCode Matrix palette: phosphor greens + electric cyan accents

const MATRIX_GRAD: RGB[] = [
  [0, 255, 65],    // bright phosphor green
  [0, 220, 80],    // matrix green
  [0, 190, 90],    // mid green
  [0, 160, 100],   // teal-green
  [0, 140, 110],   // dark teal
  [0, 120, 100],   // deep green
]

const ACCENT: RGB = [0, 255, 65]
const CREAM: RGB = [0, 230, 118]
const DIMCOL: RGB = [0, 140, 80]
const BORDER: RGB = [0, 160, 90]

// ─── Neo Mascot — half-block pixel art (12 col × 8 display rows = 16 px rows) ─
//
// Design: Neo in iconic "stop" pose — one hand raised (left side), sunglasses,
//         long coat. Uses ▀ (U+2580) with 24-bit fg/bg ANSI to pack 2 pixel rows
//         per terminal row. Mirrors the compact mascot style of Claude Code / Copilot.
//
// Pixel colors:
//   B = [0,0,0]      transparent / background
//   G = [0,210,55]   face & raised hand (bright matrix green = skin analogue)
//   N = [0,6,2]      sunglasses lenses (near-black, reads as opaque dark)
//   D = [0,50,14]    coat shadow / dark areas
//   M = [0,100,28]   coat mid-tone / body
//   L = [0,160,45]   coat highlight edge

type Pixel = [number, number, number]
const _B: Pixel = [0, 0, 0]
const _G: Pixel = [0, 210, 55]
const _N: Pixel = [0, 6, 2]
const _D: Pixel = [0, 50, 14]
const _M: Pixel = [0, 100, 28]
const _L: Pixel = [0, 160, 45]

//            col:  0   1   2   3   4   5   6   7   8   9  10  11
const NEO_PIX: Pixel[][] = [
  /* Y0  hand */ [_B, _B, _G, _G, _G, _G, _B, _B, _B, _B, _B, _B],
  /* Y1  hand */ [_B, _G, _G, _G, _G, _B, _B, _B, _B, _B, _B, _B],
  /* Y2  arm  */ [_B, _G, _B, _B, _B, _G, _G, _G, _G, _B, _B, _B],
  /* Y3  head */ [_B, _B, _B, _B, _G, _G, _G, _G, _G, _B, _B, _B],
  /* Y4  gls  */ [_B, _B, _B, _B, _G, _N, _N, _N, _G, _B, _B, _B],
  /* Y5  gls  */ [_B, _B, _B, _B, _G, _N, _N, _N, _G, _B, _B, _B],
  /* Y6  chin */ [_B, _B, _B, _B, _G, _G, _G, _G, _B, _B, _B, _B],
  /* Y7  col  */ [_B, _B, _B, _D, _M, _M, _M, _M, _D, _B, _B, _B],
  /* Y8  shldr*/ [_B, _D, _L, _M, _M, _M, _M, _M, _M, _L, _D, _B],
  /* Y9  shldr*/ [_B, _D, _L, _M, _M, _M, _M, _M, _M, _L, _D, _B],
  /* Y10 body */ [_B, _B, _D, _D, _M, _M, _M, _M, _D, _D, _B, _B],
  /* Y11 body */ [_B, _B, _D, _D, _D, _M, _M, _D, _D, _D, _B, _B],
  /* Y12 hem  */ [_B, _B, _B, _D, _D, _D, _D, _D, _D, _B, _B, _B],
  /* Y13 legs */ [_B, _B, _B, _D, _B, _B, _B, _D, _B, _B, _B, _B],
  /* Y14 legs */ [_B, _B, _B, _D, _B, _B, _B, _D, _B, _B, _B, _B],
  /* Y15 feet */ [_B, _B, _B, _D, _B, _B, _B, _D, _B, _B, _B, _B],
]

function renderNeoMascot(): string[] {
  const DISPLAY_ROWS = 8  // 16 pixel rows / 2
  const W = 12
  const lines: string[] = []

  for (let dr = 0; dr < DISPLAY_ROWS; dr++) {
    const topRow = NEO_PIX[dr * 2]!
    const botRow = NEO_PIX[dr * 2 + 1]!
    let line = ''

    for (let c = 0; c < W; c++) {
      const [tr, tg, tb] = topRow[c]!
      const [br, bg_, bb] = botRow[c]!
      // Treat pure black [0,0,0] as transparent (no rendering)
      const tBlk = tr === 0 && tg === 0 && tb === 0
      const bBlk = br === 0 && bg_ === 0 && bb === 0

      if (tBlk && bBlk) {
        line += ' '
      } else if (tBlk) {
        // Only bottom has color → lower half block ▄
        line += `${ESC}38;2;${br};${bg_};${bb}m\u2584${RESET}`
      } else if (bBlk) {
        // Only top has color → upper half block ▀
        line += `${ESC}38;2;${tr};${tg};${tb}m\u2580${RESET}`
      } else {
        // Both have color: ▀ fg=top, bg=bottom
        line += `${ESC}38;2;${tr};${tg};${tb}m${ESC}48;2;${br};${bg_};${bb}m\u2580${RESET}`
      }
    }
    lines.push(line)
  }
  return lines
}

// ─── Matrix Silhouette — half-block pixel art ────────────────────────────────
//
// Technique: char ▀ (U+2580 upper-half block) with 24-bit fg+bg ANSI color.
//   fg = top pixel    \x1b[38;2;R;G;Bm
//   bg = bottom pixel \x1b[48;2;R;G;Bm
// Each display row = 2 pixel rows → 16 display rows = 32 pixel rows × W cols.
//
// Scene is generated algorithmically (no external images):
//   5 figures (ellipse heads + rect bodies) against a sin-wave rain background.
//   Centre figure (Neo) is brightest; partials on each edge enter from offscreen.

function matrixGreen(t: number): Pixel {
  const v = Math.max(0, Math.min(1, t))
  if (v < 0.04) return [0, 0, 0]
  const g = Math.round(v * 255)
  const b = Math.round(v * 65)
  return [0, g, b]
}

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}

function generatePixels(W: number, H: number): Pixel[][] {
  // ─── Visual hierarchy (Matrix aesthetic) ────────────────────────────────────
  // Background rain:  0.03–0.20  (visible green columns)
  // Suit / body:      0.05–0.18  (DARKER than rain → silhouette from face contrast)
  // Collar / lapels:  0.38–0.50  (shirt collar, bright V-shape)
  // Face (shadow):    0.45–0.70
  // Face (lit):       0.70–1.00
  // Sunglasses:       0.02–0.06  (nearly black)
  // Nose/chin hi:     +0.12–0.18
  // ────────────────────────────────────────────────────────────────────────────

  const figDefs = [
    { cx: 0.09, hy: 0.38, rx: 0.058, ry: 0.13, b: 0.72 }, // partial left
    { cx: 0.28, hy: 0.27, rx: 0.076, ry: 0.16, b: 0.90 }, // agent L
    { cx: 0.50, hy: 0.17, rx: 0.086, ry: 0.18, b: 1.00 }, // Neo — centre / tallest
    { cx: 0.72, hy: 0.26, rx: 0.076, ry: 0.16, b: 0.86 }, // agent R
    { cx: 0.91, hy: 0.36, rx: 0.058, ry: 0.13, b: 0.62 }, // partial right
  ].map(f => ({
    cx: f.cx * W, hy: f.hy * H,
    rx: f.rx * W, ry: f.ry * H,
    b: f.b,
  }))

  const rows: Pixel[][] = []

  for (let y = 0; y < H; y++) {
    const row: Pixel[] = []
    for (let x = 0; x < W; x++) {
      // ── Background: overlapping sin waves → visible vertical rain columns ──
      const r1 = Math.sin(x * 0.52) * 0.5 + 0.5           // wide columns
      const r2 = Math.sin(x * 1.85 + 1.3) * 0.5 + 0.5     // narrow flicker
      const r3 = Math.sin(y * 0.38 + x * 0.13) * 0.5 + 0.5 // vertical drift
      let intensity = (r1 * 0.55 + r2 * 0.30 + r3 * 0.15) * 0.17 + 0.03  // 0.03–0.20

      for (const fig of figDefs) {
        // ── Head: ellipse ────────────────────────────────────────────────────
        const hdx = (x - fig.cx) / fig.rx
        const hdy = (y - fig.hy) / fig.ry
        const hd  = Math.sqrt(hdx * hdx + hdy * hdy)

        if (hd < 1.3) {
          // Face base — smoothstep falloff, brighter at forehead (normY < 0)
          const normY  = (y - fig.hy) / fig.ry
          const liftY  = Math.max(0, -normY * 0.22)  // +22 % at top of forehead
          const base   = smoothstep(1 - hd / 1.3) * fig.b * (1.0 + liftY)

          // Sunglasses: very dark horizontal band (agent signature)
          const eyeY      = fig.hy + fig.ry * 0.08
          const eyeH      = fig.ry * 0.24
          const inGlasses = Math.abs(y - eyeY) < eyeH && hd < 0.90
          const faceI     = inGlasses ? base * 0.05 : base  // glasses ≈ black

          // Nose: centre-line highlight below glasses → bridge + tip
          const noseX     = Math.abs(x - fig.cx) < fig.rx * 0.15
          const noseY     = y > eyeY + eyeH && y < fig.hy + fig.ry * 0.56
          const noseBoost = noseX && noseY ? 0.16 * fig.b : 0

          // Chin area: slightly dimmer than cheeks
          const inChin = normY > 0.55
          const chinMul = inChin ? 0.78 : 1.0

          intensity = Math.max(intensity, (faceI + noseBoost) * chinMul)
        }

        // ── Body / suit — intentionally DARK (silhouette by face contrast) ──
        const bodyTop = fig.hy + fig.ry * 1.02
        if (y > bodyTop) {
          const progress = (y - bodyTop) / (H - bodyTop)
          // Very wide shoulders (2× head width), normal body below
          const halfW   = fig.rx * (2.1 - progress * 0.3)
          const dx      = Math.abs(x - fig.cx)
          if (dx < halfW) {
            const edgeFade = smoothstep((halfW - dx) / (halfW * 0.20))
            // Suit is darker than background: 0.13 at top → 0.07 at bottom
            const bodyI   = edgeFade * (0.13 - progress * 0.06)
            intensity = Math.max(intensity, bodyI)
          }
        }

        // ── Collar / shirt: bright V at neck-suit transition ─────────────────
        const collarCY  = fig.hy + fig.ry * 1.06
        const collarH   = fig.ry * 0.14
        if (Math.abs(y - collarCY) < collarH) {
          // V-shape: two angled stripes from centre
          const xOff = Math.abs(x - fig.cx)
          const vEdge = (collarH - Math.abs(y - collarCY)) / collarH * fig.rx * 0.60
          if (xOff < vEdge) {
            const colI = smoothstep(1 - xOff / vEdge) * fig.b * 0.46
            intensity = Math.max(intensity, colI)
          }
        }

        // ── Neck: thin bright column ─────────────────────────────────────────
        const neckTop = fig.hy + fig.ry * 0.90
        const neckBot = fig.hy + fig.ry * 1.08
        if (y > neckTop && y < neckBot && Math.abs(x - fig.cx) < fig.rx * 0.20) {
          intensity = Math.max(intensity, fig.b * 0.48)
        }
      }

      row.push(matrixGreen(intensity))
    }
    rows.push(row)
  }
  return rows
}

// ─── Terminal Protocol Detection ──────────────────────────────────────────────
// Priority: Sixel (Windows Terminal, iTerm2, VTE) > half-block fallback

function detectRenderProtocol(): 'sixel' | 'halfblock' {
  if (process.env.KITTY_WINDOW_ID) return 'sixel'         // Kitty (Sixel-capable)
  if (process.env.WT_SESSION) return 'sixel'              // Windows Terminal 1.22+
  if (process.env.TERM_PROGRAM === 'iTerm.app') return 'sixel'
  const vte = Number(process.env.VTE_VERSION ?? 0)
  if (vte >= 5800) return 'sixel'                         // GNOME Terminal 0.58+
  return 'halfblock'
}

// ─── Sixel Renderer ───────────────────────────────────────────────────────────
//
// Sixel format basics:
//   \x1bPq            — DCS: enter Sixel mode
//   #n;2;r;g;b        — define palette color n (r,g,b ∈ 0-100)
//   #n                — select color n for next row
//   char (0x3F–0x7E)  — 6 vertical pixels; bitmask = char - 0x3F
//   !N char           — RLE: repeat char N times
//   $                 — carriage return within band (start of same 6-row band)
//   -                 — advance to next band (6 rows down)
//   \x1b\\            — ST: exit Sixel

const SIXEL_PALETTE: readonly Pixel[] = [
  [0,   0,  0],   // 0 void
  [0,  20,  0],   // 1 near-black
  [0,  50,  0],   // 2 dark bg/suit
  [0,  85,  0],   // 3 suit shadow
  [0, 130,  0],   // 4 suit lit / face shadow
  [0, 175, 30],   // 5 face lit
  [0, 215, 50],   // 6 face bright
  [0, 255, 65],   // 7 peak highlights
]

function quantizeSixel(px: Pixel): number {
  const g = px[1]!
  if (g <  10) return 0
  if (g <  30) return 1
  if (g <  64) return 2
  if (g < 102) return 3
  if (g < 153) return 4
  if (g < 198) return 5
  if (g < 234) return 6
  return 7
}

// Decode embedded pixel data (if present) into full-resolution Pixel[][] for rendering.
// SCENE_PIXELS chars are palette indices '0'-'7'; SCENE_W × SCENE_H is the native size.
// We scale up to (W, H) using nearest-neighbour so the same renderer handles both paths.
function decodeEmbeddedPixels(W: number, H: number): Pixel[][] | null {
  if (!SCENE_PIXELS || (SCENE_W as number) === 0 || (SCENE_H as number) === 0) return null

  // Map 8-level palette index → Pixel
  const palette: Pixel[] = [
    [0,   0,  0], [0,  20,  0], [0,  50,  0], [0,  85,  0],
    [0, 130,  0], [0, 175, 30], [0, 215, 50], [0, 255, 65],
  ]

  const rows: Pixel[][] = []
  for (let dy = 0; dy < H; dy++) {
    const srcY = Math.floor(dy / H * SCENE_H)
    const row: Pixel[] = []
    for (let dx = 0; dx < W; dx++) {
      const srcX = Math.floor(dx / W * SCENE_W)
      const idx  = srcY * SCENE_W + srcX
      const lvl  = parseInt(SCENE_PIXELS[idx] ?? '0', 10) as 0|1|2|3|4|5|6|7
      row.push(palette[lvl]!)
    }
    rows.push(row)
  }
  return rows
}

function generateSixelOutput(W: number, H: number): string {
  const pixels = decodeEmbeddedPixels(W, H) ?? generatePixels(W, H)
  const NC = SIXEL_PALETTE.length
  const bands = Math.ceil(H / 6)

  let out = '\x1bPq'

  // Emit palette
  for (let i = 0; i < NC; i++) {
    const [r, g, b] = SIXEL_PALETTE[i]!
    out += `#${i};2;${Math.round(r / 255 * 100)};${Math.round(g / 255 * 100)};${Math.round(b / 255 * 100)}`
  }

  for (let band = 0; band < bands; band++) {
    // Build 6-row bitmask per color per column
    const bm = Array.from({ length: NC }, () => new Uint8Array(W))

    for (let sub = 0; sub < 6; sub++) {
      const y = band * 6 + sub
      if (y >= H) continue
      for (let x = 0; x < W; x++) {
        bm[quantizeSixel(pixels[y]![x]!)]![x] |= 1 << sub
      }
    }

    // Emit each color that has at least one set pixel
    let first = true
    for (let ci = 0; ci < NC; ci++) {
      const row = bm[ci]!
      if (!row.some(Boolean)) continue
      if (!first) out += '$'   // carriage return for next color in same band
      first = false
      out += `#${ci}`

      // RLE encode
      let x = 0
      while (x < W) {
        const v = row[x]!
        let run = 1
        while (x + run < W && row[x + run] === v) run++
        const ch = String.fromCharCode(0x3F + v)
        out += run >= 4 ? `!${run}${ch}` : ch.repeat(run)
        x += run
      }
    }
    out += '-'   // advance to next band
  }

  out += '\x1b\\'  // exit Sixel
  return out
}

// ─── Scene renderer — protocol-aware ─────────────────────────────────────────
//
// Sixel path: 8 px/char × 78 cols = 624 px wide; 16 px/row × 16 rows = 256 px
//             rounded up to nearest 6-row band: 258 px tall (43 bands)
// Half-block: 78 cols × 32 pixel rows (16 display rows, 2 pixels per row)

function renderScene(): string {
  const cols = Math.min(process.stdout.columns || 78, 78)
  if (detectRenderProtocol() === 'sixel') {
    // Pixel dimensions to fill ~16 terminal rows × 78 cols
    const SW = cols * 8        // 8 terminal-pixel assumption per char
    const SH = Math.ceil((16 * 16) / 6) * 6  // 256 px → 258 (43 bands × 6)
    return generateSixelOutput(SW, SH)
  }

  // Half-block fallback (▀ with 24-bit fg+bg per cell)
  const W = cols
  const DISPLAY_ROWS = 16
  const H = DISPLAY_ROWS * 2
  const pixels = decodeEmbeddedPixels(W, H) ?? generatePixels(W, H)
  const lines: string[] = []
  for (let dr = 0; dr < DISPLAY_ROWS; dr++) {
    const topRow = pixels[dr * 2]!
    const botRow = pixels[dr * 2 + 1]!
    let line = ''
    for (let c = 0; c < W; c++) {
      const [tr, tg, tb] = topRow[c]!
      const [br, bg_, bb] = botRow[c]!
      line += `${ESC}38;2;${tr};${tg};${tb}m${ESC}48;2;${br};${bg_};${bb}m\u2580${RESET}`
    }
    lines.push(line)
  }
  return lines.join('\n')
}

// ─── Filled Block Text Logo ───────────────────────────────────────────────────

const LOGO_NEO = [
  `  \u2588\u2588\u2557  \u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557`,
  `  \u2588\u2588\u2588\u2557 \u2588\u2588\u2551 \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u2550\u255d  \u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2551`,
  `  \u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551 \u2588\u2588\u2588\u2588\u2588\u2588\u2557    \u2588\u2588\u2551   \u2588\u2588\u2551`,
  `  \u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2551 \u2588\u2588\u2554\u2550\u2550\u2550\u255d    \u2588\u2588\u2551   \u2588\u2588\u2551`,
  `  \u2588\u2588\u2551 \u255a\u2588\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551`,
  `  \u255a\u2550\u255d  \u255a\u2550\u2550\u255d\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d`,
]

const LOGO_CODE = [
  `  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557`,
  `  \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u2550\u255d  \u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2551  \u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2551  \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u2550\u255d`,
  `  \u2588\u2588\u2551        \u2588\u2588\u2551   \u2588\u2588\u2551  \u2588\u2588\u2551   \u2588\u2588\u2551  \u2588\u2588\u2588\u2588\u2588\u2588\u2557  `,
  `  \u2588\u2588\u2551        \u2588\u2588\u2551   \u2588\u2588\u2551  \u2588\u2588\u2551   \u2588\u2588\u2551  \u2588\u2588\u2554\u2550\u2550\u2550\u255d  `,
  `  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557`,
  `  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d`,
]

// ─── Provider detection ───────────────────────────────────────────────────────

function detectProvider(): { name: string; model: string; baseUrl: string; isLocal: boolean } {
  const useGemini = process.env.CLAUDE_CODE_USE_GEMINI === '1' || process.env.CLAUDE_CODE_USE_GEMINI === 'true'
  const useGithub = process.env.CLAUDE_CODE_USE_GITHUB === '1' || process.env.CLAUDE_CODE_USE_GITHUB === 'true'
  const useOpenAI = process.env.CLAUDE_CODE_USE_OPENAI === '1' || process.env.CLAUDE_CODE_USE_OPENAI === 'true'

  if (useGemini) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai'
    return { name: 'Google Gemini', model, baseUrl, isLocal: false }
  }

  if (useGithub) {
    const model = process.env.OPENAI_MODEL || 'github:copilot'
    const baseUrl =
      process.env.OPENAI_BASE_URL || 'https://api.githubcopilot.com'
    return { name: 'GitHub Copilot', model, baseUrl, isLocal: false }
  }

  if (useOpenAI) {
    const rawModel = process.env.OPENAI_MODEL || 'gpt-4o'
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const isLocal = isLocalProviderUrl(baseUrl)
    let name = 'OpenAI'
    if (/deepseek/i.test(baseUrl) || /deepseek/i.test(rawModel)) name = 'DeepSeek'
    else if (/openrouter/i.test(baseUrl)) name = 'OpenRouter'
    else if (/together/i.test(baseUrl)) name = 'Together AI'
    else if (/groq/i.test(baseUrl)) name = 'Groq'
    else if (/mistral/i.test(baseUrl) || /mistral/i.test(rawModel)) name = 'Mistral'
    else if (/azure/i.test(baseUrl)) name = 'Azure OpenAI'
    else if (/llama/i.test(rawModel)) name = 'Meta Llama'
    else if (isLocal) name = getLocalOpenAICompatibleProviderLabel(baseUrl)

    // Resolve model alias to actual model name + reasoning effort
    let displayModel = rawModel
    const codexAliases: Record<string, { model: string; reasoningEffort?: string }> = {
      codexplan: { model: 'gpt-5.4', reasoningEffort: 'high' },
      'gpt-5.4': { model: 'gpt-5.4', reasoningEffort: 'high' },
      'gpt-5.3-codex': { model: 'gpt-5.3-codex', reasoningEffort: 'high' },
      'gpt-5.3-codex-spark': { model: 'gpt-5.3-codex-spark' },
      codexspark: { model: 'gpt-5.3-codex-spark' },
      'gpt-5.2-codex': { model: 'gpt-5.2-codex', reasoningEffort: 'high' },
      'gpt-5.1-codex-max': { model: 'gpt-5.1-codex-max', reasoningEffort: 'high' },
      'gpt-5.1-codex-mini': { model: 'gpt-5.1-codex-mini' },
      'gpt-5.4-mini': { model: 'gpt-5.4-mini', reasoningEffort: 'medium' },
      'gpt-5.2': { model: 'gpt-5.2', reasoningEffort: 'medium' },
    }
    const alias = rawModel.toLowerCase()
    if (alias in codexAliases) {
      const resolved = codexAliases[alias]
      displayModel = resolved.model
      if (resolved.reasoningEffort) {
        displayModel = `${displayModel} (${resolved.reasoningEffort})`
      }
    }

    return { name, model: displayModel, baseUrl, isLocal }
  }

  // Default: Anthropic
  const model = process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'
  return { name: 'Anthropic', model, baseUrl: 'https://api.anthropic.com', isLocal: false }
}

// ─── Box drawing ──────────────────────────────────────────────────────────────

function boxRow(content: string, width: number, rawLen: number): string {
  const pad = Math.max(0, width - 2 - rawLen)
  return `${rgb(...BORDER)}\u2502${RESET}${content}${' '.repeat(pad)}${rgb(...BORDER)}\u2502${RESET}`
}

// ─── Logo char-by-char reveal ─────────────────────────────────────────────────

async function revealLogo(lines: string[], charDelay = 4): Promise<void> {
  for (const line of lines) {
    if (line === '') {
      process.stdout.write('\n')
      await sleep(charDelay * 3)
      continue
    }
    // Extract color segments by splitting on ESC sequences
    const segments: Array<{ ansi: string; char: string }> = []
    const re = /(\x1b\[[^m]*m)([^\x1b]?)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(line)) !== null) {
      if (m[2]) segments.push({ ansi: m[1]!, char: m[2]! })
    }
    if (segments.length === 0) {
      // Fallback: print line as-is
      process.stdout.write(line + '\n')
    } else {
      for (const seg of segments) {
        process.stdout.write(seg.ansi + seg.char + RESET)
        await sleep(charDelay)
      }
      process.stdout.write('\n')
    }
  }
}

// ─── NEOCODE full banner (all 7 letters in one 6-row block) ─────────────────

const LOGO_NEOCODE = [
  `  ███╗   ██╗███████╗ ██████╗  ██████╗ ██████╗ ██████╗ ███████╗  `,
  `  ████╗  ██║██╔════╝██╔═══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝  `,
  `  ██╔██╗ ██║█████╗  ██║   ██║██║     ██║   ██║██║  ██║█████╗    `,
  `  ██║╚██╗██║██╔══╝  ██║   ██║██║     ██║   ██║██║  ██║██╔══╝    `,
  `  ██║ ╚████║███████╗╚██████╔╝╚██████╗╚██████╔╝██████╔╝███████╗  `,
  `  ╚═╝  ╚═══╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝  `,
]

// ─── Banner lines builder ─────────────────────────────────────────────────────

function buildBannerLines(): string[] {
  const total = LOGO_NEOCODE.length
  return LOGO_NEOCODE.map((line, i) => {
    const t = total > 1 ? i / (total - 1) : 0
    return paintLine(line, MATRIX_GRAD, t)
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function printStartupScreen(): Promise<void> {
  // Skip in non-interactive / CI / print mode
  if (process.env.CI || !process.stdout.isTTY) return

  const p = detectProvider()
  const version = MACRO.DISPLAY_VERSION ?? MACRO.VERSION
  const cols = Math.min(process.stdout.columns || 80, 120)

  // ── 1. Matrix rain intro ──────────────────────────────────────────────────────
  if (!NO_SPLASH) {
    await matrixRain()
    process.stdout.write('\n')
  }

  // ── 2. NEOCODE big banner (char-by-char reveal) ───────────────────────────────
  const bannerLines = buildBannerLines()
  if (!NO_SPLASH) {
    await revealLogo(bannerLines, 3)
  } else {
    for (const line of bannerLines) process.stdout.write(line + '\n')
  }
  process.stdout.write('\n')

  // ── 3. Neo + agents silhouette scene ─────────────────────────────────────────
  if (!NO_SPLASH) {
    const scene = renderScene()
    const sceneLines = scene.split('\n')
    for (const line of sceneLines) {
      process.stdout.write(line + '\n')
      await sleep(20)
    }
    process.stdout.write('\n')
  }

  // ── 4. Tagline (full, centered) ───────────────────────────────────────────────
  const taglineRaw = t('startup.tagline')

  const pad = (rawLen: number, colored: string) => {
    const p2 = Math.max(0, Math.floor((cols - rawLen) / 2))
    return ' '.repeat(p2) + colored
  }

  process.stdout.write(pad(taglineRaw.length, paintLine(taglineRaw, MATRIX_GRAD, 0.5)) + '\n')
  process.stdout.write('\n')

  // ── 5. Divider ────────────────────────────────────────────────────────────────
  const divLen = Math.min(60, cols)
  const divPad = ' '.repeat(Math.floor((cols - divLen) / 2))
  process.stdout.write(divPad + rgb(...BORDER) + '─'.repeat(divLen) + RESET + '\n')
  process.stdout.write('\n')

  // ── 6. Info block ─────────────────────────────────────────────────────────────
  const provC: RGB = p.isLocal ? [130, 175, 130] : ACCENT
  const sL   = p.isLocal ? t('startup.local') : t('startup.cloud')
  const ep   = p.baseUrl.length > 52 ? p.baseUrl.slice(0, 49) + '...' : p.baseUrl
  const LW   = Math.max(
    t('startup.provider').length,
    t('startup.model').length,
    t('startup.endpoint').length,
  ) + 1  // label column width — adapts to translation length

  const infoLines: string[] = [
    `  ${rgb(...ACCENT)}NeoCode${RESET}  ${DIM}${rgb(...DIMCOL)}v${version}${RESET}`,
    ``,
    `  ${DIM}${rgb(...DIMCOL)}${t('startup.provider').padEnd(LW)}${RESET}  ${rgb(...provC)}${p.name}${RESET}`,
    `  ${DIM}${rgb(...DIMCOL)}${t('startup.model').padEnd(LW)}${RESET}  ${rgb(...CREAM)}${p.model}${RESET}`,
    `  ${DIM}${rgb(...DIMCOL)}${t('startup.endpoint').padEnd(LW)}${RESET}  ${DIM}${rgb(...DIMCOL)}${ep}${RESET}`,
    ``,
    `  ${rgb(...provC)}\u25cf${RESET} ${DIM}${rgb(...DIMCOL)}${sL}   ${RESET}${rgb(...ACCENT)}/help${RESET}${DIM}${rgb(...DIMCOL)} ${t('startup.toBegin')}${RESET}`,
  ]

  for (const line of infoLines) {
    process.stdout.write(line + '\n')
    if (!NO_SPLASH) await sleep(40)
  }

  process.stdout.write('\n')
}
