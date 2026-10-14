# Challenge 083: Phục hồi trạng thái server khi khởi động bằng cách đọc lại 1 lệnh từ file AOF (Replay a single command)

[⬅️ **Thử thách trước**: [082. Lọc chỉ ghi các lệnh biến đổi dữ liệu (SET,...) và bỏ qua lệnh đọc (GET, PING)](../08-persistence-aof/082-filter-write-commands.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [084. Đọc và phát lại toàn bộ lịch sử lệnh trong file AOF để tái thiết lập bộ nhớ](../08-persistence-aof/084-replay-multiple-commands.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 083 / 124** |
| **Mã định danh (Slug)** | `xz2` |
| **Tên tiếng Anh (Official Name)** | `Replay a single command` |
| **Phân loại Module** | 📝 **Ghi nhật ký AOF (AOF Persistence)** |
| **Độ khó (Difficulty)** | `Khó` |
| **Lệnh Redis liên quan** | `AOF replay single command` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Phục hồi trạng thái server khi khởi động bằng cách đọc lại 1 lệnh từ file AOF**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Replay a single command`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ khôi phục trạng thái hệ thống khi khởi động bằng cách phát lại (replay) các lệnh từ file append-only.

### Phát lại file Append-Only (Replaying the Append-Only File)

Trong các giai đoạn trước, bạn đã ghi các lệnh vào file AOF ngay khi chúng được gửi đến. Bây giờ bạn sẽ làm điều ngược lại: khi khởi động, đọc lại các lệnh đó và phát lại (replay) chúng để tái thiết lập cơ sở dữ liệu.

Khi server khởi động với `--appendonly yes` và thư mục append-only đã tồn tại từ trước, server cần thực hiện:

1. Đọc file manifest tại `<dir>/<append_dir_name>/<append_file_name>.manifest`
2. Tìm mục có `type i` (file tăng dần - incremental file)
3. Mở file đó và phân tích cú pháp các lệnh được mã hóa RESP bên trong
4. Thực thi từng lệnh như thể client vừa gửi lệnh đó đến

Sau khi replay xong, cơ sở dữ liệu sẽ ở đúng trạng thái như khi các lệnh ban đầu được ghi vào. Đây chính là cách Redis phục hồi dữ liệu sau khi khởi động lại.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Tester sẽ tạo một thư mục `<dir>/<append_dir_name>` chứa:

- Một file AOF `<random_file_name>.1.incr.aof` với một lệnh `SET` đơn lẻ được mã hóa theo chuẩn RESP
- Một file manifest `<append_file_name>.manifest` trỏ đến file AOF đó:

```
file <random_file_name>.1.incr.aof seq 1 type i
```

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh --dir <dir> --appendonly yes --appenddirname <append_dir_name> --appendfilename <append_file_name>
```

Sau khi khởi động, tester sẽ gửi lệnh `GET` để xác minh dữ liệu đã được replay chính xác:

```bash
$ redis-cli GET <key>
```

Tester sẽ xác minh rằng:

- Giá trị trả về bởi lệnh `GET` khớp với giá trị từ lệnh `SET` trong file AOF
- Server của bạn đọc đúng file AOF được đặt tên trong file manifest, không phải tên file được gắn cứng (hardcoded)

### 💡 Lưu ý Quan trọng

- Bạn phải đọc file manifest để tìm file cần replay. Tester cố ý sử dụng tên file không mặc định (`<random_file_name>.1.incr.aof` thay vì `<append_file_name>.1.incr.aof`) để đảm bảo server của bạn tuân theo hướng dẫn của manifest.
- File AOF chứa cùng một định dạng RESP mà bạn đã phân tích cú pháp từ các kết nối client. Bạn có thể tái sử dụng bộ parser RESP hiện có của mình ở đây.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `AOF replay single command` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli AOF replay single command
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
- [Tài liệu chính thức về lệnh `AOF replay single command` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
