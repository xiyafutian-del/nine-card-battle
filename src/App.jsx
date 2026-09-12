import { useState, useEffect, useRef } from 'react';
import { INITIAL_CARDS } from './constants/cards.js';
import { useBattle } from './hooks/useBattle.js';
import { usePVP } from './hooks/usePVP.js';
import { LobbyScreen } from './screens/LobbyScreen.jsx';
import { BattleScreen } from './screens/BattleScreen.jsx';
import { DeckScreen } from './screens/DeckScreen.jsx';
import { DexScreen } from './screens/DexScreen.jsx';
import { makeUnitFromCard } from './engine/effects.js';
import { buildDeck } from './engine/battle.js';
import { CORE_CARD } from './constants/cards.js';
import { getGeneratorCost } from './constants/index.js';

function buildInitialBattleState(cardPool, deckCounts, playerGenerator) {
  const pDeck = buildDeck(cardPool, deckCounts);
  const rDeck = buildDeck(cardPool, deckCounts);
  const pHand = pDeck.splice(0, 4);
  const rHand = rDeck.splice(0, 4);
  const board = { blue: [[], [], []], red: [[], [], []] };
  board.blue[1] = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-blue" }];
  board.red[1]  = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-red" }];
  const gained = getGeneratorCost(playerGenerator, 1);
  return {
    board,
    playerDeck: pDeck, aiDeck: rDeck,
    playerHand: pHand, aiHand: rHand,
    playerCost: gained, aiCost: 0,
    playerGrave: [], aiGrave: [],
    turn: 1, active: "blue", firstPlayer: "blue",
    playerGenerator, aiGenerator: "water",
    mode: "pvp", selectedUnit: null, selectedSpell: null,
    log: ["バトル開始！"], gameOver: null,
  };
}

