---
name: spec-review
description: "Kiểm spec do to-spec viết có bám Design Record FROZEN hay không, và quét lỗi thiết kế còn lại. Pass 1 — độ tuân thủ (schema lệch, vượt ranh giới service, workaround/giải pháp tricky không có trong thiết kế, nhồi một file, tách file/module sai, state ownership lệch). Pass 2 — checklist backend/frontend cho failure mode, AuthZ, contract, UX states, test seam. Luôn ghi specs/<SPEC-ID>/review.md có verdict PASS|NEEDS-WORK|BLOCK; chỉ báo điểm lệch, không bắt user đọc lại từng dòng spec. Dùng khi user nói \"review spec\", \"spec-review\", \"kiểm spec\", \"review spec frontend\", hoặc khi orchestrate chạy sau to-spec. Không dùng để thiết kế (đó là architecture-design), không sửa nội dung spec, không review code đã viết."
metadata:
  short-description: "Spec ↔ Design Record — báo điểm lệch + checklist, ghi review.md"
---

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md` (mục "Hợp đồng bàn giao").

# spec-review

Spec đã sinh ra từ thiết kế mà user ngồi duyệt rồi. Việc của skill này: **tìm chỗ spec lệch khỏi thiết kế đó**, để user chỉ duyệt một danh sách điểm lệch, không đọc lại cả spec.

Trước đây là `architecture-review`. Việc **tạo** quyết định (boundary, schema, tách module) thuộc [`architecture-design`](../architecture-design/SKILL.md); skill này **không** phản biện lại quyết định đã DECIDED trong Design Record, và không thiết kế.

## Hai nhánh, không trộn

| Nhánh | Checklist (Pass 2) | Ràng buộc nền | Tiêu chí chấm |
|---|---|---|---|
| **Backend** | [`references/backend/checklist.md`](references/backend/checklist.md) | `lab-docs/architecture/backend.md` §10, `.agents/AGENTS.md` luật cứng 1–16 | User **đọc code/SQL/schema bằng mắt** → lỗi hiển nhiên khi nhìn |
| **Frontend** | [`references/frontend/checklist.md`](references/frontend/checklist.md) | `lab-docs/architecture/frontend.md` §0/§5/§6, `.agents/AGENTS.md` luật cứng 17–30 | User **không đọc code**, chỉ xem giao diện → lỗi vô hình chấm nặng hơn |

Pass 1 dùng chung [`references/conformance.md`](references/conformance.md) (có phần riêng cho từng nhánh). Thư mục spec có cả `spec-backend.md` và `spec-frontend.md` → review **cả hai**, trình bày hai phần riêng trong cùng một `review.md`.

## Đầu vào và điều kiện vào

- **Đầu vào:** `<SPEC-ID>` (tên thư mục dưới `specs/`), hoặc ID story/ticket thuộc spec đó. `lab show <ID>` hoặc `lab gate spec-review <ID>` cho biết spec nào; review **mọi** file `spec-*.md` trong `<dir>/specs/<SPEC-ID>/`.
- **Gate:** `node .agents/scripts/lab.mjs gate spec-review <ID>` — spec tồn tại và Design Record của từng phía có spec (`<dir>/design-backend.md` / `design-frontend.md`) là `FROZEN`. Backend cần thêm `db-schema.md`.
- Gate FAIL vì thiếu Design Record FROZEN → **dừng**, báo: *"chưa có Design Record phủ phần này — chạy `architecture-design` (FULL hoặc LITE) trước"*. Không review spec dựa trên thiết kế tự đoán. Spec còn dòng nào không truy được về ID Design Record → đó chính là finding (SR-C7), không phải lý do để im lặng.

## Quy trình

1. **Đọc:** `lab-docs/frameworks/design-principles.md` (luật L1–L7b); `.agents/AGENTS.md` (luật cứng 1–30); `lab-docs/architecture/backend.md` §10 hoặc `frontend.md` §0/§5/§6 theo nhánh; mọi `spec-*.md` trong thư mục spec; Design Record + nhật ký delta; `db-schema.md`; `lab-docs/decisions/decision-ledger.md` (chỉ DECIDED là ràng buộc); `<dir>/stories/<ID>.md` của các story trong dòng `**Stories:**`; với FE: `spec-backend.md` cùng thư mục. Đọc thật, không kết luận khi chưa đọc.
2. **Kiểm bằng máy trước, đọc bằng mắt sau.** Phần nào kiểm được bằng lệnh (grep tên bảng/cột/endpoint trong spec đối với `db-schema.md` và Design Record; đếm số dòng/trách nhiệm trong cây file đề xuất so với cây file đích; mọi đường dẫn file/§ spec dẫn chiếu có tồn tại không) thì **chạy lệnh**, không đọc lướt rồi kết luận. Ghi lệnh/cách đối chiếu trong mục "Đã kiểm tra".
3. **Pass 1 — Tuân thủ:** theo `references/conformance.md`. Mỗi phần tử spec phải truy được về một ID Design Record (D/INV/OWN/SYNC/FILE… hoặc ID FE tương ứng); và ngược lại, mỗi phần tử `core` của Design Record phải có chỗ trong spec/ticket.
4. **Pass 2 — Checklist** của đúng nhánh, **chỉ các trục Design Record chưa quyết**: failure mode chi tiết, AuthZ từng endpoint, contract/error code, test seam, UX states, bundle, token. Trục đã có quyết định trong Design Record (boundary, ownership, schema, state ownership, cây file) → đối chiếu ở Pass 1, không hỏi lại ở đây, trừ khi spec **mâu thuẫn với chính nó**.
5. **Ghi `review.md`** theo mục "Định dạng output", kể cả khi PASS.
6. **Sau verdict:** theo mục "Sau verdict".

## Ranh giới

- **Không sửa nội dung** spec, Design Record, schema, ledger. Ngoại lệ duy nhất: dòng `**Status:**` của spec khi user duyệt (mục "Sau verdict").
- **Không tự chốt** câu hỏi thuộc user: ownership, hành vi product, công nghệ chưa DECIDED. Câu hỏi đi vào **một** gói quyết định theo `.agents/references/decision-packet.md`.
- **Không nâng** PROPOSED/ASSUMED/DEFERRED/OPEN thành DECIDED — chỉ user làm việc đó.
- **Không tự đề xuất** hạ tầng hay cấu trúc chưa DECIDED (KV, Durable Objects, Redis, shared package, DI container, global store) như hướng sửa. Cloudflare Queues đã DECIDED (2026-10-27).
- Spec lệch Design Record mà **Design Record có vẻ sai**: vẫn báo là lệch; thêm một QUESTION "Design Record có cần mở lại?" — **không** coi spec đúng.

## Mức nghiêm trọng

| Mức | Nghĩa | Hệ quả |
|---|---|---|
| **BLOCKER** | Lệch quyết định/invariant **đã FROZEN**; vi phạm luật cứng 1–30 của `.agents/AGENTS.md` hoặc luật L1–L7b của `design-principles.md`; vi phạm ràng buộc DECIDED khác; làm dữ liệu không migrate/phục hồi được; lộ dữ liệu giữa service; hoặc lỗi **không thể phát hiện** khi không đọc code | Sửa trước khi code |
| **MAJOR** | Gây bug hoặc chi phí sửa lớn về sau, có đường vòng; phần tử `core` của Design Record không có trong spec | Sửa trước khi code |
| **MINOR** | Thiếu rõ ràng, không đổi hành vi (ví dụ đặt tên lệch nhưng cùng nghĩa) | Sửa khi tiện, không chặn |
| **QUESTION** | Cần user quyết; chưa phải lỗi | Vào gói quyết định, đếm vào `open-questions`, không tự trả lời |

Vi phạm luật cứng hoặc luật design-principles tối thiểu là BLOCKER, kể cả khi checklist ghi mức thấp hơn. Không dùng MINOR để né một vi phạm rõ ràng là BLOCKER; không dùng BLOCKER cho sở thích. **Nâng mức ở nhánh frontend** cho lỗi không nhìn thấy trên giao diện — ghi lý do ngay trong cột "Vì sao".

## Verdict

| Verdict | Điều kiện |
|---|---|
| **BLOCK** | Có BLOCKER do spec mâu thuẫn Design Record FROZEN hoặc luật cứng `.agents/AGENTS.md` / design-principles |
| **NEEDS-WORK** | Không BLOCK, nhưng còn BLOCKER khác hoặc MAJOR chưa xử lý, hoặc còn câu hỏi chờ user (`open-questions` > 0) |
| **PASS** | Không còn BLOCKER/MAJOR chưa xử lý **và** `open-questions: 0` |

**Không bao giờ PASS khi còn câu hỏi mở** — `lab check` báo lỗi và gate `implement` FAIL. MINOR không hạ verdict.

## Định dạng output

**Luôn** ghi `<dir>/specs/<SPEC-ID>/review.md` (`<dir>` = `lab-docs/products/<tên>/` hoặc `lab-docs/platform/<tên>/`), kể cả khi PASS. Lượt review mới **ghi đè** file và tăng số vòng.

```markdown
---
id: <SPEC-ID>-review
type: review
status: done
repos: [<repo>, ...]          # hợp các repo trong bảng Tickets của mọi spec được review
verdict: NEEDS-WORK           # PASS | NEEDS-WORK | BLOCK
open-questions: 1             # số câu QUESTION chưa được user trả lời
---

