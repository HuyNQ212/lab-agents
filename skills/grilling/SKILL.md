---
name: grilling
description: "Brainstorm từ ý tưởng thô tới Product Brief, hoặc cập nhật một brief đã có (<PREFIX>-BRIEF). Hai mode bên trong — EXPLORE (ý tưởng còn mơ hồ: unpack motivation, cách hiểu vấn đề) và GRILL (ý tưởng đã đánh giá được: hỏi decision frontier, bắt quyết định qua gói quyết định). Gate tự chuyển mode. Đầu ra là product-brief.md đúng hợp đồng bàn giao (frontmatter <PREFIX>-BRIEF, brief-version, mục ## Capabilities), status done chỉ sau khi user duyệt. Dùng khi user nói \"brainstorm\", \"grill\", \"explore ý tưởng\", \"Brainstorm: [idea]\", \"cập nhật brief\". Không viết spec, không sinh stories, không code."
metadata:
  short-description: "Ý tưởng thô hoặc brief cũ → EXPLORE/GRILL → Product Brief"
---

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md`.

# grilling — Brainstorm tới Product Brief

Mảnh đầu chuỗi `grilling → prototype (tùy chọn) → breakdown → architecture-design → to-spec → spec-review → implement → ship`. Skill này biến ý tưởng thô thành Product Brief đủ tốt để `breakdown` phân rã, hoặc cập nhật brief đã có khi breakdown/user phát hiện lỗ hổng requirement.

Phương pháp chi tiết **không nằm ở đây** — đọc `lab-docs/frameworks/product-grilling.md` (decision tree, frontier questioning, evidence policy, chống phình phạm vi). SKILL.md chỉ chứa quyết định và luật vận hành local.

## 0. Đọc trước

- `lab-docs/frameworks/product-grilling.md` — toàn bộ, trước round đầu tiên.
- `lab-docs/frameworks/design-principles.md` — ràng buộc cho mọi đề xuất, kể cả đề xuất ở mức product.
- `.agents/references/decision-packet.md` — cách duy nhất để hỏi user.
- `lab-docs/frameworks/documentation-standards.md` §0 và §0d — chuẩn frontmatter và mục `## Capabilities`.
- `lab-docs/README.md`, `lab-docs/decisions/decision-ledger.md`, brief và `stories/<ID>.md` của product đang nói tới (nếu có) — grilling **phải có căn cứ từ repo**, không chỉ từ lời kể trong chat.
- `node .agents/scripts/lab.mjs status` — xem các tiền tố ID đã dùng trước khi đề xuất PREFIX.
- Ý tưởng chạm hạ tầng Lab (identity, secrets, gateway…) → đọc architecture tương ứng ở mức đủ để đánh giá feasibility, không copy vào câu hỏi.

## 1. Gate EXPLORE → GRILL → CONVERGE

Không hỏi user "bạn muốn explore hay grill". Tự đánh giá sau mỗi round:

| Tình trạng | Mode |
|---|---|
| Chưa rõ problem/outcome, có ≥2 cách hiểu vấn đề chưa loại được, chưa có decision nào để đánh giá | **EXPLORE** |
| Đã có một direction có thể hỏi "nên chọn A hay B" — xuất hiện decision frontier | **GRILL** |
| Problem, outcome, build-or-not, core journey, phạm vi bản đầu hội tụ; việc còn lại là ghi biên bản | **CONVERGE** — sinh Product Brief (§4) |

Chuyển mode được **nói rõ** cho user (một dòng: "đủ căn cứ để grill — chuyển sang hỏi quyết định"). Không quay lại EXPLORE trừ khi quyết định mới làm vỡ cách hiểu vấn đề.

## 2. Luật EXPLORE

