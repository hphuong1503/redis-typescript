# Challenge 074: Đọc timestamp hết hạn (opcode FD/FC) và bỏ qua các key đã hết hạn (Read value with expiry)

[⬅️ **Thử thách trước**: [073. Phục hồi đầy đủ các cặp Key-Value từ file RDB vào bộ nhớ RAM](../07-persistence-rdb/073-read-multiple-string-values.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [075. Cung cấp giá trị mặc định cho cấu hình CONFIG GET appendonly (no)](../08-persistence-aof/075-default-aof-options.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 074 / 124** |
| **Mã định danh (Slug)** | `sm4` |
| **Tên tiếng Anh (Official Name)** | `Read value with expiry` |
| **Phân loại Module** | 💾 **Lưu trữ bền vững RDB (RDB Persistence)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `RDB expiry (FD & FC)` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Đọc timestamp hết hạn (opcode FD/FC) và bỏ qua các key đã hết hạn**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Read value with expiry`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho việc đọc các giá trị có thiết lập thời gian hết hạn (expiry).

Tester sẽ tạo một file RDB chứa nhiều key. Một số key sẽ được thiết lập thời gian hết hạn, và một số thì không. Các timestamp hết hạn cũng sẽ ngẫu nhiên, một số nằm trong quá khứ (đã hết hạn) và một số nằm trong tương lai (chưa hết hạn).

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh --dir <dir> --dbfilename <filename>
```

Sau đó tester sẽ gửi liên tiếp nhiều lệnh `GET <key>` tới server của bạn.

```bash
$ redis-cli GET "foo"
$ redis-cli GET "bar"
```

Khi một key đã hết hạn, phản hồi kỳ vọng là `$-1\r\n` (chuỗi Null Bulk String).

Khi một key chưa hết hạn, phản hồi kỳ vọng là một [RESP Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings) chứa giá trị tương ứng với key đó.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `RDB expiry (FD & FC)` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli RDB expiry (FD & FC)
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
// Cấu hình thư mục dir và file dbfilename
let dbDir = "/tmp";
let dbFileName = "dump.rdb";

// Khi nhận: CONFIG GET dir -> Trả về mảng RESP 2 phần tử ["dir", dbDir]
// Khi nhận: CONFIG GET dbfilename -> Trả về ["dbfilename", dbFileName]

// Đọc file RDB nhị phân:
import * as fs from "fs";
import * as path from "path";

const rdbPath = path.join(dbDir, dbFileName);
if (fs.existsSync(rdbPath)) {
  const rdbBuffer = fs.readFileSync(rdbPath);
  // Header: 5 bytes 'REDIS', 4 bytes version (0009 hoặc 0011)
  // Quét opcodes: 0xFE (Database Selector), 0xFB (Resize DB), 0xFD/0xFC (Expiry), 0x00 (String KV), 0xFF (EOF)
}
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
- [Tài liệu chính thức về lệnh `RDB expiry (FD & FC)` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
