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
  { id: "iron",       name: "自然鉄",       rarity: 50, hue: 210, sat: 10, light: 38, gloss: 0.5 },
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

  // 天文学的確率（フルメタル）判定
  // ※テスト用で15%にしてあります（本番は0.0001等）
  const isPureNugget = rng2() < 0.15;

  // ── 1. 鉱石破片（クラスタ）のグリッド配置（マイクラ風） ──
  // キャンバスを小さなセル（グリッド）に分割し、一部のセルの中に結晶の核を生成
  const cellSize = 12; // 結晶のかたまりの基準サイズ（ピクセル）
  const cols = Math.ceil(W / cellSize);
  const rows = Math.ceil(H / cellSize);
  
  // 鉱石グループ（クラスタ）の発生位置とサイズを決定
  const clusters = [];
  if (!isPureNugget) {
    const clusterCount = 2 + Math.floor(rng() * 5); // 画面内に2〜6箇所の鉱石かたまり
    for (let c = 0; c < clusterCount; c++) {
      clusters.push({
        cx: rng() * W,
        cy: rng() * H,
        radius: 12 + rng() * 28 // かたまりの半径
      });
    }
  }

  // ── 2. ピクセル描画 ──
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;

      // --- A. 自然な岩肌（グリッド非依存・周期のない不規則ノイズ） ---
      const rx = Math.floor(x / 4);
      const ry = Math.floor(y / 4);
      const rockNoise = (mulberry32(seed + rx * 157 + ry * 311)() - 0.5) * 20;
      const rockL = Math.max(15, Math.min(55, 32 + rockNoise));
      const [rr, rg, rb] = hslToRgb(30, 8, rockL);

      // --- B. 鉱石破片の判定（角ばったマイクラ風の塊） ---
      let isMetal = false;

      if (isPureNugget) {
        isMetal = true;
      } else {
        // 近接する鉱石クラスタ内にあるかチェック
        for (const cl of clusters) {
          const dx = x - cl.cx;
          const dy = y - cl.cy;
          const distSq = dx * dx + dy * dy;

          if (distSq < cl.radius * cl.radius) {
            // クラスタ内において、ドット風（セル単位）で不規則に破片を散りばめる
            const gx = Math.floor(x / 3);
            const gy = Math.floor(y / 3);
            const dotHash = mulberry32(seed ^ (gx * 92821 + gy * 38609))();
            
            // 中心に近いほど密度が高く、フチはガタガタした角張った破片になる
            const edgeFactor = 1 - Math.sqrt(distSq) / cl.radius;
            if (dotHash < edgeFactor * 0.85) {
              isMetal = true;
              break;
            }
          }
        }
      }

      // --- C. 色の割り当て ---
      if (isMetal) {
        // 破片の各ドットごとに微妙な輝き（面によるハイライト）をランダム付与
        const bx = Math.floor(x / 2);
        const by = Math.floor(y / 2);
        const blockShade = (mulberry32(seed + bx * 73 + by * 19)() - 0.5) * 25;
        
        const metalL = Math.max(20, Math.min(95, metal.light + blockShade * metal.gloss));
        const [mr, mg, mb] = hslToRgb(metal.hue, metal.sat, metalL);

        data[idx]   = mr;
        data[idx+1] = mg;
        data[idx+2] = mb;
      } else {
        data[idx]   = rr;
        data[idx+1] = rg;
        data[idx+2] = rb;
      }
      data[idx+3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // ── 3. 外周の立体影（枠線感） ──
  ctx.save();
  const borderShadow = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.35, W/2, H/2, Math.max(W, H) * 0.7);
  borderShadow.addColorStop(0, "rgba(0,0,0,0)");
  borderShadow.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = borderShadow;
  ctx.fillRect(0, 0, W, H);

  // ── 4. 中央の切り抜き（内側透過処理） ──
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
  const metal = rollMetalType(mulberry32(seed ^ 0x12345678));
  return { metal };
}
