import { useRef, useEffect } from 'react';
import { drawMetalFrame } from '../skins/metalTexture.js';
import { drawGemFrame } from '../skins/gemTexture.js';

const FRAME_PX = 4;

function renderFrame(canvas, skin, W, H, framePx) {
  const ctx = canvas.getContext("2d");
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  // 全面にテクスチャ描画
  if (skin.type === "metal") drawMetalFrame(canvas, skin.seed, W, H, ctx);
  else if (skin.type === "gem") drawGemFrame(canvas, skin.seed, W, H, ctx);

  // 内側を透明に消す
  ctx.clearRect(framePx, framePx, W - framePx*2, H - framePx*2);
}

export function SkinFrame({ skin, w, h }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !skin) return;
    const dpr = window.devicePixelRatio || 2;
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);
    const F = Math.round(FRAME_PX * dpr);
    el.style.width  = w + "px";
    el.style.height = h + "px";
    renderFrame(el, skin, W, H, F);
  }, [skin, w, h]);

  if (!skin) return null;
  return (
    <canvas
      ref={ref}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex:10 }}
    />
  );
}

export function SkinPreview({ skin, w=59, h=86 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !skin) return;
    const dpr = window.devicePixelRatio || 2;
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);
    // プレビューはフレーム少し太め
    const F = Math.round(FRAME_PX * dpr * 2);
    el.style.width  = w + "px";
    el.style.height = h + "px";

    // 背景白
    const ctx = el.getContext("2d");
    el.width  = W;
    el.height = H;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, W, H);

    // フレーム描画
    renderFrame(el, skin, W, H, F);

    // 内側に薄いグレー（カード本体のイメージ）
    ctx.fillStyle = "rgba(240,240,240,0.5)";
    ctx.fillRect(F, F, W-F*2, H-F*2);

    // 内側の黒枠線
    ctx.strokeStyle = "black";
    ctx.lineWidth = dpr * 0.8;
    ctx.strokeRect(F+0.5, F+0.5, W-F*2-1, H-F*2-1);
  }, [skin, w, h]);

  return (
    <canvas
      ref={ref}
      style={{ display:"block", border:"1px solid black", borderRadius:"2px" }}
    />
  );
}
