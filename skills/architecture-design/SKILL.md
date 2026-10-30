---
name: architecture-design
description: "Ngồi cùng user chốt các quyết định cấu trúc khó đảo ngược — db schema, ranh giới service, data ownership, tách module/component FE, state ownership — trước khi viết spec. Hai nhánh (backend, frontend) và hai luồng (FULL cho một cụm story/epic, LITE cho story nằm gọn trong thiết kế đã có). Đi từng lớp, mỗi gate dừng chờ user; thiết kế ở mức đầy đủ rồi user gọt. Ra Design Record. Dùng khi user nói \"design\", \"thiết kế schema\", \"tách module\", \"architecture design\", hoặc khi to-spec dừng vì thiếu Design Record. Không viết spec, không viết code."
metadata:
  short-description: "Cụm story → Design Record (từng lớp, user duyệt từng gate)"
---

# architecture-design — cùng user chốt thiết kế

Chỗ này sai thì mọi thứ sau sai theo. Vì vậy **không phải agent chạy một mạch rồi trình bày kết quả** — đây là phiên ngồi chung, đi từng quyết định.

Đứng giữa `breakdown` và `to-spec`:

```text
breakdown → architecture-design → to-spec → spec-review → implement → ship
```

Đầu ra là **Design Record đã duyệt**. `to-spec` chuyển nó thành spec; `spec-review` kiểm spec có bám nó không. Skill này **không viết spec, không viết code, không viết migration.**

## Luật vận hành (cứng)

Nguồn: `lab-docs/frameworks/design-principles.md` L1–L7b — đọc trước mỗi phiên. Ở đây chỉ ghi phần riêng của skill:

1. **Dựng bản nháp đầy đủ một mạch, đưa MỘT trang duyệt.** Agent tự đi hết các lớp (ownership → quan hệ/invariant → cột/cây file), mỗi điểm khó có ≥2 phương án; trang duyệt (Artifact, tiếng Việt đủ chữ) đặt các điểm cần user quyết lên đầu. Giữa chừng chỉ dừng khi vướng quyết định thật (rule 3). Không coi một câu trả lời là chốt nhiều thứ.
2. **Mỗi quyết định có ≥2 phương án hợp lệ**, mỗi phương án đủ ba dòng theo L6: chi phí đặt vào đâu · sai thế nào khi sự cố · chặn gì về sau. Rồi **một khuyến nghị kèm lý do**. Phương án vi phạm ranh giới (L2) không được trình bày như lựa chọn ngang hàng — loại và nói vì sao.
3. **Vướng thì dừng, không rẽ.** Gặp ràng buộc, xung đột, hạ tầng chưa có, câu hỏi chưa ai trả lời → báo: *vướng gì · các lựa chọn · hệ quả mỗi lựa chọn*. **Workaround cũng là một quyết định thiết kế, thuộc về user.** Cấm từ vựng L5. **"Chỉ một mình dùng" không phải lý do** để hard-code giá trị, bỏ múi giờ, bỏ `user_id`, hay chọn phương án cẩu thả: thiết kế như hệ thống nhiều người dùng, nhiều múi giờ.
3b. **Không giật tít rủi ro.** Trước khi nêu một rủi ro/OPEN, tự phân loại: lỗi code (test bắt), lỗi vận hành (việc người vận hành), lỗi cấu hình production (bước verify của `ship` bắt), hay lỗi do thiết kế mà ba thứ trên không bắt được. Chỉ loại cuối mới là OPEN cần user quyết; các loại kia bỏ hoặc ghi một dòng "không đáng kể".
4. **Chỉ user chốt.** Quyết định thành DECIDED khi user xác nhận bằng lời. Sau đó ghi ngay vào Design Record + dòng `decision-ledger`. Đã chốt thì **không đổi** khi chưa hỏi lại.
5. **Không tự gọt.** Xem "Trần thiết kế" bên dưới.
6. **Các lớp (G1–G3) chạy liền, gate duyệt gộp một lần** ở G4: user gọt và đóng băng. Chỉ dừng sớm khi vướng.
7. **Chỉ dừng khi cần ý kiến user về một quyết định.** Việc cập nhật tài liệu, ghi bản nháp, sửa trang xem, thêm mục "còn thiếu" thì **làm luôn rồi báo ngắn**, không hỏi xin phép. Mỗi lượt tối đa một câu hỏi.
8. **Viết đủ chữ.** Không dùng mã viết tắt (O1, G2, OWN, ratify, FULL…) khi nói với user mà chưa giải thích; mã chỉ là chỗ tham chiếu trong Design Record, kèm tên đầy đủ.

## Trần thiết kế — đầy đủ trước, user gọt sau

