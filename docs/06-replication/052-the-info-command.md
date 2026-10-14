# Challenge 052: Phản hồi lệnh INFO replication với vai trò mặc định role:master (The INFO command)

[⬅️ **Thử thách trước**: [051. Hỗ trợ tham số dòng lệnh --port để chạy server trên cổng tùy chỉnh](../06-replication/051-configure-listening-port.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [053. Nhận diện vai trò role:slave khi khởi chạy kèm flag --replicaof](../06-replication/053-the-info-command-on-a-replica.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 052 / 124** |
| **Mã định danh (Slug)** | `ye5` |
| **Tên tiếng Anh (Official Name)** | `The INFO command` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `INFO replication (master)` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Phản hồi lệnh INFO replication với vai trò mặc định role:master**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `The INFO command`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ phản hồi lệnh [INFO](https://redis.io/commands/info/) với vai trò là một master server.

### 📖 Lệnh `INFO`

Lệnh `INFO` trả về thông tin và các số liệu thống kê về một Redis server đang hoạt động. Ví dụ: một client có thể lấy thông tin về server như sau:

```bash
$ redis-cli INFO
# Server
redis_version:7.2.4
...
# Clients
connected_clients:1
...
# Memory
used_memory:859944
...
# Replication
role:master
...
```

Server sẽ phản hồi bằng một [Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings), trong đó mỗi dòng là một cặp key-value phân cách bởi dấu hai chấm (`:`). Chuỗi phản hồi cũng có thể chứa các dòng tiêu đề phân mục (bắt đầu bằng `#`) và các dòng trống.

Lệnh `INFO` cũng chấp nhận một tham số tùy chọn để chỉ định phân mục thông tin cần hiển thị, chẳng hạn như `server`, `memory`, hoặc `replication`. Trong giai đoạn này, chúng ta sẽ chỉ tập trung vào phân mục `replication`.

### Phân mục `replication` (The `replication` Section)

Khi bạn chạy lệnh `INFO` với đối số `replication`, server chỉ trả về các chi tiết liên quan đến cấu hình nhân bản của nó:

```bash
$ redis-cli INFO replication
# Replication
role:master
connected_slaves:0
master_replid:8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb
master_repl_offset:0
second_repl_offset:-1
repl_backlog_active:0
repl_backlog_size:1048576
repl_backlog_first_byte_offset:0
repl_backlog_histlen:
```

Dưới đây là ý nghĩa của một số trường quan trọng:

- `role`: Vai trò của server (`master` hoặc `slave`).
- `connected_slaves`: Số lượng server replica đang kết nối.
- `master_replid`: Mã ID nhân bản (replication ID) của master.
- `master_repl_offset`: Offset nhân bản của master.

Trong thử thách này, bạn chỉ cần hỗ trợ trường `role`. Chúng ta sẽ bổ sung hỗ trợ cho các trường khác ở các giai đoạn sau.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh --port <PORT>
```

Sau đó tester sẽ gửi lệnh `INFO` với đối số là `replication`.

```bash
$ redis-cli -p <PORT> info replication
```

Server của bạn phải phản hồi bằng một [Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings) trong đó mỗi dòng là một cặp key-value phân cách bởi dấu hai chấm (`:`). Tester sẽ chỉ tìm trường `role` và kiểm tra giá trị của nó có phải là `master` hay không.

### 💡 Lưu ý Quan trọng

- Trong phản hồi cho lệnh `INFO`, bạn chỉ cần hỗ trợ trường `role` trong giai đoạn này. Chúng ta sẽ bổ sung các trường khác ở các giai đoạn sau.
- Dòng tiêu đề `# Replication` trong phản hồi là không bắt buộc, bạn có thể bỏ qua.
- Phản hồi cho lệnh `INFO` bắt buộc phải được mã hóa dưới dạng chuỗi Bulk String.
  - Ví dụ một phản hồi hợp lệ là `$11\r\nrole:master\r\n` (chuỗi `role:master` được mã hóa dưới dạng Bulk String chuẩn RESP).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `INFO replication (master)` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli INFO replication (master)
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
