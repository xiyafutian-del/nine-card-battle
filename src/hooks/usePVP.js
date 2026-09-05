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
  const channelRef = useRef(null);
  const roleRef = useRef(null); // クロージャ問題を避けるためrefで管理

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
        const currentRole = roleRef.current;

        // ホスト側: ゲストが入室したら ready になる
        if (currentRole === "host" && row.status === "ready") {
          setPvpStatus("playing");
        }

        // ゲーム状態の更新（相手の操作を反映）
        if (row.state && row.updated_by !== currentRole) {
          onStateUpdate(row.state, row.status);
        }
      })
      .subscribe();
  }

  async function createRoom(initialState) {
    setError("");
    const id = generateRoomId();
    const { error: err } = await supabase.from("rooms").insert({
      id,
      state: initialState,
      host_id: "host",
      status: "waiting",
      updated_by: "host",
    });
    if (err) { setError("部屋の作成に失敗しました"); return null; }
    setRoomId(id);
    setPvpRole("host");
    roleRef.current = "host";
    setPvpStatus("waiting");
    subscribeToRoom(id, "host");
    return id;
  }

  async function joinRoom(id) {
    setError("");
    const { data, error: err } = await supabase
      .from("rooms").select("*").eq("id", id.toUpperCase()).single();
    if (err || !data) { setError("部屋が見つかりません"); return null; }
    if (data.status !== "waiting") { setError("この部屋はすでに満員です"); return null; }

    const { error: err2 } = await supabase
      .from("rooms").update({
        guest_id: "guest",
        status: "ready",
        updated_by: "guest",
      }).eq("id", id.toUpperCase());
    if (err2) { setError("入室に失敗しました"); return null; }

    setRoomId(id.toUpperCase());
    setPvpRole("guest");
    roleRef.current = "guest";
    setPvpStatus("playing");
    subscribeToRoom(id.toUpperCase(), "guest");
    return data.state;
  }

  async function pushState(state, role) {
    if (!roomId) return;
    await supabase.from("rooms").update({
      state,
      updated_by: role || roleRef.current,
      updated_at: new Date().toISOString(),
    }).eq("id", roomId);
  }

  function leaveRoom() {
    if (channelRef.current) channelRef.current.unsubscribe();
    setRoomId(""); setPvpRole(null); roleRef.current = null;
    setPvpStatus("idle"); setError("");
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
