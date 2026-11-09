const ROOM_ID = /^[A-Za-z0-9_-]{8,64}$/;

const ERROR_CODES = ["bad-message", "room-exists", "no-room", "room-full"] as const;
type ErrorCode = (typeof ERROR_CODES)[number];

function isErrorCode(x: unknown): x is ErrorCode {
  return ERROR_CODES.some((code) => code === x);
}

export type ClientMessage =
  | { t: "create"; room: string }
  | { t: "join"; room: string }
  | { t: "signal"; data: string };

/*
const SERVER_CODES = ["created", "joined", "peer-joined", "signal", "peer-left", "error"] as const;
type ServerCode = (typeof SERVER_CODES)[number];

export type ServerMessage =
  | { t: ServerCode }
  | { t: ServerCode; data: string }
  | {
    t: ServerCode;
    code: ErrorCode;
  };

export isServerCode(x: unknown): x is ServerCode {
  return SERVER_CODES.some((code) => code === x);
}
*/
export type ServerMessage =
  | { t: "created" }
  | { t: "joined" }
  | { t: "peer-joined" }
  | { t: "signal"; data: string }
  | { t: "peer-left" }
  | {
    t: "error";
    code: ErrorCode;
  };

export function parseClientMessage(text: string): ClientMessage | null {
  let msg: unknown;
  try {
    msg = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof msg !== "object" || msg === null || !("t" in msg)) return null;

  switch (msg.t) {
    case "create":
    case "join":
      if (
        !("room" in msg) ||
        typeof msg.room !== "string" ||
        !ROOM_ID.test(msg.room)
      )
        return null;
      return { t: msg.t, room: msg.room };
    case "signal":
      if (!("data" in msg) || typeof msg.data !== "string") return null;
      return { t: "signal", data: msg.data };
    default:
      return null;
  }
}

export function parseServerMessage(text: string): ServerMessage | null {
  let msg: unknown;
  try {
    msg = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof msg !== "object" || msg === null || !("t" in msg)) return null;

  switch (msg.t) {
    case "created":
    case "joined":
    case "peer-joined":
    case "peer-left":
      return { t: msg.t };
    case "signal":
      if (!("data" in msg) || typeof msg.data !== "string") return null;
      return { t: "signal", data: msg.data };
    case "error":
      if (
        !("code" in msg) ||
        !isErrorCode(msg.code)
      )
        return null;
      return { t: "error", code: msg.code };
    default:
      return null;
  }
}