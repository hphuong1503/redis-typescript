# Challenge 041: Tiếp tục thực thi các lệnh còn lại khi có lệnh lỗi runtime trong EXEC (Failures within transactions)

[⬅️ **Thử thách trước**: [040. Hủy bỏ khối Transaction và xóa hàng đợi lệnh bằng DISCARD](../04-transactions/040-the-discard-command.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [042. Quản lý độc lập trạng thái transaction giữa nhiều client đồng thời](../04-transactions/042-multiple-transactions.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 041 / 124** |
| **Mã định danh (Slug)** | `sg9` |
| **Tên tiếng Anh (Official Name)** | `Failures within transactions` |
| **Phân loại Module** | 🔄 **Giao dịch & Tính nguyên tử (Transactions)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `EXEC error handling` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Tiếp tục thực thi các lệnh còn lại khi có lệnh lỗi runtime trong EXEC**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Failures within transactions`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ xử lý lỗi phát sinh bên trong một transaction.

### Xử lý lỗi bên trong Transaction

Khi thực thi một transaction, nếu một câu lệnh bị lỗi trong lúc thực thi (runtime error), lỗi đó sẽ được bắt lại và trả về ngay tại vị trí tương ứng trong mảng phản hồi của lệnh `EXEC`. Tất cả các câu lệnh khác trong cùng transaction đó vẫn tiếp tục được thực thi bình thường.

Bạn có thể tìm hiểu thêm về hành vi này [trong tài liệu chính thức của Redis](https://redis.io/docs/latest/develop/interact/transactions/#errors-inside-a-transaction).

Ví dụ:

```bash
$ redis-cli
> MULTI
OK
> SET foo xyz
QUEUED
> INCR foo
QUEUED
> SET bar 7
QUEUED
> EXEC
1) OK
2) (error) ERR value is not an integer or out of range
3) OK
```

Trong ví dụ trên, lưu ý rằng thông báo lỗi của lệnh `INCR` được trả về ở phần tử thứ hai của mảng. Câu lệnh thứ ba (`SET bar 7`) vẫn được thực thi thành công hoàn toàn.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ kết nối tới server của bạn dưới vai trò Redis client và gửi nhiều lệnh trên cùng một kết nối:

```bash
$ redis-cli
> SET foo abc
OK
> SET bar 41
OK
> MULTI
OK
> INCR foo
QUEUED
> INCR bar
QUEUED
> EXEC
1) (error) ERR value is not an integer or out of range
2) (integer) 42
```

Phản hồi kỳ vọng cho lệnh `EXEC` là một [mảng RESP](https://redis.io/docs/latest/develop/reference/protocol-spec/#arrays) chứa các kết quả phản hồi của từng câu lệnh trong hàng đợi. Chuỗi byte chính xác sẽ là:

```bash
*2\r\n-ERR value is not an integer or out of range\r\n:42\r\n
```

Tester cũng sẽ xác minh rằng câu lệnh cuối cùng đã được thực thi thành công và khóa `bar` thực sự tồn tại:

```bash
$ redis-cli
> GET foo (kỳ vọng nhận được phản hồi "$3\r\nabc\r\n")
> GET bar (kỳ vọng nhận được phản hồi "$2\r\n42\r\n")
```

### 💡 Lưu ý Quan trọng

- Có một nhóm lỗi lệnh đặc thù (chẳng hạn như lỗi cú pháp - syntax errors) sẽ khiến toàn bộ transaction bị hủy bỏ ngay từ đầu (abort). Chúng ta chưa xét đến nhóm lỗi đó trong thử thách này.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `EXEC error handling` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli EXEC error handling
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
- [Tài liệu chính thức về lệnh `EXEC error handling` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
