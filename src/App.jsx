import { useState, useEffect, useRef } from 'react';
import { INITIAL_CARDS } from './constants/cards.js';
import { useBattle } from './hooks/useBattle.js';
import { usePVP } from './hooks/usePVP.js';
import { LobbyScreen } from './screens/LobbyScreen.jsx';
import { BattleScreen } from './screens/BattleScreen.jsx';
import { DeckScreen } from './screens/DeckScreen.jsx';
import { DexScreen } from './screens/DexScreen.jsx';
import { SkinScreen } from './screens/SkinScreen.jsx';
import { makeUnitFromCard } from './engine/effects.js';
import { buildDeck } from './engine/battle.js';
import { CORE_CARD } from './constants/cards.js';
import { getGeneratorCost } from './constants/index.js';
import { getDeckSkins, getOwnedSkins } from './skins/skinManager.js';

function buildInitialBattleState(cardPool, deckCounts, playerGenerator) {
  const pDeck = buildDeck(cardPool, deckCounts);
  const rDeck = buildDeck(cardPool, deckCounts);
  const pHand = pDeck.splice(0, 4);
  const rHand = rDeck.splice(0, 4);
  const board = { blue: [[], [], []], red: [[], [], []] };
  board.blue[1] = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-blue", atk: 0 }];
  board.red[1]  = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-red",  atk: 0 }];
  const gained = getGeneratorCost(playerGenerator, 1);
  return {
    board,
    playerDeck: pDeck, aiDeck: rDeck,
    playerHand: pHand, aiHand: rHand,
    playerCost: gained, aiCost: 0,
    playerGrave: [], aiGrave: [],
    turn: 1, active: "blue", firstPlayer: "blue",
    playerGenerator, aiGenerator: "water",
    mode: "pvp", selectedUnit: null, selectedSpell: null, selectedGrowth: null,
    log: ["バトル開始！"], gameOver: null,
  };
}

function loadActiveDeck() {
  try {
    const saved = localStorage.getItem("activeDeck");
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

// デッキのカードにスキン情報を付与
function attachSkinsToCards(cards, deckName, ownedSkins, deckSkins) {
  let idx = {};
  return cards.map(card => {
    const i = idx[card.id] || 0;
    idx[card.id] = i + 1;
    const key = `${deckName||"noname"}-${card.id}-${i}`;
    const instanceId = deckSkins[key];
    const skin = instanceId ? ownedSkins.find(s => s.instanceId === instanceId) : null;
    return { ...card, skin: skin || null };
  });
}

export default function App() {
  const [cardPool, setCardPool] = useState(INITIAL_CARDS);
  const [cardImages, setCardImages] = useState({});
  const [screen, setScreen] = useState("lobby");

  const [activeDeck, setActiveDeck] = useState(() => loadActiveDeck());

  const deckCounts = activeDeck?.counts || { 1: 15 };
  const playerGenerator = activeDeck?.generator || "water";
  const deckTotal = Object.values(deckCounts).reduce((a, b) => a + b, 0);

  function handleActiveDeckChange(deck) {
    setActiveDeck(deck);
    localStorage.setItem("activeDeck", JSON.stringify(deck));
  }

  const pushStateRef = useRef(null);
  const pvpRoleRef = useRef(null);

  function handleAction() {
    setTimeout(() => {
      if (pushStateRef.current && battleRef.current) {
        pushStateRef.current(battleRef.current);
      }
    }, 10);
  }

  const {
    battle, confirmLeave,
    startBattle, requestBack, leaveToLobby, endTurn,
    handleCellClick, handleSummon, handleGrowthSelect,
    setConfirmLeave, setBattle,
  } = useBattle(cardPool, deckCounts, playerGenerator, handleAction);
  getDeckSkins(),           // ← 追加
  getOwnedSkins(),          // ← 追加
  activeDeck?.name || "noname"  // ← 追加
  
  const battleRef = useRef(null);
  battleRef.current = battle;

  function handlePVPStateUpdate(newState, status) {
    if (newState) {
      setBattle({ ...newState, selectedUnit: null, selectedSpell: null, selectedGrowth: null });
      if (screen !== "battle") setScreen("battle");
    }
  }

  const {
    roomId, inputRoomId, setInputRoomId,
    pvpRole, pvpStatus, error,
    createRoom, joinRoom, pushState, leaveRoom,
  } = usePVP(handlePVPStateUpdate);

  useEffect(() => { pushStateRef.current = pushState; }, [pushState]);
  useEffect(() => { pvpRoleRef.current = pvpRole; }, [pvpRole]);

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
    const myDeck = buildDeck(cardPool, deckCounts);
    const myHand = myDeck.splice(0, 4);
    const state = await joinRoom(id, myDeck, myHand);
    if (state) {
      setBattle({ ...state, aiGenerator: playerGenerator, firstPlayer: "blue", selectedUnit: null, selectedSpell: null, selectedGrowth: null });
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
        onGrowthSelect={handleGrowthSelect}
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
  if (screen === "skins") {
    return <SkinScreen onBack={() => setScreen("lobby")}/>;
  }
  return (
    <LobbyScreen
      playerGenerator={playerGenerator}
      setPlayerGenerator={gen => handleActiveDeckChange({ ...activeDeck, generator: gen })}
      deckTotal={deckTotal}
onStart={mode => { startBattle(mode); setScreen("battle"); }}
  // スキンをバトル開始後に付与
  setTimeout(() => {
    const owned = getOwnedSkins();
    const dSkins = getDeckSkins();
    const deckName = activeDeck?.name || "noname";
    setBattle(prev => {
      if (!prev) return prev;
      const attachSkins = (cards) => {
        const idx = {};
        return cards.map(card => {
          const i = idx[card.cardId || card.id] || 0;
          idx[card.cardId || card.id] = i + 1;
          const key = `${deckName}-${card.cardId || card.id}-${i}`;
          const instanceId = dSkins[key];
          const skin = instanceId ? owned.find(s => s.instanceId === instanceId) : null;
          return { ...card, skin: skin || null };
        });
      };
      return {
        ...prev,
        playerHand: attachSkins(prev.playerHand),
        playerDeck: attachSkins(prev.playerDeck),
      };
    });
  }, 50);
}}
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
