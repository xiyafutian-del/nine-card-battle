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
// public/cards/{id}.webp を置いたカードのidをここに追加
// src/assets/cards/ に置いた画像を自動で拾う（idがファイル名）
// ===== src/assets/cards/ の画像を自動で割り当て =====
const imageUrls = import.meta.glob('../assets/cards/*.{webp,png,jpg,jpeg}', {
  eager: true, query: '?url', import: 'default',
});
const mapFiles = import.meta.glob('../assets/cards/map.json', {
  eager: true, import: 'default',
});

const URL_BY_FILE = {};
Object.entries(imageUrls).forEach(([p, u]) => { URL_BY_FILE[p.split('/').pop()] = u; });

// map.json: { "ファイル名": カード名 または カードid }
const FILE_FOR = {};
Object.values(mapFiles).forEach(m =>
  Object.entries(m).forEach(([file, who]) => { FILE_FOR[String(who)] = file; }));

function imageFor(id, name) {
  const file = FILE_FOR[String(id)] || FILE_FOR[name];
  if (file && URL_BY_FILE[file]) return URL_BY_FILE[file];
  // map.json に無い場合は「カード名.拡張子」「カードid.拡張子」を探す
  for (const key of [name, String(id)])
    for (const ext of ["webp", "png", "jpg", "jpeg"]) {
      const u = URL_BY_FILE[`${key}.${ext}`];
      if (u) return u;
    }
  return null;
}


function card(id, name, cost, hp, atk, range, type, attr, extra = {}) {
  return {
    id, name, cost, hp, atk,
    ...parseRange(range),
    type: TYPES[type.toUpperCase()] || type,
    attr: ATTRS[attr.toUpperCase()] || attr,
    effect: extra.effect || null,
    conditional: extra.conditional || null,
    targetType: extra.targetType || "none",
    tags: extra.tags || [],
    desc: extra.desc || "",
    image: extra.image || imageFor(id),
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
  card(1,  "ソルジャー",        2, 1,  2, "1.1", "unit",     "none"),
  card(2,  "シールドガード",     2, 3,  1, "1.1", "unit",     "none"),
  card(3,  "アーチャー",         2, 1,  1, "d2", "unit",     "none"),
  card(4,  "アサシン",           3, 1,  4, "1.1", "unit",     "none"),
  card(5,  "ランサー",           4, 4,  2, "1.2", "unit",     "none"),
  card(6,  "メイジ",             4, 1,  2, "3.2", "unit",     "none"),
  card(8,  "ヘビーアーマー",     7, 8,  2, "1.1", "unit",     "none",{ tags:["タンク"] }),
card(14, "バスティオン",   14, 10, 4, "1.2", "tank", "none", { tags:["タンク"] }),
  card(9,  "スナイパー",         8, 1,  4, "d3", "unit",     "none"),
  card(11, "バリスタ",           9, 5,  3, "3.2", "unit",     "none"),
card(19, "やぐら",   8, 3, 2, "d3", "facility", "none"),

    card(13, "カカシ",       1, 1,  0, "1.1", "tank", "none", { tags:["タンク"] }),
    card(18, "柵",         1, 2, 0, "1.1", "facility", "none"),
  
  //日本
card(1101,  "侍",        3, 2,  2, "1.1", "unit",     "none",{ tags:["先制"] }),
card(1102,  "小次郎",        8, 5,  2, "3.1", "unit",     "none",{ tags:["2回行動"] }),
card(1103,  "忍者",        8, 2,  3, "3.1", "unit",     "none",{ tags:["先制","速攻"] }),
card(1104,  "火縄銃",       8, 3,  4, "1.3", "unit",     "none",{ tags:["速攻","反動"] }),
card(1109,  "狐",        99, 7,  2, "3.3", "unit",     "none",{ tags:["先制","2回行動"] }),

  // ── 施設 ──
    card(16, "太陽光発電機",  6, 5, 0, "1.1", "facility", "none",
    { effect:{ trigger:"turn_start", action:"gain_cost", amount:1 },
      desc:"ターン開始時コスト+1" }),
  card(17, "鍛冶場", 104, 4, 0, "1.1", "facility", "none",
    { effect:{ trigger:"passive", action:"forge_adj" },
      desc:"隣接するユニットのATK+1" }),
  
card(201, "魔法少女ルビー", 3, 3, 1, "1.1", "unit", "crystal", {
  conditional: {
    condition: { type: "cost_gte", value: 6 },
    effect:    { type: "atk_up",  value: 2 }, },
  desc: "コスト6以上の時ATK+2"}),

card(202, "魔法少女サファイア", 4, 1, 2, "3.1", "unit", "crystal", {
  conditional: {
    condition: { type: "cost_gte", value: 4 },
    effect:    { type: "vrange_up",  value: 1 },  },
  desc: "コスト4以上の時縦射程+1"}),

card(203, "魔法少女エメラルド", 6, 6, 2, "d3", "unit", "crystal", {
  conditional: {
    condition: { type: "cost_gte", value: 6 },
    effect:    { type: "add_tag",  value: "2回行動" },},
  desc: "コスト6以上の時2回行動"}),

card(204, "魔法少女ダイヤモンド", 5, 4, 4, "1.1", "unit", "crystal", {
  conditional: {
    condition: { type: "cost_gte", value: 8 },
    effect:    { type: "add_tag",  value: "タンク" },  },
  desc: "コスト8以上の時タンク"}),


  // ── スペル ──
  card(120, "乾電池",   0, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"self", action:"gain_cost", amount:1 },
      desc:"1コスト獲得" }),
