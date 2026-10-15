import './ui/style.css';
import { apply, createGame, currentColor, GameEvent, GameState, legalMoves } from './game/engine';
import type { Color } from './game/rules';
import { Scene3D } from './render/scene';
import { cast, label, NEXT_PLAYER_TYPE, PLAYER_TYPE_LABELS, PlayerType, TEAM, ui } from './ui/hud';
import { showBubble } from './ui/bubble';
import { chooseMove } from './ai/bot';
import { sound } from './audio/sound';
import { net, RoomState } from './net/network';

const PLAYERS: Record<number, Color[]> = {
  2: ['red', 'yellow'],
  3: ['red', 'green', 'yellow'],
  4: ['red', 'green', 'yellow', 'blue'],
};

const scene = new Scene3D(document.getElementById('c') as HTMLCanvasElement);
let state: GameState | null = null;
let busy = false;
let isOnline = false;
let botTimer: number | null = null;

scene.onSpeak = showBubble;
scene.onSound = (name) => {
  if (name === 'dice') sound.diceRoll();
  else if (name === 'hop') sound.hop();
  else if (name === 'trip') sound.trip();
  else if (name === 'capture') sound.capture();
  else if (name === 'finish') sound.finish();
  else if (name === 'win') sound.win();
};

let selectedN = 4;
const slotTypes: Record<Color, PlayerType> = {
  red: 'human',
  green: 'medium',
  yellow: 'medium',
  blue: 'medium',
};

// --- Local Slots Setup ---

function renderLocalSlots() {
  const activeColors = PLAYERS[selectedN];
  ui.slotsContainer.innerHTML = '';
  for (const c of activeColors) {
    const row = document.createElement('div');
    row.className = 'slot-row';
    row.innerHTML = `
      <span class="slot-label" style="color:${TEAM[c].css}">${TEAM[c].icon} ${TEAM[c].name}</span>
      <button class="slot-btn" data-color="${c}">${PLAYER_TYPE_LABELS[slotTypes[c]]}</button>
    `;
    const btn = row.querySelector('button')!;
    btn.onclick = () => {
      sound.click();
      slotTypes[c] = NEXT_PLAYER_TYPE[slotTypes[c]];
      btn.textContent = PLAYER_TYPE_LABELS[slotTypes[c]];
    };
    ui.slotsContainer.appendChild(row);
  }
}

// --- HUD Refresh & Action Handler ---

function refresh(note = '') {
  if (!state) return;
  const c = currentColor(state);

  if (isOnline) {
    const isMyTurn = c === net.myColor;
    const playerInfo = net.colors[c];
    ui.turn.innerHTML = `Vez de ${label(c)} ${isMyTurn ? '<b>(Você)</b>' : `(${playerInfo.name})`}`;
    ui.msg.innerHTML = note || (state.phase === 'move' ? (isMyTurn ? `Tirou ${state.dice}. Toque numa peça.` : 'Escolhendo peça...') : (isMyTurn ? 'Sua vez de rolar!' : 'Aguardando rolagem...'));
    ui.roll.disabled = busy || state.phase !== 'roll' || !isMyTurn;
    scene.highlight(c, busy || !isMyTurn ? [] : legalMoves(state));
    return;
  }

  // Local / Bot mode
  const type = slotTypes[c];
  const isBot = type !== 'human';
  ui.turn.innerHTML = `Vez de ${label(c)} ${isBot ? `(${PLAYER_TYPE_LABELS[type]})` : ''}`;
  ui.msg.innerHTML = note || (state.phase === 'move' ? (isBot ? 'Pensando...' : `Tirou ${state.dice}. Toque numa peça.`) : (isBot ? 'Rolando dado...' : ''));
  ui.roll.disabled = busy || state.phase !== 'roll' || isBot;
  scene.highlight(c, busy || isBot ? [] : legalMoves(state));
}

function describe(events: GameEvent[]): string {
  const parts: string[] = [];
  for (const e of events) {
    if (e.type === 'tokenCaptured') parts.push(`${label(e.by)} capturou ${label(e.color)}!`);
    if (e.type === 'turnForfeited') parts.push(`Três 6 seguidos! ${label(e.color)} perdeu a vez.`);
    if (e.type === 'tokenFinished') parts.push(`${label(e.color)} chegou ao destino!`);
  }
  const rolled = events.find((e) => e.type === 'diceRolled');
  if (rolled && events.some((e) => e.type === 'turnChanged') && !parts.length) parts.push(`Tirou ${rolled.value}. Sem jogadas.`);
  return parts.join(' ');
}