Thiết kế ở mức **đúng và đầy đủ nhất** cho ownership, quan hệ, invariant, failure mode, cấu trúc module. Không rút về "MVP". Gọt là việc của user ở gate G4, vì gọt một thiết kế đầy đủ rẻ hơn nhiều so với bổ sung vào một thiết kế đã bị agent tự rút.

Để việc gọt rẻ:
- Mỗi phần tử gắn nhãn **`core`** (bỏ là sai ranh giới/dữ liệu) hoặc **`mở rộng`** (bỏ được, vẫn đúng), kèm **chi phí khi bỏ** (một dòng: bỏ thì mất gì, phải sửa chỗ nào).
- Liệt kê **giả định hạ tầng**: phần tử nào đòi thứ chưa có (outbox, cron, binding mới…) để user biết cái gì phải dựng.

**Hạ tầng DEFERRED (KV/Queues/DO/Redis…) không bị cấm.** Nếu nó là phương án thiết kế tốt nhất thì **phải đề xuất**, không được né vì "chưa có" (L4). Cách làm: trình bày như một phương án thật (ba dòng L6), ghi vào "giả định hạ tầng" kèm chi phí dựng và chi phí bỏ; chỉ khi user chốt thì mới thành DECIDED. Loại một phương án vì "DEFERRED" là sai; chỉ được loại vì lý do kỹ thuật (nó không thêm độ tin cậy, trùng lặp thứ đã có…).

Trần này **không** cho phép: index "chuẩn bị trước" (L6b); vi phạm luật cứng backend 1–16 / frontend 17–30 (muốn đổi luật cứng thì nêu rõ như một quyết định cho user); thêm tính năng ngoài story. "Đầy đủ" nghĩa là đủ ownership/invariant/failure, không phải đầy đủ tính năng.

## Gate 0 — chọn FULL hay LITE

Làm đầu tiên, **user xác nhận** trước khi đi tiếp.

| Điều kiện | Luồng |
|---|---|
| Có bất kỳ: bảng/D1 mới · đổi cấu trúc bảng đã có dữ liệu · ranh giới service mới hoặc contract chéo service mới · nhóm màn hình/module FE mới · state FE dùng chung nhiều màn hình · ≥3 story cùng đụng một vùng chưa có Design Record phủ | **FULL** |
| Story nằm gọn trong Design Record đã FROZEN: không entity mới, không ranh giới mới, không state dùng chung mới | **LITE** |

Đơn vị FULL là **cụm**: thường là cả epic (vd. `PLN-E01`), hoặc nhóm story chung ranh giới. **Không design từng story lẻ** khi chúng cùng một vùng — gom lại rồi mới ngồi.

Trình bày ở G0: cụm gồm story nào · nhánh nào (BE/FE/cả hai) · đã có Design Record phủ phần nào · luồng đề xuất và vì sao. Chờ user.

## Luồng LITE (một gate)

1. Đọc Design Record FROZEN + `db-schema.md` liên quan.
2. **Fit check:** quyết định đã có nào áp dụng cho story này; có tối đa 1–3 quyết định mới nào cần chốt (nếu >3 → leo FULL).
3. **Gate duy nhất:** trình bày một **delta** ngắn; user duyệt. Delta được **nối** vào mục "Nhật ký delta" của Design Record, không sửa phần đã FROZEN.
4. Chuyển `to-spec`.

Nếu giữa chừng lộ điều kiện FULL → **dừng và leo FULL**, không tự xử lý tiếp.

## Luồng FULL — gate theo lớp

Chi tiết từng lớp (đầu vào, câu cần quyết, đầu ra, tiêu chí qua gate): [`references/backend/layers.md`](references/backend/layers.md), [`references/frontend/layers.md`](references/frontend/layers.md).

| Gate | Backend | Frontend |
|---|---|---|
| G0 | Phân loại, chọn cụm | như BE |
| G1 | Entity, ownership, ranh giới service | Ranh giới màn hình/route/module |
| G2 | Quan hệ, cardinality, invariant, failure/đồng bộ chéo service | Chia component, state ownership |
| G3 | Cột/kiểu/ràng buộc, index (L6b), migration, cây file đích — bản **đầy đủ**, có nhãn `core`/`mở rộng` | Luồng dữ liệu, cây file đích — bản đầy đủ, có nhãn |
| G4 | **Gọt**: user chọn bỏ phần `mở rộng` nào → agent cập nhật → user đóng băng | như BE |

Cuối mỗi lớp, trước gate: agent liệt kê **các quyết định khó đảo ngược nhất của lớp đó** để user soi lại. Qua gate chỉ khi user nói rõ.

