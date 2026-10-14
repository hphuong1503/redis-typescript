# Challenge 054: Sinh master_replid 40 ký tự ngẫu nhiên và master_repl_offset:0 (Initial replication ID and offset)

[⬅️ **Thử thách trước**: [053. Nhận diện vai trò role:slave khi khởi chạy kèm flag --replicaof](../06-replication/053-the-info-command-on-a-replica.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [055. Replica khởi tạo kết nối và gửi PING tới Master](../06-replication/055-send-handshake-1.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 054 / 124** |
| **Mã định danh (Slug)** | `xc1` |
| **Tên tiếng Anh (Official Name)** | `Initial replication ID and offset` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `master_replid & offset` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Sinh master_replid 40 ký tự ngẫu nhiên và master_repl_offset:0**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Initial replication ID and offset`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ mở rộng lệnh `INFO` để trả về các giá trị `master_replid` và `master_repl_offset`.

### Mã ID nhân bản và Offset (The Replication ID and Offset)

Mỗi Redis master duy trì hai thông tin cốt lõi để quản lý quá trình nhân bản: **mã ID nhân bản (replication ID)** và **offset nhân bản (replication offset)**.

Mã ID nhân bản là một chuỗi giả ngẫu nhiên có độ dài lớn. Mã ID này định danh lịch sử hiện tại của tập dữ liệu trên master. Khi một master server khởi động lần đầu hoặc khởi động lại, nó sẽ làm mới lại mã ID này.

Offset nhân bản theo dõi số lượng byte của các lệnh mà master đã truyền phát (stream) tới các replica của mình. Giá trị này được sử dụng để cập nhật trạng thái của replica đồng bộ với các thay đổi trên tập dữ liệu. Offset bắt đầu từ giá trị `0` khi master khởi động và chưa có replica nào kết nối.

Trong thử thách này, bạn sẽ khởi tạo mã ID nhân bản và offset cho master server:

- Mã ID có thể là bất kỳ chuỗi ký tự chữ và số giả ngẫu nhiên gồm đúng `40` ký tự.
  - Đối với thử thách này, bạn không nhất thiết phải sinh chuỗi ngẫu nhiên mà có thể hardcode một giá trị cố định.
  - Ví dụ, bạn có thể hardcode chuỗi `8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb` làm replication ID.
- Offset ban đầu phải có giá trị là `0`.

Hai giá trị này phải được trả về như một phần đầu ra của lệnh `INFO replication`, tương ứng với các khóa `master_replid` và `master_repl_offset`.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh
```

Sau đó tester sẽ gửi lệnh `INFO` với tùy chọn `replication` tới server của bạn:

```bash
$ redis-cli INFO replication
```

Chương trình của bạn phải phản hồi bằng một [Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings) trong đó mỗi dòng là một cặp key-value phân cách bởi dấu hai chấm (`:`). Tester sẽ tìm các cặp key-value sau:

- `role`: `master`
- `master_replid`: Một chuỗi ký tự chữ và số gồm 40 ký tự
- `master_repl_offset`: `0`

### 💡 Lưu ý Quan trọng

- Mã nguồn của bạn vẫn phải vượt qua các bài kiểm thử của các giai đoạn trước, nghĩa là bạn vẫn phải trả về đúng trường `role`.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `master_replid & offset` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli master_replid & offset
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
- [Tài liệu chính thức về lệnh `INFO` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách Redis trên CodeCrafters](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
