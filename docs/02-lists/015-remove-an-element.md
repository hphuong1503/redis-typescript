# Challenge 015: Lấy và xóa phần tử đầu danh sách bằng lệnh LPOP (Remove an element)

[⬅️ **Thử thách trước**: [014. Lấy độ dài hiện tại của danh sách bằng lệnh LLEN](../02-lists/014-query-list-length.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [016. Lấy và xóa nhiều phần tử cùng lúc bằng LPOP kèm tham số count](../02-lists/016-remove-multiple-elements.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 015 / 124** |
| **Mã định danh (Slug)** | `ef1` |
| **Tên tiếng Anh (Official Name)** | `Remove an element` |
| **Phân loại Module** | 📋 **Cấu trúc dữ liệu Danh sách (Lists)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `LPOP key` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Lấy và xóa phần tử đầu danh sách bằng lệnh LPOP**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Remove an element`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ xóa phần tử đầu tiên của danh sách bằng lệnh `LPOP`.

### 📖 Lệnh `LPOP`

Lệnh [`LPOP`](https://redis.io/docs/latest/commands/lpop/) loại bỏ và trả về phần tử đầu tiên của một danh sách.

Ví dụ:

```bash
> RPUSH list_key "a" "b" "c" "d"
(integer) 4

> LPOP list_key
"a"
```

Nếu danh sách rỗng hoặc không tồn tại, lệnh sẽ trả về [chuỗi Null Bulk String (`$-1\r\n`)](https://redis.io/docs/latest/develop/reference/protocol-spec/#null-bulk-strings).

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh
```

Sau đó tester sẽ tạo một danh sách với một số phần tử:

```bash
$ redis-cli
> RPUSH list_key "one" "two" "three" "four" "five"
```

Tiếp theo, tester sẽ gửi một lệnh `LPOP` tới server của bạn, chỉ định danh sách vừa tạo:

```bash
> LPOP list_key
# Kỳ vọng: (Bulk string) "one"
```

Tester kỳ vọng phần tử bị xóa sẽ được trả về dưới dạng một [chuỗi Bulk String RESP](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings) (`$3\r\none\r\n`).

Tester cũng sẽ xác minh rằng các phần tử còn lại vẫn tồn tại trong danh sách bằng lệnh `LRANGE`:

```bash
> LRANGE list_key 0 -1
# Kỳ vọng mảng mã hóa RESP: ["two", "three", "four", "five"]
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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `LPOP key` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli LPOP key
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

// Gợi ý xử lý lệnh LPOP key:
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
- [Tài liệu chính thức về lệnh `LPOP key` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
