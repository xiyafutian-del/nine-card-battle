import { useRef } from 'react';
import { CardFace } from './CardParts.jsx';
import { TYPES } from '../constants/index.js';

export function HandFan({
  hand, handCost, handDisabled, isGameOver,
  cardImages, onSummon, onSpellActivate,
  draggingCard, onDragStart, onDragEnd,
}) {
  const swipeRef = useRef({ startX:0, startY:0, idx:null, dragging:false, card:null });
  const boardRef = useRef(null);

  function handTouchStart(e, i, card, affordable) {
    if (!affordable) return;
    const t = e.touches[0];
    swipeRef.current = { startX:t.clientX, startY:t.clientY, idx:i, dragging:false, card };
  }

  function handTouchMove(e) {
    const s = swipeRef.current;
    if (s.idx == null) return;
    e.preventDefault();
    const t = e.touches[0];
    const dy = s.startY - t.clientY;
    const dx = Math.abs(s.startX - t.clientX);
    if (dy > 12 || dx > 12) s.dragging = true;
  }

  function handTouchEnd(e) {
    const s = swipeRef.current;
    if (s.idx == null) { return; }
    if (s.dragging) {
      const t = e.changedTouches[0];
      // Board の位置を取得して col/row を計算
      const boardEl = document.getElementById('battle-board');
      if (boardEl) {
        const rect = boardEl.getBoundingClientRect();
        if (t.clientX >= rect.left && t.clientX <= rect.right &&
            t.clientY >= rect.top  && t.clientY <= rect.bottom) {
          const col = Math.min(2, Math.max(0, Math.floor((t.clientX - rect.left) / (rect.width / 3))));
          const row = Math.min(5, Math.max(0, Math.floor((t.clientY - rect.top)  / (rect.height / 6))));
          onSummon(s.idx, row, col);
        }
      }
    }
    swipeRef.current = { startX:0, startY:0, idx:null, dragging:false, card:null };
  }

  const n = hand.length;

  return (
    <div
      className="relative flex justify-center items-end flex-shrink-0"
      style={{height:"100px", touchAction:"none"}}
    >
      {hand.map((card, i) => {
        const affordable = handCost >= card.cost && !handDisabled && !isGameOver;
        const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
        const mid = (n - 1) / 2;
        const offset = i - mid;
        const rotate = offset * 7;
        const translateX = offset * 34;
        const translateY = Math.abs(offset) * 6;

        return (
          <div
            key={card._k || i}
            draggable={affordable && !isSpellMagic}
            onClick={() => {
              if (!affordable) return;
              if (isSpellMagic) onSpellActivate(i);
            }}
            onDragStart={e => onDragStart(e, i, card)}
            onDragEnd={onDragEnd}
            onTouchStart={e => {
              if (isSpellMagic) return;
              handTouchStart(e, i, card, affordable);
            }}
            onTouchMove={handTouchMove}
            onTouchEnd={handTouchEnd}
            className={`absolute bottom-0 ${affordable ? "cursor-grab active:cursor-grabbing" : ""}`}
            style={{
              width:"59px", height:"86px",
              transform:`translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${affordable ? 1 : 0.92})`,
              transformOrigin:"bottom center",
              zIndex: i,
              transition:"transform 0.18s ease-out",
              touchAction:"none",
              opacity: affordable ? 1 : 0.45,
            }}
          >
            <div className={`w-full h-full rounded-md ${affordable ? "ring-2 ring-black shadow-lg" : "ring-1 ring-gray-300"}`}>
              <CardFace card={card} image={cardImages[card.id] || card.image}/>
            </div>
          </div>
        );
      })}
      {n === 0 && <div className="text-xs text-gray-400 self-center">手札なし</div>}
    </div>
  );
}