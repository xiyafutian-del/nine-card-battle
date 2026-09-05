import { useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import { Board } from '../components/Board.jsx';
import { HandFan } from '../components/HandFan.jsx';
import { rowToCoord } from '../engine/battle.js';
import { GENERATOR_INFO } from '../constants/index.js';

export function BattleScreen({
  battle, confirmLeave,
  onRequestBack, onLeaveToLobby, onEndTurn,
  onCellClick, onSummon, onSetConfirmLeave,
  cardImages,
}) {
  const { board, active, mode, gameOver, turn, firstPlayer, selectedUnit, selectedSpell } = battle;
  const enem = active === "blue" ? "red" : "blue";
  const handArr = mode === "solo" ? (active === "blue" ? battle.playerHand : battle.aiHand) : battle.playerHand;
  const handCost = active === "blue" ? battle.playerCost : battle.aiCost;
  const handDisabled = mode === "pve" && active === "red";
  const turn1block = turn === 1 && active === firstPlayer;
  const isGameOver = gameOver !== null && gameOver !== undefined;
  const gen = active === "blue" ? battle.playerGenerator : battle.aiGenerator;
  const genInfo = GENERATOR_INFO[gen] || GENERATOR_INFO.water;

  // ドラッグ状態
  const [draggingCard, setDraggingCard] = useState(null);
  const [dropPreview, setDropPreview] = useState(null);
  const dragRef = useRef(null);

  function handleDragStart(e, index, card) {
    setDraggingCard({ index, card });
    dragRef.current = { index, card };
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragEnd() {
    setDraggingCard(null);
    setDropPreview(null);
    dragRef.current = null;
  }
  function handleDragOver(e, row, col) {
    e.preventDefault();
    if (!dragRef.current) return;
    const { side, idx } = rowToCoord(row);
    if (side !== active) { setDropPreview(null); return; }
    const cost = active === "blue" ? battle.playerCost : battle.aiCost;
    if (cost < dragRef.current.card.cost) { setDropPreview(null); return; }
    if (battle.board[active][col].length >= 3) { setDropPreview(null); return; }
    setDropPreview({ col, insertIdx: idx });
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
    setDraggingCard(null);
    dragRef.current = null;
  }

  function handleSpellActivate(handIndex) {
    const card = handArr[handIndex];
    if (!card) return;
    if (!card.targetType || card.targetType === "none") {
      onSummon(handIndex, -1, -1);
    } else {
      onCellClick(-1, -1, { spell: true, handIndex, card });
    }
  }

  let resultText = null;
  if (isGameOver) {
    if (gameOver === "draw") resultText = "🤝 引き分け";
    else if (mode === "pve") resultText = gameOver === "blue" ? " 勝利！" : "💀 敗北…";
    else resultText = gameOver === "blue" ? "🔵側の勝利！" : "🔴側の勝利！";
  }

  let guideText = "";
  if (isGameOver) guideText = "";
  else if (mode === "pve" && active === "red") guideText = "相手の行動中…";
  else if (selectedSpell) guideText = selectedSpell.card.name + ": 対象を盤面からタップ";
  else if (draggingCard) guideText = dropPreview ? "割り込み召喚（押し出しプレビュー）" : "光っているマスへドロップ";
  else if (selectedUnit) guideText = turn1block ? "先行1T目は行動不可" : "橙=攻撃 / 緑=移動 / 他タップでキャンセル";
  else if (turn1block) guideText = "先行1T目は攻撃・移動不可";
  else guideText = "スワイプ/ドラッグで召喚 / スペルはタップ / ユニットタップで行動";

  return (
    <div className="h-screen bg-white text-black px-2 py-2 flex flex-col select-none overflow-hidden">
      <div className="max-w-sm w-full mx-auto flex-1 flex flex-col relative min-h-0">

        {/* 離脱確認モーダル */}
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
          <div className="text-xs font-bold tracking-widest text-black">TURN {turn}/25</div>
          <div className="text-xs font-bold">
            {mode === "solo"
              ? <span className={active === "blue" ? "text-blue-600" : "text-red-600"}>{active === "blue" ? "🔵の番" : "🔴の番"}</span>
              : <span className={active === "blue" ? "text-blue-600" : "text-red-600"}>{active === "blue" ? "あなたの番" : "相手の番"}</span>
            }
          </div>
        </div>

        {/* 相手情報 */}
        <div className="flex items-center justify-between text-xs mb-1 px-1 flex-shrink-0">
          <span className="font-bold">{mode === "pve" ? "相手" : "🔴"}</span>
          <span className="flex items-center gap-1 font-mono"><Zap size={11}/>{battle.aiCost}</span>
          <span className="text-gray-500">手{battle.aiHand.length}</span>
        </div>

        {/* 盤面 */}
        <div id="battle-board">
          <Board
            board={board} active={active} selectedUnit={selectedUnit}
            selectedSpell={selectedSpell} gameOver={isGameOver ? gameOver : null}
            mode={mode} turn={turn} firstPlayer={firstPlayer}
            draggingCard={draggingCard} dropPreview={dropPreview}
            playerGrave={battle.playerGrave} aiGrave={battle.aiGrave}
            playerDeck={battle.playerDeck.length} aiDeck={battle.aiDeck.length}
            onCellClick={onCellClick}
            onDragOver={handleDragOver} onDrop={handleDrop} onDragLeave={handleDragLeave}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-400 px-1 mt-0.5 flex-shrink-0">
          <span>後</span><span className="text-black font-bold">── 前線 ──</span><span>後</span>
        </div>

        {/* ガイド + ターン終了 */}
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
                onClick={onEndTurn}
                disabled={mode === "pve" && active === "red"}
                className="bg-white border border-black font-bold px-3 py-1 text-xs disabled:opacity-40 flex-shrink-0"
              >
                ターン終了
              </button>
            </>
          )}
        </div>

        {/* 自分情報 */}
        <div className="flex items-center gap-2 px-1 flex-shrink-0 mb-1">
          <span className="font-bold text-xs">{mode === "pve" ? "あなた" : "🔵"}</span>
          <span className="flex items-center gap-1 font-mono text-xs">
            <Zap size={10}/>{handCost}
            <span className="text-gray-400 font-normal" style={{fontSize:"0.6rem"}}>({genInfo.name})</span>
          </span>
          <span className="text-gray-400 text-xs ml-auto">手{handArr.length}</span>
        </div>

<Board
  board={board} active={active} selectedUnit={selectedUnit}
  selectedSpell={selectedSpell} gameOver={isGameOver ? gameOver : null}
  mode={mode} turn={turn} firstPlayer={firstPlayer}
  draggingCard={draggingCard} dropPreview={dropPreview}
  playerGrave={battle.playerGrave} aiGrave={battle.aiGrave}
  playerDeck={battle.playerDeck.length} aiDeck={battle.aiDeck.length}
  onCellClick={onCellClick}
  onDragOver={handleDragOver} onDrop={handleDrop} onDragLeave={handleDragLeave}
  flipped={pvpRole === "guest"}
/>
        
        {/* 手札 */}
        <HandFan
          hand={handArr} handCost={handCost}
          handDisabled={handDisabled} isGameOver={isGameOver}
          cardImages={cardImages}
          onSummon={onSummon}
          onSpellActivate={handleSpellActivate}
          draggingCard={draggingCard}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}
        />

        {/* ログ */}
        <div className="mt-1 bg-gray-50 border border-black p-1.5 text-xs text-gray-700 overflow-y-auto flex-shrink-0" style={{maxHeight:"2.6rem"}}>
          {[...battle.log].reverse().slice(0, 4).map((l, i) => (
            <div key={i} className={i === 0 ? "text-black font-bold" : "text-gray-500"}>・{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
