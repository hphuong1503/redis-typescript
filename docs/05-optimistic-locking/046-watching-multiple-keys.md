# Challenge 046: Theo dõi đồng thời danh sách nhiều key trong cùng một phiên làm việc (Watching multiple keys)

[⬅️ **Thử thách trước**: [045. Hủy thực thi EXEC (trả về nil) nếu key bị thay đổi bởi client khác](../05-optimistic-locking/045-tracking-key-modifications.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [047. Theo dõi key chưa tồn tại (nếu key được tạo thì giao dịch bị hủy)](../05-optimistic-locking/047-watching-missing-keys.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 046 / 124** |
| **Mã định danh (Slug)** | `fp0` |
| **Tên tiếng Anh (Official Name)** | `Watching multiple keys` |
| **Phân loại Module** | 🔒 **Khóa lạc quan (Optimistic Locking)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `WATCH k1 k2...` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Theo dõi đồng thời danh sách nhiều key trong cùng một phiên làm việc**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Watching multiple keys`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho việc theo dõi nhiều key cùng lúc bằng lệnh `WATCH`.

### Theo dõi nhiều key (Watching Multiple Keys)

Trong các giai đoạn trước, bạn chỉ cần xử lý lệnh `WATCH` với một key đơn lẻ. Tuy nhiên, lệnh `WATCH` cũng chấp nhận truyền vào nhiều key cùng lúc:

```bash
$ redis-cli
> WATCH foo bar baz
OK
```

Tất cả các key được chỉ định đều sẽ được giám sát để phát hiện thay đổi. Nếu có bất kỳ key nào trong số đó bị sửa đổi bởi một client khác trước khi gọi `EXEC`, toàn bộ transaction sẽ bị hủy bỏ:

```
Client A: WATCH foo bar          # Giám sát cả hai key
Client B: SET bar 300            # Sửa đổi một trong các key được theo dõi
Client A: MULTI
Client A: SET foo 400            # Đưa vào hàng đợi
Client A: EXEC                   # Transaction bị hủy, do bar đã bị sửa đổi
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tester sẽ khởi tạo hai client kết nối đồng thời. Thông qua client thứ nhất, tester sẽ thiết lập hai key, theo dõi cả hai key đó và bắt đầu một transaction:

```bash
# Client 1
> SET foo 100        # → OK
> SET bar 200        # → OK
> WATCH foo bar      # → OK
> MULTI              # → OK
> SET bar 300        # → QUEUED
```

Thông qua client thứ hai, tester sẽ sửa đổi một trong các key đang được theo dõi:

```bash
# Client 2
> SET foo 200        # → OK
```

Quay trở lại client thứ nhất, tester sẽ thực thi transaction và xác minh rằng giao dịch đã bị hủy bỏ:

```bash
# Client 1
> EXEC               # → *-1\r\n (transaction bị hủy bỏ)

# Client 2
> GET bar            # → "200" (không đổi, transaction không có hiệu lực)
```

Tester sẽ xác minh rằng:

- Lệnh `WATCH` với nhiều key trả về `+OK\r\n`
- `EXEC` trả về mảng RESP null array (`*-1\r\n`) khi có bất kỳ key nào trong số các key được theo dõi bị sửa đổi
- Các lệnh trong hàng đợi của transaction bị hủy không gây ra tác dụng phụ nào

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `WATCH k1 k2...` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli WATCH k1 k2...
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
// Quản lý WATCH:
// Lưu phiên bản (version/modification count) của mỗi key trong global state.
const keyVersions = new Map<string, number>();

// Khi client gọi WATCH key: lưu snapshot version hiện tại của key đó vào clientState.watchedKeys.
// Bất kỳ thao tác ghi (SET, INCR, v.v.) sẽ tăng keyVersions của key đó.
// Khi client gọi EXEC: Nếu bất kỳ key nào có keyVersions != snapshot -> Trả về "$-1\r\n" (hủy giao dịch).
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
- [Tài liệu chính thức về lệnh `WATCH` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách Redis trên CodeCrafters](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
