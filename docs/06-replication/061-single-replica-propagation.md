# Challenge 061: Master truyền bá (replicate) các lệnh ghi (write commands) tới 1 Replica (Single-replica propagation)

[⬅️ **Thử thách trước**: [060. Master gửi snapshot RDB rỗng dưới dạng Bulk String tới Replica](../06-replication/060-empty-rdb-transfer.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [062. Master truyền bá đồng thời các lệnh ghi tới nhiều Replica đang kết nối](../06-replication/062-multi-replica-propagation.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 061 / 124** |
| **Mã định danh (Slug)** | `zn8` |
| **Tên tiếng Anh (Official Name)** | `Single-replica propagation` |
| **Phân loại Module** | 🌐 **Nhân bản Master - Replica (Replication)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `Single replica propagation` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Master truyền bá (replicate) các lệnh ghi (write commands) tới 1 Replica**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Single-replica propagation`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ truyền bá (propagate) các lệnh ghi tới một replica duy nhất với tư cách là master server.

### Truyền bá lệnh (Command Propagation)

Sau khi quy trình bắt tay nhân bản hoàn tất và master đã gửi xong file RDB tới replica, master bắt đầu truyền bá các lệnh "ghi" (write commands) tới replica.

Lệnh ghi là các lệnh làm thay đổi tập dữ liệu của master, chẳng hạn như `SET` và `DEL`. Các lệnh đọc hoặc tiện ích như `PING`, `ECHO`, v.v. không được coi là lệnh ghi, do đó chúng sẽ không được truyền bá.

### Quy trình truyền bá lệnh (The Propagation Process)

Quá trình truyền bá lệnh diễn ra trực tiếp trên kết nối nhân bản (replication connection). Đây chính là kết nối socket TCP đã được thiết lập từ bước bắt tay ban đầu.

Các lệnh được truyền bá sẽ được gửi dưới dạng mảng RESP Array. Ví dụ: nếu master nhận được lệnh `SET foo bar` từ một client, nó sẽ gửi `*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n` tới replica qua kết nối nhân bản tương ứng.

Replica xử lý các lệnh nhận được từ kết nối này tương tự như cách nó xử lý lệnh nhận từ một client thông thường, nhưng có một điểm khác biệt then chốt: **replica không gửi phản hồi ngược lại cho master**. Replica chỉ âm thầm thực thi lệnh và cập nhật trạng thái nội bộ của mình.

Tương tự, master cũng không chờ đợi phản hồi từ replica khi truyền bá các lệnh. Nó chỉ việc gửi các lệnh đi ngay khi chúng xuất hiện.

Có một ngoại lệ duy nhất đối với quy tắc "không phản hồi" này: đó là lệnh `REPLCONF GETACK`. Chúng ta sẽ tìm hiểu về lệnh này ở các giai đoạn sau.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh --port <PORT>
```

Tester sẽ kết nối tới TCP server của bạn với vai trò là một replica và thực hiện toàn bộ chuỗi bắt tay đã nêu ở các giai đoạn trước.

Sau đó, tester sẽ chờ server của bạn gửi file RDB.

Khi đã nhận được file RDB, tester sẽ gửi một chuỗi các lệnh ghi tới server của bạn (thông qua một client Redis độc lập):

```bash
$ redis-cli SET foo 1
$ redis-cli SET bar 2
$ redis-cli SET baz 3
```

Tester sẽ xác minh rằng các lệnh này đã được truyền bá tới replica theo đúng thứ tự. Tester kỳ vọng các lệnh này:

- Được mã hóa dưới dạng mảng RESP Array.
- Được gửi trên chính kết nối đã dùng cho quy trình bắt tay (kết nối nhân bản).

### 💡 Lưu ý Quan trọng

- Mặc dù replica cung cấp `listening-port` trong quá trình bắt tay, giá trị đó chỉ được sử dụng cho [mục đích giám sát / ghi log](https://github.com/redis/redis/blob/90178712f6eccf1e5b61daa677c5c103114bda3a/src/replication.c#L107-L130), chứ không phải để truyền bá lệnh. Redis truyền bá lệnh qua chính kết nối TCP mà replica đã khởi tạo trong quá trình bắt tay.
- Một hệ thống hoàn chỉnh trong thực tế sẽ lưu tạm (buffer) các lệnh ghi để gửi cho replica sau khi nó tải xong file RDB. Tuy nhiên với thử thách này, bạn có thể giả định rằng replica luôn sẵn sàng nhận lệnh ngay sau khi nhận xong file RDB.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Single replica propagation` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Single replica propagation
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
