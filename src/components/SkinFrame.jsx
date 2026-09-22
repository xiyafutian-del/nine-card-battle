import { useRef, useEffect } from 'react';
import { drawMetalFrame } from '../skins/metalTexture.js';
import { drawGemFrame } from '../skins/gemTexture.js';

// フレームのキャッシュ（seed+サイズ → canvas）
const frameCache = new Map();

function getFrameCanvas(skin, w, h) {
  const key = `${skin.type}-${skin.seed}-${w}-${h}`;
  if (frameCache.has(key)) return frameCache.get(key);

  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 2;
  canvas.width  = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  if (skin.type === "metal") drawMetalFrame(canvas, skin.seed);
  else if (skin.type === "gem") drawGemFrame(canvas, skin.seed);

  frameCache.set(key, canvas);
  return canvas;
}

// フレーム帯の厚さ（カード幅に対する割合）
const FRAME_RATIO = 0.10;

// フレームCanvasコンポーネント
// カードの外周のみにテクスチャを表示し、中央は透明
export function SkinFrame({ skin, w, h }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !skin) return;

    const dpr = window.devicePixelRatio || 2;
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);
    el.width  = W;
    el.height = H;
    el.style.width  = w + "px";
    el.style.height = h + "px";

    const ctx = el.getContext("2d");

    // テクスチャ全面描画
    if (skin.type === "metal") drawMetalFrame(el, skin.seed);
    else if (skin.type === "gem") drawGemFrame(el, skin.seed);

    // 中央を透明に抜く
    const fx = Math.round(W * FRAME_RATIO);
    const fy = Math.round(H * FRAME_RATIO);
    ctx.clearRect(fx, fy, W - fx*2, H - fy*2);

    // 内側の縁取り
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = Math.max(1, dpr * 0.8);
    ctx.beginPath();
    ctx.rect(fx, fy, W - fx*2, H - fy*2);
    ctx.stroke();

  }, [skin, w, h]);

  if (!skin) return null;

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}

// スキンのプレビュー表示（所持一覧・ガチャ結果）
export function SkinPreview({ skin, w = 59, h = 86 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !skin) return;
    const dpr = window.devicePixelRatio || 2;
    el.width  = Math.round(w * dpr);
    el.height = Math.round(h * dpr);
    el.style.width  = w + "px";
    el.style.height = h + "px";
    if (skin.type === "metal") drawMetalFrame(el, skin.seed);
    else if (skin.type === "gem") drawGemFrame(el, skin.seed);
  }, [skin, w, h]);

  return (
    <canvas
      ref={ref}
      className="border border-black"
      style={{ display:"block", borderRadius:"2px" }}
    />
  );
}
