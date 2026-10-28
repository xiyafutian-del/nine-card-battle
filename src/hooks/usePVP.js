import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function usePVP(onStateUpdate) {
  const [roomId, setRoomId] = useState("");
  const [inputRoomId, setInputRoomId] = useState("");
  const [pvpRole, setPvpRole] = useState(null);
  const [pvpStatus, setPvpStatus] = useState("idle");
  const [error, setError] = useState("");
  const [absentSec, setAbsentSec] = useState(0); // 相手の不在秒数（0=接続中）

  const channelRef = useRef(null);
  const roleRef = useRef(null);
  const roomIdRef = useRef("");
  const statusRef = useRef("idle");
  const revRef = useRef(0);                 // 受信・送信した最新の通し番号
  const absentSinceRef = useRef(null);
  const sendRef = useRef({ busy: false, pending: null });
  const onUpdateRef = useRef(onStateUpdate);
  onUpdateRef.current = onStateUpdate;      // 常に最新のコールバックを使う

  function otherRole() {
    return roleRef.current === "host" ? "guest" : "host";
  }

  function setStatus(s) {
    if (s === "playing" && statusRef.current !== "playing") {
      // 対戦開始時点の相手の接続状況で不在タイマーを初期化
      const online = (channelRef.current?.presenceState?.()[otherRole()] || []).length > 0;
      absentSinceRef.current = online ? null : Date.now();
    }
    statusRef.current = s;
    setPvpStatus(s);
  }

  // 相手からの状態を反映（古い通し番号は無視）
  function applyIncoming(row) {
    if (!row?.state) return;
    if (row.updated_by === roleRef.current) return;
    const rev = row.state.rev || 0;
    if (rev < revRef.current) return;
    revRef.current = Math.max(revRef.current, rev);
    onUpdateRef.current?.(row.state, row.status);
  }

  function subscribeToRoom(id, role) {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const other = role === "host" ? "guest" : "host";
    const ch = supabase.channel("room-" + id, { config: { presence: { key: role } } });

    ch.on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${id}`,
      }, payload => {
        const row = payload.new;
        if (roleRef.current === "host" && row.status === "ready") setStatus("playing");
        applyIncoming(row);
      })
      .on("presence", { event: "sync" }, () => {
        const online = (ch.presenceState()[other] || []).length > 0;
        absentSinceRef.current = online ? null : (absentSinceRef.current ?? Date.now());
        if (online) setAbsentSec(0);
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
      });

    channelRef.current = ch;
  }

  async function createRoom(initialState) {
    setError("");
    const id = generateRoomId();
    const { error: err } = await supabase.from("rooms").insert({
      id,
      state: { ...initialState, rev: 0 },
      host_id: "host",
      status: "waiting",
      updated_by: "host",
    });
    if (err) { setError("部屋の作成に失敗しました"); return null; }
    roomIdRef.current = id;
    roleRef.current = "host";
    revRef.current = 0;
    setRoomId(id);
    setPvpRole("host");
    setStatus("waiting");
    subscribeToRoom(id, "host");
    return id;
  }

  // guestGenerator: ゲストの発電機をホスト側にも伝える
  async function joinRoom(id, guestDeck, guestHand, guestGenerator) {
    setError("");
    const rid = id.toUpperCase();
    const { data, error: err } = await supabase.from("rooms").select("*").eq("id", rid).single();
    if (err || !data) { setError("部屋が見つかりません"); return null; }
    if (data.status !== "waiting") { setError("この部屋はすでに満員です"); return null; }

    const newState = {
      ...data.state,
      aiDeck: guestDeck,
      aiHand: guestHand,
      aiCost: 0,
      aiGrave: [],
      aiGenerator: guestGenerator || "water",
      rev: (data.state?.rev || 0) + 1,
    };

    const { error: err2 } = await supabase.from("rooms").update({
      guest_id: "guest", status: "ready", updated_by: "guest", state: newState,
    }).eq("id", rid);
    if (err2) { setError("入室に失敗しました"); return null; }

    roomIdRef.current = rid;
    roleRef.current = "guest";
    revRef.current = newState.rev;
    setRoomId(rid);
    setPvpRole("guest");
    setStatus("playing");
    subscribeToRoom(rid, "guest");
    return newState;
  }

  // 送信は常に「最新の状態だけ」を順番に送る（順序入れ替わり防止）
  async function flush() {
    const q = sendRef.current;
    if (q.busy) return;
    q.busy = true;
    try {
      while (q.pending) {
        const item = q.pending;
        q.pending = null;
        const { error: e } = await supabase.from("rooms").update({
          state: item.state,
          updated_by: roleRef.current,
          updated_at: new Date().toISOString(),
        }).eq("id", item.roomId);
        if (e) console.error("pushState failed", e);
      }
    } finally {
      q.busy = false;
    }
  }

  function pushState(state) {
    const id = roomIdRef.current;
    if (!id || !state) return;
    revRef.current += 1;
    sendRef.current.pending = { roomId: id, state: { ...state, rev: revRef.current } };
    flush();
  }

  function leaveRoom() {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    roomIdRef.current = "";
    roleRef.current = null;
    revRef.current = 0;
    absentSinceRef.current = null;
    sendRef.current = { busy: false, pending: null };
    setRoomId(""); setPvpRole(null); setAbsentSec(0); setError("");
    setStatus("idle");
  }

  // 不在秒数を1秒ごとに更新
  useEffect(() => {
    const t = setInterval(() => {
      const since = absentSinceRef.current;
      setAbsentSec(statusRef.current === "playing" && since ? Math.floor((Date.now() - since) / 1000) : 0);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // タブ復帰時: 再接続を知らせて最新状態を取得
  useEffect(() => {
    async function onVisible() {
      if (document.visibilityState !== "visible" || !roomIdRef.current) return;
      channelRef.current?.track?.({ at: Date.now() });
      const { data } = await supabase.from("rooms")
        .select("state, updated_by, status").eq("id", roomIdRef.current).single();
      if (data) applyIncoming(data);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // アンマウント時にチャンネル解除
  useEffect(() => {
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  return {
    roomId, inputRoomId, setInputRoomId,
    pvpRole, pvpStatus, error, absentSec,
    createRoom, joinRoom, pushState, leaveRoom,
  };
}
