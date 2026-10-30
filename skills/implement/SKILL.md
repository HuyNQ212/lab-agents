---
name: implement
description: "Thực thi một ticket từ spec đã review (<STORY>-T<n>) hoặc một ticket nhỏ SETUP-/MAINT-/EXP- thành code chạy được, đã test, đã review và đã commit trên nhánh feat/<SPEC-ID> (ticket nhỏ: feat/<TICKET-ID>) ở từng repo, push nhánh, bằng chứng trong <repo>/docs/delivery/<TICKET-ID>/, kết thúc bằng lab tick. Hai nhánh reference — backend (migration, D1 thật, query cost, contract) và frontend (story, ảnh, đọc ảnh đối kháng). Có giao thức dừng và tiếp tục (blocked.md). Dùng khi user nói \"implement\", \"làm ticket\", \"code ticket PLN-001-T1\", hoặc khi orchestrate chuyển từ spec-review sang. Không dùng để viết spec, để review code có sẵn, hay để merge/deploy."
metadata:
  short-description: "Ticket đã duyệt → code + test + review + commit trên nhánh"
---

# implement

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md` (mục "Hợp đồng bàn giao"), cách hỏi user ở `.agents/references/decision-packet.md`.

Biến **một ticket** đã duyệt thành commit sẵn sàng cho `ship`. Đầu ra là **bằng chứng**, không phải lời khẳng định "đã xong".

## Vị trí trong chuỗi

```text
spec-review (PASS) → implement (từng ticket) → ship
```

| Đầu vào | Điều kiện vào (`lab gate implement <ID>`, hook tự chạy) |
|---|---|
| `<STORY>-T<n>` trong bảng `## <n>. Tickets` của spec | spec `**Status:** REVIEWED`, `review.md` có `verdict: PASS` và `open-questions: 0`, có `progress.md`, mọi ticket trong cột `Blocked by` đã tick |
| Ticket nhỏ `SETUP-<n>` / `MAINT-<n>` / `EXP-<n>` | `ticket.md` tồn tại, status không phải `done`/`abandoned`/`blocked`. **Không qua spec-review** — `ticket.md` chính là spec |

Gate FAIL → không làm. Cột `Blocked by` có chữ không phải ticket ID (gate in dòng `!`) → tự kiểm điều kiện đó trước khi viết code.

**Không push `main`, không merge, không deploy, không tạo PR, không chạy migration/execute D1 remote, không đụng secrets production, không rollback.** Các việc không hoàn tác được đó thuộc `ship` và luôn hỏi user (hook cũng chặn). Force push, `wrangler delete`, `d1 delete` bị cấm hẳn.

Push lên **nhánh feature** thì bắt buộc sau mỗi ticket — để không mất việc khi phiên đứt.

## Hai nhánh, không trộn

| Nhánh | Reference | Ràng buộc nền | Review dựa trên |
|---|---|---|---|
| **Backend** | [`references/backend/workflow.md`](references/backend/workflow.md) | `backend.md` §10, luật 1–16 | Code, SQL, D1 test thật |
| **Frontend** | [`references/frontend/workflow.md`](references/frontend/workflow.md) | `frontend.md` §5–§6, luật 17–30 | **Ảnh Storybook** — user không đọc code |

Vòng lặp **giống nhau** hai phía. Ruột từng bước **khác nhau** (đó là lý do tách reference).

## Nhánh, repo, commit — quy ước

- **Một nhánh mỗi repo mỗi spec:** `feat/<SPEC-ID>` (ticket nhỏ: `feat/<TICKET-ID>`). Mọi ticket của cùng spec trong repo đó nối tiếp trên nhánh này.
- **Một commit mỗi ticket mỗi repo.** Ticket có nhiều repo trong cột `Repo` → chạy bước 2–8 lần lượt cho từng repo: backend trước frontend; giữa các service, service được gọi (bên khai báo trong Service Binding của bên kia) trước bên gọi.
- Nhánh đã push thì **không rebase** (rebase đòi force push — bị cấm). Rebase lên `main` là việc của `ship` Phase 3.

## Đọc trước khi code

