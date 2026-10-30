---
name: to-spec
description: "Viết Technical Spec + ticket list cho một story hoặc epic Lab đã breakdown và có Design Record FROZEN. Có hai nhánh riêng — backend (data model, API contract, service boundary, migration) và frontend (UI surface, data fetching, state ownership, form, test 3 tầng, story). Cũng dùng để sửa spec khi review.md có verdict NEEDS-WORK hoặc BLOCK. Dùng khi user hoặc orchestrate yêu cầu \"spec\", \"technical spec\", \"viết spec cho PLN-001/PLN-E01\", \"sửa spec theo review\". Không dùng để viết lại stories/AC, để quyết thiết kế hay để code."
metadata:
  short-description: "Story → Technical Spec + tickets (backend hoặc frontend)"
---

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md` (dòng `to-spec` và quy tắc SPEC-ID). Hỏi user chỉ qua `.agents/references/decision-packet.md`.

# to-spec — Story → Technical Spec

Biến story đã publish thành spec kỹ thuật đủ để một agent implement mà không phải đoán, kèm ticket list theo vertical slice.

## Hai nhánh, không trộn

| Nhánh | Template | Ràng buộc nền | Review bởi user |
|---|---|---|---|
| **Backend** | [`references/backend/spec-template.md`](references/backend/spec-template.md) | `backend.md` §10, luật 1–16 `AGENTS.md` | Đọc code/SQL/schema bằng mắt |
| **Frontend** | [`references/frontend/spec-template.md`](references/frontend/spec-template.md) | `frontend.md` §0/§5/§6, luật 17–30 `AGENTS.md` | **Chỉ xem giao diện**, không đọc code |

Lý do tách: hai phía có tiêu chí khác nhau. Backend tối ưu cho **dễ review bằng mắt**; frontend tối ưu cho **khó sai vì không ai review code**. Gộp chúng vào một template sẽ khiến một mục bị hiểu sai theo nghĩa của phía còn lại.

Story chạm cả hai phía → viết **hai spec**, đặt cạnh nhau trong cùng thư mục `specs/<SPEC-ID>/`. Không gộp thành một file.

## Ranh giới

| Việc | Skill này | Không phải việc của skill này |
|---|---|---|
| Behavior, AC | đọc và ánh xạ, không viết lại | `breakdown` |
| Quyết định công nghệ | trích từ `decision-ledger` | user |
| Code, migration file, component | không tạo | `implement` |
| Quyết định schema, ranh giới service, tách module/component, state ownership | **đọc từ Design Record, không quyết** | `architecture-design` |
| Kiểm spec bám Design Record, phản biện failure/AuthZ/UX | nêu câu hỏi, không tự chốt | `spec-review` |
| Đổi `**Status:**` thành REVIEWED | không làm | `spec-review` (sau PASS + user duyệt) |
| Prerequisite ngoài story (bootstrap repo, hạ tầng test) | không viết vào spec | `capture` → ticket `SETUP-`/`MAINT-` |

Không tạo GitHub Issue. Không đánh số lại story ID. Không nâng PROPOSED/DEFERRED/OPEN thành DECIDED.

## Đọc trước

### Chung

0. **Design Record FROZEN** của cụm: `lab-docs/products/<product>/design-backend.md` và/hoặc `design-frontend.md` (hoặc `lab-docs/platform/<cap>/`), kèm nhật ký delta. **Bắt buộc, đọc trước hết.** Spec là chuyển Design Record thành hợp đồng cho agent implement — **không phải nơi quyết định thiết kế**.
1. `<dir>/stories/<ID>.md` của từng story trong phạm vi (và `stories/<EPIC-ID>.md` khi spec theo epic) — story, AC, DEFERRED/OPEN. `<dir>` = `lab-docs/products/<tên>/` hoặc `lab-docs/platform/<tên>/`.
2. `lab-docs/decisions/decision-ledger.md` — chỉ dòng DECIDED là ràng buộc.
3. `lab-docs/frameworks/engineering-workflow.md` §3 — định nghĩa nội dung spec.

### Nhánh backend — đọc thêm

4. `<dir>/db-schema.md` — schema hiện có.
5. `lab-docs/architecture/backend.md` **§10** (10.1 → 10.11) — ràng buộc backend; lệch thì file này thắng.
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

Không tự lấp. Blocker thiết kế quay về `architecture-design` (xem cuối mục); blocker cần user quyết gom vào **một** gói quyết định (`.agents/references/decision-packet.md`) rồi dừng.

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
- Story cần component phức tạp đòi thư viện mới → đưa vào gói quyết định, không tự cài.

**Chung**
- Story `status: abandoned`, hoặc AC mâu thuẫn nhau.
- **Không có Design Record FROZEN phủ story** (chưa có, còn DRAFT, hoặc không phủ phần story cần).
- Spec cần một quyết định mà Design Record không có: cơ chế, cấu trúc file, state, ranh giới, cột/bảng. **Không tự quyết, không tạo workaround để "cho spec đủ".**

Gặp các blocker thiết kế (Design Record thiếu, schema thiếu, quyết định chưa có): dừng và trả về **`architecture-design`** — FULL nếu thuộc cụm mới, LITE nếu chỉ thêm delta nhỏ — rồi quay lại `to-spec`. Không viết spec dựa trên thiết kế tự đoán.

Thiếu prerequisite không thuộc story nào (repo chưa bootstrap, chưa có hạ tầng test, chưa có binding): không phải blocker dừng. Tạo ticket qua skill **`capture`** (`SETUP-<n>`/`MAINT-<n>`), rồi ghi ID đó vào cột `Blocked by` của ticket cần nó.

## SPEC-ID và header

- **Đầu vào** là ID story hoặc epic. **SPEC-ID** là tên thư mục `specs/<SPEC-ID>/`: mã story khi spec cho một story, mã epic (`PLN-E01`) khi gộp cả epic, mã cụm (`NTF`, `SEC`) khi gộp nhiều epic. Thư mục đã có spec phủ story này → sửa trong thư mục đó, không tạo SPEC-ID mới.
- Header mỗi spec, đúng chữ để `lab` đọc được:
  - `**Status:** DRAFT` — to-spec **luôn** ghi DRAFT, không bao giờ ghi REVIEWED. Spec không có frontmatter (frontmatter `status:` sẽ đè dòng này khi gate đọc).
  - `**Stories:** <ID>, <ID>, ...` — liệt kê **mọi** story spec phủ; đây là nguồn duy nhất cho biết spec phủ story nào.
  - `**Spec version:** <n>` — 1 khi viết mới, tăng 1 mỗi vòng REVISE.
- Bảng `## <n>. Tickets`, cột đúng `| ID | Outcome | Repo | Blocked by |`:
  - ID dạng `<STORY>-T<n>` (`PLN-001-T1`), mang ID **story con** mà ticket phục vụ, kể cả khi spec gộp epic. Không dùng ID epic hay mã cụm cho ticket. ID không trùng với spec khác.
  - Cột Repo ghi `services/<tên>` hoặc `apps/<tên>`.
  - Cột Blocked by chỉ chứa ID ticket `<STORY>-T<n>`, ID `SETUP-`/`MAINT-`/`EXP-`, hoặc `—`. Điều kiện bằng chữ không được gate kiểm → cấm.

