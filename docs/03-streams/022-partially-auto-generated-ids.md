# Challenge 022: Tự động sinh sequence number cho Entry ID dạng <ms>-* (Partially auto-generated IDs)

[⬅️ **Thử thách trước**: [021. Xác thực quy tắc thứ tự tăng dần của Entry ID (milliseconds-sequence)](../03-streams/021-validating-entry-ids.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [023. Tự động sinh toàn bộ Entry ID khi client truyền ký tự '*'](../03-streams/023-fully-auto-generated-ids.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 022 / 124** |
| **Mã định danh (Slug)** | `yh3` |
| **Tên tiếng Anh (Official Name)** | `Partially auto-generated IDs` |
| **Phân loại Module** | 🌊 **Luồng sự kiện (Streams)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `XADD key <ms>-* ...` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Tự động sinh sequence number cho Entry ID dạng <ms>-***: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Partially auto-generated IDs`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ mở rộng lệnh `XADD` để hỗ trợ việc tự động sinh số thứ tự sequence number cho Entry ID.

### Chỉ định Entry ID trong `XADD` (Ôn lại)

Nhắc lại, lệnh `XADD` chấp nhận ID ở 3 định dạng:

- Tường minh hoàn toàn (`1526919030473-0`) (Đã xử lý ở các giai đoạn trước)
- Tự động sinh riêng sequence number (`1526919030474-*`)
- Tự động sinh cả thời gian và sequence number (`*`)

Trong giai đoạn này, bạn sẽ xử lý trường hợp thứ hai, khi chỉ có số thứ tự sequence number là được tự động sinh.

### Cơ chế tự động sinh Sequence Number

Redis tự động gán sequence number dựa trên các điều kiện sau:

- Nếu stream chưa có bản ghi nào ứng với mốc thời gian đó, sequence number bắt đầu từ `0`.
- Nếu đã tồn tại các bản ghi có cùng mốc thời gian, sequence number mới sẽ bằng sequence number của bản ghi liền trước cộng thêm `1`.
- Ngoại lệ duy nhất là khi mốc thời gian bằng `0`. Trong trường hợp đó, sequence number mặc định bắt đầu từ `1` (vì `0-0` là không hợp lệ).

Dưới đây là ví dụ về việc thêm bản ghi với `*` ở phần sequence number:

```bash
$ redis-cli XADD some_key "1-*" foo bar
"1-0" # Sequence number là 0 nếu chưa có bản ghi nào trước đó

$ redis-cli XADD some_key "1-*" bar baz
"1-1" # Thêm bản ghi tiếp theo cùng timestamp sẽ tự động tăng sequence number
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi một lệnh `XADD` với `*` ở vị trí sequence number:

```bash
$ redis-cli XADD stream_key 0-* foo bar
```

Server của bạn phải phản hồi với `$3\r\n0-1\r\n`, đây là chuỗi `0-1` được mã hóa dưới dạng [Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings).

Tiếp theo, tester sẽ gửi một lệnh `XADD` khác với `*` ở sequence number, nhưng lần này với một số ngẫu nhiên ở phần mốc thời gian:

```bash
$ redis-cli XADD stream_key 5-* foo bar
```

Server của bạn phải phản hồi với `$3\r\n5-0\r\n`, đây là chuỗi `5-0` được mã hóa dưới dạng chuỗi Bulk String.

Sau đó, tester sẽ gửi lại chính lệnh đó thêm một lần nữa:

```bash
$ redis-cli XADD stream_key 5-* bar baz
```

Server của bạn phải phản hồi với `$3\r\n5-1\r\n`, đây là chuỗi `5-1` được mã hóa dưới dạng chuỗi Bulk String.

### 💡 Lưu ý Quan trọng

- Tester sẽ sử dụng một số ngẫu nhiên cho phần mốc thời gian (chúng tôi lấy ví dụ là `5` ở trên).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `XADD key <ms>-* ...` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli XADD key <ms>-* ...
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

// Khối xử lý cho lệnh XADD key <ms>-* ...:
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
- [Tài liệu chính thức về lệnh `XADD key <ms>-* ...` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
