# Challenge 003: Phản hồi nhiều lệnh PING liên tiếp trên cùng một kết nối (Respond to multiple PINGs)

[⬅️ **Thử thách trước**: [002. Phản hồi lệnh PING đơn lẻ với +PONG\r\n](../01-core/002-respond-to-ping.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [004. Xử lý đồng thời nhiều client kết nối (Concurrency)](../01-core/004-handle-concurrent-clients.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 003 / 124** |
| **Mã định danh (Slug)** | `wy1` |
| **Tên tiếng Anh (Official Name)** | `Respond to multiple PINGs` |
| **Phân loại Module** | ⚡ **Nền tảng & Lệnh cơ bản (Core)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `PING (multiple)` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Phản hồi nhiều lệnh PING liên tiếp trên cùng một kết nối**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Respond to multiple PINGs`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ phản hồi nhiều lệnh [PING](https://redis.io/commands/ping) gửi từ cùng một kết nối.

### Xử lý nhiều lệnh liên tiếp

Server Redis bắt đầu lắng nghe lệnh tiếp theo ngay sau khi hoàn tất phản hồi cho lệnh trước đó. Cơ chế này cho phép các Redis client gửi nhiều lệnh liên tiếp trên cùng một kết nối mạng.

Trong giai đoạn này, server của bạn cần chạy một vòng lặp liên tục đọc các lệnh và gửi phản hồi trở lại qua cùng kết nối đó. Vì hiện tại chúng ta chỉ làm việc với lệnh `PING`, chương trình của bạn có thể lặp qua việc đọc dữ liệu đầu vào và phản hồi `+PONG\r\n`.

Ở hầu hết các ngôn ngữ lập trình khác, bạn sẽ cần viết mã tường minh để duy trì vòng lặp này trên server. Tuy nhiên trong JavaScript/TypeScript, nếu bạn đang lắng nghe sự kiện [`data`](https://nodejs.org/api/net.html#net_event_data), cơ chế này đã được tự động xử lý. **Rất có thể mã nguồn bạn đã viết ở các giai đoạn trước sẽ vượt qua giai đoạn này mà không cần sửa đổi gì!**

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi nhiều lệnh `PING` liên tiếp trên cùng một kết nối. 

Ví dụ, tester có thể gửi:

```bash
$ echo -e "PING\nPING" | redis-cli
```

Tester mong đợi nhận được phản hồi: một chuỗi `+PONG\r\n` cho mỗi lệnh được gửi đến.

### 💡 Lưu ý Quan trọng

- Các byte chính xác mà chương trình của bạn nhận được sẽ không chỉ đơn thuần là `PING`. Bạn sẽ nhận được chuỗi dạng: `*1\r\n$4\r\nPING\r\n`, đây là biểu diễn mã hóa theo chuẩn giao thức Redis của lệnh `PING`.
- Tương tự như giai đoạn trước, bạn có thể tạm thời trả về chuỗi cố định `+PONG\r\n` làm phản hồi cho giai đoạn này. Chúng ta sẽ tiến hành phân tích cú pháp (parse) dữ liệu đầu vào của client ở các giai đoạn tiếp theo.
- Tester sẽ gửi các lệnh `PING` qua cùng một kết nối. Chúng ta sẽ xử lý đa kết nối đồng thời ở giai đoạn tiếp theo.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `PING (multiple)` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli PING (multiple)
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
  socket.on("data", (data: Buffer) => {
    // Với mỗi gói dữ liệu PING nhận được, tiếp tục ghi lại "+PONG\r\n"
    // Socket vẫn giữ mở để phục vụ các lệnh PING tiếp theo
    socket.write("+PONG\r\n");
  });

  socket.on("close", () => {
    // Xử lý khi kết nối đóng
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
- [Tài liệu chính thức về lệnh `PING (multiple)` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