## Quy trình

### 0. GATE

Chạy `node .agents/scripts/lab.mjs gate to-spec <ID>` (hook `skill-gate.mjs` cũng chạy). FAIL vì thiếu Design Record FROZEN → `architecture-design` trước. Phía nào có Design Record chưa FROZEN thì không viết spec phía đó.

### 1. DISCOVER

- Liệt kê story ID + AC liên quan, kèm DEFERRED/OPEN của chúng. Chọn SPEC-ID theo mục trên.
- **Xác định nhánh:** story chạm backend, frontend, hay cả hai.
- Backend: xác định service/repo sở hữu từng dữ liệu; ghi rõ chiều gọi; đối chiếu AC với schema.
- Frontend: xác định route, màn hình, và với mỗi màn hình liệt kê đủ trạng thái default/loading/empty/error. Đối chiếu với endpoint có thật trong backend spec.
- Tra ledger cho từng quyết định kỹ thuật sẽ dùng.
- Kiểm prerequisite repo (repo có tồn tại, có gate `lab repo-gate <repo>` chạy được, có hạ tầng test). Thiếu → `capture` tạo `SETUP-`/`MAINT-`.

Không dừng chờ xác nhận phạm vi. Chỉ dừng khi gặp blocker ở mục trên.

### 2. DRAFT SPEC

Dùng template của **đúng nhánh**. Mọi mục phải có nội dung hoặc ghi "Không áp dụng — <lý do>".

**Truy vết bắt buộc:** mỗi bảng/cột/endpoint/binding/state/file/component trong spec ghi ID Design Record mà nó thực hiện (`Theo: OWN2`, `INV1`, `FILE3`, `D4`…). Phần tử không có ID để dẫn → **dừng**, đó là quyết định thiết kế chưa có, không phải chi tiết spec.
- Cây file/module trong spec **chép theo** cây file đích của Design Record, không tự tách lại.
- Mỗi `core` của Design Record phải xuất hiện ở ít nhất một ticket (invariant: kèm test kiểm bằng máy đã chọn).
- Phần `REMOVED` ở G4 không xuất hiện trong spec.
- Cần đổi một quyết định? Không sửa trong spec — quay về `architecture-design` (LITE delta) rồi tiếp.
- `spec-review` sẽ đối chiếu spec với Design Record; chỗ nào không truy vết được sẽ bị báo.

