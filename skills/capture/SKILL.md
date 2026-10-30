---
name: capture
description: "Bắt và phân loại việc lộ ra trong quá trình làm (lỗi, việc phát hiện thêm, việc nhỏ) và yêu cầu thay đổi giữa chuỗi. Quyết định: thêm ticket <STORY>-T<n> vào bảng Tickets của spec chưa REVIEWED, sinh ticket nhỏ SETUP-/MAINT-/EXP- (ticket.md), bỏ qua có ghi ledger PROPOSED, hoặc chuyển yêu cầu thay đổi về đúng bước (grilling, breakdown, architecture-design, to-spec REVISE) kèm danh sách artifact mất hiệu lực. Dùng khi user nói \"ghi lại việc này\", \"có lỗi này\", \"phát hiện thêm\", \"đổi yêu cầu\", khi implement gặp việc ngoài ticket, hoặc khi orchestrate nhận thay đổi yêu cầu giữa chừng. Không viết spec đầy đủ, không sửa lỗi, không sửa code."
metadata:
  short-description: "Việc lộ ra → ticket trong spec, ticket nhỏ, hoặc quay lại đúng bước"
---

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md`.

# capture — Bắt việc lộ ra và yêu cầu thay đổi

Việc xuất hiện giữa chừng có bốn số phận: **bỏ qua** (ghi ledger PROPOSED), **ticket mới trong spec có sẵn**, **ticket nhỏ** `SETUP-/MAINT-/EXP-`, hoặc **yêu cầu thay đổi** phải quay lại một bước trước của chuỗi. Skill này phân loại, ghi file, commit `lab-docs` — không sửa code, không viết spec dài, không quyết thiết kế.

`lab` = `node .agents/scripts/lab.mjs`, chạy từ workspace root.

## Đọc trước khi phân loại

- `lab-docs/frameworks/documentation-standards.md` §0 (frontmatter), §0b (lệnh `lab`), §3 (ticket nhỏ)
- `lab status` — việc đang mở; `lab show <SPEC-ID>` khi cần xem spec

## 1. Phân loại

**Nguyên tắc quyết:** việc phải xong để story đang làm đạt outcome → gắn vào spec của story đó (§2). Story ship được mà không cần nó → ticket nhỏ riêng (§3) hoặc bỏ qua. Việc làm đổi điều tài liệu đã chốt nói → yêu cầu thay đổi (§4).

| Dấu hiệu | Xếp vào | Ghi ở đâu |
|---|---|---|
| Cần cho outcome của story đã có spec, spec chưa `REVIEWED` | **Ticket mới** `<STORY>-T<n>` trong bảng Tickets | `<dir>/specs/<SPEC-ID>/spec-backend.md` hoặc `spec-frontend.md` (§2) |
| Cần cho outcome của story, spec đã `REVIEWED`, **không** đổi điều spec nói (chỉ code, test, cấu hình) | Ticket `MAINT-<n>` với `parent: <SPEC-ID>` — chặn ship spec đó | §3 |
| Cần cho outcome của story, spec đã `REVIEWED`, **đổi** điều spec nói | Yêu cầu thay đổi mức spec → `to-spec <SPEC-ID>` REVISE | §4 |
| Lỗi thật của code đang chạy, hoặc làm sai ràng buộc DECIDED | Như ba dòng trên nếu là lỗi của story đang làm; nếu không thì ticket `MAINT-<n>` | Ghi rõ luật nào bị vi phạm — bug vi phạm luật cứng không được nuốt thành "việc nhỏ" |
| Setup, cấu hình, toolchain, repo mới | Ticket `SETUP-<n>` | §3 |
| Bảo trì, nâng version, dọn nợ kỹ thuật | Ticket `MAINT-<n>` | §3 |
| Cần verify một điểm ⚠️ CHƯA VERIFY | Ticket `EXP-<n>` — kết quả phải dẫn tới một dòng ledger | §3 |
| User đổi yêu cầu, hoặc việc đổi brief / story / Design Record / spec | **Yêu cầu thay đổi** | §4 |
| Ngoài phạm vi, chỉ là ý tưởng | **Bỏ qua** — một dòng ledger `PROPOSED`, nêu trong báo cáo để user chốt | `lab-docs/decisions/decision-ledger.md`, cột Status `PROPOSED` |

Không chắc giữa hai mức của §4 → chọn mức cao hơn (gần brief hơn). Phân loại sai về phía thấp làm việc đi qua mà không ai duyệt lại.

## 2. Thêm ticket vào spec có sẵn

Chỉ khi spec còn `**Status:** DRAFT`. Spec đã `REVIEWED` thì không sửa bảng Tickets ở đây — đi §3 (không đổi spec) hoặc §4 mức spec.

1. Chọn đúng phía: việc backend vào `spec-backend.md`, frontend vào `spec-frontend.md`. Story phải có trong dòng `**Stories:**` của spec.
2. Số `<n>`: lớn nhất trong mọi `<STORY>-T<n>` của story đó ở **mọi** spec, cộng 1 (`grep -rhoE "<STORY>-T[0-9]+" lab-docs | sort -u`). `lab check` báo lỗi khi ticket ID trùng giữa hai spec.
3. Thêm một dòng vào bảng `## <n>. Tickets`, đúng cột `| ID | Outcome | Repo | Blocked by |`. Cột Blocked by chỉ chứa ID ticket (`<STORY>-T<n>`, `SETUP-/MAINT-/EXP-<n>`) hoặc `—`.
4. `lab sync <SPEC-ID>` để progress.md có ticket mới.

