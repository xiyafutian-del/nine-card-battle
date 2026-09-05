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
  const aiCounts = {};
  cardPool.forEach(c => (aiCounts[c.id] = 2));
  const rDeck = buildDeck(cardPool, aiCounts);
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

export default function App() {
  const [cardPool, setCardPool] = useState(INITIAL_CARDS);
  const [deckCounts, setDeckCounts] = useState(() => {
    const o = {};
    INITIAL_CARDS.forEach(c => (o[c.id] = 2));
    return o;
  });
  const [playerGenerator, setPlayerGenerator] = useState("water");
  const [cardImages, setCardImages] = useState({});
  const [screen, setScreen] = useState("lobby");

  const deckTotal = Object.values(deckCounts).reduce((a, b) => a + b, 0);

  const {
    battle, confirmLeave,
    startBattle, requestBack, leaveToLobby, endTurn,
    handleCellClick, handleSummon,
    setConfirmLeave, setBattle,
  } = useBattle(cardPool, deckCounts, playerGenerator);

function handlePVPStateUpdate(newState, status) {
  if (newState) {
    setBattle(newState);
    if (screen !== "battle") setScreen("battle");
  }
}

  const {
    roomId, inputRoomId, setInputRoomId,
    pvpRole, pvpStatus, error,
    createRoom, joinRoom, pushState, leaveRoom,
  } = usePVP(handlePVPStateUpdate);

  // ホスト側: pvpStatusがplayingになったらバトル画面へ
  useEffect(() => {
    if (pvpStatus === "playing" && screen !== "battle") {
      setScreen("battle");
    }
  }, [pvpStatus]);

  // PVP: ターン終了時に状態を送信
  const prevActive = useRef(null);
  useEffect(() => {
    if (!battle || battle.mode !== "pvp") return;
    if (prevActive.current !== battle.active) {
      prevActive.current = battle.active;
      const myColor = pvpRole === "host" ? "blue" : "red";
      if (battle.active !== myColor) {
        pushState(battle);
      }
    }
  }, [battle?.active, battle?.turn]);

  async function handleCreateRoom() {
    const initialState = buildInitialBattleState(cardPool, deckCounts, playerGenerator);
    const id = await createRoom(initialState);
    if (id) setBattle(initialState);
  }

  async function handleJoinRoom(id) {
    const state = await joinRoom(id);
    if (state) {
      setBattle({ ...state, firstPlayer: "blue" });
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

  function incCount(id) {
    setDeckCounts(p => deckTotal < 30 ? { ...p, [id]: (p[id] || 0) + 1 } : p);
  }
  function decCount(id) {
    setDeckCounts(p => ({ ...p, [id]: Math.max(0, (p[id] || 0) - 1) }));
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
    setDeckCounts(p => { const n = { ...p }; delete n[id]; return n; });
  }
  function handleImageUpload(cardId, dataUrl) {
    setCardImages(p => ({ ...p, [cardId]: dataUrl }));
    setCardPool(p => p.map(c => c.id === cardId ? { ...c, image: dataUrl } : c));
  }

  const myColor = pvpRole === "host" ? "blue" : "red";
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
          ? (row, col, extra) => { if (isPVPMyTurn) handleCellClick(row, col, extra); }
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
        cardPool={cardPool} deckCounts={deckCounts} deckTotal={deckTotal}
        playerGenerator={playerGenerator} setPlayerGenerator={setPlayerGenerator}
        onInc={incCount} onDec={decCount}
        onBack={() => setScreen("lobby")}
      />
    );
  }
  if (screen === "dex") {
    return (
      <DexScreen
        cardPool={cardPool}
        onAddCard={addCard} onEditCard={editCard} onDeleteCard={deleteCard}
        onBack={() => setScreen("lobby")}
        onImageUpload={handleImageUpload}
      />
    );
  }
  return (
    <LobbyScreen
      playerGenerator={playerGenerator}
      setPlayerGenerator={setPlayerGenerator}
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