// localStorageからデッキを読み込む
function loadActiveDeck() {
  try {
    const saved = localStorage.getItem("activeDeck");
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

export default function App() {
  const [cardPool, setCardPool] = useState(INITIAL_CARDS);
  const [cardImages, setCardImages] = useState({});
  const [screen, setScreen] = useState("lobby");

  // アクティブデッキ（localStorageから初期化）
  const [activeDeck, setActiveDeck] = useState(() => loadActiveDeck());

  // デッキからdeckCounts/playerGeneratorを導出
  const deckCounts = activeDeck?.counts || { 1: 30 }; // ソルジャー(id:1)30枚
  const playerGenerator = activeDeck?.generator || "water";
  const deckTotal = Object.values(deckCounts).reduce((a, b) => a + b, 0);

  function handleActiveDeckChange(deck) {
    setActiveDeck(deck);
    localStorage.setItem("activeDeck", JSON.stringify(deck));
  }

  // PVP送信用コールバック
  const pushStateRef = useRef(null);
  const pvpRoleRef = useRef(null);

  function handleAction() {
    if (pushStateRef.current && pvpRoleRef.current) {
      // 少し待ってからbattleの最新状態を送信
      setTimeout(() => {
        setBattleForPush();
      }, 10);
    }
  }

  const {
    battle, confirmLeave,
    startBattle, requestBack, leaveToLobby, endTurn,
    handleCellClick, handleSummon,
    setConfirmLeave, setBattle,
  } = useBattle(cardPool, deckCounts, playerGenerator, handleAction);

  // battleの最新状態をPVPに送信するための関数
  const battleRef = useRef(null);
  battleRef.current = battle;

  function setBattleForPush() {
    if (pushStateRef.current && battleRef.current) {
      pushStateRef.current(battleRef.current);
    }
  }

  function handlePVPStateUpdate(newState, status) {
    if (newState) {
      // selectedUnit/selectedSpellはリセット
      setBattle({ ...newState, selectedUnit: null, selectedSpell: null });
      if (screen !== "battle") setScreen("battle");
    }
  }

  const {
    roomId, inputRoomId, setInputRoomId,
    pvpRole, pvpStatus, error,
    createRoom, joinRoom, pushState, leaveRoom,
  } = usePVP(handlePVPStateUpdate);

  // pushState と pvpRole を ref に保存
  useEffect(() => { pushStateRef.current = pushState; }, [pushState]);
  useEffect(() => { pvpRoleRef.current = pvpRole; }, [pvpRole]);

  // ホスト側: pvpStatusがplayingになったらバトル画面へ
  useEffect(() => {
    if (pvpStatus === "playing" && screen !== "battle") {
      setScreen("battle");
    }
  }, [pvpStatus]);

  async function handleCreateRoom() {
    const initialState = buildInitialBattleState(cardPool, deckCounts, playerGenerator);
    const id = await createRoom(initialState);
    if (id) setBattle(initialState);
  }

async function handleJoinRoom(id) {
  const state = await joinRoom(id);
  if (state) {
    // 参加者は自分のデッキで盤面を再構築
    const myState = buildInitialBattleState(cardPool, deckCounts, playerGenerator);
    // ホストの盤面はそのまま使い、自分の手札・デッキだけ上書き
    setBattle({
      ...state,
      // 参加者(red)の情報を自分のデッキで上書き
      aiDeck: myState.playerDeck,
      aiHand: myState.playerHand,
      aiCost: 0,
      aiGrave: [],
      aiGenerator: playerGenerator,
      firstPlayer: "blue",
      selectedUnit: null,
      selectedSpell: null,
    });
    setScreen("battle");
  }
}

  function handleRequestBack() {
    if (battle?.mode === "pvp") leaveRoom();
    requestBack();
    setScreen("lobby");
  }

  function handleLeaveToLobby() {
    if (battle?.mode === "pvp") leaveRoom();
    leaveToLobby();
    setScreen("lobby");
  }

  function addCard(data) {
    const id = Math.max(0, ...cardPool.map(c => typeof c.id === "number" ? c.id : 0)) + 1;
    setCardPool(p => [...p, { id, ...data }]);
  }
  function editCard(id, data) {
    setCardPool(p => p.map(c => c.id === id ? { ...c, ...data } : c));
  }
  function deleteCard(id) {
    setCardPool(p => p.filter(c => c.id !== id));
  }
  function handleImageUpload(cardId, dataUrl) {
    setCardImages(p => ({ ...p, [cardId]: dataUrl }));
    setCardPool(p => p.map(c => c.id === cardId ? { ...c, image: dataUrl } : c));
  }

  const myColor = pvpRole === "host" ? "blue" : pvpRole === "guest" ? "red" : "blue";
  const isPVPMyTurn = !battle || battle.mode !== "pvp" || battle.active === myColor;

  if (screen === "battle" && battle) {
    return (
      <BattleScreen
        battle={battle} confirmLeave={confirmLeave}
        onRequestBack={handleRequestBack}
        onLeaveToLobby={handleLeaveToLobby}
        onEndTurn={battle.mode === "pvp"
          ? () => { if (isPVPMyTurn) endTurn(); }
          : endTurn}
        onCellClick={battle.mode === "pvp"
          ? (row, col, extra) => { if (isPVPMyTurn || row === -1) handleCellClick(row, col, extra); }
          : handleCellClick}
        onSummon={battle.mode === "pvp"
          ? (hi, row, col) => { if (isPVPMyTurn) handleSummon(hi, row, col); }
          : handleSummon}
        onSetConfirmLeave={setConfirmLeave}
        cardImages={cardImages}
        pvpRole={pvpRole}
      />
    );
  }
  if (screen === "deck") {
    return (
      <DeckScreen
        cardPool={cardPool}
        cardImages={cardImages}
        activeDeck={activeDeck}
        onActiveDeckChange={handleActiveDeckChange}
        onBack={() => setScreen("lobby")}
      />
    );
  }
  if (screen === "dex") {
    return (
      <DexScreen
        cardPool={cardPool}
        cardImages={cardImages}
        onAddCard={addCard} onEditCard={editCard} onDeleteCard={deleteCard}
        onBack={() => setScreen("lobby")}
        onImageUpload={handleImageUpload}
      />
    );
  }
  return (
    <LobbyScreen
      playerGenerator={playerGenerator}
      setPlayerGenerator={gen => handleActiveDeckChange({ ...activeDeck, generator: gen })}
      deckTotal={deckTotal}
      onStart={mode => { startBattle(mode); setScreen("battle"); }}
      onNav={setScreen}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      pvpStatus={pvpStatus}
      pvpRole={pvpRole}
      roomId={roomId}
      error={error}
      inputRoomId={inputRoomId}
      setInputRoomId={setInputRoomId}
    />
  );
}
