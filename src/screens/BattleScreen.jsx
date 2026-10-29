import { useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { Board } from '../components/Board.jsx';
import { HandFan } from '../components/HandFan.jsx';
import { CardFace } from '../components/CardDesign.jsx';
import { rowToCoord } from '../engine/battle.js';
import { getEffectiveCost } from '../engine/effects.js';
import { GENERATOR_INFO } from '../constants/index.js';

const PHASE_LABEL = { summon: "召喚", action: "行動" };
const isSpellCard = c => c.type === "spell" || c.type === "magic";

export function BattleScreen({
  battle, confirmLeave,
  onRequestBack, onLeaveToLobby, onEndTurn, onNextPhase, onAbility,
  onCellClick, onSummon, onSetConfirmLeave, onGrowthSelect,
  cardImages, pvpRole,
}) {
  const { board, active, mode, gameOver, turn, firstPlayer,
          selectedUnit, selectedSpell, selectedGrowth, selectedAbility } = battle;
  const phase = battle.phase === "action" ? "action" : "summon";
  const isPvp = mode === "pvp";
  const myColor = pvpRole === "guest" ? "red" : "blue";
  const isGameOver = gameOver !== null && gameOver !== undefined;
  const turn1block = turn === 1 && active === firstPlayer;

  const viewSide = isPvp ? myColor : mode === "solo" ? active : "blue";
  const myHand  = viewSide === "blue" ? battle.playerHand : battle.aiHand;
  const myCost  = viewSide === "blue" ? battle.playerCost : battle.aiCost;
  const myGrave = (viewSide === "blue" ? battle.playerGrave : battle.aiGrave) || [];
  const oppHand = viewSide === "blue" ? battle.aiHand : battle.playerHand;
  const oppCost = viewSide === "blue" ? battle.aiCost : battle.playerCost;
  const gen = viewSide === "blue" ? battle.playerGenerator : battle.aiGenerator;
  const genInfo = GENERATOR_INFO[gen] || GENERATOR_INFO.water;

  // コスト軽減後の実コスト
  const costOf = card => getEffectiveCost(card, viewSide, board, myGrave);

  const handDisabled = (mode === "pve" && active === "red") || (isPvp && active !== myColor);

  const selUnit = selectedUnit ? board[active]?.[selectedUnit.col]?.[selectedUnit.idx] : null;
  const canAbility = !handDisabled && selUnit?.effect?.trigger === "activate" && selUnit?.effect?.action === "swap_self";

  const [draggingCard, setDraggingCard] = useState(null);
  const [dropPreview, setDropPreview] = useState(null);
  const [ghost, setGhost] = useState(null);
  const dragRef = useRef(null);
  const touchRef = useRef(null);

  // ドロップ先のプレビュー（HTML5ドラッグ・タッチ共通）
  function computePreview(card, row, col) {
    if (isSpellCard(card) || phase !== "summon") { setDropPreview(null); return; }
    const { side, idx } = rowToCoord(row);
    const len = board[active][col].length;
    if (side !== active || myCost < costOf(card) || len >= 3) { setDropPreview(null); return; }
    setDropPreview({ col, insertIdx: card.type === "facility" ? Math.min(idx, len) : len });
  }

  // ----- HTML5ドラッグ（PC） -----
  function handleDragStart(e, index, card) {
    setDraggingCard({ index, card });
    dragRef.current = { index, card };
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragEnd() {
    setDraggingCard(null); setDropPreview(null); dragRef.current = null;
  }
  function handleDragOver(e, row, col) {
    e.preventDefault();
    if (dragRef.current) computePreview(dragRef.current.card, row, col);
  }
  function handleDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDropPreview(null);
  }
  function handleDrop(e, row, col) {
    e.preventDefault();
    e.stopPropagation();
    setDropPreview(null);
    const dc = dragRef.current;
    if (!dc) return;
    onSummon(dc.index, row, col);
    setDraggingCard(null); dragRef.current = null;
  }
  // 盤面の余白に落とした場合: 魔法のみ使用
  function handleDropBoard(e) {
    e.preventDefault();
    const dc = dragRef.current;
    setDropPreview(null);
    if (dc && isSpellCard(dc.card)) onSummon(dc.index, -1, -1);
    setDraggingCard(null); dragRef.current = null;
  }

  // ----- タッチドラッグ（スマホ）: カードが指に追従 -----
  const cellAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('[data-cell]');
    return el ? { row: Number(el.dataset.row), col: Number(el.dataset.col) } : null;
  };
  const inBoard = (x, y) => {
    const r = document.getElementById('battle-board')?.getBoundingClientRect();
    return !!r && x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8;
  };

  function onTouchDragStart(i, card, x, y) {
    touchRef.current = { i, card, sx: x, sy: y, active: false };
  }
  function onTouchDragMove(x, y) {
    const t = touchRef.current;
    if (!t) return;
    if (!t.active) {
      if (Math.hypot(x - t.sx, y - t.sy) < 10) return;
      t.active = true;
      setDraggingCard({ index: t.i, card: t.card });
    }
    setGhost({ x, y, card: t.card });
    const c = cellAt(x, y);
    if (c) computePreview(t.card, c.row, c.col); else setDropPreview(null);
  }
  function onTouchDragEnd(x, y) {
    const t = touchRef.current;
    touchRef.current = null;
    setGhost(null); setDraggingCard(null); setDropPreview(null);
    if (!t || !t.active || x == null) return;   // タップ・キャンセルは何もしない
    const c = cellAt(x, y);
    if (c) onSummon(t.i, c.row, c.col);
    else if (isSpellCard(t.card) && inBoard(x, y)) onSummon(t.i, -1, -1);
  }

  const cancelIfBackground = e => { if (e.target === e.currentTarget) onCellClick(-1, -1); };

  let resultText = null;
  if (isGameOver) {
    if (gameOver === "draw") resultText = "🤝 引き分け";
    else if (isPvp) resultText = gameOver === myColor ? "🎉 勝利！" : "💀 敗北…";
    else if (mode === "pve") resultText = gameOver === "blue" ? "🎉 勝利！" : "💀 敗北…";
    else resultText = gameOver === "blue" ? "🔵側の勝利！" : "🔴側の勝利！";
  }

  let guideText = "";
  if (isGameOver) guideText = "";
  else if (handDisabled) guideText = "相手のターン…";
  else if (selectedAbility) guideText = "入れ替える壁をタップ";
  else if (selectedSpell) guideText = `${selectedSpell.card.name}: 対象をタップ`;
  else if (selectedGrowth) guideText = "成長で出す手札のカードをタップ";
  else if (draggingCard) guideText = isSpellCard(draggingCard.card) ? "盤面で離すと使用 / 外で離すとキャンセル" : "＋マスへドロップ（ユニットは最後尾）";
  else if (phase === "summon") guideText = "";
  else if (turn1block) guideText = "先行1T目は移動・攻撃不可";
  else if (selectedUnit) guideText = "緑=移動先 / 橙=攻撃先 / 他タップでキャンセル";
  else guideText = "行動するユニットをタップ";

  const turnLabel = isPvp
    ? (active === myColor ? "あなたの番" : "相手の番")
    : mode === "solo" ? (active === "blue" ? "🔵の番" : "🔴の番")
    : (active === "blue" ? "あなたの番" : "相手の番");

  return (
    <div className="h-screen bg-white text-black px-2 py-2 flex flex-col select-none overflow-hidden"
      onClick={cancelIfBackground}>
      <div className="max-w-sm w-full mx-auto flex-1 flex flex-col relative min-h-0"
        onClick={cancelIfBackground}>

        {confirmLeave && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-white border border-black p-4 w-64 text-center">
              <div className="text-sm font-bold mb-3">対戦を中断してロビーへ戻りますか？</div>
              <div className="flex gap-2">
                <button onClick={onLeaveToLobby} className="flex-1 bg-black text-white font-bold py-2 text-sm">戻る</button>
                <button onClick={() => onSetConfirmLeave(false)} className="flex-1 bg-white border border-black font-bold py-2 text-sm">続ける</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-1 px-1 flex-shrink-0">
          <button onClick={onRequestBack} className="text-black text-xs border border-black px-2 py-1">← ロビー</button>
          <div className="text-xs font-bold">TURN {turn}/25</div>
          <div className="text-xs font-bold">{turnLabel}</div>
        </div>

        <div className="flex items-center justify-between text-xs mb-1 px-1 flex-shrink-0">
          <span className="font-bold">相手</span>
          <span className="flex items-center gap-1 font-mono"><Zap size={11}/>{oppCost}</span>
          <span className="text-gray-500">手{oppHand.length}</span>
        </div>

        {/* 盤面（余白に落とした魔法も受け付ける） */}
        <div id="battle-board" className="relative" onClick={cancelIfBackground}
          onDragOver={e => e.preventDefault()} onDrop={handleDropBoard}>
          <Board
            board={board} active={active} phase={phase}
            selectedUnit={selectedUnit} selectedSpell={selectedSpell}
            selectedGrowth={selectedGrowth} selectedAbility={selectedAbility}
            gameOver={isGameOver ? gameOver : null}
            mode={mode} turn={turn} firstPlayer={firstPlayer}
            draggingCard={draggingCard} dropPreview={dropPreview}
            playerGrave={battle.playerGrave} aiGrave={battle.aiGrave}
            playerDeck={battle.playerDeck.length} aiDeck={battle.aiDeck.length}
            onCellClick={onCellClick}
            onDragOver={handleDragOver} onDrop={handleDrop} onDragLeave={handleDragLeave}
            flipped={pvpRole === "guest"}
          />
        </div>

        {/* ガイド + 能力 + フェーズ進行 */}
        <div className="flex items-center gap-2 px-1 my-1 flex-shrink-0 min-h-8">
          {isGameOver ? (
            <div className="flex-1 text-center">
              <div className="text-black font-bold text-lg">{resultText}</div>
              <button onClick={onLeaveToLobby} className="mt-1 bg-white border border-black text-black font-bold px-6 py-1 text-sm">ロビーへ戻る</button>
            </div>
          ) : (
            <>
              <div className="flex-1 text-xs text-gray-600 text-center">{guideText}</div>
              {canAbility && (
                <button type="button"
                  onClick={e => { e.stopPropagation(); onAbility(); }}
                  className="bg-black text-white font-bold px-3 py-1 text-xs flex-shrink-0">
                  入替
                </button>
              )}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); (phase === "action" ? onEndTurn : onNextPhase)(); }}
                disabled={handDisabled}
                className="bg-white border border-black font-bold px-3 py-1 text-xs disabled:opacity-40 flex-shrink-0">
                {phase === "summon" ? "行動へ" : "ターン終了"}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 px-1 flex-shrink-0 mb-1">
          <span className="font-bold text-xs">あなた</span>
          <span className="flex items-center gap-1 font-mono text-xs">
            <Zap size={10}/>{myCost}
            <span className="text-gray-400 font-normal" style={{ fontSize: "0.6rem" }}>({genInfo.name})</span>
          </span>
          <span className="flex-1 text-center text-xs font-bold">
            {!isGameOver && `${PHASE_LABEL[phase]}フェーズ`}
          </span>
          <span className="text-gray-400 text-xs">手{myHand.length}</span>
        </div>

        <HandFan
          hand={myHand} handCost={myCost} handDisabled={handDisabled}
          isGameOver={isGameOver} cardImages={cardImages} phase={phase}
          costOf={costOf}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}
          onTouchDragStart={onTouchDragStart}
          onTouchDragMove={onTouchDragMove}
          onTouchDragEnd={onTouchDragEnd}
          selectedGrowth={selectedGrowth} onGrowthSelect={onGrowthSelect}
        />

        <div className="mt-1 bg-gray-50 border border-black p-1.5 text-xs text-gray-700 overflow-y-auto flex-shrink-0" style={{ maxHeight: "2.6rem" }}>
          {[...battle.log].reverse().slice(0, 4).map((l, i) => (
            <div key={i} className={i === 0 ? "text-black font-bold" : "text-gray-500"}>・{l}</div>
          ))}
        </div>
      </div>

      {/* ドラッグ中に指へ追従するカード */}
      {ghost && (
        <div className="fixed pointer-events-none z-[70]"
          style={{ left: ghost.x - 30, top: ghost.y - 100, width: 59, height: 86, opacity: 0.9 }}>
          <CardFace
            card={{ ...ghost.card, cost: costOf(ghost.card) }}
            image={cardImages?.[ghost.card.id] || ghost.card.image}
            skin={ghost.card.skin || null}
          />
        </div>
      )}
    </div>
  );
            }
