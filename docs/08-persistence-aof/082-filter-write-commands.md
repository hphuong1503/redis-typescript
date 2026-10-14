# Challenge 082: Lọc chỉ ghi các lệnh biến đổi dữ liệu (SET,...) và bỏ qua lệnh đọc (GET, PING) (Filter write commands)

[⬅️ **Thử thách trước**: [081. Ghi nối tiếp nhiều lệnh ghi liên tiếp vào file AOF theo thời gian thực](../08-persistence-aof/081-write-multiple-commands.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [083. Phục hồi trạng thái server khi khởi động bằng cách đọc lại 1 lệnh từ file AOF](../08-persistence-aof/083-replay-a-single-command.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 082 / 124** |
| **Mã định danh (Slug)** | `ep6` |
| **Tên tiếng Anh (Official Name)** | `Filter write commands` |
| **Phân loại Module** | 📝 **Ghi nhật ký AOF (AOF Persistence)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `AOF filter read-only commands` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Lọc chỉ ghi các lệnh biến đổi dữ liệu (SET,...) và bỏ qua lệnh đọc (GET, PING)**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Filter write commands`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ đảm bảo rằng chỉ các lệnh ghi mới được ghi nhật ký vào file append-only.

### Lọc bỏ các lệnh không làm thay đổi dữ liệu (Filtering Non-Modifying Commands)

Các lệnh không làm thay đổi dữ liệu, chẳng hạn như `PING`, `GET` và `ECHO`, tuyệt đối không bao giờ được ghi vào file AOF vì chúng không làm thay đổi bất kỳ trạng thái nào của hệ thống.

Nếu server nhận được sự kết hợp giữa các lệnh đọc và lệnh ghi, chỉ các lệnh ghi mới được xuất hiện trong file AOF theo đúng thứ tự mà chúng được tiếp nhận.

Ví dụ: nếu client gửi chuỗi lệnh:

```bash
$ redis-cli SET foo 1
$ redis-cli GET foo
$ redis-cli PING
$ redis-cli ECHO hello
$ redis-cli SET bar 2
```

File AOF chỉ được chứa hai lệnh `SET`:

```
*3\r\n
$3\r\n
SET\r\n
$3\r\n
foo\r\n
$1\r\n
1\r\n
*3\r\n
$3\r\n
SET\r\n
$3\r\n
bar\r\n
$1\r\n
2\r\n
```

*(Các chuỗi `\r\n` ở trên được hiển thị trên từng dòng riêng biệt để dễ đọc. Trong file thực tế, mỗi lệnh là một chuỗi byte liền mạch.)*

Không được có bất kỳ dấu vết nào của `GET`, `PING` hoặc `ECHO` xuất hiện trong file.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh --dir <dir> --appendonly yes --appenddirname <append_dir_name> --appendfilename <append_file_name> --appendfsync always
```

Tester sẽ gửi một tập hợp hỗn hợp các lệnh ghi và lệnh không thay đổi dữ liệu, bao gồm `PING`, `GET`, `ECHO` và `CONFIG GET` xen kẽ với ít nhất một lệnh ghi.

Tester sẽ xác minh rằng:

- File append-only chỉ chứa các lệnh ghi, theo đúng thứ tự
- Không có byte nào từ các lệnh không làm thay đổi dữ liệu xuất hiện trong file
- Mỗi lệnh được ghi lại đều ở định dạng RESP hợp lệ

### 💡 Lưu ý Quan trọng

- Nếu bạn đã có phương pháp phân biệt lệnh ghi và lệnh đọc (ví dụ cho tính năng nhân bản replication), bạn có thể tái sử dụng logic đó ở đây.
- Bạn phải đọc file manifest để xác định file cần ghi vào. Tester sử dụng tên file không mặc định.
- Bạn chưa cần xử lý `--appendfsync everysec` trong giai đoạn này.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `AOF filter read-only commands` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli AOF filter read-only commands
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
- [Tài liệu chính thức về lệnh `AOF filter read-only commands` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
