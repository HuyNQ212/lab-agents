---
name: to-spec
description: Viết Technical Spec + ticket list cho một story hoặc epic Lab đã breakdown. Có hai nhánh riêng — backend (data model, API contract, service boundary, migration) và frontend (UI surface, data fetching, state ownership, form, test 3 tầng, story). Dùng khi user yêu cầu "spec", "technical spec", "viết spec cho PLN-001/SEC-1". Không dùng để viết lại stories/AC hay để code.
metadata:
  short-description: Story → Technical Spec + tickets (backend hoặc frontend)
---

# to-spec — Story → Technical Spec

Biến story đã publish thành spec kỹ thuật đủ để một agent implement mà không phải đoán, kèm ticket list theo vertical slice.

## Hai nhánh, không trộn

| Nhánh | Template | Ràng buộc nền | Review bởi user |
|---|---|---|---|
| **Backend** | [`references/backend/spec-template.md`](references/backend/spec-template.md) | `backend.md` §10, luật 1–16 `AGENTS.md` | Đọc code/SQL/schema bằng mắt |
| **Frontend** | [`references/frontend/spec-template.md`](references/frontend/spec-template.md) | `frontend.md` §0/§5/§6, luật 17–30 `AGENTS.md` | **Chỉ xem giao diện**, không đọc code |

Lý do tách: hai phía có tiêu chí khác nhau. Backend tối ưu cho **dễ review bằng mắt**; frontend tối ưu cho **khó sai vì không ai review code**. Gộp chúng vào một template sẽ khiến một mục bị hiểu sai theo nghĩa của phía còn lại.

Story chạm cả hai phía → viết **hai spec**, đặt cạnh nhau trong cùng thư mục product. Không gộp thành một file.

## Ranh giới

| Việc | Skill này | Không phải việc của skill này |
|---|---|---|
| Behavior, AC | đọc và ánh xạ, không viết lại | `delivery-breakdown` |
| Quyết định công nghệ | trích từ `decision-ledger` | user |
| Code, migration file, component | không tạo | `implement-backend` / `implement-frontend` |
| Phản biện boundary/schema/UX | nêu câu hỏi, không tự chốt | `architecture-review` |

Không tạo GitHub Issue. Không đánh số lại story ID. Không nâng PROPOSED/DEFERRED/OPEN thành DECIDED.

## Đọc trước

### Chung

1. `lab-docs/products/<product>/stories.md` hoặc `lab-docs/platform/<cap>/stories.md` — story, AC, DEFERRED/OPEN.
2. `lab-docs/decisions/decision-ledger.md` — chỉ dòng DECIDED là ràng buộc.
3. `lab-docs/frameworks/engineering-workflow.md` §2 — định nghĩa nội dung spec.

### Nhánh backend — đọc thêm

4. `lab-docs/products/<product>/db-schema.md` — schema hiện có.
5. `lab-docs/architecture/backend.md` **§10** — ràng buộc B-1→B-8; lệch thì file này thắng.
6. `lab-docs/architecture/system-overview.md` — service nào sở hữu dữ liệu gì, chiều Service Binding.
7. `lab-docs/architecture/iam.md` — khi spec có endpoint hoặc kiểm quyền.
8. `lab-docs/architecture/backend-reference.md` — chỉ đọc mục lục để trỏ đúng section mẫu code; **không copy code**.

### Nhánh frontend — đọc thêm

4. `lab-docs/architecture/frontend.md` **§0** (ràng buộc review UI), **§5** (stack F-1→F-10, cấu trúc thư mục, 3 quy ước), **§6** (thang test 3 tầng, screenshot workflow).
5. `.agents/AGENTS.md` **luật 17–30** — luật cứng frontend.
6. Backend spec của cùng story — để biết endpoint, error code, shape response **thật**. Frontend spec không được tự bịa endpoint.
7. `lab-docs/architecture/iam.md` — khi spec có luồng đăng nhập, route guard, hoặc 401.
8. `lab-prototype/` — khi story đã có prototype APPROVED/PUBLISHED; đọc để biết giao diện mong muốn, **không copy HTML**.

