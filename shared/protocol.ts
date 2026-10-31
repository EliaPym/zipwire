export type ClientMessage =
  | { t: "create"; room: string }
  | { t: "join"; room: string }
  | { t: "signal"; room: string };

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
    case "signal":
    default:
      return null;
  }
}
