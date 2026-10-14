# Challenge 089: Cài đặt lệnh PUBLISH gửi tin nhắn tới kênh và trả về số client nhận (Publish a message)

[⬅️ **Thử thách trước**: [088. Xử lý lệnh PING đặc biệt khi client đang ở trong chế độ Subscribed Mode](../09-pub-sub/088-ping-in-subscribed-mode.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [090. Chuyển phát tin nhắn tức thì tới tất cả socket client đã đăng ký kênh đó](../09-pub-sub/090-deliver-messages.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 089 / 124** |
| **Mã định danh (Slug)** | `hf2` |
| **Tên tiếng Anh (Official Name)** | `Publish a message` |
| **Phân loại Module** | 📢 **Xuất bản & Đăng ký tin (Pub/Sub)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `PUBLISH channel message` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Cài đặt lệnh PUBLISH gửi tin nhắn tới kênh và trả về số client nhận**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Publish a message`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng hỗ trợ cho lệnh `PUBLISH`.

### 📖 Lệnh `PUBLISH`

[Lệnh `PUBLISH`](https://redis.io/docs/latest/commands/publish/) dùng để phát một thông điệp (message) đến tất cả các client đang đăng ký kênh chỉ định.

```
> PUBLISH channel_name message_contents
(integer) 3
```

Phản hồi của câu lệnh là số lượng client hiện đang đăng ký kênh đó (dưới dạng RESP Integer).

Trong giai đoạn này, bạn chỉ cần triển khai phản hồi số lượng subscriber nhận được lệnh `PUBLISH`. Bạn chưa cần phải chuyển tiếp (deliver) thông điệp đến các client — việc này sẽ được xử lý ở thử thách tiếp theo.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tester sau đó sẽ tạo nhiều client lắng nghe trên nhiều kênh khác nhau:

```bash
# Client 1 đăng ký kênh "foo"
$ redis-cli
> SUBSCRIBE foo

# Client 2 đăng ký kênh "bar"
$ redis-cli
> SUBSCRIBE bar

# Client 3 đăng ký kênh "bar"
$ redis-cli
> SUBSCRIBE bar
```

Tiếp theo, tester sẽ phát thông điệp đến các kênh khác nhau bằng lệnh `PUBLISH` và kiểm tra xem giá trị trả về có khớp với số lượng client đã đăng ký kênh đó hay không:

```
$ redis-cli PUBLISH bar "msg"
(integer) 2
```

Trong ví dụ trên, kết quả kỳ vọng là 2 (mã hóa dưới dạng RESP Integer `:2\r\n`) vì có 2 client đang đăng ký kênh `bar`.

Tương tự cho kênh `foo`:

```
$ redis-cli PUBLISH foo "msg"
(integer) 1
```

Tester kỳ vọng kết quả trả về là 1 (mã hóa dưới dạng RESP Integer `:1\r\n`) vì chỉ có 1 client đăng ký kênh này.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `PUBLISH channel message` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli PUBLISH channel message
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
- [Tài liệu chính thức về lệnh `PUBLISH channel message` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