## Blocker phải dừng

Dừng và báo user, không tự lấp:

**Backend**
- `db-schema.md` còn `PLACEHOLDER` hoặc thiếu bảng/cột cho delta của story.
- Spec cần một quyết định công nghệ chưa DECIDED (scheduler, retry, dedup, …).
- Yêu cầu đòi hỏi truy cập chéo D1 giữa hai service.
- Không xác định được service sở hữu dữ liệu.

**Frontend**
- Backend spec chưa có endpoint mà màn hình cần.
- Story mô tả hành vi giao diện nhưng chưa rõ trạng thái loading/empty/error → cần user quyết, không tự nghĩ.
- Màn hình cần một state mà F-5 không cho chỗ đặt (không server, không URL, không local hợp lý) → đây là tín hiệu phải hỏi lại F-5, không tự thêm store.
- Cần semantic color / token chưa có giá trị → đánh dấu delta token, không tự đặt hex.
- Story cần component phức tạp đòi thư viện mới → hỏi user trước, không tự cài.

**Chung**
- Story còn DRAFT hoặc AC mâu thuẫn nhau.

Với schema thiếu: đề xuất một phiên thiết kế schema (output là `db-schema.md`, đi qua `architecture-review`), rồi quay lại `to-spec`. Không viết spec dựa trên schema tự đoán.

## Quy trình

### 1. DISCOVER

- Liệt kê story ID + AC liên quan, kèm DEFERRED/OPEN của chúng.
- **Xác định nhánh:** story chạm backend, frontend, hay cả hai.
- Backend: xác định service/repo sở hữu từng dữ liệu; ghi rõ chiều gọi; đối chiếu AC với schema.
- Frontend: xác định route, màn hình, và với mỗi màn hình liệt kê đủ trạng thái default/loading/empty/error. Đối chiếu với endpoint có thật trong backend spec.
- Tra ledger cho từng quyết định kỹ thuật sẽ dùng.

### 2. SCOPE CONFIRM

Trình bày ngắn: story nào, nhánh nào, service/route nào, delta ước tính, blocker, câu hỏi cần user quyết. Chờ xác nhận trước khi viết spec đầy đủ — trừ khi user đã nói rõ "viết luôn".

### 3. DRAFT SPEC

Dùng template của **đúng nhánh**. Mọi mục phải có nội dung hoặc ghi "Không áp dụng — <lý do>".

### 4. REVIEW

Đưa draft cho user, nêu riêng danh sách OPEN. Chỉ ghi file sau khi user duyệt.

Với nhánh frontend, nhắc rõ: user sẽ review **giao diện**, không review code. Nên trong lúc review, chỉ ra story nào sẽ dùng để xem trạng thái nào.

### 5. WRITE

Đặt file trong **thư mục ID** (`specs/<ID>/`), đúng chuẩn `lab-docs/frameworks/documentation-standards.md` §2:

| Nhánh | Đường dẫn |
|---|---|
| Backend | `lab-docs/products/<product>/specs/<ID>/spec-backend.md` hoặc `lab-docs/platform/<cap>/specs/<ID>/spec-backend.md` |
| Frontend | `…/specs/<ID>/spec-frontend.md` (cùng thư mục ID với backend) |

Sửa file đã có thay vì tạo file trùng. Đọc lại file sau khi ghi.

### 5b. Ticket nhỏ — không phải story/epic

Việc lộ ra ngoài `stories.md` thường đi qua skill **`capture`** trước — nó quyết định xếp vào story có sẵn hay sinh ticket nhỏ. Khi tự viết ticket nhỏ:

- Thay spec bằng **`ticket.md` một trang** theo template trong `capture/SKILL.md` §2 (frontmatter `id/type/status/repos/parent` + khối Tasks).
- ID tiền tố reserved: `SETUP-`, `MAINT-`, `EXP-` — kiểm trùng bằng `lab status` trước khi đặt.
- File theo dõi phải có frontmatter chuẩn (§0) để vào bảng `lab status`.
- Gate không được miễn.

## Quy tắc nội dung — backend

