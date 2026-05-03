import sharp from 'sharp'
import { mkdirSync } from 'fs'

const INPUT = 'public/logos/Design sem nome (13).png'
const OUT = 'public/logos/kit'

mkdirSync(OUT, { recursive: true })

const brand = {
  blue:   { r: 59,  g: 130, b: 246 },
  purple: { r: 168, g: 85,  b: 247 },
  dark:   { r: 10,  g: 10,  b: 20  },
  white:  { r: 255, g: 255, b: 255 },
}

async function save(pipeline, filename) {
  await pipeline.png().toFile(`${OUT}/${filename}`)
  console.log(`✅ ${filename}`)
}

// ── tamanhos base ─────────────────────────────────────────────────────────────
const sizes = [512, 256, 120, 64, 32, 16]
for (const s of sizes) {
  await save(
    sharp(INPUT).resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }),
    `polaris-icon-${s}.png`
  )
}

// ── sobre fundos coloridos ────────────────────────────────────────────────────
const backgrounds = [
  { name: 'white',  bg: { ...brand.white, alpha: 255 } },
  { name: 'black',  bg: { ...brand.dark,  alpha: 255 } },
  { name: 'blue',   bg: { ...brand.blue,  alpha: 255 } },
  { name: 'purple', bg: { ...brand.purple,alpha: 255 } },
]

for (const { name, bg } of backgrounds) {
  const icon = await sharp(INPUT).resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()

  await save(
    sharp({ create: { width: 512, height: 512, channels: 4, background: bg } })
      .composite([{ input: icon, gravity: 'center' }]),
    `polaris-on-${name}.png`
  )
}

// ── negativa (cores invertidas, fundo transparente) ───────────────────────────
await save(
  sharp(INPUT)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .negate({ alpha: false }),
  'polaris-negative.png'
)

// ── negativa sobre fundo escuro ───────────────────────────────────────────────
const negBuf = await sharp(INPUT)
  .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .negate({ alpha: false })
  .png()
  .toBuffer()

await save(
  sharp({ create: { width: 512, height: 512, channels: 4, background: { ...brand.dark, alpha: 255 } } })
    .composite([{ input: negBuf, gravity: 'center' }]),
  'polaris-negative-on-dark.png'
)

// ── apple touch icon (180x180, fundo branco) ──────────────────────────────────
const icon140 = await sharp(INPUT).resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
await save(
  sharp({ create: { width: 180, height: 180, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } } })
    .composite([{ input: icon140, gravity: 'center' }]),
  'apple-touch-icon.png'
)

// ── OG Image 1200x630 ─────────────────────────────────────────────────────────
const ogIcon = await sharp(INPUT).resize(300, 300, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()

// texto "Polaris IA" como SVG overlay
const textSvg = Buffer.from(`
  <svg width="600" height="100" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="75" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" opacity="0.95">Polaris IA</text>
  </svg>
`)

await save(
  sharp({ create: { width: 1200, height: 630, channels: 4, background: { ...brand.dark, alpha: 255 } } })
    .composite([
      { input: ogIcon,   left: 150, top: 165 },
      { input: textSvg,  left: 490, top: 265 },
    ]),
  'og-image.png'
)

console.log(`\n🎨 Kit gerado em public/logos/kit/ (${sizes.length + backgrounds.length + 4} arquivos)`)
