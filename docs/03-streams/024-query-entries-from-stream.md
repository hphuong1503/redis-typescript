# Challenge 024: Truy vấn danh sách entry trong stream bằng lệnh XRANGE (Query entries from stream)

[⬅️ **Thử thách trước**: [023. Tự động sinh toàn bộ Entry ID khi client truyền ký tự '*'](../03-streams/023-fully-auto-generated-ids.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [025. Sử dụng mốc '-' đại diện cho ID nhỏ nhất trong XRANGE](../03-streams/025-query-with-minus.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 024 / 124** |
| **Mã định danh (Slug)** | `zx1` |
| **Tên tiếng Anh (Official Name)** | `Query entries from stream` |
| **Phân loại Module** | 🌊 **Luồng sự kiện (Streams)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `XRANGE key start end` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Truy vấn danh sách entry trong stream bằng lệnh XRANGE**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Query entries from stream`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ truy vấn dữ liệu từ một stream bằng lệnh `XRANGE`.

### Lệnh `XRANGE`

Lệnh [`XRANGE`](https://redis.io/docs/latest/commands/xrange/) truy xuất một dải các bản ghi từ một stream.

Lệnh nhận hai đối số: ID bắt đầu `start` và ID kết thúc `end`, và trả về tất cả các bản ghi nằm trong phạm vi đó. Dải tìm kiếm mang tính bao gồm (inclusive), nghĩa là các bản ghi có ID bằng chính xác `start` hoặc `end` cũng sẽ được lấy ra.

Dưới đây là ví dụ minh họa cách hoạt động:

```bash
$ redis-cli XADD some_key 1526985054069-0 temperature 36 humidity 95
"1526985054069-0" # (ID của bản ghi đầu tiên được thêm)
$ redis-cli XADD some_key 1526985054079-0 temperature 37 humidity 94
"1526985054079-0"
$ redis-cli XRANGE some_key 1526985054069 1526985054079
1) 1) 1526985054069-0
   2) 1) temperature
      2) 36
      3) humidity
      4) 95
2) 1) 1526985054079-0
   2) 1) temperature
      2) 37
      3) humidity
      4) 94
```

Lệnh có thể nhận ID theo định dạng `<millisecondsTime>-<sequenceNumber>`, tuy nhiên phần số thứ tự sequence number là tùy chọn. Nếu bạn không cung cấp sequence number:

- Đối với ID `start`, sequence number mặc định là `0`.
- Đối với ID `end`, sequence number mặc định là sequence number lớn nhất có thể.

Giá trị trả về của lệnh trong giao thức thực tế không hoàn toàn giống định dạng hiển thị ở trên (định dạng trên đã được redis-cli làm đẹp).

Giá trị phản hồi thực tế là một [mảng RESP (RESP Array)](https://redis.io/docs/latest/develop/reference/protocol-spec/#arrays) chứa các mảng con.

Mỗi mảng con đại diện cho một bản ghi duy nhất và chứa hai phần tử:

- ID của bản ghi (dưới dạng một [Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings)).
- Một mảng các cặp khóa-giá trị (dưới dạng các Bulk String) theo đúng thứ tự lúc chúng được thêm vào.

Giá trị trả về trong ví dụ trên thực chất có cấu trúc dạng JSON như sau:

```json
[
  [
    "1526985054069-0",
    [
      "temperature",
      "36",
      "humidity",
      "95"
    ]
  ],
  [
    "1526985054079-0",
    [
      "temperature",
      "37",
      "humidity",
      "94"
    ]
  ]
]
```

Khi được mã hóa dưới dạng mảng RESP, chuỗi byte gửi qua mạng sẽ như sau:

```text
*2\r\n
*2\r\n
$15\r\n1526985054069-0\r\n
*4\r\n
$11\r\ntemperature\r\n
$2\r\n36\r\n
$8\r\nhumidity\r\n
$2\r\n95\r\n
*2\r\n
$15\r\n1526985054079-0\r\n
*4\r\n
$11\r\ntemperature\r\n
$2\r\n37\r\n
$8\r\nhumidity\r\n
$2\r\n94\r\n
```
*(Phản hồi này được ngắt dòng để bạn đọc dễ hình dung. Phản hồi thực tế qua socket không chứa các ký tự xuống dòng thừa.)*

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ thêm một vài bản ghi vào một stream:

```bash
$ redis-cli XADD stream_key 0-1 foo bar
"0-1"
$ redis-cli XADD stream_key 0-2 bar baz
"0-2"
$ redis-cli XADD stream_key 0-3 baz foo
"0-3"
```

Tiếp theo, tester sẽ gửi một lệnh `XRANGE` tới server của bạn:

```bash
$ redis-cli XRANGE stream_key 0-2 0-3
```

Server của bạn phải phản hồi với một mảng RESP chứa dải các bản ghi nằm trong phạm vi các ID đã chỉ định.

Dựa trên ví dụ trên, phản hồi trả về sẽ có cấu trúc như sau (được mã hóa dưới dạng mảng RESP):

```json
[
  [
    "0-2",
    [
      "bar",
      "baz"
    ]
  ],
  [
    "0-3",
    [
      "baz",
      "foo"
    ]
  ]
]
```

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `XRANGE key start end` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli XRANGE key start end
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

// Khối xử lý cho lệnh XRANGE key start end:
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
- [Tài liệu chính thức về lệnh `XRANGE key start end` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
