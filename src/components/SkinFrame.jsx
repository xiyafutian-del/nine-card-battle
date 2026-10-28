import { useRef, useEffect, memo } from 'react';
import { drawMetalFrame } from '../skins/metalTexture.js';
import { drawGemFrame } from '../skins/gemTexture.js';

// カードの黒枠 + 約1pt
const FRAME_PX = 3;

// テクスチャは固定の小さいサイズで1回だけ生成してキャッシュ
const MASTER_W = 120;
const MASTER_H = 174;
const masterCache = new Map();

function getMaster(skin) {
  const key = `${skin.type}-${skin.seed}`;
  let m = masterCache.get(key);
  if (m) return m;
  m = document.createElement("canvas");
  m.width = MASTER_W;
  m.height = MASTER_H;
  const ctx = m.getContext("2d");
  if (skin.type === "metal") drawMetalFrame(m, skin.seed, MASTER_W, MASTER_H, ctx);
  else drawGemFrame(m, skin.seed, MASTER_W, MASTER_H, ctx);
  masterCache.set(key, m);
  return m;
}

// キャッシュ済みテクスチャから枠の帯だけを描く（ピクセル計算なし）
function paintBand(canvas, skin, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 2, 3);
  const W = Math.round(w * dpr);
  const H = Math.round(h * dpr);
  const F = Math.max(1, Math.round(FRAME_PX * dpr));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  const m = getMaster(skin);
  const mw = m.width, mh = m.height;
  const fx = (F / W) * mw;
  const fy = (F / H) * mh;

  ctx.drawImage(m, 0, 0, mw, fy, 0, 0, W, F);                       // 上辺
  ctx.drawImage(m, 0, mh - fy, mw, fy, 0, H - F, W, F);             // 下辺
  if (H - 2 * F > 0) {
    ctx.drawImage(m, 0, fy, fx, mh - 2 * fy, 0, F, F, H - 2 * F);          // 左辺
    ctx.drawImage(m, mw - fx, fy, fx, mh - 2 * fy, W - F, F, F, H - 2 * F); // 右辺
  }
}

const sameSkin = (a, b) =>
  a.w === b.w && a.h === b.h && a.skin?.seed === b.skin?.seed && a.skin?.type === b.skin?.type;

// カードに重ねるフレーム
export const SkinFrame = memo(function SkinFrame({ skin, w, h }) {
  const ref = useRef(null);
  const type = skin?.type;
  const seed = skin?.seed;

  useEffect(() => {
    if (ref.current && skin) paintBand(ref.current, skin, w, h);
  }, [type, seed, w, h]);

  if (!skin) return null;
  return (
    <canvas
      ref={ref}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10, width: `${w}px`, height: `${h}px` }}
    />
  );
}, sameSkin);

// ガチャ・所持一覧用プレビュー（枠だけ）
export const SkinPreview = memo(function SkinPreview({ skin, w = 59, h = 86 }) {
  const ref = useRef(null);
  const type = skin?.type;
  const seed = skin?.seed;

  useEffect(() => {
    if (ref.current && skin) paintBand(ref.current, skin, w, h);
  }, [type, seed, w, h]);

  return (
    <canvas
      ref={ref}
      style={{ display: "block", borderRadius: "2px", width: `${w}px`, height: `${h}px` }}
    />
  );
}, sameSkin);
