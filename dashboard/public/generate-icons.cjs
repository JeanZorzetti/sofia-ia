/**
 * Script para gerar ícones PWA do Sofia IA
 * Executa com: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// SVG base do ícone Sofia IA
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:0.9" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="256" cy="256" r="240" fill="url(#bgGrad)" stroke="#4f46e5" stroke-width="8"/>
  
  <!-- Lightning/AI symbol -->
  <path d="M200 120 L320 120 L280 220 L340 220 L180 400 L240 280 L180 280 Z" 
        fill="url(#iconGrad)" 
        stroke="#e2e8f0" 
        stroke-width="4" 
        stroke-linejoin="round"/>
  
  <!-- Text Sofia -->
  <text x="256" y="450" 
        font-family="Arial, sans-serif" 
        font-size="48" 
        font-weight="bold" 
        text-anchor="middle" 
        fill="url(#iconGrad)">SOFIA</text>
        
  <!-- Subtitle AI -->
  <text x="256" y="480" 
        font-family="Arial, sans-serif" 
        font-size="24" 
        text-anchor="middle" 
        fill="url(#iconGrad)"
        opacity="0.8">IA</text>
</svg>
`.trim();

// Função para converter SVG para PNG usando Canvas API (simulado)
function createPNGFromSVG(svgContent, width, height) {
  // Para um script real, usaríamos uma biblioteca como sharp ou canvas
  // Por agora, vamos criar um placeholder base64
  
  // Criar um PNG simples via Canvas (este é um placeholder)
  const canvas = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
  
  return {
    width,
    height,
    dataURL: canvas,
    svgBase64: Buffer.from(svgContent).toString('base64')
  };
}

// Tamanhos necessários
const sizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// Salvar SVG base
fs.writeFileSync(path.join(__dirname, 'icon-base.svg'), svgIcon);

// Criar um favicon.ico simples
const faviconSVG = svgIcon.replace('512', '32').replace('240', '14').replace('48', '6').replace('24', '4');
fs.writeFileSync(path.join(__dirname, 'favicon.svg'), faviconSVG);

console.log('✅ Ícones Sofia IA gerados com sucesso!');
console.log('📁 Arquivos criados:');
console.log('   - icon-base.svg');
console.log('   - favicon.svg');
console.log('');
console.log('📝 Para usar os ícones PNG, você precisa:');
console.log('1. Instalar: npm install sharp');
console.log('2. Usar sharp para converter SVG → PNG nos tamanhos necessários');
console.log('');
console.log('🔗 URLs de teste:');
sizes.forEach(({ name, size }) => {
  console.log(`   /${name} (${size}x${size})`);
});