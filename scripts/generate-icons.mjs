/**
 * Génère les icônes PNG de la PWA sans aucune dépendance : Node sait déjà
 * compresser (zlib), et un PNG n'est qu'un en-tête plus des scanlines
 * dégonflées. Évite d'ajouter sharp ou un générateur d'assets de 200 Mo pour
 * trois images.
 *
 *   npm run icons
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

/* ------------------------------ encodeur PNG ------------------------------ */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // 8 bits par canal
  ihdr[9] = 6 // RGBA
  // Scanlines sans filtre : un octet 0 en tête de chaque ligne.
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* -------------------------------- dessin --------------------------------- */

const COLORS = {
  blue: [28, 100, 214],
  navy: [0, 41, 92],
  white: [245, 253, 244],
  dimple: [200, 225, 205],
  flag: [241, 55, 61],
  pole: [226, 232, 240],
}

/** Disque, en coordonnées normalisées 0 → 1. */
const disc = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r

/** Rectangle. */
const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1

/** Triangle, par la méthode des produits vectoriels de même signe. */
const triangle = (ax, ay, bx, by, cx, cy) => (x, y) => {
  const sign = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px)
  const d1 = sign(ax, ay, bx, by, x, y)
  const d2 = sign(bx, by, cx, cy, x, y)
  const d3 = sign(cx, cy, ax, ay, x, y)
  return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0)
}

/** Carré à coins arrondis. */
const roundedSquare = (margin, radius) => (x, y) => {
  const lo = margin
  const hi = 1 - margin
  if (x < lo || x > hi || y < lo || y > hi) return false
  const dx = Math.min(Math.max(x, lo + radius), hi - radius)
  const dy = Math.min(Math.max(y, lo + radius), hi - radius)
  return (x - dx) ** 2 + (y - dy) ** 2 <= radius * radius
}

const SAMPLES = 4 // 4×4 sur-échantillonnage : suffisant pour lisser les bords

function render(size, layers) {
  const rgba = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let [r, g, b, a] = [0, 0, 0, 0]
      for (const layer of layers) {
        // Couverture du pixel par la forme, estimée par sur-échantillonnage.
        let hits = 0
        for (let sy = 0; sy < SAMPLES; sy++) {
          for (let sx = 0; sx < SAMPLES; sx++) {
            const x = (px + (sx + 0.5) / SAMPLES) / size
            const y = (py + (sy + 0.5) / SAMPLES) / size
            if (layer.shape(x, y)) hits++
          }
        }
        if (hits === 0) continue
        const cov = hits / (SAMPLES * SAMPLES)
        const [lr, lg, lb] = layer.color
        // Composition « source over ».
        const outA = cov + a * (1 - cov)
        r = (lr * cov + r * a * (1 - cov)) / outA
        g = (lg * cov + g * a * (1 - cov)) / outA
        b = (lb * cov + b * a * (1 - cov)) / outA
        a = outA
      }
      const o = (py * size + px) * 4
      rgba[o] = Math.round(r)
      rgba[o + 1] = Math.round(g)
      rgba[o + 2] = Math.round(b)
      rgba[o + 3] = Math.round(a * 255)
    }
  }
  return rgba
}

/**
 * Le logo : un drapeau de golf planté sur un green, et une balle.
 * `inset` resserre le dessin pour la version maskable, dont Android peut
 * rogner jusqu'à 10 % de chaque bord.
 */
function logoLayers({ background, inset = 0 }) {
  // Transforme une coordonnée du dessin vers la zone utile.
  const t = (v) => 0.5 + (v - 0.5) * (1 - inset * 2)
  const d = (v) => v * (1 - inset * 2)

  const green = disc(0.5, t(0.78), d(0.34))

  return [
    background,
    // Le green (en bleu marine, comme la charte), détouré par le fond pour qu'il ne déborde pas des coins arrondis.
    {
      shape: (x, y) => green(x, y) && background.shape(x, y),
      color: COLORS.blue,
    },
    // Hampe du drapeau
    { shape: rect(t(0.595), t(0.2), t(0.635), t(0.78)), color: COLORS.pole },
    // Le drapeau
    {
      shape: triangle(t(0.635), t(0.2), t(0.635), t(0.44), t(0.86), t(0.32)),
      color: COLORS.flag,
    },
    // La balle et ses alvéoles
    { shape: disc(t(0.33), t(0.66), d(0.14)), color: COLORS.white },
    { shape: disc(t(0.3), t(0.63), d(0.022)), color: COLORS.dimple },
    { shape: disc(t(0.37), t(0.64), d(0.022)), color: COLORS.dimple },
    { shape: disc(t(0.335), t(0.7), d(0.022)), color: COLORS.dimple },
  ]
}

const ICONS = [
  {
    file: 'icon-192.png',
    size: 192,
    layers: logoLayers({
      background: { shape: roundedSquare(0.02, 0.2), color: COLORS.navy },
    }),
  },
  {
    file: 'icon-512.png',
    size: 512,
    layers: logoLayers({
      background: { shape: roundedSquare(0.02, 0.2), color: COLORS.navy },
    }),
  },
  {
    // Maskable : fond plein bord à bord, dessin resserré dans la zone sûre.
    file: 'icon-maskable-512.png',
    size: 512,
    layers: logoLayers({
      background: { shape: () => true, color: COLORS.navy },
      inset: 0.12,
    }),
  },
]

for (const icon of ICONS) {
  writeFileSync(join(PUBLIC_DIR, icon.file), encodePng(icon.size, render(icon.size, icon.layers)))
  console.log(`${icon.file} — ${icon.size}×${icon.size}`)
}
