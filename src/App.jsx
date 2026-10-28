import { useState, useEffect, useRef } from 'react';
import { INITIAL_CARDS, CORE_CARD } from './constants/cards.js';
import { useBattle } from './hooks/useBattle.js';
import { usePVP } from './hooks/usePVP.js';
import { LobbyScreen } from './screens/LobbyScreen.jsx';
import { BattleScreen } from './screens/BattleScreen.jsx';
import { DeckScreen } from './screens/DeckScreen.jsx';
import { DexScreen } from './screens/DexScreen.jsx';
import { SkinScreen } from './screens/SkinScreen.jsx';
import { makeUnitFromCard } from './engine/effects.js';
import { buildDeck, applyTurnStart } from './engine/battle.js';
import { getDeckSkins, getOwnedSkins } from './skins/skinManager.js';

const DECK_SIZE = 15;

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
  const [activeDeck, setActiveDeck] = useState(() => loadActiveDeck());

  const deckCounts = activeDeck?.counts || { 1: DECK_SIZE };
  const playerGenerator = activeDeck?.generator || "water";
  const deckName = activeDeck?.name || "noname";
  const deckTotal = Object.values(deckCounts).reduce((a, b) => a + b, 0);

  // 15枚ちょうどでなければ対戦不可
  function deckOk() {
    if (deckTotal !== DECK_SIZE) {
      alert(`デッキが${deckTotal}枚です。${DECK_SIZE}枚ちょうどにしてください`);
      return false;
    }
    return true;
  }

  function handleActiveDeckChange(deck) {
    setActiveDeck(deck);
    localStorage.setItem("activeDeck", JSON.stringify(deck));
  }

  // ---- スキン付与ヘルパー（PVP用） ----
  function withSkins(cards) {
    const owned = getOwnedSkins();
    const ds = getDeckSkins();
    const idx = {};
    return cards.map(c => {
      const i = idx[c.id] || 0;
      idx[c.id] = i + 1;
      const sid = ds[`${deckName}-${c.id}-${i}`];
      return { ...c, skin: sid ? owned.find(s => s.instanceId === sid) || null : null };
    });
  }
  function coreSkin() {
    const sid = getDeckSkins()[`${deckName}-core-0`];
    return sid ? getOwnedSkins().find(s => s.instanceId === sid) || null : null;
  }

  // ---- バトル ----
  const pushStateRef = useRef(null);
  const battleRef = useRef(null);

  function handleAction() {
    setTimeout(() => {
      if (pushStateRef.current && battleRef.current?.mode === "pvp") {
        pushStateRef.current(battleRef.current);
      }
    }, 10);
  }

  const {
    battle, confirmLeave,
    startBattle, requestBack, leaveToLobby, endTurn, nextPhase,
    handleCellClick, handleSummon, handleGrowthSelect,
    setConfirmLeave, setBattle,
  } = useBattle(
    cardPool, deckCounts, playerGenerator, handleAction,
    getDeckSkins(), getOwnedSkins(), deckName
  );
  battleRef.current = battle;

  // ---- PVP ----
  function handlePVPStateUpdate(newState) {
    if (newState) {
      setBattle({ ...newState, selectedUnit: null, selectedSpell: null, selectedGrowth: null });
      setScreen("battle");
    }
  }

  const {
    roomId, inputRoomId, setInputRoomId,
    pvpRole, pvpStatus, error,
    createRoom, joinRoom, pushState, leaveRoom,
  } = usePVP(handlePVPStateUpdate);

  useEffect(() => { pushStateRef.current = pushState; }, [pushState]);

  useEffect(() => {
    if (pvpStatus === "playing" && screen !== "battle") setScreen("battle");
  }, [pvpStatus]);

  async function handleCreateRoom() {
    if (!deckOk()) return;
    const pDeck = withSkins(buildDeck(cardPool, deckCounts));
    const rDeck = buildDeck(cardPool, deckCounts);
    const pHand = pDeck.splice(0, 4);
    const rHand = rDeck.splice(0, 4);
    const board = { blue: [[], [], []], red: [[], [], []] };
    board.blue[1] = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-blue", atk: 0, skin: coreSkin() }];
    board.red[1]  = [{ ...makeUnitFromCard(CORE_CARD), uid: "core-red",  atk: 0 }];
    let state = {
      board,
      playerDeck: pDeck, aiDeck: rDeck,
      playerHand: pHand, aiHand: rHand,
      playerCost: 0, aiCost: 0,
      playerGrave: [], aiGrave: [],
      turn: 1, active: "blue", firstPlayer: "blue",
      playerGenerator, aiGenerator: "water",
      mode: "pvp", phase: "summon",
      selectedUnit: null, selectedSpell: null, selectedGrowth: null,
      log: ["バトル開始！"], gameOver: null,
    };
    state = applyTurnStart(state, "blue", playerGenerator);
    const id = await createRoom(state);
    if (id) setBattle(state);
  }

  async function handleJoinRoom(id) {
    if (!deckOk()) return;
    const myDeck = withSkins(buildDeck(cardPool, deckCounts));
    const myHand = myDeck.splice(0, 4);
    const state = await joinRoom(id, myDeck, myHand);
    if (state) {
      const cs = coreSkin();
      if (cs && state.board?.red?.[1]?.[0]) state.board.red[1][0].skin = cs;
      setBattle({
        ...state, aiGenerator: playerGenerator, firstPlayer: "blue",
        selectedUnit: null, selectedSpell: null, selectedGrowth: null,
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

  // ---- カード管理 ----
  function addCard(data) {
    const id = Math.max(0, ...cardPool.map(c => typeof c.id === "number" ? c.id : 0)) + 1;
    setCardPool(p => [...p, { id, ...data }]);
  }
  function editCard(id, data) { setCardPool(p => p.map(c => c.id === id ? { ...c, ...data } : c)); }
  function deleteCard(id) { setCardPool(p => p.filter(c => c.id !== id)); }
  function handleImageUpload(cardId, dataUrl) {
    setCardImages(p => ({ ...p, [cardId]: dataUrl }));
    setCardPool(p => p.map(c => c.id === cardId ? { ...c, image: dataUrl } : c));
  }

  // ---- 画面 ----
  const myColor = pvpRole === "guest" ? "red" : "blue";
  const isPvp = battle?.mode === "pvp";
  const myTurn = !isPvp || battle.active === myColor;

  if (screen === "battle" && battle) {
    return (
      <BattleScreen
        battle={battle} confirmLeave={confirmLeave}
        onRequestBack={handleRequestBack}
        onLeaveToLobby={handleLeaveToLobby}
        onEndTurn={isPvp ? () => { if (myTurn) endTurn(); } : endTurn}
        onNextPhase={isPvp ? () => { if (myTurn) nextPhase(); } : nextPhase}
        onCellClick={isPvp
          ? (row, col, extra) => { if (myTurn || row === -1) handleCellClick(row, col, extra); }
          : handleCellClick}
        onSummon={isPvp ? (hi, row, col) => { if (myTurn) handleSummon(hi, row, col); } : handleSummon}
        onGrowthSelect={isPvp ? hi => { if (myTurn) handleGrowthSelect(hi); } : handleGrowthSelect}
        onSetConfirmLeave={setConfirmLeave}
        cardImages={cardImages}
        pvpRole={pvpRole}
      />
    );
  }
  if (screen === "deck") {
    return (
      <DeckScreen
        cardPool={cardPool} cardImages={cardImages}
        activeDeck={activeDeck} onActiveDeckChange={handleActiveDeckChange}
        onBack={() => setScreen("lobby")}
      />
    );
  }
  if (screen === "dex") {
    return (
      <DexScreen
        cardPool={cardPool} cardImages={cardImages}
        onAddCard={addCard} onEditCard={editCard} onDeleteCard={deleteCard}
        onBack={() => setScreen("lobby")} onImageUpload={handleImageUpload}
      />
    );
  }
  if (screen === "skins") return <SkinScreen onBack={() => setScreen("lobby")}/>;

  return (
    <LobbyScreen
      playerGenerator={playerGenerator}
      setPlayerGenerator={gen => handleActiveDeckChange({ ...activeDeck, generator: gen })}
      deckTotal={deckTotal}
      onStart={mode => {
        if (!deckOk()) return;
        if (mode !== "pvp") startBattle(mode);  // PVPは部屋作成/入室時に盤面が作られる
        setScreen("battle");
      }}
      onNav={setScreen}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      pvpStatus={pvpStatus} pvpRole={pvpRole} roomId={roomId} error={error}
      inputRoomId={inputRoomId} setInputRoomId={setInputRoomId}
    />
  );
      }
