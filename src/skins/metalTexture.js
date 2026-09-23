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
  { id: "iron",       name: "自然鉄",       rarity: 50, hue: 210, sat: 12, light: 42, gloss: 0.45 },
  { id: "copper",     name: "自然銅",       rarity: 30, hue: 22,  sat: 75, light: 50, gloss: 0.70 },
  { id: "silver",     name: "自然銀",       rarity: 10, hue: 200, sat: 12, light: 84, gloss: 0.90 },
  { id: "gold",       name: "自然金",       rarity: 5,  hue: 45,  sat: 92, light: 62, gloss: 0.96 },
  { id: "platinum",   name: "自然白金",     rarity: 2,  hue: 200, sat: 6,  light: 90, gloss: 0.98 },
  { id: "meteorite",  name: "隕鉄",         rarity: 1,  hue: 235, sat: 28, light: 30, gloss: 0.75 },
  { id: "orichalcum", name: "オリハルコン", rarity: 1,  hue: 160, sat: 85, light: 55, gloss: 0.94 },
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

// 疑似2Dノイズ関数
function pseudoNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const h = (a, b) => mulberry32(seed + a * 157 + b * 311)();
  
  // バイリニア補間
  const n00 = h(xi, yi),     n10 = h(xi + 1, yi);
  const n01 = h(xi, yi + 1), n11 = h(xi + 1, yi + 1);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
}

// 多層ノイズ（FBM + Domain Warping）によるダイナミックな岩の高さマップ
function getRockHeight(x, y, seed) {
  // Domain Warp (座標の歪み)
  const wx = pseudoNoise(x * 0.015, y * 0.015, seed) * 40;
  const wy = pseudoNoise(x * 0.015 + 5.2, y * 0.015 + 1.3, seed) * 40;
  
  const nx = x + wx;
  const ny = y + wy;

  // FBM (Fractal Brownian Motion)
  let h = 0;
  h += pseudoNoise(nx * 0.02, ny * 0.02, seed) * 0.50;
  h += pseudoNoise(nx * 0.05, ny * 0.05, seed + 1) * 0.30;
  h += pseudoNoise(nx * 0.12, ny * 0.12, seed + 2) * 0.20;
  
  // 凹凸を鋭くする（亀裂感）
  return Math.pow(h, 1.4);
}