# Review spec — <SPEC-ID>

**Vòng:** 1/3 (vòng đầu + tối đa 2 vòng sửa)
**Đối tượng:** specs/<SPEC-ID>/spec-backend.md · specs/<SPEC-ID>/spec-frontend.md
**Design Record:** design-backend.md (FROZEN, delta đến 2026-10-27) · design-frontend.md (FROZEN) · db-schema.md
**Gói quyết định:** <liên kết, nếu có>

## Điểm lệch — backend

| ID | Mức | Mã | Vị trí spec | Design Record | Lệch gì | Hướng sửa |
|---|---|---|---|---|---|---|
| SR-C1 | BLOCKER | C1 Schema | spec-backend §3 `reminders.notified_at` | db-schema §4 (không có cột này) | Spec thêm cột chưa có trong schema | Bỏ cột, hoặc mở lại schema qua architecture-design |
| SR-C6 | MAJOR | C6 Cấu trúc file | spec-backend §6 `handlers/events.ts` | FILE1–FILE4 | Gộp 4 use case vào một file | Tách đúng FILE1–FILE4 |

## Điểm lệch — frontend

(cùng cột; mã C8–C14; ID `SR-C<n>`)

## Findings Pass 2

| ID | Mức | Trục | Vị trí | Vấn đề | Vì sao | Hướng sửa |
|---|---|---|---|---|---|---|
| SR-B1 | MAJOR | Failure mode | spec-backend §5 | Cron chạy lại gửi trùng | không có dedup | dùng `reminders.id` làm idempotency key |

