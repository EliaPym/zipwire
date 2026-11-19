const HEADER_SIZE: number = Uint32Array.length * 2; // 8-byte header
const CHUNK_SIZE: number = 1024 * 4; // 4MB chunk size

type Files = {
   id: number;
   name: string;
   size: number;
   type: string;
   path?: string;
};

function isFiles(x: unknown): x is Files[] {
   if (typeof x !== "object" || x === null || !Array.isArray(x)) return false;
   return (
      "id" in x[0] &&
      typeof x[0].id === "number" &&
      "name" in x[0] &&
      typeof x[0].name === "string" &&
      "size" in x[0] &&
      typeof x[0].size === "number" &&
      "type" in x[0] &&
      typeof x[0].type === "string"
   );
}

export type Payload =
   | { t: "manifest"; id: number; files: Files[]; chunkSize: number }
   | { t: "metadata"; name: string; size: number }
   | { t: "accept"; fileIDs: number[] }
   | { t: "reject" }
   | { t: "file-end"; fileID: number; chunks: number }
   | { t: "file-ok"; fileID: number }
   | { t: "abort" };

export function parsePayload(data: string): Payload | null {
   let p: unknown;
   try {
      p = JSON.parse(data);
   } catch {
      return null;
   }

   if (typeof p !== "object" || p === null || !("t" in p)) return null;

   switch (p.t) {
      case "manifest":
         if (
            !("id" in p) ||
            typeof p.id !== "number" ||
            !("files" in p) ||
            !isFiles(p.files) ||
            !("chunkSize" in p) ||
            typeof p.chunkSize !== "number"
         )
            return null;
         return {
            t: "manifest",
            id: p.id,
            files: p.files,
            chunkSize: p.chunkSize,
         };
      default:
         return null;
   }
}

export function manifest(f: File): Payload {
   let m: Payload = {
      t: "manifest",
      id: 0,
      files: [{ id: 0, name: f.name, size: f.size, type: f.type }],
      chunkSize: CHUNK_SIZE,
   };
   return m;
}

export function chunk(f: File[]): ArrayBuffer | null {
   let fileID: number = 0;
   f.forEach(function (file) {
      fileID++;
      const chunkCount: number = Math.ceil(file.size / CHUNK_SIZE);
   });
   return null;
}
