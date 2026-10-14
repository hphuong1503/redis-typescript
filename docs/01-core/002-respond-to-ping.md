# Challenge 002: Phản hồi lệnh PING đơn lẻ với +PONG\r\n (Respond to PING)

[⬅️ **Thử thách trước**: [001. Khởi tạo Server TCP và Lắng nghe trên Port 6379](../01-core/001-bind-to-a-port.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [003. Phản hồi nhiều lệnh PING liên tiếp trên cùng một kết nối](../01-core/003-respond-to-multiple-pings.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 002 / 124** |
| **Mã định danh (Slug)** | `rg2` |
| **Tên tiếng Anh (Official Name)** | `Respond to PING` |
| **Phân loại Module** | ⚡ **Nền tảng & Lệnh cơ bản (Core)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `PING` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Phản hồi lệnh PING đơn lẻ với +PONG\r\n**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Respond to PING`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ cài đặt lệnh Redis `PING`.

### Lệnh `PING` là gì?

Client của Redis giao tiếp với server Redis bằng cách gửi các **lệnh (commands)** và nhận về các **phản hồi (responses)**.

Ví dụ:

```bash
redis> PING                  # client gửi lệnh PING
"PONG"                       # server phản hồi PONG

redis> SET name Alice        # lưu giá trị "Alice" vào khóa "name"
OK                           # server xác nhận thành công
```

`PING` là lệnh đơn giản nhất của Redis. Lệnh này được dùng để kiểm tra xem server Redis còn hoạt động và phản hồi hay không (health check / liveness check).

Khi một server Redis phản hồi lệnh `PING`, dữ liệu thô (raw response) gửi qua mạng thực chất là `+PONG\r\n` — tức là chuỗi `PONG` được mã hóa theo chuẩn RESP (giao thức mà Redis dùng để trao đổi thông điệp giữa client và server).

Trong giai đoạn này, nhiệm vụ của bạn chỉ đơn giản là phản hồi chuỗi cố định `+PONG\r\n`, bất kể lệnh nhận được từ client là gì.

Bạn sẽ tìm hiểu sâu hơn về giao thức RESP cũng như cách phân tích cú pháp (parse) lệnh đầu vào ở các giai đoạn tiếp theo.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `PING` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli PING
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
import * as net from "net";

const server = net.createServer((socket: net.Socket) => {
  // Lắng nghe sự kiện nhận dữ liệu từ client
  socket.on("data", (data: Buffer) => {
    // Phản hồi chuỗi RESP Simple String "+PONG\r\n"
    socket.write("+PONG\r\n");
  });
});

server.listen(6379, "127.0.0.1");
```

---

## ⚠️ 5. Lưu ý & Bẫy thường gặp (Common Pitfalls & Tips)

1. **Ký tự ngắt dòng CRLF**: Mọi phản hồi trong RESP bắt buộc phải kết thúc bằng đúng 2 byte `\r\n` (`\x0D\x0A`). Thiếu `\r` hoặc chỉ gửi `\n` sẽ khiến tester bị treo timeout vì chờ đủ dữ liệu.
2. **Không phân biệt chữ hoa/thường**: Tên lệnh Redis hoàn toàn không phân biệt hoa thường (`ping`, `PING`, `PiNg` đều hợp lệ). Luôn chuẩn hóa bằng `.toUpperCase()` trước khi so sánh.
3. **Độ dài chuỗi tính bằng Byte, không phải Ký tự**: Khi định dạng Bulk String `$len\r\n...`, `len` là số byte nhị phân (`Buffer.byteLength(str)`), không phải `str.length` (đặc biệt quan trọng với chuỗi UTF-8 hoặc dữ liệu nhị phân).
4. **Quản lý đa kết nối đồng thời**: Tránh lưu trữ trạng thái riêng của client (như cờ transaction, subscription, authenticated) vào biến toàn cục. Hãy gán vào đối tượng socket hoặc sử dụng `WeakMap<net.Socket, State>`.

---

## 📚 6. Tài liệu tham khảo chính thức

- [Redis Protocol Specification (RESP2/RESP3)](https://redis.io/docs/latest/develop/reference/protocol-spec/)
- [Tài liệu chính thức về lệnh `PING` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