export function drawMetalFrame(canvas, seed, W, H, ctx) {
  if (!ctx) ctx = canvas.getContext("2d");
  if (!W) W = canvas.width;
  if (!H) H = canvas.height;

  const rng = mulberry32(seed);
  const rngNugget = mulberry32(seed ^ 0xdeadbeef);

  const isPureNugget = rngNugget() < 0.15; // テスト用15%

  // ── 1. 不規則な個別の結晶・鉱床群の生成 ──
  const nuggetCount = isPureNugget ? 40 : Math.floor(8 + rng() * 12);
  const nuggets = [];

  for (let i = 0; i < nuggetCount; i++) {
    const metal = rollMetalType(rng);
    const cx = rng() * W;
    const cy = rng() * H;
    const size = isPureNugget ? (30 + rng() * 50) : (10 + rng() * 28);
    // 結晶タイプ (0: 方解石状/多面体, 1: 不規則破片, 2: 細長い鉱脈)
    const crystalType = Math.floor(rng() * 3);
    const angle = rng() * Math.PI * 2;
    const nSeed = Math.floor(rng() * 10000);

    nuggets.push({ cx, cy, size, metal, crystalType, angle, nSeed });
  }

  // ── 2. ピクセル単位の高さ比較シェーディング ──
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  // 光源（左上奥）
  const lx = -0.5, ly = -0.5, lz = 0.707;
  // ハーフベクトル（ハイライト用）
  const hx = -0.3, hy = -0.3, hz = 0.90;

  // 各ピクセルの岩高さマップを事前評価するため、1ピクセル隣の差分（勾配）で法線を計算
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;

      // 岩の高さ
      const rockH = getRockHeight(x, y, seed);

      // 各鉱石の高さ（最も高い鉱石を採用）
      let maxMetalH = 0;
      let topNugget = null;
      let facetNormal = { nx: 0, ny: 0, nz: 1 };

      for (const nug of nuggets) {
        const dx = x - nug.cx;
        const dy = y - nug.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < nug.size * 1.5) {
          // 結晶の形状計算（ファセット・角張り）
          const rotX = dx * Math.cos(nug.angle) - dy * Math.sin(nug.angle);
          const rotY = dx * Math.sin(nug.angle) + dy * Math.cos(nug.angle);
          
          let mH = 0;
          let fnx = 0, fny = 0, fnz = 1;

          if (nug.crystalType === 0) {
            // 方解石・黄鉄鉱風（シャープな面で構成された多面体）
            const facet1 = Math.abs(rotX * 0.8 + rotY * 0.6);
            const facet2 = Math.abs(rotX * -0.6 + rotY * 0.8);
            const rawShape = nug.size - Math.max(facet1, facet2);
            mH = Math.max(0, rawShape / nug.size);
            
            // 面ごとの平坦な法線（角度をカクカクさせる）
            if (mH > 0) {
              const facetId = Math.floor((Math.atan2(rotY, rotX) + Math.PI) / (Math.PI / 3));
              const fAng = facetId * (Math.PI / 3);
              fnx = Math.cos(fAng) * 0.6;
              fny = Math.sin(fAng) * 0.6;
              fnz = 0.8;
            }
          } else if (nug.crystalType === 1) {
            // 不規則な砕けた結晶破片
            const pNoise = pseudoNoise(x * 0.1, y * 0.1, nug.nSeed);
            const shape = (nug.size - dist) / nug.size + (pNoise - 0.5) * 0.6;
            mH = Math.max(0, shape);
            fnx = (dx / (dist + 0.1)) * 0.5;
            fny = (dy / (dist + 0.1)) * 0.5;
            fnz = 0.86;
          } else {
            // 筋状の鉱脈
            const lineDist = Math.abs(rotX * 0.3 + Math.sin(rotY * 0.2) * 5);
            mH = Math.max(0, (nug.size * 0.5 - lineDist) / (nug.size * 0.5));
            fnx = rotX > 0 ? 0.4 : -0.4;
            fny = 0.2;
            fnz = 0.9;
          }

          // 高さ調整（ベース高さ + 強度）
          const finalMetalH = mH * 0.75 + 0.2;

          if (finalMetalH > maxMetalH) {
            maxMetalH = finalMetalH;
            topNugget = nug;
            facetNormal = { nx: fnx, ny: fny, nz: fnz };
          }
        }
      }

      // ── 3. 岩 vs 鉱石 の判定（岩の覆いかぶさり・埋まり感） ──
      // 岩の高さが鉱石の高さを超えている場所は岩が覆いかぶさる
      const isMetalVisible = maxMetalH > 0 && (maxMetalH > (rockH * 0.85) || isPureNugget);

      let rR = 0, rG = 0, rB = 0;

      if (isMetalVisible && topNugget) {
        // --- 鉱石のライティング ---
        const { nx, ny, nz } = facetNormal;
        
        // 微細な表面の荒れ（ノイズ）
        const bump = (pseudoNoise(x * 0.3, y * 0.3, seed) - 0.5) * 0.2;
        const finalNx = Math.max(-1, Math.min(1, nx + bump));
        const finalNy = Math.max(-1, Math.min(1, ny + bump));
        const finalNz = Math.sqrt(Math.max(0.1, 1 - finalNx * finalNx - finalNy * finalNy));

        // Diffuse & Specular
        const dotNL = Math.max(0.15, finalNx * lx + finalNy * ly + finalNz * lz);
        const dotNH = Math.max(0, finalNx * hx + finalNy * hy + finalNz * hz);
        
        const gloss = topNugget.metal.gloss;
        const spec = Math.pow(dotNH, 12 + gloss * 36) * gloss;

        const baseL = topNugget.metal.light * dotNL;
        const [mr, mg, mb] = hslToRgb(topNugget.metal.hue, topNugget.metal.sat, baseL);

        // 接地影（AO）：岩と鉱石の境界線（高さが近いフチ）を暗く落とし込む
        const edgeGap = Math.abs(maxMetalH - rockH * 0.85);
        const shadowAO = isPureNugget ? 1.0 : Math.min(1.0, edgeGap * 5.0 + 0.2);

        rR = Math.min(255, (mr + spec * 230) * shadowAO);
        rG = Math.min(255, (mg + spec * 230) * shadowAO);
        rB = Math.min(255, (mb + spec * 230) * shadowAO);

      } else {
        // --- 岩のライティング ---
        // 隣接ピクセルとの高さの差から岩表面の傾き（法線）を動的計算
        const rockH_right = getRockHeight(x + 1, y, seed);
        const rockH_bottom = getRockHeight(x, y + 1, seed);

        const rNx = (rockH - rockH_right) * 3.0;
        const rNy = (rockH - rockH_bottom) * 3.0;
        const rNz = Math.sqrt(Math.max(0.1, 1 - rNx * rNx - rNy * rNy));

        const rDotNL = Math.max(0.1, rNx * lx + rNy * ly + rNz * lz);

        // 岩の質感（泥灰岩・玄武岩調）
        const rockBaseL = Math.max(10, Math.min(60, 22 + rockH * 35)) * rDotNL;
        const [rkR, rkG, rkB] = hslToRgb(210, 8, rockBaseL);

        rR = rkR; rG = rkG; rB = rkB;
      }

      data[idx]     = Math.round(rR);
      data[idx + 1] = Math.round(rG);
      data[idx + 2] = Math.round(rB);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // ── 4. フレーム外周の立体影（ビネット） ──
  ctx.save();
  const borderShadow = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.35, W/2, H/2, Math.max(W, H) * 0.75);
  borderShadow.addColorStop(0, "rgba(0,0,0,0)");
  borderShadow.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = borderShadow;
  ctx.fillRect(0, 0, W, H);

  // ── 5. 中央の切り抜き（イラスト透過エリア） ──
  const padX = W * 0.11;
  const padY = H * 0.10;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const cornerRadius = 8;

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.roundRect(padX, padY, innerW, innerH, cornerRadius);
  ctx.fill();

  ctx.restore();
}

export function getMetalInfo(seed) {
  const rng = mulberry32(seed);
  const rngNugget = mulberry32(seed ^ 0xdeadbeef);
  const isPureNugget = rngNugget() < 0.15;
  const nuggetCount = isPureNugget ? 40 : Math.floor(8 + rng() * 12);

  const metalsFound = [];
  for (let i = 0; i < nuggetCount; i++) {
    const m = rollMetalType(rng);
    if (!metalsFound.some(existing => existing.id === m.id)) {
      metalsFound.push(m);
    }
  }

  return { metals: metalsFound, isPureNugget };
}
