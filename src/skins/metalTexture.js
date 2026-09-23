function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 実際の地球上の地殻存在度（クラーク数等）を参考にした現実的なレアリティ
// ※現在はテスト用として高めの確率に調整しています
export const METAL_TYPES = [
  { id: "iron",       name: "自然鉄",       rarity: 50, hue: 210, sat: 10, light: 35, gloss: 0.5 },
  { id: "copper",     name: "自然銅",       rarity: 30, hue: 20,  sat: 65, light: 45, gloss: 0.7 },
  { id: "silver",     name: "自然銀",       rarity: 10, hue: 200, sat: 8,  light: 78, gloss: 0.85 },
  { id: "gold",       name: "自然金",       rarity: 5,  hue: 43,  sat: 85, light: 58, gloss: 0.95 },
  { id: "platinum",   name: "自然白金",     rarity: 2,  hue: 200, sat: 5,  light: 85, gloss: 0.98 },
  { id: "meteorite",  name: "隕鉄",         rarity: 1,  hue: 230, sat: 20, light: 25, gloss: 0.65 },
  { id: "orichalcum", name: "オリハルコン", rarity: 1,  hue: 165, sat: 75, light: 50, gloss: 0.90 },
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

export function drawMetalFrame(canvas, seed, W, H, ctx) {
  if (!ctx) ctx = canvas.getContext("2d");
  if (!W) W = canvas.width;
  if (!H) H = canvas.height;

  const rng  = mulberry32(seed);
  const rng2 = mulberry32(seed ^ 0xdeadbeef);
  const metal = rollMetalType(mulberry32(seed ^ 0x12345678));

  // ── 0. 天文学的確率（フルメタル）判定 ──
  // ※テスト用で15%（0.15）にしてあります。本番は 0.0001 等に絞ってください。
  const isPureNugget = rng2() < 0.15; 

  // ── 1. ピクセル単位の岩肌＆自然鉱脈の生成 ──
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  // 鉱脈の基本ベクトルの決定
  const veinAngle = rng() * Math.PI;
  const cosA = Math.cos(veinAngle), sinA = Math.sin(veinAngle);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;

      // 岩の凹凸用多重ノイズ（FBM構造）
      const n1 = Math.sin(x * 0.04 + rng() * 0.1) * Math.cos(y * 0.04 + rng2() * 0.1);
      const n2 = Math.sin(x * 0.1 - y * 0.08) * 0.5;
      const rockNoise = (n1 + n2) * 12;

      // 岩肌のベースカラー（粗い泥灰岩〜安山岩風）
      const rockL = Math.max(12, Math.min(50, 28 + rockNoise));
      const [rr, rg, rb] = hslToRgb(25 + rng()*10, 10 + rng()*10, rockL);

      // 鉱石の発生確率計算（脈状の集中）
      const proj = (x * cosA + y * sinA) * 0.03;
      const veinDensity = Math.pow(Math.abs(Math.sin(proj + Math.sin(y * 0.05) * 1.5)), 8);
      
      // 出現判定（フルメタル時は全面、通常時は低確率＋脈）
      const metalChance = isPureNugget ? 0.95 : (veinDensity * 0.7 + (rng() < 0.02 ? 0.4 : 0));
      const isMetal = rng() < metalChance;

      if (isMetal) {
        // 金属のハイライト・陰影（左上からの仮説光）
        const spec = Math.max(0, Math.sin((x - y) * 0.05 + rng() * 0.2));
        const metalL = Math.min(96, metal.light + spec * (metal.gloss * 35) + (rng() - 0.5) * 10);
        const [mr, mg, mb] = hslToRgb(metal.hue, metal.sat, metal.light > 70 ? metalL : metalL * 0.9);

        data[idx]   = mr;
        data[idx+1] = mg;
        data[idx+2] = mb;
      } else {
        // 岩肌
        data[idx]   = rr;
        data[idx+1] = rg;
        data[idx+2] = rb;
      }
      data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // ── 2. 鉱石表面のシャープな輝き（スペキュラ） ──
  const glintCount = isPureNugget ? 25 : Math.floor(2 + rng() * 6);
  ctx.save();
  for (let g = 0; g < glintCount; g++) {
    const gx = rng() * W;
    const gy = rng() * H;
    const size = 1.5 + rng() * 4 * metal.gloss;

    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, size * 2);
    const [hr, hg, hb] = hslToRgb(metal.hue, metal.sat * 0.3, 98);
    grad.addColorStop(0, `rgba(${hr},${hg},${hb},${0.8 * metal.gloss})`);
    grad.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(gx, gy, size * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 3. 外周の立体影・陰影（カード枠としての輪郭強調） ──
  const borderShadow = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.35, W/2, H/2, Math.max(W, H) * 0.7);
  borderShadow.addColorStop(0, "rgba(0,0,0,0)");
  borderShadow.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = borderShadow;
  ctx.fillRect(0, 0, W, H);

  // ── 4. 中央の切り抜き（内側透過処理） ──
  // フレームの太さを左右・上下で調整（キャンバスサイズの約10〜12%）
  const padX = W * 0.11;
  const padY = H * 0.10;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const cornerRadius = 8; // カード内枠の角丸

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.roundRect(padX, padY, innerW, innerH, cornerRadius);
  ctx.fill();

  ctx.restore();
}

export function getMetalInfo(seed) {
  const metal = rollMetalType(mulberry32(seed ^ 0x12345678));
  return { metal };
}
