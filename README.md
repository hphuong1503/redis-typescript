[![progress-banner](https://backend.codecrafters.io/progress/redis/6b51e13f-13db-4c87-941b-f61bab89fcd7)](https://app.codecrafters.io/users/hphuong1503?r=2qF)

This is a starting point for TypeScript solutions to the
["Build Your Own Redis" Challenge](https://codecrafters.io/challenges/redis).

In this challenge, you'll build a toy Redis clone that's capable of handling
basic commands like `PING`, `SET` and `GET`. Along the way we'll learn about
event loops, the Redis protocol and more.

**Note**: If you're viewing this repo on GitHub, head over to
[codecrafters.io](https://codecrafters.io) to try the challenge.

# Passing the first stage

The entry point for your Redis implementation is in `app/main.ts`. Study and
uncomment the relevant code, then run the command below to execute the tests on
our servers:

```sh
codecrafters submit
```

That's all!

# Stage 2 & beyond

Note: This section is for stages 2 and beyond.

1. Ensure you have `bun (1.3)` installed locally
1. Run `./your_program.sh` to run your Redis server, which is implemented in
   `app/main.ts`.
1. Run `codecrafters submit` to submit your solution to CodeCrafters. Test
   output will be streamed to your terminal.

---

## 🚀 Tiến Độ Thử Thách (Progress & Milestone Tracker)

| Stage | Slug | Tên Thử Thách | Trạng Thái | Tài Liệu & Đúc Kết |
| :---: | :---: | :--- | :---: | :--- |
| **001** | `jm1` | Bind to a port (6379) | ✅ Passed | [📖 Đề bài](./docs/01-core/001-bind-to-a-port.md) |
| **002** | `rg2` | Respond to PING (+PONG\r\n) | ✅ Passed | [📝 Summary](./docs/summary/002-respond-to-ping-summary.md) \| [📖 Đề bài](./docs/01-core/002-respond-to-ping.md) |
| **003** | `wy1` | Respond to multiple PINGs | ⏳ Next | [📖 Đề bài](./docs/01-core/003-respond-to-multiple-pings.md) |
| **004** | `zu2` | Handle concurrent clients | ⏹️ Queued | [📖 Đề bài](./docs/01-core/004-handle-concurrent-clients.md) |
| **005** | `qq0` | Implement the ECHO command | ⏹️ Queued | [📖 Đề bài](./docs/01-core/005-implement-the-echo-command.md) |
| **006** | `la7` | Implement SET & GET commands | ⏹️ Queued | [📖 Đề bài](./docs/01-core/006-implement-the-set-and-get-commands.md) |
| **007** | `yz1` | Expiry with PX option | ⏹️ Queued | [📖 Đề bài](./docs/01-core/007-expiry.md) |
