import * as net from "node:net";

// --- RESP Serializer Helpers ---

function encodeSimpleString(str: string): string {
  return `+${str}\r\n`;
}

function encodeSimpleError(err: string): string {
  return `-${err}\r\n`;
}

function encodeInteger(n: number): string {
  return `:${n}\r\n`;
}

function encodeBulkString(str: string | null): string {
  if (str === null) return "$-1\r\n";
  const buf = Buffer.from(str, "utf-8");
  return `$${buf.length}\r\n${str}\r\n`;
}

function encodeArray(elements: (string | null)[]): string {
  let res = `*${elements.length}\r\n`;
  for (const el of elements) {
    res += encodeBulkString(el);
  }
  return res;
}

function encodeNullArray(): string {
  return "*-1\r\n";
}

// --- RESP Parser (Streaming & Pipeline Support) ---

class RespParser {
  private buffer: Buffer = Buffer.alloc(0);

  append(data: Buffer) {
    this.buffer = Buffer.concat([this.buffer, data]);
  }

  parseCommands(): string[][] {
    const commands: string[][] = [];
    while (this.buffer.length > 0) {
      const parsed = this.parseOne();
      if (parsed === null) {
        break; // Incomplete command in buffer
      }
      if (parsed.length > 0) {
        commands.push(parsed);
      }
    }
    return commands;
  }

  private parseOne(): string[] | null {
    if (this.buffer.length === 0) return null;

    const firstByte = this.buffer[0];

    // Standard RESP Array: *<count>\r\n...
    if (firstByte === 42) { // '*'
      const crlfIdx = this.buffer.indexOf("\r\n");
      if (crlfIdx === -1) return null;

      const countStr = this.buffer.subarray(1, crlfIdx).toString("utf-8");
      const count = parseInt(countStr, 10);
      if (isNaN(count) || count <= 0) {
        this.buffer = this.buffer.subarray(crlfIdx + 2);
        return [];
      }

      let offset = crlfIdx + 2;
      const elements: string[] = [];

      for (let i = 0; i < count; i++) {
        if (offset >= this.buffer.length) return null;

        if (this.buffer[offset] === 36) { // '$' Bulk string
          const lenCrlf = this.buffer.indexOf("\r\n", offset);
          if (lenCrlf === -1) return null;

          const lenStr = this.buffer.subarray(offset + 1, lenCrlf).toString("utf-8");
          const len = parseInt(lenStr, 10);
          if (isNaN(len)) return null;

          if (len === -1) {
            elements.push("");
            offset = lenCrlf + 2;
            continue;
          }

          const dataStart = lenCrlf + 2;
          const dataEnd = dataStart + len;
          const nextCrlf = dataEnd + 2;

          if (this.buffer.length < nextCrlf) {
            return null; // Incomplete bulk string
          }

          elements.push(this.buffer.subarray(dataStart, dataEnd).toString("utf-8"));
          offset = nextCrlf;
        } else {
          // Inline or simple string token
          const nextCrlf = this.buffer.indexOf("\r\n", offset);
          if (nextCrlf === -1) return null;
          elements.push(this.buffer.subarray(offset, nextCrlf).toString("utf-8"));
          offset = nextCrlf + 2;
        }
      }

      this.buffer = this.buffer.subarray(offset);
      return elements;
    } else {
      // Inline command (e.g. "PING\r\n")
      const crlfIdx = this.buffer.indexOf("\r\n");
      if (crlfIdx === -1) return null;

      const line = this.buffer.subarray(0, crlfIdx).toString("utf-8").trim();
      this.buffer = this.buffer.subarray(crlfIdx + 2);
      if (line.length === 0) return [];
      return line.split(/\s+/);
    }
  }
}

// --- Data Stores (Core & Lists up to Stage 013) ---

interface ValueEntry {
  value: string;
  expiresAt: number | null;
}

const kvStore = new Map<string, ValueEntry>();
const listStore = new Map<string, string[]>();

// --- Stream Store ---

interface StreamEntry {
  id: string;
  fields: [string, string][];
}

const streamStore = new Map<string, StreamEntry[]>();

function parseStreamId(idStr: string): [bigint, bigint] | null {
  const parts = idStr.split("-");
  if (parts.length !== 2) return null;
  try {
    const ms = BigInt(parts[0]);
    const seq = BigInt(parts[1]);
    return [ms, seq];
  } catch {
    return null;
  }
}

// --- BLPOP Waiters ---

interface BLPopWaiter {
  socket: net.Socket;
  keys: string[];
  timer: NodeJS.Timeout | null;
  resolved: boolean;
}

const waitersByKey = new Map<string, BLPopWaiter[]>();

function removeWaiter(waiter: BLPopWaiter) {
  if (waiter.timer) {
    clearTimeout(waiter.timer);
    waiter.timer = null;
  }
  waiter.resolved = true;
  for (const k of waiter.keys) {
    const list = waitersByKey.get(k);
    if (list) {
      const idx = list.indexOf(waiter);
      if (idx !== -1) list.splice(idx, 1);
      if (list.length === 0) waitersByKey.delete(k);
    }
  }
}