**Scope / non-goals**
- Trích dẫn story ID, không chép lại AC.
- Non-goals lấy từ stories; chỉ thêm non-goal kỹ thuật khi suy ra trực tiếp từ ràng buộc DECIDED.

**Data model**
- Chỉ delta: bảng/cột/index cần thêm, kèm lý do và query sử dụng.
- Ghi rõ `STRICT`, timestamp `INTEGER` epoch ms, date-only `TEXT` + CHECK GLOB.
- Không vẽ schema thay `db-schema.md`; spec trỏ về file đó.

**API contract**
- Bảng: method, path, auth context, request schema, response, status, error codes.
- Error code dạng `<SERVICE>_<REASON>`, body `{ "error": { "code": "...", "message": "..." } }`.
- Không leak chi tiết nội bộ. Không thêm endpoint chỉ để "cho đủ".

**Service boundary**
- Ghi rõ Worker sở hữu, ai gọi ai, tên Service Binding, chiều gọi.
- Cấm public URL cho internal call.
- Cần dữ liệu service khác: gọi qua binding hoặc nhận snapshot trong payload — không đọc D1 chéo.

**Migration**
- Forward-only, additive. `RENAME` / `DROP TABLE` bị cấm.
- Nêu thứ tự local → remote và cách verify.
- Nếu cần backfill: mô tả một lần, idempotent, không sửa `d1_migrations`.

**Test plan**
- Tách unit (logic thuần) và integration (D1 thật qua `@cloudflare/vitest-plugin`).
- Mỗi AC ánh xạ tới ít nhất một test case, hoặc ghi rõ test nằm ở ticket khác.
- Mock repo chỉ cho lỗi DB khó gây hoặc assert call; port external luôn mock.
- Không E2E browser.

**Tickets**
- Vertical slice, demo/verify được độc lập. Không chia "DB trước → API sau" nếu một slice end-to-end làm được.
- Mỗi ticket: ID, outcome, scope, test, `Blocked by`, repo, non-goals.
- ID dạng `<STORY-ID>-T<n>` (ví dụ `PLN-001-T1`). Không đánh số lại story.

## Quy tắc nội dung — frontend

**UI surface**
- Mỗi route khai báo search params kèm zod schema. Route tree nông — cấm nested tab.
- Mỗi màn hình **bắt buộc** đủ 4 trạng thái: default / loading / empty / error. Thiếu trạng thái nào là spec chưa xong.
- Primitive mới chỉ khi ≥2 nơi dùng thật. Component phức tạp cần thư viện → nêu chi phí bundle và hỏi user.
- Cấm hex trực tiếp khi đã có token. Token chưa có giá trị → đánh dấu delta, không bịa.

**Data fetching**
- Query key là hợp đồng giữa query và mutation. Ghi rõ key gốc để invalidate đúng nhánh.
- Mutation phải nêu: optimistic có/không, invalidate key nào, rollback khi lỗi.
- Cấm copy kết quả query vào local state.
- Endpoint phải khớp backend spec. Backend chưa có → blocker.

**State ownership**
- Phân loại **mọi** state của màn hình vào một trong bốn loại: server / url / auth / local. Không có state mồ côi.
- Thứ tự ưu tiên: server → Query, filter/sort/page/selected id → search params, token → module-scope, còn lại → `useState`.
- Context chỉ cho auth. Cấm tạo store. Cần store → dừng và hỏi user.

**API client**
- Mọi response parse qua zod trước khi vào component.
- Lỗi dùng `code`, không hiển thị `message` của server.
- 401 đã xử lý ở `client.ts`; component **không** thêm logic refresh.

**Form**
- `react-hook-form` + `zodResolver`, tái dùng schema ở mục API client khi cùng shape.
- Label luôn hiển thị; lỗi hiển thị dưới field; ghi rõ lỗi server là field-level hay form-level.
- Nút submit disabled khi đang gửi; nêu trạng thái sau khi thành công và query nào invalidate.

**Auth và route guard**
- Bootstrap session nằm ở root `beforeLoad`; spec không thêm refresh ở tầng màn hình.
- Ghi rõ trạng thái chờ khi bootstrap chạy.
- Logout chỉ hoàn tất sau khi server xác nhận revoke.

