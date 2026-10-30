# Checklist — spec-review (Pass 2), nhánh BACKEND

> Bộ câu hỏi phản biện. Không phải nguồn luật: ràng buộc nằm ở `lab-docs/architecture/backend.md` §10, `.agents/AGENTS.md` luật cứng 1–16, `lab-docs/frameworks/design-principles.md` và `lab-docs/decisions/decision-ledger.md`.
> **Vi phạm luật cứng 1–16 hoặc luật L1–L7b tối thiểu là BLOCKER**, kể cả khi mục dưới đây ghi mức thấp hơn.
> Dùng ở **Pass 2** của `spec-review`. Trục 1 (Boundary), 2 (Data ownership) và phần schema của trục 6 đã có quyết định trong Design Record → **đối chiếu ở Pass 1** (`references/conformance.md`); ở đây chỉ dùng như lưới an toàn khi Design Record chưa phủ, hoặc khi spec mâu thuẫn với chính nó.
> `implement` cũng dùng file này làm tiêu chí review diff.
> Mỗi mục: câu hỏi → dấu hiệu vi phạm → mức mặc định.

## 1. Boundary — dữ liệu thuộc Worker nào

- Mỗi bảng có đúng một Worker sở hữu? → hai service cùng ghi một bảng = **BLOCKER**.
- Có `SELECT`/`INSERT` nào trỏ D1 của service khác? → **BLOCKER** (backend.md §10.4, system-overview.md).
- Service cần dữ liệu của service khác: dùng Service Binding, hay nhận snapshot trong payload? → đọc chéo D1 = **BLOCKER**.
- Chiều gọi có hợp lý? Caller có phải public entry không? → service private gọi ngược ra ngoài public URL = **BLOCKER**.
- Binding có được khai báo trong `wrangler.jsonc` của **caller**? → binding ngầm định = **MAJOR**.
- Có vòng gọi A→B→A cho một request? → **MAJOR** (deadlock/latency; nêu hướng cắt).
- Deploy order có được ghi khi thêm binding mới? → thiếu = **MAJOR** (deploy caller trước callee sẽ fail).

## 2. Data ownership

- Có dữ liệu bị nhân bản giữa hai D1? → cần trả lời: ai là source of truth, đồng bộ một chiều hay chấp nhận stale.
- Bản sao có timestamp/version để phát hiện cũ? → không có = **MAJOR**.
- Notification/Planning có lưu ID của nhau mà không có cách xử lý khi bên kia xoá/archive? → **MAJOR**.
- Có trường dẫn xuất (derived) lưu DB mà có thể tính lại? → **MINOR**, trừ khi cần index/query.

## 3. Contract

- Shape response có ổn định cho consumer hiện tại? Thêm field là additive; đổi tên/xoá field là phá vỡ.
- Error code theo `<SERVICE>_<REASON>`? → sai prefix = **MAJOR** (không phân biệt được nguồn lỗi).
- Body lỗi đúng `{ "error": { "code", "message" } }`? → khác = **MAJOR**.
- Có leak stack, SQL, tên bảng, chi tiết nội bộ ra response? → **BLOCKER** (backend.md §10.2).
- Status code khớp ngữ nghĩa: 400 validation, 401 thiếu/sai context, 403 thiếu quyền, 404 không tồn tại, 409 xung đột, 422 business rule?
- Input validate bằng `z.strictObject`? → passthrough/unknown key = **MAJOR** (backend.md §10.1).
- Date-only dùng `z.iso.date()` **và** có kiểm tra ngày hợp lệ (`2026-02-30`)? → thiếu kiểm tra business = **MAJOR**.
- Có endpoint nào không phục vụ story nào trong dòng `**Stories:**`? → **MAJOR** (khớp C10 trong `conformance.md`).
- Response có phụ thuộc thứ tự mảng mà không khai báo sort? → **MINOR**.

## 4. Failure mode

- Thao tác ghi có idempotent khi client retry? → không có khoá/idempotency key = **MAJOR**.
- Partial failure: ghi DB xong, gọi service khác lỗi — trạng thái cuối là gì? → không mô tả = **MAJOR**.
- Gọi service khác lỗi: fail cả request, hay degrade? → spec không nói = **QUESTION**.
- Có retry? Retry có giới hạn và chỉ cho lỗi transient? → retry vô hạn = **MAJOR**.
- Cron/reminder chạy lại sau lỗi có gửi trùng? → không có dedup = **MAJOR** (ghi rõ nếu DEFERRED thì vẫn phải nêu hệ quả).
- Timeout của call nội bộ có được đặt? → không = **MINOR**, trừ khi nằm trong request đồng bộ dài → **MAJOR**.

## 5. AuthZ