Backend và frontend là **hai Design Record riêng** (AGENTS.md quy tắc 9). Cụm chạm cả hai: làm backend trước (G1–G4), rồi frontend — FE cần endpoint và shape thật.

## Đọc trước

1. `lab-docs/frameworks/design-principles.md` — toàn bộ.
2. `lab-docs/decisions/decision-ledger.md` — chỉ DECIDED là ràng buộc.
3. Stories của cụm (`stories/<ID>.md`) + product brief.
4. Design Record và `db-schema.md` đã có của product/capability (nếu có).
5. BE: `architecture/backend.md` §10, `system-overview.md`, `iam.md` (khi có authz). FE: `architecture/frontend.md` §0/§5/§6, AGENTS.md luật 17–30, `lab-prototype/` nếu prototype đã APPROVED, và Design Record backend của cụm.

Thiếu tài liệu → đánh dấu chưa kiểm chứng, không suy diễn "chưa có".

## Đầu ra — hai lớp, cùng một nguồn

| Lớp | Nội dung | Ai đọc | Ghi chú |
|---|---|---|---|
| **Người đọc** | Sơ đồ Mermaid + bảng ngắn | User duyệt tại gate | Chia theo service/cụm, mỗi sơ đồ ≲10 bảng/nút |
| **Máy đối chiếu** | `db-schema.md` (bảng markdown, đúng L7b), bảng invariant, cây file đích, bảng state ownership | `spec-review` | ID ổn định để dẫn chiếu |

Sơ đồ **chỉ chứa thứ có trong bảng nguồn**: ERD chỉ có bảng/cột/FK có trong `db-schema.md`. Không vẽ thứ chưa chốt. Không sửa `db-schema.md` ngoài định dạng L7b — **không DDL**.

File và template: [`references/design-record-template.md`](references/design-record-template.md).

| Nhánh | Design Record | Nguồn schema |
|---|---|---|
| Backend | `lab-docs/products/<product>/design-backend.md` (hoặc `lab-docs/platform/<cap>/`) | `db-schema.md` cùng thư mục |
| Frontend | `lab-docs/products/<product>/design-frontend.md` | — |

Status trong file: `DRAFT` (đang đi gate) → `FROZEN` (user đóng băng ở G4). **Chỉ user đặt FROZEN.** Mỗi quyết định thành DECIDED có dòng ledger; Design Record dẫn ID, không chép lại lý do dài.

## Ranh giới

| Việc | Skill này | Của ai |
|---|---|---|
| Ý tưởng, what/why | không | `grilling` |
| Story, AC | đọc, không viết lại | `breakdown` |
| Spec, ticket | không | `to-spec` |
| Kiểm spec bám thiết kế | không | `spec-review` |
| Code, migration file | không | `implement` |
| Việc lộ ra ngoài cụm | không | `capture` |

## Không làm

- Không viết spec/ticket/code/migration, không DDL.
- Không tự gọt, không tự rút về MVP, không tự chọn workaround.
- Không nâng PROPOSED/OPEN/DEFERRED thành DECIDED.
- Không đóng băng Design Record; không sửa phần đã FROZEN (sai thì quay lại gate, user chốt lại).
- Không design từng story lẻ khi chúng thuộc một cụm cùng vùng.

## Vị trí trong chuỗi

```text
breakdown → architecture-design → to-spec → spec-review → implement → ship
```

**Đầu ra tài liệu:** `design-backend.md` / `design-frontend.md` (`Status: FROZEN`) + `db-schema.md` → **bước tiếp theo:** viết spec → invoke `to-spec <story-ID>`

**Điều kiện vào:** `lab gate architecture-design <prefix>` — yêu cầu có story/epic + Product Brief. Nếu FAIL, chạy `breakdown` trước.
- Không tự đưa shared package, store toàn cục vào thiết kế như thể đã chốt. Hạ tầng DEFERRED (Queues, KV, DO, Redis, event bus) thì **được đề xuất** như phương án có đánh đổi; không được coi là đã chốt và không được loại chỉ vì DEFERRED.

## Checklist trước khi trình bày mỗi gate

- [ ] Chỉ nêu quyết định của lớp hiện tại; mỗi quyết định ≥2 phương án đủ ba dòng L6 + một khuyến nghị.
- [ ] Không phương án nào vi phạm L2; không dùng từ vựng L5.
- [ ] Mọi phần tử có nhãn `core`/`mở rộng` + chi phí khi bỏ (từ G3).
- [ ] Giả định hạ tầng đã liệt kê.
- [ ] Sơ đồ khớp bảng nguồn; không phần tử nào chưa chốt xuất hiện như đã chốt.
- [ ] Đã liệt kê quyết định khó đảo ngược nhất của lớp.
- [ ] Dòng ledger cho mọi quyết định mới DECIDED.
