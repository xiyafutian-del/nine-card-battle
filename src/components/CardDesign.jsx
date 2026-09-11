import { ATTR_LABELS, TYPES } from '../constants/index.js';

// ============ 定数（ここを変えると全カードに反映） ============
export const CARD_W = 59;
export const CARD_H = 86;
export const COST_SIZE = 28;   // コストボックスの一辺(px)
export const BORDER = "border-2 border-black";

// 射程テキスト
export function rangeText(card) {
  if (!card) return "";
  if (card.rangeType === "diamond") return `◇${card.dRange || 1}`;
  return `□${card.hRange || 1}×${card.vRange || 1}`;
}

// フォントサイズを自動縮小するコンポーネント
function FitText({ text, maxSize = 0.55, minSize = 0.3, className = "", style = {} }) {
  // 文字数に応じてフォントサイズを縮小
  const len = (text || "").length;
  const size = len <= 6 ? maxSize
             : len <= 9 ? maxSize * 0.85
             : len <= 12 ? maxSize * 0.72
             : minSize;
  return (
    <span className={className} style={{ fontSize: `${size}rem`, lineHeight: 1.1, ...style }}>
      {text}
    </span>
  );
}

// ============ 共通カードレイアウト ============
// 手札・場・デッキ・図鑑全て同じコンポーネントを使用
// extraBottom: カード下部に追加するUI（デッキ枚数カウンター等）
export function CardLayout({ card, image, extraBottom, dimmed = false, acted = false }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  const isCore = card.isCore || card.id === "core";

  return (
    <div
      className={`relative flex flex-col bg-white ${BORDER} overflow-hidden`}
      style={{
        width: "100%", height: "100%",
        borderRadius: "3px",
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      {/* ── 上部: コスト + 名前 ── */}
      <div className="flex items-start flex-shrink-0">
        {/* コスト（正方形） */}
        <div
          className="border-r-2 border-b-2 border-black flex items-center justify-center flex-shrink-0"
          style={{ width: `${COST_SIZE}px`, height: `${COST_SIZE}px` }}
        >
          <span className="font-bold" style={{ fontSize: "0.72rem" }}>
            {card.cost}
          </span>
        </div>
        {/* 名前（下枠なし・フィットテキスト） */}
        <div
          className="flex items-center px-1 overflow-hidden flex-1"
          style={{ height: `${COST_SIZE}px` }}
        >
          <FitText text={card.name} maxSize={0.52} minSize={0.3}/>
        </div>
      </div>

      {/* ── イラスト ── */}
      <div
        className="relative border-t-2 border-b-2 border-black flex-shrink-0"
        style={{ height: "40%" }}
      >
        {image
          ? <img src={image} alt={card.name} className="absolute inset-0 w-full h-full object-cover"/>
          : <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
              {isCore && <span style={{ fontSize: "0.5rem" }}>コア</span>}
              {!isCore && (
                <span className="text-gray-300" style={{ fontSize: "0.4rem" }}>
                  {ATTR_LABELS[card.attr] || ""}
                </span>
              )}
            </div>
        }
      </div>

      {/* ── 下部: ステータス + 効果 ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* ATK・射程・HP（スペル・魔法・コア以外） */}
        {!isSpellMagic && !isCore && (
          <div
            className="flex items-center justify-between border-b border-black flex-shrink-0"
            style={{ fontSize: "0.5rem", padding: "1px 3px" }}
          >
            <span className="font-bold">{card.atk > 0 ? card.atk : "－"}</span>
            <span style={{ fontSize: "0.42rem" }}>{rangeText(card)}</span>
            <span className="font-bold">{card.hp}</span>
          </div>
        )}
        {/* コアのHP */}
        {isCore && (
          <div
            className="flex items-center justify-center border-b border-black flex-shrink-0"
            style={{ fontSize: "0.7rem", padding: "1px 0" }}
          >
            <span className="font-bold">{card.hp}</span>
          </div>
        )}
        {/* 効果テキスト */}
        <div className="flex-1 overflow-hidden" style={{ padding: "1px 3px" }}>
          <span className="text-black leading-tight" style={{ fontSize: "0.38rem" }}>
            {card.desc || ""}
          </span>
        </div>
      </div>

      {/* ── 追加UI（デッキ枚数カウンター等） ── */}
      {extraBottom}

      {/* ── 行動済みオーバーレイ ── */}
      {acted && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <span className="text-white font-bold bg-black/50 px-1" style={{ fontSize: "0.5rem" }}>済</span>
        </div>
      )}
    </div>
  );
}

// ============ 手札カード ============
export function CardFace({ card, image }) {
  return (
    <div style={{ width: `${CARD_W}px`, height: `${CARD_H}px` }}>
      <CardLayout card={card} image={image}/>
    </div>
  );
}

// ============ 場のカード ============
export function UnitCell({ unit, pushed }) {
  return (
    <div
      style={{
        width: `${CARD_W}px`, height: `${CARD_H}px`,
        transition: "transform 0.15s",
        transform: pushed ? "translateY(5px)" : "none",
      }}
    >
      <CardLayout
        card={{
          ...unit,
          cost: unit.originalCost ?? unit.cost, // 召喚前コストを表示
        }}
        image={unit.image}
        acted={unit.acted}
      />
    </div>
  );
}

// ============ デッキ・図鑑カード ============
export function CardGrid({ card, image, count, onInc, onDec }) {
  const extraBottom = onInc ? (
    <div
      className="flex items-center justify-between border-t-2 border-black flex-shrink-0"
      style={{ padding: "1px 2px" }}
    >
      <button
        onClick={onDec}
        className="w-5 h-5 border border-black font-bold flex items-center justify-center"
        style={{ fontSize: "0.7rem" }}
      >－</button>
      <span className="font-mono font-bold" style={{ fontSize: "0.55rem" }}>{count || 0}</span>
      <button
        onClick={onInc}
        className="w-5 h-5 border border-black font-bold flex items-center justify-center"
        style={{ fontSize: "0.7rem" }}
      >＋</button>
    </div>
  ) : null;

  return (
    <div style={{ width: "100%", aspectRatio: `${CARD_W}/${CARD_H}` }}>
      <CardLayout card={card} image={image} extraBottom={extraBottom}/>
    </div>
  );
}