- Unpack motivation, trigger thực tế, workflow hiện tại, cách xử lý hiện tại, constraint. Câu hỏi EXPLORE là thu thập bối cảnh, hỏi trong chat; chưa phải gói quyết định.
- Được phép nêu **2–3 cách hiểu cạnh tranh** về vấn đề — không ép user chọn sớm.
- Không hỏi decision frontier khi chưa có. Không đề xuất kiến trúc.
- Artifact: **messy-idea note** tại `<dir>/idea-notes.md`, với `<dir>` = `lab-docs/products/<tên>/` hoặc `lab-docs/platform/<tên>/`. Phải tự đứng được không cần chat history. Bắt buộc có: vấn đề, motivation, 2–3 cách hiểu, constraints, những gì còn mơ hồ.
- Sau 2–3 round mà vẫn mơ hồ → chỉ ra **cái gì cần làm rõ nhất** và đề xuất thí nghiệm hoặc bằng chứng quan sát được để thoát khỏi mơ hồ, thay vì tiếp tục hỏi.

## 3. Luật GRILL

- Mỗi round **1–4 frontier questions**, gửi thành **một gói quyết định** theo `.agents/references/decision-packet.md` (Q1..Qn, phương án đề xuất đứng đầu, lý do, hệ quả, capability bị ảnh hưởng). Nội dung từng câu theo `product-grilling.md` §3.
- Nhận định gắn nhãn bằng chứng FACT / ASSUMPTION / HYPOTHESIS. Quyết định mang trạng thái OPEN / PROPOSED / DECIDED / DEFERRED / OUT OF SCOPE. Chỉ user nâng thành DECIDED; câu không được trả lời giữ nguyên.
- Giữ **decision ledger nháp** (bảng ở `product-grilling.md` §5) trong idea note hoặc brief nháp; mỗi round chỉ show delta có ý nghĩa.
- **Chống phình chỉ áp dụng cho phạm vi tính năng** (`product-grilling.md` §4): tính năng nào không có nhu cầu thật thì đề xuất bỏ hoặc DEFERRED. Không áp dụng cho chất lượng kỹ thuật. Cấm dùng "rẻ hơn", "nhanh hơn", "bản đầu thôi", "chỉ một người dùng" làm lý do cắt tính đúng (múi giờ, ranh giới dữ liệu, `user_id`, xác thực) — `design-principles.md` L1.
- **Lựa chọn kỹ thuật** (auth, lưu trữ, deployment, service nào sở hữu dữ liệu — nhánh F của decision tree) chỉ ghi dạng PROPOSED trong mục "Ghi chú cho architecture-design" của brief. Grilling không chốt chúng thành DECIDED, không đưa vào `## Capabilities`.
- Ý tưởng trùng hoặc dẫm vào product đã có trong Lab → đưa vào gói quyết định câu "mở rộng, thay thế, hay product mới".
- Bế tắc (user trả lời mơ hồ hoặc chưa có dữ liệu) → áp dụng `product-grilling.md` §6: nêu bằng chứng cần có và đề xuất DEFERRED cho câu đó trong gói tiếp theo; không tự đặt DEFERRED.

## 4. CONVERGE — Product Brief mới

Khi đạt stop criteria (`product-grilling.md` §6):

1. **Chọn chỗ và ID.** Từ `lab status`, đề xuất product hay platform, tên thư mục `<dir>` và `<PREFIX>` chưa dùng (viết hoa, 2–4 chữ). Ba điểm này là câu hỏi của gói duyệt ở bước 3.
2. **Ghi `<dir>/product-brief.md`** theo mẫu `product-grilling.md` §7, đúng hợp đồng:
   - frontmatter đúng thứ tự `id: <PREFIX>-BRIEF`, `type: brief`, `status: open`, `repos: []`, `brief-version: 1`, `date: <yyyy-mm-dd>`;
   - mục `## Capabilities`, mỗi dòng `- C<n>: <mô tả> [<trạng thái>]`, nhãn **đứng cuối dòng**, không có chữ nào sau dấu `]`;
   - trạng thái nhãn: `[DECIDED <yyyy-mm-dd>]` khi user đã chọn; `[OPEN]` cho PROPOSED, ASSUMED, REVISIT hoặc chưa trả lời; `[DEFERRED]`; `[OUT OF SCOPE]` cho non-goal user đã chốt loại;
   - mỗi capability là một năng lực người dùng nhìn thấy, không phải lựa chọn kỹ thuật.
   - Thêm frontmatter vào `idea-notes.md` (`id: <PREFIX>-IDEA`, `type: notes`, `status: done`, `repos: []`, `parent: <PREFIX>-BRIEF`) để `lab commit` gom cùng brief.
   - Ý tưởng liên quan Teaching → thêm handoff `product-grilling.md` §8.
