---
name: grilling
description: Brainstorm từ ý tưởng thô tới Product Brief. Hai mode bên trong — EXPLORE (ý tưởng còn mơ hồ: unpack motivation, cách hiểu vấn đề) và GRILL (ý tưởng đã đánh giá được: hỏi decision frontier, bắt quyết định). Gate tự chuyển mode. Dùng khi user nói "brainstorm", "grill", "explore ý tưởng", "Brainstorm: [idea]". Kết thúc bằng Product Brief — không viết spec, không code.
metadata:
  short-description: Ý tưởng thô → EXPLORE/GRILL → Product Brief
---

# grilling — Brainstorm tới Product Brief

Đầu vào của chuỗi skill (`grilling → to-spec → architecture-review → implement → ship`) là **stories**, mà stories đến từ Product Brief. Skill này là **mảnh đầu chuỗi**: biến ý tưởng thô thành Product Brief đủ tốt để `to-spec` làm việc.

Phương pháp chi tiết **không nằm ở đây** — đọc `lab-docs/frameworks/product-grilling.md` (decision tree, frontier questioning, evidence policy, anti-overengineering). SKILL.md chỉ chứa quyết định và luật vận hành local.

## 0. Đọc trước

- `lab-docs/frameworks/product-grilling.md` — toàn bộ, trước round đầu tiên.
- Context local liên quan: `lab-docs/decision-ledger.md`, product-brief/stories của product đang nói tới (nếu có) — grilling **phải có căn cứ từ repo**, không chỉ từ lời kể trong chat.
- Skill nào của Lab liên quan tới ý tưởng (ví dụ identity, secrets) → đọc architecture tương ứng ở mức đủ để đánh giá feasibility, không copy vào câu hỏi.

## 1. Gate EXPLORE → GRILL

Không hỏi user "bạn muốn explore hay grill". Tự đánh giá sau mỗi round:

| Tình trạng | Mode |
|---|---|
| Chưa rõ problem/outcome, có ≥2 cách hiểu vấn đề chưa loại được, chưa có decision nào để đánh giá | **EXPLORE** |
| Đã có một direction có thể hỏi "nên chọn A hay B" — xuất hiện decision frontier | **GRILL** |
| Problem, outcome, build-or-not, core journey, MVP scope hội tụ; việc còn lại là ghi biên bản | **CONVERGE** — sinh Product Brief |

Chuyển mode được **nói rõ** cho user (một dòng: "đủ căn cứ để grill — chuyển sang hỏi quyết định"). Không quay lại EXPLORE trừ khi quyết định mới làm vỡ cách hiểu vấn đề.

## 2. Luật EXPLORE

- Unpack motivation, trigger thực tế, workflow hiện tại, workaround, constraint.
- Được phép nêu **2–3 cách hiểu cạnh tranh** về vấn đề — không ép user chọn sớm.
- Không hỏi decision frontier khi chưa có. Không đề xuất kiến trúc.
- Artifact: **messy-idea note** — lưu `lab-docs/products/<name>/idea-notes.md` (hoặc `lab-docs/platform/<cap>/` nếu thuộc capability). Phải tự đứng được không cần chat history. Format tự do nhưng bắt buộc có: vấn đề, motivation, 2–3 cách hiểu, constraints, những gì còn mơ hồ.
- EXPLORE không kéo dài vô hạn: sau 2–3 round mà vẫn mơ hồ → chỉ ra **cái gì cần làm rõ nhất** và đề xuất thí nghiệm/observed evidence rẻ nhất để thoát khỏi mơ hồ, thay vì tiếp tục hỏi.

## 3. Luật GRILL

- Mỗi round **1–4 frontier questions**, theo format ở `product-grilling.md` §3 (Q / Recommendation / Why).
- Gắn nhãn FACT / ASSUMPTION / HYPOTHESIS / DECISION. Không tự nâng ASSUMPTION/PROPOSED thành DECIDED — chỉ user xác nhận mới thành DECIDED.
- Giữ **decision ledger** (bảng ở §5 của framework) trong messy-idea note hoặc ngay trong Product Brief draft; mỗi round chỉ show delta có ý nghĩa.
- Anti-overengineering (§4 framework) áp dụng cho mọi recommendation: personal tool không tự động là SaaS; đề xuất "không build" nếu rẻ hơn.
- Khi phát hiện ý tưởng trùng/dẫm vào product đã có trong Lab → đối chiếu và hỏi user xem là mở rộng, thay thế, hay product mới.

## 4. Converge — Product Brief

Khi đạt stop criteria (§6 framework): sinh `lab-docs/products/<name>/product-brief.md` theo template §7 của framework, kèm ledger đầy đủ và `Implementation readiness`. Với teaching-related idea → thêm handoff §8.

**Dừng ở đây.** Không tự chuyển sang `to-spec`, không sinh stories, không code. Nếu user yêu cầu chạy tiếp → nói rõ chưa converge hoặc mời user dùng skill `to-spec`.

## 5. Bất biến

- Không code, không spec, không stories — output tối đa là Product Brief.
- Mọi artifact ghi file phải tự đứng được không cần chat history.
- Không bỏ qua messy-idea note khi ý tưởng mơ hồ — ngay cả khi user muốn grill ngay: ghi note 5 phút trước, rồi mới grill.
- Decision chỉ từ user; agent chỉ được PROPOSED.
- Skill này đứng ngoài nhánh backend/frontend — chỉ khi vào `to-spec` mới tách nhánh.
