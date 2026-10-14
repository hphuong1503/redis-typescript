# Challenge 075: Cung cấp giá trị mặc định cho cấu hình CONFIG GET appendonly (no) (Default AOF options)

[⬅️ **Thử thách trước**: [074. Đọc timestamp hết hạn (opcode FD/FC) và bỏ qua các key đã hết hạn](../07-persistence-rdb/074-read-value-with-expiry.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [076. Kích hoạt AOF khi người dùng truyền tham số dòng lệnh --appendonly yes](../08-persistence-aof/076-aof-options-from-flags.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 075 / 124** |
| **Mã định danh (Slug)** | `uj3` |
| **Tên tiếng Anh (Official Name)** | `Default AOF options` |
| **Phân loại Module** | 📝 **Ghi nhật ký AOF (AOF Persistence)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `CONFIG GET appendonly` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Cung cấp giá trị mặc định cho cấu hình CONFIG GET appendonly (no)**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Default AOF options`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ thiết lập các giá trị mặc định cho các tùy chọn cấu hình liên quan đến cơ chế AOF (Append Only File).

### Cơ chế lưu trữ bền vững AOF trong Redis (AOF Persistence in Redis)

Redis lưu giữ toàn bộ dữ liệu trong bộ nhớ RAM, điều này giúp nó đạt tốc độ cực nhanh nhưng cũng dễ bị mất dữ liệu. Nếu server bị sập (crash), mọi dữ liệu sẽ biến mất. AOF (Append Only File) là một giải pháp giải quyết vấn đề này. Khi được bật, server sẽ ghi nhật ký mọi lệnh ghi vào một file, và khi khởi động lại, nó sẽ phát lại (replay) nội dung file đó để khôi phục trạng thái.

Hành vi của AOF được kiểm soát bởi một số tùy chọn cấu hình. Đối với giai đoạn này, bạn sẽ thiết lập các giá trị mặc định của chúng để có thể truy xuất thông qua lệnh `CONFIG GET`. Bạn chưa cần triển khai logic lưu trữ thực tế nào vào thời điểm này.

Dưới đây là các tùy chọn cấu hình và giá trị mặc định tương ứng:

| Tùy chọn | Mục đích | Mặc định |
|---|---|---|
| `dir` | Thư mục cơ sở nơi Redis lưu trữ các file dữ liệu | Thư mục làm việc hiện tại khi khởi động |
| `appendonly` | Kiểm soát việc cơ chế lưu trữ AOF được bật hay tắt | `no` |
| `appenddirname` | Thư mục con nằm trong `dir` nơi lưu trữ các file AOF và file manifest | `appendonlydir` |
| `appendfilename` | Tên của file append-only ghi lại các thao tác ghi dữ liệu | `appendonly.aof` |
| `appendfsync` | Tần suất đồng bộ dữ liệu đệm xuống file AOF trên đĩa cứng | `everysec` |

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ truy vấn từng tùy chọn bằng lệnh `CONFIG GET`:

```bash
$ redis-cli CONFIG GET dir
1) "dir"
2) "/path/to/current/directory"

$ redis-cli CONFIG GET appendonly
1) "appendonly"
2) "no"

$ redis-cli CONFIG GET appenddirname
1) "appenddirname"
2) "appendonlydir"

$ redis-cli CONFIG GET appendfilename
1) "appendfilename"
2) "appendonly.aof"

$ redis-cli CONFIG GET appendfsync
1) "appendfsync"
2) "everysec"
```

Mỗi phản hồi là một mảng RESP chứa hai [Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings): tên tùy chọn và giá trị của nó. Ví dụ: `CONFIG GET appendonly` phải trả về:
 
```
*2\r\n$10\r\nappendonly\r\n$2\r\nno\r\n
```

Tester sẽ xác minh rằng:

- Mỗi lệnh `CONFIG GET` trả về một mảng RESP gồm hai phần tử
- Tên tùy chọn và giá trị mặc định hoàn toàn chính xác cho từng tùy chọn

### 💡 Lưu ý Quan trọng

- Bạn chưa cần triển khai bất kỳ logic lưu trữ AOF nào trong giai đoạn này. Chỉ cần lưu trữ và trả về các giá trị mặc định.
- Nếu bạn đã triển khai lệnh `CONFIG GET` cho các tùy chọn khác trong thử thách trước, bạn chỉ cần bổ sung các key mới này vào cấu hình hiện tại của mình.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `CONFIG GET appendonly` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli CONFIG GET appendonly
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
import * as fs from "fs";
import * as path from "path";

// Tham số cấu hình AOF
let aofEnabled = false;
let aofDir = "appendonlydir";
let aofFilename = "appendonly.aof";

// Ghi lệnh vào file AOF mỗi khi có lệnh ghi (SET, DEL,...):
function appendToAOF(rawRESPCommand: string) {
  if (!aofEnabled) return;
  const filePath = path.join(dbDir, aofDir, aofFilename);
  fs.appendFileSync(filePath, rawRESPCommand);
}

// Khởi động server -> Nếu AOF bật và file tồn tại -> Đọc và replay lại từng lệnh vào RAM
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
- [Tài liệu chính thức về lệnh `CONFIG GET appendonly` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
