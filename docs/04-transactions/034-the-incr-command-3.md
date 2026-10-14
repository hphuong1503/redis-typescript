# Challenge 034: Báo lỗi ERR value is not an integer khi INCR chuỗi không phải số (The INCR command (3/3))

[⬅️ **Thử thách trước**: [033. Tự động khởi tạo giá trị 0 rồi tăng lên 1 khi INCR key chưa tồn tại](../04-transactions/033-the-incr-command-2.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [035. Bắt đầu một khối Transaction nguyên tử với lệnh MULTI](../04-transactions/035-the-multi-command.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 034 / 124** |
| **Mã định danh (Slug)** | `mk1` |
| **Tên tiếng Anh (Official Name)** | `The INCR command (3/3)` |
| **Phân loại Module** | 🔄 **Giao dịch & Tính nguyên tử (Transactions)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `INCR error validation` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Báo lỗi ERR value is not an integer khi INCR chuỗi không phải số**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `The INCR command (3/3)`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ xử lý lệnh `INCR` khi khóa đã tồn tại nhưng giá trị của nó không phải là một số nguyên hợp lệ.

### Ôn lại kiến thức

Việc triển khai lệnh [`INCR`](https://redis.io/docs/latest/commands/incr/) được chia làm ba giai đoạn:

- Khóa đã tồn tại và mang giá trị số (giai đoạn trước)
- Khóa chưa tồn tại (giai đoạn trước)
- Khóa đã tồn tại nhưng giá trị không phải là số hợp lệ (**Giai đoạn này**)

Khi khóa đã tồn tại nhưng không chứa một chuỗi biểu diễn số nguyên hợp lệ, lệnh `INCR` sẽ trả về một thông báo lỗi. Ví dụ:

```bash
$ redis-cli SET foo xyz
"OK"
$ redis-cli INCR foo
(error) ERR value is not an integer or out of range
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ kết nối tới server của bạn dưới vai trò Redis client và thực thi các lệnh sau:

```bash
$ redis-cli
> SET foo xyz (kỳ vọng nhận được phản hồi "+OK\r\n")
> INCR foo (kỳ vọng nhận được phản hồi "-ERR value is not an integer or out of range\r\n")
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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `INCR error validation` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli INCR error validation
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
- [Tài liệu chính thức về lệnh `INCR error validation` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
