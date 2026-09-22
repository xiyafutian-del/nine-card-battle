import { useState, useEffect } from 'react';
import { rollGacha, GACHA_TYPES, rarityStars, rarityColor } from '../skins/skinGacha.js';
import { getOwnedSkins, addSkin } from '../skins/skinManager.js';
import { SkinPreview } from '../components/SkinFrame.jsx';

export function SkinScreen({ onBack }) {
  const [ownedSkins, setOwnedSkins] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [gachaType, setGachaType] = useState(GACHA_TYPES.METAL);
  const [filterType, setFilterType] = useState("all");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOwnedSkins(getOwnedSkins());
  }, []);

  function handleGacha() {
    setBusy(true);
    setTimeout(() => {
      const result = rollGacha(gachaType);
      const newSkin = addSkin(result);
      setLastResult(newSkin);
      setOwnedSkins(getOwnedSkins());
      setBusy(false);
    }, 30);
  }

  const filtered = ownedSkins.filter(s => {
    if (filterType === "all") return true;
    return s.type === filterType;
  });

  // レア度でソート（レアほど上）
  const sorted = [...filtered].sort((a, b) => a.rarity - b.rarity);

  return (
    <div className="min-h-screen bg-white text-black px-3 py-4">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="text-black text-sm">← ロビー</button>
          <h2 className="font-bold tracking-widest">フレームスキン</h2>
          <div className="text-xs text-gray-500">{ownedSkins.length}個所持</div>
        </div>

        {/* ガチャ */}
        <div className="border border-black p-3 mb-3">
          <div className="text-xs font-bold mb-2">ガチャ</div>

          {/* ガチャ種類選択 */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setGachaType(GACHA_TYPES.METAL)}
              className={`flex-1 py-2 border text-xs font-bold ${gachaType === GACHA_TYPES.METAL ? "border-black bg-gray-100" : "border-gray-300"}`}
            >
              金属ガチャ
              <div className="text-gray-500 font-normal" style={{fontSize:"0.5rem"}}>
                鉄・銅・銀・金・白金・隕鉄・オリハルコン
              </div>
            </button>
            <button
              onClick={() => setGachaType(GACHA_TYPES.GEM)}
              className={`flex-1 py-2 border text-xs font-bold ${gachaType === GACHA_TYPES.GEM ? "border-black bg-gray-100" : "border-gray-300"}`}
            >
              宝石ガチャ
              <div className="text-gray-500 font-normal" style={{fontSize:"0.5rem"}}>
                アメジスト・エメラルド・ルビー・サファイア・ダイヤ
              </div>
            </button>
          </div>

          {/* ガチャボタン */}
          <button
            onClick={handleGacha}
            disabled={busy}
            className="w-full bg-black text-white font-bold py-2 text-sm disabled:opacity-40"
          >
            {busy ? "生成中…" : "1回引く（無料）"}
          </button>

          {/* ガチャ結果 */}
          {lastResult && (
            <div className="mt-3 flex items-center gap-3 border border-black p-2">
              <SkinPreview skin={lastResult} w={44} h={64}/>
              <div>
                <div className="font-bold text-sm">{lastResult.name}</div>
                <div className="text-xs" style={{color: rarityColor(lastResult.rarity)}}>
                  {rarityStars(lastResult.rarity)}
                </div>
                {lastResult.type === "metal" && (
                  <div className="text-xs text-gray-500">
                    酸化度: {Math.round((lastResult.detail?.oxidation||0)*100)}%
                  </div>
                )}
                {lastResult.type === "gem" && (
                  <div className="text-xs text-gray-500">
                    透明度: {Math.round((lastResult.detail?.clarity||0)*100)}%
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-0.5">
                  {lastResult.type === "metal" ? "金属" : "宝石"}フレーム
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 所持スキン一覧 */}
        <div className="border border-black p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold">所持スキン</div>
            <div className="flex gap-1">
              {["all", "metal", "gem"].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`text-xs px-2 py-0.5 border ${filterType===t?"border-black bg-gray-100":"border-gray-300"}`}
                >
                  {t === "all" ? "全て" : t === "metal" ? "金属" : "宝石"}
                </button>
              ))}
            </div>
          </div>

          {sorted.length === 0 && (
            <div className="text-xs text-gray-400 text-center py-4">
              スキンを所持していません
            </div>
          )}

          <div className="grid gap-2" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
            {sorted.map(skin => (
              <div key={skin.instanceId} className="flex flex-col items-center gap-0.5">
                <SkinPreview skin={skin} w={56} h={82}/>
                <div className="text-center" style={{fontSize:"0.45rem"}}>
                  <div className="font-bold truncate w-full">{skin.name}</div>
                  <div style={{color: rarityColor(skin.rarity)}}>
                    {rarityStars(skin.rarity)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
