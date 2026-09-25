import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { ATTR_LABELS, GENERATOR_INFO, TYPES, RANGE_TYPE } from '../constants/index.js';
import { CardGrid } from '../components/CardDesign.jsx';
import { SkinPreview } from '../components/SkinFrame.jsx';
import { getOwnedSkins, getDeckSkins, setCardSkin, getUsedSkinIds } from '../skins/skinManager.js';

const EMPTY_DECK = { name: "", counts: {}, generator: "water" };

export function DeckScreen({ cardPool, cardImages, onBack, activeDeck, onActiveDeckChange }) {
  const [decks, setDecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("decks") || "[]"); } catch { return []; }
  });
  const [editing, setEditing] = useState({ ...EMPTY_DECK, ...(activeDeck || {}) });
  const [editingIdx, setEditingIdx] = useState(null);

  // スキン関連
  const [ownedSkins, setOwnedSkins] = useState([]);
  const [deckSkins, setDeckSkins] = useState({});
  const [skinTargetKey, setSkinTargetKey] = useState(null); // スキンを設定するカードキー
  const [usedIds, setUsedIds] = useState(new Set());

  // 検索
  const [search, setSearch] = useState("");
  const [filterAttr, setFilterAttr] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCost, setFilterCost] = useState("all");

  const deckTotal = Object.values(editing.counts || {}).reduce((a, b) => a + b, 0);

  useEffect(() => {
    setOwnedSkins(getOwnedSkins());
    setDeckSkins(getDeckSkins());
    setUsedIds(getUsedSkinIds());
  }, []);

  function refreshSkins() {
    setOwnedSkins(getOwnedSkins());
    setDeckSkins(getDeckSkins());
    setUsedIds(getUsedSkinIds());
  }

  // カードキー生成（デッキ名+カードid+枚数インデックス）
  function cardKey(deckName, cardId, index) {
    return `${deckName||"noname"}-${cardId}-${index}`;
  }

  function saveDecks(newDecks) {
    setDecks(newDecks);
    localStorage.setItem("decks", JSON.stringify(newDecks));
  }

  function saveDeck() {
    if (!editing.name.trim()) { alert("デッキ名を入力してください"); return; }
    if (deckTotal === 0) { alert("カードを1枚以上追加してください"); return; }
    const newDecks = [...decks];
    if (editingIdx !== null) newDecks[editingIdx] = editing;
    else newDecks.push(editing);
    saveDecks(newDecks);
    onActiveDeckChange(editing);
    alert("保存しました！");
  }

  function loadDeck(idx) {
    setEditing({ ...EMPTY_DECK, ...decks[idx] });
    setEditingIdx(idx);
    onActiveDeckChange(decks[idx]);
  }

  function deleteDeck(idx) {
    const newDecks = decks.filter((_, i) => i !== idx);
    saveDecks(newDecks);
    if (editingIdx === idx) { setEditing({ ...EMPTY_DECK }); setEditingIdx(null); }
  }

  function newDeck() { setEditing({ ...EMPTY_DECK }); setEditingIdx(null); }

  function incCount(id) {
    if (deckTotal >= 15) return;
    setEditing(e => ({ ...e, counts: { ...e.counts, [id]: (e.counts[id] || 0) + 1 } }));
  }
  function decCount(id) {
    setEditing(e => ({ ...e, counts: { ...e.counts, [id]: Math.max(0, (e.counts[id] || 0) - 1) } }));
  }

  // スキンをカードに設定
  function applySkin(instanceId) {
    if (!skinTargetKey) return;
    setCardSkin(skinTargetKey, instanceId);
    refreshSkins();
    setSkinTargetKey(null);
  }

  // スキンを解除
  function removeSkinFromCard(key) {
    setCardSkin(key, null);
    refreshSkins();
  }

  const filtered = cardPool.filter(c => {
    if (search && !c.name.includes(search)) return false;
    if (filterAttr !== "all" && c.attr !== filterAttr) return false;
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterCost !== "all" && c.cost !== +filterCost) return false;
    return true;
  });

  // デッキに入っているカードをリスト化（スキン設定用）
  const deckCardList = [];
  cardPool.forEach(c => {
    const cnt = editing.counts?.[c.id] || 0;
    for (let i = 0; i < cnt; i++) {
      deckCardList.push({ card: c, key: cardKey(editing.name, c.id, i), index: i });
      // コアカードをスキン設定対象に追加
const coreKey = cardKey(editing.name, "core", 0);
const coreCardEntry = {
  card: { id:"core", name:"コア", cost:0, hp:10, atk:0, type:"unit", attr:"none", tags:[], desc:"" },
  key: coreKey,
  index: 0,
};
const allSkinTargets = [coreCardEntry, ...deckCardList];
    }
  });

  return (
    <div className="min-h-screen bg-white text-black px-3 py-4">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="text-black text-sm">← ロビー</button>
          <h2 className="font-bold tracking-widest">デッキ編成</h2>
          <div className="text-sm font-mono">{deckTotal}/15</div>
        </div>

        {/* デッキ名・発電機 */}
        <div className="border border-black p-2 mb-3 flex flex-col gap-2">
          <input
            className="w-full border border-black px-2 py-1 text-sm"
            placeholder="デッキ名"
            value={editing.name || ""}
            onChange={e => setEditing(d => ({ ...d, name: e.target.value }))}
          />
          <div className="text-xs font-bold mb-0.5">発電機</div>
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(GENERATOR_INFO).map(([key, val]) => (
              <button key={key}
                onClick={() => setEditing(d => ({ ...d, generator: key }))}
                className={`p-1.5 border text-xs flex flex-col items-center ${editing.generator===key?"border-black bg-gray-100 font-bold":"border-gray-300"}`}>
                <span>{val.name}</span>
                <span className="text-gray-500 font-normal leading-tight mt-0.5" style={{fontSize:"0.5rem"}}>{val.desc}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveDeck} className="flex-1 bg-black text-white font-bold py-1.5 text-sm">保存</button>
            <button onClick={newDeck} className="px-3 border border-black text-sm">新規</button>
          </div>
        </div>

        {/* 保存済みデッキ */}
        {decks.length > 0 && (
          <div className="border border-black p-2 mb-3">
            <div className="text-xs font-bold mb-1">保存済みデッキ</div>
            <div className="flex flex-col gap-1">
              {decks.map((d, i) => (
                <div key={i} className={`flex items-center gap-2 p-1 border ${editingIdx===i?"border-black bg-gray-50":"border-gray-200"}`}>
                  <button onClick={() => loadDeck(i)} className="flex-1 text-left text-sm font-bold truncate">{d.name}</button>
                  <span className="text-xs text-gray-500 flex-shrink-0">{GENERATOR_INFO[d.generator]?.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{Object.values(d.counts||{}).reduce((a,b)=>a+b,0)}枚</span>
                  <button onClick={() => deleteDeck(i)} className="text-xs text-gray-400 border border-gray-300 px-1 flex-shrink-0">削</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* スキン設定（デッキに入っているカード） */}
        {deckCardList.length > 0 && (
          <div className="border border-black p-2 mb-3">
            <div className="text-xs font-bold mb-2">スキン設定</div>

            {/* スキン選択モーダル */}
            {skinTargetKey && (
              <div className="mb-2 border border-black p-2 bg-gray-50">
                <div className="text-xs font-bold mb-1">適用するスキンを選択</div>
                <div className="grid gap-1.5" style={{gridTemplateColumns:"repeat(5,1fr)"}}>
                  {ownedSkins
                    .filter(s => !usedIds.has(s.instanceId) || deckSkins[skinTargetKey] === s.instanceId)
                    .map(s => (
                      <button key={s.instanceId}
                        onClick={() => applySkin(s.instanceId)}
                        className={`flex flex-col items-center gap-0.5 p-0.5 border ${deckSkins[skinTargetKey]===s.instanceId?"border-black bg-gray-100":"border-gray-300"}`}>
                        <SkinPreview skin={s} w={40} h={58}/>
                        <span style={{fontSize:"0.38rem"}} className="truncate w-full text-center">{s.name}</span>
                      </button>
                    ))
                  }
                  {ownedSkins.filter(s => !usedIds.has(s.instanceId) || deckSkins[skinTargetKey] === s.instanceId).length === 0 && (
                    <div className="col-span-5 text-xs text-gray-400 text-center py-2">使用可能なスキンがありません</div>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  {deckSkins[skinTargetKey] && (
                    <button onClick={() => { removeSkinFromCard(skinTargetKey); setSkinTargetKey(null); }}
                      className="flex-1 border border-black text-xs py-1">スキン解除</button>
                  )}
                  <button onClick={() => setSkinTargetKey(null)}
                    className="flex-1 border border-black text-xs py-1">キャンセル</button>
                </div>
              </div>
            )}

            {/* デッキ内カード一覧 */}
            <div className="grid gap-1.5" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
  {allSkinTargets.map(({ card, key }) => {
                  const skinInstanceId = deckSkins[key];
                const skin = skinInstanceId ? ownedSkins.find(s => s.instanceId === skinInstanceId) : null;
                return (
                  <button key={key}
                    onClick={() => setSkinTargetKey(skinTargetKey === key ? null : key)}
                    className={`flex flex-col items-center gap-0.5 p-0.5 border ${skinTargetKey===key?"border-black bg-gray-50":"border-gray-200"}`}>
                    <div style={{width:"100%", aspectRatio:"59/86"}}>
                      <CardGrid
                        card={card}
                        image={cardImages?.[card.id] || card.image}
                        skin={skin}
                      />
                    </div>
                    <span style={{fontSize:"0.4rem"}} className="truncate w-full text-center">
                      {skin ? skin.name : "スキンなし"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 検索フィルター */}
        <div className="border border-black p-2 mb-3 flex flex-col gap-1.5">
          <input className="w-full border border-black px-2 py-1 text-sm"
            placeholder="カード名で検索" value={search}
            onChange={e => setSearch(e.target.value)}/>
          <div className="flex gap-1 flex-wrap">
            <select className="border border-black px-1 py-0.5 text-xs"
              value={filterAttr} onChange={e => setFilterAttr(e.target.value)}>
              <option value="all">全属性</option>
              {Object.entries(ATTR_LABELS).filter(([,v])=>v).map(([k,v])=>(
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select className="border border-black px-1 py-0.5 text-xs"
              value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">全種類</option>
              <option value={TYPES.UNIT}>ユニット</option>
              <option value={TYPES.TANK}>タンク</option>
              <option value={TYPES.FACILITY}>施設</option>
              <option value={TYPES.SPELL}>スペル</option>
              <option value={TYPES.MAGIC}>魔法</option>
            </select>
            <select className="border border-black px-1 py-0.5 text-xs"
              value={filterCost} onChange={e => setFilterCost(e.target.value)}>
              <option value="all">全コスト</option>
              {[0,1,2,3,4,5,6,7,8,9].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* カードグリッド */}
        <div className="grid gap-2" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
          {filtered.map(c => (
            <CardGrid
              key={c.id}
              card={c}
              image={cardImages?.[c.id] || c.image}
              count={editing.counts?.[c.id] || 0}
              onInc={() => incCount(c.id)}
              onDec={() => decCount(c.id)}
            />
          ))}
        </div>
        <div className="h-8"/>
      </div>
    </div>
  );
                                }
