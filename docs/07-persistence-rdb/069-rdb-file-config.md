# Challenge 069: Hỗ trợ lệnh CONFIG GET cho 2 tham số dir và dbfilename (RDB file config)

[⬅️ **Thử thách trước**: [068. Đồng bộ hóa master-replica: Master gửi GETACK và chờ đủ số lượng ACK](../06-replication/068-wait-with-multiple-commands.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [070. Đọc cấu trúc header RDB và trích xuất key đầu tiên từ database 0](../07-persistence-rdb/070-read-a-key.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 069 / 124** |
| **Mã định danh (Slug)** | `zg5` |
| **Tên tiếng Anh (Official Name)** | `RDB file config` |
| **Phân loại Module** | 💾 **Lưu trữ bền vững RDB (RDB Persistence)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `CONFIG GET dir/dbfilename` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Hỗ trợ lệnh CONFIG GET cho 2 tham số dir và dbfilename**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `RDB file config`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Chào mừng bạn đến với Phần mở rộng Cơ chế Lưu trữ Bền vững RDB (RDB Persistence Extension)! Trong phần mở rộng này, bạn sẽ bổ sung khả năng đọc các [file RDB](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) (tệp cơ sở dữ liệu Redis).

Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho hai tham số cấu hình liên quan đến cơ chế lưu trữ RDB, cũng như lệnh [CONFIG GET](https://redis.io/docs/latest/commands/config-get/).

### File RDB (RDB files)

File RDB là một bản chụp nhanh (point-in-time snapshot) của tập dữ liệu Redis. Khi cơ chế lưu trữ RDB được kích hoạt, Redis server sẽ đồng bộ hóa trạng thái trong bộ nhớ RAM với file RDB bằng các bước sau:

1. Khi khởi động, Redis server sẽ nạp dữ liệu từ file RDB vào bộ nhớ.
2. Trong quá trình hoạt động, Redis server định kỳ tạo các bản chụp nhanh mới của tập dữ liệu để cập nhật file RDB.

### Tham số `dir` và `dbfilename`

Các tham số cấu hình `dir` và `dbfilename` chỉ định nơi lưu trữ file RDB:
- `dir` - đường dẫn tới thư mục chứa file RDB (ví dụ: `/tmp/redis-data`)
- `dbfilename` - tên của file RDB (ví dụ: `rdbfile`)

### Lệnh `CONFIG GET`

Lệnh [`CONFIG GET`](https://redis.io/docs/latest/commands/config-get/) trả về giá trị của các tham số cấu hình.

Lệnh này nhận một hoặc nhiều tham số cấu hình và trả về một [mảng RESP (RESP array)](https://redis.io/docs/latest/develop/reference/protocol-spec/#arrays) chứa các cặp key-value:

```bash
$ redis-cli CONFIG GET dir
1) "dir"
2) "/tmp/redis-data"
```

Mặc dù `CONFIG GET` có thể lấy nhiều tham số cùng lúc, tester sẽ chỉ gửi các lệnh `CONFIG GET` với từng tham số một.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh --dir /tmp/redis-files --dbfilename dump.rdb
```

Sau đó tester sẽ gửi các lệnh sau:

```bash
$ redis-cli CONFIG GET dir
$ redis-cli CONFIG GET dbfilename
```

Server của bạn phải phản hồi mỗi lệnh `CONFIG GET` bằng một mảng RESP gồm hai phần tử:

1. **Tên** tham số, được mã hóa dưới dạng [RESP Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings)
2. **Giá trị** của tham số, được mã hóa dưới dạng RESP Bulk String

Ví dụ: nếu giá trị của `dir` là `/tmp/redis-files`, phản hồi kỳ vọng cho `CONFIG GET dir` là:

```bash
*2\r\n$3\r\ndir\r\n$16\r\n/tmp/redis-files\r\n
```

### 💡 Lưu ý Quan trọng

- Bạn chưa cần phải đọc file RDB trong giai đoạn này, bạn chỉ cần lưu trữ `dir` và `dbfilename`. Việc đọc nội dung file sẽ được thực hiện ở các giai đoạn sau.
- Nếu kho mã nguồn của bạn được tạo trước ngày 05/10/2023, có thể script `./your_program.sh` chưa truyền tham số dòng lệnh vào chương trình. Để khắc phục, bạn cần chỉnh sửa `./your_program.sh`. Hãy xem [PR cập nhật tham số CLI](https://github.com/codecrafters-io/build-your-own-redis/pull/89/files) để biết chi tiết cách thực hiện.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `CONFIG GET dir/dbfilename` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli CONFIG GET dir/dbfilename
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
- [Tài liệu chính thức về lệnh `CONFIG GET dir/dbfilename` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
