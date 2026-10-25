# AGENTS.md — Lab Workspace

> Hướng dẫn cho AI agents làm việc trong workspace `personal-lab`.
> Đọc file này TRƯỚC khi thực hiện bất kỳ thao tác nào.

## Workspace layout

Workspace `personal-lab` là multi-repo container, KHÔNG có git root.
Mỗi thư mục con là một git repo độc lập của tài khoản GitHub `HuyNQ212`.

**Quan trọng:** Cấu trúc thư mục và quy tắc clone được định nghĩa trong
[setup.md](setup.md). LUÔN đọc `setup.md` trước khi clone, tạo repo,
hoặc tham chiếu đường dẫn — không đoán layout từ trí nhớ phiên chat.

## Source of truth

| Nội dung | Nơi tham chiếu |
|---|---|
| Quyết định product & kiến trúc | `lab-docs/README.md`, `lab-docs/decisions/decision-ledger.md` |
| Kiến trúc hệ thống | `lab-docs/architecture/system-overview.md` |
| Kiến trúc backend (layering, test, deploy) | `lab-docs/architecture/backend.md` |
| Mẫu code tham chiếu backend (copy được) | `lab-docs/architecture/backend-reference.md` |
| Frontend & UX | `lab-docs/architecture/frontend.md` |
| IAM | `lab-docs/architecture/iam.md` |
| Local dev & secrets | `lab-docs/architecture/local-development.md` |
| Workflow phân rã giao việc | `lab-docs/frameworks/delivery-breakdown.md` |
| Workflow kỹ thuật (spec → ship) | `lab-docs/frameworks/engineering-workflow.md` |
| Prototypes đã publish | `lab-prototype/` (repo `lab-prototype`) |
| Production code | `services/lab-*` (Workers), `apps/lab-portal` (React) |

- Prototype được publish vào `lab-prototype`; production code là source of truth về implementation.
- `lab-docs` là source of truth về các quyết định — KHÔNG tự diễn giải.

## Luật cứng backend (BẮT BUỘC, không phải convention)

Vi phạm các mục này là **bug**, không phải style.

> Nguồn: `lab-docs/architecture/backend.md` §10 (luật + lý do) và `lab-docs/architecture/backend-reference.md` (code mẫu).
> Ghi dạng path, không dùng link tương đối — `.agents` là repo riêng, link `../../lab-docs` sẽ hỏng khi clone độc lập.

**D1 / data layer**
1. **Cấm `SELECT *`.** Liệt kê cột tường minh.
2. **Cấm `db.prepare(...).bind(...).run()/all()/first()` trực tiếp.** Mọi read/write qua wrapper.
3. **Cấm `RETURNING`.** Insert/update dựng entity từ input.
4. **Mọi bảng là `STRICT`.**
5. **Timestamp là `INTEGER` epoch ms** (`Date.now()`). Cấm `DEFAULT CURRENT_TIMESTAMP`, cấm `strftime('%s','now')` (trả giây).
6. **Cấm `RENAME` / `DROP TABLE`** trong migration. Forward-only additive.
7. **Cấm sửa tay bảng `d1_migrations`.**
8. **Chunk write theo 100 bound param/query.**
9. Bulk write dùng `db.batch()`, không loop từng câu.

**Code JS/TS**
10. **Cấm `this` trong repository factory.**
11. **Cấm `console.log` với template string**; chỉ dùng `log(level, message, fields)` với object.
12. **Cấm `c.get('deps')` trong `error-handler.ts`**; bắt buộc `c.var.deps`.
13. **Cấm cache `deps` ở module scope.** `createDeps(env, ctx)` gọi mỗi request.
14. **Cấm `Extract<RequestContext, ...>`.** Dùng named type + `if` narrowing.
15. **Cấm gọi public URL cho internal service call.** Luôn dùng Service Binding.
16. **Cấm `userId: string | null`.** Dùng discriminated union.

**Giới hạn D1 phải nhớ:** GLOB/LIKE pattern ≤ **50 bytes** · bound param ≤ **100**/query · queries ≤ **50**/invocation trên Free plan.

## Luật cứng frontend (BẮT BUỘC, không phải convention)

> Nguồn: `lab-docs/architecture/frontend.md` §0, §5, §6. Quyết định F-1 → F-10 chốt ngày 2026-10-24.

**Bối cảnh — đọc trước khi làm bất cứ thứ gì ở FE:**

**User KHÔNG đọc source code frontend. User chỉ review giao diện (Storybook + ảnh chụp).**
Vì vậy: chất lượng code FE phải bảo đảm **bằng máy**, không bằng người review. Khi có hai phương án, chọn phương án **giảm xác suất lỗi ẩn** kể cả nếu code khó đọc hơn.

**Stack đã chốt**
17. **Styling: Tailwind CSS 4.** Token Quiet Evergreen khai báo trong `@theme` ở **một** file CSS duy nhất. Cấm tạo `tailwind.config.js`; cấm dựng design system trước khi có nhu cầu thật.
18. **Routing: TanStack Router.** Route tree nông, cấm nested tab. Search params phải typed và validate bằng zod.
19. **Data fetching: TanStack Query 5.** Cấm tự viết hook fetch/cache. Cấm copy server data vào client state (store, Context, `useState` nhân bản).
20. **API client: fetch wrapper tự viết** ở `src/shared/api/`. Cấm axios và thư viện HTTP khác.
21. **Zod parse MỌI response** tại biên trước khi vào component. Cấm `as` để bỏ qua validate.
22. **Form: react-hook-form + `@hookform/resolvers` + zod.** Cấm validate form bằng HTML attribute thuần khi đã có zod schema tương ứng.
23. **Không dùng global store** (Zustand/Redux/...). Server state = Query; URL state = router search params; auth = module-scope; còn lại local.
24. **Auth: access token trong memory.** Cấm localStorage/sessionStorage. Cấm bỏ qua single-flight refresh; cấm retry 401 quá **một** lần.
25. **Cấm import chéo feature.** Chỉ qua `src/shared/`.
26. **Cấm merge khi thiếu test tầng 1 và tầng 2** (xem thang 3 tầng bên dưới).

