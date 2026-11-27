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

export function parseObject(data: string): Record<string, unknown> | null {
   let msg: unknown;
   try {
      msg = JSON.parse(data);
   } catch {
      return null;
   }

   return typeof msg === "object" && msg !== null && "t" in msg ? msg : null;
}

export function parseClientMessage(data: string): ClientMessage | null {
   let msg = parseObject(data);

   if (!msg) return null;

   switch (msg.t) {
      case "create":
      case "join":
         return typeof msg.room === "string" && ROOM_ID.test(msg.room)
            ? { t: msg.t, room: msg.room }
            : null;
      case "signal":
         return typeof msg.data === "string" ? { t: "signal", data: msg.data } : null;
      default:
         return null;
   }
}

export function parseServerMessage(data: string): ServerMessage | null {
   let msg = parseObject(data);

   if (!msg) return null;

   switch (msg.t) {
      case "created":
      case "joined":
      case "peer-joined":
      case "peer-left":
         return { t: msg.t };
      case "signal":
         return typeof msg.data === "string" ? { t: "signal", data: msg.data } : null;
      case "error":
         return isErrorCode(msg.code) ? { t: "error", code: msg.code } : null;
      default:
         return null;
   }
}
