# Challenge 047: Theo dõi key chưa tồn tại (nếu key được tạo thì giao dịch bị hủy) (Watching missing keys)

[⬅️ **Thử thách trước**: [046. Theo dõi đồng thời danh sách nhiều key trong cùng một phiên làm việc](../05-optimistic-locking/046-watching-multiple-keys.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [048. Hủy bỏ toàn bộ các key đang theo dõi với lệnh UNWATCH](../05-optimistic-locking/048-the-unwatch-command.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 047 / 124** |
| **Mã định danh (Slug)** | `uo9` |
| **Tên tiếng Anh (Official Name)** | `Watching missing keys` |
| **Phân loại Module** | 🔒 **Khóa lạc quan (Optimistic Locking)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `WATCH missing key` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Theo dõi key chưa tồn tại (nếu key được tạo thì giao dịch bị hủy)**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Watching missing keys`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho việc theo dõi các key chưa từng tồn tại trước đó.

### Theo dõi key chưa tồn tại (Watching Non-existent Keys)

Cho đến thời điểm này, bạn mới chỉ theo dõi các key đã có sẵn giá trị. Tuy nhiên, lệnh `WATCH` cũng hoạt động với các key chưa từng tồn tại tại thời điểm gọi lệnh. Nếu một key đang được theo dõi được tạo mới bởi một client khác trước khi gọi `EXEC`, transaction vẫn phải bị hủy bỏ.

```bash
# Client A
> WATCH foo
OK

# Client B
> SET foo 300
OK

# Client A
> MULTI
OK
> SET bar 500
QUEUED
> EXEC
*-1\r\n                # transaction bị hủy bỏ, foo được tạo mới sau khi gọi WATCH
```

Key `foo` chưa hề tồn tại khi Client A bắt đầu theo dõi nó, nhưng Client B đã tạo ra nó trước khi Client A gọi `EXEC`. Thao tác tạo mới này được tính là một sửa đổi dữ liệu (modification).

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ tạo hai client kết nối. Thông qua client thứ nhất, tester sẽ theo dõi một key chưa tồn tại:

```bash
# Client 1
> WATCH foo
OK
```

Thông qua client thứ hai, tester sẽ tạo mới key đang được theo dõi đó:

```bash
# Client 2
> SET foo 200
OK
```

Quay trở lại client thứ nhất, tester sẽ bắt đầu một transaction và cố gắng thực thi nó:

```bash
# Client 1
> MULTI
OK
> SET foo 300
QUEUED
> EXEC
*-1\r\n                # transaction bị hủy bỏ
> GET foo
"200"                  # không đổi, transaction không có hiệu lực
```

Tester sẽ xác minh rằng:

- `EXEC` trả về mảng RESP null array (`*-1\r\n`) khi một key đang theo dõi được tạo mới bởi client khác
- Các lệnh trong hàng đợi của transaction bị hủy không gây ra tác dụng phụ nào

### 💡 Lưu ý Quan trọng

- Nếu mã nguồn của bạn đã lưu vết sửa đổi bằng cách gắn cờ các key được theo dõi trên mọi lệnh ghi (write command), giai đoạn này có thể vượt qua thành công mà không cần chỉnh sửa gì thêm.
- Điểm mấu chốt ở đây là: "sửa đổi" (modified) bao gồm cả việc chuyển từ trạng thái chưa tồn tại sang tồn tại. Một key không nhất thiết phải có giá trị từ trước mới được coi là bị tác động.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `WATCH missing key` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli WATCH missing key
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
