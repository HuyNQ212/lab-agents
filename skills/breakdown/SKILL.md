---
name: breakdown
description: Phân rã Product Brief thành Epics/Stories/AC sau coverage audit. Sáu bước bắt buộc — DISCOVER EXISTING → COVERAGE AUDIT (bằng script, không audit tay) → SCOPE CONFIRMATION (checkpoint dừng bắt buộc) → BREAKDOWN DRAFT → USER REVIEW → PUBLISH. Dùng khi user nói "breakdown", "break ra story", "chia tickets". Không tự chạy sau khi grilling xong; không viết spec, không code.
metadata:
  short-description: Product Brief → coverage audit → stories/AC
---

# breakdown — Product Brief thành Stories

Chuỗi: `grilling → **breakdown** → architecture-design → to-spec → spec-review → implement → ship`. Grilling chốt *what/why* (Product Brief); skill này phân rã *behavior* (stories + AC). KHÔNG đụng thiết kế kỹ thuật — đó là việc của `architecture-design` (quyết định) rồi `to-spec` (spec).

Phương pháp chi tiết đọc `lab-docs/frameworks/delivery-breakdown.md`. SKILL.md chỉ chứa luật vận hành và điểm neo với script.

## 0. Đọc trước

- `lab-docs/frameworks/delivery-breakdown.md` — toàn bộ.
- Product Brief của product đang nói tới: `lab-docs/products/<product>/product-brief.md` — nếu không tìm thấy brief với ID đang có → **dừng**, bảo user chạy `grilling` trước. Không breakdown mà không có brief.
- Chạy `node .agents/scripts/lab.mjs status` — hiện trạng ID đang mở.

## 1. Coverage audit — bằng script, không audit tay

**Bắt buộc chạy:**

```bash
node .agents/scripts/lab.mjs coverage <PREFIX>   # vd: coverage PLN
```

Script đọc capability từ brief version mới nhất và đối chiếu với stories/tickets qua khóa frontmatter `brief:` + `covers:`. Đầu ra là bảng COVERED / UNCOVERED / STALE (story trỏ brief version cũ) / DEFERRED.

Luật:
- Báo cáo audit **phải kèm output của script**. Cấm tự lập bảng coverage bằng cách đọc file rồi suy luận — dễ sót.
- Script chỉ chắc chắn về UNCOVERED / STALE. Các mục nghi PARTIAL hoặc cần xét ngữ nghĩa AC → **lúc này** agent mới đọc story tương ứng và đánh giá, ghi rõ "script-flagged for review".
- Nếu brief chưa có section `## Capabilities` machine-readable → dừng, nhờ user (hoặc quay lại `grilling` Round CONVERGE) chuẩn hóa brief trước. Không tự đoán capability từ văn xuôi.

## 2. Scope confirmation — checkpoint bắt buộc

Sau audit, **dừng và trình bày** (framework §4):
- Kết quả coverage + nguồn đã kiểm tra.
- Phạm vi đề xuất đợt này (ưu tiên MVP / một vertical slice).
- Mức output: (A) Epics/Stories/AC — mặc định; (B) thêm vertical-slice tickets — chỉ khi user muốn.
- Tối đa 1–3 câu hỏi có khả năng đổi scope. Không grill lại brief.

Không tự xác nhận thay user. Nếu user đã chỉ định scope trong lệnh → xác nhận ngắn phần còn thiếu.

## 3. Draft stories

Theo framework §5A. Ràng buộc bắt buộc về metadata:
- Mỗi story có frontmatter đầy đủ theo `documentation-standards.md` §0, trong đó **`brief: <brief-ID>`** trỏ tới brief version đang cover và **`covers: [C1, C2]`** liệt kê capability ID từ section `## Capabilities` của brief. Thiếu hai khóa này → `lab check` không pass và coverage sau này sẽ lệch.
- Một capability nhiều story cũng được; mỗi story `covers:` ít nhất một capability. Story cross-service: vẫn một story một outcome, mô tả dependency từng service.
- Non-goals và DEFERRED giữ nguyên trạng thái; không tự tạo requirement mới lấp trống.
- Chạy `lab check` sau khi viết file. Chạy lại `lab coverage <PREFIX>` để xác nhận mọi capability thuộc scope đã COVERED.

## 4. Publish

Theo framework §6: trình draft → chờ duyệt → ghi vào `lab-docs/products/<product>/stories.md` (sửa file có sẵn, không tạo file trùng). Đầu file ghi nguồn brief ID/version + phạm vi coverage để lần audit sau đối chiếu. Không tạo GitHub Issues, không code.

## 5. Bất biến

- Không tự chạy khi user chưa yêu cầu breakdown — kể cả ngay sau Product Brief mới xong.
- Coverage audit luôn qua `lab coverage`, agent chỉ bổ sung phần ngữ nghĩa script không chốt được.
- Không nâng OPEN/DEFERRED trong brief thành story.
- Output tối đa là stories/AC (và tickets nếu được yêu cầu mức B) — không spec, không code.
- Nếu audit phát hiện brief còn lỗ hổng requirement lớn → quay lại `grilling` đúng phần thiếu, không tự vá trong breakdown.
