# Challenge 043: Cài đặt lệnh WATCH theo dõi key để thực hiện khóa lạc quan (CAS) (The WATCH command)

[⬅️ **Thử thách trước**: [042. Quản lý độc lập trạng thái transaction giữa nhiều client đồng thời](../04-transactions/042-multiple-transactions.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [044. Từ chối thực thi lệnh WATCH nếu được gọi bên trong khối MULTI](../05-optimistic-locking/044-watch-inside-transaction.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 043 / 124** |
| **Mã định danh (Slug)** | `jb7` |
| **Tên tiếng Anh (Official Name)** | `The WATCH command` |
| **Phân loại Module** | 🔒 **Khóa lạc quan (Optimistic Locking)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `WATCH key` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Cài đặt lệnh WATCH theo dõi key để thực hiện khóa lạc quan (CAS)**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `The WATCH command`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho lệnh `WATCH`.

<!-- ### Khóa lạc quan (Optimistic Locking) trong Redis

Giả sử hai client cùng muốn tăng một biến đếm (counter) hiện có giá trị là `10`. Client A đọc `10`, Client B cũng đọc `10`. Client A ghi `11`. Client B cũng ghi `11`. Lần ghi thứ hai sẽ ghi đè lên lần ghi thứ nhất, do đó chỉ có một lần tăng được lưu lại trong khi cập nhật còn lại bị mất.

Đây là "vấn đề mất cập nhật" (lost update problem), và nó xuất hiện bất cứ khi nào nhiều client cùng thực hiện đọc-rồi-ghi trên cùng một key. Cách giải quyết cổ điển là khóa key trước khi đọc để không ai khác có thể chạm vào nó cho đến khi hoàn tất (khóa bi quan - pessimistic locking). Cách này hoạt động được, nhưng chi phí khóa rất lớn. Nếu hầu hết các cập nhật không thực sự xung đột, bạn đang phải trả giá cho chi phí khóa ở mọi lúc cho các xung đột hiếm khi xảy ra.

Khóa lạc quan (Optimistic locking) đảo ngược cách tiếp cận. Thay vì khóa ngay từ đầu, bạn cho phép mọi client đọc và ghi tự do, nhưng theo dõi những gì họ đã đọc. Ngay trước khi client commit các thay đổi của mình, bạn kiểm tra: liệu có giá trị nào trong số đó đã bị thay đổi kể từ khi client đọc chúng không? Nếu có, lệnh commit sẽ bị từ chối và client có thể thử lại với dữ liệu mới. -->

### 📖 Lệnh `WATCH`

Redis sử dụng lệnh [`WATCH`](https://redis.io/docs/latest/commands/watch/) để triển khai [khóa lạc quan (optimistic locking)](https://redis.io/docs/latest/develop/using-commands/transactions/#optimistic-locking-using-check-and-set). Lệnh này báo cho server theo dõi một key để phát hiện thay đổi. Sau đó, khi client thực thi một nhóm lệnh dưới dạng [transaction (giao dịch)](https://redis.io/docs/latest/develop/using-commands/transactions/), server sẽ kiểm tra xem có bất kỳ key nào đang được theo dõi bị sửa đổi trong khoảng thời gian đó hay không. Nếu có, toàn bộ transaction sẽ bị hủy bỏ.

Dưới đây là minh họa luồng hoạt động trong thực tế:

```bash
Client A: WATCH counter          # "Báo cho tôi biết nếu key này thay đổi"
Client A: GET counter → 10       # Đọc giá trị hiện tại
Client B: SET counter 20         # Một client khác chen ngang cập nhật
Client A: MULTI                  # Bắt đầu một transaction
Client A: SET counter 11         # Đưa vào hàng đợi lệnh cập nhật dựa trên dữ liệu cũ
Client A: EXEC                   # Thử thực thi transaction...
→ (nil)                          # Transaction bị hủy, counter đã bị thay đổi
```

Bạn sẽ triển khai đầy đủ luồng xử lý này trong các giai đoạn sau. Đối với giai đoạn này, bạn chỉ cần phân tích cú pháp lệnh `WATCH` và phản hồi lại `+OK\r\n`.

```bash
$ redis-cli WATCH key
OK
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi một lệnh `WATCH`:

```bash
$ redis-cli WATCH key
```

Tester sẽ xác minh rằng:
- Phản hồi nhận được là `+OK\r\n` (chuỗi đơn RESP - Simple String)
- Chương trình của bạn không bị crash hoặc sinh lỗi

### 💡 Lưu ý Quan trọng
- Lệnh `WATCH` có thể nhận nhiều key trong một câu lệnh duy nhất (ví dụ: `WATCH key1 key2 key3`), nhưng hiện tại bạn chỉ cần xử lý một key đơn lẻ. Chúng ta sẽ xử lý nhiều key ở các giai đoạn sau.
- Cơ chế theo dõi (watch tracking) thực tế và hành vi hủy bỏ transaction sẽ được triển khai trong các giai đoạn sau.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `WATCH key` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli WATCH key
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
// Quản lý WATCH:
// Lưu phiên bản (version/modification count) của mỗi key trong global state.
const keyVersions = new Map<string, number>();

// Khi client gọi WATCH key: lưu snapshot version hiện tại của key đó vào clientState.watchedKeys.
// Bất kỳ thao tác ghi (SET, INCR, v.v.) sẽ tăng keyVersions của key đó.
// Khi client gọi EXEC: Nếu bất kỳ key nào có keyVersions != snapshot -> Trả về "$-1\r\n" (hủy giao dịch).
```

---

## ⚠️ 5. Lưu ý & Bẫy thường gặp (Common Pitfalls & Tips)

1. **Ký tự ngắt dòng CRLF**: Mọi phản hồi trong RESP bắt buộc phải kết thúc bằng đúng 2 byte `\r\n` (`\x0D\x0A`). Thiếu `\r` hoặc chỉ gửi `\n` sẽ khiến tester bị treo timeout vì chờ đủ dữ liệu.
2. **Không phân biệt chữ hoa/thường**: Tên lệnh Redis hoàn toàn không phân biệt hoa thường (`ping`, `PING`, `PiNg` đều hợp lệ). Luôn chuẩn hóa bằng `.toUpperCase()` trước khi so sánh.
3. **Độ dài chuỗi tính bằng Byte, không phải Ký tự**: Khi định dạng Bulk String `$len\r\n...`, `len` là số byte nhị phân (`Buffer.byteLength(str)`), không phải `str.length` (đặc biệt quan trọng với chuỗi UTF-8 hoặc dữ liệu nhị phân).
4. **Quản lý đa kết nối đồng thời**: Tránh lưu trữ trạng thái riêng của client (như cờ transaction, subscription, authenticated) vào biến toàn cục. Hãy gán vào đối tượng socket hoặc sử dụng `WeakMap<net.Socket, State>`.

---

## 📚 6. Tài liệu tham khảo chính thức

- [Đặc tả giao thức Redis (RESP2/RESP3)](https://redis.io/docs/latest/develop/reference/protocol-spec/)
- [Tài liệu chính thức về lệnh `WATCH key` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách Redis trên CodeCrafters](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
