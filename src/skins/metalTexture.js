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
  { id: "iron",       name: "鉄",           rarity: 5, hue: 210, sat: 8,  light: 40, gloss: 0.4 },
  { id: "copper",     name: "銅",           rarity: 5, hue: 20,  sat: 55, light: 38, gloss: 0.5 },
  { id: "silver",     name: "銀",           rarity: 3, hue: 210, sat: 5,  light: 75, gloss: 0.8 },
  { id: "gold",       name: "金",           rarity: 2, hue: 45,  sat: 80, light: 55, gloss: 0.9 },
  { id: "platinum",   name: "白金",         rarity: 1, hue: 200, sat: 3,  light: 88, gloss: 0.95 },
  { id: "meteorite",  name: "隕鉄",         rarity: 1, hue: 240, sat: 15, light: 28, gloss: 0.6 },
  { id: "orichalcum", name: "オリハルコン", rarity: 1, hue: 160, sat: 70, light: 48, gloss: 0.85 },
];

export function rollMetalType(rng) {
  const total = METAL_TYPES.reduce((s, m) => s + m.rarity, 0);
  let r = rng() * total;
  for (const m of METAL_TYPES) { r -= m.rarity; if (r <= 0) return m; }
  return METAL_TYPES[0];
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
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
  const rng3 = mulberry32(seed ^ 0xabcdef);
  const metal = rollMetalType(mulberry32(seed ^ 0x12345678));

  // ── 1. 母岩ベース（灰〜茶の岩肌） ──
  const rockImg = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i4 = (y*W+x)*4;
      // 岩の粒状ノイズ
      const grain = (rng() - 0.5) * 18;
      // 層状の縞（堆積岩風）
      const layer = Math.sin(y * 0.15 + rng2() * 0.5) * 6;
      const rockL = Math.max(15, Math.min(65, 35 + grain + layer));
      const rockH = 25 + rng3() * 15; // 茶〜灰
      const rockS = 8 + rng3() * 12;
      const [r,g,b] = hslToRgb(rockH, rockS, rockL);
      rockImg.data[i4]=r; rockImg.data[i4+1]=g; rockImg.data[i4+2]=b; rockImg.data[i4+3]=255;
    }
  }
  ctx.putImageData(rockImg, 0, 0);

  // ── 2. 岩の亀裂 ──
  ctx.lineCap = "round";
  const crackN = 2 + Math.floor(rng() * 4);
  for (let c = 0; c < crackN; c++) {
    let cx = rng()*W, cy = rng()*H;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    const segs = 3 + Math.floor(rng()*5);
    for (let s = 0; s < segs; s++) {
      cx += (rng()-0.5)*W*0.25; cy += (rng()-0.3)*H*0.2;
      ctx.lineTo(cx, cy);
    }
    ctx.strokeStyle = `rgba(0,0,0,${0.25+rng()*0.2})`;
    ctx.lineWidth = 0.4 + rng()*0.8;
    ctx.stroke();
    // 亀裂の明るい縁
    ctx.strokeStyle = `rgba(255,255,255,${0.04+rng()*0.05})`;
    ctx.lineWidth *= 2;
    ctx.stroke();
  }

  // ── 3. 金属原石の塊・筋 ──
  // 原石は岩の中に点在・筋状に出現
  const veinCount = 2 + Math.floor(rng() * 4);
  for (let v = 0; v < veinCount; v++) {
    const startX = rng() * W;
    const startY = rng() * H;
    const ang = rng() * Math.PI * 2;
    const len = W * (0.1 + rng() * 0.3);
    const segs = 6 + Math.floor(rng() * 8);
    let vx = startX, vy = startY;

    for (let s = 0; s < segs; s++) {
      const phase = s / segs;
      // 金属の色（光沢あり）
      const glintPhase = Math.sin(phase * Math.PI);
      const baseL = metal.light;
      const gloss = metal.gloss;
      // 光沢ハイライト（研磨された原石の輝き）
      const highlight = gloss * glintPhase * 35;
      const L = Math.min(95, baseL + highlight + (rng()-0.5)*8);
      const [mr,mg,mb] = hslToRgb(metal.hue + (rng()-0.5)*5, metal.sat, L);

      // 金属塊の大きさ（ランダムな粒・塊）
      const size = (1.5 + rng()*3) * (1 + rng()*0.5);
      ctx.fillStyle = `rgba(${mr},${mg},${mb},${0.7+rng()*0.25})`;
      ctx.beginPath();
      // 丸みを帯びた不規則な形
      ctx.ellipse(vx, vy, size, size*(0.5+rng()*0.7), ang+(rng()-0.5)*0.8, 0, Math.PI*2);
      ctx.fill();

      // 強いハイライト（光沢の核）
      if (gloss > 0.6 && glintPhase > 0.5) {
        const [hr,hg,hb] = hslToRgb(metal.hue, metal.sat*0.3, 90+gloss*8);
        ctx.fillStyle = `rgba(${hr},${hg},${hb},${gloss*glintPhase*0.6})`;
        ctx.beginPath();
        ctx.ellipse(vx-size*0.3, vy-size*0.3, size*0.35, size*0.2, ang, 0, Math.PI*2);
        ctx.fill();
      }

      vx += Math.cos(ang+(rng()-0.5)*0.6)*(len/segs);
      vy += Math.sin(ang+(rng()-0.5)*0.6)*(len/segs);
      if (vx<0||vx>W||vy<0||vy>H) break;
    }
  }

  // ── 4. 金属面の研磨筋（光沢を強調）──
  if (metal.gloss > 0.5) {
    const streakN = 5 + Math.floor(rng()*8);
    for (let s = 0; s < streakN; s++) {
      const sx = rng()*W, sy = rng()*H;
      const sl = W*0.05 + rng()*W*0.15;
      const alpha = metal.gloss * (0.06 + rng()*0.08);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 0.3 + rng()*0.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + sl*(rng()-0.5)*0.3, sy + sl);
      ctx.stroke();
    }
  }

  // ── 5. ビネット（周縁を暗く） ──
  const vg = ctx.createRadialGradient(W/2,H/2,H*0.1,W/2,H/2,H*0.75);
  vg.addColorStop(0,"rgba(0,0,0,0)");
  vg.addColorStop(1,"rgba(0,0,0,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,W,H);
}

export function getMetalInfo(seed) {
  const metal = rollMetalType(mulberry32(seed ^ 0x12345678));
  return { metal, oxidation: 0 };
    }
