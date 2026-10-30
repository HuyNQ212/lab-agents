# Skills — Lab

> Hướng dẫn thực thi cho agent. **Quy trình** (đọc bởi người) nằm ở `lab-docs/frameworks/`.
> Ràng buộc nằm ở `lab-docs/architecture/backend.md` §10, `lab-docs/architecture/frontend.md` §5–§6 và `.agents/AGENTS.md` — skill chỉ trỏ tới, không thay thế.

## Chuỗi

```text
grilling → prototype → breakdown → architecture-design → to-spec → spec-review → implement → ship → production
```

`orchestrate` chạy cả chuỗi: đọc trạng thái bằng `lab.mjs`, gọi skill kế tiếp, lặp vòng sửa có trần, và chỉ dừng ở gói quyết định (`.agents/references/decision-packet.md`) hoặc trước lệnh production không hoàn tác được — xem `orchestrate/SKILL.md`. Các skill không còn câu "không tự chạy": điều phối là việc của `orchestrate`, điểm dừng là gói quyết định.

`architecture-design` dựng bản nháp đầy đủ mọi quyết định khó đảo ngược (schema, ranh giới service, tách module/component FE, state ownership) cho một **cụm** story/epic, rồi gửi user **một** gói quyết định; mục chưa trả lời giữ PROPOSED. Ra Design Record FROZEN. Story nhỏ nằm gọn trong thiết kế đã có đi luồng LITE. `to-spec` chỉ chuyển Design Record thành spec; `spec-review` kiểm spec có bám Design Record không và chỉ báo điểm lệch — xem `architecture-design/SKILL.md`, `spec-review/SKILL.md`.

`grilling` đứng đầu: biến ý tưởng thô thành Product Brief (what/why). Hai mode bên trong (EXPLORE cho ý tưởng mơ hồ, GRILL cho decision frontier) với gate tự chuyển — xem `grilling/SKILL.md`.

`prototype` **tùy chọn**, đứng trước `breakdown`: dựng UX prototype HTML-first để user duyệt giao diện/hành vi trước khi chốt story. Chạy khi user yêu cầu prototype cho product đó. Có gate user duyệt bắt buộc — xem `prototype/SKILL.md`.

`breakdown` lấy Product Brief, chạy coverage audit **bằng script** (`lab coverage <PREFIX>`, không audit tay), sau scope confirmation phân rã Epics/Stories/AC. Stories là một file một ID (`stories/<ID>.md` với `brief:` + `covers:`) — xem `breakdown/SKILL.md`.

`implement` gồm cả review + triage. Không có skill `code-review` riêng — review đã nằm trong vòng lặp implement.

`capture` không nằm trên chuỗi chính — nó được gọi **ngang** từ bất kỳ điểm nào (implement phát hiện việc ngoài ticket, user nêu việc mới) để xếp vào story có sẵn hoặc sinh ticket nhỏ.

## Hợp đồng bàn giao

Mỗi skill nhận đúng đầu vào của bước trước và để lại đúng đầu ra cho bước sau. Hook `skill-gate.mjs` chạy `lab check` rồi `lab gate <skill> <ID>` trước mỗi skill trong chuỗi; FAIL thì skill không chạy. `lab` = `node .agents/scripts/lab.mjs`. `<dir>` = `lab-docs/products/<tên>/` hoặc `lab-docs/platform/<tên>/`.

