import { Zap } from 'lucide-react';
import { ATTR_LABELS, GENERATOR_INFO, TYPES } from '../constants/index.js';
import { TypeBadge, AttrBadge, rangeText } from '../components/CardParts.jsx';

function StatRow({ card }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  return (
    <div className="flex items-center text-xs text-black gap-2 mt-0.5 flex-wrap">
      {!isSpellMagic && card.hp  > 0 && <span>HP:{card.hp}</span>}
      {!isSpellMagic && card.atk > 0 && <span>ATK:{card.atk}</span>}
      {!isSpellMagic && <span>{rangeText(card)}</span>}
      {card.desc && <span className="text-gray-500">{card.desc}</span>}
    </div>
  );
}

export function DeckScreen({
  cardPool, deckCounts, deckTotal,
  playerGenerator, setPlayerGenerator,
  onInc, onDec, onBack,
}) {
  return (
    <div className="min-h-screen bg-white text-black px-4 py-6">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-black text-sm">← ロビー</button>
          <h2 className="font-bold tracking-widest">デッキ編成</h2>
          <div className="text-sm font-mono text-black">{deckTotal}/30</div>
        </div>

        {/* 発電機選択 */}
        <div className="border border-black p-3 mb-4">
          <div className="text-xs font-bold mb-2 flex items-center gap-1"><Zap size={12}/>発電機</div>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(GENERATOR_INFO).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setPlayerGenerator(key)}
                className={`p-2 border text-xs font-bold ${playerGenerator === key ? "border-black bg-gray-100" : "border-gray-300 hover:border-black"}`}
              >
                <div>{val.name}</div>
                <div className="text-gray-500 font-normal mt-0.5" style={{fontSize:"0.55rem"}}>{val.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 pb-8">
          {cardPool.map(c => (
            <div key={c.id} className="bg-white border border-black p-2 flex items-center gap-2">
              {c.image && <img src={c.image} alt="" className="w-8 h-11 object-cover flex-shrink-0"/>}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center flex-wrap">
                  {c.name}<AttrBadge attr={c.attr}/><TypeBadge type={c.type}/>
                </div>
                <StatRow card={c}/>
              </div>
              <button onClick={() => onDec(c.id)} className="w-8 h-8 bg-white border border-black text-lg flex-shrink-0">－</button>
              <div className="w-6 text-center font-mono flex-shrink-0">{deckCounts[c.id] || 0}</div>
              <button onClick={() => onInc(c.id)} disabled={deckTotal >= 30} className="w-8 h-8 bg-white border border-black text-lg disabled:opacity-30 flex-shrink-0">＋</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}