3. **Chạy `node .agents/scripts/lab.mjs check`**, sửa đến khi OK. Rồi gửi **gói duyệt brief** theo decision-packet: đầu trang là PREFIX, `<dir>`, mọi capability còn `[OPEN]`, phạm vi bản đầu và non-goal; phần dưới là brief đầy đủ. **Dừng chờ user.**
4. **Sau khi user trả lời:** cập nhật nhãn theo câu trả lời (`DECIDED <ngày>`; câu không trả lời giữ `[OPEN]`), thêm dòng vào `lab-docs/decisions/decision-ledger.md` cho quyết định khó đảo ngược, ghi rõ `<PREFIX>-BRIEF` trong dòng đó.
5. **Chỉ khi user duyệt brief** mới sửa `status: open` → `status: done`. Brief không có khối Tasks nên `lab done` không áp dụng; đây là chỗ duy nhất sửa status bằng tay, và chỉ sau lời duyệt rõ ràng của user.
6. Chạy `lab check` và `lab gate breakdown <PREFIX>` — cả hai phải PASS. Commit bằng `lab commit <PREFIX>-BRIEF "<mô tả>" --push` (chỉ file của ID đó trong `lab-docs`).

## 5. Cập nhật brief đã có

Đầu vào `<PREFIX>-BRIEF` (do user, `breakdown` hoặc `orchestrate` gửi về khi brief thiếu requirement).

1. Đọc brief và chạy `lab coverage <PREFIX>` để biết capability nào đã có story.
2. Grill **chỉ phần thay đổi** theo §3. Bản nháp thay đổi nằm trong gói quyết định, chưa ghi vào brief — brief đang `done` giữ nguyên status để không chặn story đang chạy.
3. Sau khi user duyệt, ghi vào brief:
   - tăng `brief-version` thêm 1, đặt `date` là ngày duyệt; giữ nguyên `id: <PREFIX>-BRIEF`;
   - **không đánh số lại** capability: giữ `C<n>` cũ, capability mới lấy số tiếp theo, capability bị bỏ đổi nhãn thành `[OUT OF SCOPE]` và giữ dòng;
   - capability đổi nghĩa thì sửa mô tả tại chỗ, nhãn `[DECIDED <ngày duyệt>]`.
4. Ghi ledger, chạy `lab check`, rồi `lab coverage <PREFIX>`: story trỏ version cũ hiện STALE, capability mới hiện UNCOVERED — đó là việc của `breakdown`, không sửa story ở đây. Commit như §4 bước 6.

## 6. Bất biến

- Không code, không spec, không stories — output tối đa là Product Brief.
- Mọi artifact ghi file phải tự đứng được không cần chat history.
- Không bỏ qua messy-idea note khi ý tưởng mơ hồ — ngay cả khi user muốn grill ngay: ghi note trước, rồi mới grill.
- Quyết định chỉ từ user, qua gói quyết định; agent chỉ được PROPOSED. Không gộp nhiều câu rồi coi một câu trả lời là chốt tất cả, trừ khi user trả lời "duyệt" cho cả gói.
- Skill này đứng ngoài nhánh backend/frontend — chỉ khi vào `architecture-design` và `to-spec` mới tách nhánh.

## Đầu ra / bước tiếp theo

- **Đầu ra:** `<dir>/product-brief.md` với frontmatter `id: <PREFIX>-BRIEF`, `type: brief`, `status`, `repos: []`, `brief-version: <n>`, `date`, và mục `## Capabilities` dòng `- C<n>: <mô tả> [OPEN|DECIDED <ngày>|DEFERRED|OUT OF SCOPE]`.
- **Kết thúc khi:** user duyệt qua gói quyết định → `status: done`; `lab check` OK; `lab gate breakdown <PREFIX>` PASS.
- **Bước tiếp theo:** `prototype <PREFIX>` nếu cần duyệt giao diện trước, nếu không thì `breakdown <PREFIX>`. Sau khi cập nhật brief: `breakdown <PREFIX>` để xử lý STALE/UNCOVERED.
