# Challenge 068: Đồng bộ hóa master-replica: Master gửi GETACK và chờ đủ số lượng ACK (WAIT with multiple commands)

[⬅️ **Thử thách trước**: [067. Xử lý lệnh WAIT khi hệ thống chưa có lệnh ghi mới nào cần đồng bộ](../06-replication/067-wait-with-no-commands.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [069. Hỗ trợ lệnh CONFIG GET cho 2 tham số dir và dbfilename](../07-persistence-rdb/069-rdb-file-config.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 068 / 124** |
| **Mã định danh (Slug)** | `na2` |
| **Tên tiếng Anh (Official Name)** | `WAIT with multiple commands` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Khó` |
| **Lệnh Redis liên quan** | `WAIT full synchronization` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Đồng bộ hóa master-replica: Master gửi GETACK và chờ đủ số lượng ACK**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `WAIT with multiple commands`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ mở rộng triển khai lệnh `WAIT` của mình để xử lý trường hợp các replica đã kết nối và đã nhận được các lệnh ghi.

### Lệnh `WAIT` khi có lệnh truyền bá (WAIT with propagated commands)

Trong các giai đoạn trước, chúng ta đã xử lý các trường hợp:

- Không có replica nào kết nối, và master có thể trả về `0` một cách an toàn.
- Các replica đã kết nối, nhưng chưa nhận bất kỳ lệnh ghi nào.

Bây giờ, chúng ta sẽ xử lý trường hợp các lệnh ghi đã được gửi tới các replica. Vì replication offset không còn là `0`, master cần kiểm tra xem replica nào đã xử lý thành công lệnh ghi mới nhất trước khi phản hồi.

Để thực hiện điều này, master phải gửi `REPLCONF GETACK *` tới các replica nếu có các lệnh ghi đang chờ xử lý kể từ lần gọi `WAIT` trước đó. Mỗi replica sẽ phản hồi bằng offset hiện tại của nó (`REPLCONF ACK <offset>`).

Lệnh `WAIT` sẽ hoàn tất khi thỏa mãn một trong hai điều kiện:

- Số lượng replica yêu cầu đã xác nhận tất cả các lệnh ghi trước đó, hoặc
- Hết thời gian chờ (timeout).

Dù theo trường hợp nào, master cũng cần trả về số lượng replica đã xác nhận tất cả các lệnh ghi trước đó dưới dạng [số nguyên RESP (RESP integer)](https://redis.io/docs/latest/develop/reference/protocol-spec/#integers).

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Tester sẽ khởi chạy chương trình của bạn dưới vai trò master như sau:

```
./your_program.sh
```

Sau đó, tester sẽ khởi động **nhiều** replica kết nối tới server của bạn. Mỗi replica sẽ hoàn thành quá trình bắt tay (handshake) và kỳ vọng nhận được một file RDB rỗng.

Tiếp theo, tester sẽ kết nối tới master của bạn dưới vai trò client và gửi nhiều lệnh ghi xen kẽ với các lệnh `WAIT`:

```bash
$ redis-cli SET foo 123
$ redis-cli WAIT 1 500    # (phải chờ cho đến khi 1 replica đã xử lý các lệnh trước đó hoặc đã trôi qua 500ms)

$ redis-cli SET bar 456
$ redis-cli WAIT 2 500    # (phải chờ cho đến khi 2 replica đã xử lý các lệnh trước đó hoặc đã trôi qua 500ms)
```

### 💡 Lưu ý Quan trọng

- Số lượng replica được trả về có thể ít hơn hoặc nhiều hơn số lượng replica dự kiến được chỉ định trong lệnh `WAIT`.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `WAIT full synchronization` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli WAIT full synchronization
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
- [Tài liệu chính thức về lệnh `WAIT full synchronization` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