Với nhánh frontend: spec chỉ rõ story nào dùng để xem trạng thái nào, vì user sẽ duyệt **giao diện**, không duyệt code.

### 3. WRITE

Đặt file trong thư mục SPEC-ID, đúng chuẩn `lab-docs/frameworks/documentation-standards.md` §2:

| Nhánh | Đường dẫn |
|---|---|
| Backend | `<dir>/specs/<SPEC-ID>/spec-backend.md` |
| Frontend | `<dir>/specs/<SPEC-ID>/spec-frontend.md` (cùng thư mục với backend) |

Sửa file đã có thay vì tạo file trùng. Không ghi `progress.md` tay. Sau khi ghi, chạy theo thứ tự, lệnh nào lỗi thì sửa spec rồi chạy lại:

```bash
node .agents/scripts/lab.mjs sync <SPEC-ID>      # sinh/cập nhật specs/<SPEC-ID>/progress.md từ bảng Tickets
node .agents/scripts/lab.mjs check               # phải OK
node .agents/scripts/lab.mjs commit <SPEC-ID> "spec DRAFT v<n>"   # chỉ commit file thuộc SPEC-ID trong lab-docs
```

`lab sync` báo "không có bảng Tickets parse được" → heading hoặc cột bảng sai, sửa theo mục SPEC-ID và header.

Không có điểm duyệt user ở to-spec. User duyệt **một lần**, sau khi `spec-review` PASS — `spec-review` gửi gói quyết định và đổi `**Status:**` thành REVIEWED.

### 4. REVISE — khi review.md chưa PASS

Vào bước này khi `specs/<SPEC-ID>/review.md` có `verdict: NEEDS-WORK` hoặc `verdict: BLOCK`.

1. Đọc mọi finding trong `review.md`. Không sửa `review.md`.
2. Finding sửa được trong phạm vi spec (thiếu trạng thái, thiếu test, truy vết sai, ticket không vertical) → sửa spec.
3. Finding đòi đổi quyết định thiết kế → không sửa trong spec; trả về `architecture-design` LITE, xong mới sửa spec.
4. Finding là câu hỏi cho user → giữ nguyên, `spec-review` gom vào gói quyết định; không tự trả lời.
5. Tăng `**Spec version:**`, giữ `**Status:** DRAFT`. Spec đang REVIEWED mà phải sửa → đưa về DRAFT.
6. Chạy lại bước 3 (`lab sync`, `lab check`, `lab commit`) rồi chuyển `spec-review <SPEC-ID>`.

**Trần 2 vòng REVISE** (tới `**Spec version:** 3`). Review của bản thứ 3 vẫn chưa PASS → dừng, gửi gói quyết định: finding còn lại, vì sao hai vòng không đóng được, phương án đề xuất (sửa Design Record, tách story, chấp nhận rủi ro có ghi). Không chạy vòng thứ ba.

### 5. Ticket nhỏ — không phải story/epic

Việc lộ ra ngoài thư mục `stories/` đi qua skill **`capture`** — nó quyết định xếp vào ticket của spec có sẵn hay sinh ticket nhỏ `SETUP-/MAINT-/EXP-` (`<dir>/specs/<ID>/ticket.md` theo template `capture/SKILL.md` §2). to-spec không tự viết `ticket.md`; chỉ dẫn ID ticket nhỏ vào cột `Blocked by`. Gate không được miễn.

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
- Mỗi ticket: dòng trong bảng `## <n>. Tickets` + mục chi tiết (outcome, scope, test, `Blocked by`, repo, non-goals). ID và cột theo mục SPEC-ID và header. Không đánh số lại story.

## Quy tắc nội dung — frontend

**UI surface**
- Mỗi route khai báo search params kèm zod schema. Route tree nông — cấm nested tab.
- Mỗi màn hình **bắt buộc** đủ 4 trạng thái: default / loading / empty / error. Thiếu trạng thái nào là spec chưa xong.
- Primitive mới chỉ khi ≥2 nơi dùng thật. Component phức tạp cần thư viện → nêu chi phí bundle, đưa vào gói quyết định.
- Cấm hex trực tiếp khi đã có token. Token chưa có giá trị → đánh dấu delta, không bịa.

**Data fetching**
- Query key là hợp đồng giữa query và mutation. Ghi rõ key gốc để invalidate đúng nhánh.
- Mutation phải nêu: optimistic có/không, invalidate key nào, rollback khi lỗi.
- Cấm copy kết quả query vào local state.
- Endpoint phải khớp backend spec. Backend chưa có → blocker.

