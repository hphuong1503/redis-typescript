# Challenge 017: Lấy phần tử có chặn với BLPOP (Chờ đến khi danh sách có dữ liệu) (Blocking retrieval)

[⬅️ **Thử thách trước**: [016. Lấy và xóa nhiều phần tử cùng lúc bằng LPOP kèm tham số count](../02-lists/016-remove-multiple-elements.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [018. Hỗ trợ thời gian chờ timeout cho BLPOP (Trả về nil khi hết giờ)](../02-lists/018-blocking-retrieval-with-timeout.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 017 / 124** |
| **Mã định danh (Slug)** | `ec3` |
| **Tên tiếng Anh (Official Name)** | `Blocking retrieval` |
| **Phân loại Module** | 📋 **Cấu trúc dữ liệu Danh sách (Lists)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `BLPOP key timeout` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Lấy phần tử có chặn với BLPOP (Chờ đến khi danh sách có dữ liệu)**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Blocking retrieval`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho lệnh `BLPOP` — lệnh đọc chặn (blocking) cho đến khi có một phần tử sẵn sàng để lấy ra.

### 📖 Lệnh `BLPOP`

[`BLPOP`](https://redis.io/docs/latest/commands/blpop/) là biến thể chặn của lệnh `LPOP`. Lệnh này sẽ chờ đợi cho đến khi có một phần tử xuất hiện trong danh sách rồi mới lấy ra (pop).

Nếu danh sách đang rỗng, lệnh sẽ bị chặn (block) cho đến khi:

- Có một phần tử mới được thêm vào danh sách.
- Hoặc thời gian chờ quy định (timeout) kết thúc.

Nếu giá trị timeout là `0`, lệnh sẽ bị chặn vô thời hạn (chờ mãi mãi cho đến khi có dữ liệu).

Ví dụ: một client có thể chặn trên một danh sách với thời gian chờ vô hạn như sau:

```bash
> BLPOP list_key 0
```

Client này sẽ chờ cho đến khi có phần tử được thêm vào `list_key`. Khi một phần tử như `"foobar"` được thêm vào, nó sẽ lập tức bị lấy ra khỏi danh sách, và server phản hồi về một [mảng RESP (RESP Array)](https://redis.io/docs/latest/develop/reference/protocol-spec/#arrays):

```bash
1) "list_key"
2) "foobar"
```

Mảng RESP này gồm 2 chuỗi Bulk String:
1. Tên danh sách (key)
2. Phần tử vừa được lấy ra (popped element)

Lệnh `BLPOP` có một số hành vi quan trọng khác cần ghi nhớ:

- Nếu có cung cấp thời lượng timeout, đó là số giây client sẽ chờ đợi một phần tử.
- Nếu không có phần tử nào được thêm vào trong suốt khoảng thời gian timeout, server sẽ trả về một [mảng Null Array](https://redis.io/docs/latest/develop/reference/protocol-spec/#null-arrays) (`*-1\r\n`).
- Nếu có nhiều client cùng bị chặn trên một danh sách, server sẽ ưu tiên phản hồi cho client đã chờ lâu nhất (theo cơ chế hàng đợi FIFO).

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
./your_program.sh
```

Sau đó tester sẽ gửi lệnh `BLPOP` với timeout được đặt là `0`:

```bash
$ redis-cli BLPOP list_key 0
# (Bị chặn - Blocks)
```

Sau một khoảng thời gian ngắn, một client khác sẽ đẩy một phần tử vào cùng danh sách đó:

```bash
# Ở một client khác:
$ redis-cli RPUSH list_key "foo"
# Kỳ vọng: (integer) 1
```

Tester kỳ vọng client đầu tiên sẽ ngay lập tức nhận được phản hồi là mảng mã hóa RESP `["list_key", "foo"]`.

```bash
# Định dạng RESP của ["list_key", "foo"]
*2\r\n
$8\r\n
list_key\r\n
$3\r\n
foo\r\n
```

Tester cũng sẽ kiểm thử lệnh `BLPOP` với nhiều client bị chặn cùng lúc. Tester sẽ tạo nhiều kết nối client và cho từng client gửi lệnh `BLPOP` tới cùng một danh sách:

```bash
# Client 1 gửi BLPOP trước
$ redis-cli BLPOP another_list_key 0

# Client 2 gửi BLPOP sau
$ redis-cli BLPOP another_list_key 0
```

Tiếp theo, một client độc lập khác sẽ dùng `RPUSH` để thêm một phần tử vào danh sách:

```bash
$ redis-cli RPUSH another_list_key "foo"
```

Tester kỳ vọng server của bạn sẽ ưu tiên phản hồi cho client đã gửi lệnh `BLPOP` đầu tiên (`Client 1`).

### 💡 Lưu ý Quan trọng

- Trong giai đoạn này, đối số timeout luôn luôn là `0`, nghĩa là `BLPOP` sẽ chờ vô thời hạn. Chúng ta sẽ xử lý các giá trị timeout khác không (non-zero timeouts) ở giai đoạn tiếp theo.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `BLPOP key timeout` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli BLPOP key timeout
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

// Gợi ý xử lý lệnh BLPOP key timeout:
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
- [Tài liệu chính thức về lệnh `BLPOP key timeout` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
