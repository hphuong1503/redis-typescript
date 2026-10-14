# Challenge 039: Thực thi tuần tự các lệnh trong hàng đợi và trả về mảng kết quả (Executing a transaction)

[⬅️ **Thử thách trước**: [038. Đưa các lệnh vào hàng đợi Transaction và phản hồi +QUEUED\r\n](../04-transactions/038-queueing-commands.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [040. Hủy bỏ khối Transaction và xóa hàng đợi lệnh bằng DISCARD](../04-transactions/040-the-discard-command.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 039 / 124** |
| **Mã định danh (Slug)** | `fy6` |
| **Tên tiếng Anh (Official Name)** | `Executing a transaction` |
| **Phân loại Module** | 🔄 **Giao dịch & Tính nguyên tử (Transactions)** |
| **Độ khó (Difficulty)** | `Khó` |
| **Lệnh Redis liên quan** | `EXEC with queued commands` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Thực thi tuần tự các lệnh trong hàng đợi và trả về mảng kết quả**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Executing a transaction`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ thực thi một transaction chứa nhiều câu lệnh.

### Thực thi transaction

Khi lệnh [EXEC](https://redis.io/docs/latest/commands/exec/) được gửi trong một transaction, tất cả các câu lệnh đã được xếp hàng trong transaction đó sẽ được thực thi tuần tự.

Phản hồi cho lệnh [EXEC](https://redis.io/docs/latest/commands/exec/) là một mảng chứa kết quả phản hồi của từng câu lệnh trong hàng đợi.

Ví dụ:

```bash
$ redis-cli
> MULTI
OK
> SET foo 41
QUEUED
> INCR foo
QUEUED
> EXEC
1) OK
2) (integer) 42
```

Trong ví dụ trên, `OK` là kết quả phản hồi của lệnh `SET`, và `42` là kết quả phản hồi của lệnh `INCR`.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ kết nối tới server của bạn dưới vai trò Redis client và gửi nhiều lệnh trên cùng một kết nối:

```bash
$ redis-cli MULTI
> SET foo 6 (kỳ vọng nhận được "+QUEUED\r\n")
> INCR foo (kỳ vọng nhận được "+QUEUED\r\n")
> INCR bar (kỳ vọng nhận được "+QUEUED\r\n")
> GET bar (kỳ vọng nhận được "+QUEUED\r\n")
> EXEC (kỳ vọng nhận được mảng chứa các phản hồi của các lệnh trong hàng đợi)
```

Vì transaction đã được thực thi, khóa `foo` bây giờ phải tồn tại và mang giá trị là `7`.

Tester sẽ xác minh điều này bằng cách thực thi lệnh `GET`:

```bash
$ redis-cli GET foo (kỳ vọng nhận được "7" được mã hóa dưới dạng chuỗi Bulk String)
```

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `EXEC with queued commands` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli EXEC with queued commands
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
// Trạng thái Transaction gắn theo từng connection socket
interface ClientState {
  inTransaction: boolean;
  queuedCommands: string[][];
  watchedKeys?: Set<string>;
}

const clientStates = new WeakMap<net.Socket, ClientState>();

// Khi nhận MULTI: clientState.inTransaction = true; socket.write("+OK\r\n");
// Khi nhận DISCARD: clientState.inTransaction = false; clientState.queuedCommands = []; socket.write("+OK\r\n");
// Khi client đang trong Transaction: các lệnh được xếp vào queuedCommands, phản hồi "+QUEUED\r\n"
// Khi nhận EXEC: Duyệt và thực thi tuần tự queuedCommands, trả về RESP Array kết quả.
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
- [Tài liệu chính thức về lệnh `EXEC with queued commands` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
