# Challenge 007: Hỗ trợ thời gian sống TTL cho Key với tùy chọn PX (Milliseconds) (Expiry)

[⬅️ **Thử thách trước**: [006. Cài đặt lệnh SET và GET lưu trữ Key-Value trong bộ nhớ RAM](../01-core/006-implement-the-set-and-get-commands.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [008. Khởi tạo Danh sách mới bằng lệnh RPUSH](../02-lists/008-create-a-list.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 007 / 124** |
| **Mã định danh (Slug)** | `yz1` |
| **Tên tiếng Anh (Official Name)** | `Expiry` |
| **Phân loại Module** | ⚡ **Nền tảng & Lệnh cơ bản (Core)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `SET key val PX <ms>` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Hỗ trợ thời gian sống TTL cho Key với tùy chọn PX (Milliseconds)**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Expiry`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ thiết lập thời gian hết hạn (expiry / TTL) cho khóa khi thực thi lệnh `SET`.

### Các tùy chọn của lệnh `SET`

Lệnh `SET` có thể nhận [các tham số tùy chọn](https://redis.io/docs/latest/commands/set/#options) để thay đổi hành vi hoạt động của nó.

Ví dụ, dưới đây là một số tùy chọn bạn có thể dùng với `SET`:

```bash
# Thiết lập khóa với thời gian hết hạn là 10 giây
$ redis-cli SET mykey value EX 10
OK

# Thiết lập khóa với thời gian hết hạn là 1000 mili-giây
$ redis-cli SET mykey value PX 1000
OK
```

### Tùy chọn `PX`

Tùy chọn `PX` được dùng để thiết lập thời gian hết hạn của khóa tính bằng mili-giây. Sau khi khóa hết hạn, nó sẽ không còn truy cập được nữa.

Ví dụ, một client có thể gán khóa kèm thời gian hết hạn như sau:
```bash
$ redis-cli SET foo bar PX 100
OK
```
Lệnh này gán khóa `foo` mang giá trị `bar` kèm thời gian hết hạn là 100 mili-giây.

Sau khi khóa hết hạn, lệnh `GET` đối với khóa đó phải trả về một [chuỗi Null Bulk String (`$-1\r\n`)](https://redis.io/docs/latest/develop/reference/protocol-spec/#null-bulk-strings).

```bash
$ redis-cli GET foo
(nil)
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tiếp theo, tester sẽ gửi một lệnh `SET` tới server của bạn để thiết lập khóa kèm thời gian hết hạn:

```bash
$ redis-cli SET foo bar PX 100
```

Ngay sau đó, tester sẽ gửi tiếp một lệnh `GET` để truy vấn giá trị của khóa:

```bash
$ redis-cli GET foo
```

Tester mong đợi nhận được phản hồi: `$3\r\nbar\r\n`. Đó là chuỗi `bar` được mã hóa dưới dạng chuỗi Bulk String.

Sau khi chờ khóa hết hạn (vượt quá TTL), tester sẽ gửi thêm một lệnh `GET` nữa:

```bash
$ sleep 0.2 && redis-cli GET foo
```

Tester mong đợi phản hồi trả về là chuỗi Null Bulk String (`$-1\r\n`).

### 💡 Lưu ý Quan trọng

- Tương tự như tên lệnh, các tham số của lệnh cũng không phân biệt chữ hoa/chữ thường. Vì vậy `PX`, `px`, và `pX` đều hoàn toàn hợp lệ.
- Tên khóa, giá trị và thời gian hết hạn được sử dụng trong các bài kiểm thử đều là ngẫu nhiên, do đó bạn không thể phản hồi chuỗi cố định (hardcode) để vượt qua giai đoạn này.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `SET key val PX <ms>` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli SET key val PX <ms>
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
interface ValueEntry {
  value: string;
  expiresAt: number | null; // Timestamp (ms) hoặc null nếu không hết hạn
}

const store = new Map<string, ValueEntry>();

// Trong nhánh xử lý lệnh SET:
// SET key value [PX milliseconds]
const key = args[1];
const value = args[2];
let expiresAt: number | null = null;

if (args.length >= 5 && args[3].toUpperCase() === "PX") {
  const ttlMs = parseInt(args[4], 10);
  expiresAt = Date.now() + ttlMs;
}
store.set(key, { value, expiresAt });
socket.write("+OK\r\n");

// Trong nhánh xử lý lệnh GET:
const entry = store.get(key);
if (!entry) {
  socket.write("$-1\r\n");
} else if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
  // Key đã quá hạn TTL -> Xóa và trả về nil
  store.delete(key);
  socket.write("$-1\r\n");
} else {
  socket.write(`$${Buffer.byteLength(entry.value)}\r\n${entry.value}\r\n`);
}
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
- [Tài liệu chính thức về lệnh `SET key val PX <ms>` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
