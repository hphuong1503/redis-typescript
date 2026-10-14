# Challenge 090: Chuyển phát tin nhắn tức thì tới tất cả socket client đã đăng ký kênh đó (Deliver messages)

[⬅️ **Thử thách trước**: [089. Cài đặt lệnh PUBLISH gửi tin nhắn tới kênh và trả về số client nhận](../09-pub-sub/089-publish-a-message.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [091. Hủy đăng ký kênh bằng UNSUBSCRIBE và thoát chế độ Subscribed Mode](../09-pub-sub/091-unsubscribe.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 090 / 124** |
| **Mã định danh (Slug)** | `dn4` |
| **Tên tiếng Anh (Official Name)** | `Deliver messages` |
| **Phân loại Module** | 📢 **Xuất bản & Đăng ký tin (Pub/Sub)** |
| **Độ khó (Difficulty)** | `Khó` |
| **Lệnh Redis liên quan** | `Broadcast to subscribers` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Chuyển phát tin nhắn tức thì tới tất cả socket client đã đăng ký kênh đó**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Deliver messages`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong giai đoạn này, bạn sẽ bổ sung tính năng chuyển tiếp thông điệp đã xuất bản (PUBLISH) đến các client đã đăng ký kênh.

### 📖 Cơ chế chuyển tiếp thông điệp (Delivering messages)

Khi một client thực thi lệnh `PUBLISH`, thông điệp sẽ được "chuyển phát" đến tất cả các client hiện đang đăng ký kênh tương ứng.

Ví dụ: nếu một client đã đăng ký kênh `channel_1` và thông điệp `"hello"` được gửi tới kênh này, client đó sẽ nhận được dữ liệu như sau:

```bash
$ redis-cli
> SUBSCRIBE channel_1
1) "subscribe"
2) "channel_1"
3) (integer) 1

# (client hiện đang ở chế độ subscribed mode)

# Khi có thông điệp được xuất bản, client nhận được mảng sau:
1) "message"
2) "channel_1"
3) "hello"
```

Mỗi client đã đăng ký kênh sẽ nhận được một mảng RESP gồm 3 phần tử:

1. `"message"` (dưới dạng RESP Bulk String)
2. Tên kênh nhận tin (dưới dạng RESP Bulk String)
3. Nội dung thông điệp (dưới dạng RESP Bulk String)

Trong trường hợp này, mỗi client theo dõi kênh sẽ nhận được `["message", "channel_1", "hello"]`, được mã hóa RESP như sau:

```
*3\r\n
$7\r\n
message\r\n
$9\r\n
channel_1\r\n
$5\r\n
hello\r\n
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tester sau đó sẽ tạo nhiều client lắng nghe trên nhiều kênh:

```bash
# Client 1 đăng ký kênh foo
$ redis-cli
> SUBSCRIBE foo

# Client 2 đăng ký kênh foo
$ redis-cli
> SUBSCRIBE foo

# Client 3 đăng ký kênh bar
$ redis-cli
> SUBSCRIBE bar
```

Tester tiếp tục khởi tạo một client riêng biệt và gửi các lệnh `PUBLISH` đến các kênh ngẫu nhiên:

```bash
$ redis-cli
> PUBLISH foo "hello"
2
> PUBLISH bar "world"
1
```

Tester sẽ kiểm tra xem câu lệnh `PUBLISH` có trả về đúng số lượng client đang đăng ký kênh hay không.

Đối với mỗi client, tester cũng sẽ kiểm tra và xác nhận client nhận được đúng thông điệp nếu đang đăng ký kênh. Tester sẽ xác thực rằng mỗi subscriber nhận được mảng có cấu trúc: `["message", "foo", "hello"]`. Dưới dạng mã hóa RESP:

```
*3\r\n
$7\r\n
message\r\n
$3\r\n
foo\r\n
$5\r\n
hello\r\n
```

Nếu một client không đăng ký kênh đó, tester sẽ xác thực rằng client đó tuyệt đối không nhận được thông điệp gửi tới kênh.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Broadcast to subscribers` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Broadcast to subscribers
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
- [Tài liệu chính thức về lệnh `Broadcast to subscribers` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
