# Challenge 067: Xử lý lệnh WAIT khi hệ thống chưa có lệnh ghi mới nào cần đồng bộ (WAIT with no commands)

[⬅️ **Thử thách trước**: [066. Cài đặt lệnh WAIT phản hồi ngay số replica khi không có replica nào kết nối](../06-replication/066-wait-with-no-replicas.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [068. Đồng bộ hóa master-replica: Master gửi GETACK và chờ đủ số lượng ACK](../06-replication/068-wait-with-multiple-commands.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 067 / 124** |
| **Mã định danh (Slug)** | `tu8` |
| **Tên tiếng Anh (Official Name)** | `WAIT with no commands` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `WAIT with 0 pending writes` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Xử lý lệnh WAIT khi hệ thống chưa có lệnh ghi mới nào cần đồng bộ**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `WAIT with no commands`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ mở rộng triển khai lệnh `WAIT` để xử lý trường hợp có các replica đang kết nối nhưng chưa có câu lệnh ghi nào được gửi đi.

### Lệnh `WAIT` khi có replica kết nối (`WAIT` with connected replicas)

Ở các giai đoạn trước, chúng ta đã xử lý trường hợp không có replica nào kết nối, và master có thể an toàn trả về `0`.

Bây giờ, chúng ta sẽ xem xét trường hợp có một số replica đang kết nối. Mỗi replica đều đã hoàn thành quá trình bắt tay và nhận file RDB rỗng. Nhưng vì chưa có lệnh ghi nào được gửi đi, nên replication offset của chúng vẫn là `0`.

Trong tình huống này, master sẽ trả về số lượng replica đang kết nối, vì master biết chắc chắn rằng tất cả các replica đều đang đồng bộ tại offset `0`:

```bash
$ redis-cli WAIT 3 500
(integer) 7
$ redis-cli WAIT 7 500
(integer) 7
$ redis-cli WAIT 9 500
(integer) 7
```

Trong ví dụ trên, có `7` replica đang kết nối. Cho dù client yêu cầu bao nhiêu replica đi nữa, master cũng sẽ trả về số lượng replica hiện đang kết nối (`7`).

Đối với giai đoạn này, bạn có thể bỏ qua cả hai đối số (`<numreplicas> <timeout>`) và chỉ cần trả về số lượng replica hiện đang kết nối.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình của bạn với tư cách là master như sau:

```bash
./your_program.sh
```

Sau đó tester sẽ khởi chạy **nhiều** replica kết nối tới server của bạn. Mỗi replica sẽ hoàn tất quy trình bắt tay và chờ nhận file RDB rỗng.

Tiếp theo tester sẽ kết nối tới master với vai trò là client và gửi các lệnh như sau:

```bash
$ redis-cli WAIT 3 500 # (kỳ vọng nhận lại 7)
$ redis-cli WAIT 7 500 # (kỳ vọng nhận lại 7)
$ redis-cli WAIT 9 500 # (kỳ vọng nhận lại 7)
```

Phản hồi cho mỗi câu lệnh này phải được mã hóa dưới dạng số nguyên RESP Integer (ví dụ: `:7\r\n`).

### 💡 Lưu ý Quan trọng

- Ngay cả khi `WAIT` được gọi với một con số nhỏ hơn số lượng replica đang kết nối, master vẫn phải trả về tổng số lượng replica đang kết nối.
- Số lượng replica được tạo trong giai đoạn này sẽ là ngẫu nhiên, vì vậy bạn không thể hardcode giá trị `7` như trong ví dụ trên.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `WAIT with 0 pending writes` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli WAIT with 0 pending writes
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
- [Tài liệu chính thức về lệnh `WAIT with 0 pending writes` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