1. Phần spec của ticket: dòng ticket trong bảng Tickets + các mục spec nó trỏ tới (`spec-backend.md` / `spec-frontend.md`), hoặc `ticket.md` với ticket nhỏ. Không đọc cả file nếu không cần.
2. Luật cứng: `.agents/AGENTS.md` luật 1–16 (backend) hoặc 17–30 (frontend).
3. Reference của nhánh.
4. `references/review-protocol.md` — trước bước review.
5. `lab-docs/decisions/decision-ledger.md` — chỉ dòng DECIDED là ràng buộc.
6. Repo/app **mới, chưa có khung**: khung Worker theo `lab-docs/architecture/backend.md` §2.1 (cấu trúc thư mục), mẫu code ở `lab-docs/architecture/backend-reference.md`; khung app theo `lab-docs/architecture/frontend.md` §5 (mục "Cấu trúc thư mục"). Không tự nghĩ layout khác.

## Bất biến — áp cho mọi ticket

1. **Không ra quyết định thiết kế.** Spec mơ hồ, thiếu, mâu thuẫn → dừng theo giao thức "Dừng giữa chừng". Không tự chọn.
2. **Không commit lên `feat/` khi gate đỏ.** Ngoại lệ duy nhất: commit dừng trên nhánh `wip/<TICKET-ID>` (xem "Dừng giữa chừng").
3. **Một commit một ticket mỗi repo.** Không gộp nhiều ticket, không tách một ticket thành nhiều commit.
4. **Không nới ràng buộc để test pass.** Test fail vì code sai → sửa code. Test fail vì test sai → sửa test và ghi lý do vào `review-triage.md`.
5. **Không thêm dependency ngoài spec.** Cần thì dừng, hỏi qua gói quyết định. Dependency mới phải pin exact (không `^`/`~`) và cập nhật `package-lock.json`.
6. **Thiếu hạ tầng không phải lý do làm vòng.** Repo chưa có remote/`origin/main`, chưa chạy được vitest với D1 thật, thiếu script gate → blocker, tạo ticket `SETUP-`/`MAINT-` qua skill `capture`. Không mock thay D1, không bỏ gate.
7. **DoD là bằng chứng**, không phải cảm nhận. Thiếu bằng chứng = chưa xong.
8. **Không đoán `user.name`/`user.email` của git.** Repo chưa cấu hình → dừng, hỏi qua gói quyết định.

## Quy trình

### 0. Tiếp tục hay bắt đầu — mỗi repo của ticket

```bash
cd <repo>                                   # services/lab-x hoặc apps/lab-portal
git fetch origin
git status --short
git branch -a --list "*feat/<SPEC-ID>" "*wip/<TICKET-ID>"   # có wip/ thì đây là lần chạy tiếp
git rev-parse --verify origin/main
git config user.name; git config user.email
```

| Thấy | Làm |
|---|---|
| `origin/main` không tồn tại (repo không có remote, remote rỗng, hoặc `main...origin/main [gone]`) | **Dừng ticket.** Tạo ticket `SETUP-` qua `capture` để dựng commit gốc và đưa `main` lên remote (bước đó hỏi user, thuộc `ship`). Không tự đẩy `main`, không tự dựng layout |
| Có `wip/<TICKET-ID>` | Đọc `git show origin/wip/<TICKET-ID>:docs/delivery/<TICKET-ID>/blocked.md`. Blocker đã gỡ (gói quyết định đã trả lời, hoặc `lab show <SETUP/MAINT-ID>` là `done`) → `git switch feat/<SPEC-ID>`, `git merge --squash wip/<TICKET-ID>` (chỉ đưa thay đổi vào working tree, không commit), append một dòng "Đã gỡ: ..." vào `blocked.md`, sang bước 1. Chưa gỡ → dừng, báo lại blocker cũ |
| Tree bẩn, không có `wip/<TICKET-ID>` | Dừng — nguồn gốc không rõ, không xóa, không stash; hỏi qua gói quyết định |
| Có `feat/<SPEC-ID>` (local hoặc origin) | `git switch feat/<SPEC-ID>` (theo dõi origin nếu chỉ có trên remote) |
| Chưa có nhánh | `git switch -c feat/<SPEC-ID> origin/main` |
| Thiếu `user.name`/`user.email` | Dừng, hỏi qua gói quyết định |

### 1. Đọc ticket và chốt phạm vi

