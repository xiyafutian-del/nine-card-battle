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
  { id: "amethyst",     name: "アメジスト",   rarity: 5, hue: 280, sat: 65, light: 42, clarity: [0.4, 0.75] },
  { id: "emerald",      name: "エメラルド",   rarity: 3, hue: 145, sat: 72, light: 36, clarity: [0.45, 0.80] },
  { id: "ruby",         name: "ルビー",       rarity: 3, hue: 350, sat: 78, light: 38, clarity: [0.45, 0.80] },
  { id: "sapphire",     name: "サファイア",   rarity: 2, hue: 220, sat: 74, light: 36, clarity: [0.55, 0.88] },
  { id: "diamond",      name: "ダイヤモンド", rarity: 1, hue: 200, sat: 8,  light: 88, clarity: [0.80, 1.0]  },
  { id: "blackdiamond", name: "ブラックダイヤ", rarity: 1, hue: 240, sat: 18, light: 12, clarity: [0.65, 0.90] },
];

export function rollGemType(rng) {
  const total = GEM_TYPES.reduce((s, g) => s + g.rarity, 0);
  let r = rng() * total;
  for (const g of GEM_TYPES) { r -= g.rarity; if (r <= 0) return g; }
  return GEM_TYPES[0];
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

export function drawGemFrame(canvas, seed, W, H, ctx) {
  if (!ctx) ctx = canvas.getContext("2d");
  if (!W) W = canvas.width;
  if (!H) H = canvas.height;

  const rng  = mulberry32(seed);
  const rng2 = mulberry32(seed ^ 0xdeadbeef);
  const rng3 = mulberry32(seed ^ 0xabcdef12);
  const gem  = rollGemType(mulberry32(seed ^ 0x12345678));

  // 透明度・インクルージョン量（シードで決定）
  const clarity   = gem.clarity[0] + rng() * (gem.clarity[1] - gem.clarity[0]);
  const inclusion = rng2() * (1 - clarity * 0.7);

  // ── 1. 母岩ベース ──
  const rockImg = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i4 = (y*W+x)*4;
      const grain = (rng() - 0.5) * 16;
      const layer = Math.sin(y * 0.12 + rng2() * 0.4) * 5;
      const rockL = Math.max(15, Math.min(62, 32 + grain + layer));
      const [r,g,b] = hslToRgb(22 + rng3()*18, 10 + rng3()*10, rockL);
      rockImg.data[i4]=r; rockImg.data[i4+1]=g; rockImg.data[i4+2]=b; rockImg.data[i4+3]=255;
    }
  }
  ctx.putImageData(rockImg, 0, 0);

  // ── 2. 岩の亀裂 ──
  ctx.lineCap = "round";
  const crackN = 2 + Math.floor(rng() * 3);
  for (let c = 0; c < crackN; c++) {
    let cx = rng()*W, cy = rng()*H;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    const segs = 3 + Math.floor(rng()*4);
    for (let s = 0; s < segs; s++) {
      cx += (rng()-0.5)*W*0.22; cy += (rng()-0.28)*H*0.18;
      ctx.lineTo(cx, cy);
    }
    ctx.strokeStyle = `rgba(0,0,0,${0.2+rng()*0.18})`;
    ctx.lineWidth = 0.3 + rng()*0.7;
    ctx.stroke();
  }

  // ── 3. 宝石結晶の出現位置 ──
  // 原石なので結晶が岩から突き出ている感じ
  const crystalCount = 1 + Math.floor(rng() * 3);
  for (let cc = 0; cc < crystalCount; cc++) {
    const cx = W * (0.1 + rng() * 0.8);
    const cy = H * (0.1 + rng() * 0.8);
    const r0 = Math.min(W, H) * (0.08 + rng() * 0.18);
    const facets = 5 + Math.floor(rng() * 5);
    const rotOffset = rng() * Math.PI * 2;

    // 頂点を生成（不規則な多角形）
    const pts = [];
    for (let f = 0; f < facets; f++) {
      const ang = rotOffset + (f / facets) * Math.PI * 2 + (rng()-0.5)*0.4;
      const rr  = r0 * (0.6 + rng() * 0.55);
      pts.push({ x: cx + Math.cos(ang)*rr, y: cy + Math.sin(ang)*rr });
    }

    // ── 3a. 結晶の各ファセット ──
    for (let f = 0; f < facets; f++) {
      const p1 = pts[f], p2 = pts[(f+1) % facets];
      const fAng = Math.atan2(p2.y-p1.y, p2.x-p1.x);

      // 面の向きで屈折色が変わる
      const hShift = Math.sin(fAng) * 28 * clarity;
      const faceLum = gem.light * (0.5 + clarity * 0.55) + Math.cos(fAng + rotOffset) * 18;
      const faceSat = gem.sat * (0.75 + clarity * 0.35);
      const [fr,fg,fb] = hslToRgb(
        ((gem.hue + hShift) % 360 + 360) % 360,
        Math.min(100, faceSat),
        Math.max(5, Math.min(95, faceLum))
      );

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.fillStyle = `rgba(${fr},${fg},${fb},${0.35 + clarity * 0.5})`;
      ctx.fill();

      // 稜線の光
      ctx.strokeStyle = `rgba(255,255,255,${0.06 + clarity * 0.22})`;
      ctx.lineWidth = 0.4 + clarity * 0.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // ── 3b. 透明感ハイライト ──
    if (clarity > 0.35) {
      // 主ハイライト
      const hx = cx - r0*0.28, hy = cy - r0*0.32;
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, r0*0.42);
      const hAlpha = 0.22 + clarity * 0.55;
      hg.addColorStop(0, `rgba(255,255,255,${hAlpha})`);
      hg.addColorStop(0.45, `rgba(255,255,255,${hAlpha*0.22})`);
      hg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.ellipse(hx, hy, r0*0.32, r0*0.20, -0.5, 0, Math.PI*2);
      ctx.fill();

      // 内部の深みグラデーション（透明感を強調）
      const depthG = ctx.createRadialGradient(cx, cy, 0, cx, cy, r0);
      const [dr,dg,db] = hslToRgb(gem.hue, gem.sat*0.6, gem.light*0.4);
      depthG.addColorStop(0, `rgba(${dr},${dg},${db},0)`);
      depthG.addColorStop(0.7, `rgba(${dr},${dg},${db},${clarity*0.25})`);
      depthG.addColorStop(1, `rgba(0,0,0,${clarity*0.2})`);
      ctx.fillStyle = depthG;
      ctx.beginPath();
      for (let f = 0; f < facets; f++) {
        f===0 ? ctx.moveTo(pts[f].x, pts[f].y) : ctx.lineTo(pts[f].x, pts[f].y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // ── 3c. 光分散スパーク（高透明度） ──
    if (clarity > 0.6) {
      const sparkN = Math.floor((clarity - 0.6) * 18);
      for (let sp = 0; sp < sparkN; sp++) {
        const spx = cx + (rng3()-0.5)*r0*1.8;
        const spy = cy + (rng3()-0.5)*r0*1.8;
        const spH = ((gem.hue + rng3()*140 - 70) % 360 + 360) % 360;
        const [sr,sg,sb] = hslToRgb(spH, 0.88, 0.72);
        ctx.fillStyle = `rgba(${sr},${sg},${sb},${0.45+rng3()*0.45})`;
        ctx.beginPath();
        ctx.arc(spx, spy, 0.35+rng3()*0.75, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // ── 3d. インクルージョン ──
    const incN = Math.floor(inclusion * 10);
    for (let i = 0; i < incN; i++) {
      const ix = cx + (rng3()-0.5)*r0*1.4;
      const iy = cy + (rng3()-0.5)*r0*1.4;
      if (rng3() < 0.45) {
        // 雲状インクルージョン
        ctx.fillStyle = `rgba(220,210,195,${0.10+rng3()*0.14})`;
        ctx.beginPath();
        ctx.arc(ix, iy, 0.7+rng3()*1.4, 0, Math.PI*2);
        ctx.fill();
      } else {
        // 針状インクルージョン
        ctx.strokeStyle = `rgba(15,8,3,${0.12+rng3()*0.18})`;
        ctx.lineWidth = 0.25+rng3()*0.4;
        const ia = rng3()*Math.PI;
        const il = 1.2+rng3()*3.5;
        ctx.beginPath();
        ctx.moveTo(ix-Math.cos(ia)*il, iy-Math.sin(ia)*il);
        ctx.lineTo(ix+Math.cos(ia)*il, iy+Math.sin(ia)*il);
        ctx.stroke();
      }
    }

    // ── 3e. 岩との境界（結晶が岩から生えている感じ） ──
    ctx.strokeStyle = `rgba(30,20,10,${0.35+rng()*0.2})`;
    ctx.lineWidth = 0.6 + rng()*0.8;
    ctx.beginPath();
    for (let f = 0; f < facets; f++) {
      f===0 ? ctx.moveTo(pts[f].x, pts[f].y) : ctx.lineTo(pts[f].x, pts[f].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // ── 4. ビネット ──
  const vg = ctx.createRadialGradient(W/2,H/2,H*0.08,W/2,H/2,H*0.72);
  vg.addColorStop(0,"rgba(0,0,0,0)");
  vg.addColorStop(1,"rgba(0,0,0,0.48)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,W,H);
}

export function getGemInfo(seed) {
  const gem  = rollGemType(mulberry32(seed ^ 0x12345678));
  const rng  = mulberry32(seed);
  const rng2 = mulberry32(seed ^ 0xdeadbeef);
  const clarity   = gem.clarity[0] + rng()  * (gem.clarity[1] - gem.clarity[0]);
  const inclusion = rng2() * (1 - clarity * 0.7);
  return { gem, clarity, inclusion };
        }
