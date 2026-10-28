# Backend workflow — cơ chế chi tiết

> Ruột bước 2 và 3 của `implement` cho nhánh backend.
> Luật cứng: `lab-docs/architecture/backend.md` §10 + `.agents/AGENTS.md` luật 1–16.
> Mẫu code copy được: `lab-docs/architecture/backend-reference.md` — **trỏ tới, không copy vào đây**.

## Cổng bắt buộc, theo thứ tự

### Cổng 1 — Migration (chỉ khi ticket chạm schema)

**Phải xong trước khi viết code phụ thuộc.** Code viết trước migration sẽ dùng tên cột đoán.

| # | Bước | Fail thì |
|---|---|---|
| 1 | Viết file `.sql` trong `migrations/`, số thứ tự tiếp theo | — |
| 2 | Đọc lại: forward-only? additive? không `RENAME`/`DROP TABLE`? (luật 6) | Sửa file, không sửa sau khi đã apply |
| 3 | Mọi bảng mới `STRICT` (luật 4) | Sửa |
| 4 | Timestamp `INTEGER` epoch ms (luật 5); date-only `TEXT` + CHECK GLOB | Sửa |
| 5 | Áp **local**: `wrangler d1 migrations apply <DB> --local` | Đọc lỗi SQL, sửa file |
| 6 | Verify: bảng/cột/index tồn tại thật | Không thì migration chưa chạy |
| 7 | Verify: `d1_migrations` có dòng mới (luật 7 — không sửa tay) | Điều tra trước khi tiếp |

⚠️ **Chưa verify (ghi trong handoff):** một file `.sql` có chạy trong **một** transaction không. Nếu không, file nhiều câu lệnh fail giữa chừng sẽ để lại schema nửa vời. Với file nhiều bước: **tách thành nhiều file nhỏ** để giảm phạm vi hỏng, và ghi rõ cách phục hồi trước khi apply remote (việc của `ship`).

**Không bao giờ** apply remote ở bước này. Remote là việc của `ship`.

### Cổng 2 — Implement

Viết code theo vertical slice của ticket: `routes / handlers / repositories / ports / adapters / domain`.

Nhắc nhanh những chỗ hay vi phạm:

| Luật | Hay vi phạm ở đâu |
|---|---|
| 1 — cấm `SELECT *` | Lười liệt kê cột khi thêm cột mới |
| 2 — cấm `prepare().bind().run()` trực tiếp | Viết nhanh trong handler |
| 3 — cấm `RETURNING` | Muốn lấy id sau insert |
| 8–9 — chunk 100 param, dùng `db.batch()` | Insert nhiều dòng |
| 10 — cấm `this` | Factory repository |
| 11 — cấm `console.log` template string | Debug tạm |
| 13 — cấm cache `deps` ở module scope | Tối ưu sớm |
| 16 — cấm `userId: string \| null` | Thêm field tuỳ tiện |

### Cổng 3 — Test + gate máy

```bash
npm run typecheck
npm run lint
npm test
```

Thứ tự rẻ trước. Fail ở đâu sửa ở đó.

**Test phải dùng D1 thật** qua `@cloudflare/vitest-plugin` cho logic SQL/recurrence. Mock repo chỉ dùng khi: tạo lỗi DB khó gây, hoặc assert call. Port external **luôn** mock (không gọi Brevo/Telegram thật).

Mỗi AC của ticket phải có ít nhất một test case ánh xạ. Không có → ticket chưa xong.

### Cổng 4 — Query cost (chỉ khi có query mới)

Với mỗi query mới hoặc đổi:

- [ ] Không full scan: có index tương ứng điều kiện `WHERE`/`ORDER BY`?
- [ ] `rows_read` không tăng tuyến tính với số bản ghi — đo bằng test hoặc explain
- [ ] Có index mới thì index đó phục vụ query **thật trong ticket**, không phải "phòng xa"

Ledger đã yêu cầu integration test đo `rows_read` cho refresh-token lookup. Áp cùng nguyên tắc cho query mới khác.

### Cổng 5 — Contract (chỉ khi thêm/đổi endpoint)

- [ ] Shape response khớp `spec-frontend.md` §6.1 (zod schema phía FE)
- [ ] Error code đúng prefix service, body `{ error: { code, message } }`
- [ ] Không leak stack/SQL/tên bảng
- [ ] Nếu thêm field hoặc đổi shape → **cập nhật `spec-frontend.md`** hoặc ESCALATE

Bỏ cổng này thì phiên FE sau sẽ bịa field, và lỗi chỉ nổ ở runtime production.

## Bằng chứng cho DoD

Ghi lại, không chỉ "đã chạy":

| Mục | Ghi gì |
|---|---|
| Test | Lệnh + số test pass + thời gian |
| Typecheck / lint | Sạch, không warning mới |
| Migration | Tên file `.sql` + đã apply local |
| Query mới | Bảng/cột bị đọc, index dùng, `rows_read` quan sát được |
| Endpoint | Một lời gọi thật: method, path, status, body rút gọn |

## Prompt review backend

Xem `references/review-protocol.md` §"Prompt mẫu — backend". Reviewer dùng checklist `spec-review/references/backend/checklist.md`.

## Dừng và báo user khi

- Migration cần sửa sau khi đã apply local (schema local đã lệch — cần quyết định reset hay migration bù).
- Test fail vì spec mâu thuẫn, không phải vì code sai.
- Cần bảng/cột chưa có trong `db-schema.md`.
- Cần truy cập D1 của service khác.
- Cần thêm binding hoặc thay đổi kiến trúc service.
- Reviewer yêu cầu đổi shape API (ESCALATE).
