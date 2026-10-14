# Challenge 084: Đọc và phát lại toàn bộ lịch sử lệnh trong file AOF để tái thiết lập bộ nhớ (Replay multiple commands)

[⬅️ **Thử thách trước**: [083. Phục hồi trạng thái server khi khởi động bằng cách đọc lại 1 lệnh từ file AOF](../08-persistence-aof/083-replay-a-single-command.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [085. Đăng ký nhận tin từ một kênh cụ thể bằng lệnh SUBSCRIBE](../09-pub-sub/085-subscribe-to-a-channel.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 084 / 124** |
| **Mã định danh (Slug)** | `kn2` |
| **Tên tiếng Anh (Official Name)** | `Replay multiple commands` |
| **Phân loại Module** | 📝 **Ghi nhật ký AOF (AOF Persistence)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `AOF replay all commands` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Đọc và phát lại toàn bộ lịch sử lệnh trong file AOF để tái thiết lập bộ nhớ**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Replay multiple commands`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ mở rộng việc phát lại (replay) để xử lý các file append-only chứa nhiều lệnh.

### Phát lại nhiều lệnh (Replaying Multiple Commands)

Một file append-only thông thường chứa nhiều lệnh chứ không chỉ một lệnh duy nhất. Server của bạn cần phân tích file dưới dạng một chuỗi các lệnh được mã hóa theo giao thức RESP và phát lại từng lệnh theo đúng thứ tự, giống như khi một client đang gửi trực tiếp các lệnh đó.

Vì giao thức RESP có tính tự đóng khung (self-framing - mỗi lệnh bắt đầu bằng `*<n>\r\n` để chỉ định độ dài), bạn có thể đọc liên tiếp từng lệnh cho đến khi đến cuối file (EOF). Mỗi lệnh sau khi được giải mã cú pháp phải được thực thi ngay vào trạng thái server trước khi chuyển sang lệnh tiếp theo.

Sau khi phát lại tất cả các lệnh, cơ sở dữ liệu của bạn sẽ phản ánh chính xác kết quả tích lũy của mọi thao tác ghi có trong file.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Tester sẽ tạo một thư mục `<dir>/<append_dir_name>` chứa:

- Một file AOF `<random_file_name>.1.incr.aof` với nhiều lệnh được mã hóa theo chuẩn RESP (ví dụ nhiều lệnh `SET` cho các key khác nhau)
- Một file manifest `<append_file_name>.manifest` trỏ đến file AOF đó:

```
file <random_file_name>.1.incr.aof seq 1 type i
```

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh --dir <dir> --appendonly yes --appenddirname <append_dir_name> --appendfilename <append_file_name>
```

Sau khi khởi động, tester sẽ gửi liên tiếp các lệnh `GET` để xác minh từng key đã được khôi phục:

```bash
$ redis-cli GET <key1>
$ redis-cli GET <key2>
...
```

Tester sẽ xác minh rằng:

- Mỗi lệnh `GET` trả về giá trị từ lệnh tương ứng trong file AOF
- Tất cả các lệnh từ file AOF đều được phát lại đầy đủ, không chỉ riêng lệnh đầu tiên

### 💡 Lưu ý Quan trọng

- Nếu triển khai của bạn từ các giai đoạn trước đã lặp qua file cho đến khi gặp EOF, giai đoạn này có thể vượt qua ngay mà không cần sửa đổi code.
- Bạn phải đọc và phát lại từ file được đặt tên trong file manifest, không phải từ tên file được gắn cứng `<append_file_name>.1.incr.aof`.
- RESP có tính tự đóng khung (self-framing), vì vậy bạn không cần bất kỳ ký tự phân cách nào giữa các lệnh. Chỉ cần tiếp tục parse cho đến khi hết dữ liệu byte.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `AOF replay all commands` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli AOF replay all commands
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
- [Tài liệu chính thức về lệnh `AOF replay all commands` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