## 3. Ticket nhỏ — template

**Đường dẫn:** `<dir>/specs/<ID>/ticket.md`, `<dir>` là `lab-docs/products/<tên>/` hoặc `lab-docs/platform/<tên>/` sở hữu repo bị chạm. Việc không thuộc product hay capability nào (workspace, `.agents`) → `lab-docs/specs/<ID>/ticket.md`.

**Cấp ID:** số tiếp theo sau số lớn nhất đang dùng, ba chữ số như ID có sẵn (`SETUP-002`). Quét cả hai nguồn — `lab status` chỉ thấy ID đã có file, còn ID có thể đã được nhắc trong spec hoặc ledger mà chưa có file:

```bash
grep -rhoE "\b(SETUP|MAINT|EXP)-[0-9]+\b" lab-docs/products lab-docs/platform lab-docs/decisions $(test -d lab-docs/specs && echo lab-docs/specs) | sort -u
```

ID đã được nhắc ở đâu đó mà chưa có `ticket.md` → không cấp lại số đó; nếu chính việc đang ghi là việc ID đó mô tả thì dùng đúng ID đó.

**`parent`:** `<SPEC-ID>` khi ticket phải xong trước khi spec đó ship (`lab gate ship` và `lab ship-mark` đọc khóa này); bỏ trống khi độc lập. Không đặt parent là ID story.

Frontmatter không có chú thích cuối dòng — `lab check` báo lỗi khi `id`/`parent` chứa `#`.

```markdown
---
id: MAINT-001
type: ticket
status: open
repos: [lab-planning]
parent:
---

# MAINT-001 — <tên ngắn>

**Bối cảnh:** <tại sao có việc này — nguồn: lỗi nào, phát hiện ở đâu, luật nào bị vi phạm nếu là bug>
**Outcome:** <kết quả mong đợi, một câu>
**Tiêu chí xong:** <kiểm bằng gì — lệnh, test, số đo>
**Bỏ qua gì:** <bước nào của chuỗi bị bỏ qua và vì sao — ví dụ "không cần spec-backend vì chỉ đổi cấu hình">
**Blocked by:** <ID ticket phải xong trước, hoặc —>
**Chặn:** <ID ticket hoặc SPEC-ID bị ticket này chặn, hoặc —>
**Ledger:** <dòng ledger liên quan, hoặc —>

## Tasks
- [ ] T1: <việc — một câu>
- [ ] T2: <mỗi dòng một task>
```

`repos: []` nếu chỉ chạm tài liệu. Ticket nhỏ đi `implement <ID>` → `ship <ID>`; gate code không được miễn.

Ticket nhỏ chặn một ticket cụ thể của spec → ghi ID ticket nhỏ vào cột Blocked by của ticket đó: spec `DRAFT` thì sửa luôn (§2), spec `REVIEWED` thì đó là yêu cầu thay đổi mức spec (§4).

## 4. Yêu cầu thay đổi giữa chuỗi

User đổi yêu cầu khi chuỗi đang chạy, hoặc việc lộ ra làm sai điều đã chốt. Capture xác định mức, ghi lại, rồi chuyển về đúng skill — **không tự sửa** brief, story, Design Record hay spec.

