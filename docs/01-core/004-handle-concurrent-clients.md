# Challenge 004: Xử lý đồng thời nhiều client kết nối (Concurrency) (Handle concurrent clients)

[⬅️ **Thử thách trước**: [003. Phản hồi nhiều lệnh PING liên tiếp trên cùng một kết nối](../01-core/003-respond-to-multiple-pings.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [005. Cài đặt lệnh ECHO và giải mã Bulk String trong RESP](../01-core/005-implement-the-echo-command.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 004 / 124** |
| **Mã định danh (Slug)** | `zu2` |
| **Tên tiếng Anh (Official Name)** | `Handle concurrent clients` |
| **Phân loại Module** | ⚡ **Nền tảng & Lệnh cơ bản (Core)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `CONCURRENCY` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Xử lý đồng thời nhiều client kết nối (Concurrency)**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Handle concurrent clients`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho nhiều client kết nối đồng thời (concurrent clients).

### Xử lý nhiều Client đồng thời

Bên cạnh việc xử lý nhiều lệnh từ cùng một client, server Redis còn có khả năng xử lý đồng thời nhiều client cùng lúc.

Ở hầu hết các ngôn ngữ lập trình, bạn sẽ cần sử dụng đa luồng (threads) hoặc tự cài đặt một [Event Loop](https://en.wikipedia.org/wiki/Event_loop) để làm điều này. Tuy nhiên trong JavaScript/TypeScript, do [mô hình xử lý đồng thời vốn dĩ đã dựa trên Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop), hầu hết các hàm thư viện tiêu chuẩn đều được thiết kế để hỗ trợ tính năng đồng thời này một cách mặc định (out of the box). **Rất có thể mã nguồn bạn đã viết ở các giai đoạn trước sẽ vượt qua giai đoạn này mà không cần thay đổi gì!**

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi hai lệnh `PING` đồng thời thông qua hai kết nối TCP khác nhau:

```bash
# Hai lệnh này sẽ được gửi đồng thời để kiểm tra khả năng xử lý nhiều client của server.
$ redis-cli PING
$ redis-cli PING
```
Tester mong đợi nhận được phản hồi: hai phản hồi `+PONG\r\n` riêng biệt trên từng kết nối.

### 💡 Lưu ý Quan trọng

- Vì hiện tại client kiểm thử _chỉ_ gửi lệnh `PING`, bạn hoàn toàn có thể bỏ qua nội dung client gửi và phản hồi chuỗi cố định. Chúng ta sẽ phân tích cú pháp dữ liệu đầu vào của client ở các giai đoạn tiếp theo.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `CONCURRENCY` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli CONCURRENCY
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

// Trong Node.js / Bun, hàm net.createServer tự động tạo một instance net.Socket
// độc lập cho mỗi client kết nối tới và xử lý bất đồng bộ qua Event Loop.
const server = net.createServer((socket: net.Socket) => {
  console.log("Một client mới đã kết nối:", socket.remotePort);

  socket.on("data", (data: Buffer) => {
    // Phản hồi độc lập trên từng socket của từng client
    socket.write("+PONG\r\n");
  });

  socket.on("error", (err) => {
    console.error("Lỗi socket:", err.message);
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
- [Tài liệu chính thức về lệnh `CONCURRENCY` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
