---
name: architecture-design
description: "Chốt các quyết định cấu trúc khó đảo ngược — db schema, ranh giới service, data ownership, tách module/component FE, state ownership — trước khi viết spec. Hai nhánh (backend, frontend) và hai luồng (FULL cho một cụm story/epic, LITE cho story nằm gọn trong Design Record đã FROZEN). Agent dựng bản nháp đầy đủ mọi lớp một mạch, mỗi quyết định có phương án đề xuất kèm lý do, rồi đưa user MỘT gói quyết định; user trả lời xong mới đóng băng. Ra Design Record. Dùng khi user nói \"design\", \"thiết kế schema\", \"tách module\", \"architecture design\", khi orchestrate chuyển từ breakdown sang, hoặc khi to-spec dừng vì thiếu Design Record. Không viết spec, không viết code."
metadata:
  short-description: "Cụm story → Design Record (bản nháp đầy đủ, một gói quyết định)"
---

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md` (mục "Hợp đồng bàn giao"), cách hỏi user ở `.agents/references/decision-packet.md`.

# architecture-design — dựng thiết kế, user chốt một lần

Chỗ này sai thì mọi thứ sau sai theo. Vì vậy agent **dựng bản nháp đầy đủ cho mọi lớp**, đề xuất mọi quyết định kèm lý do, rồi user quyết **một lần** trên một gói quyết định. User không phải ngồi qua từng lớp; nhưng không quyết định khó đảo ngược nào thành DECIDED khi user chưa trả lời.

```text
grilling → (prototype) → breakdown → architecture-design → to-spec → spec-review → implement → ship
```

Đầu ra là **Design Record FROZEN**. `to-spec` chuyển nó thành spec; `spec-review` kiểm spec có bám nó không. Skill này **không viết spec, không viết code, không viết migration.**

## Luật vận hành (cứng)

Nguồn: `lab-docs/frameworks/design-principles.md` L1–L7b — đọc trước mỗi phiên. Ở đây chỉ ghi phần riêng của skill:

1. **Dựng bản nháp đầy đủ một mạch.** Agent tự đi hết các lớp G1 → G3 của mọi nhánh cụm chạm tới (chi tiết ở `references/<nhánh>/layers.md`), ghi thẳng vào Design Record với `**Status:** DRAFT`. Mỗi quyết định ghi `PROPOSED` kèm phương án đề xuất. Không dừng giữa các lớp.
2. **Mỗi quyết định có ≥2 phương án hợp lệ**, mỗi phương án đủ ba dòng theo L6: chi phí đặt vào đâu · sai thế nào khi sự cố · chặn gì về sau. Rồi **một đề xuất kèm lý do**. Phương án vi phạm ranh giới (L2) không được trình bày như lựa chọn ngang hàng — loại và nói vì sao.
3. **Vướng thì không rẽ.** Gặp ràng buộc, xung đột, hạ tầng chưa có, câu hỏi chưa ai trả lời → ghi thành câu hỏi trong gói quyết định (*vướng gì · các lựa chọn · hệ quả mỗi lựa chọn*), dựng tiếp phần còn lại theo phương án đề xuất và đánh dấu phần đó "phụ thuộc Q<n>". **Workaround cũng là một quyết định thiết kế, thuộc về user.** Cấm từ vựng L5. **"Chỉ một mình dùng" không phải lý do** để hard-code giá trị, bỏ múi giờ, bỏ `user_id`, hay chọn phương án cẩu thả: thiết kế như hệ thống nhiều người dùng, nhiều múi giờ.
4. **Không giật tít rủi ro.** Trước khi nêu một rủi ro hay OPEN, tự phân loại: lỗi code (test bắt), lỗi vận hành (việc người vận hành), lỗi cấu hình production (bước verify của `ship` bắt), hay lỗi do thiết kế mà ba thứ trên không bắt được. Chỉ loại cuối mới là câu hỏi cho user; các loại kia bỏ hoặc ghi một dòng "không đáng kể".
5. **Một gói quyết định, theo `.agents/references/decision-packet.md`.** Câu hỏi đánh số `Q1, Q2…` ở đầu trang, mỗi câu trỏ ID Design Record bị ảnh hưởng. Mỗi câu là **một** quyết định; không gộp nhiều quyết định vào một câu để một câu trả lời chốt nhiều thứ (L7). Gói thứ hai chỉ khi câu trả lời sinh ra câu hỏi mới.
6. **Chỉ user chốt.** Câu được trả lời → `DECIDED <yyyy-mm-dd>`; câu không trả lời → giữ `PROPOSED`. Quyết định khó đảo ngược ghi thêm dòng ledger (mục "Ghi ledger"). Đã chốt thì **không đổi** khi chưa hỏi lại qua gói quyết định.
7. **Không hỏi việc tự làm được.** Cập nhật tài liệu, ghi bản nháp, sửa trang xem, thêm mục "còn thiếu" thì làm luôn. Câu đã có trong ledger DECIDED hoặc Design Record FROZEN thì áp dụng, không hỏi lại.
8. **Viết đủ chữ.** Không dùng mã viết tắt (OWN, G2, FULL…) khi nói với user mà chưa giải thích; mã chỉ là chỗ tham chiếu trong Design Record, kèm tên đầy đủ.

## Trần thiết kế — đầy đủ trước, user gọt sau

Thiết kế ở mức **đúng và đầy đủ nhất** cho ownership, quan hệ, invariant, failure mode, cấu trúc module. Không rút về "MVP". Gọt là việc của user trong gói quyết định, vì gọt một thiết kế đầy đủ rẻ hơn nhiều so với bổ sung vào một thiết kế đã bị agent tự rút.

Để việc gọt rẻ:
- Mỗi phần tử gắn nhãn **`core`** (bỏ là sai ranh giới/dữ liệu) hoặc **`mở rộng`** (bỏ được, vẫn đúng), kèm **chi phí khi bỏ** (một dòng: bỏ thì mất gì, phải sửa chỗ nào).
- Liệt kê **giả định hạ tầng**: phần tử nào đòi thứ chưa có (outbox, cron, binding mới…) để user biết cái gì phải dựng.

**Hạ tầng DEFERRED (KV/DO/Redis…) không bị cấm.** Nếu nó là phương án thiết kế tốt nhất thì **phải đề xuất**, không được né vì "chưa có" (L4): trình bày như một phương án thật (ba dòng L6), ghi vào "giả định hạ tầng" kèm chi phí dựng và chi phí bỏ; chỉ thành DECIDED khi user chốt. Loại một phương án chỉ vì lý do kỹ thuật, không vì "DEFERRED".

Trần này **không** cho phép: index "chuẩn bị trước" (L6b); vi phạm luật cứng backend 1–16 / frontend 17–30 trong `.agents/AGENTS.md` (muốn đổi luật cứng thì nêu thành một câu hỏi riêng trong gói); thêm tính năng ngoài story; đưa shared package hay store toàn cục vào như thể đã chốt. "Đầy đủ" nghĩa là đủ ownership/invariant/failure, không phải đầy đủ tính năng.

## Chọn FULL hay LITE

Agent tự chọn theo bảng, ghi lý do vào dòng `**Luồng:**` của Design Record. Chỉ khi bảng không phân định được mới đưa thành một câu hỏi trong gói.

| Điều kiện | Luồng |
|---|---|
| Có bất kỳ: bảng/D1 mới · đổi cấu trúc bảng đã có dữ liệu · ranh giới service mới hoặc contract chéo service mới · nhóm màn hình/module FE mới · state FE dùng chung nhiều màn hình · ≥3 story cùng đụng một vùng chưa có Design Record phủ | **FULL** |
| Story nằm gọn trong Design Record đã FROZEN: không entity mới, không ranh giới mới, không state dùng chung mới | **LITE** |

Đơn vị FULL là **cụm**: thường là cả epic (vd. `PLN-E01`), hoặc nhóm story chung ranh giới. **Không design từng story lẻ** khi chúng cùng một vùng — gom lại.

## Luồng FULL

1. **Dựng nháp.** Đi G1 → G3 theo [`references/backend/layers.md`](references/backend/layers.md) và [`references/frontend/layers.md`](references/frontend/layers.md). Backend và frontend là **hai Design Record riêng** (AGENTS.md quy tắc 9). Cụm chạm cả hai: dựng backend trước, frontend dựng trên endpoint và shape đề xuất của backend; câu frontend nào phụ thuộc câu backend thì ghi "phụ thuộc Q<n>".
2. **Tự kiểm (G4).** Chạy checklist cuối file; liệt kê mọi phần tử `mở rộng` gom theo chủ đề (không đưa 40 dòng rời). Agent không đề xuất gọt vì "đơn giản hơn/nhanh hơn" (L1, L5).
3. **Gói quyết định** (một gói cho cả hai nhánh của cụm). Câu hỏi gồm, theo thứ tự: quyết định khó đảo ngược nhất của từng lớp · chỗ vướng · nhóm `mở rộng` để gọt (giữ là đề xuất mặc định) · OPEN chặn. Mục 0 của Design Record ghi liên kết gói và bảng `Q<n> → ID`.
4. **Ghi câu trả lời.** Câu được trả lời → `DECIDED <yyyy-mm-dd>` vào cột Trạng thái của dòng tương ứng; phần tử bị gọt → `REMOVED <yyyy-mm-dd>` (giữ dòng). Cập nhật `db-schema.md` và sơ đồ theo, chạy lại kiểm sơ đồ ↔ bảng. Câu trả lời sinh câu hỏi mới → gói thứ hai chỉ chứa các câu đó.
5. **Đóng băng.** Dòng 3 đổi thành `**Status:** FROZEN (user duyệt <yyyy-mm-dd>)` khi đủ cả ba: user đã duyệt gói; không còn quyết định `core` nào `PROPOSED`; mọi dòng OPEN có trạng thái `ĐÓNG <ngày>` hoặc ghi rõ thuộc Design Record khác. Thiếu một điều → giữ `DRAFT`, cập nhật cùng trang gói để nhắc đúng các câu còn chặn.

## Luồng LITE

1. Đọc Design Record FROZEN + `db-schema.md` liên quan.
2. **Fit check:** liệt kê quyết định đã có áp dụng cho story; phần tử mới cần thêm.
3. **Không đổi cấu trúc** (chỉ áp quyết định đã DECIDED, thêm file trong cây đã có, không cột/bảng/index/ranh giới/contract/state dùng chung mới, không đổi dòng đã DECIDED): thêm một dòng `DL<n>` vào mục "Nhật ký delta", thêm phần tử mới vào các mục 1–7 với ID nối tiếp và ghi `Delta: DL<n>`; **giữ nguyên** dòng FROZEN. Không cần gói quyết định.
4. **Có đổi cấu trúc** hoặc có câu cần user quyết: dòng 3 về `**Status:** DRAFT`, ghi dòng `DL<n>` loại `REOPENED` kèm ID bị ảnh hưởng, rồi làm như FULL bước 3–5 chỉ cho phần delta. Phần thêm vào `db-schema.md` đúng L7b. Hơn 3 quyết định mới, hoặc lộ điều kiện FULL → chuyển FULL cho cả cụm.

## Mở lại Design Record đã FROZEN

Sửa dòng đã DECIDED hoặc đã FROZEN (sai thiết kế, story mới mâu thuẫn, spec-review báo BLOCK do thiết kế) chỉ đi đường này:

1. Đưa câu "mở lại <ID…> vì <lý do>" vào gói quyết định; chờ user đồng ý.
2. Dòng 3 về `**Status:** DRAFT`; ghi dòng delta `DL<n>` loại `REOPENED` kèm danh sách ID bị ảnh hưởng.
3. Sửa, gói quyết định cho phần sửa, đóng băng lại theo FULL bước 4–5. Quyết định cũ trong ledger đánh `SUPERSEDED`.
4. Tìm spec đã dẫn ID bị sửa: `grep -rn --include="spec-*.md" "Theo:.*<ID>" <dir>/specs/`. Mỗi spec trúng phải chạy lại `to-spec` rồi `spec-review`; ghi danh sách spec đó vào dòng `DL<n>`.

## Ghi ledger

Mỗi quyết định khó đảo ngược thành DECIDED có một dòng trong `lab-docs/decisions/decision-ledger.md`, thêm vào **cuối bảng** (trước đoạn "Working rules"):

```markdown
| <Area> | [<CỤM>/<BE|FE>-<ID>] <quyết định một câu>. Design Record: `<dir>/design-<nhánh>.md` | DECIDED (<yyyy-mm-dd>) |
```

- `<Area>` là tên product/capability như các dòng đã có (Planning, User, Gateway…). Thẻ `[<CỤM>/<BE|FE>-<ID>]` (vd. `[PLN-E01/BE-D4]`) là **ID ledger**: cột Ledger của Design Record ghi đúng thẻ này, tìm bằng `grep`. Cấm dẫn ledger bằng số dòng.
- Thẻ chứa mã cụm nên `lab commit <CỤM>` gom được thay đổi ledger.
- Quyết định mới thay quyết định cũ: rà mọi dòng cùng chủ đề **kể cả khác Area**, đổi Status dòng cũ thành `SUPERSEDED (<yyyy-mm-dd>) — xem [<thẻ mới>]`. Hai dòng DECIDED mâu thuẫn mà chưa có quyết định thay thế → đưa vào gói quyết định, không tự sửa.

## Đọc trước

1. `.agents/AGENTS.md` — luật cứng backend 1–16, frontend 17–30, quy tắc làm việc 9.
2. `lab-docs/frameworks/design-principles.md` — toàn bộ.
3. `lab-docs/decisions/decision-ledger.md` — chỉ DECIDED là ràng buộc.
4. Stories của cụm (`<dir>/stories/<ID>.md`) + product brief (`<dir>/product-brief.md`).
5. Design Record và `db-schema.md` đã có của product/capability (nếu có).
6. Backend: `lab-docs/architecture/backend.md` §10, `system-overview.md`, `iam.md` (khi có authz). Frontend: `lab-docs/architecture/frontend.md` §0/§5/§6, `lab-prototype/` nếu prototype đã APPROVED, và Design Record backend của cụm.

Thiếu tài liệu → đánh dấu chưa kiểm chứng, không suy diễn "chưa có".

## Đầu ra — hai lớp, cùng một nguồn

| Lớp | Nội dung | Ai đọc | Ghi chú |
|---|---|---|---|
| **Người đọc** | Gói quyết định + sơ đồ Mermaid + bảng ngắn | User | Chia theo service/cụm, mỗi sơ đồ ≲10 bảng/nút |
| **Máy đối chiếu** | `db-schema.md` (bảng markdown, đúng L7b), bảng invariant, cây file đích, bảng state ownership | `to-spec`, `spec-review` | ID ổn định để dẫn chiếu |

Sơ đồ **chỉ chứa thứ có trong bảng nguồn**: ERD chỉ có bảng/cột/FK có trong `db-schema.md`. Không sửa `db-schema.md` ngoài định dạng L7b — **không DDL**.

File và template: [`references/design-record-template.md`](references/design-record-template.md). `<dir>` = `lab-docs/products/<tên>/` hoặc `lab-docs/platform/<tên>/`.

| Nhánh | Design Record | Nguồn schema |
|---|---|---|
| Backend | `<dir>/design-backend.md` | `<dir>/db-schema.md` |
| Frontend | `<dir>/design-frontend.md` | — |

Dòng 3 của file là dòng Status, `lab gate to-spec` đọc dòng này: `**Status:** DRAFT` khi đang dựng hoặc chờ gói; `**Status:** FROZEN (user duyệt <yyyy-mm-dd>)` chỉ sau khi user duyệt gói (FULL bước 5).

## Ranh giới

| Việc | Skill này | Của ai |
|---|---|---|
| Ý tưởng, what/why | không | `grilling` |
| Story, AC | đọc, không viết lại | `breakdown` |
| Spec, ticket | không | `to-spec` |
| Kiểm spec bám thiết kế | không | `spec-review` |
| Code, migration file | không | `implement` |
| Merge, deploy, migration remote | không | `ship` (mỗi lệnh không hoàn tác được đều hỏi user) |
| Việc lộ ra ngoài cụm | không | `capture` |

## Không làm

- Không viết spec/ticket/code/migration, không DDL, không chạy lệnh production.
- Không tự gọt, không tự rút về MVP, không tự chọn workaround.
- Không nâng PROPOSED/OPEN/DEFERRED thành DECIDED; không đặt FROZEN khi user chưa duyệt gói.
- Không sửa dòng đã DECIDED hay đã FROZEN ngoài đường "Mở lại Design Record".
- Không design từng story lẻ khi chúng thuộc một cụm cùng vùng.
- Không đánh số lại ID; không dùng tiền tố `C<n>` trần (trùng mã capability và mã lệch của `spec-review`).

## Checklist trước khi đưa gói quyết định

- [ ] Mọi lớp G1–G3 của mọi nhánh cụm chạm tới đã có trong Design Record; dòng 3 là `**Status:** DRAFT`.
- [ ] Mỗi quyết định ≥2 phương án đủ ba dòng L6 + một đề xuất; không phương án nào vi phạm L2; không dùng từ vựng L5.
- [ ] Mọi phần tử có ID, nhãn `core`/`mở rộng` + chi phí khi bỏ, cột Trạng thái.
- [ ] Giả định hạ tầng đã liệt kê.
- [ ] Sơ đồ khớp bảng nguồn; không phần tử nào `PROPOSED` hiện như đã chốt.
- [ ] Mỗi câu hỏi trong gói là một quyết định, trỏ ID bị ảnh hưởng; mục 0 có bảng `Q<n> → ID`.
- [ ] Sau khi user trả lời: mỗi quyết định khó đảo ngược DECIDED có thẻ ledger; dòng ledger bị thay đã `SUPERSEDED`.

## Đầu ra / bước tiếp theo

- **Vào:** ID story hoặc epic; `lab gate architecture-design <ID>` PASS (story/epic tồn tại, brief `done`). FAIL → chạy `breakdown` trước.
- **Ra:** `<dir>/design-backend.md` và/hoặc `<dir>/design-frontend.md`, dòng 3 `**Status:** FROZEN (user duyệt <yyyy-mm-dd>)`; `<dir>/db-schema.md` cập nhật; dòng ledger cho quyết định khó đảo ngược. Mục chưa trả lời giữ `PROPOSED`.
- **Kết thúc:** `lab check` OK → `lab commit <ID> "Design Record <nhánh> FROZEN"` → bước tiếp theo `to-spec <ID>`.
