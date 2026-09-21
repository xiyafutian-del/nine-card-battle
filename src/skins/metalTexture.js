// ============ 金属テクスチャ生成 ============
// シードから決定論的に金属テクスチャを生成する

function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 金属の種類定義
export const METAL_TYPES = [
  { id: "iron",      name: "鉄",       rarity: 5, hue: 210, sat: 8,  light: 45, oxidize: true  },
  { id: "copper",    name: "銅",       rarity: 5, hue: 20,  sat: 55, light: 42, oxidize: true  },
  { id: "silver",    name: "銀",       rarity: 3, hue: 210, sat: 5,  light: 72, oxidize: false },
  { id: "gold",      name: "金",       rarity: 2, hue: 45,  sat: 80, light: 58, oxidize: false },
  { id: "platinum",  name: "白金",     rarity: 1, hue: 200, sat: 3,  light: 85, oxidize: false },
  { id: "meteorite", name: "隕鉄",     rarity: 1, hue: 240, sat: 15, light: 30, oxidize: true  },
  { id: "orichalcum",name: "オリハルコン", rarity: 1, hue: 160, sat: 70, light: 50, oxidize: false },
];

// レア度テーブル（rarity合計18）
// 5+5+3+2+1+1+1 = 18
export function rollMetalType(rng) {
  const total = METAL_TYPES.reduce((s, m) => s + m.rarity, 0);
  let r = rng() * total;
  for (const m of METAL_TYPES) {
    r -= m.rarity;
    if (r <= 0) return m;
  }
  return METAL_TYPES[0];
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q-p)*6*t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q-p)*(2/3-t)*6;
      return p;
    };
    const q = l < 0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    r = hue2rgb(p,q,h+1/3); g = hue2rgb(p,q,h); b = hue2rgb(p,q,h-1/3);
  }
  return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
}

export function drawMetalFrame(canvas, seed) {
  const rng = mulberry32(seed);
  const rng2 = mulberry32(seed ^ 0xdeadbeef);
  const metal = rollMetalType(mulberry32(seed ^ 0x12345678));

  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");

  // 酸化度（鉄・銅のみ）
  const oxidation = metal.oxidize ? rng() : 0;

  // ── 1. ベース色 ──
  const imgData = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i4 = (y*W+x)*4;
      // 研磨ムラ（縦方向の筋）
      const streak = Math.sin(x * 0.8 + rng2() * 0.3) * 8;
      // 微細なランダムノイズ
      const noise = (rng() - 0.5) * 12;
      const L = Math.max(10, Math.min(95, metal.light + streak + noise));
      // 酸化による色変化
      const hueShift = metal.oxidize ? oxidation * 30 : 0;
      const satShift = metal.oxidize ? oxidation * 20 : 0;
      const [r,g,b] = hslToRgb(
        metal.hue + hueShift + (rng2()-0.5)*4,
        Math.max(0, metal.sat + satShift),
        L
      );
      imgData.data[i4]   = r;
      imgData.data[i4+1] = g;
      imgData.data[i4+2] = b;
      imgData.data[i4+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // ── 2. 研磨筋（縦方向の細いライン）──
  const streakCount = 8 + Math.floor(rng() * 12);
  for (let s = 0; s < streakCount; s++) {
    const x = rng() * W;
    const alpha = 0.03 + rng() * 0.08;
    const bright = rng() > 0.5;
    ctx.strokeStyle = bright ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.lineWidth = 0.3 + rng() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x + (rng()-0.5)*2, 0);
    ctx.lineTo(x + (rng()-0.5)*2, H);
    ctx.stroke();
  }

  // ── 3. 光沢ハイライト（酸化度が低いほど強い）──
  if (oxidation < 0.6) {
    const glintStrength = (1 - oxidation) * 0.35;
    const grd = ctx.createLinearGradient(0, 0, W*0.6, H*0.4);
    grd.addColorStop(0, `rgba(255,255,255,${glintStrength})`);
    grd.addColorStop(0.3, `rgba(255,255,255,${glintStrength*0.3})`);
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 4. 錆・酸化パッチ ──
  if (metal.oxidize && oxidation > 0.2) {
    const patchCount = Math.floor(oxidation * 8);
    for (let p = 0; p < patchCount; p++) {
      const px = rng() * W, py = rng() * H;
      const pr = (3 + rng() * 8);
      const rustHue = metal.id === "copper" ? 150 + rng()*20 : 20 + rng()*15;
      const grd = ctx.createRadialGradient(px,py,0,px,py,pr);
      grd.addColorStop(0, `hsla(${rustHue},60%,35%,${0.4+oxidation*0.4})`);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // ── 5. ビネット ──
  const vg = ctx.createRadialGradient(W/2,H/2,H*0.1,W/2,H/2,H*0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,W,H);

  return { metal, oxidation };
}

// メタデータだけ返す（保存用）
export function getMetalInfo(seed) {
  const rng = mulberry32(seed ^ 0x12345678);
  const metal = rollMetalType(rng);
  const oxidation = metal.oxidize ? mulberry32(seed)() : 0;
  return { metal, oxidation };
}
