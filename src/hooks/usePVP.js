import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function usePVP(onStateUpdate) {
  const [roomId, setRoomId] = useState("");
  const [inputRoomId, setInputRoomId] = useState("");
  const [pvpRole, setPvpRole] = useState(null); // "host" | "guest"
  const [pvpStatus, setPvpStatus] = useState("idle"); // "idle"|"waiting"|"ready"|"playing"
  const [error, setError] = useState("");
  const channelRef = useRef(null);

  // リアルタイム購読
  function subscribeToRoom(id, role) {
    if (channelRef.current) channelRef.current.unsubscribe();

    channelRef.current = supabase
      .channel("room-" + id)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${id}`,
      }, payload => {
        const row = payload.new;
        // 相手が入室した
        if (role === "host" && row.status === "ready" && pvpStatus === "waiting") {
          setPvpStatus("playing");
        }
        // ゲーム状態の更新
        if (row.state) onStateUpdate(row.state, row.status);
      })
      .subscribe();
  }

  // 部屋を作る（ホスト）
  async function createRoom(initialState) {
    setError("");
    const id = generateRoomId();
    const { error: err } = await supabase.from("rooms").insert({
      id,
      state: initialState,
      host_id: "host",
      status: "waiting",
    });
    if (err) { setError("部屋の作成に失敗しました"); return null; }
    setRoomId(id);
    setPvpRole("host");
    setPvpStatus("waiting");
    subscribeToRoom(id, "host");
    return id;
  }

  // 部屋に入る（ゲスト）
  async function joinRoom(id) {
    setError("");
    const { data, error: err } = await supabase
      .from("rooms").select("*").eq("id", id.toUpperCase()).single();
    if (err || !data) { setError("部屋が見つかりません"); return null; }
    if (data.status !== "waiting") { setError("この部屋はすでに満員です"); return null; }

    const { error: err2 } = await supabase
      .from("rooms").update({ guest_id: "guest", status: "ready" }).eq("id", id.toUpperCase());
    if (err2) { setError("入室に失敗しました"); return null; }

    setRoomId(id.toUpperCase());
    setPvpRole("guest");
    setPvpStatus("playing");
    subscribeToRoom(id.toUpperCase(), "guest");
    return data.state;
  }

  // ゲーム状態を送信
  async function pushState(state) {
    if (!roomId) return;
    await supabase.from("rooms").update({ state, updated_at: new Date().toISOString() }).eq("id", roomId);
  }

  // 退室
  function leaveRoom() {
    if (channelRef.current) channelRef.current.unsubscribe();
    setRoomId(""); setPvpRole(null); setPvpStatus("idle"); setError("");
  }

  useEffect(() => {
    return () => { if (channelRef.current) channelRef.current.unsubscribe(); };
  }, []);

  return {
    roomId, inputRoomId, setInputRoomId,
    pvpRole, pvpStatus, error,
    createRoom, joinRoom, pushState, leaveRoom,
  };
}