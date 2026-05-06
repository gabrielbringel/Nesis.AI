// Gera os 4 ícones PNG da extensão a partir do NesisMark (path SVG).
//
// Rodar uma vez (e novamente se a marca mudar):
//   node scripts/generate-icons.mjs
//
// Saída: public/icons/icon-{16,32,48,128}.png

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', 'public', 'icons')

const SIZES = [16, 32, 48, 128]
const COLOR = '#1a1a1a'
const PATH_D =
  'M12.14,12.17c-16.2,16.22-16.18,42.49.03,58.69l58.72,58.66c9.95,9.94,23.69,13.77,36.56,11.5,8.1-1.42,15.86-5.26,22.12-11.53,6.26-6.26,10.09-14.03,11.5-22.13,2.27-12.88-1.58-26.62-11.53-36.56L70.83,12.14c-16.21-16.2-42.49-16.18-58.69.03ZM117.94,84.24c9.3,9.29,9.3,24.35.02,33.64-9.29,9.3-24.35,9.3-33.65.02l-24.01-23.98,33.63-33.66s24.01,23.98,24.01,23.98ZM81.4,47.74l-33.63,33.66-23.1-23.07c-9.29-9.28-9.3-24.34,0-33.64,9.28-9.29,24.34-9.3,33.63-.02l23.1,23.07Z'

// Adiciona uma borda interna de ~10% para que a marca não fique colada nas bordas
// nos tamanhos pequenos (16/32). Resolvido reduzindo a área útil via translate+scale.
const PADDING_RATIO = 0.1

function buildSvg(size) {
  const padding = size * PADDING_RATIO
  const innerSize = size - padding * 2
  const scale = innerSize / 141.7
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="translate(${padding}, ${padding}) scale(${scale})">
    <path d="${PATH_D}" fill="${COLOR}"/>
  </g>
</svg>`
}

await mkdir(OUT_DIR, { recursive: true })

for (const size of SIZES) {
  const svg = Buffer.from(buildSvg(size))
  const out = resolve(OUT_DIR, `icon-${size}.png`)
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(out)
  console.log(`✓ ${out}`)
}
