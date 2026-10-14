# Challenge 045: Hủy thực thi EXEC (trả về nil) nếu key bị thay đổi bởi client khác (Tracking key modifications)

[⬅️ **Thử thách trước**: [044. Từ chối thực thi lệnh WATCH nếu được gọi bên trong khối MULTI](../05-optimistic-locking/044-watch-inside-transaction.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [046. Theo dõi đồng thời danh sách nhiều key trong cùng một phiên làm việc](../05-optimistic-locking/046-watching-multiple-keys.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 045 / 124** |
| **Mã định danh (Slug)** | `mh8` |
| **Tên tiếng Anh (Official Name)** | `Tracking key modifications` |
| **Phân loại Module** | 🔒 **Khóa lạc quan (Optimistic Locking)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `Key modification CAS` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Hủy thực thi EXEC (trả về nil) nếu key bị thay đổi bởi client khác**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Tracking key modifications`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ cài đặt lệnh `EXEC` và bổ sung hỗ trợ hủy bỏ (abort) transaction khi phát hiện xung đột dữ liệu.

### Transaction trong Redis (Nhắc lại kiến thức)

Nhắc lại kiến thức, [transaction trong Redis](https://redis.io/docs/latest/develop/using-commands/transactions/) cho phép client thực thi nhiều lệnh dưới dạng một thao tác duy nhất. Luồng cơ bản gồm có:

1. `MULTI` - Bước vào chế độ transaction (Đã xử lý ở các giai đoạn trước)
2. `SET key value`, `INCR counter`, v.v. - Các lệnh được đưa vào hàng đợi
3. `EXEC` - Thực thi toàn bộ các lệnh trong hàng đợi

Đối với giai đoạn này, bạn sẽ triển khai lệnh `EXEC` và làm cho transaction thất bại nếu các key đang được theo dõi của nó bị sửa đổi.

### 📖 Lệnh `EXEC`

[Lệnh `EXEC`](https://redis.io/docs/latest/commands/exec/) thực thi toàn bộ các lệnh đã được xếp hàng sau `MULTI`:

```bash
$ redis-cli
> SET foo 100
OK
> MULTI
OK
> SET foo 200
QUEUED
> SET bar 300
QUEUED
> EXEC
1) OK
2) OK
```

Phản hồi trả về là một mảng RESP (Array), trong đó mỗi phần tử là kết quả của một lệnh trong hàng đợi theo đúng thứ tự mà chúng được đưa vào.

### Hủy bỏ Transaction với `WATCH`

Khi một kết nối có các key đang được theo dõi, lệnh `EXEC` cần kiểm tra xem liệu có bất kỳ key nào trong số đó bị client khác sửa đổi trong khoảng thời gian từ `WATCH` đến `EXEC` hay không. Nếu có, transaction sẽ bị hủy bỏ:

```
Client A: WATCH foo             # Server theo dõi "foo" cho Client A
Client A: MULTI
Client A: SET bar 300           # Đưa vào hàng đợi
Client B: SET foo 999           # Sửa đổi key mà Client A đang theo dõi
Client A: EXEC                  # Trả về *-1\r\n, các lệnh trong hàng đợi bị hủy
```

Lệnh `EXEC` trả về một mảng rỗng RESP null array (`*-1\r\n`), và các lệnh trong hàng đợi bị loại bỏ mà không được thực thi.

Nếu không có key nào được theo dõi bị sửa đổi, `EXEC` sẽ thực thi transaction như bình thường.

<!-- Để thực hiện điều này, server của bạn cần phát hiện các sửa đổi giữa các kết nối khác nhau. Bất cứ khi nào server xử lý một lệnh ghi, nó cần kiểm tra xem key bị sửa đổi có đang được kết nối nào khác theo dõi hay không. Nếu có, transaction của kết nối đó phải được đánh dấu là bẩn (dirty) để lệnh `EXEC` tiếp theo biết đường hủy bỏ.

Sau khi `EXEC` hoàn tất (dù thành công hay bị hủy), hãy xóa sạch các key được theo dõi và trạng thái dirty của kết nối đó. -->

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tester sẽ khởi tạo 4 client và chạy 2 kịch bản kiểm thử:

Trong kịch bản thứ nhất, tester sửa đổi key đang được theo dõi từ một client khác:

```bash
# Client 1
> SET foo 100        # → +OK
> SET bar 200        # → +OK
> WATCH foo          # → +OK
> MULTI              # → +OK
> SET bar 300        # → +QUEUED

# Client 2 sửa đổi key đang được theo dõi
> SET foo 200        # → +OK

# Client 1 thử thực thi transaction
> EXEC               # → *-1\r\n (mảng null, transaction bị hủy bỏ)
> GET bar            # → "200" (không đổi, SET bar 300 chưa từng được thực thi)
```

Trong kịch bản thứ hai, tester sửa đổi một key khác (không phải key đang được theo dõi):

```bash
# Client 3
> SET baz 100        # → +OK
> SET caz 200        # → +OK
> WATCH baz          # → +OK
> MULTI              # → +OK
> SET caz 400        # → +QUEUED

# Client 4 sửa đổi một key khác (không phải key đang được theo dõi)
> SET caz 300        # → +OK

# Client 3 thực thi thành công
> EXEC               # → mảng các phản hồi (baz không bị sửa đổi)

# Client 4 xác minh thao tác ghi của transaction đã có hiệu lực
> GET caz            # → "400"
```

Tester sẽ xác minh rằng:

- `EXEC` trả về mảng RESP null array (`*-1\r\n`) khi một key đang theo dõi bị client khác sửa đổi
- `EXEC` trả về mảng kết quả các lệnh khi không có key nào đang theo dõi bị sửa đổi
- Các lệnh trong hàng đợi không được thực thi khi transaction bị hủy bỏ, và các giá trị gốc được bảo toàn
- Các lệnh trong hàng đợi được thực thi khi không có key nào bị sửa đổi, và các thao tác ghi có hiệu lực

### 💡 Lưu ý Quan trọng

- So sánh giá trị của key tại thời điểm `WATCH` với thời điểm `EXEC` là chưa đủ. Nếu một key bị sửa đổi rồi sau đó lại được gán về giá trị ban đầu, transaction vẫn phải bị hủy bỏ. Hãy theo dõi việc key đó có bị tác động (touched) hay không, chứ không chỉ đơn thuần là giá trị của nó có đổi hay không.
- Sau khi `EXEC` kết thúc, hãy xóa trạng thái theo dõi của kết nối (các key được theo dõi và cờ dirty), bất kể transaction thành công hay bị hủy bỏ.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Key modification CAS` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Key modification CAS
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
- [Tài liệu chính thức về lệnh `EXEC` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách Redis trên CodeCrafters](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
