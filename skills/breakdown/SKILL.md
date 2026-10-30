---
name: breakdown
description: "Phân rã Product Brief thành Epics/Stories/AC sau coverage audit. Sáu bước bắt buộc — DISCOVER EXISTING → COVERAGE AUDIT (bằng script, không audit tay) → BREAKDOWN DRAFT → SCOPE + USER REVIEW (một gói quyết định, checkpoint dừng bắt buộc) → PUBLISH → COMMIT. Đầu vào là <PREFIX> có brief done; đầu ra là stories/<ID>.md và stories/<EPIC-ID>.md, kết thúc khi lab coverage <PREFIX> exit 0. Dùng khi user nói \"breakdown\", \"break ra story\", \"chia tickets\", hoặc khi orchestrate chuyển tiếp sau grilling/prototype. Không viết spec, không tạo ticket kỹ thuật, không code."
metadata:
  short-description: "Product Brief → coverage audit → stories/AC"
---

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md` (mục "Hợp đồng bàn giao").

# breakdown — Product Brief thành Stories

Chuỗi: `grilling → [prototype] → **breakdown** → architecture-design → to-spec → spec-review → implement → ship`. Grilling chốt *what/why* (Product Brief); skill này phân rã *behavior* (stories + AC). KHÔNG đụng thiết kế kỹ thuật — đó là việc của `architecture-design` (quyết định) rồi `to-spec` (spec + bảng Tickets).

Phương pháp chi tiết đọc `lab-docs/frameworks/delivery-breakdown.md`. SKILL.md chỉ chứa luật vận hành và điểm neo với script; chỗ nào lệch với framework thì hợp đồng bàn giao và SKILL.md này thắng.

`lab` = `node .agents/scripts/lab.mjs`, chạy từ workspace root.

## 0. Discover existing

- **Prefix:** chữ in hoa, 2–6 chữ cái, trùng prefix của brief (`pln` → `PLN`). Mọi ID trong phiên dùng prefix đã chuẩn hóa.
- **Điều kiện vào:** `lab gate breakdown <PREFIX>` — Product Brief `status: done` và có `## Capabilities`. FAIL → quay lại `grilling` cho brief đó, không breakdown khi chưa có brief done.
- **Tìm brief bằng `lab status`** (cột FILE của ID `<PREFIX>-BRIEF`), không ghép đường dẫn tay. Brief nằm ở một trong hai gốc: `lab-docs/products/<tên>/` hoặc `lab-docs/platform/<tên>/`. Gọi thư mục chứa brief là `<dir>`; stories luôn đặt ở `<dir>/stories/`.
- Đọc: `lab-docs/frameworks/delivery-breakdown.md` §2–§6, brief, `lab-docs/decisions/decision-ledger.md`, mọi file trong `<dir>/stories/` (kể cả story `abandoned`), prototype đã duyệt trong `lab-prototype/` nếu README của prototype có dòng `**Approval:** APPROVED`, và tài liệu của service khác khi phạm vi chạy ngang nhiều service.

## 1. Coverage audit — bằng script, không audit tay

**Bắt buộc chạy:**

```bash
node .agents/scripts/lab.mjs coverage <PREFIX>   # vd: coverage PLN
```

Script đọc capability từ brief version mới nhất và đối chiếu với stories/tickets qua khóa frontmatter `brief:` + `brief-version:` + `covers:`. Đầu ra là bảng COVERED / UNCOVERED / STALE (story trỏ brief version cũ hoặc brief ID khác) / DEFERRED / OUT OF SCOPE.

Luật:
- Báo cáo audit **phải kèm output của script**. Cấm tự lập bảng coverage bằng cách đọc file rồi suy luận — dễ sót.
- Script chỉ chắc chắn về UNCOVERED / STALE. Các mục nghi PARTIAL hoặc cần xét ngữ nghĩa AC → **lúc này** agent mới đọc story tương ứng và đánh giá, ghi rõ "script-flagged for review".
- **STALE sau khi brief cập nhật:** chỉ sửa các story bị đánh STALE — đọc lại capability đã đổi, chỉnh AC nếu nghĩa đổi, cập nhật `covers:` và `brief-version:` theo brief mới. Không viết lại story không bị ảnh hưởng.
- Capability `OPEN` trong brief → không thành story; ghi vào gói quyết định là điểm chặn và trả về `grilling` cho đúng capability đó.

## 2. Draft stories

Viết bản nháp đầy đủ cho phạm vi đề xuất **trước** khi hỏi user, để user duyệt scope và nội dung trong một lần. Theo framework §5A, chỉ mức Epics/Stories/AC — ticket kỹ thuật là việc của `to-spec` sau Design Record, breakdown không sinh ticket.

