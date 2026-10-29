import { CardFace } from './CardDesign.jsx';
import { TYPES } from '../constants/index.js';

const isTouch = typeof window !== "undefined"
  && ("ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0);

export function HandFan({
  hand, handCost, handDisabled, isGameOver, phase,
  cardImages, costOf,
  onDragStart, onDragEnd,
  onTouchDragStart, onTouchDragMove, onTouchDragEnd,
  selectedGrowth, onGrowthSelect,
}) {
  const inGrowthMode = !!selectedGrowth;
  const gEffect = selectedGrowth?.unit?.effect;
  const gAttrs = gEffect
    ? (Array.isArray(gEffect.filter?.attr) ? gEffect.filter.attr : [gEffect.filter?.attr])
    : [];
  const gMax = gEffect?.maxCost ?? 99;

  const n = hand.length;

  return (
    <div className="relative flex justify-center items-end flex-shrink-0"
      style={{ height: "100px", touchAction: "none" }}>
      {hand.map((card, i) => {
        const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
        const eff = costOf ? costOf(card) : card.cost;   // 軽減後のコスト
        const isGrowthTarget = inGrowthMode && gAttrs.includes(card.attr) && card.cost <= gMax;
        const phaseOk = isSpellMagic || phase === "summon";
        const affordable = !inGrowthMode && handCost >= eff && !handDisabled && !isGameOver && phaseOk;
        const usable = inGrowthMode ? isGrowthTarget : affordable;

        const offset = i - (n - 1) / 2;
        const rotate = offset * 7;
        const translateX = offset * 34;
        const translateY = Math.abs(offset) * 6;

        return (
          <div
            key={card._k || i}
            draggable={affordable && !isTouch}
            onClick={e => {
              e.stopPropagation();
              if (inGrowthMode && isGrowthTarget) onGrowthSelect(i);
            }}
            onDragStart={e => onDragStart(e, i, card)}
            onDragEnd={onDragEnd}
            onTouchStart={e => {
              if (!affordable) return;
              const t = e.touches[0];
              onTouchDragStart(i, card, t.clientX, t.clientY);
            }}
            onTouchMove={e => {
              const t = e.touches[0];
              onTouchDragMove(t.clientX, t.clientY);
            }}
            onTouchEnd={e => {
              const t = e.changedTouches[0];
              onTouchDragEnd(t.clientX, t.clientY);
            }}
            onTouchCancel={() => onTouchDragEnd(null, null)}
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
              <CardFace
                card={{ ...card, cost: eff }}
                image={cardImages?.[card.id] || card.image}
                skin={card.skin || null}
              />
            </div>
          </div>
        );
      })}
      {n === 0 && <div className="text-xs text-gray-400 self-center">手札なし</div>}
    </div>
  );
}