**Thang test 3 tầng — bắt buộc**

| Tầng | Phạm vi | Bắt buộc |
|---|---|---|
| 1 — Logic | `client.ts` (single-flight, 401 retry, NO_RETRY), zod schema, query key/invalidate, form validation, route guard | ✅ |
| 2 — Màn hình | Mỗi route: happy path + error state | ✅ |
| 3 — Component lẻ | Button, Card, Input… | ❌ chỉ story |

**UI review workflow bắt buộc**

27. **Storybook là bề mặt review UI.** Mỗi màn hình và mỗi component có ≥3 trạng thái phải có story phủ default / loading / empty / error.
28. **MSW handler là nguồn mock DUY NHẤT.** Đặt ở `features/<name>/mocks.ts`, export bộ có tên (`happy`, `empty`, `error`, `slow`). Story và test **cùng** lấy từ đây; cấm viết mock thứ hai.
29. **Ảnh review: `npm run shots`** — Playwright script đọc `index.json` của Storybook, chụp mọi story ở desktop 1280 và mobile 390, ghi ra `.artifacts/shots/`. **Cấm dùng Playwright MCP để điều hướng Storybook** (tốn token, không tất định). MCP chỉ dùng để smoke chức năng thật trên app đang chạy.

**Chọn version**

30. Tiêu chí là **độ ổn định và tương thích chéo**, không phải mới nhất. Pin exact, commit lockfile, nâng major từng gói một. Verify bằng `npm run build` + `npm test` + `npm run storybook` thật — không dựa vào changelog hay bảng `latest`.

## Quy tắc làm việc

> Mục này đánh số riêng, **không** nối tiếp luật cứng ở trên. Khi tài liệu khác dẫn "luật 17–30" thì đó là luật cứng frontend, không phải mục ở đây.

1. **Status vocabulary:** chỉ có DECIDED là ràng buộc. PROPOSED/ASSUMED/DEFERRED/OPEN/OUT OF SCOPE không được tự nâng cấp thành DECIDED.
2. **Workflow:** BRAINSTORM → Product Brief → BREAKDOWN → Spec/Code. Chỉ tạo Spec/Plan/Code khi user yêu cầu rõ ràng.
3. **Cloudflare:** backend multi-repo, mỗi service là một Worker + D1 riêng, private, gọi nhau qua Service Bindings. API Gateway là public entry duy nhất. KHÔNG tự thêm KV, Queues, Durable Objects, Redis — các mục này DEFERRED.
4. **Không commit secrets** (plaintext, age private key). Dev secrets dùng SOPS trong `lab-secrets/`.
5. **Chạy git từ đúng repo**: luôn `cd` vào thư mục repo con trước khi chạy lệnh git. Workspace root không có git.
6. **Thêm repo mới:** cập nhật bảng trong `setup.md` trước, clone sau, rồi commit vào repo này.
7. **Git identity:** config per-repo local theo `setup.md`. Username/email là dữ liệu của user — PHẢI hỏi user để lấy giá trị, không hardcode hay suy đoán.
8. **Hai chế độ review, không lẫn:** backend thì user đọc code/SQL/schema bằng mắt — tránh abstraction che ranh giới. Frontend thì user **không đọc code**, chỉ xem giao diện — chọn phương án khó sai hơn, và mọi thứ phải kiểm được bằng máy (test, typecheck, lint, zod parse).
9. **Tài liệu tách theo phía:** spec và checklist của backend và frontend để **hai file riêng**. Không gộp, không dùng template phía này cho phía kia.
10. **Lưu trữ artifact theo chuẩn** `lab-docs/frameworks/documentation-standards.md`:
    - Quyết định/spec → `lab-docs` (`specs/<ID>/`), bằng chứng thực thi → `<repo>/docs/delivery/<ID>/`, hai lớp không trộn.
    - **Mọi việc đều có ID.** Việc không có trong `stories.md` dùng tiền tố reserved `SETUP-`, `MAINT-`, `EXP-` kèm `ticket.md` một trang.
    - Bằng chứng (gate, đo đạc query, triage, ảnh chụp) **phải commit và merge vào `main` cùng PR** — bằng chứng nằm trên nhánh đã xóa thì bằng không.
    - Bằng chứng không sửa sau khi ghi, chỉ append. Spec sai thì sửa spec trong `lab-docs`, không sửa bằng chứng.

## Đọc tài liệu trước khi code

Trước khi làm việc với bất kỳ service hay frontend nào:
1. Đọc `lab-docs/README.md` và `lab-docs/decisions/decision-ledger.md`.
2. Đọc tài liệu kiến trúc liên quan (bảng ở trên).
3. Nếu làm UI: đọc `lab-docs/architecture/frontend.md` và tham chiếu prototype trong `lab-prototype/`.

Nếu một tài liệu không tồn tại hoặc chưa truy cập được, đánh dấu là chưa
kiểm chứng — không suy diễn "chưa có" từ một path duy nhất.