card(121, "鉛蓄電池",   3, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"self", action:"gain_cost", amount:5 },
      desc:"5コスト獲得" }),

  card(21, "落雷",   92, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"select_enemy", action:"damage", amount:3 },
      targetType:"enemy", desc:"敵1体に3ダメージ" }),
  card(22, "加速",   93, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"self", action:"draw", amount:3 },
      desc:"3枚ドロー" }),
  card(23, "治癒",   92, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"select_ally", action:"heal", amount:3 },
      targetType:"ally", desc:"味方1体HP+3回復" }),
  card(24, "投石",   91, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"random_enemy", action:"damage", amount:1 },
      desc:"ランダムな敵に1ダメージ" }),
  card(25, "アロー", 92, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"select_enemy_noncore", action:"damage", amount:1 },
      targetType:"enemy_noncore", desc:"敵プレイヤー以外に1ダメージ" }),
  card(26, "スナイプ", 92, 0, 0, "1.1", "spell", "none",
    { effect:{ trigger:"activate", target:"enemy_core", action:"damage", amount:1 },
      desc:"敵プレイヤーに1ダメージ" }),
card(59, "咆哮", 93, 0, 0, "1.1", "spell", "none",
  { effect:{ trigger:"activate", target:"all_enemy_front", action:"stun" },
    desc:"相手前列全体をスタン（行動不可）" }),


  // ── 魔法 ──
  card(27, "爆炎",     95, 0, 0, "1.1", "magic", "none",
    { effect:{ trigger:"activate", target:"all_enemy_front", action:"damage", amount:3 },
      desc:"敵前列全体に3ダメージ" }),
  card(28, "強化の書", 94, 0, 0, "1.1", "magic", "none",
    { effect:{ trigger:"activate", target:"select_ally", action:"atk_up_temp", amount:3 },
      targetType:"ally", desc:"味方1体ATK+3（このターン）" }),

  // ── 機械属──
  card(1201, "ルンバ", 1, 1, 0, "1.1", "unit", "machine",
  { tags:["オーバークロック"], desc:"発動で追加行動。ターン終了時に破壊" }),
card(1202, "銃撃ドローン", 3, 1, 1, "d2", "unit", "machine",
  { tags:["オーバークロック"], desc:"発動で追加行動。ターン終了時に破壊" }),
card(1203,  "電脳侍",        8, 6,  2, "3.1", "unit",     "none",{ tags:["先制","2回行動","オーバークロック"], desc:"発動で追加行動。ターン終了時に破壊"  }),
card(1210, "工場", 9, 8, 0, "1.1", "facility", "none",
  { effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"machine" }, amount:1 },
    desc:"場にいる間機械属性の召喚コスト-1" }),
  card(29, "機械龍",     16, 10, 1, "d2", "unit", "machine",
    { effect:{ trigger:"link_machine", target:"self", action:"atk_up", amount:1 },
      desc:"機械属リンク時ATK+1" }),
  card(30, "大型採掘機", 11, 9, 0, "1.1", "facility", "machine",
    { effect:{ trigger:"link_machine", target:"self", action:"gain_cost", amount:1 },
      desc:"機械属リンク時コスト+1" }),
  card(31, "タレット",   7, 3, 1, "1.1", "facility", "machine",
    { effect:{ trigger:"link_machine", target:"enemy_front_col", action:"damage", amount:1 },
      desc:"機械属リンク時前列に1ダメージ" }),
    card(63, "冷却器", 4, 0, 0, "1.1", "spell", "machine",
  { effect:{ trigger:"activate", target:"select_ally", action:"unrotate" },
    targetType:"ally_machine", desc:"機械属1体を行動可能にする" }),

  // ── 龍属性 ──
  card(34, "幼龍", 5, 3, 1, "1.1", "unit", "dragon",
  { effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"dragon" }, amount:1 },desc:"場にいる間龍属性の召喚コスト-1" }),
