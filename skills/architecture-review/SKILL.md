---
name: architecture-review
description: Phản biện thiết kế Lab trước khi viết code. Hai nhánh riêng — backend (boundary service/D1, data ownership, API contract, failure mode, AuthZ, schema D1) và frontend (boundary FE/BE, state ownership, data fetching, UX states, auth flow, kiểm chứng bằng máy, bundle, tính nhất quán giao diện). Dùng khi user yêu cầu "review kiến trúc", "review spec", "review schema", "review spec frontend". Không dùng để viết code, sửa spec, hay review code đã viết.
metadata:
  short-description: Phản biện boundary, contract, schema, state, UX
---

# architecture-review

Tìm lỗi thiết kế khi còn rẻ để sửa — trước khi có code.

## Hai nhánh, không trộn

| Nhánh | Checklist | Ràng buộc nền | Tiêu chí chấm |
|---|---|---|---|
| **Backend** | [`references/backend/checklist.md`](references/backend/checklist.md) | `backend.md` §10, luật 1–16 | User **đọc code/SQL/schema bằng mắt** → lỗi hiển nhiên khi nhìn |
| **Frontend** | [`references/frontend/checklist.md`](references/frontend/checklist.md) | `frontend.md` §0/§5/§6, luật 17–30 | User **không đọc code**, chỉ xem giao diện → lỗi vô hình phải chấm nặng hơn |

Lý do tách: một mục backend chấm BLOCKER vì "vi phạm luật đã DECIDED" có thể tương ứng ở frontend với một mục chấm BLOCKER vì "sẽ không ai phát hiện được". Cùng mức, khác lý do — và lý do khác nhau thì không nên nằm chung một file.

Artifact chạm cả hai phía → review cả hai, nhưng **trình bày hai phần riêng**, mỗi phần dẫn checklist của nó.

## Ranh giới

- **Không sửa** code, spec, schema, ledger. Chỉ báo cáo.
- **Không tự chốt** câu hỏi thuộc user: ownership, hành vi product, công nghệ chưa DECIDED.
- **Không nâng** PROPOSED/ASSUMED/DEFERRED/OPEN thành ràng buộc.
- **Không đề xuất** KV/Queues/Durable Objects/Redis, shared package, DI container, event bus, message broker, hay global store — trừ khi user đã DECIDED.
- **Một lượt.** Không review lặp vô hạn; nếu user sửa xong và muốn review lại, đó là lượt mới.

## Ba thời điểm

| Thời điểm | Đầu vào | Trọng tâm |
|---|---|---|
| Trước spec | story, câu hỏi boundary | Backend: dữ liệu thuộc Worker nào, chiều binding, truy cập chéo D1. Frontend: route/màn hình nào, state nào ở đâu |
| Sau spec | spec draft (backend hoặc frontend) | Backend: contract, failure mode, AuthZ, migration, test seam. Frontend: state ownership, cache, UX states, auth flow, kiểm chứng bằng máy |
| Khi vẽ schema | `db-schema.md` draft | Backend only: chuẩn hóa, kiểu dữ liệu, index theo query thật, migration an toàn |

User không nói thời điểm thì suy ra từ artifact được đưa. Không có artifact thì hỏi đúng một câu.

## Đọc trước

### Chung

1. Artifact cần review (story / spec / db-schema / mô tả giao diện).
2. `lab-docs/decisions/decision-ledger.md` — chỉ dòng DECIDED là ràng buộc.
3. `lab-docs/frameworks/engineering-workflow.md` §4.2 — DoD hiện có.

### Nhánh backend — đọc thêm

4. `lab-docs/architecture/backend.md` **§10** — ràng buộc chính thức; lệch thì §10 thắng.
5. `lab-docs/architecture/system-overview.md` — ai sở hữu gì, binding nào tồn tại.
6. `lab-docs/architecture/iam.md` — khi có endpoint, token, hoặc kiểm quyền.
7. `lab-docs/architecture/backend-reference.md` — chỉ khi cần đối chiếu mẫu code; không copy vào báo cáo.

### Nhánh frontend — đọc thêm

4. `lab-docs/architecture/frontend.md` **§0** (ràng buộc review UI), **§5** (stack F-1→F-10), **§6** (thang test 3 tầng).
5. `.agents/AGENTS.md` **luật 17–30** — luật cứng frontend.
6. Backend spec của cùng story — để kiểm endpoint/error code có thật.
7. `lab-docs/architecture/iam.md` — khi có luồng đăng nhập, route guard, 401.
8. `lab-prototype/` — khi story đã có prototype APPROVED; so giao diện mong muốn với spec.

## Checklist

Dùng checklist của **đúng nhánh**:

| Artifact | Checklist |
|---|---|
| spec-backend, db-schema, story có endpoint/boundary | `references/backend/checklist.md` |
| spec-frontend, mô tả màn hình, luồng auth FE | `references/frontend/checklist.md` |
| Cả hai | cả hai, báo cáo hai phần |

