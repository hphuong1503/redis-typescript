# Challenge 124: Xác thực thành công bằng AUTH và mở khóa toàn bộ quyền thực thi lệnh (Authenticate using AUTH)

[⬅️ **Thử thách trước**: [123. Chặn các lệnh khác và trả về lỗi -NOAUTH khi kết nối chưa được xác thực](../13-authentication/123-enforce-authentication.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [🎉 *Hoàn thành tất cả 124 thử thách!*]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 124 / 124** |
| **Mã định danh (Slug)** | `ws7` |
| **Tên tiếng Anh (Official Name)** | `Authenticate using AUTH` |
| **Phân loại Module** | 🛡️ **Xác thực & Phân quyền ACL (Authentication)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `Full auth unlock` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Xác thực thành công bằng AUTH và mở khóa toàn bộ quyền thực thi lệnh**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Authenticate using AUTH`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ hoàn thiện cơ chế xác thực kết nối bằng lệnh `AUTH` để mở khóa thực thi lệnh.

### 📖 Mở khóa phiên kết nối sau khi thực thi `AUTH` thành công

Sau khi lệnh `AUTH` được thực thi thành công, phiên kết nối sẽ chính thức được xác thực dưới danh tính người dùng chỉ định. Một khi đã được xác thực, kết nối có thể thực thi bình thường tất cả các câu lệnh mà trước đó bị chặn bởi lỗi `NOAUTH`:

Ví dụ minh họa:

```bash
# Client 1
$ redis-cli
> ACL SETUSER default >newpassword
OK

> ACL WHOAMI
"default"

# Client 2 (kết nối mới)
$ redis-cli
> ACL WHOAMI
(error) NOAUTH Authentication required.

> AUTH default newpassword
OK

# Client 2 hiện đã được xác thực thành công là người dùng 'default'
> ACL WHOAMI
"default"
```

Trạng thái xác thực được duy trì trong suốt toàn bộ vòng đời của kết nối, do đó client không cần phải gửi lại lệnh xác thực cho mỗi thao tác tiếp theo.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi các câu lệnh tới hai client khác nhau:

```bash
# Client 1
$ redis-cli
> ACL SETUSER default >newpassword
OK

> ACL WHOAMI
"default"  # Vẫn giữ nguyên trạng thái xác thực

# Client 2 (kết nối mới)
$ redis-cli
> PING
(error) NOAUTH Authentication required.

> AUTH default newpassword
OK

> PING
PONG
```

Tester sẽ xác thực rằng:

1. Một client mới kết nối sẽ nhận lỗi `NOAUTH` khi cố gắng thực thi lệnh trước khi đăng nhập.
2. Lệnh `AUTH` trả về `OK` dưới dạng RESP Simple String khi xác thực thành công.
3. Client có thể thực thi các câu lệnh tiếp theo bình thường sau khi đã xác thực.

### 💡 Lưu ý Quan trọng

- Mọi câu lệnh ngoại trừ `AUTH` đều phải trả về lỗi `NOAUTH` khi được thực thi bởi một kết nối chưa xác thực. Quy tắc này áp dụng cho toàn bộ các lệnh bạn đã cài đặt trong Redis server, không chỉ riêng các lệnh nhóm `ACL`.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Full auth unlock` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Full auth unlock
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
// Quản lý tài khoản người dùng và xác thực
interface UserAccount {
  username: string;
  passwords: string[];
  flags: string[]; // ["on", "nopass", ...]
}

const defaultUser: UserAccount = {
  username: "default",
  passwords: [],
  flags: ["on", "nopass"]
};

// Trạng thái đã xác thực trên từng socket:
const authenticatedSockets = new WeakSet<net.Socket>();

// Nếu defaultUser có password và socket chưa gọi AUTH thành công:
// Chặn mọi lệnh khác ngoại trừ AUTH và phản hồi lỗi:
// "-NOAUTH Authentication required.\r\n"
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
- [Tài liệu chính thức về lệnh `Full auth unlock` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