card(12, "龍",           8, 7, 4, "d2", "unit",     "dragon"),
card(32, "骨龍", 95, 4, 3, "1.1", "unit", "dragon",
    { effect:{ trigger:"passive", action:"cost_minus_by_grave", filter:{ attr:"dragon" } },
      desc:"墓地の龍属性の数コスト-1" }),
 card(33, "龍王", 16, 15, 3, "3.2", "unit", "dragon",
  { effect:{ trigger:"passive", action:"atk_plus_by_field", filter:{ attr:"dragon" }, amount:1 },
    desc:"場の龍属性1体につきATK+1（自身を含む）" }),
card(44, "土龍", 96, 5, 2, "1.1", "unit", "earth",
  { effect:{ trigger:"active", action:"damage_multi", amount:3, times:3, consumesAction:true },
    desc:"スキル：ランダムな敵を3回選び、選ばれた回数×3ダメージ（1ターン1回・行動消費）" }),

   
  // ── 壁属性 ──
  card(36, "土壁", 2, 3, 0, "1.1", "facility", "wall", { tags:["施設"], desc:"安い壁" }),
  card(37, "岩壁", 5, 6, 0, "1.1", "facility", "wall", { tags:["施設"], desc:"硬い壁" }),

  // ── 土属性 ──

card(38, "ゴーレム", 6, 3, 2, "1.1", "unit", "earth",
  { effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"wall" }, amount:1 },desc:"場にいる間壁属性の召喚コスト-1" }),
card(42, "キングゴーレム", 9, 5, 3, "3.1", "unit", "earth",
     { effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"wall" }, amount:2 },desc:"場にいる間壁属性の召喚コスト-2" }),
  card(40, "マッドゴーレム", 92, 2, 1, "1.1", "unit", "earth",
    { effect:{ trigger:"on_summon", target:"adj_wall", action:"swap" },
      desc:"召喚時隣接する壁属性と位置を入れ替え" }),
  card(41, "サンドゴーレム", 93, 3, 2, "1.1", "unit", "earth",
    { effect:{ trigger:"activate", target:"select_ally_wall", action:"swap_self" },
      targetType:"ally_wall", desc:"場の壁属性と位置を入れ替え" }),
    card(43, "マグネットゴーレム", 93, 3, 2, "1.1", "unit", "earth",
    { effect:{ trigger:"passive", action:"magnet" },
      tags:["磁力"], desc:"ランダム効果の対象を自身に向ける" }),
  

//トランプtrump属性
card(1001,  "スペードのA",        1, 1,  1, "1.1", "unit",     "trump", {
  conditional: {
    condition: { type: "cost_gte", value: 13 },
    effect:    { type: "atk_up",  value: 13 },
  },desc: "コスト10以上の時ATK+10"}),
card(1002,  "スペードの2",        2, 1,  1, "1.1", "unit",     "trump", { tags:["2回行動","反動"] }),
card(1003,  "スペードの3",        3, 1,  1, "1.1", "unit",     "trump",
     { effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"trump" }, amount:1},
      desc:"トランプ属性の召喚コスト-1" }),
card(1004,  "スペードの4",        4, 2,  2, "1.4", "unit",     "trump"),
card(1005,  "スペードの5",        5, 3,  2, "5.1", "unit",     "trump"),
card(1006,  "スペードの6",        6, 7,  2, "1.1", "unit",     "none", { tags:["タンク"]}),
card(1007,  "スペードの7",        7, 1,  1, "1.1","unit", ["trump","7"],{
conditional: {
    condition: { type: "row_attr", value: "7", count: 3 },
    effect:    { type: "atk_up",  value: 7 },},
  desc: "同行に7が3体で攻撃+7"}),
card(1008,  "スペードの8",        8, 5,  3, "1.1", "unit",     "trump",{ tags:["先制"] }),
card(1011,  "スペードのJ",        11, 1,  11, "1.1", "unit",     "trump"),

//ヨーロッパ
  // 同行にEU属性3体
