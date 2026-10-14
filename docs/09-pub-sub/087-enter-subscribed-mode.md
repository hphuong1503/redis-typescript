# Challenge 087: Chuyển kết nối sang Subscribed Mode (chỉ cho phép các lệnh Pub/Sub) (Enter subscribed mode)

[⬅️ **Thử thách trước**: [086. Đăng ký đồng thời nhiều kênh trong một câu lệnh SUBSCRIBE duy nhất](../09-pub-sub/086-subscribe-to-multiple-channels.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [088. Xử lý lệnh PING đặc biệt khi client đang ở trong chế độ Subscribed Mode](../09-pub-sub/088-ping-in-subscribed-mode.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 087 / 124** |
| **Mã định danh (Slug)** | `aw8` |
| **Tên tiếng Anh (Official Name)** | `Enter subscribed mode` |
| **Phân loại Module** | 📢 **Xuất bản & Đăng ký tin (Pub/Sub)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `Subscribed mode restriction` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Chuyển kết nối sang Subscribed Mode (chỉ cho phép các lệnh Pub/Sub)**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Enter subscribed mode`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng đánh dấu client chuyển sang chế độ đăng ký nhận tin (Subscribed mode).

### 📖 Chế độ Subscribed Mode

Sau khi gửi một lệnh đăng ký, client sẽ chuyển sang trạng thái "Subscribed mode". Trong chế độ này, client chỉ được phép thực thi một tập hợp các lệnh giới hạn sau:

- `SUBSCRIBE`
- `UNSUBSCRIBE`
- `PSUBSCRIBE`
- `PUNSUBSCRIBE`
- `PING`
- `QUIT`

Server sẽ từ chối bất kỳ lệnh nào khác và phản hồi về một thông báo lỗi, ví dụ:

```
$ redis-cli
> SUBSCRIBE channel
1) "subscribe"
2) "channel"
3) (integer) 1

(subscribed mode)> ECHO hey
(error) ERR Can't execute 'echo': only (P|S)SUBSCRIBE / (P|S)UNSUBSCRIBE / PING / QUIT / RESET are allowed in this context
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi lệnh `SUBSCRIBE` tới server để client chuyển sang Subscribed mode:

```bash
$ redis-cli
> SUBSCRIBE foo
# Kỳ vọng phản hồi ["subscribe", "foo", 1]
```

Tester sau đó sẽ gửi một chuỗi các câu lệnh, bao gồm cả những lệnh được phép và không được phép trong chế độ subscribed mode.

Đối với các lệnh không được phép (như `SET`, `GET` và `ECHO`), tester sẽ xác minh rằng server của bạn trả về lỗi như sau:

```
> SET key value
- ERR Can't execute 'set': only (P|S)SUBSCRIBE / (P|S)UNSUBSCRIBE / PING / QUIT / RESET are allowed in this context 
```

Tester chỉ kiểm tra xem thông báo lỗi có bắt đầu bằng `"ERR Can't execute '<command_name>'"` hay không, vì vậy bạn có thể tùy biến linh hoạt chuỗi lỗi mà không cần phải khớp chính xác 100% từng từ như Redis gốc.

Đối với lệnh `SUBSCRIBE`, tester sẽ kiểm tra phản hồi nhận được vẫn theo định dạng mảng thông thường.
```bash
> SUBSCRIBE bar
# Kỳ vọng phản hồi mảng chuẩn RESP: ["subscribe", "bar", 2]
```

### 💡 Lưu ý Quan trọng

- Đối với các lệnh không hợp lệ, tester kiểm tra khá nới lỏng nên bạn không bắt buộc phải tuân thủ chuẩn xác tuyệt đối từng ký tự của Redis gốc. Định dạng bắt buộc mà tester kiểm tra là bắt đầu bằng `ERR Can't execute '<command>'` (không phân biệt hoa thường). Các ví dụ về chuỗi lỗi hợp lệ:
    - `ERR Can't execute 'set' in subscribed mode`
    - `ERR can't execute 'SET' when one or more subscriptions exist`

- Trong chế độ subscribed mode, lệnh `PING` có phản hồi khác biệt so với thông thường (không trả về `+PONG\r\n`). Chúng ta sẽ xử lý chi tiết trường hợp này ở thử thách tiếp theo.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Subscribed mode restriction` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Subscribed mode restriction
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
- [Tài liệu chính thức về lệnh `Subscribed mode restriction` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
