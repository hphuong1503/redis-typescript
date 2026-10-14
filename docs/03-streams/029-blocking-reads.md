# Challenge 029: Chế độ đọc stream có chặn với tham số BLOCK <ms> trong XREAD (Blocking reads)

[⬅️ **Thử thách trước**: [028. Đọc đồng thời từ nhiều stream trong cùng một câu lệnh XREAD](../03-streams/028-query-multiple-streams-using-xread.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [030. Chờ vô thời hạn với XREAD BLOCK 0 cho đến khi có entry mới xuất hiện](../03-streams/030-blocking-reads-without-timeout.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 029 / 124** |
| **Mã định danh (Slug)** | `bs1` |
| **Tên tiếng Anh (Official Name)** | `Blocking reads` |
| **Phân loại Module** | 🌊 **Luồng sự kiện (Streams)** |
| **Độ khó (Difficulty)** | `Khó` |
| **Lệnh Redis liên quan** | `XREAD BLOCK <ms> STREAMS...` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Chế độ đọc stream có chặn với tham số BLOCK <ms> trong XREAD**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Blocking reads`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ mở rộng bộ xử lý `XREAD` để hỗ trợ cơ chế đọc chặn (blocking reads).

### Cơ chế chặn (Blocking) trong `XREAD`

Theo mặc định, lệnh `XREAD` hoạt động theo cơ chế đồng bộ: nó trả về dữ liệu ngay lập tức nếu có bản ghi thỏa mãn, hoặc trả về kết quả rỗng nếu không có dữ liệu mới.

Tuy nhiên, với tham số tùy chọn `BLOCK`, các client có thể yêu cầu server giữ kết nối và chờ đợi cho đến khi có dữ liệu mới đến.

Cú pháp lệnh có dạng:

```bash
XREAD BLOCK <milliseconds> STREAMS <key> <id>
```

Cơ chế hoạt động cụ thể như sau:
- Client gửi lệnh kèm thời gian chờ (timeout) tính bằng mili-giây.
- Nếu trong stream đã có sẵn các bản ghi có ID lớn hơn ID được chỉ định, lệnh sẽ trả về kết quả ngay lập tức.
- Nếu chưa có bản ghi mới nào, lệnh sẽ bị chặn (block) và chờ đợi.
- Nếu có một bản ghi mới được thêm vào stream trước khi hết thời gian timeout, lệnh sẽ ngay lập tức hủy chặn và trả về (các) bản ghi mới đó.
- Nếu hết thời gian timeout mà vẫn không có dữ liệu mới nào được thêm vào, server sẽ phản hồi một mảng rỗng đặc biệt (null array: `*-1\r\n`).

Ví dụ: xét hai client độc lập. Client thứ nhất gửi lệnh `XREAD` ở chế độ chặn:

```bash
$ redis-cli XREAD BLOCK 1000 streams some_key 1526985054069-0
```

Client này sẽ bị chặn và chờ đợi một bản ghi mới xuất hiện trong stream `some_key`.

Trong khi đó, client thứ hai thêm một bản ghi vào stream:

```bash
$ other-redis-cli XADD some_key 1526985054079-0 temperature 37 humidity 94
"1526985054079-0"
```

Nếu bản ghi được thêm vào trong vòng `1000` mili-giây, lệnh `XREAD` của client thứ nhất sẽ lập tức hủy chặn và phản hồi bản ghi mới:

```bash
1) 1) "some_key"
   2) 1) 1) 1526985054079-0
      2) 1) temperature
         2) 37
         3) humidity
         4) 94
```

Tuy nhiên, nếu không có bản ghi nào được thêm vào trước khi hết hạn timeout, lệnh sẽ kết thúc và trả về một null array:

```bash
(nil)
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ thêm một bản ghi vào stream:

```bash
$ redis-cli XADD stream_key 0-1 temperature 96
```

Tiếp theo, tester sẽ gửi lệnh `XREAD` tới server của bạn kèm tùy chọn `BLOCK`:

```bash
$ redis-cli XREAD BLOCK 1000 streams stream_key 0-1
```

Trên một kết nối redis-cli khác, tester sẽ thêm một bản ghi mới trong vòng `500` mili-giây:

```bash
$ redis-cli XADD stream_key 0-2 temperature 95
```

Server của bạn phải phản hồi cho client đầu tiên dữ liệu sau, được mã hóa dưới dạng mảng RESP:

```json
[
  [
    "stream_key",
    [
      [
        "0-2",
        [
          "temperature",
          "95"
        ]
      ]
    ]
  ]
]
```

Kế tiếp, tester sẽ gửi một lệnh `XREAD` chặn khác, nhưng lần này sẽ để toàn bộ thời gian timeout trôi qua hết mà không đẩy thêm dữ liệu:

```bash
$ redis-cli XREAD block 1000 streams stream_key 0-2
```

Trong trường hợp này, server của bạn phải phản hồi một [mảng Null Array](https://redis.io/docs/latest/develop/reference/protocol-spec/#null-arrays) (`*-1\r\n`).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `XREAD BLOCK <ms> STREAMS...` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli XREAD BLOCK <ms> STREAMS...
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
// Cấu trúc dữ liệu Stream Entry
interface StreamEntry {
  id: string; // "ms-seq"
  fields: [string, string][]; // Cặp key-value
}

const streamStore = new Map<string, StreamEntry[]>();

// Khối xử lý cho lệnh XREAD BLOCK <ms> STREAMS...:
function handleStreamCommand(socket: net.Socket, args: string[]) {
  const cmd = args[0].toUpperCase();
  if (cmd === "TYPE") {
    const key = args[1];
    if (streamStore.has(key)) {
      socket.write("+stream\r\n");
    } else if (store.has(key)) {
      socket.write("+string\r\n");
    } else {
      socket.write("+none\r\n");
    }
  } else if (cmd === "XADD") {
    // Cú pháp: XADD key [id | * | ms-*] field1 value1 field2 value2 ...
    // Xác thực tính tăng dần của timestamp và sequence number
  }
}
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
- [Tài liệu chính thức về lệnh `XREAD BLOCK <ms> STREAMS...` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