card(1201, "盾兵", 4, 5, 1, "1.1", "unit", "eu", {
  conditional: {
    condition: { type: "row_attr", value: "eu", count: 3 },
    effect:    { type: "tag_add",  value: "タンク" },},
  desc: "同行にヨーロッパ属性3体でタンク"}),
  card(1202, "弓兵", 4, 2, 2, "1.2", "unit", "eu", {
  conditional: {
    condition: { type: "row_attr", value: "eu", count: 3 },
    effect:    { type: "vrange_up",  value: 1 },},
  desc: "同行にヨーロッパ属性3体で縦射程+1"}),
  card(1203, "槍兵", 6, 3, 2, "1.2", "unit", "eu", {
  conditional: {
    condition: { type: "col_attr", value: "eu", count: 2 },
    effect:    { type: "atk_up",  value: 2 },},
  desc: "同列にヨーロッパ属性2体で攻撃+2"}),
  card(1204, "カタパルト", 12, 5, 4, "3.2", "unit", "eu",{ tags:["反動"] }, {
  conditional: {
    condition: { type: "col_attr", value: "eu", count: 3 },
    effect:    { type: "vrange_up",  value: 2 },},
  desc: "同列にヨーロッパ属性3体で縦射程+1"}),
  card(1205, "チャリオット", 17, 9, 2, "1.1", "unit", "eu",{ tags:["先制","2回行動"] }, {
  conditional: {
    condition: { type: "col_attr", value: "eu", count: 3 },
    effect:    { type: "atk_up",  value: 2 },},
  desc: "同列にヨーロッパ属性3体で攻撃+2"}),

  // ── 草属性施設（成長チェーン） ──
  card(45, "地衣類", 0, 1, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:["grass","bug"] }, maxCost:3 },
      tags:["成長3(草,虫)"], desc:"手札の草・虫属性コスト3以下を召喚" }),
  card(46, "草本",   1, 2, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:["grass","bug"] }, maxCost:4 },
      tags:["成長4(草,虫)"], desc:"手札の草•虫属性コスト4以下を召喚" }),
  card(47, "低木林",   4, 2, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:7 },
      tags:["成長7(草)"], desc:"手札の草属性コスト7以下を召喚" }),
  card(48, "陽樹林",   7, 3, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:10 },
      tags:["成長10(草)"], desc:"手札の草属性コスト10以下を召喚" }),
  card(49, "混合林", 8, 4, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:11 },
      tags:["成長11(草)"], desc:"手札の草属性コスト11以下を召喚" }),
  card(50, "陰樹林",   10, 5, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:13 },
      tags:["成長13(草)"], desc:"手札の草属性コスト13以下を召喚" }),
  card(51, "極相樹",   12, 6, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"activate", action:"growth", filter:{ attr:"grass" }, maxCost:15 },
      tags:["成長15(草)"], desc:"手札の草属性コスト15以下を召喚" }),


  // ── 草属性ユニット ──
  card(3100, "アリ",       1, 1, 1, "1.1", "unit", "bug"),
  card(3101, "シダンゴ虫",      3, 4, 1, "1.1", "unit", "bug"),
  card(3102, "羽葉蝶",       4, 2, 2, "3.1", "unit", "bug"),
  card(3103, "点灯虫",       6, 1, 3, "d2", "unit", "bug",{ tags:["タンク"] }),
  card(54, "食虫木",       94, 2, 3, "1.1", "unit", "grass",
    { effect:{ trigger:"on_attack", target:"self", action:"heal", amount:"damage_dealt" },
      desc:"攻撃時与ダメージ分HP回復" }),
  card(56, "ボムツリー",   97, 3, 4, "3.1", "unit", "grass",
    { effect:{ trigger:"on_death", target:"adj_all", action:"damage", amount:2 },
      desc:"破壊時隣接する全カードに2ダメージ" }),
card(57, "自然龍",       14, 13, 5, "d3", "unit", "grass",
    { effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"grass" }, amount:1 },
      desc:"草属性の召喚コスト-1" }),
  card(3120, "世界樹",       15, 15, 0, "1.1", "facility", "grass",
    { effect:{ trigger:"passive", action:"cost_minus_attr", filter:{ attr:"grass" }, amount:2 },
      desc:"草属性の召喚コスト-2" }),
  // ── 草魔法 ──
  card(58, "大自然の循環", 12, 0, 0, "1.1", "magic", "grass",
    { effect:{ trigger:"activate", target:"grave", action:"recycle", filter:{ attr:"grass" } },
     desc:"墓地の草属性を全てデッキに戻す" }),

   
card(65, "モノリス", 11, 11, 0, "1.1", "facility", "none",
  { effect:{ trigger:"on_summon", action:"draw_all", both:true },
    desc:"召喚時お互いのプレイヤーは山札を全て引く" }),
];

