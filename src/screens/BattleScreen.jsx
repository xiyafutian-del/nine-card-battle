import { useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { Board } from '../components/Board.jsx';
import { HandFan } from '../components/HandFan.jsx';
import { rowToCoord } from '../engine/battle.js';
import { GENERATOR_INFO } from '../constants/index.js';

const PHASES = [["summon", "召喚"], ["move", "移動"], ["attack", "攻撃"]];

export function BattleScreen({
  battle, confirmLeave,
  onRequestBack, onLeaveToLobby, onEndTurn, onNextPhase,
  onCellClick, onSummon, onSetConfirmLeave, onGrowthSelect,
  cardImages, pvpRole,
}) {
  const { board, active, mode, gameOver, turn, firstPlayer, selectedUnit, selectedSpell, selectedGrowth } = battle;
  const phase = battle.phase || "summon";
  const isPvp = mode === "pvp";
  const myColor = pvpRole === "guest" ? "red" : "blue";
  const isGameOver = gameOver !== null && gameOver !== undefined;
  const turn1block = turn === 1 && active === firstPlayer;

  // 自分視点のサイド
  const viewSide = isPvp ? myColor : mode === "solo" ? active : "blue";
  const myHand  = viewSide === "blue" ? battle.playerHand : battle.aiHand;
  const myCost  = viewSide === "blue" ? battle.playerCost : battle.aiCost;
  const oppHand = viewSide === "blue" ? battle.aiHand : battle.playerHand;
  const oppCost = viewSide === "blue" ? battle.aiCost : battle.playerCost;
  const gen = viewSide === "blue" ? battle.playerGenerator : battle.aiGenerator;
  const genInfo = GENERATOR_INFO[gen] || GENERATOR_INFO.water;

  const handDisabled = (mode === "pve" && active === "red") || (isPvp && active !== myColor);

  const [draggingCard, setDraggingCard] = useState(null);
  const [dropPreview, setDropPreview] = useState(null);
  const dragRef = useRef(null);

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
    const dc = dragRef.current;
    if (!dc || phase !== "summon") { setDropPreview(null); return; }
    const { side, idx } = rowToCoord(row);
    if (side !== active || myCost < dc.card.cost) { setDropPreview(null); return; }
    const len = board[active][col].length;
    if (len >= 3) { setDropPreview(null); return; }
    // ユニットは最後尾、施設は指定位置
    setDropPreview({ col, insertIdx: dc.card.type === "facility" ? Math.min(idx, len) : len });
  }
  function handleDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDropPreview(null);
  }
  function handleDrop(e, row, col) {
    e.preventDefault();
    setDropPreview(null);
    const dc = dragRef.current;
    if (!dc) return;
    onSummon(dc.index, row, col);
    setDraggingCard(null); dragRef.current = null;
  }

  function handleSpellActivate(handIndex) {
    const card = myHand[handIndex];
    if (!card) return;
    if (!card.targetType || card.targetType === "none") onSummon(handIndex, -1, -1);
    else onCellClick(-1, -1, { spell: true, handIndex, card });
  }

  // 盤面外（背景）タップで選択キャンセル
  const cancelIfBackground = e => { if (e.target === e.currentTarget) onCellClick(-1, -1); };

  let resultText = null;
  if (isGameOver) {
    if (gameOver === "draw") resultText = "🤝 引き分け";
    else if (isPvp) resultText = gameOver === myColor ? "🎉 勝利！" : "💀 敗北…";
    else if (mode === "pve") resultText = gameOver === "blue" ? "🎉 勝利！" : "💀 敗北…";
    else resultText = gameOver === "blue" ? "🔵側の勝利！" : "🔴側の勝利！";
  }

  let guideText;
  if (isGameOver) guideText = "";
  else if (handDisabled) guideText = "相手のターン…";
  else if (selectedSpell) guideText = `${selectedSpell.card.name}: 対象をタップ`;
  else if (selectedGrowth) guideText = "成長で出す手札のカードをタップ";
  else if (draggingCard) guideText = "＋マスへドロップ（ユニットは最後尾）";
  else if (phase === "summon") guideText = "ドラッグで召喚 / 成長施設タップ / 魔法はタップ";
  else if (turn1block) guideText = "先行1T目は移動・攻撃不可";
  else if (selectedUnit) guideText = phase === "move" ? "緑=移動先 / 他タップでキャンセル" : "橙=攻撃先 / 他タップでキャンセル";
  else guideText = phase === "move" ? "動かすユニットをタップ" : "攻撃するユニットをタップ";

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

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-1 px-1 flex-shrink-0">
          <button onClick={onRequestBack} className="text-black text-xs border border-black px-2 py-1">← ロビー</button>
          <div className="text-xs font-bold">TURN {turn}/25</div>
          <div className="text-xs font-bold">{turnLabel}</div>
        </div>

        {/* 相手情報 */}
        <div className="flex items-center justify-between text-xs mb-1 px-1 flex-shrink-0">
          <span className="font-bold">相手</span>
          <span className="flex items-center gap-1 font-mono"><Zap size={11}/>{oppCost}</span>
          <span className="text-gray-500">手{oppHand.length}</span>
        </div>

        {/* 盤面 */}
        <div id="battle-board" className="relative" onClick={cancelIfBackground}>
          <Board
            board={board} active={active} phase={phase}
            selectedUnit={selectedUnit} selectedSpell={selectedSpell} selectedGrowth={selectedGrowth}
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

        {/* フェーズ表示 */}
        {!isGameOver && (
          <div className="flex gap-1 px-1 mt-1 flex-shrink-0">
            {PHASES.map(([k, label]) => (
              <div key={k}
                className={`flex-1 text-center text-xs py-0.5 border ${phase === k ? "border-black bg-black text-white font-bold" : "border-gray-300 text-gray-400"}`}>
                {label}
              </div>
            ))}
          </div>
        )}

        {/* ガイド + フェーズ進行 */}
        <div className="flex items-center gap-2 px-1 my-1 flex-shrink-0 min-h-8">
          {isGameOver ? (
            <div className="flex-1 text-center">
              <div className="text-black font-bold text-lg">{resultText}</div>
              <button onClick={onLeaveToLobby} className="mt-1 bg-white border border-black text-black font-bold px-6 py-1 text-sm">ロビーへ戻る</button>
            </div>
          ) : (
            <>
              <div className="flex-1 text-xs text-gray-600 text-center">{guideText}</div>
              <button
                onClick={phase === "attack" ? onEndTurn : onNextPhase}
                disabled={handDisabled}
                className="bg-white border border-black font-bold px-3 py-1 text-xs disabled:opacity-40 flex-shrink-0">
                {phase === "summon" ? "移動へ" : phase === "move" ? "攻撃へ" : "ターン終了"}
              </button>
            </>
          )}
        </div>

        {/* 自分情報 */}
        <div className="flex items-center gap-2 px-1 flex-shrink-0 mb-1">
          <span className="font-bold text-xs">あなた</span>
          <span className="flex items-center gap-1 font-mono text-xs">
            <Zap size={10}/>{myCost}
            <span className="text-gray-400 font-normal" style={{ fontSize: "0.6rem" }}>({genInfo.name})</span>
          </span>
          <span className="text-gray-400 text-xs ml-auto">手{myHand.length}</span>
        </div>

        {/* 手札 */}
        <HandFan
          hand={myHand} handCost={myCost} handDisabled={handDisabled}
          isGameOver={isGameOver} cardImages={cardImages} phase={phase}
          onSummon={onSummon} onSpellActivate={handleSpellActivate}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}
          selectedGrowth={selectedGrowth} onGrowthSelect={onGrowthSelect}
        />

        {/* ログ */}
        <div className="mt-1 bg-gray-50 border border-black p-1.5 text-xs text-gray-700 overflow-y-auto flex-shrink-0" style={{ maxHeight: "2.6rem" }}>
          {[...battle.log].reverse().slice(0, 4).map((l, i) => (
            <div key={i} className={i === 0 ? "text-black font-bold" : "text-gray-500"}>・{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
