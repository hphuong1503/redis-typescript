# Challenge 048: Hủy bỏ toàn bộ các key đang theo dõi với lệnh UNWATCH (The UNWATCH command)

[⬅️ **Thử thách trước**: [047. Theo dõi key chưa tồn tại (nếu key được tạo thì giao dịch bị hủy)](../05-optimistic-locking/047-watching-missing-keys.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [049. Tự động xóa danh sách theo dõi của kết nối ngay khi lệnh EXEC hoàn tất](../05-optimistic-locking/049-unwatch-on-exec.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 048 / 124** |
| **Mã định danh (Slug)** | `bn1` |
| **Tên tiếng Anh (Official Name)** | `The UNWATCH command` |
| **Phân loại Module** | 🔒 **Khóa lạc quan (Optimistic Locking)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `UNWATCH` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Hủy bỏ toàn bộ các key đang theo dõi với lệnh UNWATCH**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `The UNWATCH command`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho lệnh `UNWATCH`.

### 📖 Lệnh `UNWATCH`

[Lệnh `UNWATCH`](https://redis.io/docs/latest/commands/unwatch/) xóa toàn bộ các key đang được theo dõi của kết nối hiện tại. Bất kỳ key nào đã được đăng ký trước đó bằng lệnh `WATCH` sẽ không còn được giám sát nữa, do đó các transaction tiếp theo sẽ không bị ảnh hưởng bởi những thay đổi đối với các key đó.

```bash
$ redis-cli
> WATCH foo bar
OK
> UNWATCH
OK
```

Phản hồi luôn là `+OK\r\n`.

Sau khi gọi `UNWATCH`, ngay cả khi các key từng được theo dõi trước đó bị một client khác sửa đổi, transaction tiếp theo vẫn sẽ thực thi bình thường.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tester sẽ khởi tạo hai client kết nối đồng thời. Thông qua client thứ nhất, tester sẽ thiết lập hai key và theo dõi chúng:

```bash
# Client 1
> SET foo 100
OK
> SET bar 200
OK
> WATCH foo bar
OK
```

Thông qua client thứ hai, tester sẽ sửa đổi một trong các key đang được theo dõi:

```bash
# Client 2
> SET foo 200
OK
```

Quay trở lại client thứ nhất, tester sẽ hủy theo dõi toàn bộ key bằng `UNWATCH`, sau đó bắt đầu và thực thi một transaction:

```bash
# Client 1
> UNWATCH
OK
> MULTI
OK
> SET foo 400
QUEUED
> EXEC
1) OK                  # transaction thành công, các key đã được hủy theo dõi

# Client 2
> GET foo
"400"                  # xác nhận thao tác ghi của transaction đã có hiệu lực
```

Tester sẽ xác minh rằng:

- `UNWATCH` trả về `+OK\r\n`
- `EXEC` thành công ngay cả khi một key từng được theo dõi trước đó đã bị sửa đổi, bởi vì `UNWATCH` đã xóa sạch trạng thái theo dõi
- Các lệnh trong hàng đợi của transaction đã được áp dụng thành công

### 💡 Lưu ý Quan trọng

- `UNWATCH` không nhận tham số nào. Lệnh này luôn xóa sạch toàn bộ các key đang được theo dõi của kết nối hiện tại.
- `UNWATCH` vẫn hoạt động bình thường ngay cả khi trước đó chưa có key nào được theo dõi (chỉ đơn giản trả về `+OK\r\n`).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `UNWATCH` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli UNWATCH
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
- [Tài liệu chính thức về lệnh `UNWATCH` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách Redis trên CodeCrafters](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