function notifyWaiters(key: string) {
  const list = listStore.get(key);
  if (!list || list.length === 0) return;

  const waiters = waitersByKey.get(key);
  if (!waiters || waiters.length === 0) return;

  while (list.length > 0 && waiters.length > 0) {
    const waiter = waiters[0];
    if (waiter.resolved) {
      waiters.shift();
      continue;
    }

    const val = list.shift()!;
    removeWaiter(waiter);

    try {
      waiter.socket.write(encodeArray([key, val]));
    } catch {
      // socket might be closed
    }
  }

  if (list.length === 0) {
    listStore.delete(key);
  }
}

// --- Command Dispatcher ---

function handleCommand(socket: net.Socket, args: string[]) {
  if (args.length === 0) return;
  const command = args[0].toUpperCase();

  switch (command) {
    case "PING": {
      if (args.length > 1) {
        socket.write(encodeBulkString(args[1]));
      } else {
        socket.write(encodeSimpleString("PONG"));
      }
      break;
    }

    case "ECHO": {
      socket.write(encodeBulkString(args[1] ?? ""));
      break;
    }

    case "SET": {
      const key = args[1];
      const val = args[2];
      let px: number | null = null;
      for (let i = 3; i < args.length; i++) {
        if (args[i].toUpperCase() === "PX" && i + 1 < args.length) {
          px = parseInt(args[i + 1], 10);
          i++;
        }
      }
      kvStore.set(key, {
        value: val,
        expiresAt: px !== null ? Date.now() + px : null,
      });
      socket.write(encodeSimpleString("OK"));
      break;
    }

    case "GET": {
      const key = args[1];
      const entry = kvStore.get(key);
      if (!entry) {
        socket.write(encodeBulkString(null));
      } else if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
        kvStore.delete(key);
        socket.write(encodeBulkString(null));
      } else {
        socket.write(encodeBulkString(entry.value));
      }
      break;
    }

    case "RPUSH": {
      const key = args[1];
      const elements = args.slice(2);
      if (!listStore.has(key)) listStore.set(key, []);
      const list = listStore.get(key)!;
      list.push(...elements);
      socket.write(encodeInteger(list.length));
      notifyWaiters(key);
      break;
    }

    case "LPUSH": {
      const key = args[1];
      const elements = args.slice(2);
      if (!listStore.has(key)) listStore.set(key, []);
      const list = listStore.get(key)!;
      for (const el of elements) {
        list.unshift(el);
      }
      socket.write(encodeInteger(list.length));
      notifyWaiters(key);
      break;
    }

    case "LLEN": {
      const key = args[1];
      const list = listStore.get(key);
      socket.write(encodeInteger(list ? list.length : 0));
      break;
    }

    case "LPOP": {
      const key = args[1];
      const list = listStore.get(key);

      if (args.length > 2) {
        const count = parseInt(args[2], 10);
        if (!list || list.length === 0) {
          socket.write(encodeNullArray());
        } else {
          const numToPop = Math.min(count, list.length);
          const popped = list.splice(0, numToPop);
          if (list.length === 0) listStore.delete(key);
          socket.write(encodeArray(popped));
        }
      } else {
        if (!list || list.length === 0) {
          socket.write(encodeBulkString(null));
        } else {
          const item = list.shift()!;
          if (list.length === 0) listStore.delete(key);
          socket.write(encodeBulkString(item));
        }
      }
      break;
    }

    case "LRANGE": {
      const key = args[1];
      const start = parseInt(args[2], 10);
      const stop = parseInt(args[3], 10);
      const list = listStore.get(key);

      if (!list || list.length === 0) {
        socket.write("*0\r\n");
        break;
      }

      const len = list.length;
      let s = start < 0 ? len + start : start;
      let e = stop < 0 ? len + stop : stop;

      if (s < 0) s = 0;
      if (s >= len || s > e || e < 0) {
        socket.write("*0\r\n");
        break;
      }

      if (e >= len) e = len - 1;
      const slice = list.slice(s, e + 1);
      socket.write(encodeArray(slice));
      break;
    }

    case "BLPOP": {
      const timeoutSec = parseFloat(args[args.length - 1]);
      const keys = args.slice(1, args.length - 1);

      // Check if any key already has elements
      let foundKey: string | null = null;
      let foundVal: string | null = null;

      for (const k of keys) {
        const list = listStore.get(k);
        if (list && list.length > 0) {
          foundKey = k;
          foundVal = list.shift()!;
          if (list.length === 0) listStore.delete(k);
          break;
        }
      }

      if (foundKey !== null && foundVal !== null) {
        socket.write(encodeArray([foundKey, foundVal]));
        break;
      }

      // Block client
      const waiter: BLPopWaiter = {
        socket,
        keys,
        timer: null,
        resolved: false,
      };

      if (timeoutSec > 0) {
        waiter.timer = setTimeout(() => {
          if (waiter.resolved) return;
          removeWaiter(waiter);
          try {
            socket.write(encodeNullArray());
          } catch {}
        }, timeoutSec * 1000);
      }

      for (const k of keys) {
        if (!waitersByKey.has(k)) waitersByKey.set(k, []);
        waitersByKey.get(k)!.push(waiter);
      }
      break;
    }

    case "TYPE": {
      const key = args[1];
      if (streamStore.has(key)) {
        socket.write(encodeSimpleString("stream"));
      } else if (listStore.has(key) && listStore.get(key)!.length > 0) {
        socket.write(encodeSimpleString("list"));
      } else if (kvStore.has(key)) {
        const entry = kvStore.get(key)!;
        if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
          kvStore.delete(key);
          socket.write(encodeSimpleString("none"));
        } else {
          socket.write(encodeSimpleString("string"));
        }
      } else {
        socket.write(encodeSimpleString("none"));
      }
      break;
    }

    case "XADD": {
      const key = args[1];
      const id = args[2];
      const fields: [string, string][] = [];
      for (let i = 3; i < args.length; i += 2) {
        if (i + 1 < args.length) {
          fields.push([args[i], args[i + 1]]);
        }
      }

      if (!streamStore.has(key)) {
        streamStore.set(key, []);
      }
      const stream = streamStore.get(key)!;
      let finalId = id;

      if (id === "*") {
        // Fully auto-generated ID: *
        let ms = BigInt(Date.now());
        let seq = 0n;

        if (stream.length > 0) {
          const lastEntry = stream[stream.length - 1];
          const lastParsed = parseStreamId(lastEntry.id);
          if (lastParsed) {
            const [lastMs, lastSeq] = lastParsed;
            if (ms < lastMs) {
              ms = lastMs;
              seq = lastSeq + 1n;
            } else if (ms === lastMs) {
              seq = lastSeq + 1n;
            } else {
              seq = 0n;
            }
          }
        } else {
          seq = 0n;
        }

        finalId = `${ms}-${seq}`;
      } else {
        const parts = id.split("-");
        if (parts.length === 2 && parts[1] === "*") {
          // Partially auto-generated ID: <ms>-*
          let ms: bigint;
          try {
            ms = BigInt(parts[0]);
          } catch {
            socket.write(encodeSimpleError("ERR Invalid stream ID"));
            break;
          }

          let seq = 0n;
          if (stream.length > 0) {
            const lastEntry = stream[stream.length - 1];
            const lastParsed = parseStreamId(lastEntry.id);
            if (lastParsed) {
              const [lastMs, lastSeq] = lastParsed;
              if (ms < lastMs) {
                socket.write(
                  encodeSimpleError(
                    "ERR The ID specified in XADD is equal or smaller than the target stream top item"
                  )
                );
                break;
              } else if (ms === lastMs) {
                seq = lastSeq + 1n;
              } else {
                seq = ms === 0n ? 1n : 0n;
              }
            }
          } else {
            seq = ms === 0n ? 1n : 0n;
          }

          finalId = `${ms}-${seq}`;
        } else {
          // Explicit ID
          const parsed = parseStreamId(id);
          if (!parsed) {
            socket.write(encodeSimpleError("ERR Invalid stream ID"));
            break;
          }
          const [currMs, currSeq] = parsed;

          // 1. Must be greater than 0-0
          if (currMs === 0n && currSeq === 0n) {
            socket.write(
              encodeSimpleError(
                "ERR The ID specified in XADD must be greater than 0-0"
              )
            );
            break;
          }

          // 2. Must be strictly greater than last entry in stream
          if (stream.length > 0) {
            const lastEntry = stream[stream.length - 1];
            const lastParsed = parseStreamId(lastEntry.id);
            if (lastParsed) {
              const [lastMs, lastSeq] = lastParsed;
              if (currMs < lastMs || (currMs === lastMs && currSeq <= lastSeq)) {
                socket.write(
                  encodeSimpleError(
                    "ERR The ID specified in XADD is equal or smaller than the target stream top item"
                  )
                );
                break;
              }
            }
          }
        }
      }

      stream.push({ id: finalId, fields });
      socket.write(encodeBulkString(finalId));
      break;
    }

    case "COMMAND": {
      socket.write("*0\r\n");
      break;
    }

    default: {
      socket.write(encodeSimpleError(`unknown command '${command}'`));
      break;
    }
  }
}

// --- Server Bootstrap ---

const server: net.Server = net.createServer((connection: net.Socket) => {
  const parser = new RespParser();

  connection.on("data", (data: Buffer) => {
    parser.append(data);
    const commands = parser.parseCommands();
    for (const cmd of commands) {
      handleCommand(connection, cmd);
    }
  });

  connection.on("close", () => {
    for (const [key, waiters] of waitersByKey.entries()) {
      const remaining = waiters.filter((w) => w.socket !== connection);
      if (remaining.length === 0) {
        waitersByKey.delete(key);
      } else {
        waitersByKey.set(key, remaining);
      }
    }
  });

  connection.on("error", () => {
    // Ignore client socket reset errors
  });
});

server.listen(6379, "127.0.0.1", () => {
  console.log("Redis server listening on 127.0.0.1:6379");
});