**Cấp ID:**
- Story `<PREFIX>-<nnn>` (ba chữ số), epic `<PREFIX>-E<nn>`. Số mới = số lớn nhất đang có trong `<dir>/stories/` + 1, quét cả story `abandoned`. Không tái dùng, không đánh số lại ID đã có.
- Capability đã có story → sửa file cùng ID, không tạo story trùng.

**Frontmatter story — đúng thứ tự, đúng khóa:**

```markdown
---
id: PLN-011
type: story
status: open
repos: [lab-planning]
parent: PLN-E04
brief: PLN-BRIEF
brief-version: 3
covers: [C1, C2]
---
```

- `brief-version` lấy từ frontmatter của brief đang cover. Thiếu `brief`/`covers` → `lab check` FAIL; thiếu `brief-version` → coverage không bắt được STALE lần sau.
- Story không có khối `## Tasks` và không sửa tay `status`: status do `lab tick <TICKET-ID>` dẫn xuất từ ticket của spec.
- Một capability nhiều story cũng được; mỗi story `covers:` ít nhất một capability. Story chạm nhiều service: vẫn một story một outcome, mô tả dependency từng service.
- Non-goals và DEFERRED giữ nguyên trạng thái; không tự tạo requirement mới lấp trống.

**Epic** `<dir>/stories/<EPIC-ID>.md`: frontmatter `id`, `type: epic`, `repos` — không `status`, không `## Tasks`; thân là mô tả, danh sách story con, dependencies. Bỏ tầng epic chỉ khi phạm vi chỉ có một story.

## 3. Scope + duyệt — một gói quyết định (checkpoint bắt buộc)

Dừng **một lần** theo `.agents/references/decision-packet.md`, gói gồm cả scope lẫn bản nháp:
- Câu hỏi đầu: duyệt phạm vi đợt này (ưu tiên MVP / một vertical slice), phương án đề xuất đứng đầu.
- Tối đa 1–3 câu hỏi khác có khả năng đổi scope; capability OPEN chặn breakdown; không grill lại brief.
- Phần dưới trang: output `lab coverage`, nguồn đã kiểm tra, danh sách story/epic nháp kèm AC, dependencies, coverage dự kiến sau breakdown.

Không tự xác nhận thay user. User đã chỉ định scope trong lệnh → gói chỉ còn câu duyệt bản nháp. User đổi scope → sửa nháp, cập nhật cùng trang, hỏi lại phần đổi.

## 4. Publish

Sau khi user duyệt:
1. Ghi `<dir>/stories/<ID>.md` và `<dir>/stories/<EPIC-ID>.md`, một story một file; sửa file cùng ID nếu đã có. Mỗi file ghi nguồn brief ID/version để lần audit sau đối chiếu.
2. `lab check` OK.
3. `lab coverage <PREFIX>` exit 0 — không còn UNCOVERED/STALE ngoài DEFERRED/OUT OF SCOPE. Capability user đã loại khỏi đợt này mà brief vẫn chưa DEFERRED → quay lại `grilling` để user đổi trạng thái trong brief, không tự sửa brief.
4. `lab commit <PREFIX> "breakdown: <phạm vi>"` (thêm `--push` khi chuỗi cần bản trên remote); báo lại danh sách file đã commit.

Không tạo GitHub Issues, không code.

## 5. Bất biến

- Coverage audit luôn qua `lab coverage`, agent chỉ bổ sung phần ngữ nghĩa script không chốt được.
- Không nâng OPEN/DEFERRED trong brief thành story; chỉ user nâng lên DECIDED.
- Output tối đa là epics/stories/AC — không ticket kỹ thuật, không spec, không code.
- Nếu audit phát hiện brief còn lỗ hổng requirement lớn → quay lại `grilling` đúng phần thiếu, không tự vá trong breakdown.

## Đầu ra / bước tiếp theo

- **Đầu vào:** `<PREFIX>`, gate `lab gate breakdown <PREFIX>` PASS.
- **Đầu ra:** `<dir>/stories/<EPIC-ID>.md` (`type: epic`) và `<dir>/stories/<ID>.md` (`type: story`, `status: open`, `repos`, `parent`, `brief`, `brief-version`, `covers`).
- **Kết thúc khi:** `lab coverage <PREFIX>` exit 0, `lab check` OK, đã `lab commit <PREFIX>`.
- **Bước tiếp theo:** `architecture-design <EPIC-ID hoặc story ID>`.