| Skill | Đầu vào (ID truyền khi gọi) | Gate | Đầu ra bắt buộc | Kết thúc khi |
|---|---|---|---|---|
| `grilling` | ý tưởng; hoặc `<PREFIX>-BRIEF` để cập nhật | không | `<dir>/product-brief.md`: frontmatter `id: <PREFIX>-BRIEF`, `type: brief`, `status`, `repos: []`, `brief-version: <n>`, `date`; mục `## Capabilities` dòng `- C<n>: <mô tả> [OPEN\|DECIDED <ngày>\|DEFERRED\|OUT OF SCOPE]` | user duyệt qua gói quyết định → `status: done`; `lab check` OK |
| `prototype` (tùy chọn) | `<PREFIX>` có brief | không | trang trong `lab-prototype/`; dòng `**Approval:** APPROVED <ngày> — brief <PREFIX>-BRIEF v<n>` trong README của prototype | user duyệt |
| `breakdown` | `<PREFIX>` | brief `done` có Capabilities | `<dir>/stories/<EPIC-ID>.md` (`type: epic`) và `<dir>/stories/<ID>.md` (`type: story`, `status: open`, `repos`, `parent`, `brief`, `brief-version`, `covers`) | `lab coverage <PREFIX>` exit 0; `lab check` OK |
| `architecture-design` | ID story hoặc epic | story tồn tại, brief `done` | `<dir>/design-backend.md` / `design-frontend.md`, dòng 3 `**Status:** DRAFT` → `**Status:** FROZEN (user duyệt <ngày>)` | user duyệt gói quyết định; mục chưa trả lời giữ PROPOSED; FROZEN thì `lab design-check <ID>` exit 0 |
| `to-spec` | ID story hoặc epic | có Design Record FROZEN cùng `<dir>`, không còn OPEN chặn chưa đóng (`lab design-check <ID>`) | `<dir>/specs/<SPEC-ID>/spec-backend.md` / `spec-frontend.md`: `**Status:** DRAFT`, `**Stories:** <ID>, ...`, bảng `## <n>. Tickets` cột `\| ID \| Outcome \| Repo \| Blocked by \|`, ID ticket `<STORY>-T<n>`, cột Blocked by chỉ chứa ID ticket hoặc `—` | `lab sync <SPEC-ID>`; `lab check` OK |
| `spec-review` | `<SPEC-ID>` (hoặc story/ticket thuộc spec) | spec tồn tại, Design Record của từng phía FROZEN | `<dir>/specs/<SPEC-ID>/review.md`: frontmatter `id: <SPEC-ID>-review`, `type: review`, `status: done`, `repos`, `verdict: PASS\|NEEDS-WORK\|BLOCK`, `open-questions: <n>` | PASS + user duyệt → spec `**Status:** REVIEWED`; NEEDS-WORK/BLOCK → `to-spec` sửa (tối đa 2 vòng rồi hỏi user) |
| `implement` | `<STORY>-T<n>` hoặc ID ticket nhỏ | spec REVIEWED, review PASS và 0 câu hỏi mở, có progress.md, ticket chặn trước đã xong | commit trên nhánh `feat/<SPEC-ID>` (ticket nhỏ: `feat/<TICKET-ID>`) ở từng repo, push nhánh; bằng chứng `<repo>/docs/delivery/<TICKET-ID>/`; ticket bị chặn giữa chừng: việc dở ở nhánh `wip/<TICKET-ID>` kèm `blocked.md` | `lab tick <TICKET-ID>` (ticket nhỏ: `lab done <ID>`) |
| `ship` | `<SPEC-ID>` hoặc ID ticket nhỏ | mọi ticket của spec đã tick, ticket nhỏ con đã done | `<dir>/specs/<SPEC-ID>-ship/ship-plan.md`, `execution-log.md`; merge, migration, deploy (mỗi lệnh không hoàn tác được đều hỏi user) | verify production xanh → `lab ship-mark <SPEC-ID> <SPEC-ID>-ship` |
| `capture` (ngang) | mô tả việc | không | xếp vào ticket của spec có sẵn (sửa bảng Tickets, `lab sync`) hoặc `<dir>/specs/<SETUP\|MAINT\|EXP>-<n>/ticket.md` (`type: ticket`; việc chung toàn workspace: `lab-docs/specs/<ID>/ticket.md`) | `lab check` OK |
| `orchestrate` | yêu cầu của user, hoặc ID | không | chạy chuỗi trên, dừng ở gói quyết định và trước lệnh production | hết việc hoặc chờ user |

**SPEC-ID** là tên thư mục dưới `specs/`: mã epic (`PLN-E01`) khi spec gộp cả epic, mã story khi spec cho một story, hoặc mã cụm (`NTF`, `SEC`) khi gộp nhiều epic. Dòng `**Stories:**` trong spec là nguồn duy nhất cho biết spec phủ story nào.

