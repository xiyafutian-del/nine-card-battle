import { useState } from 'react';
import { Zap } from 'lucide-react';
import { GENERATOR_INFO } from '../constants/index.js';

export function LobbyScreen({
  playerGenerator, setPlayerGenerator, deckTotal, onStart, onNav,
  onCreateRoom, onJoinRoom, pvpStatus, pvpRole, roomId, error,
  inputRoomId, setInputRoomId,
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [pvpOpen, setPvpOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center text-black text-xs font-bold tracking-widest mb-1">TACTICAL CARD BATTLE</div>
        <h1 className="text-center text-3xl font-extrabold tracking-widest mb-1">9 CARD</h1>
        <div className="h-px bg-black mb-4"/>

        <div className="space-y-3">
          <button onClick={() => onStart("pve")} className="w-full bg-white hover:bg-gray-100 font-bold py-3 border border-black tracking-wide">PVE対戦</button>
          <button onClick={() => onStart("solo")} className="w-full bg-white hover:bg-gray-100 font-bold py-3 border border-black tracking-wide">1人回し</button>

          {/* PVP */}
          <div className="border border-black">
            <button
              onClick={() => setPvpOpen(o => !o)}
              className="w-full font-bold py-3 tracking-wide flex items-center justify-between px-4"
            >
              <span>PVP対戦</span>
              <span>{pvpOpen ? "▲" : "▼"}</span>
            </button>

            {pvpOpen && (
              <div className="border-t border-black p-3 space-y-3">
                {pvpStatus === "idle" && (
                  <>
                    {/* 部屋を作る */}
                    <button
                      onClick={onCreateRoom}
                      className="w-full bg-white hover:bg-gray-100 font-bold py-2 border border-black text-sm"
                    >
                      部屋を作る（ホスト）
                    </button>
                    {/* 部屋に入る */}
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-black px-2 py-2 text-sm font-mono tracking-widest uppercase"
                        placeholder="ルームID"
                        value={inputRoomId}
                        onChange={e => setInputRoomId(e.target.value.toUpperCase())}
                        maxLength={6}
                      />
                      <button
                        onClick={() => onJoinRoom(inputRoomId)}
                        className="bg-white hover:bg-gray-100 font-bold px-3 border border-black text-sm"
                      >
                        入室
                      </button>
                    </div>
                    {error && <div className="text-red-600 text-xs">{error}</div>}
                  </>
                )}

                {pvpStatus === "waiting" && (
                  <div className="text-center py-2">
                    <div className="text-xs text-gray-500 mb-1">ルームID</div>
                    <div className="text-3xl font-mono font-bold tracking-widest border border-black py-2">{roomId}</div>
                    <div className="text-xs text-gray-500 mt-2">相手の入室を待っています…</div>
                  </div>
                )}

                {pvpStatus === "playing" && (
                  <div className="text-center py-2">
                    <div className="text-green-600 font-bold text-sm mb-1">対戦相手が見つかりました！</div>
                    <button
                      onClick={() => onStart("pvp")}
                      className="w-full bg-black text-white font-bold py-3 text-sm"
                    >
                      ゲーム開始
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={() => onNav("deck")} className="bg-white hover:bg-gray-100 font-semibold py-3 border border-black">
              デッキ編成
              <div className="text-xs text-gray-400">{deckTotal}/30枚</div>
            </button>
            <button onClick={() => onNav("dex")} className="bg-white hover:bg-gray-100 font-semibold py-3 border border-black">
              カード図鑑
            </button>
          </div>
        </div>

        {/* 発電機選択 */}
        <div className="border border-black p-3 mt-4">
          <div className="text-xs font-bold mb-2 flex items-center gap-1"><Zap size={12}/>発電機選択</div>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(GENERATOR_INFO).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setPlayerGenerator(key)}
                className={`p-2 border text-xs font-bold ${playerGenerator === key ? "border-black bg-gray-100" : "border-gray-300 hover:border-black"}`}
              >
                <div>{val.name}</div>
                <div className="text-gray-500 font-normal mt-0.5 leading-tight" style={{fontSize:"0.55rem"}}>{val.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ヘルプ */}
        <button onClick={() => setHelpOpen(h => !h)} className="w-full mt-4 text-left text-sm text-gray-600 border-t border-gray-300 pt-3 flex justify-between">
          <span>ルール早見表</span><span>{helpOpen ? "▲" : "▼"}</span>
        </button>
        {helpOpen && (
          <div className="text-xs text-gray-600 leading-relaxed space-y-1.5 mt-2 border border-gray-300 p-3">
            <p>盤面は自陣3×3。コア（HP10）が中央前列に配置、破壊されたら負け。</p>
            <p><b>勝利条件</b>：①コア破壊 ②25T経過→コアHP比較→場HP合計比較→引き分け</p>
            <p><b>発電機</b>：種類によりコスト収入パターンが変わる。</p>
            <p><b>施設</b>：移動不可・前詰めなし。畑/商店は毎ターン+1コスト。</p>
            <p><b>成長</b>：草属性施設をタップで自身を破壊し手札のカードを召喚。</p>
            <p>手札をスワイプ/ドラッグで召喚。ユニットタップで橙=攻撃/緑=移動。</p>
          </div>
        )}
      </div>
    </div>
  );
}