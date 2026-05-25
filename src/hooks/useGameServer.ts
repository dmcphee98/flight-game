import { useCallback, useEffect, useReducer, useRef } from 'react'

const WS_URL = import.meta.env.VITE_GAME_SERVER_WS_URL ?? 'ws://localhost:8080/ws'

// ---------- Public types ----------

/** Represents the current state of the WebSocket connection. */
export type ConnectionStatus =
  | 'connecting'    // initial connection on mount
  | 'connected'     // socket is open, no room yet — landing screen buttons enabled
  | 'room_created'  // host created a room, in waiting room
  | 'room_joined'   // member joined a room, in waiting room
  | 'game_started'  // game is running
  | 'disconnected'  // socket closed unexpectedly
  | 'error'         // socket error

/** Client-side representation of a player. See {@link WirePlayer} for the raw server shape. */
export interface PlayerState {
  id: string
  name: string
}

/** Client-side representation of the current game session. */
export interface GameState {
  roomCode: string | null
  hostId: string | null
  myPlayerId: string | null
  players: PlayerState[]
  startsAtMs: number | null
}

/** Union of all messages the client can send to the server. */
export type ClientMessage =
  | { type: 'create_room'; player_name: string }
  | { type: 'join_room'; room_code: string; player_name: string }
  | { type: 'start_game' }

// ---------- Wire types (server to client) ----------

/**
 * Raw player shape as received from the server over the WebSocket connection.
 * Use {@link wireToPlayer} to convert to {@link PlayerState}.
 */
type WirePlayer = { id: string; name: string; }

/** Union of all messages the server can send to the client. */
type ServerMessage =
  | { type: 'room_created'; room_code: string; my_player_id: string; players: WirePlayer[] }
  | { type: 'room_joined'; room_code: string; host_id: string; my_player_id: string; players: WirePlayer[] }
  | { type: 'player_joined'; player: WirePlayer; players: WirePlayer[] }
  | { type: 'player_disconnected'; player_id: string; players: WirePlayer[] }
  | { type: 'game_started'; starts_at_unix_ms: number }

// ---------- Reducer ----------

interface HookState {
  status: ConnectionStatus
  gameState: GameState
}

const INITIAL_GAME_STATE: GameState = {
  roomCode: null,
  hostId: null,
  myPlayerId: null,
  players: [],
  startsAtMs: null,
}

type Action =
  | { type: 'set_status'; status: ConnectionStatus }
  | { type: 'server_msg'; msg: ServerMessage }
  | { type: 'reset' }

function reducer(state: HookState, action: Action): HookState {
  switch (action.type) {
    case 'set_status':
      return { ...state, status: action.status }

    case 'reset':
      return { status: 'connecting', gameState: INITIAL_GAME_STATE }

    case 'server_msg': {
      return applyServerMessage(state, action.msg)
    }
  }
}

/**
 * Applies a {@link ServerMessage} to the current state, returning the updated state.
 */
function applyServerMessage(state: HookState, message: ServerMessage): HookState {
  const gameState = state.gameState
  switch (message.type) {
    case 'room_created':
      return {
        status: 'room_created',
        gameState: {
          ...gameState,
          roomCode: message.room_code,
          myPlayerId: message.my_player_id,
          hostId: message.my_player_id,
          players: message.players.map(wireToPlayer),
        },
      }

    case 'room_joined':
      return {
        status: 'room_joined',
        gameState: {
          ...gameState,
          roomCode: message.room_code,
          hostId: message.host_id,
          myPlayerId: message.my_player_id,
          players: message.players.map(wireToPlayer),
        },
      }

    case 'player_joined':
    case 'player_disconnected':
      return {
        ...state,
        gameState: {
          ...gameState,
          players: message.players.map(wireToPlayer),
        },
      }

    case 'game_started':
      return {
        status: 'game_started',
        gameState: {
          ...gameState,
          startsAtMs: message.starts_at_unix_ms,
        },
      }

    default:
      return state
  }
}

/**
 * Converts a raw server-sent player object to the client-side PlayerState.
 */
function wireToPlayer(w: WirePlayer): PlayerState {
  return { id: w.id, name: w.name }
}

// ---------- Hook ----------

/** Return value of {@link useGameServer}. */
export interface GameServerHook {
  status: ConnectionStatus
  gameState: GameState
  sendMessage: (msg: ClientMessage) => void
}

/**
 * Manages the WebSocket connection to the game server.
 *
 * Handles connection lifecycle (open, close, error), message serialization,
 * and translates server messages into client-side state via a reducer.
 *
 * @returns {@link GameServerHook} */
export function useGameServer(): GameServerHook {
  const [state, dispatch] = useReducer(reducer, { status: 'connecting', gameState: INITIAL_GAME_STATE })

  const wsRef = useRef<WebSocket | null>(null)

  /**
   * Opens a new WebSocket connection and attaches event handlers.
   * Stores the socket in {@link wsRef} for use by {@link sendMessage},
   * and other functions.
   */
  const openSocket = useCallback(() => {
    const ws = new WebSocket(WS_URL) // Initiates the WebSocket connection
    wsRef.current = ws

    // Socket is open and ready; notify the rest of the app
    ws.onopen = () => {
        dispatch({ type: 'set_status', status: 'connected' })
    }

    // Parse incoming server message and forward to the reducer; silently drop malformed JSON
    ws.onmessage = (event: MessageEvent<string>) => {
      console.log(event.data) // TODO: remove
      let msg: ServerMessage
      try {
        msg = JSON.parse(event.data) as ServerMessage
      } catch {
        return
      }
      dispatch({ type: 'server_msg', msg })
    }

    ws.onerror = () => dispatch({ type: 'set_status', status: 'error' })
    ws.onclose = () => dispatch({ type: 'set_status', status: 'disconnected' })
  }, [])

  /**
   * Serializes and sends a {@link ClientMessage} to the server over the
   * active WebSocket connection. No-ops if the socket is not currently open.
   */
  const sendMessage = useCallback((msg: ClientMessage) => {
    wsRef.current?.send(JSON.stringify(msg))
  }, [])

  /**
   * Closes the active WebSocket connection.
   *
   * Nulls out all event handlers before closing the socket,
   * preventing them from firing during the closing handshake.
   */
  const closeSocket = useCallback(() => {
    const ws = wsRef.current
    if (!ws) return
    ws.onopen = null
    ws.onmessage = null
    ws.onerror = null
    ws.onclose = null
    ws.close()
    wsRef.current = null
  }, [])

  useEffect(() => {
    openSocket()
    return closeSocket
  }, [openSocket, closeSocket])

  return { gameState: state.gameState, status: state.status, sendMessage }
}
