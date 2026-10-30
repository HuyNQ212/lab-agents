# Backend workflow — cơ chế chi tiết

> Ruột bước 2 và 3 của `implement` cho nhánh backend.
> Luật cứng: `lab-docs/architecture/backend.md` §10 + `.agents/AGENTS.md` luật 1–16.
> Mẫu code copy được: `lab-docs/architecture/backend-reference.md` — **trỏ tới, không copy vào đây**.
> Service mới chưa có khung: cấu trúc thư mục theo `lab-docs/architecture/backend.md` §2.1.

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
node .agents/scripts/lab.mjs repo-gate services/<repo>   # từ workspace root
```

Chạy `format:check → lint → typecheck → test → build` + kiểm pin exact và `package-lock.json`. Fail ở đâu sửa ở đó. Thiếu script gate → blocker, `capture` ticket `MAINT-`.

**Test phải dùng D1 thật** qua `@cloudflare/vitest-plugin` cho logic SQL/recurrence (cách dựng: `backend.md` §5.3). Mock repo chỉ dùng khi: tạo lỗi DB khó gây, hoặc assert call (§5.4). Port external **luôn** mock (không gọi Brevo/Telegram thật).

Repo chưa chạy được vitest với D1 thật (ví dụ `vitest.config.ts` còn `environment: 'node'`, chưa có pool workers và migration áp vào D1 test) → **blocker**: dừng theo giao thức của `SKILL.md`, `capture` ticket `SETUP-`/`MAINT-` dựng hạ tầng test. Không thay bằng deps giả.

Mỗi AC của ticket phải có ít nhất một test case ánh xạ. Không có → ticket chưa xong.

### Cổng 4 — Query cost (chỉ khi có query mới)

Với mỗi query mới hoặc đổi:

- [ ] Không full scan: có index tương ứng điều kiện `WHERE`/`ORDER BY`?
- [ ] `rows_read` không tăng tuyến tính với số bản ghi — đo bằng test trên D1 thật hoặc `EXPLAIN QUERY PLAN`
- [ ] Có index mới thì index đó phục vụ query **thật trong ticket**, không phải "phòng xa"

Ledger đã yêu cầu integration test đo `rows_read` cho refresh-token lookup. Áp cùng nguyên tắc cho query mới khác. Ghi câu SQL, query plan, `rows_read` vào `docs/delivery/<TICKET-ID>/query-cost.md`.

### Cổng 5 — Contract (chỉ khi thêm/đổi endpoint)

- [ ] Shape request/response khớp API contract trong `spec-backend.md` của ticket; có bên gọi thì khớp cả spec bên gọi (`spec-frontend.md` của cùng SPEC-ID, hoặc spec của service gọi qua Service Binding)
- [ ] Error code đúng prefix service, body `{ error: { code, message } }`
- [ ] Không leak stack/SQL/tên bảng
- [ ] Cần thêm field hoặc đổi shape → **ESCALATE**. Không sửa spec

Bỏ cổng này thì phiên FE sau sẽ bịa field, và lỗi chỉ nổ ở runtime production.

## Bằng chứng cho DoD

Ghi vào `services/<repo>/docs/delivery/<TICKET-ID>/` (chuẩn `documentation-standards.md` §2), không chỉ "đã chạy":

| Mục | File | Ghi gì |
|---|---|---|
| Gate | `gate-<TICKET-ID>.md` | Output `lab repo-gate`: từng bước, số test pass, thời gian |
| Migration | `gate-<TICKET-ID>.md` | Tên file `.sql` + đã apply local + bảng/cột tồn tại thật |
| Query mới | `query-cost.md` | Câu SQL, index dùng, `rows_read` quan sát được |
| Endpoint | `gate-<TICKET-ID>.md` | Một lời gọi thật: method, path, status, body rút gọn |

## Prompt review backend

Xem `references/review-protocol.md` §"Prompt mẫu — backend". Reviewer dùng checklist `spec-review/references/backend/checklist.md`.

## Dừng khi

Theo giao thức "Dừng giữa chừng" của `SKILL.md` — câu hỏi cho user đi qua gói quyết định.

- Migration cần sửa sau khi đã apply local (schema local đã lệch — cần quyết định reset hay migration bù).
- Test fail vì spec mâu thuẫn, không phải vì code sai.
- Cần bảng/cột chưa có trong `db-schema.md`.
- Cần truy cập D1 của service khác.
- Cần thêm binding hoặc thay đổi kiến trúc service.
- Reviewer yêu cầu đổi shape API (ESCALATE).
- Chưa chạy được vitest với D1 thật → `capture` ticket `SETUP-`/`MAINT-`.
