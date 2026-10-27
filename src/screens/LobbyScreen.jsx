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
        <h1 className="text-center text-3xl font-extrabold tracking-widest mb-1">9カード</h1>
        <div className="h-px bg-black mb-5"/>

        {/* メインメニュー：モック画像に基づく非対称グリッド配置（将来のボタン追加にも対応） */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          
          {/* 左側：大きなデッキ編成ブロック（縦長） */}
          <button 
            onClick={() => onNav("deck")} 
            className="col-span-1 bg-white hover:bg-gray-50 border border-black p-4 flex flex-col justify-between text-left min-h-[160px] transition-colors relative group"
          >
            <div>
              <div className="text-[10px] font-bold text-gray-400 tracking-widest">MANAGEMENT</div>
              <div className="text-lg font-extrabold mt-1">デッキ編成</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold mt-2">{deckTotal}<span className="text-sm font-normal text-gray-500">/15枚</span></div>
              <div className="text-xs text-gray-500 mt-1 font-semibold group-hover:translate-x-0.5 transition-transform">編集する →</div>
            </div>
          </button>

          {/* 右側：小分けのメニュー群（PVP / 図鑑 / スキン / その他追加用） */}
          <div className="col-span-1 flex flex-col gap-2.5">
            {/* PVPトグルボタン */}
            <button
              onClick={() => setPvpOpen(o => !o)}
              className="bg-white hover:bg-gray-50 border border-black p-2.5 text-left flex items-center justify-between transition-colors"
            >
              <div>
                <div className="text-[10px] font-bold text-gray-400">BATTLE</div>
                <div className="font-bold text-xs">PVP対戦</div>
              </div>
              <span className="text-xs font-mono">{pvpOpen ? "▲" : "▼"}</span>
            </button>

            {/* カード図鑑 */}
            <button 
              onClick={() => onNav("dex")} 
              className="bg-white hover:bg-gray-50 border border-black p-2.5 text-left transition-colors flex-1 flex flex-col justify-center"
            >
              <div className="text-[10px] font-bold text-gray-400">COLLECTION</div>
              <div className="font-bold text-xs">カード図鑑</div>
            </button>

            {/* フレームスキン */}
            <button 
              onClick={() => onNav("skins")}
              className="bg-white hover:bg-gray-50 border border-black p-2.5 text-left transition-colors flex-1 flex flex-col justify-center"
            >
              <div className="text-[10px] font-bold text-gray-400">CUSTOMIZE</div>
              <div className="font-bold text-xs">フレームスキン</div>
            </button>
          </div>
        </div>

        {/* PVPアコーディオン展開エリア */}
        {pvpOpen && (
          <div className="border border-black p-3 space-y-3 mb-3 bg-gray-50">
            <div className="text-xs font-bold tracking-wider">PVP MATCHMAKING</div>
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

        {/* その下：横長のメインバトル開始ボタン群 */}
        <div className="space-y-2 mb-4">
          <button 
            onClick={() => onStart("pve")} 
            className="w-full bg-black text-white hover:bg-gray-800 font-bold py-3.5 border border-black tracking-widest text-sm text-center shadow-sm"
          >
            PVE対戦スタート
          </button>
          <button 
            onClick={() => onStart("solo")} 
            className="w-full bg-white hover:bg-gray-50 font-bold py-2.5 border border-black tracking-wide text-xs text-gray-700"
          >
            1人回し（練習モード）
          </button>
        </div>

        {/* ルール・ヘルプ（アコーディオン） */}
        <div className="border border-black">
          <button 
            onClick={() => setHelpOpen(h => !h)} 
            className="w-full text-left text-xs font-bold p-3 flex justify-between items-center bg-white hover:bg-gray-50"
          >
            <span>遊び方・ルール解説</span>
            <span className="text-xs">{helpOpen ? "▲" : "▼"}</span>
          </button>
          {helpOpen && (
            <div className="text-xs text-gray-600 leading-relaxed space-y-1.5 p-3 border-t border-black bg-gray-50">
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
