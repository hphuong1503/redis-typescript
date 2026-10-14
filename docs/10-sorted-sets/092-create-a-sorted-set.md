# Challenge 092: Khởi tạo Sorted Set mới bằng lệnh ZADD (Create a sorted set)

[⬅️ **Thử thách trước**: [091. Hủy đăng ký kênh bằng UNSUBSCRIBE và thoát chế độ Subscribed Mode](../09-pub-sub/091-unsubscribe.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [093. Thêm nhiều cặp score-member và cập nhật điểm số nếu member đã tồn tại](../10-sorted-sets/093-add-members.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 092 / 124** |
| **Mã định danh (Slug)** | `ct1` |
| **Tên tiếng Anh (Official Name)** | `Create a sorted set` |
| **Phân loại Module** | 📊 **Tập hợp có sắp xếp (Sorted Sets)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `ZADD key score member` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Khởi tạo Sorted Set mới bằng lệnh ZADD**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Create a sorted set`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng tạo mới một [Sorted Set (tập hợp có thứ tự)](https://redis.io/docs/latest/develop/data-types/sorted-sets/) bằng lệnh `ZADD`.

### 📖 Khái niệm Sorted Sets trong Redis

Sorted Set là một trong các kiểu dữ liệu cốt lõi được Redis hỗ trợ. Một Sorted Set là một tập hợp gồm các phần tử duy nhất (không trùng lặp), trong đó mỗi phần tử gắn liền với một điểm số (score) kiểu số thực dấu phẩy động (floating-point). Khác với kiểu Set thông thường, Sorted Set luôn duy trì các phần tử theo thứ tự được sắp xếp dựa trên điểm số của chúng.

Đặc tính này giúp Sorted Set trở nên lý tưởng cho các bài toán như bảng xếp hạng (leaderboard), hàng đợi ưu tiên (priority queue), hoặc bất kỳ tình huống nào cần truy xuất nhanh các phần tử được sắp xếp theo giá trị số học.

Ví dụ: nếu bạn sử dụng Sorted Set để lưu trữ thứ hạng người chơi trong bảng xếp hạng game đua xe, cấu trúc dữ liệu bên trong có thể trông như sau:

```yaml
racer_scores:
    - member: "Ford"
      score: 6.1
    - member: "Royce"
      score: 8.2
    - member: "Sam-Bodden"
      score: 8.2
    - member: "Prickett"
      score: 14.5
```

Các phần tử trong Sorted Set luôn được sắp xếp theo thứ tự điểm số tăng dần.

### 📖 Lệnh `ZADD`

[Lệnh `ZADD`](https://redis.io/docs/latest/commands/zadd/) được sử dụng để thêm một phần tử (member) vào Sorted Set.

Nếu Sorted Set chưa tồn tại, một Sorted Set mới sẽ được tự động tạo và thêm phần tử đó vào.

Ví dụ sử dụng:

```bash
> ZADD racer_scores 8.0 "Sam"
(integer) 1
```

Lệnh `ZADD` nhận các tham số gồm tên khóa (key), điểm số (score), và tên phần tử (member name). Lệnh trả về một số nguyên biểu diễn số lượng phần tử mới được thêm thành công vào Sorted Set.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi lệnh `ZADD` chỉ định khóa, điểm số và tên phần tử:

```bash
$ redis-cli ZADD zset_key 10.0 zset_member
```

Tester sẽ xác thực phản hồi nhận được cho câu lệnh là `:1\r\n`, đại diện cho số 1 (số lượng phần tử mới được thêm vào Sorted Set), được mã hóa dưới dạng RESP Integer.

### 💡 Lưu ý Quan trọng
- Trong thử thách này, bạn chỉ cần xử lý việc tạo mới một Sorted Set với một phần tử duy nhất. Việc thêm nhiều phần tử vào Sorted Set đã tồn tại sẽ được triển khai ở các giai đoạn tiếp theo.
- Khuyến nghị lưu trữ score dưới dạng số thực dấu phẩy động 64-bit (`double` trong C hoặc `number` trong JavaScript/TypeScript) để đạt độ chính xác cao nhất, tương tự như mã nguồn chính thức của Redis sử dụng kiểu [`double`](https://github.com/redis/redis/blob/bec644aab198049eaa5583631c419b4574b137e1/tests/modules/zset.c#L34).
- Khuyến nghị bạn cài đặt Sorted Set bằng cấu trúc dữ liệu đảm bảo các phần tử luôn được lưu trữ theo thứ tự điểm số (ví dụ: mảng đã sắp xếp hoặc danh sách liên kết). Cấu trúc này sẽ rất hữu ích cho các thử thách sau.
    - Redis gốc cài đặt Sorted Set bằng sự kết hợp giữa [Hash Table và Skip List](https://github.com/redis/redis/blob/674b829981c0b8ad15a670a32df503e0e4514e96/src/server.h#L1560).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `ZADD key score member` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli ZADD key score member
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
- [Tài liệu chính thức về lệnh `ZADD key score member` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
