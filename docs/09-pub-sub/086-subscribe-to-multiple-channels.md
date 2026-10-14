# Challenge 086: Đăng ký đồng thời nhiều kênh trong một câu lệnh SUBSCRIBE duy nhất (Subscribe to multiple channels)

[⬅️ **Thử thách trước**: [085. Đăng ký nhận tin từ một kênh cụ thể bằng lệnh SUBSCRIBE](../09-pub-sub/085-subscribe-to-a-channel.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [087. Chuyển kết nối sang Subscribed Mode (chỉ cho phép các lệnh Pub/Sub)](../09-pub-sub/087-enter-subscribed-mode.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 086 / 124** |
| **Mã định danh (Slug)** | `zc8` |
| **Tên tiếng Anh (Official Name)** | `Subscribe to multiple channels` |
| **Phân loại Module** | 📢 **Xuất bản & Đăng ký tin (Pub/Sub)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `SUBSCRIBE ch1 ch2...` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Đăng ký đồng thời nhiều kênh trong một câu lệnh SUBSCRIBE duy nhất**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Subscribe to multiple channels`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng hỗ trợ đăng ký nhận tin từ nhiều kênh bằng lệnh `SUBSCRIBE`.

### 📖 Đăng ký nhiều kênh với lệnh `SUBSCRIBE`

Một client có thể gửi lệnh `SUBSCRIBE` nhiều lần để đăng ký các kênh khác nhau. Ví dụ:

```bash
$ redis-cli
> SUBSCRIBE channel_1
1) "subscribe"
2) "channel_1"
3) (integer) 1

(subscribed mode)> SUBSCRIBE channel_2
1) "subscribe"
2) "channel_2"
3) (integer) 2
```

Một client cũng có thể gửi đăng ký cùng một kênh nhiều lần, nhưng tổng số lượng kênh đã đăng ký (phần tử thứ 3 trong mảng phản hồi) sẽ không thay đổi.

Ví dụ:

```bash
$ redis-cli
> SUBSCRIBE channel_1
1) "subscribe"
2) "channel_1"
3) (integer) 1

# Số lượng kênh vẫn giữ nguyên là 1 vì kênh đã được đăng ký trước đó
(subscribed mode)> SUBSCRIBE channel_1
1) "subscribe"
2) "channel_1"
3) (integer) 1
```

Số lượng kênh đăng ký được tính riêng cho từng client (per-client), tức là tổng số kênh mà client hiện tại đang theo dõi.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tiếp theo, tester sẽ khởi tạo một client và gửi nhiều lệnh `SUBSCRIBE`, mỗi lần chỉ định một kênh mới:

```bash
$ redis-cli
> SUBSCRIBE foo
# Kỳ vọng phản hồi ["subscribe", "foo", 1]

> SUBSCRIBE bar
# Kỳ vọng phản hồi ["subscribe", "bar", 2]

> SUBSCRIBE bar
# Kỳ vọng phản hồi ["subscribe", "bar", 2]
```

Tester sẽ lặp lại thao tác này với các client khác và xác thực rằng số lượng kênh đã đăng ký được quản lý độc lập cho từng client.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `SUBSCRIBE ch1 ch2...` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli SUBSCRIBE ch1 ch2...
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
- [Tài liệu chính thức về lệnh `SUBSCRIBE ch1 ch2...` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
