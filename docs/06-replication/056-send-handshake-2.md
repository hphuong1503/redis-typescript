# Challenge 056: Replica gửi 2 lệnh REPLCONF listening-port và capa psync2 (Send handshake (2/3))

[⬅️ **Thử thách trước**: [055. Replica khởi tạo kết nối và gửi PING tới Master](../06-replication/055-send-handshake-1.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [057. Replica gửi lệnh PSYNC ? -1 yêu cầu Full Resynchronization](../06-replication/057-send-handshake-3.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 056 / 124** |
| **Mã định danh (Slug)** | `eh4` |
| **Tên tiếng Anh (Official Name)** | `Send handshake (2/3)` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `Handshake step 2: REPLCONF` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Replica gửi 2 lệnh REPLCONF listening-port và capa psync2**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Send handshake (2/3)`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ cài đặt bước thứ hai của quy trình bắt tay nhân bản (replication handshake).

### Bắt tay nhân bản (Nhắc lại kiến thức)

Nhắc lại kiến thức, quy trình bắt tay gồm có 3 bước:

1. Replica gửi lệnh `PING` tới master (Đã xử lý ở giai đoạn trước)
2. Replica gửi lệnh `REPLCONF` hai lần tới master
3. Replica gửi lệnh `PSYNC` tới master

Đối với giai đoạn này, bạn sẽ xử lý bước thứ hai của quy trình này.

### 📖 Lệnh `REPLCONF`

Lệnh `REPLCONF` được sử dụng để cấu hình replica đang kết nối. Sau khi nhận được phản hồi cho lệnh `PING`, replica sẽ lần lượt gửi hai lệnh `REPLCONF`, chờ nhận phản hồi sau mỗi lệnh trước khi gửi lệnh tiếp theo.

1. `REPLCONF listening-port <PORT>`: Báo cho master biết số hiệu cổng mà replica đang lắng nghe. Giá trị này được sử dụng cho mục đích [giám sát và ghi log](https://github.com/redis/redis/blob/90178712f6eccf1e5b61daa677c5c103114bda3a/src/replication.c#L107-L130), không ảnh hưởng trực tiếp đến dữ liệu nhân bản.
2. `REPLCONF capa psync2`: Thông báo cho master về các năng lực hỗ trợ của replica.
   - `capa` là viết tắt của "capabilities" (năng lực). Nó biểu thị rằng đối số tiếp theo là một tính năng mà replica hỗ trợ.
   - `psync2` báo hiệu rằng replica hỗ trợ giao thức PSYNC2. PSYNC2 là phiên bản nâng tiến của tính năng [đồng bộ hóa một phần (partial synchronization)](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/) dùng để tái đồng bộ một replica với master của nó.
   - Hiện tại bạn có thể hardcode an toàn giá trị `capa psync2`.

Cả hai lệnh phải được gửi dưới dạng các mảng RESP (Array), do đó các byte cụ thể sẽ có dạng như sau:

```
# REPLCONF listening-port <PORT>
*3\r\n$8\r\nREPLCONF\r\n$14\r\nlistening-port\r\n$4\r\n6380\r\n

# REPLCONF capa psync2
*3\r\n$8\r\nREPLCONF\r\n$4\r\ncapa\r\n$6\r\npsync2\r\n
```

Đối với cả hai lệnh, master sẽ phản hồi lại `+OK\r\n`. Đó là chuỗi `OK` được mã hóa dưới dạng [Simple String](https://redis.io/docs/latest/develop/reference/protocol-spec/#simple-strings). Replica cần chờ nhận phản hồi này trước khi gửi lệnh kế tiếp.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh --port <PORT> --replicaof "<MASTER_HOST> <MASTER_PORT>"
```

Sau đó tester sẽ xác minh rằng replica đã kết nối tới master và gửi các nội dung sau theo thứ tự:

1. Lệnh `PING`
2. Lệnh `REPLCONF` với các đối số `listening-port` và `<PORT>`
3. Lệnh `REPLCONF` với đối số `capa psync2`

**Ghi chú**

- Phản hồi cho lệnh `REPLCONF` luôn luôn là `+OK\r\n`.

### 2.2. Đặc tả giao thức RESP tương ứng
Giao thức RESP (Redis Serialization Protocol) trao đổi dữ liệu qua kết nối TCP dạng nhị phân với các dòng phân cách bởi ký tự `\r\n` (CRLF):
- **Simple Strings** (`+`): Dùng cho phản hồi trạng thái ngắn (ví dụ `+OK\r\n`, `+PONG\r\n`).
- **Simple Errors** (`-`): Thông báo lỗi (ví dụ `-ERR unknown command\r\n`, `-NOAUTH Authentication required.\r\n`).
- **Integers** (`:`): Số nguyên có dấu (ví dụ `:1\r\n`, `:0\r\n`, `:1024\r\n`).
- **Bulk Strings** (`$`): Chuỗi nhị phân an toàn với độ dài xác định (ví dụ `$4\r\necho\r\n`, hoặc giá trị null `$-1\r\n`).
- **Arrays** (`*`): Mảng nhiều phần tử phân cấp (ví dụ `*2\r\n$4\r\nECHO\r\n$3\r\nhey\r\n`).

---

## 🧪 3. Kịch bản kiểm thử CodeCrafters (Tester Scenario)

Bộ kiểm thử tự động của CodeCrafters sẽ thực thi server của bạn thông qua script:
```bash
$ ./your_program.sh
```

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Handshake step 2: REPLCONF` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Handshake step 2: REPLCONF
```

---

## 💻 4. Hướng dẫn triển khai với TypeScript / Bun (Implementation Guide)

### 4.1. Luồng xử lý đề xuất (Workflow)
1. **Lắng nghe sự kiện socket**: Bắt sự kiện `socket.on('data', (data: Buffer) => ...)` trong `app/main.ts`.
2. **Giải mã gói tin RESP**: Tách mảng tham số câu lệnh từ `Buffer` nhận được.
3. **Phân nhánh xử lý lệnh**: Kiểm tra tên lệnh (`command.toUpperCase() === ...`) và kiểm tra đủ số lượng tham số.
4. **Cập nhật trạng thái bộ nhớ**: Truy xuất hoặc cập nhật vào cấu trúc dữ liệu (`Map`, `Array`, `Set`, `Buffer`, ...).
5. **Đóng gói và gửi phản hồi**: Sử dụng `socket.write(...)` để gửi chuỗi byte chuẩn RESP kèm kết thúc `\r\n`.

### 4.2. Mã nguồn TypeScript tham khảo
```typescript
// Tham số dòng lệnh cấu hình Master / Replica
let role: "master" | "slave" = "master";
let masterHost: string | null = null;
let masterPort: number | null = null;
let port = 6379;

// Phân tích tham số process.argv:
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--port") {
    port = parseInt(process.argv[i + 1], 10);
  } else if (process.argv[i] === "--replicaof") {
    role = "slave";
    const parts = process.argv[i + 1].split(" ");
    masterHost = parts[0];
    masterPort = parseInt(parts[1], 10);
  }
}

// Phản hồi lệnh INFO replication:
// role:master
// master_replid:8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb
// master_repl_offset:0
```

---

## ⚠️ 5. Lưu ý & Bẫy thường gặp (Common Pitfalls & Tips)

1. **Ký tự ngắt dòng CRLF**: Mọi phản hồi trong RESP bắt buộc phải kết thúc bằng đúng 2 byte `\r\n` (`\x0D\x0A`). Thiếu `\r` hoặc chỉ gửi `\n` sẽ khiến tester bị treo timeout vì chờ đủ dữ liệu.
2. **Không phân biệt chữ hoa/thường**: Tên lệnh Redis hoàn toàn không phân biệt hoa thường (`ping`, `PING`, `PiNg` đều hợp lệ). Luôn chuẩn hóa bằng `.toUpperCase()` trước khi so sánh.
3. **Độ dài chuỗi tính bằng Byte, không phải Ký tự**: Khi định dạng Bulk String `$len\r\n...`, `len` là số byte nhị phân (`Buffer.byteLength(str)`), không phải `str.length` (đặc biệt quan trọng với chuỗi UTF-8 hoặc dữ liệu nhị phân).
4. **Quản lý đa kết nối đồng thời**: Tránh lưu trữ trạng thái riêng của client (như cờ transaction, subscription, authenticated) vào biến toàn cục. Hãy gán vào đối tượng socket hoặc sử dụng `WeakMap<net.Socket, State>`.

---

## 📚 6. Tài liệu tham khảo chính thức

- [Đặc tả giao thức Redis (RESP2/RESP3)](https://redis.io/docs/latest/develop/reference/protocol-spec/)
- [Tài liệu chính thức về lệnh `REPLCONF` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách Redis trên CodeCrafters](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
