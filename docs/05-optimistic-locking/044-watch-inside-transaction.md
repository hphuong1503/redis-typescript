# Challenge 044: Từ chối thực thi lệnh WATCH nếu được gọi bên trong khối MULTI (WATCH inside transaction)

[⬅️ **Thử thách trước**: [043. Cài đặt lệnh WATCH theo dõi key để thực hiện khóa lạc quan (CAS)](../05-optimistic-locking/043-the-watch-command.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [045. Hủy thực thi EXEC (trả về nil) nếu key bị thay đổi bởi client khác](../05-optimistic-locking/045-tracking-key-modifications.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 044 / 124** |
| **Mã định danh (Slug)** | `jq9` |
| **Tên tiếng Anh (Official Name)** | `WATCH inside transaction` |
| **Phân loại Module** | 🔒 **Khóa lạc quan (Optimistic Locking)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `WATCH inside MULTI error` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Từ chối thực thi lệnh WATCH nếu được gọi bên trong khối MULTI**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `WATCH inside transaction`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ cài đặt lệnh `MULTI` và cập nhật `WATCH` để từ chối các lệnh gọi bên trong transaction.

### Giao dịch (Transaction) trong Redis

Trong các giai đoạn trước, bạn đã thấy lệnh `WATCH` khớp vào một luồng xử lý hoàn chỉnh ra sao: theo dõi một key bằng `WATCH`, bắt đầu một transaction bằng `MULTI`, đưa các lệnh vào hàng đợi và thực thi với `EXEC`. Bây giờ bạn sẽ bắt đầu xây dựng khía cạnh xử lý transaction.

[Transaction trong Redis](https://redis.io/docs/latest/develop/using-commands/transactions/) cho phép client thực thi nhiều lệnh dưới dạng một thao tác duy nhất. Luồng cơ bản gồm có:

1. `MULTI` - Bước vào chế độ transaction (các lệnh được đưa vào hàng đợi thay vì thực thi ngay lập tức)
2. `SET key value`, `INCR counter`, v.v. - Các lệnh được xếp hàng đợi (queue)
3. `EXEC` - Thực thi toàn bộ các lệnh trong hàng đợi

Chúng ta sẽ triển khai `EXEC` ở các giai đoạn sau. Đối với giai đoạn này, bạn sẽ triển khai lệnh `MULTI` và yêu cầu `WATCH` kiểm tra xem liệu nó có đang bị gọi từ bên trong một transaction hay không.

### 📖 Lệnh `MULTI`

[Lệnh `MULTI`](https://redis.io/docs/latest/commands/multi/) được dùng để bắt đầu một transaction.

```bash
$ redis-cli MULTI
OK
```

Khi client sử dụng `MULTI`, server sẽ:
1. Đánh dấu kết nối hiện tại là đang nằm trong một transaction
2. Trả về `OK` dưới dạng một simple string

### 📖 Lệnh `WATCH` (Cập nhật)

Lệnh `WATCH` được thiết kế để gọi **trước khi** một transaction bắt đầu. Việc gọi `WATCH` bên trong một transaction là không được phép vì transaction đã bắt đầu và các lệnh đã đang được đưa vào hàng đợi.

Khi đã có trạng thái transaction, `WATCH` cần thực thi quy tắc này:

- Nếu kết nối đang ở ngoài transaction:
    1. Thêm key vào tập hợp các key được theo dõi của kết nối
    2. Trả về `OK` dưới dạng simple string
- Nếu kết nối đang ở bên trong một transaction (sau khi gọi `MULTI`):
    1. Trả về một mã lỗi RESP dạng: `-ERR WATCH inside MULTI is not allowed\r\n`. Câu từ chính xác có thể linh hoạt nhưng cần chứa các từ khóa: `ERR`, `WATCH`, `inside MULTI`, và `not allowed`.

Ví dụ minh họa:
```bash
$ redis-cli
> WATCH counter
OK
> MULTI
OK
(TX)> WATCH another_key
(error) ERR WATCH inside MULTI is not allowed
```

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:
```bash
$ ./your_program.sh
```

Sau đó tester sẽ tạo một client, bắt đầu một transaction bằng lệnh `MULTI`, và gửi lệnh `WATCH` với một key ngẫu nhiên:
```bash
$ redis-cli
> MULTI
OK
> WATCH key
(error) ERR WATCH inside MULTI is not allowed
```

Tester sẽ xác minh rằng:
- `MULTI` trả về `OK` dưới dạng simple string
- `WATCH` bên trong một transaction trả về mã lỗi RESP chứa: `ERR`, `WATCH`, `inside MULTI`, và `not allowed`

### 💡 Lưu ý Quan trọng

- Bạn cần có cơ chế quản lý trạng thái riêng cho từng kết nối (chẳng hạn như một map với key là kết nối / socket).
- Khi `WATCH` được gọi bên ngoài transaction, bạn vẫn nên lưu vết các key được theo dõi dù chúng chưa được sử dụng ngay. Điều này giúp chuẩn bị cho các giai đoạn tiếp theo.
- Định dạng thông báo lỗi chính xác có thể linh hoạt miễn là chứa các từ khóa bắt buộc.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `WATCH inside MULTI error` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli WATCH inside MULTI error
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
- [Tài liệu chính thức về lệnh `WATCH` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách Redis trên CodeCrafters](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
