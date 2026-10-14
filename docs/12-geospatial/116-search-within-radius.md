# Challenge 116: Tìm kiếm các địa điểm nằm trong bán kính quy định bằng lệnh GEOSEARCH (Search within radius)

[⬅️ **Thử thách trước**: [115. Tính khoảng cách địa lý giữa hai địa điểm bằng lệnh GEODIST (Haversine)](../12-geospatial/115-calculate-distance.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [117. Phản hồi lệnh ACL WHOAMI trả về username hiện tại (mặc định 'default')](../13-authentication/117-respond-to-acl-whoami.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 116 / 124** |
| **Mã định danh (Slug)** | `rm9` |
| **Tên tiếng Anh (Official Name)** | `Search within radius` |
| **Phân loại Module** | 🗺️ **Dữ liệu Không gian địa lý (Geospatial)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `GEOSEARCH key FROMLONLAT...` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Tìm kiếm các địa điểm nằm trong bán kính quy định bằng lệnh GEOSEARCH**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Search within radius`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng tìm kiếm các địa điểm trong phạm vi bán kính xác định bằng lệnh `GEOSEARCH`.

### 📖 Lệnh `GEOSEARCH`

Lệnh `GEOSEARCH` cho phép bạn tìm kiếm các địa điểm nằm trong một bán kính cụ thể.

Lệnh này hỗ trợ nhiều chế độ tìm kiếm khác nhau. Trong phạm vi thử thách này, chúng ta sẽ tập trung vào chế độ `FROMLONLAT`. Chế độ `FROMLONLAT` thực hiện tìm kiếm dựa trên tọa độ tâm được chỉ định trực tiếp bằng kinh độ và vĩ độ.

Ví dụ sử dụng:

```bash
> GEOSEARCH places FROMLONLAT 2 48 BYRADIUS 100 m
1) "Paris"
```

Ví dụ lệnh trên tìm kiếm các địa điểm trong khóa `places` nằm trong phạm vi 100 mét tính từ điểm tâm có tọa độ (kinh độ: 2, vĩ độ: 48).

Phản hồi là một mảng RESP chứa tên các địa điểm thỏa mãn điều kiện tìm kiếm, mỗi tên địa điểm được mã hóa dưới dạng [chuỗi RESP Bulk String](https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings).

Lưu ý có hai tùy chọn được truyền vào câu lệnh:

- `FROMLONLAT <longitude> <latitude>` — Tùy chọn này xác định tọa độ điểm tâm để quét tìm kiếm.
- `BYRADIUS <radius> <unit>` — Tùy chọn này giới hạn vùng quét hình tròn theo bán kính và đơn vị chỉ định (m, km, mi, v.v.).

Redis còn hỗ trợ các tùy chọn khác, nhưng trong thử thách này chúng ta chỉ cần xử lý hai tùy chọn `FROMLONLAT` và `BYRADIUS`.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tester sẽ thêm nhiều địa điểm bằng lệnh `GEOADD`:

```bash
$ redis-cli
> GEOADD places 11.5030378 48.164271 "Munich"
> GEOADD places 2.2944692 48.8584625 "Paris"
> GEOADD places -0.0884948 51.506479 "London"
```

Tester sau đó sẽ gửi nhiều lệnh `GEOSEARCH`:

```bash
> GEOSEARCH places FROMLONLAT 2 48 BYRADIUS 100000 m
# Kỳ vọng ["Paris"]

> GEOSEARCH places FROMLONLAT 2 48 BYRADIUS 500000 m
# Kỳ vọng ["Paris", "London"] (Thứ tự bất kỳ)

> GEOSEARCH places FROMLONLAT 11 50 BYRADIUS 300000 m
# Kỳ vọng ["Munich"]
```

Tester sẽ xác thực phản hồi là một mảng RESP, ví dụ:

```
*2\r\n
$5\r\n
Paris\r\n
$6\r\n
London\r\n
```

Các địa điểm có thể được trả về theo bất kỳ thứ tự nào.

### 💡 Lưu ý Quan trọng

- Tester sẽ luôn sử dụng kết hợp hai tùy chọn `FROMLONLAT` và `BYRADIUS` khi gửi lệnh `GEOSEARCH`.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `GEOSEARCH key FROMLONLAT...` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli GEOSEARCH key FROMLONLAT...
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
- [Tài liệu chính thức về lệnh `GEOSEARCH key FROMLONLAT...` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
