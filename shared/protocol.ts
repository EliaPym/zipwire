export type ClientMessage =
  | { t: "create"; room: string }
  | { t: "join"; room: string }
  | { t: "signal"; data: string };

export type ServerMessage =
  | { t: "created" }
  | { t: "joined" }
  | { t: "peer-joined" }
  | { t: "signal"; data: string }
  | { t: "peer-left" }
  | {
    t: "error";
    code: "bad-message" | "room-exists" | "no-room" | "room-full";
  };

const ROOM_ID = /^[A-Za-z0-9_-]{8,64}$/;

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

  if (typeof msg !== "object" || msg == null || !("t" in msg)) return null;

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
        (msg.code !== "bad-message" &&
          msg.code !== "room-exists" &&
          msg.code !== "no-room" &&
          msg.code !== "room-full")
      )
        return null;
      return { t: "error", code: msg.code };
    default:
      return null;
  }
}