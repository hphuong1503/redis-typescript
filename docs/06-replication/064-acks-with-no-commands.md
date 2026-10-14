# Challenge 064: Replica phản hồi REPLCONF ACK 0 khi Master gửi REPLCONF GETACK * (ACKs with no commands)

[⬅️ **Thử thách trước**: [063. Replica xử lý và thực thi các lệnh nhận được từ Master vào bộ nhớ](../06-replication/063-command-processing.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [065. Replica theo dõi chính xác số byte offset đã nhận và phản hồi trong ACK](../06-replication/065-acks-with-commands.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 064 / 124** |
| **Mã định danh (Slug)** | `xv6` |
| **Tên tiếng Anh (Official Name)** | `ACKs with no commands` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `REPLCONF ACK 0` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Replica phản hồi REPLCONF ACK 0 khi Master gửi REPLCONF GETACK ***: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `ACKs with no commands`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ cài đặt khả năng phản hồi lệnh `REPLCONF GETACK` với vai trò là replica.

### Cơ chế xác nhận ACK (ACKs)

Bình thường, replica sẽ âm thầm xử lý các lệnh được truyền bá. Tuy nhiên, master cần có cách để xác minh rằng replica vẫn đang "đồng bộ" và không bị tụt lại phía sau. Việc này được thực hiện thông qua cơ chế ACK (xác nhận - acknowledgement).

Master Redis định kỳ yêu cầu các replica gửi ACK để kiểm tra xem chúng đã xử lý được bao nhiêu phần dữ liệu trong luồng nhân bản (replication stream).

### 📖 Lệnh `REPLCONF GETACK`

Khi master muốn cập nhật tiến trình xử lý từ replica, nó gửi câu lệnh:

```bash
REPLCONF GETACK *
```

Cụ thể câu lệnh mà replica nhận được sẽ có dạng: `*3\r\n$8\r\nreplconf\r\n$6\r\ngetack\r\n$1\r\n*\r\n`. Đó là mảng `["replconf", "getack", "*"]` được mã hóa dưới dạng [mảng RESP Array](https://redis.io/docs/latest/develop/reference/protocol-spec/#arrays).

Replica nhận lệnh này qua kết nối nhân bản (chính là kết nối đã dùng cho quy trình bắt tay) và phản hồi lại bằng:

```bash
REPLCONF ACK <offset>
```

Ở đây `offset` là số byte của các lệnh mà replica đã xử lý. Đối với giai đoạn này, bạn có thể hardcode offset là `0`. Chúng ta sẽ tìm hiểu cách tính toán và cập nhật offset ở các giai đoạn sau.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh --port <PORT> --replicaof "<HOST> <PORT>"
```

Tương tự các giai đoạn trước, replica của bạn phải hoàn tất quy trình bắt tay với master và nhận file RDB rỗng.

Sau đó tester sẽ gửi lệnh `REPLCONF GETACK *` tới replica của bạn.

Tester kỳ vọng nhận được phản hồi `REPLCONF ACK 0` được mã hóa dưới dạng mảng RESP Array (`*3\r\n$8\r\nREPLCONF\r\n$3\r\nACK\r\n$1\r\n0\r\n`).

### 💡 Lưu ý Quan trọng

- Sau khi quy trình bắt tay hoàn tất, replica **chỉ** gửi phản hồi cho các câu lệnh `REPLCONF GETACK`. Mọi lệnh truyền bá khác (như `PING`, `SET`, v.v.) chỉ được đọc và xử lý ngầm, tuyệt đối không được gửi phản hồi ngược lại cho master.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `REPLCONF ACK 0` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli REPLCONF ACK 0
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
