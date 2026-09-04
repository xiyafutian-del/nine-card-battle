import { useState } from 'react';
import { Upload } from 'lucide-react';
import { TYPES, ATTRS, ATTR_LABELS, RANGE_TYPE } from '../constants/index.js';
import { TypeBadge, AttrBadge, rangeText } from '../components/CardParts.jsx';

const BLANK_FORM = {
  name:"", cost:1, hp:1, atk:1, hRange:1, vRange:1,
  rangeType:RANGE_TYPE.RECT, dRange:2,
  type:TYPES.UNIT, attr:ATTRS.NONE,
  effect:null, targetType:"none", desc:"",
};

function StatRow({ card }) {
  const isSpellMagic = card.type === TYPES.SPELL || card.type === TYPES.MAGIC;
  return (
    <div className="flex items-center text-xs text-black gap-2 mt-0.5 flex-wrap">
      {!isSpellMagic && card.hp  > 0 && <span>HP:{card.hp}</span>}
      {!isSpellMagic && card.atk > 0 && <span>ATK:{card.atk}</span>}
      {!isSpellMagic && <span>{rangeText(card)}</span>}
      {card.desc && <span className="text-gray-500 text-xs">{card.desc}</span>}
    </div>
  );
}

export function DexScreen({ cardPool, onAddCard, onEditCard, onDeleteCard, onBack, onImageUpload }) {
  const [form, setForm] = useState(BLANK_FORM);
  const [editId, setEditId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const fileInputRef = useState(null);
  const [imgTargetId, setImgTargetId] = useState(null);

  function startEdit(card) {
    setEditId(card.id);
    setForm({
      name: card.name, cost: card.cost, hp: card.hp, atk: card.atk,
      hRange: card.hRange || 1, vRange: card.vRange || 1,
      rangeType: card.rangeType || RANGE_TYPE.RECT, dRange: card.dRange || 2,
      type: card.type, attr: card.attr || ATTRS.NONE,
      effect: card.effect || null, targetType: card.targetType || "none",
      desc: card.desc || "",
    });
  }
  function cancelEdit() { setEditId(null); setForm(BLANK_FORM); }

  function save() {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      cost: Math.max(0, +form.cost || 0),
      hp:   Math.max(0, +form.hp   || 0),
      atk:  Math.max(0, +form.atk  || 0),
      hRange: [1,3,5].includes(+form.hRange) ? +form.hRange : 1,
      vRange: Math.max(1, +form.vRange || 1),
      rangeType: form.rangeType,
      dRange: Math.max(1, Math.min(5, +form.dRange || 2)),
      type: form.type, attr: form.attr,
      targetType: form.targetType, desc: form.desc,
      effect: form.effect,
    };
    if (editId != null) { onEditCard(editId, data); cancelEdit(); }
    else { onAddCard(data); setForm(BLANK_FORM); }
  }

  const isSpellMagic = form.type === TYPES.SPELL || form.type === TYPES.MAGIC;

  return (
    <div className="min-h-screen bg-white text-black px-4 py-6">
      <input
        type="file" accept="image/*" className="hidden"
        ref={fileInputRef}
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file || !imgTargetId) return;
          const reader = new FileReader();
          reader.onload = ev => onImageUpload(imgTargetId, ev.target.result);
          reader.readAsDataURL(file);
          setImgTargetId(null);
          e.target.value = "";
        }}
      />
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { cancelEdit(); onBack(); }} className="text-black text-sm">← ロビー</button>
          <h2 className="font-bold tracking-widest">カード図鑑</h2>
          <div className="w-12"/>
        </div>

        {/* フォーム */}
        <div className="border border-black p-3 mb-4">
          <div className="text-xs font-bold mb-2">{editId != null ? "カード編集" : "新規カード追加"}</div>
          <input
            className="w-full bg-white border border-black px-2 py-1 mb-2 text-sm text-black"
            placeholder="カード名" value={form.name}
            onChange={e => setForm({...form, name:e.target.value})}
          />
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[["cost","コスト",0],["hp","体力",0],["atk","攻撃",0],["vRange","縦射程",1]].map(([k,label,min]) => (
              <label key={k} className="text-xs text-black">{label}
                <input type="number" min={min}
                  className="w-full bg-white border border-black px-2 py-1 text-sm text-black"
                  value={form[k]} onChange={e => setForm({...form, [k]:e.target.value})}
                />
              </label>
            ))}

            {/* 射程タイプ */}
            <label className="text-xs text-black col-span-2">射程タイプ
              <select className="w-full bg-white border border-black px-2 py-1 text-sm text-black"
                value={form.rangeType} onChange={e => setForm({...form, rangeType:e.target.value})}>
                <option value={RANGE_TYPE.RECT}>長方形（H×V）</option>
                <option value={RANGE_TYPE.DIAMOND}>距離（ひし形）</option>
              </select>
            </label>
            {form.rangeType === RANGE_TYPE.RECT ? (
              <label className="text-xs text-black col-span-2">横射程
                <select className="w-full bg-white border border-black px-2 py-1 text-sm text-black"
                  value={form.hRange} onChange={e => setForm({...form, hRange:e.target.value})}>
                  <option value={1}>① 自分の列のみ</option>
                  <option value={3}>③ 左右1列まで</option>
                  <option value={5}>⑤ 左右2列まで</option>
                </select>
              </label>
            ) : (
              <label className="text-xs text-black col-span-2">距離射程（1〜5）
                <input type="number" min={1} max={5}
                  className="w-full bg-white border border-black px-2 py-1 text-sm text-black"
                  value={form.dRange} onChange={e => setForm({...form, dRange:e.target.value})}
                />
              </label>
            )}

            {/* 系統 */}
            <label className="text-xs text-black col-span-2">系統
              <select className="w-full bg-white border border-black px-2 py-1 text-sm text-black"
                value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                <option value={TYPES.UNIT}>ユニット</option>
                <option value={TYPES.TANK}>タンク</option>
                <option value={TYPES.FACILITY}>施設</option>
                <option value={TYPES.SPELL}>スペル（使い捨て）</option>
                <option value={TYPES.MAGIC}>魔法（繰り返し使用可）</option>
              </select>
            </label>

            {/* 属性 */}
            <label className="text-xs text-black col-span-2">属性
              <select className="w-full bg-white border border-black px-2 py-1 text-sm text-black"
                value={form.attr} onChange={e => setForm({...form, attr:e.target.value})}>
                {Object.entries(ATTRS).map(([k,v]) => (
                  <option key={v} value={v}>{ATTR_LABELS[v] || "無属性"}</option>
                ))}
              </select>
            </label>

            {/* スペル・魔法のみ */}
            {isSpellMagic && (
              <>
                <label className="text-xs text-black col-span-2">対象
                  <select className="w-full bg-white border border-black px-2 py-1 text-sm text-black"
                    value={form.targetType} onChange={e => setForm({...form, targetType:e.target.value})}>
                    <option value="none">対象なし（即時）</option>
                    <option value="enemy">敵1体</option>
                    <option value="enemy_noncore">敵1体（コア除く）</option>
                    <option value="ally">味方1体</option>
                    <option value="ally_wall">味方の壁1体</option>
                  </select>
                </label>
                <label className="text-xs text-black col-span-2">効果テキスト
                  <input
                    className="w-full bg-white border border-black px-2 py-1 text-sm text-black"
                    placeholder="例: 敵1体に3ダメージ"
                    value={form.desc} onChange={e => setForm({...form, desc:e.target.value})}
                  />
                </label>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="flex-1 bg-black text-white font-bold py-2">
              {editId != null ? "保存" : "追加"}
            </button>
            {editId != null && (
              <button onClick={cancelEdit} className="px-4 border border-black font-bold">キャンセル</button>
            )}
          </div>
        </div>

        {/* カード一覧 */}
        <div className="space-y-2 pb-8">
          {cardPool.map(c => (
            <div key={c.id} className="bg-white border border-black p-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-14 flex-shrink-0 border border-black flex items-center justify-center cursor-pointer overflow-hidden"
                  onClick={() => {
                    setImgTargetId(c.id);
                    fileInputRef.current?.click();
                  }}
                >
                  {c.image
                    ? <img src={c.image} alt="" className="w-full h-full object-cover"/>
                    : <Upload size={12} className="text-gray-400"/>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm flex items-center flex-wrap">
                    {c.name}<AttrBadge attr={c.attr}/><TypeBadge type={c.type}/>
                  </div>
                  <StatRow card={c}/>
                </div>
                <button onClick={() => startEdit(c)} className="text-xs text-black px-2 py-1 border border-black flex-shrink-0">編集</button>
                {c.id > 58 && (
                  deleteConfirmId === c.id ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { onDeleteCard(c.id); setDeleteConfirmId(null); }} className="text-xs text-white bg-black px-2 py-1">確定</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="text-xs border border-black px-2 py-1">取消</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(c.id)} className="text-xs text-black px-2 py-1 border border-black flex-shrink-0">削除</button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}