Checklist là **bộ câu hỏi**, không phải nguồn luật — luật nằm ở `backend.md` §10, `frontend.md` §5–§6 và ledger.

## Mức nghiêm trọng

| Mức | Nghĩa | Hệ quả |
|---|---|---|
| **BLOCKER** | Vi phạm ràng buộc DECIDED; hoặc làm dữ liệu không migrate/không phục hồi được; hoặc để lộ dữ liệu giữa service; hoặc tạo lỗi **không thể phát hiện** khi không đọc code | Phải sửa trước khi code |
| **MAJOR** | Sẽ gây bug hoặc chi phí sửa lớn về sau, nhưng có đường vòng | Nên sửa trước khi code |
| **MINOR** | Thiếu rõ ràng, không đổi hành vi | Sửa khi tiện |
| **QUESTION** | Cần user quyết; chưa phải lỗi | Ghi vào OPEN, không tự trả lời |

Không dùng MINOR để né việc gọi một vi phạm rõ ràng là BLOCKER. Không dùng BLOCKER cho sở thích cá nhân.

**Nâng mức có chủ đích ở nhánh frontend:** lỗi không nhìn thấy trên giao diện (cache sai, race, contract lệch, state mồ côi, thiếu test) được nâng một mức so với trực giác, vì không ai phát hiện cho tới khi nó nổ. Khi nâng, **ghi lý do ngay trong cột "Vì sao"** để không thành tuỳ tiện.

## Verdict

| Verdict | Điều kiện |
|---|---|
| **PASS** | Không có BLOCKER, không có MAJOR |
| **NEEDS WORK** | Có MAJOR, không có BLOCKER |
| **BLOCK** | Có ít nhất một BLOCKER |

MINOR và QUESTION không tự hạ verdict.

## Định dạng output

```markdown
## Verdict: NEEDS WORK

### Nhánh đã review

- Backend: spec-backend.md — 8 trục
- Frontend: spec-frontend.md — 9 trục

### Findings — backend

| ID | Mức | Trục | Vị trí | Vấn đề | Vì sao | Hướng sửa |
|---|---|---|---|---|---|---|
| AR-B1 | BLOCKER | Boundary | spec §5 | Planning đọc Notification D1 | Vi phạm B-5 | Gọi qua Service Binding `NOTIFICATION` |

### Findings — frontend

| ID | Mức | Trục | Vị trí | Vấn đề | Vì sao | Hướng sửa |
|---|---|---|---|---|---|---|
| AR-F1 | BLOCKER | State ownership | spec §5 | Filter ngày lưu `useState` | Không deep-link, không F5, không back — user không thấy được lỗi này | Đưa vào search params + zod schema |

### Câu hỏi cần user quyết

| ID | Câu hỏi | Vì sao chặn | Nếu sai |
|---|---|---|---|
| Q-1 | ... | ... | ... |

### Đã kiểm tra, không thấy vấn đề

- Backend: Boundary, Schema, Contract
- Frontend: Data fetching, UX states
```

Yêu cầu với từng finding:

- **Vị trí cụ thể**: file + section, không nói "trong spec".
- **Vì sao**: dẫn ràng buộc hoặc hậu quả kỹ thuật, không dẫn sở thích. Với frontend, nêu thêm: lỗi này **nhìn thấy** hay **không nhìn thấy** trên giao diện.
- **Hướng sửa**: 1–2 câu, đủ để user quyết. Không dán code fix dài.
- **ID phân biệt nhánh**: `AR-B<n>` cho backend, `AR-F<n>` cho frontend.

## Không làm

- Không tạo ticket hay sửa file, trừ khi user yêu cầu rõ.
- Không đề xuất thêm endpoint/tính năng không có trong story.
- Không review chất lượng code (đó là `code-review`).
- Không đánh giá lại quyết định đã DECIDED trừ khi spec mâu thuẫn với chính nó.
- Không kết luận PASS khi chưa đọc artifact thật.
- **Không áp checklist frontend cho artifact backend hoặc ngược lại.**

## Checklist trước khi trả

- [ ] Đã chọn đúng checklist cho đúng nhánh artifact.
- [ ] Mỗi finding có vị trí cụ thể trong artifact.
- [ ] Mỗi BLOCKER dẫn được ràng buộc DECIDED hoặc hậu quả cụ thể.
- [ ] Với frontend: mỗi finding nêu lỗi **nhìn thấy** hay **không nhìn thấy** trên giao diện.
- [ ] Không có finding chỉ dựa trên preference.
- [ ] QUESTION không bị trả lời thay user.
- [ ] Verdict khớp với mức nghiêm trọng cao nhất.
- [ ] Có mục "đã kiểm tra" để chứng minh coverage.
