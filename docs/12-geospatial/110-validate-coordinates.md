# Challenge 110: Kiểm tra giới hạn hợp lệ của kinh độ [-180, 180] và vĩ độ [-85.05112878, 85.05112878] (Validate coordinates)

[⬅️ **Thử thách trước**: [109. Tiếp nhận và phản hồi lệnh thêm tọa độ địa lý GEOADD](../12-geospatial/109-respond-to-geoadd.md)] | [🏠 **Mục lục Tổng quan**](../README.md) | [**Thử thách tiếp theo**: [111. Lưu trữ vị trí địa lý vào Sorted Set nền tảng bên dưới](../12-geospatial/111-store-a-location.md) ➡️]

---

## 📌 Bảng thông tin Thử thách

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Thứ tự (Index)** | **Challenge 110 / 124** |
| **Mã định danh (Slug)** | `ck3` |
| **Tên tiếng Anh (Official Name)** | `Validate coordinates` |
| **Phân loại Module** | 🗺️ **Dữ liệu Không gian địa lý (Geospatial)** |
| **Độ khó (Difficulty)** | `Dễ` |
| **Lệnh Redis liên quan** | `GEOADD bounds validation` |
| **Giao thức áp dụng** | `RESP (Redis Serialization Protocol)` |

---

## 🎯 1. Mục tiêu thử thách (Objective)

Mục tiêu chính của thử thách này là:
- **Kiểm tra giới hạn hợp lệ của kinh độ [-180, 180] và vĩ độ [-85.05112878, 85.05112878]**: Cài đặt hoặc mở rộng bộ xử lý Redis để xử lý thành công tính năng `Validate coordinates`.
- Đảm bảo tuân thủ chuẩn giao thức RESP và đáp ứng các kịch bản kiểm thử tự động của CodeCrafters.
- Nâng cấp server Redis viết bằng **TypeScript** để vận hành ổn định trên nền tảng **Bun / Node.js**.

---

## 🧠 2. Kiến thức cốt lõi & Giao thức RESP (Core Concepts & Protocol)

### 2.1. Bản chất kỹ thuật của tính năng
Trong thử thách này, bạn sẽ bổ sung tính năng kiểm tra tính hợp lệ của các giá trị kinh độ và vĩ độ được truyền vào lệnh `GEOADD`.

### 📖 Xác thực giá trị kinh độ và vĩ độ

Các giá trị kinh độ và vĩ độ trong lệnh `GEOADD` bắt buộc phải nằm trong phạm vi quy định chuẩn theo hệ tọa độ [EPSG:3857](https://epsg.io/3857).

- Kinh độ hợp lệ nằm trong khoảng từ -180° đến +180°
  - Cả hai mốc giới hạn này đều tính bao gồm (inclusive), do đó cả -180° và +180° đều hợp lệ.
- Vĩ độ hợp lệ nằm trong khoảng từ -85.05112878° đến +85.05112878°
  - Cả hai mốc giới hạn này đều tính bao gồm, do đó cả -85.05112878° và +85.05112878° đều hợp lệ.
  - Lý do giới hạn vĩ độ không phải là -/+90° là do phép chiếu bản đồ [Web Mercator projection](https://en.wikipedia.org/wiki/Web_Mercator_projection) mà Redis sử dụng.

Nếu một trong hai giá trị không nằm trong dải cho phép, `GEOADD` sẽ trả về thông báo lỗi. Ví dụ:

```bash
# Vĩ độ không hợp lệ
> GEOADD places 180 90 test1
(error) ERR invalid longitude,latitude pair 180.000000,90.000000

# Kinh độ không hợp lệ
> GEOADD places 181 0.3 test2
(error) ERR invalid longitude,latitude pair 181.000000,0.300000
```

Trong thử thách này, bạn sẽ cài đặt kiểm tra giá trị kinh độ và vĩ độ, đồng thời trả về thông báo lỗi như trên. Tester kiểm tra thông báo lỗi khá linh hoạt, nên bạn không bắt buộc phải trả về chính xác 100% từng ký tự như định dạng mẫu.

### 🧪 Kịch bản Kiểm thử từ CodeCrafters

Bộ kiểm thử (tester) sẽ khởi chạy chương trình Redis của bạn như sau:

```bash
$ ./your_program.sh
```

Sau đó tester sẽ gửi nhiều lệnh `GEOADD` khác nhau.

Nếu tọa độ không hợp lệ, tester kỳ vọng nhận về phản hồi lỗi. Ví dụ:

```bash
# Kỳ vọng thông báo lỗi
$ redis-cli GEOADD location_key 200 100 foo
(error) ERR invalid longitude,latitude pair 200,100
```

Giá trị trả về bắt buộc phải:

- Là một chuỗi [RESP Simple Error](https://redis.io/docs/latest/develop/reference/protocol-spec/#simple-errors), tức bắt đầu bằng ký tự `-` và kết thúc bằng `\r\n`
- Thông báo lỗi phải bắt đầu bằng `ERR`, tương tự như các thông báo lỗi chuẩn của Redis
- Thông báo lỗi phải chứa từ "latitude" nếu vĩ độ không hợp lệ
- Thông báo lỗi phải chứa từ "longitude" nếu kinh độ không hợp lệ

Ví dụ: nếu vĩ độ không hợp lệ, các thông báo lỗi hợp lệ mà tester sẽ chấp nhận bao gồm:

```bash
-ERR invalid latitude argument\r\n
-ERR invalid latitude value\r\n
-ERR latitude value (200.0) is invalid\r\n
```

### 💡 Lưu ý Quan trọng

- Bạn chưa cần lưu trữ địa điểm vào cấu trúc dữ liệu ở bước này; việc lưu trữ sẽ được thực hiện trong các thử thách tiếp theo.
- Ranh giới vĩ độ bị cắt ở mức -/+85.05112878° thay vì -/+90° do bản chất phép chiếu hình trụ Web Mercator mà Redis áp dụng.

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

Tiếp theo, tester sẽ đóng vai trò client kết nối tới port TCP chỉ định (mặc định là `6379`), gửi dữ liệu kiểm thử tương ứng với lệnh `GEOADD bounds validation` và so sánh từng byte phản hồi nhận được từ socket với kỳ vọng.

```bash
# Ví dụ tương tác từ redis-cli:
$ redis-cli GEOADD bounds validation
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
- [Tài liệu chính thức về lệnh `GEOADD bounds validation` trên Redis.io](https://redis.io/commands/)
- [CodeCrafters Redis Challenge Overview](https://app.codecrafters.io/courses/redis/overview)
- [Mã nguồn khởi động TypeScript tại `app/main.ts`](../../app/main.ts)
