import { useRef, useEffect } from 'react';
import { drawMetalFrame } from '../skins/metalTexture.js';
import { drawGemFrame } from '../skins/gemTexture.js';

// 角丸枠（ドーナツ形状）の領域だけを切り抜いてテクスチャを描画する関数
function renderFrameOnly(canvas, skin, W, H, F, R) {
  const ctx = canvas.getContext("2d");
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.beginPath();

  if (ctx.roundRect) {
    // 外側の角丸長方形
    ctx.roundRect(0, 0, W, H, R);
    // 内側の角丸長方形（枠幅 F だけ内側）
    ctx.roundRect(F, F, W - F * 2, H - F * 2, Math.max(0, R - F));
  } else {
    ctx.rect(0, 0, W, H);
    ctx.rect(F, F, W - F * 2, H - F * 2);
  }

  // 外側と内側の間（枠部分）だけをクリップ領域に指定
  ctx.clip('evenodd');

  // テクスチャを描画（クリップされた枠部分にのみ描画される）
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

    // カード幅(CARD_W=59)に対するスケールを計算
    const scale = w / 59;
    // 黒枠をしっかり覆う枠幅 F と 角丸 R を動的に算出
    const F = Math.round(Math.max(1.5, scale * 2.0) * dpr);
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

// プレビュー：細い枠だけ表示（カード形状で）
export function SkinPreview({ skin, w=59, h=86 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !skin) return;

    const dpr = window.devicePixelRatio || 2;
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);

    const scale = w / 59;
    const F = Math.round(Math.max(1.5, scale * 2.0) * dpr);
    const R = Math.round((3 * scale) * dpr);

    el.style.width  = w + "px";
    el.style.height = h + "px";

    const ctx = el.getContext("2d");

    // 背景白
    ctx.fillStyle = "white";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, W, H, R);
    else ctx.rect(0, 0, W, H);
    ctx.fill();

    // 黒枠（カードの枠を再現）
    ctx.strokeStyle = "black";
    ctx.lineWidth = Math.round(dpr * 1.5);
    ctx.stroke();

    // フレーム描画
    renderFrameOnly(el, skin, W, H, F, R);

  }, [skin, w, h]);

  return (
    <canvas
      ref={ref}
      style={{ display: "block", borderRadius: "2px" }}
    />
  );
}
