# Challenge 111: Lưu trữ vị trí địa lý vào Sorted Set nền tảng bên dưới (Store a location)

[⬅️ **Thử thách trước**: [110. Kiểm tra giới hạn hợp lệ của kinh độ [-180, 180] và vĩ độ [-85.05112878, 85.05112878]](../12-geospatial/110-validate-coordinates.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [112. Mã hóa cặp tọa độ (kinh độ, vĩ độ) thành số nguyên 52-bit Geohash](../12-geospatial/112-calculate-location-score.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 111 / 124** |
| **Mã định danh (Slug)** | `tn5` |
| **Tên tiếng Anh (Official Name)** | `Store a location` |
| **Phân loại Module** | 🗺️ **Dữ liệu Không gian địa lý (Geospatial)** |
| **Độ khó (Difficulty)** | `Trung bình` |
| **Lệnh Redis liên quan** | `GEOADD storage in zset` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Lưu trữ vị trí địa lý vào Sorted Set nền tảng bên dưới**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Store a location`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng lưu trữ dữ liệu địa điểm vào một Sorted Set.

### 📖 Lưu trữ dữ liệu địa điểm trong Sorted Set

Các địa điểm được thêm thông qua lệnh `GEOADD` trên thực tế được lưu trữ bên trong một Sorted Set. Redis tính toán điểm số (score) cho địa điểm dựa trên kinh độ và vĩ độ của nó.

Ví dụ: hai câu lệnh sau đây hoàn toàn tương đương nhau trong Redis:

```bash
# Thêm một địa điểm bằng GEOADD
$ redis-cli GEOADD places_key 2.2944692 48.8584625 location

# Câu lệnh này tương đương với lệnh GEOADD ở trên
$ redis-cli ZADD places_key 3663832614298053 location
```

Trong thử thách này, bạn sẽ cài đặt thao tác thêm địa điểm vào một Sorted Set khi lệnh `GEOADD` được thực thi.

Tạm thời bạn có thể gán cố định điểm số (score) là 0; thuật toán tính toán score thực tế sẽ được triển khai trong các thử thách tiếp theo.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi một lệnh `GEOADD`:

```bash
$ redis-cli GEOADD places 2.2944692 48.8584625 Paris
# Kỳ vọng: (integer) 1
```

Sau đó tester sẽ gửi lệnh `ZRANGE` để xác thực rằng địa điểm đã được thêm thành công vào Sorted Set:

```bash
$ redis-cli ZRANGE places 0 -1
# Kỳ vọng mảng RESP: ["Paris"]
```

### 💡 Lưu ý Quan trọng

- Trong giai đoạn này, bạn có thể gán cứng điểm số (score) của địa điểm bằng 0. Chúng ta sẽ tính toán score từ kinh độ và vĩ độ ở giai đoạn sau.
- Việc hiện thực hóa lệnh `ZRANGE` đã được đề cập trong phần mở rộng Sorted Sets.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `GEOADD storage in zset` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli GEOADD storage in zset
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
- [Tài liệu chính thức về lệnh `GEOADD storage in zset` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
