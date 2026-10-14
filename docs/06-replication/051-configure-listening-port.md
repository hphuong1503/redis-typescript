# Challenge 051: Hỗ trợ tham số dòng lệnh --port để chạy server trên cổng tùy chỉnh (Configure listening port)

[⬅️ **Thử thách trước**: [050. Tự động xóa danh sách theo dõi của kết nối khi gọi DISCARD](../05-optimistic-locking/050-unwatch-on-discard.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [052. Phản hồi lệnh INFO replication với vai trò mặc định role:master](../06-replication/052-the-info-command.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 051 / 124** |
| **Mã định danh (Slug)** | `bw1` |
| **Tên tiếng Anh (Official Name)** | `Configure listening port` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `--port <port>` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Hỗ trợ tham số dòng lệnh --port để chạy server trên cổng tùy chỉnh**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Configure listening port`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ khởi động Redis server trên một cổng (port) tùy chọn.

### Mô hình nhân bản Leader-Follower (Leader-Follower Replication)

Mô hình [nhân bản leader-follower](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/) là một kiến trúc trong đó một server đóng vai trò chính ("master") xử lý toàn bộ các thao tác ghi, và một hoặc nhiều server đóng vai trò phụ ("replicas") duy trì các bản sao dữ liệu của master. Khi master thay đổi dữ liệu, nó sẽ tự động sao chép những thay đổi đó sang các replica. Hệ thống này cung cấp khả năng dự phòng dữ liệu và nâng cao hiệu năng đọc.

### Hỗ trợ cổng tùy chỉnh (Custom Port Support)

Vì cơ chế nhân bản yêu cầu chạy đồng thời nhiều phiên bản Redis server, nên mỗi instance cần một cổng riêng biệt. Điều này có nghĩa là một Redis server phải có khả năng khởi động trên một cổng khác thay vì cổng mặc định `6379`.

Cờ `--port` truyền số hiệu cổng vào cho Redis server:

```bash
./your_program.sh --port <port_number>
```

Server sẽ phân tích cú pháp tham số này và khởi chạy một TCP server trên cổng được chỉ định.

Nếu bạn không truyền cờ `--port`, Redis server sẽ mặc định lắng nghe trên cổng `6379`.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh --port 6380
```

Sau đó tester sẽ thử kết nối tới TCP server của bạn trên số hiệu cổng được chỉ định. Nếu kết nối thành công, bạn sẽ vượt qua giai đoạn này.

### 💡 Lưu ý Quan trọng

- Tester sẽ truyền một số hiệu cổng ngẫu nhiên vào chương trình của bạn, vì vậy bạn không thể hardcode số hiệu cổng từ ví dụ trên.
- Nếu repository của bạn được khởi tạo trước ngày 05/10/2023, có thể script `./your_program.sh` chưa truyền các đối số dòng lệnh vào chương trình. Bạn cần chỉnh sửa `./your_program.sh` để khắc phục điều này, hãy xem chi tiết tại [Pull Request này](https://github.com/codecrafters-io/build-your-own-redis/pull/89/files).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `--port <port>` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli --port <port>
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
- [Tài liệu chính thức về cấu hình cổng port trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách Redis trên CodeCrafters](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
