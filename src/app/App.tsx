import { formatTime, getCardIcon } from './utils';
import BattleEntity from './components/BattleEntity';
import BattleEffects from './components/BattleEffects';
import { useState, useEffect, useRef } from 'react';
import { Crown, Zap, Sword, Loader2, Trophy, LogOut } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
  username: string;
  displayName: string;
  cups: number;
  level: number;
  stats: { wins: number; losses: number };
  decks: string[][];
  cardCollection: string[];
}

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
  activeSpells: any[];
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

const SPELL_NAMES = ['Poison Apple', 'Miner Bomb', 'Oz Tornado', "Glinda's Light"];

// ─── Auth helpers ────────────────────────────────────────────────────────────
async function apiAuth(path: string, body: object) {
  const res = await fetch(`${SERVER_URL}/api/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiPut(path: string, token: string, body: object) {
  const res = await fetch(`${SERVER_URL}/api/auth${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiPost(path: string, token: string, body: object) {
  const res = await fetch(`${SERVER_URL}/api/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  return res.json();
}

// ─── Particles ───────────────────────────────────────────────────────────────
function Particles({ colors }: { colors: string[] }) {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 5 + 2,
    delay: `${Math.random() * 6}s`,
    dur: `${Math.random() * 8 + 6}s`,
    color: colors[i % colors.length],
    shape: Math.random() > 0.5 ? '50%' : '2px',
    drift: `${(Math.random() - 0.5) * 60}px`,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            bottom: '-10px',
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: p.shape,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            opacity: 0,
            animation: `particleFloat ${p.dur} ${p.delay} infinite ease-in`,
            '--drift': p.drift,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes particleFloat {
          0%   { transform: translateY(0)   translateX(0)               scale(0.5); opacity: 0;   }
          10%  { opacity: 0.9; }
          80%  { opacity: 0.6; }
          100% { transform: translateY(-110vh) translateX(var(--drift)) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }: { onLogin: (token: string, profile: UserProfile) => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    const body = tab === 'register'
      ? { username, displayName, password }
      : { username, password };
    const data = await apiAuth(`/${tab}`, body);
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    localStorage.setItem('fc_token', data.token);
    onLogin(data.token, data.profile);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 overflow-hidden">
      {/* Auth particles: cyan + purple + pink */}
      <Particles colors={['#06b6d4', '#a855f7', '#ec4899', '#818cf8', '#67e8f9']} />
      <div className="w-full max-w-sm p-8 bg-slate-900/80 border-2 border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-6">
        <h1 className="text-3xl font-['Cinzel_Decorative'] text-cyan-100 tracking-widest text-center">FAIRYTALE CLASH</h1>

        {/* Tab */}
        <div className="flex rounded-xl overflow-hidden border border-slate-700">
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold uppercase transition-all ${tab === t ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}>
              {t === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <input id="auth-username" type="text" placeholder="Username (dùng để đăng nhập)" value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors" />

          {tab === 'register' && (
            <input id="auth-displayname" type="text" placeholder="Tên hiển thị" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500 transition-colors" />
          )}

          <input id="auth-password" type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors" />
        </div>

        {error && <p className="text-rose-400 text-sm text-center">{error}</p>}

        <button id="auth-submit" onClick={submit} disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-xl text-white font-bold text-lg hover:scale-105 transition-all shadow-lg disabled:opacity-50">
          {loading ? '...' : tab === 'login' ? 'Login' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // Auth
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fc_token'));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load profile on mount if token exists
  useEffect(() => {
    const saved = localStorage.getItem('fc_token');
    if (!saved) return;
    fetch(`${SERVER_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${saved}` } })
      .then(r => r.json())
      .then(data => {
        if (data.profile) setUserProfile(data.profile);
        else { localStorage.removeItem('fc_token'); setToken(null); }
      })
      .catch(() => { });
  }, []);

  const handleLogin = (tok: string, profile: UserProfile) => {
    setToken(tok);
    setUserProfile(profile);
  };

  const handleLogout = () => {
    localStorage.removeItem('fc_token');
    setToken(null);
    setUserProfile(null);
  };

  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'loading' | 'playing'>('idle');
  const [gameData, setGameData] = useState<GameState | null>(null);
  const [allyElixir, setAllyElixir] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [enemyTrophies, setEnemyTrophies] = useState(100);
  const [allyTrophies, setAllyTrophies] = useState(100);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number, y: number } | null>(null);

  const [isDeckOpen, setIsDeckOpen] = useState(false);
  const activeDeckIndex = 0; // Hardcoded to single deck

  // Build CardDef decks from profile.decks (string[]) or fallback
  const profileDecksToDefs = (profileDecks: string[][]): CardDef[][] =>
    profileDecks.map(deck => deck.map(name => ALL_CARDS.find(c => c.name === name) || { name, cost: 3 }));

  const [decks, setDecks] = useState<CardDef[][]>(() => {
    const saved = userProfile?.decks;
    if (saved && saved.length > 0) return profileDecksToDefs(saved);
    return [[...ALL_CARDS.slice(0, 10)]];
  });

  // Sync decks when profile loads
  useEffect(() => {
    if (userProfile?.decks) setDecks(profileDecksToDefs(userProfile.decks));
  }, [userProfile]);

  const [hand, setHand] = useState<CardDef[]>([]);
  const [nextCard, setNextCard] = useState<CardDef>(ALL_CARDS[0]);
  const socketRef = useRef<Socket | null>(null);
  const decksRef = useRef<CardDef[][]>(decks);

  // Sync ref with state
  useEffect(() => {
    decksRef.current = decks;
  }, [decks]);

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
          const currentDecks = decksRef.current;
          const myDeck = [...currentDecks[activeDeckIndex]];

          // Shuffle deck to get random initial hand
          for (let i = myDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [myDeck[i], myDeck[j]] = [myDeck[j], myDeck[i]];
          }

          setHand([myDeck[0], myDeck[1], myDeck[2], myDeck[3]]);
          setNextCard(myDeck[4]);
          return 'playing';
        }
        return prev;
      });
      setGameData(data);
      setTimeLeft(data.timeLeft);
      const me = data.players.find((p: any) => p.id === socketRef.current?.id);
      if (me) setAllyElixir(me.fairyDust);
    });

    socketRef.current.on('gameOver', async (data: any) => {
      const isWinner = data.winner === 'bottom';
      let result: 'win' | 'loss' | 'draw' = 'draw';
      if (data.winner === 'Draw!') {
        alert("Game Over! Trận đấu Hòa!");
      } else if (isWinner) {
        result = 'win';
        alert("Game Over! Bạn đã THẮNG! (+30 Cúp)");
        setAllyTrophies(t => t + 30);
        setEnemyTrophies(t => t - 30);
      } else {
        result = 'loss';
        alert("Game Over! Bạn đã THUA! (-20 Cúp)");
        setAllyTrophies(t => Math.max(0, t - 20));
        setEnemyTrophies(t => t + 20);
      }
      // Persist result to server
      const savedToken = localStorage.getItem('fc_token');
      if (savedToken) {
        const res = await apiPost('/game-result', savedToken, { result });
        if (res.profile) setUserProfile(res.profile);
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
    socketRef.current?.emit('joinQueue', {
      userId: userProfile?.username || 'user_' + Math.random(),
      deck: decks[activeDeckIndex].map(c => c.name)
    });
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

    const towers = gameData?.towers || initialTowers;
    const p2LeftGone = !towers.find((t: any) => t.id === 'p2_left' && t.hp > 0);
    const p2RightGone = !towers.find((t: any) => t.id === 'p2_right' && t.hp > 0);

    const isSpell = SPELL_NAMES.includes(selectedCard);

    const checkSpawnValid = (tx: number, ty: number, spell: boolean) => {
      if (spell) return true;
      if (ty >= 55 && ty <= 100) return true;
      const towers = gameData?.towers || initialTowers;
      const p2LeftGone = !towers.find((t: any) => t.id === 'p2_left' && t.hp > 0);
      const p2RightGone = !towers.find((t: any) => t.id === 'p2_right' && t.hp > 0);
      if (p2LeftGone && tx < 50 && ty >= 25 && ty < 55) return true;
      if (p2RightGone && tx >= 50 && ty >= 25 && ty < 55) return true;
      return false;
    };

    const isSpawnValid = checkSpawnValid(x, y, isSpell);

    if (!isSpawnValid) return;

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

  const saveDeckToServer = async (newDecks: CardDef[][]) => {
    const savedToken = localStorage.getItem('fc_token');
    if (!savedToken) return;
    const deckNames = newDecks.map(d => d.map(c => c.name));
    const res = await apiPut('/decks', savedToken, { decks: deckNames });
    if (res.profile) setUserProfile(res.profile);
  };

  const addCardToDeck = (card: CardDef) => {
    const isSpell = SPELL_NAMES.includes(card.name);

    setDecks(prev => {
      const currentDeck = prev[activeDeckIndex];

      // Limit to 10 cards total
      if (currentDeck.length >= 10) return prev;

      // Limit to 3 spells
      if (isSpell) {
        const spellCount = currentDeck.filter(c => SPELL_NAMES.includes(c.name)).length;
        if (spellCount >= 3) {
          alert("Mỗi bộ bài chỉ được phép chứa tối đa 3 thẻ Phép thuật (Spell)!");
          return prev;
        }
      }

      const newDecks = [...prev];
      newDecks[activeDeckIndex] = [...currentDeck, card];
      saveDeckToServer(newDecks);
      return newDecks;
    });
  };

  const removeCardFromDeck = (card: CardDef) => {
    setDecks(prev => {
      const newDecks = [...prev];
      newDecks[activeDeckIndex] = newDecks[activeDeckIndex].filter(c => c.name !== card.name);
      saveDeckToServer(newDecks);
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

  // Show auth screen if not logged in
  if (!token || !userProfile) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* ── HOME / LOBBY SCREEN ── */}
      {matchStatus !== 'playing' && (
        <div className="absolute inset-0 z-50 flex flex-col overflow-hidden" id="home-screen"
          style={{ background: 'linear-gradient(160deg, #0a0a1a 0%, #1a0a2e 40%, #0d1a3a 100%)' }}>
          {/* Home particles: gold + violet + cyan */}
          <Particles colors={['#facc15', '#a78bfa', '#34d399', '#f9a8d4', '#7c3aed']} />

          {/* Animated background orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute w-96 h-96 rounded-full opacity-20 animate-pulse"
              style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', top: '-10%', left: '-10%', animationDuration: '4s' }} />
            <div className="absolute w-80 h-80 rounded-full opacity-15 animate-pulse"
              style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)', bottom: '-5%', right: '-5%', animationDuration: '6s', animationDelay: '2s' }} />
            <div className="absolute w-64 h-64 rounded-full opacity-10 animate-pulse"
              style={{ background: 'radial-gradient(circle, #ec4899, transparent)', top: '40%', right: '10%', animationDuration: '5s', animationDelay: '1s' }} />
          </div>

          {/* Top bar: Logout */}
          <div className="relative z-10 flex justify-end px-6 pt-5">
            <button onClick={handleLogout} title="Logout"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/50 rounded-full text-slate-400 hover:text-rose-400 text-sm font-medium transition-all">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Center content */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-6">

            {/* Logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-6xl mb-1 animate-bounce" style={{ animationDuration: '3s' }}>⚔️</div>
              <h1 className="text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text"
                style={{ fontFamily: "'Cinzel Decorative', cursive", backgroundImage: 'linear-gradient(135deg, #67e8f9, #a78bfa, #f9a8d4)' }}>
                FAIRY CLASH
              </h1>
              <p className="text-slate-400 text-sm tracking-[0.3em] uppercase">Real-time Card Battle</p>
            </div>

            {/* Profile card */}
            <div className="w-full max-w-sm bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl font-black text-white shadow-lg">
                    {userProfile.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg leading-none">{userProfile.displayName}</p>
                    <p className="text-slate-500 text-xs mt-0.5">@{userProfile.username}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <Trophy className="w-5 h-5" />
                    <span className="font-black text-2xl">{userProfile.cups}</span>
                  </div>
                  <span className="text-yellow-600 text-xs font-medium">Cups</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
                <div className="flex flex-col items-center">
                  <span className="text-green-400 font-black text-xl">{userProfile.stats.wins}</span>
                  <span className="text-slate-500 text-xs">Wins</span>
                </div>
                <div className="flex flex-col items-center border-x border-white/10">
                  <span className="text-rose-400 font-black text-xl">{userProfile.stats.losses}</span>
                  <span className="text-slate-500 text-xs">Losses</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-cyan-400 font-black text-xl">
                    {userProfile.stats.wins + userProfile.stats.losses > 0
                      ? Math.round((userProfile.stats.wins / (userProfile.stats.wins + userProfile.stats.losses)) * 100)
                      : 0}%
                  </span>
                  <span className="text-slate-500 text-xs">Win Rate</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {matchStatus === 'idle' && (
              <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                {/* Battle button */}
                <button onClick={startMatchmaking}
                  className="group w-full py-4 rounded-2xl font-black text-xl text-white relative overflow-hidden shadow-2xl transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6)' }}>
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-2xl" />
                  <div className="relative flex items-center justify-center gap-3">
                    <Sword className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.15em' }}>BATTLE</span>
                  </div>
                </button>

                {/* Deck button */}
                <button onClick={() => setIsDeckOpen(true)}
                  className="group w-full py-3 rounded-2xl font-bold text-base text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 transition-all">
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.1em' }}>🃏 MANAGE DECKS</span>
                </button>
              </div>
            )}

            {/* Searching state */}
            {matchStatus === 'searching' && (
              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <div className="w-full py-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-cyan-300 font-bold tracking-widest text-sm">FINDING OPPONENT...</span>
                </div>
                <button onClick={cancelMatchmaking}
                  className="text-sm text-slate-500 hover:text-rose-400 underline transition-colors">
                  Cancel
                </button>
              </div>
            )}

            {/* Loading state */}
            {matchStatus === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-fuchsia-400 animate-spin" />
                <p className="text-fuchsia-300 font-bold tracking-widest text-sm animate-pulse">LOADING ARENA...</p>
              </div>
            )}
          </div>

          {/* Bottom version tag */}
          <div className="relative z-10 text-center pb-4">
            <span className="text-slate-700 text-xs">Fairy Clash v0.1 · CNPM Project</span>
          </div>
        </div>
      )}


      {/* Deck Builder Overlay */}
      {isDeckOpen && matchStatus === 'idle' && (
        <div className="absolute inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-y-auto" style={{ position: 'absolute' }}>
          {/* Deck particles: green + teal + emerald */}
          <Particles colors={['#10b981', '#06b6d4', '#6ee7b7', '#a3e635', '#34d399']} />
          <div className="relative z-10 flex flex-col flex-1 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-4xl font-['Cinzel_Decorative'] text-cyan-300 drop-shadow-lg">YOUR DECK</h2>
              <button onClick={() => setIsDeckOpen(false)} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold shadow-lg transition-all">CLOSE</button>
            </div>

            {/* Deck Tabs - Removed temporarily */}
            <div className="mb-6 invisible h-0"></div>

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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-900/60 rounded-full border border-cyan-400/30">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="font-['Rajdhani'] font-semibold text-cyan-300">{userProfile.cups}</span>
          </div>
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

                {/* Spawn Area Highlight */}
                {selectedCard && !SPELL_NAMES.includes(selectedCard) && (
                  <div className="absolute inset-0 pointer-events-none z-[5]">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <filter id="area-glow">
                          <feGaussianBlur stdDeviation="1.5" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(34, 211, 238, 0.25)" />
                          <stop offset="50%" stopColor="rgba(34, 211, 238, 0.1)" />
                          <stop offset="100%" stopColor="rgba(34, 211, 238, 0.25)" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const towers = gameData?.towers || initialTowers;
                        const L = !towers.find((t: any) => t.id === 'p2_left' && t.hp > 0);
                        const R = !towers.find((t: any) => t.id === 'p2_right' && t.hp > 0);

                        let d = "";
                        if (L && R) {
                          d = "M 0 25 L 100 25 L 100 100 L 0 100 Z";
                        } else if (L) {
                          d = "M 0 25 L 50 25 L 50 55 L 100 55 L 100 100 L 0 100 Z";
                        } else if (R) {
                          d = "M 0 55 L 50 55 L 50 25 L 100 25 L 100 100 L 0 100 Z";
                        } else {
                          d = "M 0 55 L 100 55 L 100 100 L 0 100 Z";
                        }

                        return (
                          <path
                            d={d}
                            fill="url(#area-grad)"
                            stroke="rgba(34, 211, 238, 0.8)"
                            strokeWidth="0.8"
                            strokeDasharray="2,2"
                            filter="url(#area-glow)"
                            className="animate-pulse"
                          />
                        );
                      })()}
                    </svg>
                  </div>
                )}
              </div>

              {/* Click Overlay inside 3D space */}
              <div
                className="absolute inset-0 z-[1000] cursor-crosshair"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  handleBattlefieldClick(e, x, y);
                }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  handleMouseMove(e, x, y);
                }}
                onMouseLeave={handleMouseLeave}
              />
              {/* Towers */}
              {(gameData?.towers || initialTowers).filter((t: any) => t.hp > 0).map((tower: any) => (
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
                  <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 ${tower.type === 'king' ? 'w-20' : 'w-14'} h-1.5 bg-black/50 rounded-full overflow-hidden border border-black/20`}>
                    <div className={`h-full ${tower.side === 'bottom' ? 'bg-cyan-400' : 'bg-rose-400'} transition-all duration-300`}
                      style={{ width: `${Math.max(0, Math.min(100, (tower.hp / tower.maxHp) * 100))}%` }}></div>
                  </div>
                </div>
              ))}

              {/* Units / Troops */}
              {gameData?.entities?.map((entity) => (
                <BattleEntity key={entity.id} entity={entity} />
              ))}

              {/* Attacks Visuals */}
              <BattleEffects attacks={gameData?.attacks} />

              {/* Active Persistent Spells Visuals */}
              {gameData?.activeSpells?.map((spell: any) => (
                <div
                  key={spell.id}
                  className="absolute rounded-full pointer-events-none z-[400]"
                  style={{
                    left: `${spell.x}%`,
                    top: `${spell.y}%`,
                    transform: 'translate(-50%, -50%) translateZ(1px)',
                    width: `${spell.radius * 2}%`,
                    height: `${spell.radius * 2}%`,
                    background: spell.name === 'Poison Apple' ? 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, rgba(20, 83, 45, 0.1) 70%, transparent 100%)' : 'rgba(255, 255, 255, 0.1)',
                    border: spell.name === 'Poison Apple' ? '2px solid rgba(74, 222, 128, 0.3)' : 'none',
                    boxShadow: spell.name === 'Poison Apple' ? '0 0 20px rgba(34, 197, 94, 0.2)' : 'none',
                    animation: 'pulse 2s infinite ease-in-out'
                  }}
                >
                  {spell.name === 'Poison Apple' && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-40 text-xl">
                      🤢
                    </div>
                  )}
                </div>
              ))}

              {/* Troop Phantom Preview (Giả lập vị trí Troop) */}
              {selectedCard && hoverPos && !SPELL_NAMES.includes(selectedCard) && (() => {
                const towers = gameData?.towers || initialTowers;
                const p2LeftGone = !towers.find((t: any) => t.id === 'p2_left' && t.hp > 0);
                const p2RightGone = !towers.find((t: any) => t.id === 'p2_right' && t.hp > 0);

                const isValid = (hoverPos.y >= 55 && hoverPos.y <= 95) ||
                  (p2LeftGone && hoverPos.x < 50 && hoverPos.y >= 25 && hoverPos.y < 55) ||
                  (p2RightGone && hoverPos.x >= 50 && hoverPos.y >= 25 && hoverPos.y < 55);

                return (
                  <div
                    className={`absolute flex flex-col items-center pointer-events-none transition-all duration-75 ${isValid ? 'opacity-60 scale-100' : 'opacity-20 scale-90 grayscale'}`}
                    style={{
                      left: `${hoverPos.x}%`,
                      top: `${hoverPos.y}%`,
                      transform: 'translate(-50%, -100%) translateZ(20px)',
                      zIndex: 999
                    }}
                  >
                    <div className="relative w-12 h-16 rounded-lg border-2 border-cyan-400 bg-gradient-to-b from-cyan-600/40 to-blue-800/40 shadow-xl flex flex-col items-center justify-center p-1 backdrop-blur-sm">
                      <div className="text-[8px] text-cyan-100 font-bold uppercase truncate w-full text-center mb-1">{selectedCard}</div>
                      <div className="text-2xl drop-shadow-lg">{getCardIcon(selectedCard)}</div>
                      <div className="absolute -bottom-2 w-10 h-1 bg-cyan-400/30 rounded-full"></div>
                    </div>
                    {/* Shadow indicator */}
                    <div className="w-8 h-2 bg-black/30 rounded-full blur-[2px] mt-1"></div>
                  </div>
                );
              })()}

              {/* Spell AoE Preview (Dành riêng cho Phép thuật) */}
              {selectedCard && hoverPos && SPELL_NAMES.includes(selectedCard) && (
                <div
                  className="absolute rounded-full border-2 border-fuchsia-400 bg-fuchsia-500/20 transition-none pointer-events-none z-[998]"
                  style={{
                    left: `${hoverPos.x}%`,
                    top: `${hoverPos.y}%`,
                    // Dùng translate(-50%, -50%) để tâm của vòng tròn trùng chính xác với con trỏ chuột
                    transform: 'translate(-50%, -50%) translateZ(1px)',
                    // Oz Tornado có radius 20 (đường kính 40%), Poison Apple radius 12 (đường kính 24%), các phép khác radius 15 (đường kính 30%)
                    width: selectedCard === 'Oz Tornado' ? '40%' : (selectedCard === 'Poison Apple' ? '24%' : '30%'),
                    height: selectedCard === 'Oz Tornado' ? '40%' : (selectedCard === 'Poison Apple' ? '24%' : '30%'),
                    boxShadow: '0 0 20px rgba(217, 70, 239, 0.3) inset'
                  }}
                />
              )}

              {/* Removed redundant highlight div since it was moved inside Arena Floor */}

              {/* Full Map Highlight for Spells */}
              {selectedCard && (selectedCard === 'Poison Apple' || selectedCard === 'Miner Bomb' || selectedCard === 'Oz Tornado' || selectedCard === "Glinda's Light") && (
                <div className="absolute inset-4 border-2 border-dashed border-purple-500/40 bg-purple-500/10 rounded-3xl animate-pulse pointer-events-none z-[500]" />
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
      {/* Battle particles: red + orange + amber */}
      {matchStatus === 'playing' && (
        <Particles colors={['#f87171', '#fb923c', '#fbbf24', '#ef4444', '#f59e0b']} />
      )}

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
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) translateZ(5px) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) translateZ(10px) scale(1.05); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
