import { ATTR_LABELS, TYPES } from '../constants/index.js';
import { useRef, useEffect, useState } from 'react';
import { SkinFrame } from './SkinFrame.jsx';
import { useZoomPress } from './zoomContext.js';

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

export function CardLayout({
  card, image, extraBottom,
  dimmed=false, w=CARD_W, h=CARD_H,
  rotateDeg=0, skin=null, zoom=true,
}) {
  // 長押しで拡大表示（拡大表示側のカードでは無効）
  const press = useZoomPress(() => ({ card, image, skin }));
  const pp = zoom ? press : {};
  const noSelect = { WebkitTouchCallout: "none", userSelect: "none" };

  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  const isCore = card.isCore || card.id === "core";

  const scale = w / CARD_W;
  const bw = Math.max(0.5, scale * 1.5);
  const bs = `${bw}px solid black`;
  const r  = `${3 * scale}px`;

  // 黒枠は子要素を覆う別レイヤーとして描く（フレームスキンと同じ外形にぴったり重ねるため）
  const borderLayer = (
    <div style={{
      position: "absolute", left: 0, top: 0, right: 0, bottom: 0,
      boxSizing: "border-box", border: bs, borderRadius: r,
      pointerEvents: "none", zIndex: 9,
    }}/>
  );
  const rootStyle = {
    width: `${w}px`, height: `${h}px`, borderRadius: r,
    opacity: dimmed ? 0.45 : 1,
    transform: `rotate(${rotateDeg}deg)`, transformOrigin: "center center",
    ...noSelect,
  };
  // 帯の太さ = 黒枠 + 内側に1.5pt（カードの大きさに比例）
  const band = bw + 1.5 * scale;

  if (isCore) {
    return (
      <div {...pp} className="relative" style={rootStyle}>
        <div className="flex flex-col bg-white overflow-hidden"
          style={{ width: "100%", height: "100%", borderRadius: r }}>
          <div className="flex items-center justify-center flex-shrink-0"
            style={{ height: "30%", borderBottom: bs }}>
            <span className="font-bold" style={{ fontSize: `${7*scale}px` }}>コア</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span className="font-bold" style={{ fontSize: `${18*scale}px` }}>{card.hp}</span>
          </div>
        </div>
        {borderLayer}
        {skin && <SkinFrame skin={skin} w={w} h={h} band={band} radius={3 * scale}/>}
      </div>
    );
  }

  const costW  = Math.round(w * 0.30 * 0.7);
  const nameH  = Math.round(w * 0.30 * 0.7);
  const illH   = Math.round(h * 0.36);
  const statsH = Math.round(h * 0.13);
  const hasTags = card.tags?.length > 0;
  const tagsH  = hasTags ? Math.round(h * 0.10) : 0;

  return (
    <div {...pp} className="relative" style={rootStyle}>
      <div className="flex flex-col bg-white overflow-hidden"
        style={{ width: "100%", height: "100%", borderRadius: r }}>

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
          ? <img src={image} alt={card.name} draggable={false} className="absolute inset-0 w-full h-full object-cover"/>
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

      {/* タグ */}
      {hasTags && (
        <div className="flex flex-wrap flex-shrink-0"
          style={{ height:`${tagsH}px`, padding:`0 ${3*scale}px`, alignItems:"center", gap:`${scale}px` }}>
          {card.tags.map((t, i) => (
            <span key={i} style={{ fontSize:`${5*scale}px`, lineHeight:1.0 }}>({t})</span>
          ))}
        </div>
      )}

      {/* 効果テキスト */}
      <div className="overflow-hidden" style={{ padding:`${1*scale}px ${3*scale}px`, flex:"1 1 0" }}>
        <span style={{ fontSize:`${4.8*scale}px`, lineHeight:1.15, display:"block" }}>
          {card.desc || ""}
        </span>
      </div>

        {extraBottom}
      </div>

      {borderLayer}

      {/* フレームスキン */}
      {skin && <SkinFrame skin={skin} w={w} h={h} band={band} radius={3 * scale}/>}
    </div>
  );
}

// 手札（59×86固定）
export function CardFace({ card, image, skin=null }) {
  return <CardLayout card={card} image={image} skin={skin} w={CARD_W} h={CARD_H}/>;
}

// 場のカード（59×86固定）
export function UnitCell({ unit, pushed }) {
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
        skin={unit.skin || null}
        w={CARD_W} h={CARD_H}
        rotateDeg={unit.rotateDeg || 0}
      />
    </div>
  );
}

// デッキ・図鑑（親の幅に合わせて表示）
export function CardGrid({ card, image, count, onInc, onDec, skin=null }) {
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

  return (
    <div ref={ref} style={{ width:"100%" }}>
      <CardLayout card={card} image={image} skin={skin} w={w} h={h}/>
      {onInc && (
        <div className="flex items-center justify-between"
          style={{ padding:`${2*scale}px` }}>
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
