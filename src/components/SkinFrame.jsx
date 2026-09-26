
import { useRef, useEffect } from 'react';
import { drawMetalFrame } from '../skins/metalTexture.js';
// gemTexture が未実装の場合のエラー回避用フォールバック
import * as gemModule from '../skins/gemTexture.js';
const drawGemFrame = gemModule.drawGemFrame || drawMetalFrame;

// ドーナツ形状（外側角丸 - 内側角丸）で切り抜いてテクスチャを描画する関数
function renderFrameOnly(canvas, skin, W, H, F, R) {
  const ctx = canvas.getContext("2d");
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.beginPath();

  // 1. 外側の角丸パス
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, W, H, R);
  } else {
    ctx.rect(0, 0, W, H);
  }

  // 2. 内側の角丸パス（枠幅 F だけ内側）
  const innerW = Math.max(0, W - F * 2);
  const innerH = Math.max(0, H - F * 2);
  const innerR = Math.max(0, R - F);

  if (ctx.roundRect) {
    ctx.roundRect(F, F, innerW, innerH, innerR);
  } else {
    ctx.rect(F, F, innerW, innerH);
  }

  // 3. 枠部分（外側と内側の間）だけをクリップ領域に指定
  ctx.clip('evenodd');

  // 4. クリップ領域にのみテクスチャを描画
  if (skin.type === "metal") {
    drawMetalFrame(canvas, skin.seed, W, H, ctx);
  } else if (skin.type === "gem") {
    drawGemFrame(canvas, skin.seed, W, H, ctx);
  }

  ctx.restore();
}

export function SkinFrame({ skin, w, h }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !skin) return;

    const dpr = window.devicePixelRatio || 2;
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);

    // カードのサイズ(w)に合わせて枠幅 F と 角丸 R を動的に調整
    const scale = w / 59;
    const F = Math.round(Math.max(1.5, scale * 2.5) * dpr);
    const R = Math.round((3 * scale) * dpr);

    el.style.width  = w + "px";
    el.style.height = h + "px";

    renderFrameOnly(el, skin, W, H, F, R);
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

// プレビュー表示用
export function SkinPreview({ skin, w=59, h=86 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !skin) return;

    const dpr = window.devicePixelRatio || 2;
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);

    const scale = w / 59;
    const F = Math.round(Math.max(1.5, scale * 2.5) * dpr);
    const R = Math.round((3 * scale) * dpr);

    el.style.width  = w + "px";
    el.style.height = h + "px";

    const ctx = el.getContext("2d");
    el.width  = W;
    el.height = H;

    // 背景（白）
    ctx.fillStyle = "white";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, W, H, R);
    else ctx.rect(0, 0, W, H);
    ctx.fill();

    // カード外枠（黒）
    ctx.strokeStyle = "black";
    ctx.lineWidth = Math.round(dpr * 1.5);
    ctx.stroke();

    // フレームテクスチャを重ねて描画
    renderFrameOnly(el, skin, W, H, F, R);

  }, [skin, w, h]);

  return (
    <canvas
      ref={ref}
      style={{ display: "block", borderRadius: "2px" }}
    />
  );
}
