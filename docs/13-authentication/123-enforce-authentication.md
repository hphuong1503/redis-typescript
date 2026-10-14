# Challenge 123: Chặn các lệnh khác và trả về lỗi -NOAUTH khi kết nối chưa được xác thực (Enforce authentication)

[⬅️ **Thử thách trước**: [122. Cài đặt lệnh AUTH kiểm tra mật khẩu hợp lệ và phản hồi +OK\r\n](../13-authentication/122-the-auth-command.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [124. Xác thực thành công bằng AUTH và mở khóa toàn bộ quyền thực thi lệnh](../13-authentication/124-authenticate-using-auth.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 123 / 124** |
| **Mã định danh (Slug)** | `nm2` |
| **Tên tiếng Anh (Official Name)** | `Enforce authentication` |
| **Phân loại Module** | 🛡️ **Xác thực & Phân quyền ACL (Authentication)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `Authentication enforcement` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Chặn các lệnh khác và trả về lỗi -NOAUTH khi kết nối chưa được xác thực**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Enforce authentication`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bắt buộc xác thực tài khoản người dùng `default` trước khi cho phép thực thi lệnh.

### 📖 Áp đặt xác thực bắt buộc cho người dùng `default`

Khi một kết nối mới được tạo, ban đầu nó được tự động xác thực dưới tư cách người dùng `default`. Điều này diễn ra vì cờ `nopass` được gắn sẵn cho người dùng `default` ngay từ đầu.

Một khi bạn đã thiết lập mật khẩu cho tài khoản `default`, các kết nối mới mở ra sau đó sẽ không còn được tự động xác thực nữa. Tuy nhiên, bất kỳ kết nối nào đã được xác thực trước thời điểm đổi mật khẩu sẽ vẫn duy trì trạng thái đăng nhập.

Ví dụ minh họa:

```bash
# Client 1
$ redis-cli ACL SETUSER default >password
OK

# Kết nối này vẫn duy trì xác thực dưới tư cách người dùng default
> ACL WHOAMI
"default"

# Client 2
# Kết nối này chưa được xác thực
$ redis-cli ACL WHOAMI
(error) NOAUTH Authentication required.
```

Khi một kết nối chưa được xác thực cố gắng thực thi bất kỳ câu lệnh nào, server phải trả về thông báo lỗi dạng RESP Simple Error: `NOAUTH Authentication required.`

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi các câu lệnh tới hai client khác nhau:

```bash
# Client 1
$ redis-cli
# Kỳ vọng: +OK\r\n
> ACL SETUSER default >newpassword
OK

# Kỳ vọng RESP Bulk String: "default"
> ACL WHOAMI
"default"

# Client 2 (kết nối mới)
$ redis-cli
# Kỳ vọng lỗi bắt đầu bằng: "NOAUTH"
> ACL WHOAMI
(error) NOAUTH Authentication required.
```

Tester sẽ xác thực rằng:
- Client 1 vẫn có thể thực thi các câu lệnh và duy trì trạng thái xác thực là tài khoản `default`.
- Client 2 nhận thông báo lỗi `NOAUTH` khi cố gắng thực thi câu lệnh mà chưa vượt qua xác thực.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Authentication enforcement` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Authentication enforcement
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
- [Tài liệu chính thức về lệnh `Authentication enforcement` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
