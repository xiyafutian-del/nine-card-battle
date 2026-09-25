import { useRef, useEffect } from 'react';
import { drawMetalFrame } from '../skins/metalTexture.js';
import { drawGemFrame } from '../skins/gemTexture.js';

// カードの黒枠幅 + 1pt = 約2〜3px
const FRAME_PX = 3;

function renderFrameOnly(canvas, skin, W, H, F) {
  const ctx = canvas.getContext("2d");
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  // 全面にテクスチャを一時バッファに描画
  const tmp = document.createElement("canvas");
  tmp.width = W; tmp.height = H;
  if (skin.type === "metal") drawMetalFrame(tmp, skin.seed, W, H, tmp.getContext("2d"));
  else if (skin.type === "gem") drawGemFrame(tmp, skin.seed, W, H, tmp.getContext("2d"));

  // 枠の帯だけをコピー（上下左右F px分）
  // 上辺
  ctx.drawImage(tmp, 0, 0, W, F, 0, 0, W, F);
  // 下辺
  ctx.drawImage(tmp, 0, H-F, W, F, 0, H-F, W, F);
  // 左辺（上下除く）
  ctx.drawImage(tmp, 0, F, F, H-F*2, 0, F, F, H-F*2);
  // 右辺（上下除く）
  ctx.drawImage(tmp, W-F, F, F, H-F*2, W-F, F, F, H-F*2);
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
    renderFrameOnly(el, skin, W, H, F);
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

// プレビュー：細い枠だけ表示（カード形状で）
export function SkinPreview({ skin, w=59, h=86 }) {
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
    el.width  = W;
    el.height = H;

    const ctx = el.getContext("2d");

    // 背景白
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, W, H);

    // 黒枠（カードの枠を再現）
    ctx.strokeStyle = "black";
    ctx.lineWidth = Math.round(dpr * 1.5);
    ctx.strokeRect(0.5, 0.5, W-1, H-1);

    // フレームだけ描画
    renderFrameOnly(el, skin, W, H, F);

  }, [skin, w, h]);

  return (
    <canvas
      ref={ref}
      style={{ display:"block", borderRadius:"2px" }}
    />
  );
}