**State ownership**
- Phân loại **mọi** state của màn hình vào một trong bốn loại: server / url / auth / local. Không có state mồ côi.
- Thứ tự ưu tiên: server → Query, filter/sort/page/selected id → search params, token → module-scope, còn lại → `useState`.
- Context chỉ cho auth. Cấm tạo store. Cần store → dừng, đưa vào gói quyết định.

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
- Ảnh review sinh bằng `npm run shots` → `<storyId>-desktop.png` và `-mobile.png`, lưu làm bằng chứng ở `apps/lab-portal/docs/delivery/<TICKET-ID>/shots/` (documentation-standards §2 dòng 10).
- Cấm dùng Playwright MCP để điều hướng Storybook.

**Tickets**
- Vertical slice: route + data + UI + test + story trong **một** ticket.
- Cấm tách "dựng component trước, nối data sau" — nửa đầu không verify được gì.
- Mỗi ticket: dòng trong bảng `## <n>. Tickets` + mục chi tiết (outcome nhìn thấy được trên giao diện, scope, test, story phủ trạng thái nào, `Blocked by`, repo).

## Quy tắc chung

**OPEN**
- Giữ nguyên trạng thái gốc, không tự trả lời.
- Mỗi OPEN ghi: câu hỏi, vì sao chặn, ai quyết, ảnh hưởng nếu sai.
- OPEN chặn ticket → gom vào gói quyết định (`.agents/references/decision-packet.md`); OPEN không chặn để `spec-review` gom cùng gói duyệt spec.

**Thao tác không hoàn tác được**
- Spec mô tả merge `main`, migration D1 remote, deploy, secrets, rollback như **bước của `ship`**, mỗi lệnh đều hỏi user. to-spec không chạy lệnh nào trong số đó. Thao tác phá hủy (force push, xóa Worker, xóa D1) bị cấm và không xuất hiện trong spec.

## Checklist trước khi ghi

### Backend

- [ ] Mọi AC của story ánh xạ tới ticket, hoặc ghi DEFERRED/OUT OF SCOPE kèm lý do.
- [ ] Mọi ticket có `Blocked by` (ticket ID, `SETUP-`/`MAINT-`/`EXP-` ID, hoặc `—`) và repo.
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
- [ ] Header có `**Status:** DRAFT`, `**Stories:**` đủ mọi story, `**Spec version:**`.
- [ ] Ticket ID mang ID story con, không trùng spec khác; `lab sync` và `lab check` OK.
- [ ] Spec dùng đúng template của nhánh, không trộn nội dung backend vào frontend.

## Đầu ra / bước tiếp theo

```text
architecture-design → to-spec → spec-review → implement → ship
                         ↑______REVISE______|  (NEEDS-WORK/BLOCK, tối đa 2 vòng)
```

| | |
|---|---|
| **Đầu vào** | ID story hoặc epic; `lab gate to-spec <ID>` PASS (story/epic tồn tại, Design Record FROZEN cùng `<dir>`) |
| **Đầu ra** | `<dir>/specs/<SPEC-ID>/spec-backend.md` / `spec-frontend.md` với `**Status:** DRAFT`, `**Stories:**`, bảng `## <n>. Tickets`; `progress.md` sinh bởi `lab sync` |
| **Kết thúc khi** | `lab sync <SPEC-ID>` và `lab check` OK, đã `lab commit <SPEC-ID> "..."` |
| **Bước tiếp theo** | `spec-review <SPEC-ID>`; verdict NEEDS-WORK/BLOCK → quay lại bước REVISE |

## Anti-pattern

**Chung**
- Spec dài hơn mức agent cần, hoặc mô tả code từng dòng.
- Nâng OPEN thành DECIDED vì "nghe hợp lý".
- Gộp nhiều outcome vào một ticket để giảm số ticket.
- Ghi `**Status:** REVIEWED`, sửa `progress.md` hay `review.md` bằng tay.
- Ghi điều kiện bằng chữ vào cột `Blocked by` thay vì tạo ticket `SETUP-`/`MAINT-`.
- Dùng template backend để viết phần frontend hoặc ngược lại.

**Backend**
- Thêm KV/Durable Objects/Redis "cho tiện", hoặc Queues khi Design Record không chọn.
- Viết endpoint không có story.

**Frontend**
- Bỏ qua trạng thái empty hoặc error vì "chắc không xảy ra".
- Đưa filter/sort vào `useState` thay vì search params.
- Copy dữ liệu server vào Context "cho tiện dùng ở nhiều nơi".
- Tự thêm logic refresh token ở component.
- Đề xuất Zustand/Redux vì F-5 đã DECIDED là không store.
- Tách ticket "component trước, wiring sau".
- Bịa endpoint vì backend spec chưa có.
