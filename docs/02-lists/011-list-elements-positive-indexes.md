# Challenge 011: Đọc danh sách phần tử bằng lệnh LRANGE với chỉ mục dương (0-based) (List elements (positive indexes))

[⬅️ **Thử thách trước**: [010. Nối nhiều phần tử liên tiếp vào danh sách trong một lệnh RPUSH](../02-lists/010-append-multiple-elements.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [012. Đọc danh sách phần tử bằng LRANGE hỗ trợ chỉ mục âm (-1 là phần tử cuối)](../02-lists/012-list-elements-negative-indexes.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 011 / 124** |
| **Mã định danh (Slug)** | `sf6` |
| **Tên tiếng Anh (Official Name)** | `List elements (positive indexes)` |
| **Phân loại Module** | 📋 **Cấu trúc dữ liệu Danh sách (Lists)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `LRANGE key start stop` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Đọc danh sách phần tử bằng lệnh LRANGE với chỉ mục dương (0-based)**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `List elements (positive indexes)`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong giai đoạn này, bạn sẽ bổ sung hỗ trợ lấy danh sách các phần tử từ một danh sách bằng lệnh `LRANGE`.

### Lệnh `LRANGE`

Lệnh `LRANGE` được dùng để lấy các phần tử từ một danh sách dựa trên chỉ số bắt đầu `start` và chỉ số kết thúc `stop`.

Chỉ số của phần tử đầu tiên là `0`. Chỉ số `stop` mang tính bao gồm (inclusive), nghĩa là phần tử tại vị trí đó cũng sẽ nằm trong phản hồi trả về.

Ví dụ:

```bash
# Tạo một danh sách gồm 5 phần tử
> RPUSH list_key "a" "b" "c" "d" "e"
(integer) 5

# Lấy 2 phần tử đầu tiên
> LRANGE list_key 0 1
1) "a"
2) "b"

# Lấy các phần tử từ chỉ số 2 đến 4
> LRANGE list_key 2 4
1) "c"
2) "d"
3) "e"
```

Lệnh `LRANGE` có một số hành vi cần lưu ý:

- Nếu danh sách không tồn tại, trả về một mảng rỗng.
- Nếu chỉ số `start` lớn hơn hoặc bằng độ dài của danh sách, trả về một mảng rỗng.
- Nếu chỉ số `stop` lớn hơn hoặc bằng độ dài danh sách, chỉ số `stop` sẽ được coi là chỉ số của phần tử cuối cùng.
- Nếu chỉ số `start` lớn hơn chỉ số `stop`, trả về một mảng rỗng.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh
```

Sau đó tester sẽ tạo một danh sách mới với nhiều phần tử:

```bash
$ redis-cli RPUSH list_key "a" "b" "c" "d" "e"
```

Tiếp theo, tester sẽ gửi tới chương trình của bạn một chuỗi các lệnh `LRANGE`. Với mỗi lệnh, tester kỳ vọng phản hồi là một [mảng RESP (RESP Array)](https://redis.io/docs/latest/develop/reference/protocol-spec/#arrays) hoặc một mảng rỗng (`*0\r\n`), tùy thuộc vào từng kịch bản kiểm thử.

Ví dụ, tester có thể gửi lệnh như sau:

```bash
$ redis-cli LRANGE list_key 0 2
# Kỳ vọng mảng mã hóa RESP: ["a", "b", "c"]
```

Tester kỳ vọng phản hồi là một mảng RESP `["a", "b", "c"]`, có định dạng như sau:

```bash
*3\r\n
$1\r\n
a\r\n
$1\r\n
b\r\n
$1\r\n
c\r\n
```

### 💡 Lưu ý Quan trọng

- Trong giai đoạn này, bạn chỉ cần cài đặt `LRANGE` với các chỉ số không âm (non-negative indexes). Chúng ta sẽ xử lý `LRANGE` với chỉ số âm ở các giai đoạn tiếp theo.
- Nếu một danh sách không tồn tại, `LRANGE` cần phản hồi một mảng RESP rỗng (`*0\r\n`).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `LRANGE key start stop` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli LRANGE key start stop
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
// Quản lý Lists bằng Map<string, string[]>
const listStore = new Map<string, string[]>();

// Gợi ý xử lý lệnh LRANGE key start stop:
function handleListCommand(socket: net.Socket, args: string[]) {
  const cmd = args[0].toUpperCase();
  const key = args[1];

  if (cmd === "RPUSH") {
    const elements = args.slice(2);
    if (!listStore.has(key)) listStore.set(key, []);
    const list = listStore.get(key)!;
    list.push(...elements);
    // Trả về số lượng phần tử hiện tại: :<len>\r\n
    socket.write(`:${list.length}\r\n`);
  } else if (cmd === "LRANGE") {
    const start = parseInt(args[2], 10);
    const stop = parseInt(args[3], 10);
    const list = listStore.get(key) || [];
    // Tính toán chỉ mục (hỗ trợ cả số âm)
    let s = start < 0 ? Math.max(0, list.length + start) : Math.min(start, list.length);
    let e = stop < 0 ? Math.max(-1, list.length + stop) : Math.min(stop, list.length - 1);
    
    if (s > e || s >= list.length) {
      socket.write("*0\r\n");
      return;
    }
    const slice = list.slice(s, e + 1);
    // Mã hóa RESP Array
    let resp = `*${slice.length}\r\n`;
    for (const item of slice) {
      resp += `$${Buffer.byteLength(item)}\r\n${item}\r\n`;
    }
    socket.write(resp);
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
- [Tài liệu chính thức về lệnh `LRANGE key start stop` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
