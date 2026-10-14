# Challenge 060: Master gửi snapshot RDB rỗng dưới dạng Bulk String tới Replica (Empty RDB transfer)

[⬅️ **Thử thách trước**: [059. Master phản hồi PSYNC bằng +FULLRESYNC <replid> 0](../06-replication/059-receive-handshake-2.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [061. Master truyền bá (replicate) các lệnh ghi (write commands) tới 1 Replica](../06-replication/061-single-replica-propagation.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 060 / 124** |
| **Mã định danh (Slug)** | `cf8` |
| **Tên tiếng Anh (Official Name)** | `Empty RDB transfer` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `Master sends empty RDB` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Master gửi snapshot RDB rỗng dưới dạng Bulk String tới Replica**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Empty RDB transfer`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ truyền gửi file RDB rỗng từ master sang replica.

### Đồng bộ hóa toàn phần (Full Resynchronization)

Khi một replica kết nối tới master lần đầu tiên, nó gửi lệnh `PSYNC ? -1`. Đây là cách mà replica thông báo với master rằng nó chưa có dữ liệu nào và cần thực hiện đồng bộ toàn phần (full resynchronization).

Master phản hồi qua 2 bước:

- Xác nhận bằng phản hồi `FULLRESYNC` (Đã xử lý ở các giai đoạn trước).
- Gửi một bản snapshot trạng thái dữ liệu hiện tại dưới dạng một [file RDB](https://rdb.fnordig.de/file_format.html).

Replica được kỳ vọng sẽ tải file này vào bộ nhớ RAM và thay thế trạng thái hiện tại của nó bằng dữ liệu của master.

Đối với thử thách này, bạn không cần phải tự xây dựng bộ sinh file RDB từ đầu. Thay vào đó, bạn có thể hardcode một file RDB rỗng, vì chúng ta giả định cơ sở dữ liệu của master lúc này luôn rỗng.

Bạn có thể tìm thấy biểu diễn dạng hex và base64 của file RDB rỗng [tại đây](https://github.com/codecrafters-io/redis-tester/blob/main/internal/assets/empty_rdb_hex.md). Bạn cần giải mã chuỗi này thành nội dung nhị phân (Buffer) trước khi gửi tới replica.

File được gửi bằng định dạng như sau:

```
$<length_of_file>\r\n<binary_contents_of_file>
```

Định dạng này tương tự cách mã hóa chuỗi [Bulk String](https://redis.io/topics/protocol#resp-bulk-strings), nhưng **không có ký tự `\r\n` ở cuối cùng**.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh --port <PORT>
```

Sau đó tester sẽ kết nối tới TCP server của bạn với vai trò là replica và thực thi các lệnh sau:

1. `PING` - kỳ vọng nhận lại `+PONG\r\n`
2. `REPLCONF listening-port <PORT>` - kỳ vọng nhận lại `+OK\r\n`
3. `REPLCONF capa eof capa psync2` - kỳ vọng nhận lại `+OK\r\n`
4. `PSYNC ? -1` - kỳ vọng nhận lại `+FULLRESYNC <REPL_ID> 0\r\n`

Ngay sau phản hồi cuối cùng, tester sẽ chờ nhận file RDB rỗng từ server của bạn.

Tester sẽ chấp nhận bất kỳ file RDB hợp lệ nào ở trạng thái rỗng.

### 💡 Lưu ý Quan trọng

- File RDB phải được gửi theo định dạng: `$<length>\r\n<contents>`
  - `<length>` là độ dài của file tính bằng byte
  - `<contents>` là nội dung nhị phân thuần túy của file
  - Lưu ý rằng đây KHÔNG phải là một RESP Bulk String thông thường vì nó không có đuôi `\r\n` ở cuối cùng.
- Nếu bạn muốn tìm hiểu thêm về định dạng file RDB, hãy tham khảo [bài viết này](https://rdb.fnordig.de/file_format.html). Thử thách này có một module mở rộng riêng biệt dành riêng cho việc phân tích cú pháp file RDB.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Master sends empty RDB` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Master sends empty RDB
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
// Tham số dòng lệnh cấu hình Master / Replica
let role: "master" | "slave" = "master";
let masterHost: string | null = null;
let masterPort: number | null = null;
let port = 6379;

// Phân tích tham số process.argv:
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--port") {
    port = parseInt(process.argv[i + 1], 10);
  } else if (process.argv[i] === "--replicaof") {
    role = "slave";
    const parts = process.argv[i + 1].split(" ");
    masterHost = parts[0];
    masterPort = parseInt(parts[1], 10);
  }
}

// Phản hồi lệnh INFO replication:
// role:master
// master_replid:8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb
// master_repl_offset:0
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
- [Tài liệu chính thức về cơ chế Replication trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách Redis trên CodeCrafters](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
