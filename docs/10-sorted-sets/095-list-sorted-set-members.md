# Challenge 095: Lấy danh sách member có điểm từ thấp đến cao bằng lệnh ZRANGE (List sorted set members)

[⬅️ **Thử thách trước**: [094. Lấy thứ hạng (rank 0-indexed) của member trong Sorted Set với ZRANK](../10-sorted-sets/094-retrieve-member-rank.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [096. Hỗ trợ chỉ mục âm trong ZRANGE (chẳng hạn 0 -1 để lấy toàn bộ tập hợp)](../10-sorted-sets/096-zrange-with-negative-indexes.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 095 / 124** |
| **Mã định danh (Slug)** | `ic1` |
| **Tên tiếng Anh (Official Name)** | `List sorted set members` |
| **Phân loại Module** | 📊 **Tập hợp có sắp xếp (Sorted Sets)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `ZRANGE key start stop` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Lấy danh sách member có điểm từ thấp đến cao bằng lệnh ZRANGE**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `List sorted set members`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng liệt kê danh sách phần tử trong Sorted Set bằng lệnh `ZRANGE`.

### 📖 Lệnh `ZRANGE`
Lệnh `ZRANGE` được sử dụng để lấy danh sách các phần tử trong Sorted Set dựa trên chỉ mục bắt đầu (start) và kết thúc (stop). Chỉ mục của phần tử đầu tiên là 0. Chỉ mục kết thúc mang tính bao gồm (inclusive), nghĩa là phần tử tại vị trí kết thúc cũng sẽ nằm trong danh sách trả về.

Ví dụ sử dụng:
```bash
> ZADD racer_scores 8.1 "Sam-Bodden"
(integer) 1
> ZADD racer_scores 10.2 "Royce"
(integer) 1
> ZADD racer_scores 6.0 "Ford"
(integer) 1
> ZADD racer_scores 14.1 "Prickett"
(integer) 1

# Liệt kê các phần tử từ chỉ mục 0 đến 2
> ZRANGE racer_scores 0 2
1) "Ford"
2) "Sam-Bodden"
3) "Royce"
```

Dưới đây là một số lưu ý bổ sung về hành vi của lệnh `ZRANGE` đối với các trường hợp dữ liệu đầu vào khác nhau:

- Nếu Sorted Set không tồn tại, trả về một mảng rỗng (`*0\r\n`).
- Nếu chỉ mục bắt đầu lớn hơn hoặc bằng tổng số phần tử của Sorted Set, trả về mảng rỗng.
- Nếu chỉ mục kết thúc lớn hơn hoặc bằng tổng số phần tử của Sorted Set, chỉ mục kết thúc sẽ được coi như là vị trí của phần tử cuối cùng.
- Nếu chỉ mục bắt đầu lớn hơn chỉ mục kết thúc, kết quả trả về là mảng rỗng.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tester sẽ khởi tạo một Sorted Set mới với nhiều phần tử:

```bash
$ redis-cli
> ZADD zset_key 100.0 foo (Expecting ":1\r\n")
> ZADD zset_key 100.0 bar (Expecting ":1\r\n")
> ZADD zset_key 20.0 baz (Expecting ":1\r\n")
> ZADD zset_key 30.1 caz (Expecting ":1\r\n")
> ZADD zset_key 40.2 paz (Expecting ":1\r\n")
```

Sau đó, tester sẽ gửi tới server một chuỗi các lệnh `ZRANGE`. Tester kỳ vọng phản hồi là một mảng RESP chứa danh sách phần tử hoặc mảng rỗng tùy theo từng trường hợp kiểm thử.

Ví dụ, tester có thể gửi lệnh như sau:
```bash
> ZRANGE zset_key 2 4
# Kỳ vọng mảng mã hóa RESP: ["paz", "bar", "foo"]
```

Tester kỳ vọng phản hồi là mảng mã hóa chuẩn RESP `["paz", "bar", "foo"]`, có dạng:
```
*3\r\n
$3\r\n
paz\r\n
$3\r\n
bar\r\n
$3\r\n
foo\r\n
```

Tester sẽ gửi nhiều lệnh tương tự và kiểm tra kết quả phản hồi tương ứng.

### 💡 Lưu ý Quan trọng

- Trong giai đoạn này, bạn chỉ cần hỗ trợ lệnh `ZRANGE` với các chỉ mục không âm (>= 0). Việc xử lý chỉ mục âm sẽ được thực hiện ở thử thách tiếp theo.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `ZRANGE key start stop` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli ZRANGE key start stop
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
- [Tài liệu chính thức về lệnh `ZRANGE key start stop` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
