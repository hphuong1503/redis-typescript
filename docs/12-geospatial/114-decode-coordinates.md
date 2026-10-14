# Challenge 114: Giải mã số nguyên 52-bit Geohash ngược lại thành kinh độ và vĩ độ ban đầu (Decode coordinates)

[⬅️ **Thử thách trước**: [113. Lấy tọa độ kinh/vĩ độ của một hoặc nhiều địa điểm bằng GEOPOS](../12-geospatial/113-respond-to-geopos.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [115. Tính khoảng cách địa lý giữa hai địa điểm bằng lệnh GEODIST (Haversine)](../12-geospatial/115-calculate-distance.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 114 / 124** |
| **Mã định danh (Slug)** | `hb5` |
| **Tên tiếng Anh (Official Name)** | `Decode coordinates` |
| **Phân loại Module** | 🗺️ **Dữ liệu Không gian địa lý (Geospatial)** |
| **Độ khó (Difficulty)** | `Khó` |
| **Lệnh Redis liên quan** | `52-bit Geohash decoding` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Giải mã số nguyên 52-bit Geohash ngược lại thành kinh độ và vĩ độ ban đầu**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Decode coordinates`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng giải mã tọa độ (kinh độ, vĩ độ) từ điểm số Geohash của địa điểm.

### 📖 Giải mã kinh độ và vĩ độ từ điểm số Geohash

Thuật toán khôi phục lại kinh độ và vĩ độ về bản chất là quy trình ngược lại của thuật toán tính toán điểm số Geohash 52-bit từ tọa độ.

[Kho lưu trữ GitHub](https://github.com/codecrafters-io/redis-geocoding-algorithm) đã tham chiếu trước đó giải thích chi tiết quy trình chuyển đổi này. Bao gồm:

- Bản mô tả thuật toán kèm mã giả (pseudocode)
- Các đoạn mã ví dụ minh họa bằng nhiều ngôn ngữ lập trình
- Bộ dữ liệu kiểm thử gồm các địa điểm và điểm số tương ứng

Đường dẫn kho mã nguồn tham khảo: [redis-geocoding-algorithm](https://github.com/codecrafters-io/redis-geocoding-algorithm).

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Tester sẽ thêm nhiều địa điểm bằng lệnh `ZADD`. Các điểm số được sử dụng là các giá trị hợp lệ có thể giải mã ngược lại thành tọa độ kinh độ và vĩ độ:

```bash
$ redis-cli
> ZADD location_key 3663832614298053 "Foo"
> ZADD location_key 3876464048901851 "Bar"
> ZADD location_key 3468915414364476 "Baz"
> ZADD location_key 3781709020344510 "Caz"
```

Tester sau đó sẽ gửi nhiều lệnh `GEOPOS`:

```bash
> GEOPOS location_key Foo
# Kỳ vọng [["2.294471561908722", "48.85846255040141"]]
```

Tester sẽ xác thực phản hồi là một mảng RESP, được mã hóa như sau:

```
*1\r\n
*2\r\n
$17\r\n
2.294471561908722\r\n
$17\r\n
48.85846255040141\r\n
```

### 💡 Lưu ý Quan trọng

- Phép chuyển đổi giữa kinh độ/vĩ độ sang điểm số Geohash và ngược lại có thể bị hao hụt độ chính xác (lossy), do đó tester kiểm tra tọa độ khá nới lỏng - chấp nhận bất kỳ tọa độ nào sai lệch trong phạm vi 6 chữ số thập phân so với giá trị ban đầu. Ví dụ: đối với mẫu trên, bất kỳ giá trị nào sau đây đều được chấp nhận:
  - `["2.2944715", "48.8584625"]`
  - `["2.294472", "48.858463"]`
  - `["2.294471594", "48.858462987"]`

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `52-bit Geohash decoding` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli 52-bit Geohash decoding
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
- [Tài liệu chính thức về lệnh `52-bit Geohash decoding` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
