# Challenge 005: Cài đặt lệnh ECHO và giải mã Bulk String trong RESP (Implement the ECHO command)

[⬅️ **Thử thách trước**: [004. Xử lý đồng thời nhiều client kết nối (Concurrency)](../01-core/004-handle-concurrent-clients.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [006. Cài đặt lệnh SET và GET lưu trữ Key-Value trong bộ nhớ RAM](../01-core/006-implement-the-set-and-get-commands.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 005 / 124** |
| **Mã định danh (Slug)** | `qq0` |
| **Tên tiếng Anh (Official Name)** | `Implement the ECHO command` |
| **Phân loại Module** | ⚡ **Nền tảng & Lệnh cơ bản (Core)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `ECHO <msg>` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Cài đặt lệnh ECHO và giải mã Bulk String trong RESP**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Implement the ECHO command`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho lệnh [ECHO](https://redis.io/commands/echo).

### 📖 Lệnh `ECHO`

Lệnh `ECHO` được dùng để kiểm thử và gỡ lỗi (debugging), tương tự như lệnh `PING`. 

```bash
$ redis-cli PING # Lệnh bạn đã cài đặt ở các giai đoạn trước
PONG
$ redis-cli ECHO hey # Lệnh bạn sẽ cài đặt trong giai đoạn này
hey
```

Lệnh nhận vào một đối số duy nhất và gửi trả lại đối số đó dưới dạng một chuỗi [Bulk String RESP](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings).

Để vượt qua thử thách này, chương trình của bạn cần:
- Phân tích cú pháp dữ liệu đầu vào từ client để trích xuất đối số của lệnh `ECHO`.
- Sau đó mã hóa đối số đó thành một Bulk String để làm phản hồi gửi về client.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi lệnh `ECHO` kèm theo một đối số tới server của bạn:

```bash
$ redis-cli ECHO hey
```

Các byte chính xác mà server nhận được sẽ là một mảng [RESP Array](https://redis.io/docs/latest/develop/reference/protocol-spec/#arrays) có định dạng tương tự `*2\r\n$4\r\nECHO\r\n$3\r\nhey\r\n`. Đây là cách mã hóa RESP của mảng `["ECHO", "hey"]`.

Tester mong đợi nhận được phản hồi: `$3\r\nhey\r\n`. Đó là chuỗi `hey` được mã hóa dưới dạng [Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings).

### 💡 Lưu ý Quan trọng

- Chúng tôi đặc biệt khuyên bạn nên tự xây dựng một bộ phân tích cú pháp RESP (RESP parser) hoàn chỉnh ngay từ giai đoạn này. Nó sẽ vô cùng hữu ích trong tất cả các giai đoạn sau.
- Tên lệnh Redis không phân biệt chữ hoa/chữ thường, do đó `ECHO`, `echo`, và `EcHo` đều là các lệnh hợp lệ.
- Tester sẽ gửi một chuỗi ngẫu nhiên làm đối số cho lệnh `ECHO`, vì vậy bạn không thể phản hồi chuỗi cố định (hardcode) để vượt qua giai đoạn này.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `ECHO <msg>` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli ECHO <msg>
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

// Hàm phân tích mảng RESP Array đơn giản
function parseRESP(buffer: Buffer): string[] {
  const text = buffer.toString();
  const lines = text.split("\r\n");
  const args: string[] = [];
  
  if (lines[0].startsWith("*")) {
    const numElements = parseInt(lines[0].slice(1), 10);
    let idx = 1;
    for (let i = 0; i < numElements; i++) {
      if (lines[idx].startsWith("$")) {
        const len = parseInt(lines[idx].slice(1), 10);
        args.push(lines[idx + 1]);
        idx += 2;
      }
    }
  }
  return args;
}

const server = net.createServer((socket: net.Socket) => {
  socket.on("data", (data: Buffer) => {
    const args = parseRESP(data);
    const command = args[0]?.toUpperCase();

    if (command === "PING") {
      socket.write("+PONG\r\n");
    } else if (command === "ECHO") {
      const message = args[1] || "";
      // Phản hồi dưới dạng Bulk String: $<length>\r\n<message>\r\n
      socket.write(`$${Buffer.byteLength(message)}\r\n${message}\r\n`);
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
- [Tài liệu chính thức về lệnh `ECHO <msg>` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