- Ticket ID, outcome, repo, AC của story, test cần có, non-goals.
- Liệt kê file dự kiến chạm. Vượt phạm vi ticket → dừng theo giao thức.
- Liệt kê AC phải có test ánh xạ — dùng lại ở bước review.

### 2. Implement

Theo reference của nhánh. Trong lúc code, **tuân luật cứng**, không "tạm vi phạm rồi sửa".

### 3. Verify bằng máy

```bash
node .agents/scripts/lab.mjs repo-gate <repo>     # từ workspace root
```

Gate là `format:check → lint → typecheck → test → build` + pin version exact + `package-lock.json` (nguồn duy nhất: `REPO_GATES` trong `lab.mjs`). Cộng thêm cổng riêng của nhánh trong reference. **Gate phải xanh trước khi sang review.** Repo thiếu script gate → blocker, `capture` ticket `MAINT-`.

Ghi output thật vào `gate-<TICKET-ID>.md`: lệnh, số test pass, thời gian.

### 4. Review — reviewer context sạch

Theo `references/review-protocol.md`. Diff gửi reviewer là **toàn bộ thay đổi của ticket, kể cả file mới**:

```bash
git add -A
git diff --cached HEAD      # HEAD = commit ticket trước trên nhánh; ticket đầu thì HEAD = merge-base với origin/main
```

Reviewer là sub-agent chỉ đọc, không nhận reasoning của người viết code.

### 5. Triage finding

| Phán quyết | Điều kiện | Hành động |
|---|---|---|
| **ACCEPT** | Dẫn được luật cứng, AC, hoặc hậu quả cụ thể | Sửa |
| **REJECT** | Sở thích cá nhân, hoặc dẫn luật sai | Không sửa. Ghi lý do vào `review-triage.md` |
| **ESCALATE** | Finding đúng, nhưng sửa nghĩa là **đổi thiết kế hoặc đổi spec** | Dừng theo giao thức. Không tự quyết |

Mọi phán quyết ghi vào `review-triage.md`; commit message chỉ tóm tắt số lượng và trỏ tới file này.

### 6. Sửa → verify lại

Sau mỗi vòng sửa, **chạy lại `lab repo-gate <repo>`** và review lại diff mới. Tối đa **2 vòng review**. Sau vòng 2 vẫn còn finding ACCEPT → dừng theo giao thức: lặp mãi là dấu hiệu spec hoặc checklist có vấn đề, không phải code.

### 7. Commit

```text
<TICKET-ID>: <outcome ngắn>

- <thay đổi chính>
- Review: accepted <n>, rejected <n>, escalated <n> — chi tiết docs/delivery/<TICKET-ID>/review-triage.md
```

Commit gồm code + bằng chứng của ticket. Bằng chứng **không ghi hash của chính commit chứa nó** (hash đổi khi amend). Hash chỉ báo ở bước 9 và ghi vào `execution-log.md` của `ship`.

### 8. Push nhánh

```bash
git push -u origin feat/<SPEC-ID>
```

Bắt buộc, ngay sau commit, cho từng repo. Không bao giờ `--force`.

### 9. Đóng ticket

Khi mọi repo của ticket đã commit và push:

```bash
node .agents/scripts/lab.mjs tick <TICKET-ID>          # ticket nhỏ: tick <ID> <Tn> từng task, rồi done <ID>
node .agents/scripts/lab.mjs commit <TICKET-ID> "tick <TICKET-ID>"
```

Status story **tự dẫn xuất** từ `progress.md` — không sửa tay. Việc lộ ra ngoài ticket → skill `capture`, không nhét vào ticket hiện tại.

## Dừng giữa chừng — giao thức bắt buộc

Áp cho mọi điểm dừng sau khi đã viết code (ESCALATE, spec mơ hồ, quá 2 vòng review, blocker hạ tầng):

1. Ghi `<repo>/docs/delivery/<TICKET-ID>/blocked.md`: **gì** (đang ở bước nào, file nào dở), **vì sao** (dẫn spec/finding/lệnh fail), **bước tiếp theo** (câu hỏi cho user hoặc ID ticket SETUP/MAINT phải xong trước).
2. `git switch -c wip/<TICKET-ID>`, `git add -A`, commit `<TICKET-ID>: WIP blocked — xem blocked.md`, `git push -u origin wip/<TICKET-ID>`. Nhánh `feat/` giữ sạch.
3. Dừng qua **một** kênh: cần user quyết → gói quyết định (`.agents/references/decision-packet.md`); thiếu hạ tầng → `capture` ticket `SETUP-`/`MAINT-` và ghi ID vào `blocked.md`.

