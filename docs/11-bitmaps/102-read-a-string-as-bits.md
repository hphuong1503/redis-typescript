# Challenge 102: Đọc các bit của một chuỗi String thông thường bằng lệnh GETBIT (Read a string as bits)

[⬅️ **Thử thách trước**: [101. Đọc giá trị của bit tại vị trí offset bất kỳ bằng lệnh GETBIT](../11-bitmaps/101-retrieve-a-bit.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [103. Đọc toàn bộ chuỗi byte nhị phân của Bitmap bằng lệnh GET](../11-bitmaps/103-read-bits-as-a-string.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 102 / 124** |
| **Mã định danh (Slug)** | `yj2` |
| **Tên tiếng Anh (Official Name)** | `Read a string as bits` |
| **Phân loại Module** | 🔢 **Thao tác dữ liệu Bit (Bitmaps)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `GETBIT on string value` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Đọc các bit của một chuỗi String thông thường bằng lệnh GETBIT**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Read a string as bits`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Thử thách này thuộc nhóm **Thao tác dữ liệu Bit (Bitmaps)**, tập trung vào việc hiện thực hóa lệnh `GETBIT on string value` trong Redis. Trong kiến trúc Redis thực tế, thao tác này được tối ưu hóa cho độ trễ cực thấp trong RAM và tuân thủ mô hình I/O non-blocking đơn luồng kết hợp Event Loop.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `GETBIT on string value` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli GETBIT on string value
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
// Bitmap trong Redis được biểu diễn bản chất là một chuỗi Buffer/String nhị phân.
// Byte thứ n tương ứng với các bit từ n*8 đến n*8 + 7 (MSB là bit 0, LSB là bit 7).
const bitmapStore = new Map<string, Buffer>();

function getBit(key: string, offset: number): number {
  const buf = bitmapStore.get(key);
  if (!buf) return 0;
  const byteIndex = Math.floor(offset / 8);
  if (byteIndex >= buf.length) return 0;
  const bitOffset = 7 - (offset % 8); // MSB ở bên trái
  return (buf[byteIndex] >> bitOffset) & 1;
}

function setBit(key: string, offset: number, value: number): number {
  let buf = bitmapStore.get(key) || Buffer.alloc(0);
  const byteIndex = Math.floor(offset / 8);
  // Nếu offset vượt quá độ dài hiện tại -> Mở rộng Buffer (Zero-padding)
  if (byteIndex >= buf.length) {
    const newBuf = Buffer.alloc(byteIndex + 1, 0);
    buf.copy(newBuf);
    buf = newBuf;
  }
  const bitOffset = 7 - (offset % 8);
  const originalBit = (buf[byteIndex] >> bitOffset) & 1;
  if (value === 1) {
    buf[byteIndex] |= (1 << bitOffset);
  } else {
    buf[byteIndex] &= ~(1 << bitOffset);
  }
  bitmapStore.set(key, buf);
  return originalBit; // Trả về giá trị bit cũ
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
- [Tài liệu chính thức về lệnh `GETBIT on string value` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
