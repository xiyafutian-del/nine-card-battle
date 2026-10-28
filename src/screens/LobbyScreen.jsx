import { useState } from 'react';

export function LobbyScreen({
  playerGenerator, setPlayerGenerator, deckTotal, onStart, onNav,
  onCreateRoom, onJoinRoom, pvpStatus, pvpRole, roomId, error,
  inputRoomId, setInputRoomId,
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [pvpOpen, setPvpOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-sm">
        {/* タイトル */}
        <div className="text-center text-black text-xs font-bold tracking-widest mb-1">TACTICAL CARD BATTLE</div>
        <h1 className="text-center text-3xl font-extrabold tracking-widest mb-1">9カード</h1>
        <div className="h-px bg-black mb-5"/>

        <div className="space-y-3">
          
          {/* 上段：デッキ（左縦長） vs ずかん・フレーム（右2段） */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* デッキ（カードプレビュー用スペース入り） */}
            <button 
              onClick={() => onNav("deck")} 
              className="bg-white hover:bg-gray-50 border border-black p-3 flex flex-col justify-between items-center text-center transition-colors h-52 group"
            >
              <div className="w-full text-left">
                <div className="font-extrabold text-sm">デッキ</div>
                <div className="text-[10px] text-gray-500 font-mono">{deckTotal}/15枚</div>
              </div>

              {/* 将来的にデッキのカード画像を描画するプレビューエリア */}
              <div className="w-24 h-32 border border-dashed border-gray-400 rounded flex flex-col items-center justify-center bg-gray-50 my-1 group-hover:border-black transition-colors">
                <div className="text-2xl text-gray-300">🎴</div>
                <div className="text-[10px] text-gray-400 mt-1 font-bold">CARD AREA</div>
              </div>

              <div className="text-[10px] font-bold text-gray-600 group-hover:translate-x-0.5 transition-transform">
                編集する →
              </div>
            </button>

            {/* 右側：ずかん & フレーム */}
            <div className="flex flex-col gap-3 h-52">
              <button 
                onClick={() => onNav("dex")} 
                className="flex-1 bg-white hover:bg-gray-50 border border-black p-3 flex flex-col justify-center items-center transition-colors"
              >
                <div className="font-extrabold text-base">ずかん</div>
                <div className="text-[10px] text-gray-400">カード一覧</div>
              </button>

              <button 
                onClick={() => onNav("skins")}
                className="flex-1 bg-white hover:bg-gray-50 border border-black p-3 flex flex-col justify-center items-center transition-colors"
              >
                <div className="font-extrabold text-base">フレーム</div>
                <div className="text-[10px] text-gray-400">スキン・ガチャ</div>
              </button>
            </div>

          </div>

          {/* 中段：PVP（全幅横長） */}
          <div className="border border-black bg-white">
            <button
              onClick={() => setPvpOpen(o => !o)}
              className="w-full font-extrabold py-3.5 px-4 tracking-wider flex items-center justify-between text-base hover:bg-gray-50 transition-colors"
            >
              <span>PVP対戦</span>
              <span className="text-xs font-mono">{pvpOpen ? "▲" : "▼"}</span>
            </button>

            {/* PVP対戦用のアコーディオン展開エリア */}
            {pvpOpen && (
              <div className="border-t border-black p-3 space-y-3 bg-gray-50">
                {pvpStatus === "idle" && (
                  <>
                    <button
                      onClick={onCreateRoom}
                      className="w-full bg-white hover:bg-gray-100 font-bold py-2 border border-black text-xs"
                    >
                      部屋を作る（ホスト）
                    </button>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-black px-2 py-1.5 text-xs font-mono tracking-widest uppercase bg-white"
                        placeholder="ルームID"
                        value={inputRoomId}
                        onChange={e => setInputRoomId(e.target.value.toUpperCase())}
                        maxLength={6}
                      />
                      <button
                        onClick={() => onJoinRoom(inputRoomId)}
                        className="bg-white hover:bg-gray-100 font-bold px-3 border border-black text-xs"
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
                    <div className="text-2xl font-mono font-bold tracking-widest border border-black py-1.5 bg-white">{roomId}</div>
                    <div className="text-xs text-gray-500 mt-2">相手の入室を待っています…</div>
                  </div>
                )}

                {pvpStatus === "playing" && (
                  <div className="text-center py-2">
                    <div className="text-green-600 font-bold text-xs mb-1">対戦相手が見つかりました！</div>
                    <button
                      onClick={() => onStart("pvp")}
                      className="w-full bg-black text-white font-bold py-2.5 text-xs"
                    >
                      ゲーム開始
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 下段：NPC vs 1人回し（横並び2分割） */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onStart("pve")} 
              className="bg-white hover:bg-gray-50 font-extrabold py-3 border border-black text-sm tracking-wide transition-colors"
            >
              NPC対戦
            </button>
            <button 
              onClick={() => onStart("solo")} 
              className="bg-white hover:bg-gray-50 font-extrabold py-3 border border-black text-sm tracking-wide transition-colors"
            >
              1人回し
            </button>
          </div>

          {/* 最下段：ルール vs 未定（横並び2分割） */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setHelpOpen(h => !h)} 
              className="bg-white hover:bg-gray-50 font-bold py-2.5 border border-black text-xs flex items-center justify-between px-3 transition-colors"
            >
              <span>ルール</span>
              <span className="text-[10px]">{helpOpen ? "▲" : "▼"}</span>
            </button>

            {/* 今後の機能追加用ボタン */}
            <button 
              disabled 
              className="bg-gray-100 text-gray-400 font-bold py-2.5 border border-gray-300 text-xs cursor-not-allowed"
            >
              未定
            </button>
          </div>

          {/* ルール・解説表示領域 */}
          {helpOpen && (
            <div className="text-xs text-gray-600 leading-relaxed space-y-1.5 p-3 border border-black bg-gray-50 mt-2">
              <p>盤面は自陣3×3。コア（HP10）が中央前列に配置、破壊されたら負け。</p>
              <p><b>勝利条件</b>：コア破壊</p>
              <p><b>デッキ</b>：15枚のカードを選択し自由に組む。同名制限無し。</p>
              <p><b>発電機</b>：種類によりコスト収入パターンが変わる。</p>
              <p><b>　ユニット</b>：自動で前詰め。選択で移動可能</p>
              <p><b>　施設</b>：移動不可・前詰めなし。</p>
              <p><b>　　長方形射程</b>：n.mとして表される。nが自分のいる列を中心とした列数、mが自分のいる行の何行先までかを表す。</p>
              <p><b>　　ひし形射程</b>：dkとして表される。自身からkマス移動して届く範囲を攻撃可能。</p>
              <p><b>　タンク</b>：長方形射程の列またはひし形射程の経路に入ることにより自身以降のカードを選択不可にする。</p>
              <p><b>　成長</b>：自身をタップし、手札から条件に合うカードを選択で召喚。。</p>
              <p>手札をスワイプ/ドラッグ(0.5秒ぐらい)で召喚。ユニットタップで橙=攻撃/緑=移動。</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
