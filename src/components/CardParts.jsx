import { Crown, Shield } from 'lucide-react';
import { TYPES, ATTR_LABELS } from '../constants/index.js';

export function CostTag({ cost }) {
  return (
    <div className="absolute top-0.5 left-0.5 bg-white border border-black text-black font-bold w-5 h-5 flex items-center justify-center z-20" style={{fontSize:"0.6rem"}}>
      {cost}
    </div>
  );
}

export function TypeBadge({ type }) {
  const labels = { [TYPES.TANK]:"タンク", [TYPES.FACILITY]:"施設", [TYPES.SPELL]:"スペル", [TYPES.MAGIC]:"魔法" };
  if (!labels[type]) return null;
  return <span className="text-xs border border-black px-0.5 ml-1">{labels[type]}</span>;
}

export function AttrBadge({ attr }) {
  const label = ATTR_LABELS[attr];
  if (!label) return null;
  return <span className="text-xs font-bold text-green-700 ml-0.5">[{label}]</span>;
}

export function rangeText(card) {
  if (card.rangeType === "diamond") return `◇${card.dRange || 1}`;
  return `□${card.hRange || 1}×${card.vRange || 1}`;
}

// 盤面内カード（手札と同デザイン・59×86）
export function UnitCell({ unit, pushed }) {
  const isCore = unit.isCore;
  const isSpellMagic = unit.type === TYPES.SPELL || unit.type === TYPES.MAGIC;
  const typeLabel = { unit:"ユニット", tank:"タンク", facility:"施設", spell:"スペル", magic:"魔法" }[unit.type] || "";

  return (
    <div
      className="relative w-full h-full bg-white border border-black overflow-hidden flex flex-col"
      style={{
        borderRadius:"2px",
        transition:"transform 0.15s",
        transform: pushed ? "translateY(5px)" : "none",
        opacity: pushed ? 0.6 : 1,
      }}
    >
      {/* コスト: 左上 */}
      {!isCore && <CostTag cost={unit.cost || 0}/>}

      {/* カード名: 最上部 */}
      <div className="text-center font-bold leading-tight truncate border-b border-black"
        style={{fontSize:"0.58rem", padding:"1px 4px 1px 20px"}}>
        {unit.name}
        {unit.attr && ATTR_LABELS[unit.attr] && (
          <span className="ml-0.5 text-green-700" style={{fontSize:"0.45rem"}}>[{ATTR_LABELS[unit.attr]}]</span>
        )}
      </div>

      {/* イラスト領域 */}
      <div className="relative border-b border-black" style={{flex:"1 1 0", minHeight:0}}>
        {unit.image
          ? <img src={unit.image} alt={unit.name} className="absolute inset-0 w-full h-full object-cover"/>
          : <div className="absolute inset-0 flex items-center justify-center">
              {isCore && <Crown size={14} className="text-black"/>}
              {unit.type === TYPES.TANK && !isCore && <Shield size={14} className="text-black"/>}
              {!isCore && unit.type !== TYPES.TANK && (
                <span className="text-gray-200 font-bold" style={{fontSize:"0.5rem"}}>{typeLabel}</span>
              )}
            </div>
        }
      </div>

      {/* コア: 体力を大きく表示（n/m表示なし） */}
      {isCore && (
        <div className="flex items-center justify-center flex-shrink-0 border-b border-black"
          style={{fontSize:"0.8rem", padding:"1px 0"}}>
          <span className="font-bold">{unit.hp}</span>
        </div>
      )}

      {/* 通常ユニット: ATK・射程・HP */}
      {!isCore && !isSpellMagic && (
        <div className="flex items-center justify-between border-b border-black flex-shrink-0"
          style={{fontSize:"0.5rem", padding:"0 3px"}}>
          <span className="font-bold">{unit.atk > 0 ? unit.atk : "－"}</span>
          <span className="text-gray-500" style={{fontSize:"0.42rem"}}>{rangeText(unit)}</span>
          <span className="font-bold">{unit.hp}</span>
        </div>
      )}

      {/* 能力テキスト */}
      <div className="overflow-hidden flex-shrink-0"
        style={{fontSize:"0.42rem", padding:"1px 2px", minHeight:"14px", maxHeight:"20px"}}>
        <span className="text-gray-700 leading-tight">{unit.desc || ""}</span>
      </div>

      {/* 行動済み表示 */}
      {unit.acted && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <span className="text-white font-bold bg-black/50 px-1" style={{fontSize:"0.5rem"}}>済</span>
        </div>
      )}

      {/* HPバー（コア以外） */}
      {!isCore && unit.maxHp > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200">
          <div className="h-full bg-black" style={{width:`${Math.max(0,(unit.hp/unit.maxHp)*100)}%`}}/>
        </div>
      )}
    </div>
  );
}

