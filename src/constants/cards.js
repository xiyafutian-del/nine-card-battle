import { TYPES, ATTRS, RANGE_TYPE } from './index.js';

export const CORE_CARD = {
  id:"core", name:"コア", cost:0, hp:10, atk:1,
  hRange:1, vRange:1, type:TYPES.UNIT, attr:ATTRS.NONE,
};

export const INITIAL_CARDS = [
  // 無属性ユニット
  { id:1,  name:"ソルジャー",     cost:1, hp:3,  atk:2, hRange:1, vRange:1, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:2,  name:"シールドガード", cost:1, hp:5,  atk:1, hRange:1, vRange:1, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:3,  name:"アーチャー",     cost:2, hp:2,  atk:2, hRange:1, vRange:2, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:4,  name:"アサシン",       cost:2, hp:2,  atk:4, hRange:1, vRange:1, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:5,  name:"ランサー",       cost:3, hp:4,  atk:3, hRange:1, vRange:2, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:6,  name:"メイジ",         cost:3, hp:2,  atk:4, hRange:3, vRange:2, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:7,  name:"ファランクス",   cost:4, hp:6,  atk:2, hRange:3, vRange:1, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:8,  name:"ヘビーアーマー", cost:4, hp:8,  atk:2, hRange:1, vRange:1, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:9,  name:"スナイパー",     cost:4, hp:1,  atk:5, hRange:1, vRange:3, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:10, name:"キャノン",       cost:5, hp:4,  atk:6, hRange:1, vRange:2, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:11, name:"バリスタ",       cost:5, hp:3,  atk:5, hRange:3, vRange:3, type:TYPES.UNIT,     attr:ATTRS.NONE },
  { id:12, name:"ドラゴン",       cost:7, hp:10, atk:7, hRange:3, vRange:3, type:TYPES.UNIT,     attr:ATTRS.NONE },
  // タンク
  { id:13, name:"アイアンウォール",     cost:3, hp:8,  atk:1, hRange:1, vRange:1, type:TYPES.TANK, attr:ATTRS.NONE },
  { id:14, name:"スチールバスティオン", cost:5, hp:12, atk:2, hRange:1, vRange:1, type:TYPES.TANK, attr:ATTRS.NONE },
  // 施設
  { id:15, name:"畑",     cost:3, hp:3, atk:0, hRange:1, vRange:1, type:TYPES.FACILITY, attr:ATTRS.NONE, effect:{ trigger:"turn_start", action:"gain_cost", amount:1 } },
  { id:16, name:"商店",   cost:5, hp:6, atk:0, hRange:1, vRange:1, type:TYPES.FACILITY, attr:ATTRS.NONE, effect:{ trigger:"turn_start", action:"gain_cost", amount:1 } },
  { id:17, name:"鍛冶場", cost:4, hp:4, atk:0, hRange:1, vRange:1, type:TYPES.FACILITY, attr:ATTRS.NONE, effect:{ trigger:"passive",    action:"forge_adj" } },
  { id:18, name:"大砲",   cost:5, hp:5, atk:6, hRange:3, vRange:2, type:TYPES.FACILITY, attr:ATTRS.NONE },
  { id:19, name:"物見やぐら", cost:3, hp:3, atk:3, hRange:1, vRange:3, type:TYPES.FACILITY, attr:ATTRS.NONE },
  // スペル
  { id:20, name:"幸運",   cost:0, hp:0, atk:0, type:TYPES.SPELL, attr:ATTRS.NONE, targetType:"none", desc:"1コスト獲得", effect:{ trigger:"activate", target:"self",         action:"gain_cost",    amount:1 } },
  { id:21, name:"落雷",   cost:2, hp:0, atk:0, type:TYPES.SPELL, attr:ATTRS.NONE, targetType:"enemy", desc:"敵1体に3ダメージ", effect:{ trigger:"activate", target:"select_enemy", action:"damage",       amount:3 } },
  { id:22, name:"増援",   cost:3, hp:0, atk:0, type:TYPES.SPELL, attr:ATTRS.NONE, targetType:"none", desc:"2枚ドロー", effect:{ trigger:"activate", target:"self",         action:"draw",         amount:2 } },
  { id:23, name:"治癒",   cost:2, hp:0, atk:0, type:TYPES.SPELL, attr:ATTRS.NONE, targetType:"ally", desc:"味方1体HP+3回復", effect:{ trigger:"activate", target:"select_ally",  action:"heal",         amount:3 } },
  { id:24, name:"投石",   cost:1, hp:0, atk:0, type:TYPES.SPELL, attr:ATTRS.NONE, targetType:"none", desc:"ランダムな敵に1ダメージ", effect:{ trigger:"activate", target:"random_enemy", action:"damage",       amount:1 } },
  { id:25, name:"アロー", cost:2, hp:0, atk:0, type:TYPES.SPELL, attr:ATTRS.NONE, targetType:"enemy_noncore", desc:"敵プレイヤー以外に1ダメージ", effect:{ trigger:"activate", target:"select_enemy_noncore", action:"damage", amount:1 } },
  { id:26, name:"スナイプ", cost:2, hp:0, atk:0, type:TYPES.SPELL, attr:ATTRS.NONE, targetType:"none", desc:"敵プレイヤーに1ダメージ", effect:{ trigger:"activate", target:"enemy_core", action:"damage", amount:1 } },
  // 魔法
  { id:27, name:"爆炎",     cost:5, hp:0, atk:0, type:TYPES.MAGIC, attr:ATTRS.NONE, targetType:"none", desc:"敵前列全体に3ダメージ", effect:{ trigger:"activate", target:"all_enemy_front", action:"damage",   amount:3 } },
  { id:28, name:"強化の書", cost:4, hp:0, atk:0, type:TYPES.MAGIC, attr:ATTRS.NONE, targetType:"ally", desc:"味方1体ATK+3（このターン）", effect:{ trigger:"activate", target:"select_ally", action:"atk_up_temp", amount:3 } },
  // 機械属
  { id:29, name:"機械龍",     cost:5, hp:6, atk:3, hRange:1, vRange:2, type:TYPES.UNIT,     attr:ATTRS.MACHINE, effect:{ trigger:"link_machine", target:"self",      action:"atk_up",   amount:1 } },
  { id:30, name:"大型採掘機", cost:4, hp:5, atk:2, hRange:1, vRange:1, type:TYPES.UNIT,     attr:ATTRS.MACHINE, effect:{ trigger:"link_machine", target:"self",      action:"gain_cost",amount:1 } },
  { id:31, name:"タレット",   cost:3, hp:3, atk:1, hRange:1, vRange:1, type:TYPES.FACILITY, attr:ATTRS.MACHINE, effect:{ trigger:"link_machine", target:"enemy_front_col", action:"damage", amount:1 } },
  // 龍属性
  { id:32, name:"骨龍", cost:5, hp:4, atk:3, hRange:1, vRange:1, type:TYPES.UNIT, attr:ATTRS.DRAGON, effect:{ trigger:"passive", action:"cost_minus_by_grave", filter:{ attr:"dragon" } } },
  { id:33, name:"龍王", cost:7, hp:8, atk:4, hRange:3, vRange:2, type:TYPES.UNIT, attr:ATTRS.DRAGON, effect:{ trigger:"passive", action:"atk_plus_by_field", filter:{ attr:"dragon" } } },
  { id:34, name:"幼龍", cost:1, hp:1, atk:1, hRange:1, vRange:1, type:TYPES.UNIT, attr:ATTRS.DRAGON, effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"dragon" }, amount:1, maxStack:3 } },
  { id:35, name:"龍",   cost:5, hp:6, atk:5, hRange:1, vRange:2, type:TYPES.UNIT, attr:ATTRS.DRAGON },
  // 壁属性
  { id:36, name:"土壁", cost:1, hp:3, atk:0, hRange:1, vRange:1, type:TYPES.FACILITY, attr:ATTRS.WALL, desc:"安価な壁施設" },
  { id:37, name:"岩壁", cost:3, hp:8, atk:0, hRange:1, vRange:1, type:TYPES.FACILITY, attr:ATTRS.WALL, desc:"硬い壁施設" },
  // 土属性
  { id:38, name:"ゴーレム",         cost:3, hp:3, atk:2, hRange:1, vRange:1, type:TYPES.UNIT, attr:ATTRS.EARTH, effect:{ trigger:"on_attack", target:"next_summon", action:"cost_minus_attr", filter:{ attr:"wall" }, amount:1 } },
  { id:39, name:"ロックゴーレム",   cost:4, hp:4, atk:2, hRange:1, vRange:1, type:TYPES.UNIT, attr:ATTRS.EARTH, effect:{ trigger:"on_summon", target:"hand",        action:"free_summon",    filter:{ name:"岩壁" } } },
  { id:40, name:"マッドゴーレム",   cost:2, hp:2, atk:1, hRange:1, vRange:1, type:TYPES.UNIT, attr:ATTRS.EARTH, effect:{ trigger:"on_summon", target:"adj_wall",    action:"swap" } },
  { id:41, name:"サンドゴーレム",   cost:3, hp:3, atk:2, hRange:1, vRange:1, type:TYPES.UNIT, attr:ATTRS.EARTH, effect:{ trigger:"activate", target:"select_ally_wall", action:"swap_self" }, targetType:"ally_wall", desc:"場の壁と位置を入れ替え" },
  { id:42, name:"キングゴーレム",   cost:5, hp:5, atk:3, hRange:3, vRange:1, type:TYPES.UNIT, attr:ATTRS.EARTH, effect:{ trigger:"on_summon", target:"hand", action:"free_summon", filter:{ attr:"wall" }, quick:true } },
  { id:43, name:"マグネットゴーレム", cost:3, hp:3, atk:2, hRange:1, vRange:1, type:TYPES.UNIT, attr:ATTRS.EARTH, effect:{ trigger:"passive", action:"magnet" } },
  { id:44, name:"土龍",             cost:6, hp:5, atk:2, hRange:1, vRange:1, type:TYPES.UNIT, attr:ATTRS.EARTH, effect:{ trigger:"activate", target:"random_enemy_multi", action:"damage_multi", amount:3, times:3 }, targetType:"none", desc:"ランダムに3回選び選ばれた回数×3ダメージ" },
  // 草属性施設（成長チェーン）
  { id:45, name:"蘚苔類", cost:0, hp:1, atk:0, type:TYPES.FACILITY, attr:ATTRS.GRASS, effect:{ trigger:"activate", action:"growth", filter:{ attr:["grass","bug"] }, maxCost:2 }, targetType:"none", desc:"成長(草・虫)コスト2以下" },
  { id:46, name:"草本",   cost:1, hp:2, atk:0, type:TYPES.FACILITY, attr:ATTRS.GRASS, effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:3 }, targetType:"none", desc:"成長(草)コスト3以下" },
  { id:47, name:"実生",   cost:2, hp:2, atk:0, type:TYPES.FACILITY, attr:ATTRS.GRASS, effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:4 }, targetType:"none", desc:"成長(草)コスト4以下" },
  { id:48, name:"幼木",   cost:3, hp:3, atk:0, type:TYPES.FACILITY, attr:ATTRS.GRASS, effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:5 }, targetType:"none", desc:"成長(草)コスト5以下" },
  { id:49, name:"亜高木", cost:4, hp:4, atk:0, type:TYPES.FACILITY, attr:ATTRS.GRASS, effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:6 }, targetType:"none", desc:"成長(草)コスト6以下" },
  { id:50, name:"成木",   cost:5, hp:5, atk:0, type:TYPES.FACILITY, attr:ATTRS.GRASS, effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:7 }, targetType:"none", desc:"成長(草)コスト7以下" },
  { id:51, name:"巨樹",   cost:6, hp:6, atk:0, type:TYPES.FACILITY, attr:ATTRS.GRASS, effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:8 }, targetType:"none", desc:"成長(草)コスト8以下" },
  { id:52, name:"極相樹", cost:7, hp:8, atk:0, type:TYPES.FACILITY, attr:ATTRS.GRASS, effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:9 }, targetType:"none", desc:"成長(草)コスト9以下" },
  // 草属性ユニット
  { id:53, name:"羽葉蝶",       cost:3, hp:2, atk:2, hRange:3, vRange:1, type:TYPES.UNIT, attr:ATTRS.BUG },
  { id:54, name:"食虫木",       cost:4, hp:5, atk:3, hRange:1, vRange:1, type:TYPES.UNIT, attr:ATTRS.GRASS, effect:{ trigger:"on_attack", target:"self", action:"heal", amount:"damage_dealt" } },
  { id:55, name:"わたげツリー", cost:6, hp:5, atk:2, hRange:3, vRange:2, type:TYPES.UNIT, attr:ATTRS.GRASS, effect:{ trigger:"on_summon", target:"hand", action:"free_summon", filter:{ attr:"grass", maxCost:0 } } },
  { id:56, name:"ボムツリー",   cost:7, hp:6, atk:4, hRange:3, vRange:1, type:TYPES.UNIT, attr:ATTRS.GRASS, effect:{ trigger:"on_death", target:"adj_all", action:"damage", amount:3 } },
  { id:57, name:"自然龍",       cost:9, hp:10, atk:6, hRange:3, vRange:3, type:TYPES.UNIT, attr:ATTRS.GRASS, effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"grass" }, amount:1 } },
  // 草魔法
  { id:58, name:"大自然の循環", cost:6, hp:0, atk:0, type:TYPES.MAGIC, attr:ATTRS.GRASS, targetType:"none", desc:"墓地の草属性をデッキに戻す", effect:{ trigger:"activate", target:"grave", action:"recycle", filter:{ attr:"grass" } } },
];