# Challenge 117: Phản hồi lệnh ACL WHOAMI trả về username hiện tại (mặc định 'default') (Respond to ACL WHOAMI)

[⬅️ **Thử thách trước**: [116. Tìm kiếm các địa điểm nằm trong bán kính quy định bằng lệnh GEOSEARCH](../12-geospatial/116-search-within-radius.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [118. Lấy toàn bộ thuộc tính của tài khoản default qua lệnh ACL GETUSER default](../13-authentication/118-respond-to-acl-getuser.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 117 / 124** |
| **Mã định danh (Slug)** | `jn4` |
| **Tên tiếng Anh (Official Name)** | `Respond to ACL WHOAMI` |
| **Phân loại Module** | 🛡️ **Xác thực & Phân quyền ACL (Authentication)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `ACL WHOAMI` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Phản hồi lệnh ACL WHOAMI trả về username hiện tại (mặc định 'default')**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Respond to ACL WHOAMI`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng tiếp nhận và phản hồi lệnh `ACL WHOAMI`.

### 📖 Lệnh `ACL WHOAMI`

[Lệnh `ACL WHOAMI`](https://redis.io/docs/latest/commands/acl-whoami/) trả về tên người dùng (username) hiện đang được liên kết với kết nối hiện tại.

Theo mặc định trong Redis, mọi kết nối TCP mới đều được tự động xác thực danh tính dưới tư cách người dùng mặc định mang tên `default`.

Ví dụ sử dụng:

```bash
> ACL WHOAMI
"default"
```

Câu lệnh trả về tên người dùng hiện đang được xác thực, được mã hóa dưới dạng [chuỗi RESP Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings).

Hành vi xác thực mặc định này có thể bị thay đổi để các kết nối mới bắt đầu ở trạng thái chưa được xác thực (unauthenticated). Chúng ta sẽ tìm hiểu và triển khai điều đó ở các thử thách tiếp theo.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi một lệnh `ACL WHOAMI`:

```bash
# Kỳ vọng RESP Bulk String: "default"
$ redis-cli ACL WHOAMI
"default"
```

Tester kỳ vọng nhận được chuỗi phản hồi: `$7\r\ndefault\r\n`. Đó chính là chuỗi `default` được mã hóa dưới dạng [RESP Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings).

### 💡 Lưu ý Quan trọng

- Trong giai đoạn này, bạn có thể gán cố định kết quả trả về của lệnh `ACL WHOAMI` là `default`. Việc bắt buộc xác thực tài khoản sẽ được triển khai ở các thử thách kế tiếp.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `ACL WHOAMI` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli ACL WHOAMI
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
- [Tài liệu chính thức về lệnh `ACL WHOAMI` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
