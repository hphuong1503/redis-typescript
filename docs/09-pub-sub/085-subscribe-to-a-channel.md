# Challenge 085: Đăng ký nhận tin từ một kênh cụ thể bằng lệnh SUBSCRIBE (Subscribe to a channel)

[⬅️ **Thử thách trước**: [084. Đọc và phát lại toàn bộ lịch sử lệnh trong file AOF để tái thiết lập bộ nhớ](../08-persistence-aof/084-replay-multiple-commands.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [086. Đăng ký đồng thời nhiều kênh trong một câu lệnh SUBSCRIBE duy nhất](../09-pub-sub/086-subscribe-to-multiple-channels.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 085 / 124** |
| **Mã định danh (Slug)** | `mx3` |
| **Tên tiếng Anh (Official Name)** | `Subscribe to a channel` |
| **Phân loại Module** | 📢 **Xuất bản & Đăng ký tin (Pub/Sub)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `SUBSCRIBE channel` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Đăng ký nhận tin từ một kênh cụ thể bằng lệnh SUBSCRIBE**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Subscribe to a channel`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng hỗ trợ cho lệnh `SUBSCRIBE`.

### 📖 Lệnh `SUBSCRIBE`

[Lệnh `SUBSCRIBE`](https://redis.io/docs/latest/commands/subscribe/) đăng ký client hiện tại thành người nhận tin (subscriber) của một kênh (channel) chỉ định.

Ví dụ sử dụng:

```bash
$ redis-cli
> SUBSCRIBE mychan
1) "subscribe"
2) "mychan"
3) (integer) 1
Reading messages... (press Ctrl-C to quit or any key to type command)
```

Phản hồi trả về là một RESP Array chứa ba phần tử:

1. `"subscribe"` (dưới dạng RESP Bulk String)
2. Tên kênh được đăng ký (dưới dạng RESP Bulk String)
3. Số lượng kênh mà client này đã đăng ký tính đến thời điểm hiện tại (dưới dạng RESP Integer)

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi một lệnh `SUBSCRIBE` kèm theo tên kênh:

```bash
$ redis-cli SUBSCRIBE foo
```

Tester kỳ vọng phản hồi nhận được là mảng `["subscribe", "foo", 1]`, được mã hóa theo chuẩn RESP như sau:

```
*3\r\n
$9\r\n
subscribe\r\n
$3\r\n
foo\r\n
:1\r\n
```

### 💡 Lưu ý Quan trọng

- Trong thử thách này, bạn chỉ cần xử lý lệnh `SUBSCRIBE` được gửi một lần duy nhất từ một client đơn lẻ. Việc xử lý nhiều lệnh `SUBSCRIBE` đồng thời hoặc từ nhiều client sẽ được triển khai trong các giai đoạn tiếp theo.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `SUBSCRIBE channel` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli SUBSCRIBE channel
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
// Danh sách subscriber cho từng channel
const channels = new Map<string, Set<net.Socket>>();
const socketChannels = new WeakMap<net.Socket, Set<string>>();

// Xử lý SUBSCRIBE channel:
// Đưa socket vào channels.get(channel)
// Trả về RESP Array: ["subscribe", channel, totalChannelsSubscribed]

// Xử lý PUBLISH channel message:
// Lấy danh sách socket trong channels.get(channel)
// Với mỗi socket: ghi bản tin ["message", channel, message]
// Phản hồi lại cho publisher: :<count>\r\n
```

---

## ⚠️ 5. Lưu ý & Bẫy thường gặp (Common Pitfalls & Tips)

1. **Ký tự ngắt dòng CRLF**: Mọi phản hồi trong RESP bắt buộc phải kết thúc bằng đúng 2 byte `\r\n` (`\x0D\x0A`). Thiếu `\r` hoặc chỉ gửi `\n` sẽ khiến tester bị treo timeout vì chờ đủ dữ liệu.
2. **Không phân biệt chữ hoa/thường**: Tên lệnh Redis hoàn toàn không phân biệt hoa thường (`ping`, `PING`, `PiNg` đều hợp lệ). Luôn chuẩn hóa bằng `.toUpperCase()` trước khi so sánh.
3. **Độ dài chuỗi tính bằng Byte, không phải Ký tự**: Khi định dạng Bulk String `$len\r\n...`, `len` là số byte nhị phân (`Buffer.byteLength(str)`), không phải `str.length` (đặc biệt quan trọng với chuỗi UTF-8 hoặc dữ liệu nhị phân).
4. **Quản lý đa kết nối đồng thời**: Tránh lưu trữ trạng thái riêng của client (như cờ transaction, subscription, authenticated) vào biến toàn cục. Hãy gán vào đối tượng socket hoặc sử dụng `WeakMap<net.Socket, State>`.

---

## 📚 6. Tài liệu tham khảo chính thức

- [Redis Protocol Specification (RESP2/RESP3)](https://redis.io/docs/latest/develop/reference/protocol-spec/)
- [Tài liệu chính thức về lệnh `SUBSCRIBE channel` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