## Độ phủ ngược (Design Record → spec)

| ID Design Record | Nhãn | Có trong spec/ticket? |
|---|---|---|
| INV1 | core | ❌ không có test nào |

## Câu hỏi chờ user

| ID | Câu hỏi | Phương án đề xuất | Vì sao chặn | Trả lời |
|---|---|---|---|---|
| SR-Q1 | ... | ... | ... | (trống = còn mở) |

## Đã kiểm tra, không thấy vấn đề
- <mục + cách kiểm, ví dụ: "mọi tên bảng/cột trong spec-backend §3 — grep đối chiếu db-schema.md">
```

Yêu cầu mỗi finding: **vị trí cụ thể** (file + section) · **dẫn ID Design Record hoặc ràng buộc** (không dẫn sở thích) · **hướng sửa 1–2 câu**. FE: nêu thêm lỗi **nhìn thấy** hay **không nhìn thấy**. ID: `SR-C<n>` (tuân thủ), `SR-B<n>` / `SR-F<n>` (Pass 2), `SR-Q<n>` (câu hỏi). `open-questions` = số dòng `SR-Q` có cột "Trả lời" trống.

Ghi xong chạy `node .agents/scripts/lab.mjs check` — phải OK.

## Sau verdict

Mọi chỗ cần user đi qua **một** gói quyết định theo `.agents/references/decision-packet.md` (trang HTML riêng tư, câu hỏi đánh số, phương án đề xuất đứng đầu). Không hỏi rải rác trong chat.

**PASS** → gói quyết định có một câu "Duyệt spec `<SPEC-ID>` để implement?" kèm tóm tắt verdict và các MINOR còn lại. User duyệt →
1. đổi đúng **một dòng** trong mỗi `spec-*.md` của thư mục: `**Status:** DRAFT` → `**Status:** REVIEWED`; không sửa gì khác;
2. `node .agents/scripts/lab.mjs check`;
3. `node .agents/scripts/lab.mjs commit <SPEC-ID> "spec-review PASS, user duyệt spec"`.

User không duyệt → ghi lý do thành finding mới trong `review.md`, verdict `NEEDS-WORK`, đi nhánh dưới.

**NEEDS-WORK chỉ vì câu hỏi mở** (không còn BLOCKER/MAJOR) → gói quyết định gồm mọi `SR-Q` **và** câu duyệt spec. Sau khi user trả lời: ghi câu trả lời vào cột "Trả lời", giảm `open-questions`. Câu trả lời không đổi spec → tính lại verdict (PASS) rồi làm như nhánh PASS trong cùng lần dừng. Câu trả lời đòi sửa spec → nhánh dưới.

**NEEDS-WORK / BLOCK do spec lệch** → trả về `to-spec <SPEC-ID>` ở chế độ sửa (REVISE) với danh sách `SR-*` cần xử lý, rồi chạy lại spec-review (vòng mới, ghi đè `review.md`). Không cần user giữa các vòng khi hướng sửa chỉ là đưa spec về đúng Design Record FROZEN / luật cứng. **Tối đa 2 vòng sửa**; vòng thứ 3 vẫn chưa PASS → dừng, gói quyết định trình các finding còn lại.

**Finding cần mở lại Design Record** (QUESTION "Design Record có cần mở lại?", hoặc BLOCK vì Design Record mâu thuẫn luật DECIDED) → không quay về to-spec; gói quyết định đề xuất `architecture-design` LITE (delta) cho phần đó. User quyết.

## Không làm

- Không thiết kế, không đề xuất kiến trúc mới (đó là `architecture-design`).
- Không tạo ticket, không sửa nội dung spec; chỉ ghi `review.md` và dòng `**Status:**` khi user duyệt.
- Không đề xuất endpoint/tính năng ngoài story.
- Không review chất lượng code (đó là vòng review trong `implement`).
- Không đánh giá lại quyết định DECIDED trừ khi spec mâu thuẫn với chính nó.
- Không kết luận PASS khi chưa đọc spec thật và chưa chạy đối chiếu Pass 1.
- **Không áp checklist frontend cho spec backend hoặc ngược lại.**

## Checklist trước khi trả

- [ ] Gate `spec-review` PASS; nếu không → đã dừng và báo.
- [ ] Đã review mọi `spec-*.md` trong `specs/<SPEC-ID>/`.
- [ ] Pass 1 chạy bằng đối chiếu thật (lệnh/grep), cách kiểm ghi ở "Đã kiểm tra".
- [ ] Mỗi phần tử spec truy được về ID Design Record, hoặc có finding SR-C7.
- [ ] Độ phủ ngược: mọi phần tử `core` đã được đối chiếu.
- [ ] Mỗi finding có vị trí cụ thể + ID dẫn chiếu; mỗi BLOCKER dẫn quyết định FROZEN/luật cứng/ràng buộc DECIDED/hậu quả cụ thể.
- [ ] Đúng checklist đúng nhánh; không finding nào chỉ dựa trên preference.
- [ ] QUESTION không bị trả lời thay user; `open-questions` khớp số câu còn mở; verdict đúng bảng Verdict.
- [ ] `review.md` có đủ frontmatter; `lab check` OK.

## Đầu ra / bước tiếp theo

```text
to-spec → spec-review → implement → ship
```

- **Đầu ra:** `<dir>/specs/<SPEC-ID>/review.md` — frontmatter `id: <SPEC-ID>-review`, `type: review`, `status: done`, `repos`, `verdict: PASS|NEEDS-WORK|BLOCK`, `open-questions: <n>`.
- **Kết thúc khi:** PASS + user duyệt → mọi `spec-*.md` có `**Status:** REVIEWED`, đã `lab commit <SPEC-ID>`. NEEDS-WORK/BLOCK → `to-spec` REVISE (tối đa 2 vòng rồi hỏi user qua gói quyết định).
- **Bước tiếp theo:** `implement <STORY>-T<n>` — ticket đầu tiên trong bảng `## <n>. Tickets` có cột Blocked by là `—` (hoặc mọi ticket chặn đã xong). Gate `implement` đòi spec REVIEWED, review PASS, `open-questions: 0`, có `progress.md` (`lab sync <SPEC-ID>`).
