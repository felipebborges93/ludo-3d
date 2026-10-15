import Peer, { DataConnection } from 'peerjs';
import type { Action, GameEvent, GameState } from '../game/engine';
import { apply, createGame, currentColor } from '../game/engine';
import { Color } from '../game/rules';
import { chooseMove } from '../ai/bot';

export interface RoomState {
  code: string;
  isHost: boolean;
  myColor: Color | null;
  players: Record<Color, { name: string; isBot: boolean }>;
}

export type NetMessage =
  | { type: 'join'; name: string }
  | { type: 'room_data'; code: string; color: Color; colors: Record<Color, { name: string; isBot: boolean }> }
  | { type: 'start_game'; seed: number; colors: Record<Color, { name: string; isBot: boolean }> }
  | { type: 'action'; action: Action }
  | { type: 'sync'; state: GameState; events: GameEvent[]; turnSeconds: number };

export class NetworkManager {
  private peer: Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private hostConn: DataConnection | null = null;
  private turnTimer: number | null = null;
  private turnInterval: number | null = null;
  public turnSeconds = 30;

  public isHost = false;
  public roomCode = '';
  public myColor: Color | null = null;
  public colors: Record<Color, { name: string; isBot: boolean }> = {
    red: { name: 'Dona Cocorina', isBot: false },
    green: { name: 'Abelardo', isBot: true },
    yellow: { name: 'Bananildo', isBot: true },
    blue: { name: 'Seu Gelinho', isBot: true },
  };

  public onRoomUpdate?: (room: RoomState) => void;
  public onGameStart?: (seed: number, colors: Record<Color, { name: string; isBot: boolean }>) => void;
  public onSync?: (state: GameState, events: GameEvent[]) => void;
  public onTimerTick?: (secondsLeft: number) => void;

  // --- Host Implementation ---

  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.isHost = true;
      this.myColor = 'red';
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.roomCode = code;

      this.peer = new Peer(`ludo3d-${code}`, { debug: 0 });

      this.peer.on('open', () => {
        resolve(code);
        this.notifyRoom();
      });