function scheduleBotTurn() {
  if (isOnline || botTimer) clearTimeout(botTimer!);
  if (!state || busy || state.winner) return;

  const c = currentColor(state);
  const type = slotTypes[c];
  if (type === 'human') return;

  if (state.phase === 'roll') {
    botTimer = window.setTimeout(() => act({ type: 'roll' }), 700);
  } else if (state.phase === 'move') {
    botTimer = window.setTimeout(() => {
      const best = chooseMove(state!, type);
      if (best >= 0) act({ type: 'move', token: best });
    }, 750);
  }
}

async function act(action: Parameters<typeof apply>[1]) {
  if (isOnline) {
    net.sendClientAction(action);
    return;
  }

  if (busy || !state) return;
  const res = apply(state, action);
  busy = true;
  refresh();
  await scene.play(res.events);
  state = res.state;
  busy = false;

  if (state.winner) {
    ui.hud.hidden = true;
    ui.winText.innerHTML = `${label(state.winner)} venceu!`;
    setTimeout(() => (ui.win.hidden = false), 2500);
    return;
  }

  refresh(describe(res.events));

  // Single legal move autoplay for humans
  const c = currentColor(state);
  if (slotTypes[c] === 'human') {
    const moves = legalMoves(state);
    if (moves.length === 1) {
      act({ type: 'move', token: moves[0] });
      return;
    }
  }

  scheduleBotTurn();
}

function startLocal() {
  isOnline = false;
  state = createGame(PLAYERS[selectedN], Date.now() >>> 0);
  scene.setup(state.tokens);
  ui.menu.hidden = ui.win.hidden = true;
  ui.hud.hidden = false;
  ui.timerBadge.hidden = true;
  refresh();
  scheduleBotTurn();
}

// --- Online Lobby Handling ---

function renderLobby(room: RoomState) {
  ui.lobbyCode.textContent = room.code;
  ui.lobbyPlayers.innerHTML = '';

  const colors: Color[] = ['red', 'green', 'yellow', 'blue'];
  for (const c of colors) {
    const p = room.players[c];
    const isMe = c === room.myColor;
    const row = document.createElement('div');
    row.className = 'slot-row';
    row.innerHTML = `
      <span class="slot-label" style="color:${TEAM[c].css}">${TEAM[c].icon} ${TEAM[c].name}</span>
      <span class="slot-btn">${isMe ? '👤 Você' : (p.isBot ? '🤖 Bot' : '👤 Conectado')}</span>
    `;
    ui.lobbyPlayers.appendChild(row);
  }

  if (room.isHost) {
    ui.lobbyStartBtn.hidden = false;
    ui.lobbyWaitMsg.textContent = 'Você é o anfitrião. Inicie quando estiver pronto!';
  } else {
    ui.lobbyStartBtn.hidden = true;
    ui.lobbyWaitMsg.textContent = 'Aguardando o anfitrião iniciar a partida...';
  }
}

net.onRoomUpdate = (room) => {
  renderLobby(room);
};

net.onTimerTick = (sec) => {
  ui.timerSec.textContent = String(sec);
};

net.onGameStart = (seed, _colors) => {
  isOnline = true;
  state = createGame(['red', 'green', 'yellow', 'blue'], seed);
  scene.setup(state.tokens);
  ui.menu.hidden = ui.win.hidden = true;
  ui.hud.hidden = false;
  ui.timerBadge.hidden = false;
  refresh();
};

net.onSync = async (nextState, events) => {
  busy = true;
  refresh();
  await scene.play(events);
  state = nextState;
  busy = false;

  if (state.winner) {
    ui.hud.hidden = true;
    ui.winText.innerHTML = `${label(state.winner)} venceu!`;
    setTimeout(() => (ui.win.hidden = false), 2500);
    return;
  }

  refresh(describe(events));

  // Auto-play single move for online player
  if (state.phase === 'move' && currentColor(state) === net.myColor) {
    const moves = legalMoves(state);
    if (moves.length === 1) {
      net.sendClientAction({ type: 'move', token: moves[0] });
    }
  }
};

// --- Menu Tab Events ---

function switchTab(mode: 'local' | 'online') {
  sound.click();
  if (mode === 'local') {
    ui.tabLocal.classList.add('active');
    ui.tabOnline.classList.remove('active');
    ui.panelLocal.hidden = false;
    ui.panelOnline.hidden = true;
  } else {
    ui.tabOnline.classList.add('active');
    ui.tabLocal.classList.remove('active');
    ui.panelOnline.hidden = false;
    ui.panelLocal.hidden = true;
  }
}

ui.tabLocal.onclick = () => switchTab('local');
ui.tabOnline.onclick = () => switchTab('online');

document.getElementById('cast')!.innerHTML = cast();
renderLocalSlots();