**Hỏi user** luôn theo `.agents/references/decision-packet.md`.

## Nguyên tắc tách nhánh

Ba skill đầu có **hai nhánh riêng biệt**, không trộn:

| Phía | User review bằng gì | Tiêu chí tối ưu |
|---|---|---|
| Backend | Đọc code, SQL, schema bằng mắt | Dễ review bằng mắt, ít abstraction che ranh giới |
| Frontend | **Chỉ xem giao diện** (Storybook + ảnh) | Khó sai, vì không ai đọc code |

Story chạm cả hai phía → hai spec (`spec-backend.md`, `spec-frontend.md`), review hai phần riêng, implement backend trước frontend.

`ship` không tách nhánh: nó điều phối **cả cụm repo** cùng lúc, đó là lý do nó tồn tại.

## Trạng thái

| Skill | Trạng thái | File |
|---|---|---|
| `to-spec` | ✅ Đủ hai nhánh | `SKILL.md` + `references/backend/` + `references/frontend/` |
| `architecture-design` | ✅ Đủ hai nhánh (mới, chưa chạy thực tế) | `SKILL.md` + `references/design-record-template.md` + `references/backend/layers.md` + `references/frontend/layers.md` |
| `spec-review` | ✅ Đủ hai nhánh (đổi tên từ `architecture-review`) | `SKILL.md` + `references/conformance.md` + `references/backend/` + `references/frontend/` |
| `implement` | ✅ Đủ hai nhánh | `SKILL.md` + `references/review-protocol.md` + `references/backend/` + `references/frontend/` |
| `ship` | ✅ | `SKILL.md` + `references/plan-template.md` + `references/deploy-checklist.md` |
| `capture` | ✅ | `SKILL.md` — xếp việc lộ ra vào story hoặc ticket nhỏ `SETUP-/MAINT-/EXP-` |
| `grilling` | ✅ | `SKILL.md` — EXPLORE/GRILL/CONVERGE, output Product Brief; đứng ngoài nhánh BE/FE |
| `prototype` | ✅ | `SKILL.md` + `references/` — HTML-first UX prototype; lint chặn cứng, tự phê bằng ảnh qua sub-agent (trần 3 vòng), gate user duyệt; đứng ngoài nhánh BE/FE |
| `breakdown` | ✅ | `SKILL.md` — coverage audit qua `lab coverage`, output stories/ per-file; đứng ngoài nhánh BE/FE |
| `to-html` | ✅ | `SKILL.md` + `references/theme.css` — render tài liệu ra một trang HTML self-contained; tiện ích ngoài chuỗi, không thuộc nhánh BE/FE |
| `orchestrate` | ✅ (mới, chưa chạy thực tế) | `SKILL.md` — điều phối cả chuỗi, dừng ở gói quyết định và lệnh production |

Tài liệu dùng chung: `.agents/references/decision-packet.md` (cách mọi skill hỏi user).

**Đã bỏ:** `code-review` — review + triage nằm trong `implement`.

`to-html` là **tiện ích trình bày**, đứng ngoài chuỗi `grilling → breakdown → architecture-design → to-spec → spec-review → implement → ship`. Nó không tạo quyết định, không sửa tài liệu nguồn.

## File hiện có

| Skill | File |
|---|---|
| `grilling` | `SKILL.md` |
| `prototype` | `SKILL.md`<br>`references/checklist.md`<br>`references/critique-loop.md`<br>`references/shell.md`<br>`references/app-screen.md` |
| `breakdown` | `SKILL.md` |
| `capture` | `SKILL.md` |
| `to-spec` | `SKILL.md`<br>`references/backend/spec-template.md`<br>`references/frontend/spec-template.md` |
| `architecture-design` | `SKILL.md`<br>`references/design-record-template.md`<br>`references/backend/layers.md`<br>`references/frontend/layers.md` |
| `spec-review` | `SKILL.md`<br>`references/conformance.md`<br>`references/backend/checklist.md`<br>`references/frontend/checklist.md` |
| `implement` | `SKILL.md`<br>`references/review-protocol.md`<br>`references/backend/workflow.md`<br>`references/frontend/workflow.md` |
| `ship` | `SKILL.md`<br>`references/plan-template.md`<br>`references/deploy-checklist.md` |
| `to-html` | `SKILL.md`<br>`references/theme.css` |
| `orchestrate` | `SKILL.md` |

