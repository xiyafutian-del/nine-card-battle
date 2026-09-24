import { useRef, useEffect } from 'react';
import { drawMetalFrame } from '../skins/metalTexture.js';
import { drawGemFrame } from '../skins/gemTexture.js';

// フレーム帯の厚さ（カード幅に対するpx）
// 既存の黒枠(1.5px相当) + 2px = 約3〜4px
const FRAME_PX = 4;

export function SkinFrame({ skin, w, h }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !skin) return;

    const dpr = window.devicePixelRatio || 2;
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);
    const F = Math.round(FRAME_PX * dpr); // フレーム帯の厚さ(px)

    el.width  = W;
    el.height = H;
    el.style.width  = w + "px";
    el.style.height = h + "px";

    const ctx = el.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // 枠の4辺だけに描画するクリップパスを設定
    ctx.save();
    const path = new Path2D();
    // 外側
    path.rect(0, 0, W, H);
    // 内側（くり抜き）
    path.rect(F, F, W - F*2, H - F*2);
    ctx.clip(path, "evenodd");

    // テクスチャを全面描画（クリップで枠のみ見える）
    if (skin.type === "metal") drawMetalFrame(el, skin.seed, W, H, ctx);
    else if (skin.type === "gem") drawGemFrame(el, skin.seed, W, H, ctx);

    ctx.restore();

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

// プレビュー（枠のみ表示）
export function SkinPreview({ skin, w = 59, h = 86 }) {
  const ref = useRef(null);

useEffect(() => {
  const el = ref.current;
  if (!el || !skin) return;

  const dpr = window.devicePixelRatio || 2;
  const W = Math.round(w * dpr);
  const H = Math.round(h * dpr);
  const F = Math.round(FRAME_PX * dpr);

  el.width  = W;
  el.height = H;
  el.style.width  = w + "px";
  el.style.height = h + "px";

  const ctx = el.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  // クリップパス：外側の矩形から内側を抜く
  ctx.save();
  const outer = new Path2D();
  outer.rect(0, 0, W, H);
  const inner = new Path2D();
  inner.rect(F, F, W - F*2, H - F*2);
  const frame = new Path2D();
  frame.addPath(outer);
  frame.addPath(inner);
  ctx.clip(frame, "evenodd");

  // クリップされたctxにテクスチャ描画
  if (skin.type === "metal") drawMetalFrame(el, skin.seed, W, H, ctx);
  else if (skin.type === "gem") drawGemFrame(el, skin.seed, W, H, ctx);

  ctx.restore();
}, [skin, w, h]);

  return (
    <canvas
      ref={ref}
      style={{ display:"block", border:"1px solid black", borderRadius:"2px" }}
    />
  );
}
