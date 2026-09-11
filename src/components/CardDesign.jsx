import { ATTR_LABELS, TYPES } from '../constants/index.js';

export const CARD_W = 59;
export const CARD_H = 86;

export function rangeText(card) {
  if (!card) return "";
  if (card.rangeType === "diamond") return `◇${card.dRange || 1}`;
  return `□${card.hRange || 1}×${card.vRange || 1}`;
}

function FitText({ text, base, min }) {
  const len = (text || "").length;
  const size = len <= 6  ? base
             : len <= 9  ? base * 0.85
             : len <= 12 ? base * 0.72
             : min;
  return <span style={{ fontSize:`${size}px`, lineHeight:1.1 }}>{text}</span>;
}

// カードの共通レイアウト。w/hはpxで渡す
export function CardLayout({ card, image, extraBottom, dimmed=false, acted=false, w=CARD_W, h=CARD_H }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  const isCore = card.isCore || card.id === "core";

  const scale = w / CARD_W;           // スケール係数
  const bw = Math.max(1, scale * 1.5);// ボーダー幅px
  const bs = `${bw}px solid black`;
  const r  = `${3 * scale}px`;        // 角丸px

  if (isCore) {
    return (
      <div className="relative flex flex-col bg-white overflow-hidden"
        style={{ width:`${w}px`, height:`${h}px`, border:bs, borderRadius:r }}>
        <div className="flex items-center justify-center flex-shrink-0"
          style={{ height:"30%", borderBottom:bs }}>
          <span className="font-bold" style={{ fontSize:`${7*scale}px` }}>コア</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="font-bold" style={{ fontSize:`${18*scale}px` }}>{card.hp}</span>
        </div>
        {acted && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <span className="text-white font-bold bg-black/50" style={{ fontSize:`${6*scale}px`, padding:`0 ${2*scale}px` }}>済</span>
          </div>
        )}
      </div>
    );
  }

  const costW = Math.round(w * 0.30); // コストボックス幅
  const nameH = costW;                // 名前行の高さ = コストボックスと同じ

  return (
    <div className="relative flex flex-col bg-white overflow-hidden"
      style={{ width:`${w}px`, height:`${h}px`, border:bs, borderRadius:r, opacity:dimmed?0.45:1 }}>

      {/* コスト + 名前 */}
      <div className="flex items-stretch flex-shrink-0" style={{ height:`${nameH}px` }}>
        <div className="flex items-center justify-center flex-shrink-0"
          style={{ width:`${costW}px`, borderRight:bs, borderBottom:bs }}>
          <span className="font-bold" style={{ fontSize:`${9*scale}px` }}>{card.cost}</span>
        </div>
        <div className="flex items-center overflow-hidden flex-1"
          style={{ padding:`0 ${2*scale}px` }}>
          <FitText text={card.name} base={6.5*scale} min={3.5*scale}/>
        </div>
      </div>

      {/* イラスト（上下線なし） */}
      <div className="relative flex-shrink-0" style={{ height:`${Math.round(h*0.40)}px` }}>
        {image
          ? <img src={image} alt={card.name} className="absolute inset-0 w-full h-full object-cover"/>
          : <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
              <span className="text-gray-300" style={{ fontSize:`${5*scale}px` }}>
                {ATTR_LABELS[card.attr] || ""}
              </span>
            </div>
        }
      </div>

      {/* 境界線 */}
      <div style={{ borderTop:bs, flexShrink:0 }}/>

      {/* 下部: ステータス + 効果 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {!isSpellMagic && (
          <div className="flex items-center justify-between flex-shrink-0"
            style={{ padding:`${1*scale}px ${3*scale}px`, borderBottom:bs }}>
            <span className="font-bold" style={{ fontSize:`${6*scale}px` }}>{card.atk > 0 ? card.atk : "－"}</span>
            <span style={{ fontSize:`${5*scale}px` }}>{rangeText(card)}</span>
            <span className="font-bold" style={{ fontSize:`${6*scale}px` }}>{card.hp}</span>
          </div>
        )}
        <div className="flex-1 overflow-hidden" style={{ padding:`${1*scale}px ${3*scale}px` }}>
          <span className="leading-tight" style={{ fontSize:`${5*scale}px` }}>{card.desc||""}</span>
        </div>
      </div>

      {extraBottom}

      {acted && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <span className="text-white font-bold bg-black/50" style={{ fontSize:`${6*scale}px`, padding:`0 ${2*scale}px` }}>済</span>
        </div>
      )}
    </div>
  );
}

// 手札（59×86固定）
export function CardFace({ card, image }) {
  return <CardLayout card={card} image={image} w={CARD_W} h={CARD_H}/>;
}

// 場のカード（59×86固定）
export function UnitCell({ unit, pushed }) {
  return (
    <div style={{
      transition:"transform 0.15s",
      transform: pushed ? "translateY(5px)" : "none",
    }}>
      <CardLayout
        card={{ ...unit, cost: unit.originalCost ?? unit.cost }}
        image={unit.image}
        acted={unit.acted}
        w={CARD_W} h={CARD_H}
      />
    </div>
  );
}

// デッキ・図鑑（親コンテナのrefから実幅を取得）
import { useRef, useEffect, useState } from 'react';

export function CardGrid({ card, image, count, onInc, onDec }) {
  const ref = useRef(null);
  const [w, setW] = useState(70);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(entries => {
      setW(Math.round(entries[0].contentRect.width));
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const h = Math.round(w * CARD_H / CARD_W);
  const scale = w / CARD_W;
  const bw = Math.max(1, scale * 1.5);
  const bs = `${bw}px solid black`;

  const extraBottom = onInc ? (
    <div className="flex items-center justify-between flex-shrink-0"
      style={{ padding:`${1*scale}px ${2*scale}px`, borderTop:bs }}>
      <button onClick={onDec}
        className="border border-black font-bold flex items-center justify-center"
        style={{ width:`${16*scale}px`, height:`${16*scale}px`, fontSize:`${8*scale}px` }}>－</button>
      <span className="font-mono font-bold" style={{ fontSize:`${7*scale}px` }}>{count||0}</span>
      <button onClick={onInc}
        className="border border-black font-bold flex items-center justify-center"
        style={{ width:`${16*scale}px`, height:`${16*scale}px`, fontSize:`${8*scale}px` }}>＋</button>
    </div>
  ) : null;

  return (
    <div ref={ref} style={{ width:"100%" }}>
      <CardLayout card={card} image={image} extraBottom={extraBottom} w={w} h={h}/>
    </div>
  );
}
