# Skills — Lab

> Hướng dẫn thực thi cho agent. **Quy trình** (đọc bởi người) nằm ở `lab-docs/frameworks/`.
> Ràng buộc nằm ở `lab-docs/architecture/backend.md` §10, `lab-docs/architecture/frontend.md` §5–§6 và `.agents/AGENTS.md` — skill chỉ trỏ tới, không thay thế.

## Chuỗi

```text
stories → to-spec → architecture-review → implement → ship → production
```

`implement` gồm cả review + triage. Không có skill `code-review` riêng — review đã nằm trong vòng lặp implement.

## Nguyên tắc tách nhánh

Ba skill đầu có **hai nhánh riêng biệt**, không trộn:

| Phía | User review bằng gì | Tiêu chí tối ưu |
|---|---|---|
| Backend | Đọc code, SQL, schema bằng mắt | Dễ review bằng mắt, ít abstraction che ranh giới |
| Frontend | **Chỉ xem giao diện** (Storybook + ảnh) | Khó sai, vì không ai đọc code |

Story chạm cả hai phía → hai spec (`spec-backend.md`, `spec-frontend.md`), review hai phần riêng, implement backend trước frontend.

`ship` không tách nhánh: nó điều phối **cả cụm repo** cùng lúc, đó là lý do nó tồn tại.

## Trạng thái

| Skill | Trạng thái | File |
|---|---|---|
| `to-spec` | ✅ Đủ hai nhánh | `SKILL.md` + `references/backend/` + `references/frontend/` |
| `architecture-review` | ✅ Đủ hai nhánh | `SKILL.md` + `references/backend/` + `references/frontend/` |
| `implement` | ✅ Đủ hai nhánh | `SKILL.md` + `references/review-protocol.md` + `references/backend/` + `references/frontend/` |
| `ship` | ✅ | `SKILL.md` + `references/plan-template.md` + `references/deploy-checklist.md` |

**Đã bỏ:** `code-review` — review + triage nằm trong `implement`.

## File hiện có

| Skill | File |
|---|---|
| `to-spec` | `SKILL.md`<br>`references/backend/spec-template.md`<br>`references/frontend/spec-template.md` |
| `architecture-review` | `SKILL.md`<br>`references/backend/checklist.md`<br>`references/frontend/checklist.md` |
| `implement` | `SKILL.md`<br>`references/review-protocol.md`<br>`references/backend/workflow.md`<br>`references/frontend/workflow.md` |
| `ship` | `SKILL.md`<br>`references/plan-template.md`<br>`references/deploy-checklist.md` |

Các file `references/spec-template.md` và `references/checklist.md` ở gốc chỉ còn là stub điều hướng.

## Phân chia trách nhiệm

| Việc | Skill | Ghi chú |
|---|---|---|
| Viết spec | `to-spec` | Không code |
| Phản biện spec/schema | `architecture-review` | Không sửa |
| Code + test + review + commit | `implement` | Nhánh feature, **push lên nhánh** |
| Gate + PR + merge + migration + deploy | `ship` | Thay CI/CD; có điểm dừng user |

**`implement` không push `main`, không deploy, không tạo PR.** Ba việc đó thuộc `ship`.

## Quy ước

- **Lưu trữ artifact theo** `lab-docs/frameworks/documentation-standards.md` — hai lớp: quyết định ở `lab-docs`, bằng chứng ở `<repo>/docs/delivery/<ID>/`, spec ở `specs/<ID>/`. Ticket nhỏ dùng `ticket.md` một trang với ID tiền tố `SETUP-/MAINT-/EXP-`.
- Mỗi skill một thư mục, `SKILL.md` bắt buộc; tài liệu dài để trong `references/<nhánh>/`.
- `SKILL.md` chỉ chứa quyết định và luật; **không copy code** từ `backend-reference.md`.
- Checklist review **không nhân bản**: `implement` trỏ tới `architecture-review/references/`.
- Frontmatter: `name`, `description`, `metadata.short-description`.
- Skill không được tự nâng PROPOSED/DEFERRED/OPEN thành DECIDED.
- **Skill chỉ cover một phía không được đánh dấu hoàn thành.**
- Thêm skill mới → cập nhật bảng trên và `plans/engineering-workflow-plan.md` §0.
