// ============ 宝石テクスチャ生成 ============

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
  { id: "amethyst",  name: "アメジスト",   rarity: 5, hue: 280, sat: 65, light: 45, clarity: [0.3, 0.7] },
  { id: "emerald",   name: "エメラルド",   rarity: 3, hue: 145, sat: 70, light: 38, clarity: [0.4, 0.8] },
  { id: "ruby",      name: "ルビー",       rarity: 3, hue: 350, sat: 75, light: 40, clarity: [0.4, 0.8] },
  { id: "sapphire",  name: "サファイア",   rarity: 2, hue: 220, sat: 72, light: 38, clarity: [0.5, 0.9] },
  { id: "diamond",   name: "ダイヤモンド", rarity: 1, hue: 200, sat: 10, light: 85, clarity: [0.8, 1.0] },
  { id: "blackdiamond", name: "ブラックダイヤ", rarity: 1, hue: 240, sat: 15, light: 15, clarity: [0.6, 0.9] },
];

export function rollGemType(rng) {
  const total = GEM_TYPES.reduce((s, g) => s + g.rarity, 0);
  let r = rng() * total;
  for (const g of GEM_TYPES) {
    r -= g.rarity;
    if (r <= 0) return g;
  }
  return GEM_TYPES[0];
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p+(q-p)*6*t;
      if (t < 1/2) return q;
      if (t < 2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    const q = l < 0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    r = hue2rgb(p,q,h+1/3); g = hue2rgb(p,q,h); b = hue2rgb(p,q,h-1/3);
  }
  return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
}

export function drawGemFrame(canvas, seed) {
  const rng  = mulberry32(seed);
  const rng2 = mulberry32(seed ^ 0xdeadbeef);
  const rng3 = mulberry32(seed ^ 0xabcdef12);
  const gem  = rollGemType(mulberry32(seed ^ 0x12345678));

  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");

  // 透明度（gem.clarityの範囲内でランダム）
  const clarity = gem.clarity[0] + rng() * (gem.clarity[1] - gem.clarity[0]);
  // インクルージョン量
  const inclusion = rng() * (1 - clarity * 0.8);

  // ── 1. ベース：深みのある色 ──
  const imgData = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i4 = (y*W+x)*4;
      const noise = (rng() - 0.5) * 10;
      const depthVar = Math.sin(x/W*Math.PI) * Math.sin(y/H*Math.PI) * 15;
      const L = Math.max(5, Math.min(95, gem.light + noise + depthVar));
      const hShift = (rng2()-0.5) * 8;
      const [r,g,b] = hslToRgb(gem.hue + hShift, gem.sat, L);
      imgData.data[i4]   = r;
      imgData.data[i4+1] = g;
      imgData.data[i4+2] = b;
      imgData.data[i4+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // ── 2. ファセット（面）──
  const facetCount = 6 + Math.floor(rng() * 6);
  const cx = W * 0.5, cy = H * 0.5;
  const r0 = Math.min(W, H) * (0.3 + rng() * 0.2);

  for (let f = 0; f < facetCount; f++) {
    const ang1 = (f / facetCount) * Math.PI * 2;
    const ang2 = ((f+1) / facetCount) * Math.PI * 2;
    const r1 = r0 * (0.7 + rng()*0.4);
    const r2 = r0 * (0.7 + rng()*0.4);

    // 面の向きで色を変える（プリズム効果）
    const faceAng = (ang1 + ang2) / 2;
    const hueShift = Math.sin(faceAng) * 25 * clarity;
    const faceLum = gem.light * (0.6 + clarity * 0.5) + Math.cos(faceAng) * 15;
    const [fr,fg,fb] = hslToRgb(
      gem.hue + hueShift,
      gem.sat * (0.8 + clarity * 0.3),
      Math.max(5, Math.min(95, faceLum))
    );

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang1)*r1, cy + Math.sin(ang1)*r1);
    ctx.lineTo(cx + Math.cos(ang2)*r2, cy + Math.sin(ang2)*r2);
    ctx.closePath();
    ctx.fillStyle = `rgba(${fr},${fg},${fb},${0.3 + clarity*0.4})`;
    ctx.fill();

    // 稜線
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + clarity*0.2})`;
    ctx.lineWidth = 0.5 + clarity * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang1)*r1, cy + Math.sin(ang1)*r1);
    ctx.lineTo(cx + Math.cos(ang2)*r2, cy + Math.sin(ang2)*r2);
    ctx.stroke();
  }

  // ── 3. ハイライト ──
  if (clarity > 0.3) {
    const hx = cx - r0*0.25, hy = cy - r0*0.30;
    const hg = ctx.createRadialGradient(hx,hy,0,hx,hy,r0*0.4);
    hg.addColorStop(0, `rgba(255,255,255,${0.2 + clarity*0.5})`);
    hg.addColorStop(0.5, `rgba(255,255,255,${(0.2+clarity*0.5)*0.2})`);
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(hx, hy, r0*0.3, r0*0.18, -0.5, 0, Math.PI*2);
    ctx.fill();
  }

  // ── 4. 光分散スパーク（高透明度のみ）──
  if (clarity > 0.6) {
    const sparkN = Math.floor((clarity-0.6) * 20);
    for (let sp = 0; sp < sparkN; sp++) {
      const spx = cx + (rng3()-0.5)*r0*2;
      const spy = cy + (rng3()-0.5)*r0*2;
      const spH = ((gem.hue + rng3()*120) % 360);
      const [sr,sg,sb] = hslToRgb(spH, 0.9, 0.72);
      ctx.fillStyle = `rgba(${sr},${sg},${sb},${0.4+rng3()*0.5})`;
      ctx.beginPath();
      ctx.arc(spx, spy, 0.4+rng3()*0.8, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // ── 5. インクルージョン（内包物）──
  const incN = Math.floor(inclusion * 12);
  for (let i = 0; i < incN; i++) {
    const ix = cx + (rng3()-0.5)*r0*1.5;
    const iy = cy + (rng3()-0.5)*r0*1.5;
    if (rng3() < 0.5) {
      // 雲状
      ctx.fillStyle = `rgba(255,250,240,${0.1+rng3()*0.15})`;
      ctx.beginPath();
      ctx.arc(ix, iy, 0.8+rng3()*1.5, 0, Math.PI*2);
      ctx.fill();
    } else {
      // 針状
      ctx.strokeStyle = `rgba(20,10,5,${0.15+rng3()*0.2})`;
      ctx.lineWidth = 0.3+rng3()*0.4;
      const ia = rng3()*Math.PI;
      const il = 1+rng3()*3;
      ctx.beginPath();
      ctx.moveTo(ix-Math.cos(ia)*il, iy-Math.sin(ia)*il);
      ctx.lineTo(ix+Math.cos(ia)*il, iy+Math.sin(ia)*il);
      ctx.stroke();
    }
  }

  // ── 6. ビネット ──
  const vg = ctx.createRadialGradient(W/2,H/2,H*0.1,W/2,H/2,H*0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,W,H);

  return { gem, clarity, inclusion };
}

export function getGemInfo(seed) {
  const rng = mulberry32(seed ^ 0x12345678);
  const gem = rollGemType(rng);
  const clarity = gem.clarity[0] + mulberry32(seed)() * (gem.clarity[1] - gem.clarity[0]);
  const inclusion = mulberry32(seed ^ 0xdeadbeef)() * (1 - clarity * 0.8);
  return { gem, clarity, inclusion };
}