// 手札カード（59×86）
export function CardFace({ card, image }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  const typeLabel = { unit:"ユニット", tank:"タンク", facility:"施設", spell:"スペル", magic:"魔法" }[card.type] || "";
  return (
    <div className="relative w-full h-full bg-white border border-black overflow-hidden flex flex-col" style={{borderRadius:"2px"}}>
      <CostTag cost={card.cost}/>
      {/* カード名 */}
      <div className="text-center font-bold leading-tight truncate border-b border-black"
        style={{fontSize:"0.58rem", padding:"1px 4px 1px 20px"}}>
        {card.name}
        {card.attr && ATTR_LABELS[card.attr] && (
          <span className="ml-0.5 text-green-700" style={{fontSize:"0.45rem"}}>[{ATTR_LABELS[card.attr]}]</span>
        )}
      </div>
      {/* イラスト */}
      <div className="relative border-b border-black" style={{flex:"1 1 0", minHeight:0}}>
        {image
          ? <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover"/>
          : <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-200 font-bold" style={{fontSize:"0.5rem"}}>{typeLabel}</span>
            </div>
        }
      </div>
      {/* ATK・射程・HP */}
      {!isSpellMagic && (
        <div className="flex items-center justify-between border-b border-black"
          style={{fontSize:"0.5rem", padding:"0 3px"}}>
          <span className="font-bold">{card.atk > 0 ? card.atk : "－"}</span>
          <span className="text-gray-500" style={{fontSize:"0.42rem"}}>{rangeText(card)}</span>
          <span className="font-bold">{card.hp}</span>
        </div>
      )}
      {/* 能力テキスト */}
      <div className="overflow-hidden" style={{fontSize:"0.45rem", padding:"1px 2px", minHeight:"16px", maxHeight:"22px"}}>
        <span className="text-gray-700 leading-tight">{card.desc || ""}</span>
      </div>
    </div>
  );
}

// デッキ・図鑑用グリッドカード
export function CardGrid({ card, image, count, onInc, onDec }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  return (
    <div className="relative flex flex-col bg-white border border-black overflow-hidden"
      style={{width:"100%", aspectRatio:"59/86"}}>
      <CostTag cost={card.cost}/>
      {/* カード名 */}
      <div className="text-center font-bold leading-tight truncate border-b border-black"
        style={{fontSize:"0.52rem", padding:"1px 4px 1px 18px"}}>
        {card.name}
      </div>
      {/* イラスト */}
      <div className="relative border-b border-black" style={{flex:"1 1 0", minHeight:0}}>
        {image
          ? <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover"/>
          : <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <span className="text-gray-300" style={{fontSize:"0.45rem"}}>
                {ATTR_LABELS[card.attr]||""}
              </span>
            </div>
        }
      </div>
      {/* ステータス */}
      {!isSpellMagic && (
        <div className="flex items-center justify-between border-b border-black"
          style={{fontSize:"0.45rem", padding:"0 2px"}}>
          <span className="font-bold">{card.atk > 0 ? card.atk : "－"}</span>
          <span className="text-gray-500" style={{fontSize:"0.4rem"}}>{rangeText(card)}</span>
          <span className="font-bold">{card.hp}</span>
        </div>
      )}
      {/* 効果テキスト */}
      <div style={{fontSize:"0.38rem", padding:"1px 2px", minHeight:"10px"}}>
        <span className="text-gray-600 leading-tight">{card.desc||""}</span>
      </div>
      {/* デッキ枚数 */}
      {onInc && (
        <div className="flex items-center justify-between border-t border-black"
          style={{padding:"1px 2px"}}>
          <button onClick={onDec}
            className="w-5 h-5 border border-black font-bold flex items-center justify-center"
            style={{fontSize:"0.7rem"}}>－</button>
          <span className="font-mono font-bold" style={{fontSize:"0.55rem"}}>{count||0}</span>
          <button onClick={onInc}
            className="w-5 h-5 border border-black font-bold flex items-center justify-center"
            style={{fontSize:"0.7rem"}}>＋</button>
        </div>
      )}
    </div>
  );
                  }
