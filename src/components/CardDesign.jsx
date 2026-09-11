import { ATTR_LABELS, TYPES } from '../constants/index.js';

export const CARD_W = 59;
export const CARD_H = 86;

export function rangeText(card) {
  if (!card) return "";
  if (card.rangeType === "diamond") return `◇${card.dRange || 1}`;
  return `□${card.hRange || 1}×${card.vRange || 1}`;
}

// 全サイズをcardWに対する%・vwではなくcssのfont-size継承で制御
// 親要素のfont-sizeをcardWに比例させ、子要素はemで指定する

function FitText({ text, maxEm = 0.55, minEm = 0.3 }) {
  const len = (text || "").length;
  const size = len <= 6  ? maxEm
             : len <= 9  ? maxEm * 0.85
             : len <= 12 ? maxEm * 0.72
             : minEm;
  return (
    <span style={{ fontSize:`${size}em`, lineHeight:1.1 }}>
      {text}
    </span>
  );
}

export function CardLayout({ card, image, extraBottom, dimmed = false, acted = false }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  const isCore = card.isCore || card.id === "core";

  // 全サイズはemで、外側のfont-sizeに依存する
  // border幅もcalcで親のfont-sizeに比例
  const bs = "0.08em solid black";

  if (isCore) {
    return (
      <div className="relative flex flex-col bg-white overflow-hidden"
        style={{ width:"100%", height:"100%", border:bs, borderRadius:"0.15em" }}>
        <div className="flex items-center justify-center flex-shrink-0"
          style={{ height:"30%", borderBottom:bs }}>
          <span className="font-bold" style={{ fontSize:"0.6em" }}>コア</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="font-bold" style={{ fontSize:"1.4em" }}>{card.hp}</span>
        </div>
        {acted && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <span className="text-white font-bold bg-black/50" style={{ fontSize:"0.5em", padding:"0 0.2em" }}>済</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col bg-white overflow-hidden"
      style={{ width:"100%", height:"100%", border:bs, borderRadius:"0.15em", opacity:dimmed?0.45:1 }}>

      {/* コスト + 名前 */}
      <div className="flex items-start flex-shrink-0">
        <div className="flex items-center justify-center flex-shrink-0"
          style={{ width:"30%", aspectRatio:"1/1", borderRight:bs, borderBottom:bs }}>
          <span className="font-bold" style={{ fontSize:"0.72em" }}>{card.cost}</span>
        </div>
        <div className="flex items-center overflow-hidden flex-1"
          style={{ aspectRatio:"7/3", padding:"0 0.15em" }}>
          <FitText text={card.name} maxEm={0.52} minEm={0.28}/>
        </div>
      </div>

      {/* イラスト（上下線なし） */}
      <div className="relative flex-shrink-0" style={{ height:"40%" }}>
        {image
          ? <img src={image} alt={card.name} className="absolute inset-0 w-full h-full object-cover"/>
          : <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
              <span className="text-gray-300" style={{ fontSize:"0.4em" }}>
                {ATTR_LABELS[card.attr] || ""}
              </span>
            </div>
        }
      </div>

      {/* イラストと下部の境界線 */}
      <div style={{ borderTop:bs, flexShrink:0 }}/>

      {/* 下部: ステータス + 効果 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {!isSpellMagic && (
          <div className="flex items-center justify-between flex-shrink-0"
            style={{ fontSize:"0.5em", padding:"0.05em 0.3em", borderBottom:bs }}>
            <span className="font-bold">{card.atk > 0 ? card.atk : "－"}</span>
            <span style={{ fontSize:"0.9em" }}>{rangeText(card)}</span>
            <span className="font-bold">{card.hp}</span>
          </div>
        )}
        <div className="flex-1 overflow-hidden" style={{ padding:"0.05em 0.3em" }}>
          <span className="leading-tight" style={{ fontSize:"0.38em" }}>{card.desc || ""}</span>
        </div>
      </div>

      {extraBottom}

      {acted && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <span className="text-white font-bold bg-black/50" style={{ fontSize:"0.5em", padding:"0 0.2em" }}>済</span>
        </div>
      )}
    </div>
  );
}

// 手札（59×86）- font-sizeで全体スケール制御
export function CardFace({ card, image }) {
  return (
    <div style={{ width:`${CARD_W}px`, height:`${CARD_H}px`, fontSize:`${CARD_W}px` }}>
      <CardLayout card={card} image={image}/>
    </div>
  );
}

// 場のカード（59×86）
export function UnitCell({ unit, pushed }) {
  return (
    <div style={{
      width:`${CARD_W}px`, height:`${CARD_H}px`,
      fontSize:`${CARD_W}px`,
      transition:"transform 0.15s",
      transform: pushed ? "translateY(5px)" : "none",
    }}>
      <CardLayout
        card={{ ...unit, cost: unit.originalCost ?? unit.cost }}
        image={unit.image}
        acted={unit.acted}
      />
    </div>
  );
}

// デッキ・図鑑（親の幅に依存）
export function CardGrid({ card, image, count, onInc, onDec }) {
  const extraBottom = onInc ? (
    <div className="flex items-center justify-between flex-shrink-0"
      style={{ padding:"0.05em 0.1em", borderTop:"0.08em solid black" }}>
      <button onClick={onDec}
        className="border border-black font-bold flex items-center justify-center"
        style={{ width:"0.9em", height:"0.9em", fontSize:"0.7em" }}>－</button>
      <span className="font-mono font-bold" style={{ fontSize:"0.55em" }}>{count||0}</span>
      <button onClick={onInc}
        className="border border-black font-bold flex items-center justify-center"
        style={{ width:"0.9em", height:"0.9em", fontSize:"0.7em" }}>＋</button>
    </div>
  ) : null;

  // CardGridは親の幅をfont-sizeとして使う
  // aspect-ratio で高さが決まるので、widthをfont-sizeに使う
  return (
    <div style={{ width:"100%", aspectRatio:`${CARD_W}/${CARD_H}` }}
      className="relative">
      {/* font-sizeを親幅に連動させるためのラッパー */}
      <div style={{ position:"absolute", inset:0, fontSize:"inherit" }}>
        <CardLayout card={card} image={image} extraBottom={extraBottom}/>
      </div>
    </div>
  );
}