| Mức | Dấu hiệu | Chuyển tới | Artifact mất hiệu lực |
|---|---|---|---|
| Brief | Thêm, bỏ, đổi một capability; đổi phạm vi sản phẩm | `grilling <PREFIX>-BRIEF` (cập nhật brief, `brief-version` +1) → `breakdown <PREFIX>` | Story trỏ version cũ thành STALE trong `lab coverage`; Design Record, spec, review của story bị ảnh hưởng phải đi lại từ các mức dưới |
| Story | Đổi acceptance criteria, tách hoặc gộp story; capability không đổi | `breakdown <PREFIX>` | Spec phủ story đó → REVISE; Design Record cần kiểm lại nếu AC chạm schema hoặc ranh giới |
| Cấu trúc | Đổi schema, ranh giới service, sở hữu dữ liệu, tách module/component, sở hữu state | `architecture-design <ID>` — Design Record từ `FROZEN` về `DRAFT` | `lab gate to-spec` FAIL cho mọi spec cùng `<dir>` tới khi FROZEN lại; spec chạm quyết định đổi → REVISE; `review.md` của chúng hết giá trị |
| Spec | Đổi contract, hành vi, trạng thái UI, ticket list; thiết kế không đổi | `to-spec <SPEC-ID>` REVISE — spec về `DRAFT`, `**Spec version:**` +1 | `review.md` hết giá trị (phải `spec-review` lại); `lab gate implement` FAIL cho mọi ticket còn mở của spec tới khi REVIEWED lại |
| Code | Sửa code để khớp đúng điều spec đã nói; không tài liệu nào đổi | Ticket theo §2 (spec `DRAFT`) hoặc §3 (spec `REVIEWED`) | Không có |

Luật chung:

- Ticket đã tick mà outcome đổi → thêm ticket mới, không `lab untick`, không sửa nội dung ticket cũ. Code đã ship không sửa ngược; thay đổi đi qua chuỗi như việc mới.
- Ghi một dòng ledger `PROPOSED` mô tả thay đổi, có ID bị ảnh hưởng — bước được chuyển tới sẽ hỏi user và chốt.
- Báo cáo nêu rõ mức, skill được chuyển tới, và từng artifact mất hiệu lực theo đường dẫn.

## 5. Ghi xong

1. `lab check` — FAIL thì sửa trước khi báo.
2. `lab commit <ID> "<mô tả>"` — `<ID>` là ID ticket nhỏ, hoặc `<SPEC-ID>` khi thêm ticket vào spec. Lệnh chỉ commit file thuộc ID; dòng ledger chỉ đi kèm khi chứa đúng `<ID>` đó. Không `git add -A` trong `lab-docs`.
3. Không push `main` của repo code. Push `lab-docs` (`--push`) chỉ khi bước gọi capture yêu cầu.

## 6. Điểm dừng — hỏi user

Mọi câu hỏi đi qua `.agents/references/decision-packet.md`, gom một gói cho một lần dừng. Dừng khi:

- Việc phải nâng thành story mới, tách hoặc gộp story — đề xuất mức §4 phù hợp, user quyết.
- Không xác định được `<dir>` sở hữu ticket (repo dùng chung nhiều product).
- Một ID đã được nhắc trong tài liệu mà chưa có `ticket.md`, và không chắc việc đang ghi có phải việc đó không.

Không dừng cho: dòng ledger `PROPOSED` (liệt kê trong báo cáo để user chốt sau), chọn mức §4 theo bảng, cấp số ID.

## 7. Bất biến

1. Không sinh ID trùng — quét theo §3 trước khi đặt.
2. Không sửa bảng Tickets của spec `REVIEWED`; không thêm khối `## Tasks` vào story.
3. Không sửa tay `status` của story; status story dẫn xuất từ `lab tick <TICKET-ID>`.
4. Không ghi DECIDED vào ledger — chỉ user nâng PROPOSED thành DECIDED.
5. Mọi ticket nhỏ có ít nhất một task `T<n>:`.
6. Một ID một file; ticket chạm nhiều repo liệt kê hết trong `repos`, không nhân bản theo repo.

## Không làm

- Không sửa code (việc của `implement`).
- Không chốt thiết kế trong ticket — câu hỏi mơ hồ ghi `OPEN` và đi §4 hoặc §6.
- Không sửa brief, story, Design Record, spec thay cho skill sở hữu chúng (trừ thêm dòng Tickets vào spec `DRAFT` theo §2).

## Đầu ra / bước tiếp theo

- **Đầu ra:** một trong — dòng `<STORY>-T<n>` mới trong bảng Tickets của spec `DRAFT` kèm `lab sync <SPEC-ID>`; `<dir>/specs/<SETUP|MAINT|EXP>-<n>/ticket.md` (`type: ticket`, `status: open`); dòng ledger `PROPOSED`; hoặc phiếu chuyển §4. `lab check` OK và đã `lab commit`.
- **Báo cáo:** mỗi việc một dòng — `<việc> → <đích> (<ID hoặc skill>) — chặn: <ID hoặc —>`; kèm danh sách artifact mất hiệu lực nếu có §4, và danh sách dòng ledger PROPOSED chờ user chốt.
- **Bước tiếp theo:** quay lại bước đã gọi capture; ticket mới không chặn việc hiện tại thì tiếp tục, có chặn thì làm ticket chặn trước (`implement <ID>`). Yêu cầu thay đổi → skill ở cột "Chuyển tới" của §4.
