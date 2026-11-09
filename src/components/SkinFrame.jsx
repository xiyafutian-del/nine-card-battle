import { useRef, useEffect, memo } from 'react';
import { drawMetalFrame } from '../skins/metalTexture.js';
import { drawGemFrame } from '../skins/gemTexture.js';

// 標準の帯の太さ（プレビュー用）。カードに重ねるときは CardDesign から band が渡される
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
function paintBand(canvas, skin, w, h, band = FRAME_PX) {
  const dpr = Math.min(window.devicePixelRatio || 2, 3);
  const W = Math.round(w * dpr);
  const H = Math.round(h * dpr);
  const F = Math.max(1, Math.min(Math.round(band * dpr), Math.floor(Math.min(W, H) / 2)));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  const m = getMaster(skin);
  const mw = m.width, mh = m.height;
  const fx = (F / W) * mw;
  const fy = (F / H) * mh;

  ctx.drawImage(m, 0, 0, mw, fy, 0, 0, W, F);                              // 上辺
  ctx.drawImage(m, 0, mh - fy, mw, fy, 0, H - F, W, F);                    // 下辺
  if (H - 2 * F > 0) {
    ctx.drawImage(m, 0, fy, fx, mh - 2 * fy, 0, F, F, H - 2 * F);                 // 左辺
    ctx.drawImage(m, mw - fx, fy, fx, mh - 2 * fy, W - F, F, F, H - 2 * F);       // 右辺
  }
}

const sameSkin = (a, b) =>
  a.w === b.w && a.h === b.h && a.band === b.band && a.radius === b.radius &&
  a.skin?.seed === b.skin?.seed && a.skin?.type === b.skin?.type;

// カードに重ねるフレーム。親（カード外形と同じ大きさ）にぴったり重なる
//   band: 帯の太さ(px) / radius: カードの角丸(px)
export const SkinFrame = memo(function SkinFrame({ skin, w, h, band = FRAME_PX, radius = 0 }) {
  const ref = useRef(null);
  const type = skin?.type;
  const seed = skin?.seed;

  useEffect(() => {
    if (ref.current && skin) paintBand(ref.current, skin, w, h, band);
  }, [type, seed, w, h, band]);

  if (!skin) return null;
  return (
    <canvas
      ref={ref}
      className="pointer-events-none"
      style={{
        position: "absolute", left: 0, top: 0,
        width: `${w}px`, height: `${h}px`,
        zIndex: 10, borderRadius: `${radius}px`,
      }}
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
