# Challenge 121: Cài đặt mật khẩu cho tài khoản default bằng lệnh ACL SETUSER default >password (Setting default user password)

[⬅️ **Thử thách trước**: [120. Trả về mảng rỗng [] cho thuộc tính passwords của user khi chưa có mật khẩu](../13-authentication/120-the-passwords-property.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [122. Cài đặt lệnh AUTH kiểm tra mật khẩu hợp lệ và phản hồi +OK\r\n](../13-authentication/122-the-auth-command.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 121 / 124** |
| **Mã định danh (Slug)** | `uv9` |
| **Tên tiếng Anh (Official Name)** | `Setting default user password` |
| **Phân loại Module** | 🛡️ **Xác thực & Phân quyền ACL (Authentication)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `ACL SETUSER default >pass` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Cài đặt mật khẩu cho tài khoản default bằng lệnh ACL SETUSER default >password**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Setting default user password`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng thiết lập mật khẩu cho người dùng `default`.

### 📖 Lệnh `ACL SETUSER`

[Lệnh `ACL SETUSER`](https://redis.io/docs/latest/commands/acl-setuser/) được sử dụng để sửa đổi các thuộc tính của một người dùng hiện có.

Khi câu lệnh được sử dụng với cú pháp quy tắc `>`, nó sẽ thêm một mật khẩu cho người dùng chỉ định:

```bash
> ACL SETUSER default >mypassword
OK
```

Server phản hồi chuỗi `OK` dưới dạng RESP Simple String (`+OK\r\n`).

### 📖 Cơ chế lưu trữ mật khẩu

Thao tác thêm mật khẩu cho người dùng bằng `ACL SETUSER` mang lại hai tác động:
- Mật khẩu được băm và lưu trữ dưới dạng chuỗi mã băm SHA-256 (64 ký tự hex viết thường).
- Cờ `nopass` sẽ tự động bị loại bỏ khỏi danh sách flags.

Ví dụ minh họa:

```bash
> ACL SETUSER default >mypassword
OK

> ACL GETUSER default
 1) "flags"
 2) (empty array)
 3) "passwords"
 4) 1) "89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8"
```

Lưu ý rằng cờ `nopass` lúc này đã biến mất khỏi mảng `flags`. Đồng thời, mã băm SHA-256 của `mypassword` được lưu trữ dưới dạng Bulk String bên trong mảng `passwords`.

Chỉ lưu trữ mã băm SHA-256 là nguyên tắc bảo mật tối ưu mà Redis áp dụng nhằm ngăn chặn việc lộ lọt mật khẩu nếu cơ sở dữ liệu bị xâm nhập.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi lệnh `ACL GETUSER` chỉ định người dùng `default`:

```bash
# Kỳ vọng mảng RESP: ["flags", ["nopass"], "passwords", []]
$ redis-cli ACL GETUSER default
1) "flags"
2) 1) "nopass"
3) "passwords"
4) (empty array)
```

Tester sẽ xác thực rằng:

- Cờ `nopass` hiện diện trong mảng flags.
- Mảng `passwords` rỗng.

Tiếp theo, tester sẽ gửi lệnh `ACL SETUSER` chỉ định người dùng `default` và mật khẩu:

```bash
# Kỳ vọng: +OK\r\n
> ACL SETUSER default >mypassword
OK
```

Server của bạn phải phản hồi `+OK\r\n`.

Cuối cùng, tester sẽ gửi lại lệnh `ACL GETUSER` để kiểm tra tài khoản `default`:

```bash
# Kỳ vọng mảng RESP: ["flags", ["nopass"], "passwords", ["89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8"]]
> ACL GETUSER default
1) "flags"
2) 1) "nopass"
3) "passwords"
4) 1) "89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8"
```

Tester sẽ xác thực các yếu tố sau trong phản hồi của bạn:

- Cờ `nopass` không còn tồn tại trong mảng flags.
- Mảng `passwords` chứa chuỗi mã băm SHA-256 của `mypassword` được mã hóa dưới dạng RESP Bulk String.

### 💡 Lưu ý Quan trọng

- Redis sử dụng thuật toán băm mật khẩu SHA-256. Bạn cần tính toán mã băm SHA-256 của mật khẩu được cung cấp và lưu trữ nó.
- Chuỗi mã băm mật khẩu phải được lưu dưới dạng chuỗi hexa viết thường (lowercase hexadecimal string).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `ACL SETUSER default >pass` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli ACL SETUSER default >pass
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
- [Tài liệu chính thức về lệnh `ACL SETUSER default >pass` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
