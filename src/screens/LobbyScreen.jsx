import { useState } from 'react';

const DECK_SIZE = 15;

export function LobbyScreen({
  deckTotal, onStart, onNav,
  onCreateRoom, onJoinRoom, onCancelRoom,
  pvpStatus, roomId, error,
  inputRoomId, setInputRoomId,
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [pvpOpen, setPvpOpen] = useState(false);

  const busy = pvpStatus === "waiting" || pvpStatus === "playing";
  const deckInvalid = deckTotal !== DECK_SIZE;

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center text-xs font-bold tracking-widest mb-1">TACTICAL CARD BATTLE</div>
        <h1 className="text-center text-3xl font-extrabold tracking-widest mb-1">9 CARD</h1>
        <div className="h-px bg-black mb-4"/>

        {deckInvalid && (
          <div className="text-xs text-red-600 border border-red-600 px-2 py-1 mb-3 text-center">
            デッキが{deckTotal}枚です（{DECK_SIZE}枚ちょうど必要）
          </div>
        )}
        {busy && (
          <div className="text-xs text-gray-600 border border-gray-400 px-2 py-1 mb-3 text-center">
            PVP待機中のため、他のモードは開始できません
          </div>
        )}

        <div className="space-y-3">
          <button onClick={() => onStart("pve")} disabled={busy}
            className="w-full bg-white hover:bg-gray-100 font-bold py-3 border border-black tracking-wide disabled:opacity-40">
            PVE対戦
          </button>
          <button onClick={() => onStart("solo")} disabled={busy}
            className="w-full bg-white hover:bg-gray-100 font-bold py-3 border border-black tracking-wide disabled:opacity-40">
            1人回し
          </button>

          {/* PVP */}
          <div className="border border-black">
            <button onClick={() => setPvpOpen(o => !o)}
              className="w-full font-bold py-3 tracking-wide flex items-center justify-between px-4">
              <span>PVP対戦</span>
              <span>{pvpOpen || busy ? "▲" : "▼"}</span>
            </button>

            {(pvpOpen || busy) && (
              <div className="border-t border-black p-3 space-y-3">
                {pvpStatus === "idle" && (
                  <>
                    <button onClick={onCreateRoom}
                      className="w-full bg-white hover:bg-gray-100 font-bold py-2 border border-black text-sm">
                      部屋を作る（ホスト）
                    </button>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-black px-2 py-2 text-sm font-mono tracking-widest uppercase"
                        placeholder="ルームID"
                        value={inputRoomId}
                        onChange={e => setInputRoomId(e.target.value.toUpperCase())}
                        maxLength={6}
                      />
                      <button onClick={() => onJoinRoom(inputRoomId)}
                        className="bg-white hover:bg-gray-100 font-bold px-3 border border-black text-sm">
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
                    <button onClick={onCancelRoom}
                      className="mt-3 w-full bg-white border border-black font-bold py-2 text-sm">
                      待機をやめる
                    </button>
                  </div>
                )}

                {pvpStatus === "playing" && (
                  <div className="text-center py-2">
                    <div className="text-green-600 font-bold text-sm mb-2">対戦相手が見つかりました！</div>
                    <button onClick={() => onStart("pvp")}
                      className="w-full bg-black text-white font-bold py-3 text-sm">
                      ゲーム開始
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={() => onNav("deck")}
              className="bg-white hover:bg-gray-100 font-semibold py-3 border border-black">
              デッキ編成
              <div className={`text-xs ${deckInvalid ? "text-red-600 font-bold" : "text-gray-400"}`}>
                {deckTotal}/{DECK_SIZE}枚
              </div>
            </button>
            <button onClick={() => onNav("dex")}
              className="bg-white hover:bg-gray-100 font-semibold py-3 border border-black">
              カード図鑑
            </button>
          </div>

          <button onClick={() => onNav("skins")}
            className="w-full bg-white hover:bg-gray-100 font-bold py-3 border border-black tracking-wide">
            フレームスキン
            <div className="text-xs text-gray-400 font-normal">ガチャ・スキン設定</div>
          </button>
        </div>

        {/* ルール早見表 */}
        <button onClick={() => setHelpOpen(h => !h)}
          className="w-full mt-4 text-left text-sm text-gray-600 border-t border-gray-300 pt-3 flex justify-between">
          <span>ルール早見表</span><span>{helpOpen ? "▲" : "▼"}</span>
        </button>
        {helpOpen && (
          <div className="text-xs text-gray-600 leading-relaxed space-y-1.5 mt-2 border border-gray-300 p-3">
            <p>盤面は自陣3×3。コア（HP10）が中央前列にいて、破壊されたら負け。</p>
            <p><b>勝利条件</b>：①コア破壊 ②25T経過→コアHP→場のHP合計→引き分け</p>
            <p><b>ターンの流れ</b>：ドロー → 召喚フェーズ → 行動フェーズ（移動・攻撃）→ ターン終了。前のフェーズには戻れません。</p>
            <p><b>召喚</b>：手札をドラッグ。ユニットは列の最後尾、施設は好きな位置に出せます。出したユニットは回転した状態で登場します（先制を除く）。成長は召喚フェーズのみ。</p>
            <p><b>行動</b>：ユニットをタップ。緑=移動先、橙=攻撃先。行動すると90度回転し、次の自分のターン開始で戻ります。</p>
            <p><b>魔法・スペル</b>：いつでも、手札を盤面へドラッグして使用。</p>
            <p>先行1T目は移動・攻撃できません。</p>
          </div>
        )}
      </div>
    </div>
  );
}
