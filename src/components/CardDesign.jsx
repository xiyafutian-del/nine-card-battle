import { ATTR_LABELS, TYPES } from '../constants/index.js';
import { useRef, useEffect, useState } from 'react';

export const CARD_W = 59;
export const CARD_H = 86;

export function rangeText(card) {
  if (!card) return "";
  if (card.rangeType === "diamond") return `d${card.dRange || 1}`;
  return `${card.hRange || 1}.${card.vRange || 1}`;
}

function FitText({ text, base, min }) {
  const len = (text || "").length;
  const size = len <= 6  ? base
             : len <= 9  ? base * 0.85
             : len <= 12 ? base * 0.72
             : min;
  return <span style={{ fontSize:`${size}px`, lineHeight:1.0 }}>{text}</span>;
}

// 回転角度を計算
function getRotation(unit) {
  if (!unit) return 0;
  const deg = unit.rotateDeg || 0;
  return deg;
}

export function CardLayout({ card, image, extraBottom, dimmed=false, w=CARD_W, h=CARD_H, rotateDeg=0 }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  const isCore = card.isCore || card.id === "core";

  const scale = w / CARD_W;
  const bw = Math.max(0.5, scale * 1.5);
  const bs = `${bw}px solid black`;
  const r  = `${3 * scale}px`;

  if (isCore) {
    return (
      <div className="relative flex flex-col bg-white overflow-hidden"
        style={{ width:`${w}px`, height:`${h}px`, border:bs, borderRadius:r,
          transform:`rotate(${rotateDeg}deg)`, transformOrigin:"center center" }}>
        <div className="flex items-center justify-center flex-shrink-0"
          style={{ height:"30%", borderBottom:bs }}>
          <span className="font-bold" style={{ fontSize:`${7*scale}px` }}>コア</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="font-bold" style={{ fontSize:`${18*scale}px` }}>{card.hp}</span>
        </div>
      </div>
    );
  }

  const costW = Math.round(w * 0.30 * 0.7);
  const nameH = Math.round(w * 0.30 * 0.7);
  const illH  = Math.round(h * 0.36);
  const statsH = Math.round(h * 0.13);
  const hasTags = card.tags?.length > 0;
  const tagsH  = hasTags ? Math.round(h * 0.10) : 0;

  return (
    <div className="relative flex flex-col bg-white overflow-hidden"
      style={{
        width:`${w}px`, height:`${h}px`, border:bs, borderRadius:r,
        opacity: dimmed ? 0.45 : 1,
        transform:`rotate(${rotateDeg}deg)`,
        transformOrigin:"center center",
      }}>

      {/* コスト + 名前 */}
      <div className="flex items-stretch flex-shrink-0" style={{ height:`${nameH}px` }}>
        <div className="flex items-center justify-center flex-shrink-0"
          style={{ width:`${costW}px`, borderRight:bs, borderBottom:bs }}>
          <span className="font-bold" style={{ fontSize:`${9*scale*0.7}px` }}>{card.cost}</span>
        </div>
        <div className="flex items-center overflow-hidden flex-1"
          style={{ padding:`0 ${2*scale}px` }}>
          <FitText text={card.name} base={6.5*scale*0.7} min={3.5*scale*0.7}/>
        </div>
      </div>

      {/* イラスト */}
      <div className="relative flex-shrink-0" style={{ height:`${illH}px` }}>
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

      {/* ATK・射程・HP */}
      {!isSpellMagic && (
        <div className="flex items-center justify-between flex-shrink-0"
          style={{ height:`${statsH}px`, padding:`0 ${3*scale}px`, borderBottom:bs }}>
          <span className="font-bold" style={{ fontSize:`${6*scale}px` }}>{card.atk > 0 ? card.atk : "－"}</span>
          <span style={{ fontSize:`${5*scale}px` }}>{rangeText(card)}</span>
          <span className="font-bold" style={{ fontSize:`${6*scale}px` }}>{card.hp}</span>
        </div>
      )}

      {/* tagsバッジ（枠なし） */}
      {hasTags && (
        <div className="flex flex-wrap flex-shrink-0"
          style={{ height:`${tagsH}px`, padding:`0 ${3*scale}px`, alignItems:"center", gap:`${scale}px` }}>
          {card.tags.map((t, i) => (
            <span key={i} style={{ fontSize:`${5*scale}px`, lineHeight:1.0 }}>({t})</span>
          ))}
        </div>
      )}

      {/* 効果テキスト（上詰め・行間小さめ） */}
      <div className="overflow-hidden" style={{ padding:`${1*scale}px ${3*scale}px`, flex:"1 1 0" }}>
        <span style={{ fontSize:`${4.8*scale}px`, lineHeight:1.15, display:"block" }}>
          {card.desc || ""}
        </span>
      </div>

      {extraBottom}
    </div>
  );
}

export function CardFace({ card, image }) {
  return <CardLayout card={card} image={image} w={CARD_W} h={CARD_H}/>;
}

export function UnitCell({ unit, pushed }) {
  const deg = unit.rotateDeg || 0;
  return (
    <div style={{
      width:`${CARD_W}px`, height:`${CARD_H}px`,
      transition:"transform 0.3s",
      transform: pushed ? "translateY(5px)" : "none",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <CardLayout
        card={{
          ...unit,
          cost: unit.originalCost ?? unit.cost,
          tags: unit.tags || [],
          desc: unit.desc || "",
        }}
        image={unit.image}
        w={CARD_W} h={CARD_H}
        rotateDeg={deg}
      />
    </div>
  );
}

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
  const bw = Math.max(0.5, scale * 1.5);
  const bs = `${bw}px solid black`;

  return (
    <div ref={ref} style={{ width:"100%" }}>
      {/* カード本体 */}
      <CardLayout card={card} image={image} w={w} h={h}/>
      {/* ＋－はカードの外・下に表示 */}
      {onInc && (
        <div className="flex items-center justify-between"
          style={{ padding:`${2*scale}px ${2*scale}px`, borderTop:"none" }}>
          <button onClick={onDec}
            className="border border-black font-bold flex items-center justify-center bg-white"
            style={{ width:`${16*scale}px`, height:`${16*scale}px`, fontSize:`${8*scale}px` }}>－</button>
          <span className="font-mono font-bold" style={{ fontSize:`${7*scale}px` }}>{count||0}</span>
          <button onClick={onInc}
            className="border border-black font-bold flex items-center justify-center bg-white"
            style={{ width:`${16*scale}px`, height:`${16*scale}px`, fontSize:`${8*scale}px` }}>＋</button>
        </div>
      )}
    </div>
  );
}
