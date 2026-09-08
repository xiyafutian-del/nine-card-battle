import { UnitCell } from './CardParts.jsx';
import { rowToCoord, getAttackTargets, getMovable } from '../engine/battle.js';

const CELL = 90; // マスサイズ
const COLS = 3;
const ROWS = 6;
const W = CELL * COLS; // 270
const H = CELL * ROWS; // 540

export function Board({
  board, active, selectedUnit, selectedSpell, gameOver,
  mode, turn, firstPlayer,
  draggingCard, onCellClick, onDragOver, onDrop, onDragLeave,
  dropPreview, playerGrave, aiGrave, playerDeck, aiDeck,
  flipped = false,
}) {
  const enem = active === "blue" ? "red" : "blue";
  const turn1block = turn === 1 && active === firstPlayer;

  const attackSet = new Set();
  const moveSet = new Set();
  const selSet = new Set();
  const growthSet = new Set();

  if (selectedUnit && !turn1block) {
    const su = selectedUnit;
    const att = board[active][su.col]?.[su.idx];
    selSet.add(`${active}-${su.col}-${su.idx}`);
    if (att) {
      getAttackTargets(active, su.col, su.idx, att, board)
        .forEach(t => attackSet.add(`${enem}-${t.col}-${t.idx}`));
      getMovable(active, su.col, su.idx, board)
        .forEach(m => moveSet.add(`${active}-${m.col}-${m.idx}`));
    }
  }

  if (!turn1block && !gameOver && !(mode === "pve" && active === "red")) {
    for (let c = 0; c < 3; c++) {
      for (let i = 0; i < board[active][c].length; i++) {
        const u = board[active][c][i];
        if (u?.effect?.action === "growth" && !u.acted && u.summonedTurn !== turn)
          growthSet.add(`${active}-${c}-${i}`);
      }
    }
  }

  const dropableSet = new Set();
  if (draggingCard) {
    for (let c = 0; c < 3; c++) {
      if (board[active][c].length < 3) {
        const base = active === "blue" ? 3 : 0;
        for (let r = 0; r < 3; r++) dropableSet.add(`${base + r}-${c}`);
      }
    }
  }

  const pushedUnits = new Set();
  if (dropPreview) {
    board[active][dropPreview.col]?.forEach((u, i) => {
      if (i >= dropPreview.insertIdx && u) pushedUnits.add(u.uid);
    });
  }

  const rowOrder = flipped ? [5,4,3,2,1,0] : [0,1,2,3,4,5];

  return (
    <div className="flex gap-1 mx-auto flex-shrink-0" style={{width:"fit-content"}}>
      {/* 盤面 */}
      <div
        className="relative flex-shrink-0 bg-white border border-black"
        style={{width:`${W}px`, height:`${H}px`, touchAction:"none"}}
        onDragLeave={onDragLeave}
      >
        {/* 格子線SVG */}
        <svg className="absolute inset-0 pointer-events-none" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{zIndex:0}}>
          {/* 縦線 */}
          {[CELL, CELL*2].map(x=>(
            <line key={x} x1={x} y1="0" x2={x} y2={H} stroke="black" strokeWidth="1"/>
          ))}
          {/* 横線 */}
          {[1,2,3,4,5].map(r=>(
            <line key={r} x1="0" y1={r*CELL} x2={W} y2={r*CELL}
              stroke="black" strokeWidth={r===3?"2":"1"}/>
          ))}
        </svg>

        {/* セル */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns:`repeat(${COLS},${CELL}px)`,
            gridTemplateRows:`repeat(${ROWS},${CELL}px)`,
          }}
        >
          {rowOrder.flatMap((row) =>
            Array.from({length:COLS}).map((__, col) => {
              const {side, idx} = rowToCoord(row);
              const cellKey = `${row}-${col}`;
              const unitKey = `${side}-${col}-${idx}`;
              const unit = board[side][col][idx];
              const isSel    = selSet.has(unitKey);
              const isAtk    = attackSet.has(unitKey);
              const isMov    = moveSet.has(unitKey);
              const isDrop   = dropableSet.has(cellKey);
              const isGrowth = growthSet.has(unitKey);
              const isInsert = dropPreview && side===active && col===dropPreview.col && idx===dropPreview.insertIdx;
              const isPushed = unit && pushedUnits.has(unit.uid);

              let bgColor = "transparent";
              if (isSel)         bgColor = "rgba(0,0,0,0.08)";
              else if (isAtk)    bgColor = "rgba(255,100,0,0.15)";
              else if (isMov)    bgColor = "rgba(0,180,0,0.12)";
              else if (isDrop)   bgColor = "rgba(100,0,200,0.08)";
              else if (isGrowth) bgColor = "rgba(0,160,0,0.08)";

              const canTap = !gameOver && !(mode==="pve"&&active==="red") && side===active && unit && !unit.acted && !turn1block;

              return (
                <div
                  key={cellKey}
                  style={{
                    width:`${CELL}px`, height:`${CELL}px`,
                    backgroundColor: bgColor,
                    position:"relative", zIndex:1,
                  }}
                  className={canTap||isAtk||isMov ? "cursor-pointer" : ""}
                  onClick={()=>{ if(!gameOver) onCellClick(row,col); }}
                  onDragOver={e=>onDragOver(e,row,col)}
                  onDrop={e=>onDrop(e,row,col)}
                >
                  {isInsert&&(
                    <div className="absolute top-0 left-0 right-0 flex justify-center z-20 pointer-events-none">
                      <div className="text-black text-xs font-bold">▼</div>
                    </div>
                  )}
                  {/* カードを59x86でセル中央に配置 */}
                  {unit && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div style={{width:"59px", height:"86px"}}>
                        <UnitCell unit={unit} pushed={isPushed}/>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* サイドパネル */}
      <div className="flex flex-col justify-between flex-shrink-0" style={{width:"36px"}}>
        <div className="flex flex-col gap-1">
          <SideBox label="デッキ" count={flipped ? playerDeck : aiDeck}/>
          <SideBox label="墓地"   count={flipped ? (playerGrave||[]).length : (aiGrave||[]).length}/>
        </div>
        <div className="text-center text-gray-400" style={{fontSize:"0.5rem"}}>前<br/>線</div>
        <div className="flex flex-col gap-1">
          <SideBox label="墓地"   count={flipped ? (aiGrave||[]).length : (playerGrave||[]).length}/>
          <SideBox label="デッキ" count={flipped ? aiDeck : playerDeck}/>
        </div>
      </div>
    </div>
  );
}

function SideBox({ label, count }) {
  return (
    <div className="border border-black text-center" style={{width:"36px",height:"52px",fontSize:"0.5rem"}}>
      <div className="font-bold border-b border-black">{label}</div>
      <div className="text-lg font-bold leading-tight">{count}</div>
    </div>
  );
}
