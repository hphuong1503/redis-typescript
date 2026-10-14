# Challenge 006: Cài đặt lệnh SET và GET lưu trữ Key-Value trong bộ nhớ RAM (Implement the SET & GET commands)

[⬅️ **Thử thách trước**: [005. Cài đặt lệnh ECHO và giải mã Bulk String trong RESP](../01-core/005-implement-the-echo-command.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [007. Hỗ trợ thời gian sống TTL cho Key với tùy chọn PX (Milliseconds)](../01-core/007-expiry.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 006 / 124** |
| **Mã định danh (Slug)** | `la7` |
| **Tên tiếng Anh (Official Name)** | `Implement the SET & GET commands` |
| **Phân loại Module** | ⚡ **Nền tảng & Lệnh cơ bản (Core)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `SET / GET` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Cài đặt lệnh SET và GET lưu trữ Key-Value trong bộ nhớ RAM**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Implement the SET & GET commands`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho các lệnh [SET](https://redis.io/commands/set) và [GET](https://redis.io/commands/get).

### 📖 Lệnh `SET`

Lệnh `SET` được dùng để gán một giá trị cho một khóa (key). Ví dụ: client có thể gán khóa `foo` mang giá trị `bar` như sau:
```bash
$ redis-cli SET foo bar
OK
```
Sau đó server sẽ phản hồi `OK` (dưới dạng một [Simple String RESP](https://redis.io/docs/latest/develop/reference/protocol-spec/#simple-strings)) để xác nhận thao tác đã thành công.

Lệnh `SET` hỗ trợ nhiều tùy chọn bổ sung như `EX` (thời gian hết hạn tính bằng giây), `PX` (thời gian hết hạn tính bằng mili-giây), và nhiều tùy chọn khác. Chúng ta chưa xử lý các tùy chọn bổ sung này trong giai đoạn này, mà sẽ hoàn thiện chúng ở các giai đoạn tiếp theo.

### 📖 Lệnh `GET`

Lệnh `GET` được dùng để lấy giá trị của một khóa. Ví dụ: để lấy giá trị của khóa `foo`:
```bash
$ redis-cli GET foo
bar
```
Server phản hồi giá trị `bar` được mã hóa dưới dạng [chuỗi Bulk String RESP](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings). Nếu khóa không tồn tại, server sẽ phản hồi chuỗi đặc biệt [Null Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#null-bulk-strings) (`$-1\r\n`).

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh
```

Sau đó tester sẽ gửi lệnh `SET` tới server của bạn:

```bash
$ redis-cli SET foo bar
```

Tester mong đợi nhận được phản hồi: `+OK\r\n`. Đó là chuỗi `OK` được mã hóa dưới dạng [Simple String](https://redis.io/docs/latest/develop/reference/protocol-spec/#simple-strings).

Lệnh này sẽ được tiếp nối bởi một lệnh `GET`:

```bash
$ redis-cli GET foo
```

Tester mong đợi nhận được phản hồi: `$3\r\nbar\r\n`. Đó là chuỗi `bar` được mã hóa dưới dạng [Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings).

### 💡 Lưu ý Quan trọng

- Nếu bạn đã xây dựng một bộ phân tích cú pháp RESP hoàn chỉnh ở các giai đoạn trước, bạn có thể tái sử dụng ngay trong giai đoạn này.
- Tương tự các giai đoạn trước, tên khóa và giá trị sẽ được tạo ngẫu nhiên, do đó bạn không thể phản hồi chuỗi cố định (hardcode) để vượt qua giai đoạn này.
- Nếu một khóa không tồn tại, lệnh `GET` cần trả về một [chuỗi Null Bulk String (`$-1\r\n`)](https://redis.io/docs/latest/develop/reference/protocol-spec/#null-bulk-strings). Chúng ta chưa kiểm tra trường hợp khóa không tồn tại một cách tường minh trong giai đoạn này, nhưng bạn sẽ cần nó ở các giai đoạn tiếp theo.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `SET / GET` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli SET / GET
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

// Bảng băm lưu trữ Key-Value trong bộ nhớ RAM
const store = new Map<string, string>();

const server = net.createServer((socket: net.Socket) => {
  socket.on("data", (data: Buffer) => {
    const args = parseRESP(data);
    const command = args[0]?.toUpperCase();

    if (command === "PING") {
      socket.write("+PONG\r\n");
    } else if (command === "ECHO") {
      socket.write(`$${Buffer.byteLength(args[1])}\r\n${args[1]}\r\n`);
    } else if (command === "SET") {
      const key = args[1];
      const value = args[2];
      store.set(key, value);
      // Trả về Simple String "+OK\r\n"
      socket.write("+OK\r\n");
    } else if (command === "GET") {
      const key = args[1];
      if (store.has(key)) {
        const value = store.get(key)!;
        socket.write(`$${Buffer.byteLength(value)}\r\n${value}\r\n`);
      } else {
        // Null bulk string khi key không tồn tại
        socket.write("$-1\r\n");
      }
    }
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
- [Tài liệu chính thức về lệnh `SET / GET` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
