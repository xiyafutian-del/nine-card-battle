function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GEM_TYPES = [
  { id: "amethyst",     name: "アメジスト",   rarity: 5, hue: 280, sat: 70, light: 45, clarity: [0.5, 0.85] },
  { id: "emerald",      name: "エメラルド",   rarity: 3, hue: 145, sat: 80, light: 40, clarity: [0.55, 0.88] },
  { id: "ruby",         name: "ルビー",       rarity: 3, hue: 350, sat: 85, light: 42, clarity: [0.55, 0.88] },
  { id: "sapphire",     name: "サファイア",   rarity: 2, hue: 220, sat: 82, light: 38, clarity: [0.6, 0.92] },
  { id: "diamond",      name: "ダイヤモンド", rarity: 1, hue: 200, sat: 12, light: 88, clarity: [0.85, 1.0] },
  { id: "blackdiamond", name: "ブラックダイヤ", rarity: 1, hue: 240, sat: 20, light: 15, clarity: [0.7, 0.95] },
];

export function rollGemType(rng) {
  const total = GEM_TYPES.reduce((s, g) => s + g.rarity, 0);
  let r = rng() * total;
  for (const g of GEM_TYPES) { r -= g.rarity; if (r <= 0) return g; }
  return GEM_TYPES[0];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
    const f = (t) => {
      if (t<0) t+=1; if (t>1) t-=1;
      if (t<1/6) return p+(q-p)*6*t;
      if (t<1/2) return q;
      if (t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    r=f(h+1/3); g=f(h); b=f(h-1/3);
  }
  return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
}

// 高速軽量ノイズ
function fastNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const h = (a, b) => {
    let t = (seed + a * 157 + b * 311) >>> 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = h(xi, yi),     n10 = h(xi + 1, yi);
  const n01 = h(xi, yi + 1), n11 = h(xi + 1, yi + 1);
  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
}

export function drawGemFrame(canvas, seed, W, H, ctx) {
  if (!W) W = canvas.width;
  if (!H) H = canvas.height;
  if (!ctx) ctx = canvas.getContext("2d");

  const rng = mulberry32(seed);

  // ── 1. パラメータ導出 ──
  const gem = rollGemType(rng);
  const clarity = gem.clarity[0] + rng() * (gem.clarity[1] - gem.clarity[0]); // 透明度
  
  const offsetX = rng() * 500;
  const offsetY = rng() * 500;
  const scale   = 0.035 + rng() * 0.045;
  const threshold = 0.45 + rng() * 0.28; // 宝石結晶の露出度

  // 母岩の色（暗い茶〜黒系の岩肌）
  const rockHue = 15 + rng() * 20;
  const rockSat = 8 + rng() * 12;

  // ── 2. 低解像度バッファ処理 ──
  const downScale = 2.5;
  const bufW = Math.ceil(W / downScale);
  const bufH = Math.ceil(H / downScale);

  const offCanvas = document.createElement("canvas");
  offCanvas.width = bufW;
  offCanvas.height = bufH;
  const offCtx = offCanvas.getContext("2d");
  const imgData = offCtx.createImageData(bufW, bufH);
  const data = imgData.data;

  // 光源
  const lx = -0.5, ly = -0.5, lz = 0.707;

  for (let y = 0; y < bufH; y++) {
    for (let x = 0; x < bufW; x++) {
      const idx = (y * bufW + x) * 4;

      const nx = (x * downScale + offsetX) * scale;
      const ny = (y * downScale + offsetY) * scale;

      let val = fastNoise(nx, ny, seed) * 0.65 + fastNoise(nx * 2.5, ny * 2.5, seed + 1) * 0.35;
      val = Math.pow(val, 1.1);

      // 法線計算
      const valR = fastNoise(nx + 0.1, ny, seed);
      const valB = fastNoise(nx, ny + 0.1, seed);
      const normalX = (val - valR) * 2.2;
      const normalY = (val - valB) * 2.2;
      const normalZ = Math.sqrt(Math.max(0.1, 1 - normalX * normalX - normalY * normalY));

      const dotNL = Math.max(0.1, normalX * lx + normalY * ly + normalZ * lz);

      let r = 0, g = 0, b = 0;

      if (val > threshold) {
        // --- 宝石エリア ---
        const depth = (val - threshold) / (1 - threshold);
        
        // 透明感のあるベース光度
        const transL = gem.light * (0.6 + depth * 0.45 + dotNL * 0.3) * clarity;
        const [gr, gg, gb] = hslToRgb(gem.hue, gem.sat, Math.min(96, transL));

        // ガラス質の鋭い表面反射（Specular）
        const spec = Math.pow(dotNL, 16 + clarity * 32) * (0.6 + clarity * 0.4) * 220;

        r = Math.min(255, gr + spec);
        g = Math.min(255, gg + spec);
        b = Math.min(255, gb + spec); // ← ここにあった mb || を修正
      } else {
        // --- 母岩エリア ---
        const rockL = Math.max(8, Math.min(42, (15 + val * 30) * dotNL));
        const [rkR, rkG, rkB] = hslToRgb(rockHue, rockSat, rockL);
        r = rkR; g = rkG; b = rkB;
      }

      data[idx]     = Math.round(r);
      data[idx + 1] = Math.round(g);
      data[idx + 2] = Math.round(b);
      data[idx + 3] = 255;
    }
  }

  offCtx.putImageData(imgData, 0, 0);

  // ── 3. 本番キャンバスへ拡大転送 ──
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(offCanvas, 0, 0, bufW, bufH, 0, 0, W, H);

  // ── 4. 宝石特有の「反射線」「スパーク」 ──
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 + clarity * 0.25})`;
  ctx.lineWidth = 0.7;
  const lines = 3 + Math.floor(rng() * 4);
  for (let l = 0; l < lines; l++) {
    const lx1 = rng() * W, ly1 = rng() * H;
    const lx2 = lx1 + (rng() - 0.5) * W * 0.5;
    const ly2 = ly1 + (rng() - 0.5) * H * 0.5;
    ctx.beginPath();
    ctx.moveTo(lx1, ly1);
    ctx.lineTo(lx2, ly2);
    ctx.stroke();
  }

  if (clarity > 0.6) {
    const sparkCount = Math.floor((clarity - 0.5) * 8);
    for (let s = 0; s < sparkCount; s++) {
      const sx = rng() * W;
      const sy = rng() * H;
      const [sr, sg, sb] = hslToRgb((gem.hue + rng() * 60 - 30) % 360, 90, 85);
      
      ctx.fillStyle = `rgba(${sr},${sg},${sb},${0.4 + rng() * 0.5})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8 + rng() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ビネット
  const borderShadow = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.35, W/2, H/2, Math.max(W, H) * 0.75);
  borderShadow.addColorStop(0, "rgba(0,0,0,0)");
  borderShadow.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = borderShadow;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

export function getGemInfo(seed) {
  const rng = mulberry32(seed);
  const gem = rollGemType(rng);
  const clarity = gem.clarity[0] + rng() * (gem.clarity[1] - gem.clarity[0]);
  return { gem, clarity };
}
