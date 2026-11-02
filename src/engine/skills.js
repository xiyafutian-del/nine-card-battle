// スキル判定（useBattle・Board・BattleScreen 共通）
// 能動スキル: effect.trigger === "active"。選択中の自身をもう一度タップで発動
//   effect.consumesAction: false にすると行動を消費しない（既定は消費）

export const hasActiveSkill = u => u?.effect?.trigger === "active";

// オーバークロック: 行動済み（回転中）の時だけ発動できる
export const canOverclock = u =>
  !!u && !!u.tags?.includes("オーバークロック") && !!u.acted && !u.overclocked;

// 能動スキルを今使えるか（1ターン1回・行動消費型は未行動のときのみ）
export const canUseActive = u =>
  hasActiveSkill(u) && !u.abilityUsed &&
  (u.effect.consumesAction === false || (!u.acted && !u.stunned));

// 「もう一度タップで発動」できる状態か
export const skillReady = u => !!u && (canOverclock(u) || canUseActive(u));