Lần chạy sau, bước 0 thấy `wip/<TICKET-ID>`, đọc `blocked.md` và tiếp tục từ đó.

## Definition of Done — bằng chứng bắt buộc

Commit chỉ được tạo khi đủ bảng này. Thiếu ô nào → chưa xong.

| Phía | Bằng chứng |
|---|---|
| **Backend** | `lab repo-gate` xanh (kèm số test) · migration đã apply local (nếu có) · test chạy trên D1 thật · nếu có endpoint: một lời gọi thật trả đúng status/body · `query-cost.md` cho query mới |
| **Frontend** | `lab repo-gate` xanh · test tầng 1 và tầng 2 · danh sách story + trạng thái đã phủ · ảnh trong `shots/` · 4 câu đọc ảnh đã trả lời |
| **Chung** | mọi AC của ticket có test ánh xạ · `review-triage.md` đủ phán quyết · không còn finding ESCALATE chưa xử lý · `lab check` OK |

**Vị trí bằng chứng** — chuẩn `lab-docs/frameworks/documentation-standards.md` §2, trong `<repo>/docs/delivery/<TICKET-ID>/`:

| File | Khi nào |
|---|---|
| `gate-<TICKET-ID>.md` | luôn có |
| `review-triage.md` | luôn có |
| `query-cost.md` | backend có query mới hoặc đổi |
| `shots/<storyId>-desktop.png`, `shots/<storyId>-mobile.png` | frontend (`apps/lab-portal/docs/delivery/<TICKET-ID>/shots/`) |
| `blocked.md` | khi từng dừng giữa chừng |

Bằng chứng commit cùng ticket, theo nhánh vào `main` qua `ship`. Ghi rồi không sửa, chỉ append.

## Dừng khi

Tất cả theo giao thức "Dừng giữa chừng":

- Spec mơ hồ, thiếu, hoặc mâu thuẫn với chính nó → gói quyết định.
- Ticket cần đổi thiết kế hoặc đổi spec (phát hiện khi code hoặc qua ESCALATE) → gói quyết định.
- Cần dependency chưa có trong spec → gói quyết định.
- Sau 2 vòng review vẫn còn finding ACCEPT → gói quyết định.
- Phạm vi thực tế vượt xa ticket → gói quyết định.
- Repo chưa có `origin/main`, chưa chạy được vitest với D1 thật, thiếu script gate, `npm run shots` chưa ghi được vào `docs/delivery/<TICKET-ID>/shots/` → `capture` ticket `SETUP-`/`MAINT-`.
- Tree bẩn không có `wip/<TICKET-ID>` → gói quyết định, không động vào tree.

## Không làm

- Không push `main`, không merge, không deploy, không tạo PR, không chạy D1 remote — đó là `ship`.
- Không force push, không `wrangler delete`, không `d1 delete`.
- Không sửa spec, `ticket.md`, ledger, `db-schema.md`, Design Record.
- Không sửa tay status story; không tự nâng OPEN/PROPOSED/DEFERRED thành DECIDED.
- Không nới luật cứng để code chạy được.
- Không tự thêm endpoint, tính năng, hoặc component ngoài ticket.
- Không dùng Playwright MCP để điều hướng Storybook.

## Đầu ra / bước tiếp theo

- **Đầu ra:** mỗi repo của ticket có một commit trên `feat/<SPEC-ID>` (ticket nhỏ: `feat/<TICKET-ID>`) đã push; bằng chứng ở `<repo>/docs/delivery/<TICKET-ID>/`; `lab tick <TICKET-ID>` (ticket nhỏ: `lab done <ID>`) và `lab commit <TICKET-ID> "..."` đã chạy.
- **Báo lại:** ticket, nhánh và hash commit từng repo, số ticket còn lại của spec (`lab status`).
- **Bước tiếp theo:** ticket kế tiếp của spec có `Blocked by` đã xong → `implement <TICKET-ID>`; mọi ticket của spec đã tick → `ship <SPEC-ID>` (ticket nhỏ: `ship <TICKET-ID>`).
