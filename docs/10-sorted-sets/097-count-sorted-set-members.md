# Challenge 097: Đếm tổng số lượng phần tử trong Sorted Set bằng lệnh ZCARD (Count sorted set members)

[⬅️ **Thử thách trước**: [096. Hỗ trợ chỉ mục âm trong ZRANGE (chẳng hạn 0 -1 để lấy toàn bộ tập hợp)](../10-sorted-sets/096-zrange-with-negative-indexes.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [098. Lấy điểm số chính xác (float string) của member bằng lệnh ZSCORE](../10-sorted-sets/098-retrieve-member-score.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 097 / 124** |
| **Mã định danh (Slug)** | `kn4` |
| **Tên tiếng Anh (Official Name)** | `Count sorted set members` |
| **Phân loại Module** | 📊 **Tập hợp có sắp xếp (Sorted Sets)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `ZCARD key` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Đếm tổng số lượng phần tử trong Sorted Set bằng lệnh ZCARD**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Count sorted set members`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng đếm số lượng phần tử trong Sorted Set bằng lệnh `ZCARD`.

### 📖 Lệnh `ZCARD`

Lệnh `ZCARD` được sử dụng để truy vấn số lượng phần tử (cardinality) của một Sorted Set. Lệnh trả về một số nguyên (RESP Integer). Kết quả trả về là 0 nếu Sorted Set chỉ định không tồn tại.

```bash
> ZADD zset_key 1.2 "one"
(integer) 1
> ZADD zset_key 2.2 "two"
(integer) 1
> ZCARD zset_key
(integer) 2

> ZCARD missing_key
(integer) 0
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi lệnh `ZADD` để khởi tạo và thêm các phần tử vào:

```bash
$ redis-cli
> ZADD zset_key 20.0 zset_member1 (Expecting ":1\r\n")
> ZADD zset_key 30.1 zset_member2 (Expecting ":1\r\n")
> ZADD zset_key 40.2 zset_member3 (Expecting ":1\r\n")
> ZADD zset_key 50.3 zset_member4 (Expecting ":1\r\n")
```

Tester sẽ kiểm tra số lượng phần tử trong Sorted Set bằng lệnh `ZCARD`:
```bash
$ redis-cli ZCARD zset_key (Expecting ":4\r\n")
```

Tester sẽ cập nhật điểm số của một phần tử đã tồn tại:
```bash
$ redis-cli ZADD zset_key 100.0 zset_member1 (Expecting ":0\r\n")
```

Tester sẽ kiểm tra lại số lượng phần tử của Sorted Set bằng lệnh `ZCARD`:
```bash
$ redis-cli ZCARD zset_key (Expecting ":4\r\n")
```

Tester cũng sẽ kiểm tra số lượng phần tử của một Sorted Set không tồn tại:
```bash
$ redis-cli ZCARD missing_key (Expecting ":0\r\n")
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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `ZCARD key` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli ZCARD key
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
interface ZSetMember {
  member: string;
  score: number;
}

// Quản lý Sorted Set:
// Dùng mảng sắp xếp theo score hoặc kết hợp Map<member, score> và danh sách đã sort.
const zsetStore = new Map<string, Map<string, number>>();

// Thêm phần tử: ZADD key score member
// Lấy khoảng điểm: ZRANGE key start stop
// Lấy thứ hạng: ZRANK key member
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
- [Tài liệu chính thức về lệnh `ZCARD key` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
