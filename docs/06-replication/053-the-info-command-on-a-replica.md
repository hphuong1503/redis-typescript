# Challenge 053: Nhận diện vai trò role:slave khi khởi chạy kèm flag --replicaof (The INFO command on a replica)

[⬅️ **Thử thách trước**: [052. Phản hồi lệnh INFO replication với vai trò mặc định role:master](../06-replication/052-the-info-command.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [054. Sinh master_replid 40 ký tự ngẫu nhiên và master_repl_offset:0](../06-replication/054-initial-replication-id-and-offset.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 053 / 124** |
| **Mã định danh (Slug)** | `hc6` |
| **Tên tiếng Anh (Official Name)** | `The INFO command on a replica` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `--replicaof <host> <port>` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Nhận diện vai trò role:slave khi khởi chạy kèm flag --replicaof**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `The INFO command on a replica`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ mở rộng lệnh [INFO](https://redis.io/commands/info/) để phản ánh vai trò của server là replica (bản sao).

### Cờ `--replicaof` (The `--replicaof` Flag)

Theo mặc định, Redis server của bạn đóng vai trò là master. Khi bạn truyền thêm cờ `--replicaof`, server sẽ đóng vai trò là replica.

Ví dụ:

```bash
./your_program.sh --port 6380 --replicaof "localhost 6379"
```

Ở đây, chúng ta sử dụng cờ `--replicaof` để khởi động một Redis server với tư cách là replica. Server sẽ lắng nghe các kết nối trên cổng `6380`, đồng thời kết nối tới một master (một Redis server khác) đang chạy trên `localhost:6379` và sao chép toàn bộ các thay đổi của master đó.

Chúng ta sẽ tìm hiểu sâu hơn về cơ chế hoạt động của quá trình nhân bản này ở các giai đoạn sau.

Trong giai đoạn này, nhiệm vụ chính của bạn là cập nhật bộ xử lý lệnh `INFO replication` để kiểm tra cấu hình khởi chạy của server:

- Nếu người dùng không truyền cờ `--replicaof`, phản hồi với `role:master`.
- Nếu người dùng có truyền cờ `--replicaof`, phản hồi với `role:slave`.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh --port <PORT> --replicaof "<MASTER_HOST> <MASTER_PORT>"
```

Sau đó tester sẽ gửi lệnh `INFO` với đối số `replication` tới server của bạn:

```bash
$ redis-cli -p <PORT> INFO replication
```

Chương trình của bạn phải phản hồi bằng một [Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings) trong đó mỗi dòng là một cặp key-value phân cách bởi dấu hai chấm (`:`). Tester sẽ chỉ tìm trường `role` và kiểm tra giá trị của nó có phải là `slave` hay không.

### 💡 Lưu ý Quan trọng

- Chương trình của bạn vẫn cần vượt qua các bài kiểm thử của các giai đoạn trước, nghĩa là nếu không chỉ định cờ `--replicaof`, server phải mặc định ở vai trò `master`.
- Tương tự như giai đoạn trước, bạn chỉ cần hỗ trợ trường `role` trong phản hồi của giai đoạn này. Chúng ta sẽ bổ sung các trường khác ở các giai đoạn tiếp theo.
- Bạn chưa cần thực sự kết nối tới master server được chỉ định qua cờ `--replicaof` trong giai đoạn này. Chúng ta sẽ thực hiện việc đó ở các giai đoạn sau.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `--replicaof <host> <port>` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli --replicaof <host> <port>
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
