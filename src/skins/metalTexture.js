function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const METAL_TYPES = [
  { id: "iron",       name: "自然鉄",       rarity: 50, hue: 210, sat: 10, light: 45, gloss: 0.5 },
  { id: "copper",     name: "自然銅",       rarity: 30, hue: 20,  sat: 80, light: 52, gloss: 0.7 },
  { id: "silver",     name: "自然銀",       rarity: 10, hue: 200, sat: 15, light: 85, gloss: 0.9 },
  { id: "gold",       name: "自然金",       rarity: 5,  hue: 45,  sat: 95, light: 60, gloss: 0.95 },
  { id: "platinum",   name: "自然白金",     rarity: 2,  hue: 195, sat: 8,  light: 92, gloss: 0.98 },
  { id: "meteorite",  name: "隕鉄",         rarity: 1,  hue: 240, sat: 30, light: 28, gloss: 0.75 },
  { id: "orichalcum", name: "オリハルコン", rarity: 1,  hue: 155, sat: 88, light: 55, gloss: 0.92 },
];

export function rollMetalType(rng) {
  const total = METAL_TYPES.reduce((s, m) => s + m.rarity, 0);
  let r = rng() * total;
  for (const m of METAL_TYPES) { r -= m.rarity; if (r <= 0) return m; }
  return METAL_TYPES[0];
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

// 高速軽量ノイズ（白黒ベースパターン用）
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

export function drawMetalFrame(canvas, seed, W, H, ctx) {
  if (!W) W = canvas.width;
  if (!H) H = canvas.height;
  if (!ctx) ctx = canvas.getContext("2d");

  const rng = mulberry32(seed);

  // ── 1. CS風ランダム装飾パラメータの導出 ──
  const metal = rollMetalType(rng);
  
  // UVオフセット（柄の位置ズレ）とスケール（柄の大きさ）
  const offsetX = rng() * 500;
  const offsetY = rng() * 500;
  const scale   = 0.04 + rng() * 0.05;

  // 露出閾値（鉱石がどれくらい露出しているか：0.4〜0.75）
  // 値が低いと一面鉱石、高いと岩肌に少し混ざる程度になる
  const threshold = 0.42 + rng() * 0.32;

  // 岩肌の色味（微妙なグレー〜泥感のブレ）
  const rockHue = 20 + rng() * 20;
  const rockSat = 5 + rng() * 10;

  // ── 2. 軽量化処理（低解像度バッファで計算） ──
  // 解像度を1/2.5に落として計算ピクセル数を1/6以下に削減
  const downScale = 2.5;
  const bufW = Math.ceil(W / downScale);
  const bufH = Math.ceil(H / downScale);

  const offCanvas = document.createElement("canvas");
  offCanvas.width = bufW;
  offCanvas.height = bufH;
  const offCtx = offCanvas.getContext("2d");
  const imgData = offCtx.createImageData(bufW, bufH);
  const data = imgData.data;

  // 光源方向（左上奥）
  const lx = -0.5, ly = -0.5, lz = 0.707;

  for (let y = 0; y < bufH; y++) {
    for (let x = 0; x < bufW; x++) {
      const idx = (y * bufW + x) * 4;

      // 1. 白黒ノイズ（UVオフセット適用）
      const nx = (x * downScale + offsetX) * scale;
      const ny = (y * downScale + offsetY) * scale;

      // 重ね合わせノイズ（岩・結晶の凹凸パターン）
      let val = fastNoise(nx, ny, seed) * 0.6 + fastNoise(nx * 2.2, ny * 2.2, seed + 1) * 0.4;
      val = Math.pow(val, 1.2); // 輪郭を少し強調

      // 法線（凹凸の傾き）の計算
      const valR = fastNoise(nx + 0.1, ny, seed);
      const valB = fastNoise(nx, ny + 0.1, seed);
      const normalX = (val - valR) * 2.0;
      const normalY = (val - valB) * 2.0;
      const normalZ = Math.sqrt(Math.max(0.1, 1 - normalX * normalX - normalY * normalY));

      const dotNL = Math.max(0.15, normalX * lx + normalY * ly + normalZ * lz);

      let r = 0, g = 0, b = 0;

      // 2. 露出率（Threshold）による判定（鉱石 vs 母岩）
      if (val > threshold) {
        // --- 鉱石エリア ---
        // 露出度合いに応じた光沢・輝度計算
        const intensity = (val - threshold) / (1 - threshold); // 0.0 ~ 1.0
        const baseL = Math.min(95, metal.light * (0.7 + intensity * 0.5) * dotNL);

        // 金属光沢（Specular）
        const spec = Math.pow(dotNL, 8 + metal.gloss * 24) * metal.gloss * 180;
        const [mr, mg, mb] = hslToRgb(metal.hue, metal.sat, baseL);

        r = Math.min(255, mr + spec);
        g = Math.min(255, mg + spec);
        b = Math.min(255, mb + spec);
      } else {
        // --- 母岩エリア ---
        const rockL = Math.max(10, Math.min(50, (18 + val * 35) * dotNL));
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
  ctx.imageSmoothingEnabled = true; // 滑らかに拡大して重厚感を補間
  ctx.drawImage(offCanvas, 0, 0, bufW, bufH, 0, 0, W, H);

  // ── 4. 外周の立体影（ビネット） ──
  const borderShadow = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.35, W/2, H/2, Math.max(W, H) * 0.75);
  borderShadow.addColorStop(0, "rgba(0,0,0,0)");
  borderShadow.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = borderShadow;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

export function getMetalInfo(seed) {
  const rng = mulberry32(seed);
  const metal = rollMetalType(rng);
  const threshold = 0.42 + rng() * 0.32;
  const isPureNugget = threshold < 0.48; // 露出率が高い場合は富鉱扱い

  return { metals: [metal], isPureNugget };
}
