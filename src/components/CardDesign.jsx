import { ATTR_LABELS, TYPES } from '../constants/index.js';

export const CARD_W = 59;
export const CARD_H = 86;

export function rangeText(card) {
  if (!card) return "";
  if (card.rangeType === "diamond") return `◇${card.dRange || 1}`;
  return `□${card.hRange || 1}×${card.vRange || 1}`;
}

function FitText({ text, maxSize = 0.55, minSize = 0.3, style = {} }) {
  const len = (text || "").length;
  const size = len <= 6  ? maxSize
             : len <= 9  ? maxSize * 0.85
             : len <= 12 ? maxSize * 0.72
             : minSize;
  return (
    <span style={{ fontSize:`${size}rem`, lineHeight:1.1, ...style }}>
      {text}
    </span>
  );
}

const COST_RATIO = 0.30;

// border幅をカードサイズに応じてスケール
function borderW(cardW) {
  return Math.max(1, Math.round(cardW / 30));
}

export function CardLayout({ card, image, extraBottom, dimmed = false, acted = false, cardW = CARD_W }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  const isCore = card.isCore || card.id === "core";
  const bw = borderW(cardW); // ボーダー幅(px)
  const bs = `${bw}px solid black`;
  const fs = cardW / CARD_W; // フォントスケール係数

  if (isCore) {
    return (
      <div
        className="relative flex flex-col bg-white overflow-hidden"
        style={{ width:"100%", height:"100%", borderRadius:`${3*fs}px`, border:bs }}
      >
        <div className="flex items-center justify-center flex-shrink-0"
          style={{ height:"30%", borderBottom:bs }}>
          <span className="font-bold" style={{ fontSize:`${0.6*fs}rem` }}>コア</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="font-bold" style={{ fontSize:`${1.4*fs}rem` }}>{card.hp}</span>
        </div>
        {acted && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <span className="text-white font-bold bg-black/50 px-1" style={{ fontSize:`${0.5*fs}rem` }}>済</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col bg-white overflow-hidden"
      style={{
        width:"100%", height:"100%",
        borderRadius:`${3*fs}px`,
        border: bs,
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      {/* 上部: コスト（正方形30%）+ 名前（下枠なし・イラストとの間の線なし） */}
      <div className="flex items-start flex-shrink-0">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width:`${COST_RATIO*100}%`,
            aspectRatio:"1/1",
            borderRight: bs,
            borderBottom: bs,
          }}
        >
          <span className="font-bold" style={{ fontSize:`${0.72*fs}rem` }}>{card.cost}</span>
        </div>
        <div
          className="flex items-center overflow-hidden flex-1"
          style={{ aspectRatio:`${1/COST_RATIO}/1`, padding:`0 ${3*fs}px` }}
        >
          <FitText text={card.name} maxSize={0.52*fs} minSize={0.28*fs}/>
        </div>
      </div>

      {/* イラスト（上下の線なし） */}
      <div className="relative flex-shrink-0" style={{ height:"40%" }}>
        {image
          ? <img src={image} alt={card.name} className="absolute inset-0 w-full h-full object-cover"/>
          : <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
              <span className="text-gray-300" style={{ fontSize:`${0.4*fs}rem` }}>
                {ATTR_LABELS[card.attr] || ""}
              </span>
            </div>
        }
      </div>

      {/* 下部との境界線 */}
      <div style={{ borderTop: bs, flexShrink:0 }}/>

      {/* 下部: ステータス + 効果 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {!isSpellMagic && (
          <div
            className="flex items-center justify-between flex-shrink-0"
            style={{
              fontSize:`${0.5*fs}rem`,
              padding:`${1*fs}px ${3*fs}px`,
              borderBottom:`${bw}px solid black`,
            }}
          >
            <span className="font-bold">{card.atk > 0 ? card.atk : "－"}</span>
            <span style={{ fontSize:`${0.42*fs}rem` }}>{rangeText(card)}</span>
            <span className="font-bold">{card.hp}</span>
          </div>
        )}
        <div className="flex-1 overflow-hidden" style={{ padding:`${1*fs}px ${3*fs}px` }}>
          <span className="text-black leading-tight" style={{ fontSize:`${0.38*fs}rem` }}>
            {card.desc || ""}
          </span>
        </div>
      </div>

      {extraBottom}

      {acted && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <span className="text-white font-bold bg-black/50 px-1" style={{ fontSize:`${0.5*fs}rem` }}>済</span>
        </div>
      )}
    </div>
  );
}

// 手札（59×86固定）
export function CardFace({ card, image }) {
  return (
    <div style={{ width:`${CARD_W}px`, height:`${CARD_H}px` }}>
      <CardLayout card={card} image={image} cardW={CARD_W}/>
    </div>
  );
}

// 場のカード（59×86固定）
export function UnitCell({ unit, pushed }) {
  return (
    <div style={{
      width:`${CARD_W}px`, height:`${CARD_H}px`,
      transition:"transform 0.15s",
      transform: pushed ? "translateY(5px)" : "none",
    }}>
      <CardLayout
        card={{ ...unit, cost: unit.originalCost ?? unit.cost }}
        image={unit.image}
        acted={unit.acted}
        cardW={CARD_W}
      />
    </div>
  );
}

// デッキ・図鑑（親要素のサイズに依存）
export function CardGrid({ card, image, count, onInc, onDec, cardW = 70 }) {
  const fs = cardW / CARD_W;
  const bw = borderW(cardW);

  const extraBottom = onInc ? (
    <div
      className="flex items-center justify-between flex-shrink-0"
      style={{ padding:`${1*fs}px ${2*fs}px`, borderTop:`${bw}px solid black` }}
    >
      <button onClick={onDec}
        className="border border-black font-bold flex items-center justify-center"
        style={{ width:`${20*fs}px`, height:`${20*fs}px`, fontSize:`${0.7*fs}rem` }}>－</button>
      <span className="font-mono font-bold" style={{ fontSize:`${0.55*fs}rem` }}>{count||0}</span>
      <button onClick={onInc}
        className="border border-black font-bold flex items-center justify-center"
        style={{ width:`${20*fs}px`, height:`${20*fs}px`, fontSize:`${0.7*fs}rem` }}>＋</button>
    </div>
  ) : null;

  return (
    <div style={{ width:"100%", aspectRatio:`${CARD_W}/${CARD_H}` }}>
      <CardLayout card={card} image={image} extraBottom={extraBottom} cardW={cardW}/>
    </div>
  );
}
