# Challenge 070: Đọc cấu trúc header RDB và trích xuất key đầu tiên từ database 0 (Read a key)

[⬅️ **Thử thách trước**: [069. Hỗ trợ lệnh CONFIG GET cho 2 tham số dir và dbfilename](../07-persistence-rdb/069-rdb-file-config.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [071. Giải mã String Value tương ứng của key từ định dạng nhị phân RDB](../07-persistence-rdb/071-read-a-string-value.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 070 / 124** |
| **Mã định danh (Slug)** | `jz6` |
| **Tên tiếng Anh (Official Name)** | `Read a key` |
| **Phân loại Module** | 💾 **Lưu trữ bền vững RDB (RDB Persistence)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `Parse RDB key` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Đọc cấu trúc header RDB và trích xuất key đầu tiên từ database 0**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Read a key`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung hỗ trợ cho việc đọc một key đơn lẻ từ file RDB.

### Định dạng file RDB (RDB file format)

<details>
  <summary>Nhấn để mở rộng/thu gọn</summary>
#### Tổng quan về định dạng file RDB (RDB file format overview)

Dưới đây là các phân đoạn (sections) khác nhau của file RDB, theo thứ tự:

1.  Phân đoạn Header (Header section)
2.  Phân đoạn Metadata (Metadata section)
3.  Phân đoạn Cơ sở dữ liệu (Database section)
4.  Phân đoạn Kết thúc file (End of file section)

File RDB sử dụng các kiểu mã hóa đặc biệt để lưu trữ các loại dữ liệu khác nhau. Những kiểu liên quan đến giai đoạn này là "mã hóa kích thước" (size encoding) và "mã hóa chuỗi" (string encoding). Các kiểu này được giải thích ở gần cuối trang này.

Bản phân tích chi tiết định dạng file RDB sau đây được dựa trên tài liệu [Redis RDB File Format](https://rdb.fnordig.de/file_format.html) của Jan-Erik Rediger. Chúng tôi chỉ đưa vào các phần có liên quan đến giai đoạn này.

#### Phân đoạn Header (Header section)

File RDB bắt đầu bằng một phân đoạn header có cấu trúc tương tự như sau:
```
52 45 44 49 53 30 30 31 31  // Chuỗi nhận diện Magic string + số phiên bản (ASCII): "REDIS0011".
```

Header chứa chuỗi ma thuật `REDIS`, theo sau là 4 ký tự biểu thị số phiên bản RDB. Trong thử thách này, tất cả các file RDB kiểm thử đều sử dụng phiên bản 11. Do đó, header luôn luôn là `REDIS0011`.

#### Phân đoạn Metadata (Metadata section)

Tiếp theo là phân đoạn metadata. Phân đoạn này chứa 0 hoặc nhiều "phân đoạn con metadata" (metadata subsections), mỗi phân đoạn chỉ định một thuộc tính metadata riêng biệt. Dưới đây là ví dụ về một phân đoạn con metadata chỉ định thuộc tính `redis-ver`:
```
FA                             // Đánh dấu điểm bắt đầu của một phân đoạn con metadata.
09 72 65 64 69 73 2D 76 65 72  // Tên của thuộc tính metadata (mã hóa chuỗi): "redis-ver".
06 36 2E 30 2E 31 36           // Giá trị của thuộc tính metadata (mã hóa chuỗi): "6.0.16".
```

Tên và giá trị metadata luôn luôn được mã hóa chuỗi (string encoded).

#### Phân đoạn Cơ sở dữ liệu (Database section)

Kế tiếp là phân đoạn cơ sở dữ liệu. Nó chứa 0 hoặc nhiều "phân đoạn con cơ sở dữ liệu" (database subsections), mỗi phân đoạn mô tả một cơ sở dữ liệu riêng biệt. Dưới đây là ví dụ về một phân đoạn con cơ sở dữ liệu:
```
FE                       // Đánh dấu điểm bắt đầu của một phân đoạn con cơ sở dữ liệu.
00                       /* Chỉ số index của cơ sở dữ liệu (mã hóa kích thước).
                            Ở đây, index là 0. */

FB                       // Đánh dấu theo sau là thông tin kích thước bảng băm (hash table).
03                       /* Kích thước của bảng băm lưu trữ các key và value (mã hóa kích thước).
                            Ở đây, tổng kích thước bảng băm key-value là 3. */
02                       /* Kích thước của bảng băm lưu trữ thời gian hết hạn của các key (mã hóa kích thước).
                            Ở đây, số lượng key có thời gian hết hạn là 2. */
```

```
00                       /* Cờ 1-byte chỉ định kiểu và cách mã hóa của value.
                            Ở đây, cờ là 0, nghĩa là kiểu "string". */
06 66 6F 6F 62 61 72     // Tên của key (mã hóa chuỗi). Ở đây là "foobar".
06 62 61 7A 71 75 78     // Value (mã hóa chuỗi). Ở đây là "bazqux".
```

```
FC                       /* Cho biết key này ("foo") có thời gian hết hạn,
                            và timestamp hết hạn được biểu diễn bằng mili-giây (milliseconds). */
15 72 E7 07 8F 01 00 00  /* Timestamp hết hạn theo giờ Unix (Unix time),
                            lưu dưới dạng số nguyên không dấu 8-byte (8-byte unsigned long), theo chuẩn little-endian (đọc từ phải sang trái).
                            Ở đây, timestamp hết hạn là 1713824559637. */
00                       // Kiểu dữ liệu value là string.
03 66 6F 6F              // Tên key là "foo".
03 62 61 72              // Value là "bar".
```

```
FD                       /* Cho biết key này ("baz") có thời gian hết hạn,
                            và timestamp hết hạn được biểu diễn bằng giây (seconds). */
52 ED 2A 66              /* Timestamp hết hạn theo giờ Unix (Unix time),
                            lưu dưới dạng số nguyên không dấu 4-byte (4-byte unsigned integer), theo chuẩn little-endian (đọc từ phải sang trái).
                            Ở đây, timestamp hết hạn là 1714089298. */
00                       // Kiểu dữ liệu value là string.
03 62 61 7A              // Tên key là "baz".
03 71 75 78              // Value là "qux".
```

Dưới đây là mô tả chi tiết hơn về cách lưu trữ từng cặp key-value:

1. Thông tin hết hạn (tùy chọn - một trong các dạng sau):
    * Timestamp tính bằng giây:
          1.  `FD`
          2.  Timestamp hết hạn tính bằng giây (số nguyên không dấu 4-byte)
    * Timestamp tính bằng mili-giây:
          1.  `FC`
          2.  Timestamp hết hạn tính bằng mili-giây (số nguyên không dấu 8-byte)
2. Kiểu dữ liệu của value (cờ 1-byte)
3. Key (mã hóa chuỗi - string encoded)
4. Value (cách mã hóa tùy thuộc vào kiểu dữ liệu của value)

#### Phân đoạn Kết thúc file (End of file section)

Phân đoạn này đánh dấu điểm kết thúc của file. Cấu trúc của nó tương tự như sau:
```
FF                       /* Đánh dấu kết thúc file,
                            và theo sau là mã kiểm tra checksum. */
89 3b b7 4e f8 0f 77 19  // Mã kiểm tra CRC64 checksum 8-byte của toàn bộ file.
```

#### Mã hóa độ dài (Length encoding)

Các giá trị được mã hóa độ dài xác định chiều dài hoặc kích thước của một đối tượng dữ liệu. Dưới đây là một số ví dụ:
- Chỉ số index cơ sở dữ liệu và kích thước bảng băm được mã hóa độ dài.
- Mã hóa chuỗi bắt đầu bằng một giá trị mã hóa độ dài để chỉ định số lượng ký tự trong chuỗi.
- Mã hóa danh sách (list) bắt đầu bằng một giá trị mã hóa độ dài để chỉ định số lượng phần tử trong danh sách.

Hai bit đầu tiên (các bit có trọng số lớn nhất - MSB) của một giá trị mã hóa độ dài cho biết giá trị đó nên được phân tích cú pháp như thế nào. Dưới đây là bảng hướng dẫn (các bit được hiển thị ở cả dạng thập lục phân và nhị phân):
```
/* Nếu hai bit đầu tiên là 0b00:
   Độ dài chính là 6 bit còn lại của byte đó.
   Trong ví dụ này, độ dài là 10: */
0A
00001010

/* Nếu hai bit đầu tiên là 0b01:
   Độ dài là 14 bit tiếp theo
   (6 bit còn lại trong byte đầu tiên, kết hợp với byte tiếp theo),
   theo thứ tự big-endian (đọc từ trái sang phải).
   Trong ví dụ này, độ dài là 700: */
42 BC
01000010 10111100

/* Nếu hai bit đầu tiên là 0b10:
   Bỏ qua 6 bit còn lại của byte đầu tiên.
   Độ dài là 4 byte tiếp theo, theo thứ tự big-endian (đọc từ trái sang phải).
   Trong ví dụ này, độ dài là 17000: */
80 00 00 42 68
10000000 00000000 00000000 01000010 01101000

/* Nếu hai bit đầu tiên là 0b11:
   6 bit còn lại chỉ định một kiểu mã hóa chuỗi đặc biệt.
   Xem phần mã hóa chuỗi bên dưới. */
```

#### Mã hóa chuỗi (String encoding)

Một giá trị được mã hóa chuỗi bao gồm hai phần:
1.  Kích thước của chuỗi (được mã hóa kích thước).
2.  Chuỗi dữ liệu.

Ví dụ:
```
/* Kích thước 0x0D chỉ định chuỗi có độ dài 13 ký tự.
   Các ký tự tiếp theo ghép thành chuỗi "Hello, World!". */
0D 48 65 6C 6C 6F 2C 20 57 6F 72 6C 64 21
```

Đối với các kích thước bắt đầu bằng `0b11`, 6 bit còn lại biểu thị một định dạng chuỗi:
```
/* Kích thước 0xC0 biểu thị chuỗi là một số nguyên 8-bit.
   Trong ví dụ này, chuỗi có giá trị là "123". */
C0 7B

/* Kích thước 0xC1 biểu thị chuỗi là một số nguyên 16-bit.
   Các byte còn lại theo chuẩn little-endian (đọc từ phải sang trái).
   Trong ví dụ này, chuỗi có giá trị là "12345". */
C1 39 30

/* Kích thước 0xC2 biểu thị chuỗi là một số nguyên 32-bit.
   Các byte còn lại theo chuẩn little-endian (đọc từ phải sang trái).
   Trong ví dụ này, chuỗi có giá trị là "1234567". */
C2 87 D6 12 00

/* Kích thước 0xC3 biểu thị chuỗi được nén bằng thuật toán LZF.
   Bạn sẽ không gặp chuỗi nén LZF trong thử thách này. */
C3 ...
```
</details>


### Lệnh `KEYS` (The KEYS command)
<details>
  <summary>Nhấn để mở rộng/thu gọn</summary>

Lệnh [`KEYS`](https://redis.io/docs/latest/commands/keys/) trả về tất cả các key khớp với một mẫu (pattern) cho trước, dưới dạng một mảng RESP:
```
$ redis-cli SET foo bar
OK
$ redis-cli SET baz qux
OK
$ redis-cli KEYS "f*"
1) "foo"
```

Khi pattern là `*`, lệnh sẽ trả về tất cả các key hiện có trong cơ sở dữ liệu:
```
$ redis-cli KEYS "*"
1) "baz"
2) "foo"
```

Trong giai đoạn này, bạn phải bổ sung hỗ trợ cho lệnh `KEYS`. Tuy nhiên, bạn chỉ cần hỗ trợ pattern `*`.
</details>

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Tester sẽ tạo một file RDB chứa một key duy nhất và thực thi chương trình của bạn như sau:
```
$ ./your_program.sh --dir <dir> --dbfilename <filename>
```

Sau đó tester sẽ gửi lệnh `KEYS "*"` tới server của bạn:
```
$ redis-cli KEYS "*"
```

Server của bạn phải phản hồi bằng một mảng RESP chứa key đọc được từ file RDB:
```
*1\r\n$3\r\nfoo\r\n
```

### 💡 Lưu ý Quan trọng

- File RDB được chỉ định bởi `--dir` và `--dbfilename` có thể không tồn tại. Nếu file không tồn tại, chương trình của bạn phải coi cơ sở dữ liệu là rỗng.
- Các file RDB sử dụng cả định dạng little-endian và big-endian để lưu trữ các con số. Xem thêm [bài viết MDN về endianness](https://developer.mozilla.org/en-US/docs/Glossary/Endianness) để tìm hiểu chi tiết.
- Để tự tạo một file RDB, bạn có thể sử dụng lệnh [`SAVE`](https://redis.io/docs/latest/commands/save/).

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `Parse RDB key` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli Parse RDB key
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
// Cấu hình thư mục dir và file dbfilename
let dbDir = "/tmp";
let dbFileName = "dump.rdb";

// Khi nhận: CONFIG GET dir -> Trả về mảng RESP 2 phần tử ["dir", dbDir]
// Khi nhận: CONFIG GET dbfilename -> Trả về ["dbfilename", dbFileName]

// Đọc file RDB nhị phân:
import * as fs from "fs";
import * as path from "path";

const rdbPath = path.join(dbDir, dbFileName);
if (fs.existsSync(rdbPath)) {
  const rdbBuffer = fs.readFileSync(rdbPath);
  // Header: 5 bytes 'REDIS', 4 bytes version (0009 hoặc 0011)
  // Quét opcodes: 0xFE (Database Selector), 0xFB (Resize DB), 0xFD/0xFC (Expiry), 0x00 (String KV), 0xFF (EOF)
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

- [Đặc tả giao thức Redis (RESP2/RESP3)](https://redis.io/docs/latest/develop/reference/protocol-spec/)
- [Tài liệu chính thức về lệnh `Parse RDB key` trên Redis.io](https://redis.io/commands/)
- [Tổng quan thử thách CodeCrafters Redis](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
