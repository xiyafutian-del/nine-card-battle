import { useRef } from 'react';
import { CardFace } from './CardDesign.jsx';
import { TYPES } from '../constants/index.js';

export function HandFan({
  hand, handCost, handDisabled, isGameOver, phase,
  cardImages, onSummon, onSpellActivate,
  onDragStart, onDragEnd,
  selectedGrowth, onGrowthSelect,
}) {
  const swipeRef = useRef({ startX: 0, startY: 0, idx: null, dragging: false });

  // 成長選択中の条件
  const inGrowthMode = !!selectedGrowth;
  const gEffect = selectedGrowth?.unit?.effect;
  const gAttrs = gEffect
    ? (Array.isArray(gEffect.filter?.attr) ? gEffect.filter.attr : [gEffect.filter?.attr])
    : [];
  const gMax = gEffect?.maxCost ?? 99;

  function handTouchStart(e, i) {
    const t = e.touches[0];
    swipeRef.current = { startX: t.clientX, startY: t.clientY, idx: i, dragging: false };
  }
  function handTouchMove(e) {
    const s = swipeRef.current;
    if (s.idx == null) return;
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0];
    if (Math.abs(s.startY - t.clientY) > 12 || Math.abs(s.startX - t.clientX) > 12) s.dragging = true;
  }
  function handTouchEnd(e) {
    const s = swipeRef.current;
    if (s.idx == null) return;
    if (s.dragging) {
      const t = e.changedTouches[0];
      // 指を離した位置のマスを取得（反転盤面でも論理行・列が取れる）
      const cell = document.elementFromPoint(t.clientX, t.clientY)?.closest?.('[data-cell]');
      if (cell) onSummon(s.idx, Number(cell.dataset.row), Number(cell.dataset.col));
    }
    swipeRef.current = { startX: 0, startY: 0, idx: null, dragging: false };
  }

  const n = hand.length;

  return (
    <div className="relative flex justify-center items-end flex-shrink-0"
      style={{ height: "100px", touchAction: "none" }}>
      {hand.map((card, i) => {
        const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
        const isGrowthTarget = inGrowthMode && gAttrs.includes(card.attr) && card.cost <= gMax;
        // スペル・魔法はいつでも、ユニット・施設は召喚フェーズのみ
        const phaseOk = isSpellMagic || phase === "summon";
        const affordable = !inGrowthMode && handCost >= card.cost && !handDisabled && !isGameOver && phaseOk;
        const usable = inGrowthMode ? isGrowthTarget : affordable;

        const offset = i - (n - 1) / 2;
        const rotate = offset * 7;
        const translateX = offset * 34;
        const translateY = Math.abs(offset) * 6;

        return (
          <div
            key={card._k || i}
            draggable={affordable && !isSpellMagic}
            onClick={e => {
              e.stopPropagation();
              if (inGrowthMode) { if (isGrowthTarget) onGrowthSelect(i); return; }
              if (affordable && isSpellMagic) onSpellActivate(i);
            }}
            onDragStart={e => onDragStart(e, i, card)}
            onDragEnd={onDragEnd}
            onTouchStart={e => { if (affordable && !isSpellMagic) handTouchStart(e, i); }}
            onTouchMove={handTouchMove}
            onTouchEnd={handTouchEnd}
            className={`absolute bottom-0 ${usable ? "cursor-grab active:cursor-grabbing" : ""}`}
            style={{
              width: "59px", height: "86px",
              transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${usable ? 1 : 0.92})`,
              transformOrigin: "bottom center",
              zIndex: i,
              transition: "transform 0.18s ease-out",
              touchAction: "none",
              opacity: usable ? 1 : 0.45,
            }}
          >
            <div className={`w-full h-full rounded-md ${usable ? "ring-2 ring-black shadow-lg" : "ring-1 ring-gray-300"}`}>
              <CardFace card={card} image={cardImages?.[card.id] || card.image} skin={card.skin || null}/>
            </div>
          </div>
        );
      })}
      {n === 0 && <div className="text-xs text-gray-400 self-center">手札なし</div>}
    </div>
  );
}
