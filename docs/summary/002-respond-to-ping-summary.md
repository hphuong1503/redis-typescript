# Tổng Kết Chuyên Sâu: Challenge 002 (rg2) - Respond to PING

## 1. Thông Tin Thử Thách
- **Stage ID:** `rg2`
- **Tên thử thách:** Phản hồi lệnh PING đơn lẻ với `+PONG\r\n` (Respond to PING)
- **Module:** Nền tảng & Lệnh cơ bản (Core)
- **Độ khó:** Dễ
- **Giao thức:** RESP (Redis Serialization Protocol) - Simple String

---

## 2. Bản Chất Kỹ Thuật & Kiến Trúc (Architecture & Protocols)

### 2.1. Mô hình I/O: Event-Driven Non-Blocking
- **Single-Threaded Event Loop:** Giống như kiến trúc Reactor của Redis C gốc (dùng `epoll`/`kqueue`), Node.js và Bun quản lý các socket TCP bất đồng bộ trên một luồng chính duy nhất thông qua Event Loop.
- **Socket Event Lifecycle:**
  1. Khi client kết nối tới cổng 6379, callback `createServer((connection) => ...)` được kích hoạt, tạo ra một đối tượng `net.Socket`.
  2. Khi có dữ liệu nhị phân gửi đến từ client qua kết nối mạng, kernel copy dữ liệu vào receive buffer và kích hoạt sự kiện `data`.
  3. Server phản hồi thông qua `connection.write()`, đẩy dữ liệu vào send buffer của socket.

### 2.2. Giao thức RESP & Message Framing
- **TCP là Byte Stream:** TCP không có khái niệm ranh giới bản tin (packet/message boundary). Một sự kiện `data` nhận được có thể chứa 1 phần hoặc nhiều lệnh gộp lại.
- **Định dạng Simple String (`+`):**
  - Cú pháp: `+<StringContent>\r\n`
  - Với lệnh PING: `+PONG\r\n` (tổng cộng 7 byte ASCII: `+`, `P`, `O`, `N`, `G`, `\r`, `\n`).
- **Ký tự kết thúc `\r\n` (CRLF):** Là bất biến bắt buộc trong đặc tả RESP. Client parser dùng delimiter này để xác định điểm kết thúc của token/chuỗi. Nếu thiếu `\r` (`0x0D`), client sẽ chờ vô tận (hang).

---

## 3. Quyết Định Thiết Kế & Trade-offs (KISS vs Over-engineering)

| Giải pháp | Ưu điểm | Nhược điểm | Quyết định |
| :--- | :--- | :--- | :--- |
| **Cách 1: Full RESP State-Machine Parser** | Chuẩn hóa, xử lý được pipeline và streaming framing | Quá phức tạp cho stage đơn lẻ, dễ sinh lỗi sớm (Vi phạm KISS & YAGNI) | Dành cho các stage yêu cầu parse tham số (`ECHO`, `SET`, `GET`) |
| **Cách 2: Direct Event Write (KISS)** | Cực kỳ gọn gàng, độ trễ tối thiểu, xác thực đường truyền TCP | Chưa bóc tách được payload nếu client gửi lệnh khác | **Lựa chọn cho Stage rg2** |

---

## 4. Chi Tiết Triển Khai

### Mã nguồn (`app/main.ts`):
```typescript
import * as net from "node:net";

const server: net.Server = net.createServer((connection: net.Socket) => {
  // Lắng nghe sự kiện nhận dữ liệu từ client
  connection.on("data", () => {
    // Phản hồi Simple String +PONG\r\n theo chuẩn RESP
    connection.write("+PONG\r\n");
  });

  // Bắt lỗi socket để tránh crash server khi client đóng kết nối bất ngờ
  connection.on("error", () => {
    // Ignore socket error on abrupt client close
  });
});

server.listen(6379, "127.0.0.1");
```

---

## 5. Kết Quả Kiểm Thử Thực Nghiệm

### 5.1. Kiểm thử cục bộ (Local Integration Test)
- **Kịch bản:** Khởi chạy server và dùng client TCP gửi raw RESP `*1\r\n$4\r\nPING\r\n`.
- **Kết quả:**
  ```text
  RECEIVED RAW BYTES: "+PONG\r\n"
  TEST PASSED: Received exact +PONG\r\n
  ```

### 5.2. Kiểm thử tự động với CodeCrafters CLI
- **Lệnh thực thi:** `codecrafters test`
- **Output:**
  ```text
  [compile] Moved ./.codecrafters/run.sh → ./your_program.sh
  [compile] Compilation successful.

  [tester::#RG2] Running tests for Stage #RG2 (Respond to PING)
  [tester::#RG2] $ ./your_program.sh
  [tester::#RG2] [client] $ redis-cli PING
  [tester::#RG2] [client] ✔︎ Received "PONG"
  [tester::#RG2] Test passed.

  [tester::#JM1] Running tests for Stage #JM1 (Bind to a port)
  [tester::#JM1] $ ./your_program.sh
  [tester::#JM1] Connecting to port 6379...
  [tester::#JM1] Test passed.

  Test passed. Congrats!
  ```

---

## 6. Bài Học Kinh Nghiệm & Bẫy Thường Gặp
1. **CRLF vs LF:** Luôn sử dụng `\r\n` thay vì `\n`.
2. **Xử lý sự kiện lỗi Socket:** Cần đăng ký listener `connection.on("error")` để ngăn chặn `unhandled error event` làm sập process Node.js/Bun khi client gửi RST packet hoặc ngắt đột ngột.
3. **Chuẩn bị cho Stage tiếp theo (`wy1`):** Client sẽ gửi nhiều lệnh PING trên **cùng một kết nối duy nhất**. Nhờ việc sử dụng listener `connection.on("data")` không tự đóng socket (`connection.end()`), server đã sẵn sàng xử lý các lệnh tiếp theo trên kết nối này.
