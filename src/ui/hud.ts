import type { Color } from '../game/rules';
import { CHARACTERS } from '../render/characters';
import type { BotLevel } from '../ai/bot';

export type PlayerType = 'human' | BotLevel;

export const PLAYER_TYPE_LABELS: Record<PlayerType, string> = {
  human: '👤 Humano',
  easy: '🤖 Bot Fácil',
  medium: '🤖 Bot Médio',
  hard: '🤖 Bot Difícil',
};

export const NEXT_PLAYER_TYPE: Record<PlayerType, PlayerType> = {
  human: 'easy',
  easy: 'medium',
  medium: 'hard',
  hard: 'human',
};

export const TEAM: Record<Color, { name: string; icon: string; css: string }> = {
  red: { name: 'Vermelho', icon: '▲', css: '#e84a4a' },
  green: { name: 'Verde', icon: '●', css: '#3dbb5c' },
  yellow: { name: 'Amarelo', icon: '■', css: '#d4a800' },
  blue: { name: 'Azul', icon: '◆', css: '#3b7be8' },
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
export const ui = {
  hud: $('hud'), turn: $('turn'), msg: $('msg'), roll: $<HTMLButtonElement>('roll'),
  menu: $('menu'), win: $('win'), winText: $('win-text'), again: $('again'),
  startBtn: $<HTMLButtonElement>('start-btn'),
  quickSoloBtn: $<HTMLButtonElement>('quick-solo-btn'),
  slotsContainer: $('player-slots'),
  muteBtn: $<HTMLButtonElement>('mute-btn'),

  // Online tabs & panels
  tabLocal: $<HTMLButtonElement>('tab-local'),
  tabOnline: $<HTMLButtonElement>('tab-online'),
  panelLocal: $('panel-local'),
  panelOnline: $('panel-online'),

  // Online setup & lobby
  onlineSetup: $('online-setup'),
  onlineLobby: $('online-lobby'),
  createRoomBtn: $<HTMLButtonElement>('create-room-btn'),
  joinRoomBtn: $<HTMLButtonElement>('join-room-btn'),
  roomCodeInput: $<HTMLInputElement>('room-code-input'),
  onlineError: $('online-error'),
  lobbyCode: $('lobby-code'),
  copyLinkBtn: $<HTMLButtonElement>('copy-link-btn'),
  lobbyPlayers: $('lobby-players'),
  lobbyWaitMsg: $('lobby-wait-msg'),
  lobbyStartBtn: $<HTMLButtonElement>('lobby-start-btn'),

  // Cards UI
  cardBanner: $('card-banner'),
  cardsDock: $('cards-dock'),
  cardsFan: $('cards-fan'),
  cardInspectModal: $('card-inspect-modal'),
  modalCardBadge: $('modal-card-badge'),
  modalCardTitle: $('modal-card-title'),
  modalCardDesc: $('modal-card-desc'),
  modalCardClose: $<HTMLButtonElement>('modal-card-close'),
  modalCardUse: $<HTMLButtonElement>('modal-card-use'),
  gameLog: $('game-log'),

  // Timer
  timerBadge: $('timer-badge'),
  timerSec: $('timer-sec'),
};

export const label = (c: Color) => `<span style="color:${TEAM[c].css}">${TEAM[c].icon} ${CHARACTERS[c].name}</span>`;

/** Cast list for the menu. */
export const cast = () => (Object.keys(TEAM) as Color[]).map((c) => `<span>${label(c)}</span>`).join('');
