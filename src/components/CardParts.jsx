import { Heart, Swords, Crown, Shield } from 'lucide-react';
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
  const parts = [];
  if (card.rangeType === "diamond") {
    parts.push(`◇${card.dRange || 1}`);
  } else {
    parts.push(`□${card.hRange || 1}×${card.vRange || 1}`);
  }
  return parts.join(" ");
}

// 盤面内のカード表示
export function UnitCell({ unit, pushed }) {
  const isCore = unit.isCore;
  return (
    <div
      className="w-full h-full relative bg-white border border-black overflow-hidden flex flex-col"
      style={{
        transition: "transform 0.15s",
        transform: pushed ? "translateY(5px)" : "none",
        opacity: pushed ? 0.6 : 1,
        borderRadius: "1px",
      }}
    >
      {/* コスト（左上） */}
      {!isCore && <CostTag cost={unit.cost || 0}/>}

      {/* 上半分: イラスト */}
      <div className="relative border-b border-black flex-shrink-0" style={{height:"50%"}}>
        {unit.image
          ? <img src={unit.image} alt={unit.name} className="absolute inset-0 w-full h-full object-cover"/>
          : <div className="absolute inset-0 flex items-center justify-center">
              {isCore && <Crown size={10} className="text-black"/>}
              {unit.type === TYPES.TANK && !isCore && <Shield size={10} className="text-black"/>}
            </div>
        }
      </div>

      {/* コア: 体力を中央大きく表示 */}
      {isCore && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="font-bold text-black" style={{fontSize:"1.1rem"}}>{unit.hp}</div>
          <div className="text-gray-500" style={{fontSize:"0.45rem"}}>{unit.hp}/{unit.maxHp}</div>
          {unit.acted && <div className="text-gray-400" style={{fontSize:"0.4rem"}}>済</div>}
        </div>
      )}

      {/* 通常ユニット */}
      {!isCore && (
        <>
          {/* 中段: ATK・HP */}
          <div className="flex items-center justify-between border-b border-black flex-shrink-0" style={{fontSize:"0.5rem", padding:"0 2px"}}>
            <span className="font-bold">{unit.atk > 0 ? unit.atk : "－"}</span>
            <span className="text-gray-400" style={{fontSize:"0.42rem"}}>{rangeText(unit)}</span>
            <span className="font-bold">{unit.hp}/{unit.maxHp}</span>
          </div>
          {/* 下: 名前 */}
          <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-0.5">
            <div className="font-bold text-black text-center truncate w-full leading-none" style={{fontSize:"0.5rem"}}>{unit.name}</div>
            {unit.acted && <div className="text-gray-400 leading-none" style={{fontSize:"0.4rem"}}>済</div>}
          </div>
        </>
      )}
    </div>
  );
}

// 手札カード表示（59×86px）
export function CardFace({ card, image }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  const typeLabel = { unit:"ユニット", tank:"タンク", facility:"施設", spell:"スペル", magic:"魔法" }[card.type] || "";
  return (
    <div className="relative w-full h-full bg-white border border-black overflow-hidden flex flex-col" style={{borderRadius:"2px"}}>
      <CostTag cost={card.cost}/>
      {/* カード名 */}
      <div className="text-center font-bold leading-tight truncate border-b border-black" style={{fontSize:"0.58rem", padding:"1px 4px 1px 20px"}}>
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
      {/* ATK・射程・HP（右に射程表示） */}
      {!isSpellMagic && (
        <div className="flex items-center justify-between border-b border-black" style={{fontSize:"0.5rem", padding:"0 3px"}}>
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

// デッキ・図鑑用カードグリッド表示（CardFaceより少し情報量多め）
export function CardGrid({ card, image, count, onInc, onDec }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  return (
    <div className="relative flex flex-col bg-white border border-black overflow-hidden" style={{width:"100%", aspectRatio:"59/86"}}>
      <CostTag cost={card.cost}/>
      {/* カード名 */}
      <div className="text-center font-bold leading-tight truncate border-b border-black" style={{fontSize:"0.55rem", padding:"1px 4px 1px 18px"}}>
        {card.name}
      </div>
      {/* イラスト */}
      <div className="relative border-b border-black" style={{flex:"1 1 0", minHeight:0}}>
        {image
          ? <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover"/>
          : <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <span className="text-gray-300" style={{fontSize:"0.45rem"}}>
                {ATTR_LABELS[card.attr] || ""}
              </span>
            </div>
        }
      </div>
      {/* ステータス */}
      {!isSpellMagic && (
        <div className="flex items-center justify-between border-b border-black" style={{fontSize:"0.48rem", padding:"0 2px"}}>
          <span className="font-bold">{card.atk > 0 ? card.atk : "－"}</span>
          <span className="text-gray-500" style={{fontSize:"0.4rem"}}>{rangeText(card)}</span>
          <span className="font-bold">{card.hp}</span>
        </div>
      )}
      {/* 効果テキスト */}
      <div style={{fontSize:"0.4rem", padding:"1px 2px", minHeight:"12px"}}>
        <span className="text-gray-600 leading-tight line-clamp-2">{card.desc || ""}</span>
      </div>
      {/* デッキ枚数（onIncがある場合のみ表示） */}
      {onInc && (
        <div className="flex items-center justify-between border-t border-black" style={{padding:"1px 2px"}}>
          <button onClick={onDec} className="w-5 h-5 border border-black font-bold flex items-center justify-center" style={{fontSize:"0.7rem"}}>－</button>
          <span className="font-mono font-bold" style={{fontSize:"0.55rem"}}>{count || 0}</span>
          <button onClick={onInc} className="w-5 h-5 border border-black font-bold flex items-center justify-center" style={{fontSize:"0.7rem"}}>＋</button>
        </div>
      )}
    </div>
  );
}