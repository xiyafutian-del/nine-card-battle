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
  { id: "iron",       name: "自然鉄",       rarity: 50, hue: 210, sat: 10, light: 40, gloss: 0.4 },
  { id: "copper",     name: "自然銅",       rarity: 30, hue: 22,  sat: 70, light: 48, gloss: 0.65 },
  { id: "silver",     name: "自然銀",       rarity: 10, hue: 200, sat: 10, light: 82, gloss: 0.88 },
  { id: "gold",       name: "自然金",       rarity: 5,  hue: 45,  sat: 90, light: 60, gloss: 0.95 },
  { id: "platinum",   name: "自然白金",     rarity: 2,  hue: 200, sat: 5,  light: 88, gloss: 0.98 },
  { id: "meteorite",  name: "隕鉄",         rarity: 1,  hue: 235, sat: 25, light: 28, gloss: 0.7 },
  { id: "orichalcum", name: "オリハルコン", rarity: 1,  hue: 160, sat: 80, light: 52, gloss: 0.92 },
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

// 鉱石塊の有機的な輪郭を計算（高調波合成）
function getOrganicRadius(angle, baseRadius, seedOffset) {
  const n1 = Math.sin(angle * 3 + seedOffset) * 0.3;
  const n2 = Math.cos(angle * 7 - seedOffset * 0.5) * 0.18;
  const n3 = Math.sin(angle * 13 + seedOffset * 2) * 0.08;
  return baseRadius * Math.max(0.2, 1 + n1 + n2 + n3);
}

export function drawMetalFrame(canvas, seed, W, H, ctx) {
  if (!ctx) ctx = canvas.getContext("2d");
  if (!W) W = canvas.width;
  if (!H) H = canvas.height;

  const rng = mulberry32(seed);
  const rngNugget = mulberry32(seed ^ 0xdeadbeef);

  // 天文学的確率（全フレーム鉱床）判定 ※テスト用15%
  const isPureNugget = rngNugget() < 0.15;

  // ── 1. カード内の各所に配置される「鉱石塊（ナゲット）」を個別抽選 ──
  const nuggetCount = isPureNugget ? 35 : Math.floor(6 + rng() * 10);
  const nuggets = [];

  for (let i = 0; i < nuggetCount; i++) {
    // 場所ごとに独立して鉱石の種類をロール（完全ランダム分布）
    const metal = rollMetalType(rng);
    const cx = rng() * W;
    const cy = rng() * H;
    const radius = isPureNugget ? (25 + rng() * 45) : (8 + rng() * 22);
    const seedOffset = rng() * 1000;

    nuggets.push({ cx, cy, radius, metal, seedOffset });
  }

  // ── 2. ピクセル単位の3Dライティング描画 ──
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  // 光源ベクトル（左上奥から手前照射）
  const lx = -0.45, ly = -0.45, lz = 0.77;
  // ハーフベクトル（Blinn-Phong鏡面反射用）
  const hx = -0.27, hy = -0.27, hz = 0.92;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;

      // 岩肌のベースカラー（泥灰岩・玄武岩風の自然なノイズ）
      const rockGrain = (mulberry32(seed + x * 131 + y * 257)() - 0.5) * 16;
      const rockL = Math.max(12, Math.min(45, 24 + rockGrain));
      const [rr, rg, rb] = hslToRgb(210, 6, rockL);

      let pixelR = rr, pixelG = rg, pixelB = rb;
      let highestMetalGloss = -1;

      // 各ピクセルで最も近い/重なっている鉱石塊を探索
      for (const nug of nuggets) {
        const dx = x - nug.cx;
        const dy = y - nug.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const rDeformed = getOrganicRadius(angle, nug.radius, nug.seedOffset);

        if (dist < rDeformed) {
          // 原石表面の法線ベクトル (N) を計算
          let nx = dx / rDeformed;
          let ny = dy / rDeformed;

          // 表面の微妙な凸凹（粗さ）を追加
          const bump = (mulberry32(seed + x * 17 + y * 31)() - 0.5) * 0.35;
          nx = Math.max(-1, Math.min(1, nx + bump));
          ny = Math.max(-1, Math.min(1, ny + bump));
          const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));

          // 1. 拡散反射（Diffuse）
          const dotNDotL = Math.max(0.2, nx * lx + ny * ly + nz * lz);

          // 2. 鏡面反射（Specular）- 金属の輝き
          const dotNDotH = Math.max(0, nx * hx + ny * hy + nz * hz);
          const shininess = 8 + nug.metal.gloss * 40;
          const specPower = Math.pow(dotNDotH, shininess) * nug.metal.gloss;

          // 色の合成
          const baseL = nug.metal.light * dotNDotL;
          const [mr, mg, mb] = hslToRgb(nug.metal.hue, nug.metal.sat, baseL);

          // 白い強光沢ハイライトを乗せる
          const specR = Math.min(255, mr + specPower * 220);
          const specG = Math.min(255, mg + specPower * 220);
          const specB = Math.min(255, mb + specPower * 220);

          if (nug.metal.gloss > highestMetalGloss) {
            highestMetalGloss = nug.metal.gloss;
            pixelR = specR;
            pixelG = specG;
            pixelB = specB;
          }
        }
      }

      data[idx]     = Math.round(pixelR);
      data[idx + 1] = Math.round(pixelG);
      data[idx + 2] = Math.round(pixelB);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // ── 3. 外周の立体的な陰影（フレーム感） ──
  ctx.save();
  const borderShadow = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.35, W/2, H/2, Math.max(W, H) * 0.75);
  borderShadow.addColorStop(0, "rgba(0,0,0,0)");
  borderShadow.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = borderShadow;
  ctx.fillRect(0, 0, W, H);

  // ── 4. 中央の切り抜き（イラスト表示用の透明化） ──
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

// カードに含まれる鉱石の情報を取得（UIやレアリティ表示用）
export function getMetalInfo(seed) {
  const rng = mulberry32(seed);
  const rngNugget = mulberry32(seed ^ 0xdeadbeef);
  const isPureNugget = rngNugget() < 0.15;
  const nuggetCount = isPureNugget ? 35 : Math.floor(6 + rng() * 10);

  const metalsFound = [];
  for (let i = 0; i < nuggetCount; i++) {
    const m = rollMetalType(rng);
    if (!metalsFound.some(existing => existing.id === m.id)) {
      metalsFound.push(m);
    }
  }

  return { metals: metalsFound, isPureNugget };
}