document.querySelectorAll<HTMLButtonElement>('.n-select button').forEach((b) => {
  b.onclick = () => {
    sound.click();
    document.querySelectorAll('.n-select button').forEach((btn) => btn.classList.remove('active'));
    b.classList.add('active');
    selectedN = Number(b.dataset.n);
    renderLocalSlots();
  };
});

ui.startBtn.onclick = () => {
  sound.click();
  startLocal();
};

ui.quickSoloBtn.onclick = () => {
  sound.click();
  selectedN = 4;
  slotTypes.red = 'human';
  slotTypes.green = 'medium';
  slotTypes.yellow = 'medium';
  slotTypes.blue = 'hard';
  document.querySelectorAll('.n-select button').forEach((btn) => btn.classList.remove('active'));
  document.querySelector('.n-select button[data-n="4"]')?.classList.add('active');
  renderLocalSlots();
  startLocal();
};

ui.muteBtn.onclick = () => {
  const isMuted = sound.toggleMute();
  ui.muteBtn.textContent = isMuted ? '🔇' : '🔊';
  ui.muteBtn.title = isMuted ? 'Ativar som' : 'Silenciar som';
};

// --- Online Room Creation & Joining ---

ui.createRoomBtn.onclick = async () => {
  sound.click();
  ui.createRoomBtn.disabled = true;
  ui.createRoomBtn.textContent = 'Criando sala...';
  try {
    const code = await net.createRoom();
    ui.onlineSetup.hidden = true;
    ui.onlineLobby.hidden = false;
    ui.lobbyCode.textContent = code;
  } catch (err: any) {
    ui.onlineError.hidden = false;
    ui.onlineError.textContent = 'Erro ao criar sala. Verifique a conexão.';
    ui.createRoomBtn.disabled = false;
    ui.createRoomBtn.textContent = '🚀 Criar Nova Sala';
  }
};

ui.copyLinkBtn.onclick = () => {
  sound.click();
  const link = `${window.location.origin}${window.location.pathname}?room=${net.roomCode}`;
  navigator.clipboard.writeText(link);
  ui.copyLinkBtn.textContent = '✓ Copiado!';
  setTimeout(() => (ui.copyLinkBtn.textContent = '📋 Copiar Link'), 2000);
};

ui.joinRoomBtn.onclick = async () => {
  sound.click();
  const code = ui.roomCodeInput.value.trim().toUpperCase();
  if (!code) return;
  ui.joinRoomBtn.disabled = true;
  ui.joinRoomBtn.textContent = 'Entrando...';
  ui.onlineError.hidden = true;
  try {
    await net.joinRoom(code, 'Jogador Convidado');
    ui.onlineSetup.hidden = true;
    ui.onlineLobby.hidden = false;
    ui.lobbyCode.textContent = code;
  } catch (err: any) {
    ui.onlineError.hidden = false;
    ui.onlineError.textContent = 'Sala não encontrada ou cheia.';
    ui.joinRoomBtn.disabled = false;
    ui.joinRoomBtn.textContent = 'Entrar';
  }
};

ui.lobbyStartBtn.onclick = () => {
  sound.click();
  net.startHostGame(['red', 'green', 'yellow', 'blue']);
};

ui.again.onclick = () => {
  sound.click();
  if (botTimer) clearTimeout(botTimer);
  net.destroy();
  isOnline = false;
  ui.win.hidden = true;
  ui.menu.hidden = false;
  ui.hud.hidden = true;
  ui.onlineSetup.hidden = false;
  ui.onlineLobby.hidden = true;
  renderLocalSlots();
};

ui.roll.onclick = () => {
  sound.click();
  act({ type: 'roll' });
};

addEventListener('keydown', (e) => {
  if (e.code === 'Space' && state?.phase === 'roll') {
    if (isOnline) {
      if (currentColor(state) === net.myColor) act({ type: 'roll' });
    } else if (slotTypes[currentColor(state)] === 'human') {
      act({ type: 'roll' });
    }
  }
});

// Tap/click on a piece
let down = { x: 0, y: 0 };
const canvas = document.getElementById('c')!;
canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
canvas.addEventListener('pointerup', (e) => {
  if (!state || busy || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
  const c = currentColor(state);

  if (isOnline) {
    if (c !== net.myColor) return;
  } else if (slotTypes[c] !== 'human') return;

  const hit = scene.pick(e.clientX, e.clientY);
  if (hit && hit.color === c && legalMoves(state).includes(hit.token)) {
    act({ type: 'move', token: hit.token });
  }
});

// Check URL query param for instant online join
const params = new URLSearchParams(window.location.search);
const roomParam = params.get('room');
if (roomParam) {
  switchTab('online');
  ui.roomCodeInput.value = roomParam.toUpperCase();
}
