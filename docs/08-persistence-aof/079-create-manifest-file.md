# Challenge 079: Tự động tạo file appendonly.aof.manifest quản lý Multi-Part AOF (Create manifest file)

[⬅️ **Thử thách trước**: [078. Tự động tạo file dữ liệu appendonly.aof bên trong thư mục AOF](../08-persistence-aof/078-create-append-only-file.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [080. Ghi 1 lệnh ghi dữ liệu (định dạng RESP) vào file AOF trên đĩa](../08-persistence-aof/080-write-a-single-command.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 079 / 124** |
| **Mã định danh (Slug)** | `pb9` |
| **Tên tiếng Anh (Official Name)** | `Create manifest file` |
| **Phân loại Module** | 📝 **Ghi nhật ký AOF (AOF Persistence)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `File appendonly.aof.manifest` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Tự động tạo file appendonly.aof.manifest quản lý Multi-Part AOF**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Create manifest file`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ tạo một file manifest cùng với file append-only.

### File Manifest (The Manifest File)

File manifest chỉ dẫn cho Redis biết những file AOF nào đang tồn tại và thứ tự chúng cần được phát lại (replay) trong quá trình khôi phục dữ liệu. File này tuân theo quy ước đặt tên `<appendfilename>.manifest` và nằm cùng thư mục với file AOF.

File manifest chứa một dòng duy nhất mô tả file AOF mà bạn đã tạo ở giai đoạn trước:

```
file <appendfilename>.1.incr.aof seq 1 type i
```

Dưới đây là ý nghĩa của từng thành phần:

| Trường | Giá trị | Ý nghĩa |
|---|---|---|
| `file` | `<appendfilename>.1.incr.aof` | Tên của file AOF |
| `seq` | `1` | Số thứ tự (sequence number) cho file này |
| `type` | `i` | File tăng dần (incremental), nghĩa là nó chứa các lệnh ghi được nối thêm từng lệnh một |

Ví dụ: nếu server được khởi động với `--appendfilename appendonly.aof`, file manifest sẽ có tên là `appendonly.aof.manifest` và phải chứa nội dung:

```
file appendonly.aof.1.incr.aof seq 1 type i
```

Bạn có thể gắn cứng (hardcode) số thứ tự sequence và type cho giai đoạn này.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh --dir <dir> --appendonly yes --appenddirname <append_dir_name> --appendfilename <append_file_name>
```

Sau đó tester sẽ xác minh rằng:

- Thư mục `<dir>/<append_dir_name>` tồn tại
- File AOF rỗng `<dir>/<append_dir_name>/<append_file_name>.1.incr.aof` tồn tại
- File manifest `<dir>/<append_dir_name>/<append_file_name>.manifest` tồn tại
- File manifest chứa chính xác dòng `file <append_file_name>.1.incr.aof seq 1 type i`

### 💡 Lưu ý Quan trọng

- File manifest phải được tạo ngay khi khởi động cùng với file AOF.
- Mỗi token trong dòng manifest được phân cách bởi một dấu cách đơn. Không dùng phím tab hoặc khoảng trắng thừa.
- Đảm bảo dòng manifest kết thúc bằng ký tự xuống dòng (`\n`).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `File appendonly.aof.manifest` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli File appendonly.aof.manifest
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
- [Tài liệu chính thức về lệnh `File appendonly.aof.manifest` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
