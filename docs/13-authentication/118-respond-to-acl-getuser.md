# Challenge 118: Lấy toàn bộ thuộc tính của tài khoản default qua lệnh ACL GETUSER default (Respond to ACL GETUSER)

[⬅️ **Thử thách trước**: [117. Phản hồi lệnh ACL WHOAMI trả về username hiện tại (mặc định 'default')](../13-authentication/117-respond-to-acl-whoami.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [119. Trả về cờ 'nopass' trong danh sách flags khi tài khoản chưa đặt mật khẩu](../13-authentication/119-the-nopass-flag.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 118 / 124** |
| **Mã định danh (Slug)** | `gx8` |
| **Tên tiếng Anh (Official Name)** | `Respond to ACL GETUSER` |
| **Phân loại Module** | 🛡️ **Xác thực & Phân quyền ACL (Authentication)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `ACL GETUSER default` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Lấy toàn bộ thuộc tính của tài khoản default qua lệnh ACL GETUSER default**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Respond to ACL GETUSER`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng hỗ trợ cho lệnh `ACL GETUSER`.

### 📖 Lệnh `ACL GETUSER`

[Lệnh `ACL GETUSER`](https://redis.io/docs/latest/commands/acl-getuser/) dùng để lấy thông tin các thuộc tính cấu hình của một người dùng chỉ định. Trong Redis, người dùng `default` luôn tồn tại sẵn ngay từ khi khởi động và không cần phải tạo mới.

Ví dụ sử dụng:

```bash
> ACL GETUSER default
1) "flags"
2) (empty array)
...
```

Giá trị trả về là một mảng lồng nhau RESP (nested array) gồm các cặp tên thuộc tính và giá trị thuộc tính tương ứng của người dùng:

```bash
[property_name_1, property_value_1, property_name_2, property_value_2, ...]
```

Trong giai đoạn này, bạn chỉ cần triển khai duy nhất thuộc tính `flags`.

### 📖 Thuộc tính `flags`

Thuộc tính `flags` đại diện cho một tập hợp các đặc tính mô tả quyền hạn hoặc hành vi đặc biệt của người dùng. Mỗi flag là một nhãn định danh ngắn xác định một phần cấu hình tài khoản.

Ví dụ: sau khi tạo hoặc sửa đổi một tài khoản, mảng flags có thể trông như sau:

```bash
> ACL GETUSER alice
1) "flags"
2) 1) "on"
   2) "allkeys"
   3) "allcommands"
```

Trong giai đoạn này, do tài khoản `default` chưa có cờ `flags` nào được thiết lập, bạn hãy gán giá trị trả về là một mảng RESP rỗng (`[]`).

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi lệnh `ACL GETUSER` chỉ định người dùng `default`:

```bash
# Kỳ vọng mảng RESP: ["flags", []]
$ redis-cli
> ACL GETUSER default
1) "flags"
2) (empty array)
```

Tester sẽ xác thực phản hồi nhận được là một mảng RESP gồm 2 phần tử:

1. Phần tử thứ nhất là chuỗi Bulk String `flags`.
2. Phần tử thứ hai là một mảng RESP rỗng (`*0\r\n`).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `ACL GETUSER default` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli ACL GETUSER default
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
- [Tài liệu chính thức về lệnh `ACL GETUSER default` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
