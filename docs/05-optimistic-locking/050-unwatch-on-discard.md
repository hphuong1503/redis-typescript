# Challenge 050: Tự động xóa danh sách theo dõi của kết nối khi gọi DISCARD (Unwatch on DISCARD)

[⬅️ **Thử thách trước**: [049. Tự động xóa danh sách theo dõi của kết nối ngay khi lệnh EXEC hoàn tất](../05-optimistic-locking/049-unwatch-on-exec.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [051. Hỗ trợ tham số dòng lệnh --port để chạy server trên cổng tùy chỉnh](../06-replication/051-configure-listening-port.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 050 / 124** |
| **Mã định danh (Slug)** | `hq1` |
| **Tên tiếng Anh (Official Name)** | `Unwatch on DISCARD` |
| **Phân loại Module** | 🔒 **Khóa lạc quan (Optimistic Locking)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `Auto-unwatch on DISCARD` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Tự động xóa danh sách theo dõi của kết nối khi gọi DISCARD**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Unwatch on DISCARD`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ cài đặt lệnh `DISCARD` và xác minh rằng lệnh này sẽ xóa sạch trạng thái theo dõi của các key.

### 📖 Lệnh `DISCARD`

[Lệnh `DISCARD`](https://redis.io/docs/latest/commands/discard/) hủy bỏ một transaction đang diễn ra. Lệnh này loại bỏ toàn bộ các lệnh đã xếp trong hàng đợi và thoát khỏi chế độ transaction:

```bash
$ redis-cli
> MULTI
OK
> SET foo 100
QUEUED
> SET bar 200
QUEUED
> DISCARD
OK
```

Phản hồi luôn là `+OK\r\n`.

### Dọn sạch trạng thái theo dõi (Clearing Watch State)

Tương tự như `EXEC`, lệnh `DISCARD` cũng xóa sạch toàn bộ các key đang được theo dõi của kết nối hiện tại. Điều này đồng nghĩa với việc transaction tiếp theo trên cùng một kết nối sẽ không bị ảnh hưởng bởi những sửa đổi đã xảy ra trước thời điểm gọi `DISCARD`.

```bash
$ redis-cli
# Client A
> WATCH foo
OK

# Client B
> SET foo 999
OK

# Client A
> MULTI
OK
> SET bar 200
QUEUED
> DISCARD
OK                     # watch state đã được xóa sạch

# Client A bắt đầu transaction mới (không có WATCH nào kích hoạt)
> MULTI
OK
> SET bar 200
QUEUED
> EXEC
1) OK                  # thành công, DISCARD đã xóa sạch watch state
```

Nếu không thực hiện thao tác dọn dẹp này, transaction thứ hai sẽ bị thất bại sai lầm vì key `foo` đã bị sửa đổi trước khi gọi `DISCARD`.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tester sẽ khởi tạo hai client kết nối đồng thời. Thông qua client thứ nhất, tester sẽ thiết lập hai key, theo dõi cả hai key, và bắt đầu một transaction:

```bash
# Client 1
> SET foo 100
OK
> SET bar 200
OK
> WATCH foo bar
OK
> MULTI
OK
> SET bar 300
QUEUED
```

Thông qua client thứ hai, tester sẽ sửa đổi một trong các key đang được theo dõi:

```bash
# Client 2
> SET foo 400
OK
```

Quay trở lại client thứ nhất, tester sẽ hủy bỏ transaction bằng `DISCARD`, sau đó ngay lập tức bắt đầu và thực thi một transaction mới:

```bash
# Client 1
> DISCARD
OK

# Client 1 bắt đầu transaction mới
> MULTI
OK
> SET bar 300
QUEUED
> EXEC
1) OK                  # thành công, DISCARD đã dọn sạch watch state

# Client 2
> GET bar
"300"                  # xác nhận thao tác ghi của transaction thứ hai đã có hiệu lực
```

Tester sẽ xác minh rằng:

- Lệnh `DISCARD` trả về `+OK\r\n`
- Lệnh `DISCARD` xóa sạch trạng thái theo dõi (watch state) của kết nối
- Transaction thứ hai thực thi thành công vì các key theo dõi đã được xóa bởi `DISCARD`
- Các lệnh trong hàng đợi của transaction thứ hai đã được áp dụng thành công

### 💡 Lưu ý Quan trọng

- `DISCARD` cần dọn sạch cả hàng đợi lệnh (command queue) lẫn trạng thái theo dõi (các key được theo dõi và cờ dirty).
- Nếu bạn đã xử lý việc dọn dẹp watch state trong `EXEC`, việc triển khai cho `DISCARD` cũng sẽ tuân theo mẫu tương tự.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Auto-unwatch on DISCARD` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Auto-unwatch on DISCARD
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
- [Tài liệu chính thức về lệnh `DISCARD` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách Redis trên CodeCrafters](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