- Gateway xác thực, service quyết resource-level — spec có nói rõ chỗ nào kiểm gì? → mơ hồ = **MAJOR**.
- Mọi endpoint có khai báo context yêu cầu (`UserContext`/`SystemContext`)? → thiếu = **BLOCKER**.
- Có kiểm tra quyền trên **resource cụ thể** hay chỉ kiểm "đã đăng nhập"? → chỉ authenticated = **BLOCKER** nếu dữ liệu thuộc user khác.
- `X-Lab-Context` do caller strip-and-set? → forward nguyên header từ client = **BLOCKER** (backend.md §10.3).
- Có dùng `readRequestIdBestEffort` cho authz? → **BLOCKER** (`lab-docs/architecture/backend-reference.md`, mục `readRequestIdBestEffort`: chỉ dùng cho logging).
- Có `userId: string | null`? → **BLOCKER** (AGENTS.md luật 16, backend.md §10.3).
- Dev bypass (`ENVIRONMENT === 'local'`) có bị giới hạn đúng? → bypass theo header thay vì env = **BLOCKER**.

## 6. Schema D1

- Mọi bảng `STRICT`? → **BLOCKER** (backend.md §10.5).
- Timestamp là `INTEGER` epoch ms? → `TEXT` datetime, `CURRENT_TIMESTAMP`, `strftime('%s','now')` = **BLOCKER** (trả giây).
- Date-only là `TEXT` + CHECK GLOB đúng format? → **BLOCKER**.
- GLOB pattern ≤ 50 bytes? → vượt = **MAJOR** (giới hạn D1).
- Mỗi index mới có câu SQL cụ thể + `EXPLAIN QUERY PLAN` + `rows_read` trước/sau, và phục vụ `UNIQUE`, khóa ngoại hoặc truy vấn đã biết? → thiếu, index "chuẩn bị trước", hoặc trùng cột đầu với index khác = **BLOCKER** (design-principles L6b). Query thường xuyên không index = **MAJOR**.
- Có UNIQUE đúng nghiệp vụ (ví dụ một occurrence/ngày/event)? → thiếu = **MAJOR**.
- Xoá dữ liệu: soft delete hay hard delete, đã chốt chưa? → chưa = **QUESTION**.
- Migration forward-only, additive? `RENAME`/`DROP TABLE` = **BLOCKER** (backend.md §10.5).
- Migration có áp local trước remote, có bước verify? → thiếu = **MAJOR**.
- Backfill idempotent, không sửa `d1_migrations`? → **BLOCKER** nếu sửa tay bảng đó.
- Số bound param/query ≤ 100 khi ghi hàng loạt? → vượt = **MAJOR** (backend.md §10.7).
- Có `SELECT *`, `RETURNING`, hay `db.prepare().bind().run()` trực tiếp trong spec? → **BLOCKER** (backend.md §10.6, §10.7).
- Có cột nào lưu JSON blob cho dữ liệu cần query/lọc? → **MAJOR** nếu spec có query theo field bên trong.

## 7. Test seam

- Mỗi AC có ít nhất một test case, hoặc ghi rõ thuộc ticket khác? → thiếu = **MAJOR**.
- Test dùng D1 thật cho logic SQL/recurrence? → mock D1 = **MAJOR** (backend.md §5.2; ledger: "D1 thật là mặc định").
- Mock repo chỉ dùng cho lỗi DB khó gây/assert call? → mock thay thế test tích hợp = **MAJOR**.
- Port external luôn mock? → gọi Brevo/Telegram thật trong test = **BLOCKER**.
- Có cast `as unknown as` trong test? → **MAJOR** (backend.md §5.4).
- Có E2E browser trong phạm vi spec? → **MINOR** (backend.md §5.1: không E2E browser tự động).

## 8. Scope hygiene

- Mọi ticket có `Blocked by` và repo? → thiếu = **MINOR**.
- Có công nghệ mới ngoài ledger DECIDED? → **BLOCKER** nếu là hạ tầng chưa DECIDED (KV/DO/Redis; Queues đã DECIDED 2026-10-27); **MAJOR** nếu là thư viện.
- Spec có chép lại AC hoặc mô tả code từng dòng? → **MINOR**.
- Có OPEN nào bị trả lời ngầm trong spec? → **MAJOR**.
- Có ticket nào gộp nhiều outcome không liên quan? → **MINOR**.
- Spec có lấn sang nội dung frontend (state, cache, trạng thái UI) không? → **MINOR**: nhắc user rằng phần đó thuộc `spec-frontend.md` và checklist frontend.

## 9. Luật cứng code khi spec có mã mẫu

Ở spec-review chỉ áp khi spec có mã/SQL mẫu; `implement` áp cho mọi diff. Mọi vi phạm = **BLOCKER** (`.agents/AGENTS.md`).

- Ghi hàng loạt bằng vòng lặp từng câu thay vì `db.batch()`? (luật 9)
- Repository factory dùng `this`? (luật 10)
- `console.log` với template string thay vì `log(level, message, fields)`? (luật 11)
- `error-handler.ts` dùng `c.get('deps')` thay vì `c.var.deps`? (luật 12)
- `deps` cache ở module scope thay vì `createDeps(env, ctx)` mỗi request? (luật 13)
- Dùng `Extract<RequestContext, ...>` thay vì named type + `if` narrowing? (luật 14)
- Gọi public URL cho internal service call thay vì Service Binding? (luật 15)
