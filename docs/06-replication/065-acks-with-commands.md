# Challenge 065: Replica theo dõi chính xác số byte offset đã nhận và phản hồi trong ACK (ACKs with commands)

[⬅️ **Thử thách trước**: [064. Replica phản hồi REPLCONF ACK 0 khi Master gửi REPLCONF GETACK *](../06-replication/064-acks-with-no-commands.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [066. Cài đặt lệnh WAIT phản hồi ngay số replica khi không có replica nào kết nối](../06-replication/066-wait-with-no-replicas.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 065 / 124** |
| **Mã định danh (Slug)** | `yd3` |
| **Tên tiếng Anh (Official Name)** | `ACKs with commands` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `REPLCONF ACK <offset>` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Replica theo dõi chính xác số byte offset đã nhận và phản hồi trong ACK**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `ACKs with commands`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ mở rộng triển khai lệnh `REPLCONF GETACK` để phản hồi chính xác số byte của các câu lệnh mà replica đã xử lý.

### Cơ chế xác nhận ACK (Nhắc lại kiến thức)

Nhắc lại kiến thức, master sử dụng các gói tin ACK để xác minh rằng các replica của nó vẫn đang đồng bộ và không bị tụt lại phía sau. Mỗi phản hồi ACK chứa một giá trị offset — biểu thị tổng số byte của các lệnh mà replica đã xử lý.

### Theo dõi Offset (Offset tracking)

Replica duy trì và cập nhật giá trị offset bằng cách theo dõi tổng kích thước byte của mọi câu lệnh nhận được từ master. Kích thước này bao gồm cả các lệnh ghi (như `SET`, `DEL`) và các lệnh không ghi (như `PING`, `REPLCONF GETACK *`).

Sau khi xử lý câu lệnh nhận được (ví dụ: `["SET", "foo", "bar"]`), replica sẽ cộng độ dài byte của toàn bộ mảng RESP vào biến offset tích lũy của nó.

Một quy tắc quan trọng trong quá trình này là: offset chỉ được tính tổng các lệnh đã được xử lý **trước** khi nhận yêu cầu `REPLCONF GETACK *` hiện tại.

Ví dụ minh họa:

- Replica kết nối, hoàn tất quá trình bắt tay, và master gửi `REPLCONF GETACK *`.
  - Replica phản hồi `REPLCONF ACK 0` vì chưa có lệnh nào được xử lý trước yêu cầu này.
- Tiếp theo, master gửi một lệnh `REPLCONF GETACK *` khác.
  - Replica phản hồi `REPLCONF ACK 37`, vì câu lệnh `REPLCONF` trước đó tiêu tốn 37 byte.
- Sau đó master gửi một lệnh `PING`.
  - Replica âm thầm xử lý nó, tăng offset thêm 14 byte, và không gửi phản hồi nào.
- Lệnh `REPLCONF GETACK *` tiếp theo ập đến.
  - Replica phản hồi `REPLCONF ACK 88` — bao gồm 37 (của lệnh `REPLCONF` đầu tiên), + 37 (của lệnh `REPLCONF` thứ hai), + 14 (của lệnh `PING`).

Lưu ý rằng bản thân yêu cầu `GETACK` hiện tại không được tính vào giá trị offset trả về trong chính phản hồi đó.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh --port <PORT> --replicaof "<HOST> <PORT>"
```

Tương tự các giai đoạn trước, replica của bạn phải hoàn tất quy trình bắt tay với master và nhận file RDB rỗng.

Sau đó, master sẽ truyền bá một chuỗi các câu lệnh tới replica của bạn. Các câu lệnh này sẽ được gửi xen kẽ với các lệnh `REPLCONF GETACK *`.

```bash
REPLCONF GETACK *    # kỳ vọng: REPLCONF ACK 0

PING                 # replica xử lý ngầm
REPLCONF GETACK *    # kỳ vọng: REPLCONF ACK 51
# 51 = 37 (lệnh REPLCONF đầu tiên) + 14 (lệnh PING)

SET foo 1             # replica xử lý ngầm
SET bar 2             # replica xử lý ngầm
REPLCONF GETACK *    # kỳ vọng: REPLCONF ACK 146
# 146 = 51 + 37 (lệnh REPLCONF thứ hai) + 29 (SET foo) + 29 (SET bar)
```

Replica của bạn phải tính toán và trả về chính xác offset tại từng bước trong phản hồi `REPLCONF ACK <offset>`. Phản hồi của bạn cũng phải được mã hóa dưới dạng [mảng RESP Array](https://redis.io/docs/latest/develop/reference/protocol-spec/#arrays).

### 💡 Lưu ý Quan trọng

- Offset chỉ bao gồm số byte của các câu lệnh được xử lý **trước** khi nhận được lệnh `REPLCONF GETACK` hiện tại.
- Mặc dù master không truyền bá lệnh `PING` nhận được từ client (vì chúng không phải lệnh ghi), nhưng master có thể chủ động gửi lệnh `PING` tới replica để thông báo rằng master vẫn còn sống (heartbeat).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `REPLCONF ACK <offset>` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli REPLCONF ACK <offset>
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
