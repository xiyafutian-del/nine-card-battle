import { ATTR_LABELS, TYPES } from '../constants/index.js';

export const CARD_W = 59;
export const CARD_H = 86;
export const BORDER = "border-2 border-black";

export function rangeText(card) {
  if (!card) return "";
  if (card.rangeType === "diamond") return `◇${card.dRange || 1}`;
  return `□${card.hRange || 1}×${card.vRange || 1}`;
}

function FitText({ text, maxSize = 0.55, minSize = 0.3, className = "", style = {} }) {
  const len = (text || "").length;
  const size = len <= 6  ? maxSize
             : len <= 9  ? maxSize * 0.85
             : len <= 12 ? maxSize * 0.72
             : minSize;
  return (
    <span className={className} style={{ fontSize: `${size}rem`, lineHeight: 1.1, ...style }}>
      {text}
    </span>
  );
}

// コスト正方形の幅はカード幅の30%
const COST_RATIO = 0.30;

export function CardLayout({ card, image, extraBottom, dimmed = false, acted = false }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  const isCore = card.isCore || card.id === "core";

  // コアは専用デザイン
  if (isCore) {
    return (
      <div
        className={`relative flex flex-col bg-white ${BORDER} overflow-hidden`}
        style={{ width:"100%", height:"100%", borderRadius:"3px" }}
      >
        {/* 上部: コア表示 */}
        <div className="flex items-center justify-center border-b-2 border-black flex-shrink-0"
          style={{ height:"30%" }}>
          <span className="font-bold" style={{ fontSize:"0.6rem" }}>コア</span>
        </div>
        {/* 中央: HP大きく */}
        <div className="flex-1 flex items-center justify-center">
          <span className="font-bold" style={{ fontSize:"1.4rem" }}>{card.hp}</span>
        </div>
        {acted && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <span className="text-white font-bold bg-black/50 px-1" style={{ fontSize:"0.5rem" }}>済</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col bg-white ${BORDER} overflow-hidden`}
      style={{ width:"100%", height:"100%", borderRadius:"3px", opacity: dimmed ? 0.45 : 1 }}
    >
      {/* 上部: コスト（30%正方形） + 名前 */}
      <div className="flex items-start flex-shrink-0">
        <div
          className="border-r-2 border-b-2 border-black flex items-center justify-center flex-shrink-0"
          style={{ width:`${COST_RATIO * 100}%`, aspectRatio:"1/1" }}
        >
          <span className="font-bold" style={{ fontSize:"0.72rem" }}>{card.cost}</span>
        </div>
        <div
          className="flex items-center px-1 overflow-hidden flex-1"
          style={{ aspectRatio:`${1/COST_RATIO}/1` }}
        >
          <FitText text={card.name} maxSize={0.52} minSize={0.28}/>
        </div>
      </div>

      {/* イラスト */}
      <div
        className="relative border-t-2 border-b-2 border-black flex-shrink-0"
        style={{ height:"40%" }}
      >
        {image
          ? <img src={image} alt={card.name} className="absolute inset-0 w-full h-full object-cover"/>
          : <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
              <span className="text-gray-300" style={{ fontSize:"0.4rem" }}>
                {ATTR_LABELS[card.attr] || ""}
              </span>
            </div>
        }
      </div>

      {/* 下部: ステータス + 効果 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {!isSpellMagic && (
          <div
            className="flex items-center justify-between border-b border-black flex-shrink-0"
            style={{ fontSize:"0.5rem", padding:"1px 3px" }}
          >
            <span className="font-bold">{card.atk > 0 ? card.atk : "－"}</span>
            <span style={{ fontSize:"0.42rem" }}>{rangeText(card)}</span>
            <span className="font-bold">{card.hp}</span>
          </div>
        )}
        <div className="flex-1 overflow-hidden" style={{ padding:"1px 3px" }}>
          <span className="text-black leading-tight" style={{ fontSize:"0.38rem" }}>
            {card.desc || ""}
          </span>
        </div>
      </div>

      {extraBottom}

      {acted && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <span className="text-white font-bold bg-black/50 px-1" style={{ fontSize:"0.5rem" }}>済</span>
        </div>
      )}
    </div>
  );
}

export function CardFace({ card, image }) {
  return (
    <div style={{ width:`${CARD_W}px`, height:`${CARD_H}px` }}>
      <CardLayout card={card} image={image}/>
    </div>
  );
}

export function UnitCell({ unit, pushed }) {
  return (
    <div
      style={{
        width:`${CARD_W}px`, height:`${CARD_H}px`,
        transition:"transform 0.15s",
        transform: pushed ? "translateY(5px)" : "none",
      }}
    >
      <CardLayout
        card={{ ...unit, cost: unit.originalCost ?? unit.cost }}
        image={unit.image}
        acted={unit.acted}
      />
    </div>
  );
}

export function CardGrid({ card, image, count, onInc, onDec }) {
  const extraBottom = onInc ? (
    <div
      className="flex items-center justify-between border-t-2 border-black flex-shrink-0"
      style={{ padding:"1px 2px" }}
    >
      <button onClick={onDec}
        className="w-5 h-5 border border-black font-bold flex items-center justify-center"
        style={{ fontSize:"0.7rem" }}>－</button>
      <span className="font-mono font-bold" style={{ fontSize:"0.55rem" }}>{count||0}</span>
      <button onClick={onInc}
        className="w-5 h-5 border border-black font-bold flex items-center justify-center"
        style={{ fontSize:"0.7rem" }}>＋</button>
    </div>
  ) : null;

  return (
    <div style={{ width:"100%", aspectRatio:`${CARD_W}/${CARD_H}` }}>
      <CardLayout card={card} image={image} extraBottom={extraBottom}/>
    </div>
  );
}
