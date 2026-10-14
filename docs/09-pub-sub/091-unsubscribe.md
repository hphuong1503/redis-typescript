# Challenge 091: Hủy đăng ký kênh bằng UNSUBSCRIBE và thoát chế độ Subscribed Mode (Unsubscribe)

[⬅️ **Thử thách trước**: [090. Chuyển phát tin nhắn tức thì tới tất cả socket client đã đăng ký kênh đó](../09-pub-sub/090-deliver-messages.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [092. Khởi tạo Sorted Set mới bằng lệnh ZADD](../10-sorted-sets/092-create-a-sorted-set.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 091 / 124** |
| **Mã định danh (Slug)** | `ze9` |
| **Tên tiếng Anh (Official Name)** | `Unsubscribe` |
| **Phân loại Module** | 📢 **Xuất bản & Đăng ký tin (Pub/Sub)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `UNSUBSCRIBE [channel]` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Hủy đăng ký kênh bằng UNSUBSCRIBE và thoát chế độ Subscribed Mode**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Unsubscribe`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng hỗ trợ cho lệnh `UNSUBSCRIBE`, dùng để hủy đăng ký nhận tin từ một hoặc nhiều kênh.

### 📖 Lệnh `UNSUBSCRIBE`

Lệnh này xóa client khỏi danh sách theo dõi của một hoặc nhiều kênh. Ví dụ sử dụng:

```bash
$ redis-cli
> SUBSCRIBE foo
1) "subscribe"
2) "foo"
3) (integer) 1
(subscribed mode)> SUBSCRIBE bar
1) "subscribe"
2) "bar"
3) (integer) 2
(subscribed mode)> UNSUBSCRIBE foo
1) "unsubscribe"
2) "foo"
3) (integer) 1
(subscribed mode)> UNSUBSCRIBE bar
1) "unsubscribe"
2) "bar"
3) (integer) 0
```

Khi hủy đăng ký thành công, server phản hồi một RESP Array gồm 3 phần tử:

1. `"unsubscribe"` (dưới dạng RESP Bulk String)
2. Tên kênh bị hủy đăng ký (dưới dạng RESP Bulk String)
3. Số lượng kênh còn lại mà client này đang tiếp tục đăng ký (dưới dạng RESP Integer)

Khi hủy đăng ký một kênh mà client chưa từng đăng ký trước đó, server vẫn trả về mảng 3 phần tử nhưng số lượng kênh còn lại không thay đổi. Ví dụ:

```bash
$ redis-cli
> subscribe foo
1) "subscribe"
2) "foo"
3) (integer) 1

(subscribed mode)> unsubscribe bar
1) "unsubscribe"
2) "bar"
3) (integer) 1
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ tạo nhiều client cùng lắng nghe trên các kênh khác nhau:

```bash
# Client 1 đăng ký kênh 'foo' và 'baz'
$ redis-cli
> SUBSCRIBE foo
> SUBSCRIBE baz

# Client 2 đăng ký kênh 'foo' và 'bar'
$ redis-cli
> SUBSCRIBE foo
> SUBSCRIBE bar
```

Tiếp theo, tester sẽ khởi tạo một client riêng biệt để phát thông điệp tới các kênh ngẫu nhiên:

```bash
$ redis-cli
> PUBLISH foo "before-unsubscribe"
```

Tester xác thực rằng chỉ các client đang đăng ký kênh mới nhận được tin nhắn, còn các client khác thì không.

Sau đó, tester sẽ gửi các lệnh `UNSUBSCRIBE` ngẫu nhiên tới các subscriber:

```bash
# Trên Client 1, vốn đang đăng ký 'foo' và 'baz'
> UNSUBSCRIBE foo
# Kỳ vọng nhận được mảng RESP: ["unsubscribe", "foo", 1]
```

Cuối cùng, tester sẽ xuất bản lại thông điệp tới các kênh ngẫu nhiên:

```bash
> PUBLISH foo "after-unsubscribe"
```

Tester sẽ xác minh rằng các client đã hủy đăng ký kênh sẽ không còn nhận được tin nhắn, trong khi các client vẫn duy trì đăng ký vẫn nhận tin bình thường.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `UNSUBSCRIBE [channel]` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli UNSUBSCRIBE [channel]
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
- [Tài liệu chính thức về lệnh `UNSUBSCRIBE [channel]` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
