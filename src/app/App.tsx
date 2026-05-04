import { formatTime, getCardIcon } from './utils';
import BattleEntity from './components/BattleEntity';
import BattleEffects from './components/BattleEffects';
import { useState, useEffect, useRef } from 'react';
import { Crown, Zap, Sword, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

interface GameEntity {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  name: string;
  side: 'top' | 'bottom';
}

interface GameState {
  timeLeft: number;
  entities: GameEntity[];
  towers: any[];
  players: any[];
  attacks?: any[];
}

interface CardDef {
  name: string;
  cost: number;
}

// All cards available in the game
const ALL_CARDS: CardDef[] = [
  { name: 'Snow White', cost: 3 },
  { name: 'Deep Woods Witch', cost: 4 },
  { name: 'Royal Knight', cost: 5 },
  { name: 'Dwarf Swarm', cost: 3 },
  { name: 'Miner Dwarf', cost: 2 },
  { name: 'Huntsman', cost: 4 },
  { name: 'Fairy Bluebird', cost: 1 },
  { name: 'Dwarf Hut', cost: 5 },
  { name: 'Poison Apple', cost: 4 },
  { name: 'Miner Bomb', cost: 2 },
  { name: 'The King', cost: 7 },
  { name: 'Tin Woodman', cost: 6 },
  { name: 'Scarecrow', cost: 2 },
  { name: 'Oz Tornado', cost: 4 },
  { name: 'Cowardly Lion', cost: 4 },
  { name: 'Wicked Witch', cost: 5 },
  { name: "Glinda's Light", cost: 3 }
];

// State of the game
export default function App() {
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'loading' | 'playing'>('idle');
  const [gameData, setGameData] = useState<GameState | null>(null);
  const [allyElixir, setAllyElixir] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [enemyTrophies, setEnemyTrophies] = useState(100);
  const [allyTrophies, setAllyTrophies] = useState(100);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null);

  const [isDeckOpen, setIsDeckOpen] = useState(false);
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const [decks, setDecks] = useState<CardDef[][]>([
    ALL_CARDS.slice(0, 10),
    ALL_CARDS.slice(1, 11),
    [...ALL_CARDS.slice(0, 5), ...ALL_CARDS.slice(6, 11)]
  ]);

  const [hand, setHand] = useState<CardDef[]>([]);
  const [nextCard, setNextCard] = useState<CardDef>(ALL_CARDS[0]);
  const socketRef = useRef<Socket | null>(null);

  // Create towers for both players
  const initialTowers = [
    { id: 'p1_main', x: 50, y: 90, type: 'king', side: 'bottom', hp: 4000, maxHp: 4000 },
    { id: 'p1_left', x: 20, y: 80, type: 'princess', side: 'bottom', hp: 2500, maxHp: 2500 },
    { id: 'p1_right', x: 80, y: 80, type: 'princess', side: 'bottom', hp: 2500, maxHp: 2500 },
    { id: 'p2_main', x: 50, y: 10, type: 'king', side: 'top', hp: 4000, maxHp: 4000 },
    { id: 'p2_left', x: 20, y: 20, type: 'princess', side: 'top', hp: 2500, maxHp: 2500 },
    { id: 'p2_right', x: 80, y: 20, type: 'princess', side: 'top', hp: 2500, maxHp: 2500 }
  ];

  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    socketRef.current.on('matchFound', () => {
      setMatchStatus('loading');
    });

    socketRef.current.on('gameUpdate', (data: GameState) => {
      setMatchStatus(prev => {
        if (prev === 'loading' || prev === 'searching') {
          setHand([decks[activeDeckIndex][0], decks[activeDeckIndex][1], decks[activeDeckIndex][2], decks[activeDeckIndex][3]]);
          setNextCard(decks[activeDeckIndex][4]);
          return 'playing';
        }
        return prev;
      });
      setGameData(data);
      setTimeLeft(data.timeLeft);
      const me = data.players.find((p: any) => p.id === socketRef.current?.id);
      if (me) setAllyElixir(me.fairyDust);
    });

    socketRef.current.on('gameOver', (data: any) => {
      const isWinner = data.winner === 'bottom';
      if (data.winner === 'Draw!') {
        alert("Game Over! Trận đấu Hòa!");
      } else if (isWinner) {
        alert("Game Over! Bạn đã THẮNG! (+30 Cúp)");
        setAllyTrophies(t => t + 30);
        setEnemyTrophies(t => t - 30);
      } else {
        alert("Game Over! Bạn đã THUA! (-30 Cúp)");
        setAllyTrophies(t => t - 30);
        setEnemyTrophies(t => t + 30);
      }
      setMatchStatus('idle');
      setGameData(null);
      setTimeLeft(180);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const startMatchmaking = () => {
    if (decks[activeDeckIndex].length < 10) {
      alert("Your deck must have exactly 10 cards to battle!");
      return;
    }
    setMatchStatus('searching');
    socketRef.current?.emit('joinQueue', { userId: 'user_' + Math.random(), deck: [] });
  };

  const cancelMatchmaking = () => {
    setMatchStatus('idle');
    socketRef.current?.emit('leaveQueue');
  };

  const handleBattlefieldClick = (e: React.MouseEvent, x: number, y: number) => {
    if (!selectedCard || matchStatus !== 'playing') return;

    const cardData = hand.find(c => c.name === selectedCard);
    if (!cardData || allyElixir < cardData.cost) {
      return;
    }

    const isSpell = selectedCard === 'Poison Apple' || selectedCard === 'Miner Bomb' || selectedCard === 'Oz Tornado' || selectedCard === "Glinda's Light";
    if (!isSpell && (y < 55 || y > 95)) return;

    socketRef.current?.emit('spawnUnit', { cardName: selectedCard, x, y });

    // Random next card logic for 10-card pool
    const playedCardIndex = hand.findIndex(c => c.name === selectedCard);
    if (playedCardIndex !== -1) {
      const newHand = [...hand];
      newHand[playedCardIndex] = nextCard;
      setHand(newHand);

      const pool = decks[activeDeckIndex];
      const newNextCard = pool[Math.floor(Math.random() * pool.length)];
      setNextCard(newNextCard);
    }

    setSelectedCard(null);
    setHoverPos(null);
  };

  const handleMouseMove = (e: React.MouseEvent, x: number, y: number) => {
    if (!selectedCard || matchStatus !== 'playing') {
      if (hoverPos) setHoverPos(null);
      return;
    }
    setHoverPos({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverPos(null);
  };

  const addCardToDeck = (card: CardDef) => {
    setDecks(prev => {
      const newDecks = [...prev];
      if (newDecks[activeDeckIndex].length < 10) {
        newDecks[activeDeckIndex] = [...newDecks[activeDeckIndex], card];
      }
      return newDecks;
    });
  };

  const removeCardFromDeck = (card: CardDef) => {
    setDecks(prev => {
      const newDecks = [...prev];
      newDecks[activeDeckIndex] = newDecks[activeDeckIndex].filter(c => c.name !== card.name);
      return newDecks;
    });
  };

  const getTowerHP = (towerId: string) => {
    if (!gameData) return 100;
    const tower = gameData.towers.find((t: any) => t.id === towerId);
    return tower ? (tower.hp / (tower.type === 'king' ? 4000 : 2500)) * 100 : 0;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCardIcon = (cardName: string) => {
    switch (cardName) {
      case 'Deep Woods Witch': return '🧙‍♀️';
      case 'Royal Knight': return '🏇';
      case 'Dwarf Swarm': return '⛏️';
      case 'Poison Apple': return '🍎';
      case 'Miner Bomb': return '💣';
      case 'The King': return '👑';
      case 'Snow White': return '👸';
      case 'Tin Woodman': return '🤖';
      case 'Scarecrow': return '🎃';
      case 'Oz Tornado': return '🌪️';
      case 'Dwarf Hut': return '🛖';
      case 'Huntsman': return '🏹';
      case 'Fairy Bluebird': return '🐦';
      case 'Miner Dwarf': return '👷';
      case 'Cowardly Lion': return '🦁';
      case 'Wicked Witch': return '🧹';
      case "Glinda's Light": return '✨';
      default: return '❓';
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Overlay Screens */}
      {matchStatus !== 'playing' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6 p-8 bg-slate-900/80 border-2 border-cyan-500/30 rounded-2xl shadow-2xl">
            <h1 className="text-4xl font-['Cinzel_Decorative'] text-cyan-100 tracking-widest">FAIRYTALE CLASH</h1>
            {matchStatus === 'idle' && (
              <button
                onClick={() => setIsDeckOpen(true)}
                className="absolute top-4 right-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-700 rounded-full text-white font-bold hover:scale-105 transition-all shadow-lg"
              >
                DECK
              </button>
            )}
            <button
              onClick={startMatchmaking}
              className="group relative flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-full text-white font-bold text-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)]"
            >
              <Sword className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              <span>BATTLE</span>
            </button>
            {matchStatus === 'searching' && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                <p className="text-cyan-200 text-sm">MATCHMAKING...</p>
              </div>
            )}
            {matchStatus === 'loading' && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
                <p className="text-fuchsia-200 text-lg font-bold animate-pulse">LOADING MAP AND CARDS...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deck Builder Overlay */}
      {isDeckOpen && matchStatus === 'idle' && (
        <div className="absolute inset-0 z-50 flex flex-col bg-slate-950 text-white p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-4xl font-['Cinzel_Decorative'] text-cyan-300 drop-shadow-lg">YOUR DECK</h2>
            <button onClick={() => setIsDeckOpen(false)} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold shadow-lg transition-all">CLOSE</button>
          </div>

          {/* Deck Tabs */}
          <div className="flex gap-4 mb-6">
            {[0, 1, 2].map(i => (
              <button
                key={i}
                onClick={() => setActiveDeckIndex(i)}
                className={`px-8 py-3 rounded-xl font-bold border-2 transition-all shadow-lg ${activeDeckIndex === i ? 'bg-cyan-600 border-cyan-300 text-white scale-105' : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'}`}
              >
                DECK {i + 1}
              </button>
            ))}
          </div>

          <div className="mb-3 flex justify-between items-end">
            <h3 className="text-2xl text-yellow-400 font-bold drop-shadow-md">Equipped ({decks[activeDeckIndex].length}/10)</h3>
            <p className="text-sm text-rose-300">Click to unequip</p>
          </div>

          {/* Current Deck Grid */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-4 bg-slate-900/80 p-6 rounded-2xl border-2 border-slate-700 min-h-[180px] shadow-inner">
            {decks[activeDeckIndex].map(card => (
              <div key={card.name} onClick={() => removeCardFromDeck(card)} className="cursor-pointer relative w-full aspect-[2/3] rounded-xl border-2 border-slate-500 bg-gradient-to-b from-slate-700 to-slate-900 flex flex-col items-center justify-between p-2 shadow-xl hover:border-rose-400 hover:scale-105 transition-all group">
                <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/20 rounded-xl transition-all"></div>
                <div className="absolute -top-3 -left-3 bg-gradient-to-br from-fuchsia-500 to-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-slate-900 z-10">{card.cost}</div>
                <div className="text-4xl mt-3 drop-shadow-md z-10">{getCardIcon(card.name)}</div>
                <div className="text-[10px] text-white font-bold text-center leading-tight drop-shadow-md z-10">{card.name}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 mb-3 flex justify-between items-end">
            <h3 className="text-2xl text-cyan-400 font-bold drop-shadow-md">Collection</h3>
            <p className="text-sm text-green-300">Click to equip</p>
          </div>

          {/* Available Cards */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-4 bg-slate-900/80 p-6 rounded-2xl border-2 border-slate-700 min-h-[180px] shadow-inner">
            {ALL_CARDS.filter(c => !decks[activeDeckIndex].find(dc => dc.name === c.name)).map(card => (
              <div key={card.name} onClick={() => addCardToDeck(card)} className="cursor-pointer relative w-full aspect-[2/3] rounded-xl border-2 border-slate-700 bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-between p-2 shadow-lg hover:border-green-400 hover:scale-105 transition-all group opacity-80 hover:opacity-100">
                <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/10 rounded-xl transition-all"></div>
                <div className="absolute -top-3 -left-3 bg-gradient-to-br from-slate-600 to-slate-800 group-hover:from-fuchsia-500 group-hover:to-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-slate-900 z-10 transition-all">{card.cost}</div>
                <div className="text-4xl mt-3 drop-shadow-md grayscale group-hover:grayscale-0 transition-all z-10">{getCardIcon(card.name)}</div>
                <div className="text-[10px] text-slate-300 group-hover:text-white font-bold text-center leading-tight drop-shadow-md z-10">{card.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Battle UI */}
      <div className={`absolute inset-0 flex flex-col transition-opacity duration-500 ${matchStatus === 'playing' ? 'opacity-100' : 'opacity-0'}`}>
        {/* Header */}
        <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-purple-950/90 to-transparent">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/60 rounded-full border border-purple-400/30">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="font-['Rajdhani'] font-semibold text-yellow-400">{enemyTrophies}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-purple-200 font-['Cinzel_Decorative'] tracking-wider">ENEMY</div>
            <div className="text-xs text-white/60 font-mono">{matchStatus === 'playing' ? formatTime(timeLeft) : '--:--'}</div>
          </div>
          <div className="w-16"></div>
        </div>

        {/* Battlefield Area */}
        <div className="relative flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-black">
          {/* Animated background glow */}
          <div className="absolute inset-0 bg-purple-900/20 animate-pulse mix-blend-screen pointer-events-none"></div>

          {/* Arena Perspective */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-full h-full max-w-md pointer-events-auto" style={{ transform: 'perspective(1200px) rotateX(30deg)', transformStyle: 'preserve-3d' }}>

              {/* Arena Floor */}
              <div className="absolute inset-0 rounded-3xl border-4 border-indigo-500/30 shadow-[0_0_80px_rgba(99,102,241,0.2)] bg-gradient-to-b from-slate-900/90 to-purple-950/90 backdrop-blur-sm overflow-hidden">
                {/* River in the middle */}
                <div className="absolute top-[45%] left-0 right-0 h-[10%] bg-cyan-500/20 backdrop-blur-lg border-y-2 border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.4)]"></div>
                {/* Bridges */}
                <div className="absolute top-[45%] left-[20%] w-16 h-[10%] bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 border-x-4 border-amber-950 shadow-lg"></div>
                <div className="absolute top-[45%] right-[20%] w-16 h-[10%] bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 border-x-4 border-amber-950 shadow-lg"></div>
              </div>

              {/* Click Overlay inside 3D space */}
              <div
                className="absolute inset-0 z-[1000] cursor-crosshair"
                onClick={(e) => {
                  const x = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * 100;
                  const y = (e.nativeEvent.offsetY / e.currentTarget.offsetHeight) * 100;
                  handleBattlefieldClick(e, x, y);
                }}
                onMouseMove={(e) => {
                  const x = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * 100;
                  const y = (e.nativeEvent.offsetY / e.currentTarget.offsetHeight) * 100;
                  handleMouseMove(e, x, y);
                }}
                onMouseLeave={handleMouseLeave}
              />
              {/* Towers */}
              {(gameData?.towers || initialTowers).map((tower: any) => (
                <div
                  key={tower.id}
                  className="absolute flex flex-col items-center transition-all duration-100"
                  style={{
                    left: `${tower.x}%`,
                    top: `${tower.y}%`,
                    transform: 'translate(-50%, -100%) translateZ(20px)',
                    zIndex: Math.floor(tower.y)
                  }}
                >
                  <div className={`relative ${tower.type === 'king' ? 'w-16 h-20' : 'w-12 h-14'} 
                    ${tower.side === 'bottom' ? 'bg-cyan-700 border-cyan-300' : 'bg-rose-700 border-rose-300'} 
                    rounded-lg border-2 shadow-xl flex items-center justify-center`}>
                    <div className="text-2xl">{tower.type === 'king' ? '👑' : '👸'}</div>
                  </div>
                  <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 ${tower.type === 'king' ? 'w-20' : 'w-14'} h-1.5 bg-black/50 rounded-full overflow-hidden`}>
                    <div className={`h-full ${tower.side === 'bottom' ? 'bg-cyan-400' : 'bg-rose-400'} transition-all duration-300`}
                      style={{ width: `${(tower.hp / tower.maxHp) * 100}%` }}></div>
                  </div>
                </div>
              ))}

              {/* Units / Troops */}
              {gameData?.entities?.map((entity) => (
                <BattleEntity key={entity.id} entity={entity} />
              ))}

              {/* Attacks Visuals */}
              <BattleEffects attacks={gameData?.attacks} />


              {/* Spell AoE Preview (Dành riêng cho Phép thuật) */}
              {selectedCard && hoverPos && ['Poison Apple', 'Miner Bomb', 'Oz Tornado', "Glinda's Light"].includes(selectedCard) && (
                <div
                  className="absolute rounded-full border-2 border-fuchsia-400 bg-fuchsia-500/20 transition-none pointer-events-none z-[998]"
                  style={{
                    left: `${hoverPos.x}%`,
                    top: `${hoverPos.y}%`,
                    // Dùng translate(-50%, -50%) để tâm của vòng tròn trùng chính xác với con trỏ chuột
                    transform: 'translate(-50%, -50%) translateZ(10px)',
                    // Oz Tornado có radius 20 (đường kính 40%), các phép khác radius 15 (đường kính 30%)
                    width: selectedCard === 'Oz Tornado' ? '40%' : '30%',
                    height: selectedCard === 'Oz Tornado' ? '40%' : '30%',
                    boxShadow: '0 0 20px rgba(217, 70, 239, 0.3) inset'
                  }}
                />
              )}

              {/* Spawn Area Highlight */}
              {selectedCard && (
                <div className={`absolute ${(selectedCard === 'Poison Apple' || selectedCard === 'Miner Bomb' || selectedCard === 'Oz Tornado' || selectedCard === "Glinda's Light") ? 'inset-4 border-purple-500/40 bg-purple-500/10' : 'bottom-[5%] left-[5%] right-[5%] h-[40%] border-cyan-400/40 bg-cyan-500/10'} border-2 border-dashed rounded-3xl animate-pulse pointer-events-none`}></div>
              )}
            </div>
          </div>
        </div>

        {/* Footer / Controls */}
        <div className="relative z-20 flex flex-col gap-3 px-4 py-4 bg-slate-950/95 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-fuchsia-400" />
            <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden border border-fuchsia-500/30">
              <div className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-500" style={{ width: `${(allyElixir / 10) * 100}%` }}></div>
            </div>
            <span className="font-bold text-fuchsia-300 min-w-[1.5rem]">{allyElixir}</span>
          </div>

          <div className="flex justify-center gap-2">
            {/* Next Card UI */}
            <div className="flex flex-col items-center justify-end mr-4 opacity-70 scale-75 origin-bottom pointer-events-none">
              <div className="text-[12px] text-cyan-300 mb-1 font-bold tracking-widest">NEXT</div>
              <div className="relative w-20 h-28 rounded-xl border-2 border-slate-700 bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-between p-2 shadow-lg opacity-80 grayscale-[30%]">
                <div className="absolute -top-3 -left-3 bg-gradient-to-br from-fuchsia-600 to-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-white text-[10px] font-bold shadow-md border border-slate-900">
                  {nextCard.cost}
                </div>
                <div className="text-3xl mt-2 drop-shadow-md">{getCardIcon(nextCard.name)}</div>
                <div className="text-[9px] text-white font-bold text-center leading-tight drop-shadow-md">{nextCard.name}</div>
                <div className="w-full h-1 bg-cyan-500/20 rounded-full mt-1"></div>
              </div>
            </div>

            {/* Hand Cards */}
            {hand.map((card, idx) => (
              <div
                key={`${card.name}-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCard(card.name);
                }}
                className={`group relative w-20 h-28 rounded-xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-between p-2 
                  ${selectedCard === card.name
                    ? 'border-yellow-400 -translate-y-4 bg-gradient-to-b from-slate-700 to-slate-900 scale-110 shadow-[0_0_25px_rgba(250,204,21,0.5)]'
                    : 'border-slate-600 bg-gradient-to-b from-slate-800/90 to-slate-900/90 hover:border-slate-400 hover:-translate-y-2 shadow-xl backdrop-blur-sm'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent rounded-xl pointer-events-none"></div>
                {/* Cost Badge */}
                <div className="absolute -top-3 -left-3 bg-gradient-to-br from-fuchsia-500 to-purple-700 rounded-full w-7 h-7 flex items-center justify-center text-white text-[11px] font-bold shadow-lg border-2 border-slate-900 z-10">
                  {card.cost}
                </div>
                {/* Tooltip on hover */}
                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform origin-bottom bg-slate-800 text-fuchsia-300 text-[10px] px-3 py-1.5 rounded-lg border border-fuchsia-500/50 shadow-xl whitespace-nowrap z-50">
                  {card.cost} Elixir
                </div>

                <div className="text-3xl mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-10 group-hover:scale-110 transition-transform">{getCardIcon(card.name)}</div>
                <div className="text-[9px] text-white font-bold text-center leading-tight z-10 drop-shadow-md">{card.name}</div>
                <div className="w-full h-1 bg-cyan-500/30 rounded-full mt-1 z-10 overflow-hidden">
                  <div className="h-full bg-cyan-400 w-full opacity-50"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes laser {
          to { stroke-dashoffset: -16; }
        }
        @keyframes popIn {
          0% { transform: translate(-50%, -100%) translateZ(0px) scale(0); opacity: 0; }
          70% { transform: translate(-50%, -100%) translateZ(30px) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -100%) translateZ(20px) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
