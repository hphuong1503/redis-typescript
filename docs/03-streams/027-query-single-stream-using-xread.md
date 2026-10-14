# Challenge 027: Đọc các entry mới từ một stream duy nhất bằng lệnh XREAD (Query single stream using XREAD)

[⬅️ **Thử thách trước**: [026. Sử dụng mốc '+' đại diện cho ID lớn nhất trong XRANGE](../03-streams/026-query-with-plus.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [028. Đọc đồng thời từ nhiều stream trong cùng một câu lệnh XREAD](../03-streams/028-query-multiple-streams-using-xread.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 027 / 124** |
| **Mã định danh (Slug)** | `um0` |
| **Tên tiếng Anh (Official Name)** | `Query single stream using XREAD` |
| **Phân loại Module** | 🌊 **Luồng sự kiện (Streams)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `XREAD STREAMS k id` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Đọc các entry mới từ một stream duy nhất bằng lệnh XREAD**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Query single stream using XREAD`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung khả năng truy vấn một stream bằng lệnh `XREAD`.

### 📖 Lệnh `XREAD`

Lệnh [`XREAD`](https://redis.io/docs/latest/commands/xread/) được dùng để đọc dữ liệu từ một hoặc nhiều stream, bắt đầu từ sau một Entry ID chỉ định.

Khác với `XRANGE` đòi hỏi cả ID bắt đầu `start` và kết thúc `end`, `XREAD` chỉ nhận duy nhất một ID.

Một điểm khác biệt lớn nữa là `XREAD` mang tính loại trừ (exclusive). Điều này có nghĩa là lệnh chỉ lấy các bản ghi có ID lớn hơn nghiêm ngặt so với ID đã chỉ định (không bao gồm chính ID đó).

Cú pháp cơ bản của lệnh là:
```bash
XREAD STREAMS <key> <id>
```

Lệnh `XREAD` còn hỗ trợ các tham số tùy chọn khác, nhưng chúng ta chưa xử lý chúng ở giai đoạn này.

Dưới đây là ví dụ minh họa hành vi của lệnh:

```bash
$ redis-cli XADD some_key 1526985054069-0 temperature 36 humidity 95
"1526985054069-0"

$ redis-cli XADD some_key 1526985054079-0 temperature 37 humidity 94
"1526985054079-0"

$ redis-cli XREAD STREAMS some_key 1526985054069-0
1) 1) "some_key"
   2) 1) 1) 1526985054079-0
         2) 1) temperature
            2) 37
            3) humidity
            4) 94
```

Giá trị trả về là một mảng các stream, trong đó mỗi stream bao gồm:

- Tên khóa của stream (dưới dạng bulk string).
- Một mảng các bản ghi, trong đó mỗi bản ghi là một mảng gồm hai phần tử:
  - ID của bản ghi (dưới dạng bulk string).
  - Một mảng các cặp khóa-giá trị (dưới dạng các bulk string).

Phản hồi từ ví dụ trên có cấu trúc JSON như sau:

```json
[
  [
    "some_key",
    [
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
  ]
]
```

Khi được mã hóa dưới dạng mảng RESP, chuỗi byte sẽ như sau:

```text
*1\r\n
*2\r\n
$8\r\nsome_key\r\n
*1\r\n
*2\r\n
$15\r\n1526985054079-0\r\n
*4\r\n
$11\r\ntemperature\r\n
$2\r\n37\r\n
$8\r\nhumidity\r\n
$2\r\n94\r\n
```
(*Kết quả được hiển thị trên nhiều dòng để dễ đọc. Giá trị trả về thực tế qua mạng là một dòng liên tục.*)

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi lệnh `XADD` để thêm một bản ghi vào stream:

```bash
$ redis-cli XADD stream_key 0-1 temperature 96
```

Tiếp theo, tester sẽ gửi lệnh `XREAD` tới server của bạn:

```bash
$ redis-cli XREAD STREAMS stream_key 0-0
```

Server của bạn phải phản hồi với một mảng RESP chứa các bản ghi stream chính xác.

Từ ví dụ trên, phản hồi của bạn sẽ có cấu trúc như sau, được mã hóa dưới dạng mảng RESP:

```json
[
  [
    "stream_key",
    [
      [
        "0-1",
        [
          "temperature",
          "96"
        ]
      ]
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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `XREAD STREAMS k id` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli XREAD STREAMS k id
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

// Khối xử lý cho lệnh XREAD STREAMS k id:
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
- [Tài liệu chính thức về lệnh `XREAD STREAMS k id` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