Các file `references/spec-template.md` và `references/checklist.md` ở gốc chỉ còn là stub điều hướng.

## Phân chia trách nhiệm

| Việc | Skill | Ghi chú |
|---|---|---|
| Brainstorm ý tưởng → Product Brief | `grilling` | Không spec, không code |
| Dựng UX prototype, tự phê, chờ duyệt | `prototype` | Tùy chọn; HTML-first; không thay spec |
| Product Brief → Stories/AC | `breakdown` | Coverage audit bằng script; checkpoint user bắt buộc |
| Chạy cả chuỗi tới production | `orchestrate` | Chỉ dừng ở gói quyết định và lệnh production |
| Chốt schema, ranh giới, tách module/component | `architecture-design` | Bản nháp đầy đủ rồi một gói quyết định; không spec, không code |
| Viết spec | `to-spec` | Không code; không quyết thiết kế, truy vết về Design Record |
| Kiểm spec bám Design Record + phản biện | `spec-review` | Không sửa; báo điểm lệch |
| Code + test + review + commit | `implement` | Nhánh feature, **push lên nhánh** |
| Gate + PR + merge + migration + deploy | `ship` | Thay CI/CD; có điểm dừng user |

**`implement` không push `main`, không deploy, không tạo PR.** Ba việc đó thuộc `ship`.

## Quản lý tiến độ bằng script

Mọi file theo dõi có frontmatter cố định (`id/type/status/repos/parent`). Spec theo dõi ticket qua `progress.md` sinh từ bảng Tickets; ticket nhỏ dùng khối `## Tasks` với `- [ ] T<n>:`. Bảng lệnh đầy đủ ở `lab-docs/frameworks/documentation-standards.md` §0b. **Không đọc 20 file để báo tiến độ** — chạy:

```bash
node .agents/scripts/lab.mjs status   # bảng tổng hợp mọi ID
node .agents/scripts/lab.mjs check    # validate trước khi commit (bắt buộc)
node .agents/scripts/lab.mjs sync <SPEC-ID>      # progress.md từ bảng Tickets
node .agents/scripts/lab.mjs tick <TICKET-ID>    # story tự dẫn xuất status
node .agents/scripts/lab.mjs gate <skill> <ID>   # hook skill-gate.mjs tự chạy
node .agents/scripts/lab.mjs coverage <PREFIX>   # audit coverage brief ↔ stories cho breakdown
node .agents/scripts/lab.mjs repo-gate <repo>    # gate code cho ship
node .agents/scripts/lab.mjs commit <ID> "<mô tả>" [--push]
node .agents/scripts/lint-prototype.mjs          # luật prototype, CHẶN CỨNG (L1–L7)
node .agents/scripts/shots.mjs                   # ảnh mọi trang prototype, desktop + mobile
```

## Quy ước

- **Lưu trữ artifact theo** `lab-docs/frameworks/documentation-standards.md` — hai lớp: quyết định ở `lab-docs`, bằng chứng ở `<repo>/docs/delivery/<TICKET-ID>/`, spec ở `specs/<SPEC-ID>/`. Ticket nhỏ dùng `ticket.md` một trang với ID tiền tố `SETUP-/MAINT-/EXP-` (template trong `capture/SKILL.md`).
- Mỗi skill một thư mục, `SKILL.md` bắt buộc; tài liệu dài để trong `references/<nhánh>/`.
- `SKILL.md` chỉ chứa quyết định và luật; **không copy code** từ `backend-reference.md`.
- Checklist review **không nhân bản**: `implement` trỏ tới `spec-review/references/`.
- Frontmatter: `name`, `description`, `metadata.short-description`.
- Skill không được tự nâng PROPOSED/DEFERRED/OPEN thành DECIDED.
- **Skill chỉ cover một phía không được đánh dấu hoàn thành.**
- Thêm skill mới → cập nhật bảng trên.
