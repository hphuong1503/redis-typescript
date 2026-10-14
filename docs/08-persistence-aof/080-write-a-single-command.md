# Challenge 080: Ghi 1 lệnh ghi dữ liệu (định dạng RESP) vào file AOF trên đĩa (Write a single command)

[⬅️ **Thử thách trước**: [079. Tự động tạo file appendonly.aof.manifest quản lý Multi-Part AOF](../08-persistence-aof/079-create-manifest-file.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [081. Ghi nối tiếp nhiều lệnh ghi liên tiếp vào file AOF theo thời gian thực](../08-persistence-aof/081-write-multiple-commands.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 080 / 124** |
| **Mã định danh (Slug)** | `dc8` |
| **Tên tiếng Anh (Official Name)** | `Write a single command` |
| **Phân loại Module** | 📝 **Ghi nhật ký AOF (AOF Persistence)** |
| **Độ khó (Difficulty)** | `Khó` |
| **Lệnh Redis liên quan** | `AOF append single write` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Ghi 1 lệnh ghi dữ liệu (định dạng RESP) vào file AOF trên đĩa**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Write a single command`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ ghi một lệnh thay đổi dữ liệu đơn lẻ vào file append-only.

### Ghi vào file Append-Only (Writing to the Append-Only File)

Cho đến lúc này, bạn đã tạo thư mục AOF, file AOF và file manifest khi khởi động. Bây giờ bạn sẽ bắt đầu sử dụng chúng. Khi `--appendonly yes` được thiết lập và server của bạn xử lý một lệnh ghi (như `SET`), nó phải nối thêm lệnh đó vào file append-only theo định dạng [RESP](https://redis.io/docs/latest/develop/reference/protocol-spec/).

Server của bạn cần đọc file manifest để tìm tên của file AOF cần ghi dữ liệu vào. Mục `type i` trong manifest sẽ cho bạn biết file nào là file tăng dần đang hoạt động.

Ví dụ: nếu server nhận được:

```bash
$ redis-cli SET foo 100
```

Nó cần nối thêm nội dung sau vào file AOF:

```
*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\n100\r\n
```

Đây chính là định dạng mã hóa RESP mà server của bạn đã sử dụng để giao tiếp qua mạng. Lệnh được lưu trữ chính xác như khi nhận được, giúp nó có thể được phát lại khi khởi động lại để khôi phục trạng thái.

### Tùy chọn `appendfsync always`

Khi `appendfsync` được đặt thành `always`, server phải đẩy dữ liệu ghi xuống đĩa cứng (flush to disk) trước khi gửi phản hồi lại cho client. Điều này đảm bảo rằng không có thao tác ghi nào đã được xác nhận bị mất, ngay cả khi server bị sập ngay sau khi phản hồi.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Tester sẽ tạo các mục sau trong đường dẫn `<dir>/<append_dir_name>`:

- Một file manifest có mục `type i` chỉ định tên file `<random_file_name>.1.incr.aof`
- File AOF rỗng tương ứng: `<random_file_name>.1.incr.aof`

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh --dir <dir> --appendonly yes --appenddirname <append_dir_name> --appendfilename <append_file_name> --appendfsync always
```

Sau đó tester sẽ gửi một lệnh ghi đơn lẻ:

```bash
$ redis-cli SET <key> <value>
```

Tester sẽ xác minh rằng:

- Lệnh được nối thêm vào file AOF được đặt tên trong manifest (không phải tên mặc định `<appendfilename>.1.incr.aof`)
- Lệnh được ghi theo định dạng RESP hợp lệ
- Thao tác ghi được flush xuống đĩa cứng trước khi client nhận được phản hồi

### 💡 Lưu ý Quan trọng

- Bạn phải đọc file manifest để xác định file cần ghi vào. Tester cố ý sử dụng tên file không mặc định để đảm bảo server của bạn tuân theo chỉ dẫn của file manifest.
- Bạn chưa cần xử lý `--appendfsync everysec` trong giai đoạn này. Chỉ có chế độ `always` được kiểm thử.
- Định dạng RESP của lệnh ghi giống hệt định dạng bạn đã dùng cho giao tiếp client-server. Bạn chỉ cần ghi nó vào một file thay vì gửi qua socket.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `AOF append single write` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli AOF append single write
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
- [Tài liệu chính thức về lệnh `AOF append single write` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