**Test plan**
- Thang 3 tầng:
  - Tầng 1 (logic): zod schema, query key, route guard, hàm thuần — **bắt buộc**.
  - Tầng 2 (màn hình): mỗi route happy + error — **bắt buộc**.
  - Tầng 3 (component lẻ): **không test**, chỉ story.
- Mock network qua MSW, handler ở `features/<name>/mocks.ts`, **cùng bộ** với story. Cấm mock `fetch` tay.
- E2E Playwright trên app thật: DEFERRED.

**Story và ảnh review**
- Mỗi màn hình phải có story phủ đủ 4 trạng thái. Trạng thái tái tạo bằng MSW handler, không bằng sửa code.
- Ảnh review sinh bằng `npm run shots` → `.artifacts/shots/<storyId>-desktop.png` và `-mobile.png`.
- Cấm dùng Playwright MCP để điều hướng Storybook.

**Tickets**
- Vertical slice: route + data + UI + test + story trong **một** ticket.
- Cấm tách "dựng component trước, nối data sau" — nửa đầu không verify được gì.
- Mỗi ticket: ID, outcome nhìn thấy được trên giao diện, scope, test, story phủ trạng thái nào, `Blocked by`, repo.

## Quy tắc chung

**OPEN**
- Giữ nguyên trạng thái gốc, không tự trả lời.
- Mỗi OPEN ghi: câu hỏi, vì sao chặn, ai quyết, ảnh hưởng nếu sai.

## Checklist trước khi ghi

### Backend

- [ ] Mọi AC của story ánh xạ tới ticket, hoặc ghi DEFERRED/OUT OF SCOPE kèm lý do.
- [ ] Mọi ticket có `Blocked by` (hoặc `—`) và repo.
- [ ] Không có công nghệ mới ngoài ledger DECIDED.
- [ ] Không có AC copy nguyên văn.
- [ ] Mọi bảng/cột được nhắc đều có trong `db-schema.md`, hoặc được đánh dấu rõ là delta cần bổ sung.
- [ ] Error code đúng prefix service.
- [ ] Spec không chứa code copy từ `backend-reference.md`; chỉ trỏ section.

### Frontend

- [ ] Mỗi màn hình có đủ 4 trạng thái.
- [ ] Mọi state đã phân loại server/url/auth/local; không state mồ côi.
- [ ] Mọi response có zod schema.
- [ ] Mọi endpoint khớp backend spec, không bịa.
- [ ] Query key khai báo đủ để invalidate đúng.
- [ ] Mỗi màn hình có story phủ đủ trạng thái.
- [ ] Test tầng 1 + tầng 2 có case cụ thể; không có test tầng 3.
- [ ] Không hex trực tiếp, không token bịa.
- [ ] Không tạo store, không copy server data vào local state.
- [ ] Ticket là vertical slice, không tách tầng.

### Chung

- [ ] OPEN phản ánh đúng trạng thái gốc.
- [ ] Spec dùng đúng template của nhánh, không trộn nội dung backend vào frontend.

## Anti-pattern

**Chung**
- Spec dài hơn mức agent cần, hoặc mô tả code từng dòng.
- Nâng OPEN thành DECIDED vì "nghe hợp lý".
- Gộp nhiều outcome vào một ticket để giảm số ticket.
- Dùng template backend để viết phần frontend hoặc ngược lại.

**Backend**
- Thêm KV/Queues/Durable Objects/Redis "cho tiện".
- Viết endpoint không có story.

**Frontend**
- Bỏ qua trạng thái empty hoặc error vì "chắc không xảy ra".
- Đưa filter/sort vào `useState` thay vì search params.
- Copy dữ liệu server vào Context "cho tiện dùng ở nhiều nơi".
- Tự thêm logic refresh token ở component.
- Đề xuất Zustand/Redux vì F-5 đã DECIDED là không store.
- Tách ticket "component trước, wiring sau".
- Bịa endpoint vì backend spec chưa có.
