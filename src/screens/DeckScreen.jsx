import { useState, useEffect } from 'react';
import { ATTRS, ATTR_LABELS, GENERATOR_INFO, TYPES, RANGE_TYPE } from '../constants/index.js';
import { CardGrid } from '../components/CardDesign.jsx';

const EMPTY_DECK = { name: "", counts: {}, generator: "water" };

function rangeText(card) {
  if (card.rangeType === "diamond") return `◇${card.dRange || 1}`;
  return `□${card.hRange || 1}×${card.vRange || 1}`;
}

export function DeckScreen({ cardPool, cardImages, onBack, activeDeck, onActiveDeckChange }) {
  const [decks, setDecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("decks") || "[]"); } catch { return []; }
  });

  // activeDeck が null でも安全に初期化
  const [editing, setEditing] = useState({ ...EMPTY_DECK, ...(activeDeck || {}) });
  const [editingIdx, setEditingIdx] = useState(null);

  const [search, setSearch] = useState("");
  const [filterAttr, setFilterAttr] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCost, setFilterCost] = useState("all");

  const deckTotal = Object.values(editing.counts || {}).reduce((a, b) => a + b, 0);
  const currentGen = GENERATOR_INFO[editing.generator] || GENERATOR_INFO.water;

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

  function newDeck() {
    setEditing({ ...EMPTY_DECK });
    setEditingIdx(null);
  }

  function incCount(id) {
    if (deckTotal >= 30) return;
    setEditing(e => ({ ...e, counts: { ...e.counts, [id]: (e.counts[id] || 0) + 1 } }));
  }
  function decCount(id) {
    setEditing(e => ({ ...e, counts: { ...e.counts, [id]: Math.max(0, (e.counts[id] || 0) - 1) } }));
  }

  const filtered = cardPool.filter(c => {
    if (search && !c.name.includes(search)) return false;
    if (filterAttr !== "all" && c.attr !== filterAttr) return false;
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterCost !== "all" && c.cost !== +filterCost) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-white text-black px-3 py-4">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="text-black text-sm">← ロビー</button>
          <h2 className="font-bold tracking-widest">デッキ編成</h2>
          <div className="text-sm font-mono">{deckTotal}/30</div>
        </div>

        {/* デッキ名・発電機 */}
        <div className="border border-black p-2 mb-3 flex flex-col gap-2">
          <input
            className="w-full border border-black px-2 py-1 text-sm"
            placeholder="デッキ名"
            value={editing.name || ""}
            onChange={e => setEditing(d => ({ ...d, name: e.target.value }))}
          />

          {/* 発電機選択＋性能表示 */}
          <div className="text-xs font-bold mb-0.5">発電機</div>
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(GENERATOR_INFO).map(([key, val]) => (
              <button key={key}
                onClick={() => setEditing(d => ({ ...d, generator: key }))}
                className={`p-1.5 border text-xs flex flex-col items-center ${editing.generator === key ? "border-black bg-gray-100 font-bold" : "border-gray-300"}`}
              >
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

        {/* 保存済みデッキ一覧 */}
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

        {/* 検索フィルター */}
        <div className="border border-black p-2 mb-3 flex flex-col gap-1.5">
          <input
            className="w-full border border-black px-2 py-1 text-sm"
            placeholder="カード名で検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-1 flex-wrap">
            <select className="border border-black px-1 py-0.5 text-xs" value={filterAttr} onChange={e => setFilterAttr(e.target.value)}>
              <option value="all">全属性</option>
              {Object.entries(ATTR_LABELS).filter(([,v])=>v).map(([k,v])=>(
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select className="border border-black px-1 py-0.5 text-xs" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">全種類</option>
              <option value={TYPES.UNIT}>ユニット</option>
              <option value={TYPES.TANK}>タンク</option>
              <option value={TYPES.FACILITY}>施設</option>
              <option value={TYPES.SPELL}>スペル</option>
              <option value={TYPES.MAGIC}>魔法</option>
            </select>
            <select className="border border-black px-1 py-0.5 text-xs" value={filterCost} onChange={e => setFilterCost(e.target.value)}>
              <option value="all">全コスト</option>
              {[0,1,2,3,4,5,6,7,8,9].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

{/* カードグリッド（横3枚）*/}
<div className="grid gap-2" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
  {filtered.map(c => {
    // グリッド1枠の幅を計算（画面幅-padding) / 3
    const gridW = Math.floor((Math.min(window.innerWidth, 384) - 24) / 3);
    return (
      <div key={c.id} style={{ fontSize:`${gridW}px` }}>
        <CardGrid
          card={c}
          image={cardImages?.[c.id] || c.image}
          count={editing.counts?.[c.id] || 0}
          onInc={() => incCount(c.id)}
          onDec={() => decCount(c.id)}
        />
      </div>
    );
  })}
</div>
        <div className="h-8"/>
      </div>
    </div>
  );
}
