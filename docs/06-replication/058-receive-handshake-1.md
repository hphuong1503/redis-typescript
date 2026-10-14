# Challenge 058: Master tiếp nhận các lệnh REPLCONF từ Replica và phản hồi +OK\r\n (Receive handshake (1/2))

[⬅️ **Thử thách trước**: [057. Replica gửi lệnh PSYNC ? -1 yêu cầu Full Resynchronization](../06-replication/057-send-handshake-3.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [059. Master phản hồi PSYNC bằng +FULLRESYNC <replid> 0](../06-replication/059-receive-handshake-2.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 058 / 124** |
| **Mã định danh (Slug)** | `fj0` |
| **Tên tiếng Anh (Official Name)** | `Receive handshake (1/2)` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `Master handles REPLCONF` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Master tiếp nhận các lệnh REPLCONF từ Replica và phản hồi +OK\r\n**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Receive handshake (1/2)`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong giai đoạn này, chúng ta sẽ bắt đầu triển khai hỗ trợ tiếp nhận quy trình bắt tay nhân bản với tư cách là master server.

### Bắt tay nhân bản (Nhắc lại kiến thức)

Cho đến thời điểm hiện tại, chúng ta đã cài đặt quá trình bắt tay từ góc nhìn của replica. Giờ đây chúng ta sẽ cài đặt cùng quy trình bắt tay đó ở phía master.

Nhắc lại kiến thức, master sẽ nhận được các thông điệp sau từ replica trong suốt quá trình bắt tay:

1. Một lệnh `PING`
2. Hai lệnh `REPLCONF`
3. Một lệnh `PSYNC`

Redis server của bạn vốn đã hỗ trợ lệnh `PING`, vì vậy không cần làm thêm gì cho bước đầu tiên.

Trong thử thách này, bạn sẽ bổ sung hỗ trợ tiếp nhận hai lệnh `REPLCONF` với vai trò master.

Đối với mục tiêu của thử thách này, bạn có thể an toàn bỏ qua các đối số của cả hai lệnh và chỉ cần đơn giản phản hồi lại `+OK\r\n`. Đó là chuỗi `OK` được mã hóa dưới dạng [Simple String](https://redis.io/docs/latest/develop/reference/protocol-spec/#simple-strings).

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh --port <PORT>
```

Sau đó tester sẽ gửi các câu lệnh sau theo thứ tự:

1. `PING` — kỳ vọng phản hồi `+PONG\r\n`
2. `REPLCONF listening-port <PORT>` — kỳ vọng phản hồi `+OK\r\n`
3. `REPLCONF capa psync2` — kỳ vọng phản hồi `+OK\r\n`

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Master handles REPLCONF` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Master handles REPLCONF
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
