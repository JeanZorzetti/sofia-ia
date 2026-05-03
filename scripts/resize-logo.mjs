import sharp from 'sharp'
import { copyFileSync } from 'fs'
import path from 'path'

const INPUT = 'public/logos/Design sem nome (13).png'

const sizes = [
  { out: 'public/logos/polaris-icon.png',    size: 120 },
  { out: 'public/logos/polaris-icon@2x.png', size: 240 },
  { out: 'public/favicon-32.png',            size: 32  },
  { out: 'public/favicon-16.png',            size: 16  },
  { out: 'public/apple-touch-icon.png',      size: 180 },
]

for (const { out, size } of sizes) {
  await sharp(INPUT)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out)
  console.log(`✅ ${out} (${size}x${size})`)
}

// favicon.ico = 32x32 PNG renomeado (browsers aceitam PNG como favicon)
copyFileSync('public/favicon-32.png', 'public/favicon.ico')
console.log('✅ public/favicon.ico')
