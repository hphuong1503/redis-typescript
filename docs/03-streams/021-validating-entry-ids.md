# Challenge 021: Xác thực quy tắc thứ tự tăng dần của Entry ID (milliseconds-sequence) (Validating entry IDs)

[⬅️ **Thử thách trước**: [020. Khởi tạo Stream và chèn entry đầu tiên bằng lệnh XADD](../03-streams/020-create-a-stream.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [022. Tự động sinh sequence number cho Entry ID dạng <ms>-*](../03-streams/022-partially-auto-generated-ids.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 021 / 124** |
| **Mã định danh (Slug)** | `hq8` |
| **Tên tiếng Anh (Official Name)** | `Validating entry IDs` |
| **Phân loại Module** | 🌊 **Luồng sự kiện (Streams)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `XADD ID validation` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Xác thực quy tắc thứ tự tăng dần của Entry ID (milliseconds-sequence)**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Validating entry IDs`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ xác thực (validate) các Entry ID truyền vào lệnh `XADD`.

### Định danh bản ghi (Entry ID)

Entry ID đóng vai trò cốt lõi trong việc duy trì thứ tự tuần tự của các bản ghi trong Redis Stream.

Mỗi ID bao gồm hai số nguyên phân tách nhau bởi dấu gạch nối: `<millisecondsTime>-<sequenceNumber>`.

Ví dụ:

```yaml
entries:
  - id: 1526985054069-0 # (ID của bản ghi đầu tiên)
    temperature: 36
    humidity: 95

  - id: 1526985054079-0 # (ID của bản ghi thứ hai)
    temperature: 37
    humidity: 94

  # ... (và cứ tiếp tục như vậy)
```

Các ID này là duy nhất trong một stream và được đảm bảo luôn tăng dần. Điều này có nghĩa là ID của một bản ghi mới phải luôn lớn hơn ID của bất kỳ bản ghi nào trước đó.

### Chỉ định Entry ID trong `XADD`

Bạn có thể sử dụng ba định dạng khác nhau để chỉ định ID cho lệnh `XADD`:

- Tường minh hoàn toàn (`1526919030474-0`)
- Tự động sinh số thứ tự sequence number (`1526919030474-*`)
- Tự động sinh cả thời gian và sequence number (`*`)

Trong giai đoạn này, bạn chỉ cần xử lý trường hợp ID tường minh (ví dụ: `1526919030474-0`). Bạn sẽ bổ sung hỗ trợ cho hai trường hợp còn lại ở các giai đoạn sau.

Hàm xử lý `XADD` của bạn phải kiểm tra tính hợp lệ của ID dựa trên các quy tắc sau:

- ID mới phải lớn hơn một cách nghiêm ngặt so với ID của bản ghi cuối cùng trong stream:
  - Phần `millisecondsTime` của ID mới phải lớn hơn hoặc bằng `millisecondsTime` của bản ghi cuối cùng.
  - Nếu `millisecondsTime` bằng nhau, phần `sequenceNumber` của ID mới bắt buộc phải lớn hơn `sequenceNumber` của bản ghi cuối cùng.
- Nếu stream đang rỗng, ID phải lớn hơn `0-0`. ID hợp lệ nhỏ nhất mà Redis chấp nhận là `0-1`.

Dưới đây là ví dụ về việc thêm một bản ghi với ID hợp lệ, theo sau bởi một ID không hợp lệ:

```bash
$ redis-cli XADD some_key 1-1 foo bar
"1-1"
$ redis-cli XADD some_key 1-1 bar baz
(error) ERR The ID specified in XADD is equal or smaller than the target stream top item
```

Lệnh thứ hai thất bại vì `1-1` không lớn hơn nghiêm ngặt so với ID cuối cùng hiện tại.

Dưới đây là một ví dụ khác:

```bash
$ redis-cli XADD some_key 1-1 foo bar
"1-1"
$ redis-cli XADD some_key 0-2 bar baz
(error) ERR The ID specified in XADD is equal or smaller than the target stream top item
```

ID `0-2` không hợp lệ vì phần `millisecondsTime` nhỏ hơn `millisecondsTime` của bản ghi cuối cùng.

Cuối cùng, việc truyền `0-0` luôn luôn không hợp lệ, vì mọi ID đều phải lớn hơn `0-0`:

```bash
$ redis-cli XADD some_key 0-0 bar baz
(error) ERR The ID specified in XADD must be greater than 0-0
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ tạo một vài bản ghi bằng lệnh `XADD`:

```bash
$ redis-cli XADD stream_key 1-1 foo bar
"1-1"
$ redis-cli XADD stream_key 1-2 bar baz
"1-2"
```

Tiếp theo, tester sẽ gửi một vài lệnh `XADD` với các ID không hợp lệ, chẳng hạn như `1-2` hoặc `0-3`:

```bash
# Trùng khớp hoàn toàn thời gian và sequence number với bản ghi cuối cùng
$ redis-cli XADD stream_key 1-2 baz foo
(error) ERR The ID specified in XADD is equal or smaller than the target stream top item

# Thời gian nhỏ hơn nhưng sequence number lớn hơn
$ redis-cli XADD stream_key 0-3 baz foo
(error) ERR The ID specified in XADD is equal or smaller than the target stream top item
```

Trong mỗi trường hợp, server của bạn phải phản hồi với `-ERR The ID specified in XADD is equal or smaller than the target stream top item\r\n`, được mã hóa dưới dạng [Simple Error](https://redis.io/docs/latest/develop/reference/protocol-spec/#simple-errors).

Sau đó, tester sẽ gửi thêm một lệnh `XADD` với ID là `0-0`:

```bash
$ redis-cli XADD stream_key 0-0 baz foo
(error) ERR The ID specified in XADD must be greater than 0-0
```

Server của bạn phải phản hồi với `-ERR The ID specified in XADD must be greater than 0-0\r\n`, đây là thông báo lỗi được mã hóa dưới dạng [Simple Error](https://redis.io/docs/latest/develop/reference/protocol-spec/#simple-errors).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `XADD ID validation` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli XADD ID validation
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

// Khối xử lý cho lệnh XADD ID validation:
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
- [Tài liệu chính thức về lệnh `XADD ID validation` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
