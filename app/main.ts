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

  connection.on("error", () => {
    // Ignore client socket reset errors
  });
});

server.listen(6379, "127.0.0.1", () => {
  console.log("Redis server listening on 127.0.0.1:6379");
});
