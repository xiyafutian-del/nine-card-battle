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
  return <span style={{ fontSize:`${size}px`, lineHeight:1.1 }}>{text}</span>;
}

export function CardLayout({ card, image, extraBottom, dimmed=false, acted=false, w=CARD_W, h=CARD_H }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  const isCore = card.isCore || card.id === "core";

  const scale = w / CARD_W;
  const bw = Math.max(0.5, scale * 1.5);
  const bs = `${bw}px solid black`;
  const r  = `${3 * scale}px`;

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

  // コスト・名前エリアの高さ（0.7倍）
  const costW = Math.round(w * 0.30 * 0.7);
  const nameH = Math.round(w * 0.30 * 0.7);

  // イラストエリアの高さ
  const statsH = Math.round(h * 0.13);
  const tagsH  = (card.tags?.length > 0) ? Math.round(h * 0.10) : 0;
  const topH   = nameH;
  const illH   = Math.round(h * 0.36);
  const descH  = h - topH - illH - statsH - tagsH;

  return (
    <div className="relative flex flex-col bg-white overflow-hidden"
      style={{ width:`${w}px`, height:`${h}px`, border:bs, borderRadius:r, opacity:dimmed?0.45:1 }}>

      {/* コスト + 名前（0.7倍サイズ） */}
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

      {/* イラスト（上下線なし） */}
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
      {card.tags?.length > 0 && (
        <div className="flex flex-wrap flex-shrink-0"
          style={{ height:`${tagsH}px`, padding:`0 ${3*scale}px`, alignItems:"center", gap:`${1*scale}px` }}>
          {card.tags.map((t, i) => (
            <span key={i} style={{ fontSize:`${5*scale}px`, lineHeight:1.2 }}>({t})</span>
          ))}
        </div>
      )}

      {/* 効果テキスト */}
      <div className="flex-1 overflow-hidden" style={{ padding:`${1*scale}px ${3*scale}px` }}>
        <span className="leading-tight" style={{ fontSize:`${5*scale}px` }}>{card.desc || ""}</span>
      </div>

      {/* 追加UI（デッキ枚数カウンター）*/}
      {extraBottom}

      {acted && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <span className="text-white font-bold bg-black/50" style={{ fontSize:`${6*scale}px`, padding:`0 ${2*scale}px` }}>済</span>
        </div>
      )}
    </div>
  );
}

export function CardFace({ card, image }) {
  return <CardLayout card={card} image={image} w={CARD_W} h={CARD_H}/>;
}

export function UnitCell({ unit, pushed }) {
  return (
    <div style={{
      width:`${CARD_W}px`, height:`${CARD_H}px`,
      transition:"transform 0.15s",
      transform: pushed ? "translateY(5px)" : "none",
    }}>
      <CardLayout
        card={{
          ...unit,
          cost: unit.originalCost ?? unit.cost,
          tags: unit.tags || [],
          desc: unit.desc || "",
        }}
        image={unit.image}
        acted={unit.acted}
        w={CARD_W} h={CARD_H}
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
