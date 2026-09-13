import { TYPES, ATTRS } from './index.js';

// ============ 射程パース ============
function parseRange(r) {
  if (typeof r === "string" && r.startsWith("d")) {
    return { rangeType: "diamond", dRange: parseInt(r.slice(1)) || 1, hRange: 1, vRange: 1 };
  }
  const parts = String(r).split(".");
  return { rangeType: "rect", hRange: parseInt(parts[0]) || 1, vRange: parseInt(parts[1]) || 1 };
}

// ============ カード定義ヘルパー ============
function card(id, name, cost, hp, atk, range, type, attr, extra = {}) {
  return {
    id, name, cost, hp, atk,
    ...parseRange(range),
    type: TYPES[type.toUpperCase()] || type,
    attr: ATTRS[attr.toUpperCase()] || attr,
    effect: extra.effect || null,
    tags: extra.tags || [],
    desc: extra.desc || "",
  };
}

export const CORE_CARD = {
  id: "core", name: "コア", cost: 0, hp: 10, atk: 1,
  hRange: 1, vRange: 1, rangeType: "rect",
  type: TYPES.UNIT, attr: ATTRS.NONE,
  tags: [], desc: "", isCore: true,
};

export const INITIAL_CARDS = [
  // ── 無属性ユニット ──
  card(1,  "ソルジャー",        1, 1,  2, "1.1", "unit",     "none"),
  card(2,  "シールドガード",     1, 3,  1, "1.1", "unit",     "none"),
  card(3,  "アーチャー",         1, 1,  1, "d2", "unit",     "none"),
  card(4,  "アサシン",           2, 1,  4, "1.1", "unit",     "none"),
  card(5,  "ランサー",           2, 3,  2, "1.2", "unit",     "none"),
  card(6,  "メイジ",             3, 2,  2, "3.2", "unit",     "none"),
  card(7,  "ファランクス",       4, 6,  3, "3.1", "unit",     "none"),
  card(8,  "ヘビーアーマー",     4, 8,  2, "1.1", "unit",     "none",{ tags:["タンク"] }),
  card(9,  "スナイパー",         4, 1,  4, "d3", "unit",     "none"),
  card(10, "茂み",           0, 1,  0, "1.1", "unit",     "none"),
  card(11, "バリスタ",           5, 5,  3, "3.2", "unit",     "none"),
  card(12, "ドラゴン",           7, 9, 6, "3.3", "unit",     "none"),
  card(13, "ガードマン",       2, 2,  1, "1.1", "tank", "none", { tags:["タンク"] }),
  card(14, "スチールバスティオン",   105, 12, 2, "1.1", "tank", "none", { tags:["タンク"] }),
  // ── 施設 ──
  card(15, "畑",     103, 3, 0, "1.1", "facility", "none",
    { effect:{ trigger:"turn_start", action:"gain_cost", amount:1 },
      desc:"ターン開始時コスト+1" }),
  card(16, "商店",   105, 6, 0, "1.1", "facility", "none",
    { effect:{ trigger:"turn_start", action:"gain_cost", amount:1 },
      desc:"ターン開始時コスト+1" }),
  card(17, "鍛冶場", 104, 4, 0, "1.1", "facility", "none",
    { effect:{ trigger:"passive", action:"forge_adj" },
      desc:"隣接するユニットのATK+1" }),
  card(18, "大砲",         5, 4, 2, "3.3", "facility", "none"),
  card(19, "やぐら",   4, 3, 2, "d3", "facility", "none"),

  // ── スペル ──
  card(20, "幸運",   0, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"self", action:"gain_cost", amount:1 },
      desc:"1コスト獲得" }),
  card(21, "落雷",   102, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"select_enemy", action:"damage", amount:3 },
      targetType:"enemy", desc:"敵1体に3ダメージ" }),
  card(22, "増援",   103, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"self", action:"draw", amount:2 },
      desc:"2枚ドロー" }),
  card(23, "治癒",   102, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"select_ally", action:"heal", amount:3 },
      targetType:"ally", desc:"味方1体HP+3回復" }),
  card(24, "投石",   1, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"random_enemy", action:"damage", amount:1 },
      desc:"ランダムな敵に1ダメージ" }),
  card(25, "アロー", 2, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"select_enemy_noncore", action:"damage", amount:1 },
      targetType:"enemy_noncore", desc:"敵プレイヤー以外に1ダメージ" }),
  card(26, "スナイプ", 102, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"enemy_core", action:"damage", amount:1 },
      desc:"敵プレイヤーに1ダメージ" }),

  // ── 魔法 ──
  card(27, "爆炎",     105, 0, 0, "1.1", "magic", "none",
    { effect:{ trigger:"activate", target:"all_enemy_front", action:"damage", amount:3 },
      desc:"敵前列全体に3ダメージ" }),
  card(28, "強化の書", 104, 0, 0, "1.1", "magic", "none",
    { effect:{ trigger:"activate", target:"select_ally", action:"atk_up_temp", amount:3 },
      targetType:"ally", desc:"味方1体ATK+3（このターン）" }),

  // ── 機械属 ──
  card(29, "機械龍",     105, 6, 3, "1.2", "unit", "machine",
    { effect:{ trigger:"link_machine", target:"self", action:"atk_up", amount:1 },
      desc:"機械属リンク時ATK+1" }),
  card(30, "大型採掘機", 104, 5, 2, "1.1", "unit", "machine",
    { effect:{ trigger:"link_machine", target:"self", action:"gain_cost", amount:1 },
      desc:"機械属リンク時コスト+1" }),
  card(31, "タレット",   103, 3, 1, "1.1", "facility", "machine",
    { effect:{ trigger:"link_machine", target:"enemy_front_col", action:"damage", amount:1 },
      desc:"機械属リンク時前列に1ダメージ" }),

  // ── 龍属性 ──
  card(32, "骨龍", 105, 4, 3, "1.1", "unit", "dragon",
    { effect:{ trigger:"passive", action:"cost_minus_by_grave", filter:{ attr:"dragon" } },
      desc:"墓地の龍属性の数コスト-1" }),
  card(33, "龍王", 107, 8, 4, "3.2", "unit", "dragon",
    { effect:{ trigger:"passive", action:"atk_plus_by_field", filter:{ attr:"dragon" } },
      desc:"場の龍属性の数ATK+1" }),
  card(34, "幼龍", 101, 1, 1, "1.1", "unit", "dragon",
    { effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"dragon" }, amount:1, maxStack:3 },
      desc:"龍属性の召喚コスト-1（3枚まで）" }),
  card(35, "龍",   105, 6, 5, "1.2", "unit", "dragon"),

  // ── 壁属性 ──
  card(36, "土壁", 1, 3, 0, "1.1", "facility", "wall", { tags:["施設"], desc:"安価な壁施設" }),
  card(37, "岩壁", 3, 8, 0, "1.1", "facility", "wall", { tags:["施設"], desc:"硬い壁施設" }),

  // ── 土属性 ──
  card(38, "ゴーレム", 3, 3, 2, "1.1", "unit", "earth",
    { effect:{ trigger:"on_attack", target:"next_summon", action:"cost_minus_attr", filter:{ attr:"wall" }, amount:1 },
      desc:"攻撃時次の壁属性コスト-1" }),
  card(39, "ロックゴーレム", 4, 4, 2, "1.1", "unit", "earth",
    { effect:{ trigger:"on_summon", target:"hand", action:"free_summon", filter:{ name:"岩壁" } },
      desc:"召喚時手札の岩壁を無償召喚" }),
  card(40, "マッドゴーレム", 2, 2, 1, "1.1", "unit", "earth",
    { effect:{ trigger:"on_summon", target:"adj_wall", action:"swap" },
      desc:"召喚時隣接する壁属性と位置を入れ替え" }),
  card(41, "サンドゴーレム", 3, 3, 2, "1.1", "unit", "earth",
    { effect:{ trigger:"activate", target:"select_ally_wall", action:"swap_self" },
      targetType:"ally_wall", desc:"場の壁属性と位置を入れ替え" }),
  card(42, "キングゴーレム", 5, 5, 3, "3.1", "unit", "earth",
    { effect:{ trigger:"on_summon", target:"hand", action:"free_summon", filter:{ attr:"wall" }, quick:true },
      tags:["速攻"], desc:"召喚時手札の壁属性を無償召喚" }),
  card(43, "マグネットゴーレム", 3, 3, 2, "1.1", "unit", "earth",
    { effect:{ trigger:"passive", action:"magnet" },
      tags:["磁力"], desc:"ランダム効果の対象を自身に向ける" }),
  card(44, "土龍", 6, 5, 2, "1.1", "unit", "earth",
    { effect:{ trigger:"activate", target:"random_enemy_multi", action:"damage_multi", amount:3, times:3 },
      desc:"ランダムに3回選び選ばれた回数×3ダメージ" }),

  // ── 草属性施設（成長チェーン） ──
  card(45, "蘚苔類", 0, 1, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:["grass","bug"] }, maxCost:2 },
      tags:["成長2(草,虫)"], desc:"手札の草・虫属性コスト2以下を召喚" }),
  card(46, "草本",   1, 2, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:3 },
      tags:["成長3(草)"], desc:"手札の草属性コスト3以下を召喚" }),
  card(47, "実生",   2, 2, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:4 },
      tags:["成長4(草)"], desc:"手札の草属性コスト4以下を召喚" }),
  card(48, "幼木",   3, 3, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:5 },
      tags:["成長5(草)"], desc:"手札の草属性コスト5以下を召喚" }),
  card(49, "亜高木", 4, 4, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:6 },
      tags:["成長6(草)"], desc:"手札の草属性コスト6以下を召喚" }),
  card(50, "成木",   5, 5, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:7 },
      tags:["成長7(草)"], desc:"手札の草属性コスト7以下を召喚" }),
  card(51, "巨樹",   6, 6, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:8 },
      tags:["成長8(草)"], desc:"手札の草属性コスト8以下を召喚" }),
  card(52, "極相樹", 7, 8, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:9 },
      tags:["成長9(草)"], desc:"手札の草属性コスト9以下を召喚" }),

  // ── 草属性ユニット ──
  card(53, "羽葉蝶",       3, 2, 2, "3.1", "unit", "bug"),
  card(54, "食虫木",       4, 5, 3, "1.1", "unit", "grass",
    { effect:{ trigger:"on_attack", target:"self", action:"heal", amount:"damage_dealt" },
      desc:"攻撃時与ダメージ分HP回復" }),
  card(55, "わたげツリー", 6, 5, 2, "3.2", "unit", "grass",
    { effect:{ trigger:"on_summon", target:"hand", action:"free_summon", filter:{ attr:"grass", maxCost:0 } },
      desc:"召喚時手札のコスト0草属性を無償召喚" }),
  card(56, "ボムツリー",   7, 6, 4, "3.1", "unit", "grass",
    { effect:{ trigger:"on_death", target:"adj_all", action:"damage", amount:3 },
      desc:"破壊時隣接する全カードに3ダメージ" }),
  card(57, "自然龍",       9, 10, 6, "3.3", "unit", "grass",
    { effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"grass" }, amount:1 },
      desc:"草属性の召喚コスト-1" }),

  // ── 草魔法 ──
  card(58, "大自然の循環", 6, 0, 0, "1.1", "magic", "grass",
    { effect:{ trigger:"activate", target:"grave", action:"recycle", filter:{ attr:"grass" } },
      desc:"墓地の草属性を全てデッキに戻す" }),

  card(59, "咆哮", 3, 0, 0, "1.1", "spell", "none",
  { effect:{ trigger:"activate", target:"all_enemy_front", action:"stun" },
    desc:"相手前列全体をスタン（行動不可）" }),
];
