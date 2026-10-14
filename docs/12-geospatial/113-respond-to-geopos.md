# Challenge 113: Lấy tọa độ kinh/vĩ độ của một hoặc nhiều địa điểm bằng GEOPOS (Respond to GEOPOS)

[⬅️ **Thử thách trước**: [112. Mã hóa cặp tọa độ (kinh độ, vĩ độ) thành số nguyên 52-bit Geohash](../12-geospatial/112-calculate-location-score.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [114. Giải mã số nguyên 52-bit Geohash ngược lại thành kinh độ và vĩ độ ban đầu](../12-geospatial/114-decode-coordinates.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 113 / 124** |
| **Mã định danh (Slug)** | `xg4` |
| **Tên tiếng Anh (Official Name)** | `Respond to GEOPOS` |
| **Phân loại Module** | 🗺️ **Dữ liệu Không gian địa lý (Geospatial)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `GEOPOS key member...` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Lấy tọa độ kinh/vĩ độ của một hoặc nhiều địa điểm bằng GEOPOS**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Respond to GEOPOS`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng tiếp nhận và phản hồi lệnh `GEOPOS`.

### 📖 Lệnh `GEOPOS`

Lệnh `GEOPOS` trả về tọa độ kinh độ và vĩ độ của các địa điểm được chỉ định.

Ví dụ sử dụng:

```bash
> GEOADD places -0.0884948 51.506479 "London"
> GEOADD places 11.5030378 48.164271 "Munich"

> GEOPOS places London
1) 1) "-0.08849412202835083"
   2) "51.50647814139934"

> GEOPOS places Munich
1) 1) "11.503036916255951"
   2) "48.16427086232978"
```

Câu lệnh trả về một mảng chứa một phần tử tương ứng với mỗi địa điểm được yêu cầu truy vấn:

- Nếu địa điểm tồn tại trong khóa, phần tử tương ứng là một mảng gồm 2 mục:
  - Kinh độ (được mã hóa dưới dạng [RESP Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings))
  - Vĩ độ (được mã hóa dưới dạng [RESP Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings))
- Nếu địa điểm hoặc khóa không tồn tại, phần tử tương ứng sẽ là một [Null Array](https://redis.io/docs/latest/develop/reference/protocol-spec/#null-arrays) `(*-1\r\n)`.

Để trả về tọa độ kinh độ và vĩ độ, Redis giải mã điểm số "score" Geohash ngược lại thành tọa độ gốc. Chúng ta sẽ xử lý thuật toán giải mã này ở thử thách tiếp theo; hiện tại bạn có thể tạm thời trả về tọa độ cố định là 0 (hoặc bất kỳ số thực hợp lệ nào).

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tester sẽ thêm nhiều địa điểm bằng lệnh `GEOADD`:

```bash
$ redis-cli
> GEOADD location_key -0.0884948 51.506479 "London"
# Kỳ vọng: (integer) 1
> GEOADD location_key 11.5030378 48.164271 "Munich"
# Kỳ vọng: (integer) 1
```

Sau đó tester sẽ gửi nhiều lệnh `GEOPOS`:

```bash
> GEOPOS location_key London Munich
# Kỳ vọng: [["0", "0"], ["0", "0"]], được mã hóa là "*2\r\n*2\r\n$1\r\n0\r\n$1\r\n0\r\n*2\r\n$1\r\n0\r\n$1\r\n0\r\n"

> GEOPOS location_key missing_location
# Kỳ vọng: [nil], được mã hóa là "*1\r\n*-1\r\n"
```

Tester sẽ xác thực rằng:

- Phản hồi là một mảng RESP chứa số lượng phần tử bằng đúng số lượng địa điểm được yêu cầu truy vấn
- Đối với từng địa điểm được yêu cầu:
  - Nếu địa điểm tồn tại:
    - Phần tử tương ứng là một mảng RESP gồm 2 phần tử (tức kinh độ và vĩ độ)
    - Cả hai phần tử đều là "0" (hoặc số thực hợp lệ bất kỳ), được mã hóa dưới dạng RESP Bulk String
  - Nếu địa điểm không tồn tại:
    - Phần tử tương ứng là một [Null Array](https://redis.io/docs/latest/develop/reference/protocol-spec/#null-arrays) `(*-1\r\n)`.

Tester cũng sẽ gửi lệnh `GEOPOS` với một khóa không tồn tại:

```bash
> GEOPOS missing_key London Munich
# Kỳ vọng: [nil, nil], được mã hóa là "*2\r\n*-1\r\n*-1\r\n"
```

Tester sẽ xác thực rằng:

- Phản hồi là một mảng RESP chứa số lượng phần tử bằng số địa điểm được yêu cầu
- Mỗi phần tử trong mảng đều là một [Null Array](https://redis.io/docs/latest/develop/reference/protocol-spec/#null-arrays) `(*-1\r\n)`

### 💡 Lưu ý Quan trọng

- Trong giai đoạn này, bạn có thể gán cố định giá trị kinh độ và vĩ độ trả về là 0 (hoặc bất kỳ số thực hợp lệ nào). Chúng ta sẽ kiểm tra tọa độ thực tế được giải mã ở thử thách tiếp theo.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `GEOPOS key member...` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli GEOPOS key member...
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
// Tính Geohash 52-bit từ (longitude, latitude) và lưu điểm số vào Sorted Set:
// Tọa độ hợp lệ: Longitude [-180, 180], Latitude [-85.05112878, 85.05112878]
// Dùng thuật toán Geohash nhị phân để đan xen (interleave) các bit của kinh độ và vĩ độ.

// Công thức khoảng cách Haversine giữa 2 tọa độ (lat1, lon1) và (lat2, lon2):
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6372797.560856; // Bán kính trái đất tính bằng mét trong Redis
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
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
- [Tài liệu chính thức về lệnh `GEOPOS key member...` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