      this.peer.on('error', (err) => {
        reject(err);
      });

      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          this.connections.set(conn.peer, conn);
          conn.on('data', (data) => this.handleHostData(conn, data as NetMessage));
          conn.on('close', () => this.handleDisconnect(conn.peer));
        });
      });
    });
  }

  // Assigns incoming connection to first available bot slot
  private handleHostData(conn: DataConnection, msg: NetMessage) {
    if (msg.type === 'join') {
      const available: Color[] = (['green', 'yellow', 'blue'] as Color[]).filter((c) => this.colors[c].isBot);
      if (available.length > 0) {
        const assigned = available[0];
        this.colors[assigned] = { name: msg.name || `Jogador ${assigned}`, isBot: false };
        (conn as any).assignedColor = assigned;
        conn.send({
          type: 'room_data',
          code: this.roomCode,
          color: assigned,
          colors: this.colors,
        } as NetMessage);
        this.broadcastRoomData();
        this.notifyRoom();
      }
    } else if (msg.type === 'action') {
      const color = (conn as any).assignedColor as Color;
      if (color) {
        this.executeHostAction(msg.action, color);
      }
    }
  }

  private handleDisconnect(peerId: string) {
    const conn = this.connections.get(peerId);
    if (conn && (conn as any).assignedColor) {
      const c = (conn as any).assignedColor as Color;
      this.colors[c] = { name: `${this.colors[c].name} (Bot)`, isBot: true };
      this.broadcastRoomData();
      this.notifyRoom();
    }
    this.connections.delete(peerId);
  }

  private broadcast(msg: NetMessage) {
    for (const conn of this.connections.values()) {
      if (conn.open) conn.send(msg);
    }
  }

  private broadcastRoomData() {
    this.broadcast({
      type: 'room_data',
      code: this.roomCode,
      color: 'red', // client keeps its own
      colors: this.colors,
    });
  }

  private notifyRoom() {
    this.onRoomUpdate?.({
      code: this.roomCode,
      isHost: this.isHost,
      myColor: this.myColor,
      players: this.colors,
    });
  }

  // --- Client Implementation ---

  joinRoom(code: string, playerName: string): Promise<Color> {
    return new Promise((resolve, reject) => {
      this.isHost = false;
      this.roomCode = code.toUpperCase();
      this.peer = new Peer({ debug: 0 });

      this.peer.on('open', () => {
        const conn = this.peer!.connect(`ludo3d-${this.roomCode}`);
        this.hostConn = conn;

        conn.on('open', () => {
          conn.send({ type: 'join', name: playerName } as NetMessage);
        });

        conn.on('data', (data) => {
          const msg = data as NetMessage;
          if (msg.type === 'room_data') {
            if (!this.myColor && msg.color) this.myColor = msg.color;
            this.colors = msg.colors;
            this.notifyRoom();
            resolve(this.myColor!);
          } else if (msg.type === 'start_game') {
            this.onGameStart?.(msg.seed, msg.colors);
          } else if (msg.type === 'sync') {
            this.turnSeconds = msg.turnSeconds;
            this.onSync?.(msg.state, msg.events);
          }
        });

        conn.on('error', (err) => reject(err));
      });

      this.peer.on('error', (err) => reject(err));
    });
  }

  // --- In-Game Host Authority ---

  private hostState: GameState | null = null;
  private activeColors: Color[] = [];

  startHostGame(colors: Color[]) {
    this.activeColors = colors;
    const seed = Date.now() >>> 0;
    this.hostState = createGame(colors, seed);

    this.broadcast({
      type: 'start_game',
      seed,
      colors: this.colors,
    });

    this.onGameStart?.(seed, this.colors);
    this.startTurnCountdown();
  }

  executeHostAction(action: Action, fromColor?: Color) {
    if (!this.hostState) return;
    const curr = currentColor(this.hostState);
    if (fromColor && fromColor !== curr) return; // ignore out-of-turn actions

    try {
      const res = apply(this.hostState, action);
      this.hostState = res.state;

      this.broadcast({
        type: 'sync',
        state: res.state,
        events: res.events,
        turnSeconds: this.turnSeconds,
      });

      this.onSync?.(res.state, res.events);
      this.startTurnCountdown();

      // If current is bot, trigger bot decision
      this.checkHostBotTurn();
    } catch (e) {
      console.warn('Invalid host action:', e);
    }
  }

  private startTurnCountdown() {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    if (this.turnInterval) clearInterval(this.turnInterval);
    if (!this.hostState || this.hostState.winner) return;

    this.turnSeconds = 30;
    this.onTimerTick?.(this.turnSeconds);

    this.turnInterval = window.setInterval(() => {
      this.turnSeconds--;
      this.onTimerTick?.(this.turnSeconds);
      if (this.turnSeconds <= 0) {
        clearInterval(this.turnInterval!);
      }
    }, 1000);

    // Timeout: Bot takes over the move!
    this.turnTimer = window.setTimeout(() => {
      if (!this.hostState || this.hostState.winner) return;
      const c = currentColor(this.hostState);
      console.log(`Tempo esgotado para ${c}! Bot assumindo...`);
      if (this.hostState.phase === 'roll') {
        this.executeHostAction({ type: 'roll' });
      } else if (this.hostState.phase === 'move') {
        const best = chooseMove(this.hostState, 'medium');
        if (best >= 0) this.executeHostAction({ type: 'move', token: best });
      }
    }, 30000);
  }

  private checkHostBotTurn() {
    if (!this.hostState || this.hostState.winner) return;
    const c = currentColor(this.hostState);
    if (this.colors[c]?.isBot) {
      setTimeout(() => {
        if (!this.hostState || currentColor(this.hostState) !== c) return;
        if (this.hostState.phase === 'roll') {
          this.executeHostAction({ type: 'roll' });
        } else if (this.hostState.phase === 'move') {
          const best = chooseMove(this.hostState, 'medium');
          if (best >= 0) this.executeHostAction({ type: 'move', token: best });
        }
      }, 750);
    }
  }

  sendClientAction(action: Action) {
    if (this.isHost) {
      this.executeHostAction(action, this.myColor ?? undefined);
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({ type: 'action', action } as NetMessage);
    }
  }

  destroy() {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    if (this.turnInterval) clearInterval(this.turnInterval);
    this.peer?.destroy();
  }
}

export const net = new NetworkManager();
