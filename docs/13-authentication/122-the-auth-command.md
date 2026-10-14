# Challenge 122: Cài đặt lệnh AUTH kiểm tra mật khẩu hợp lệ và phản hồi +OK\r\n (The AUTH command)

[⬅️ **Thử thách trước**: [121. Cài đặt mật khẩu cho tài khoản default bằng lệnh ACL SETUSER default >password](../13-authentication/121-setting-default-user-password.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [123. Chặn các lệnh khác và trả về lỗi -NOAUTH khi kết nối chưa được xác thực](../13-authentication/123-enforce-authentication.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 122 / 124** |
| **Mã định danh (Slug)** | `hz3` |
| **Tên tiếng Anh (Official Name)** | `The AUTH command` |
| **Phân loại Module** | 🛡️ **Xác thực & Phân quyền ACL (Authentication)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `AUTH [user] password` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Cài đặt lệnh AUTH kiểm tra mật khẩu hợp lệ và phản hồi +OK\r\n**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `The AUTH command`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng hỗ trợ cho lệnh `AUTH`.

### 📖 Lệnh `AUTH`

[Lệnh `AUTH`](https://redis.io/docs/latest/commands/auth/) dùng để xác thực kết nối hiện tại bằng tên đăng nhập và mật khẩu chỉ định.

Cú pháp lệnh:

```bash
AUTH <username> <password>
```

Ví dụ sử dụng:

```bash
# Xác thực thất bại
> AUTH default wrongpassword
(error) WRONGPASS invalid username-password pair or user is disabled.

# Xác thực thành công
> AUTH default correctpassword
OK
```

Server phản hồi `+OK\r\n` nếu mã băm SHA-256 của mật khẩu cung cấp khớp với bất kỳ mã băm nào trong danh sách mật khẩu của người dùng.

Nếu không tìm thấy sự trùng khớp, server phản hồi [RESP Simple Error](https://redis.io/docs/latest/develop/reference/protocol-spec/#simple-errors): `WRONGPASS invalid username-password pair or user is disabled.`

Trong giai đoạn này, bạn chỉ cần phản hồi câu lệnh `AUTH` một cách chuẩn xác theo kết quả so khớp mật khẩu. Bạn chưa cần phải áp đặt trạng thái khóa phiên kết nối. Chúng ta sẽ thực thi điều đó ở các giai đoạn tiếp theo.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi lệnh `ACL SETUSER` chỉ định người dùng `default` và mật khẩu:

```bash
$ redis-cli ACL SETUSER default >mypassword
OK
```

Server của bạn phải phản hồi `OK` được mã hóa dưới dạng Simple String (`+OK\r\n`).

Tiếp theo, tester sẽ gửi hai lệnh `AUTH`: một lệnh chứa sai mật khẩu và một lệnh chứa đúng mật khẩu:

```bash
# Kỳ vọng lỗi bắt đầu bằng: WRONGPASS
> AUTH default wrongpassword
(error) WRONGPASS invalid username-password pair or user is disabled.

# Kỳ vọng: +OK\r\n
> AUTH default mypassword
OK
```

Tester sẽ xác thực rằng:
- Mật khẩu sai sẽ trả về [RESP Simple Error](https://redis.io/docs/latest/develop/reference/protocol-spec/#simple-errors) bắt đầu bằng `WRONGPASS`.
- Mật khẩu đúng sẽ trả về `+OK\r\n`.

### 💡 Lưu ý Quan trọng

- Tester kiểm tra thông báo lỗi khá nới lỏng. Bất kỳ phản hồi lỗi xác thực nào bắt đầu bằng `WRONGPASS` đều hợp lệ. Ví dụ:
    - `WRONGPASS wrong password`
    - `WRONGPASS invalid authentication`

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `AUTH [user] password` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli AUTH [user] password
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
- [Tài liệu chính thức về lệnh `AUTH [user] password` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
