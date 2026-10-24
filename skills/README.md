# Skills — Lab

> Hướng dẫn thực thi cho agent. **Quy trình** (đọc bởi người) nằm ở `lab-docs/frameworks/`.
> Ràng buộc nằm ở `lab-docs/architecture/backend.md` §10, `lab-docs/architecture/frontend.md` §5–§6 và `.agents/AGENTS.md` — skill chỉ trỏ tới, không thay thế.

## Chuỗi

```text
stories → to-spec → architecture-review → implement-backend / implement-frontend → code-review → ship
```

## Nguyên tắc tách nhánh

Hai skill `to-spec` và `architecture-review` có **hai nhánh riêng biệt**, không trộn:

| Phía | User review bằng gì | Tiêu chí tối ưu |
|---|---|---|
| Backend | Đọc code, SQL, schema bằng mắt | Dễ review bằng mắt, ít abstraction che ranh giới |
| Frontend | **Chỉ xem giao diện** (Storybook + ảnh) | Khó sai, vì không ai đọc code |

Vì tiêu chí khác nhau, template và checklist **phải** tách file. Gộp sẽ khiến một mục bị hiểu sai theo nghĩa của phía còn lại.

Story chạm cả hai phía → viết **hai spec** (`spec-backend.md`, `spec-frontend.md`), review **hai phần riêng**.

## Trạng thái

| Skill | Trạng thái | Ghi chú |
|---|---|---|
| `to-spec` | ✅ Đủ hai nhánh | Backend + frontend template tách riêng |
| `architecture-review` | ✅ Đủ hai nhánh | Backend 8 trục + frontend 9 trục, checklist tách riêng |
| `implement-backend` | ⬜ Chưa viết (P3) | `backend-reference.md` + luật 1–16 đã đủ |
| `implement-frontend` | ⬜ Chưa viết (P10) | Luật 17–30 + cấu trúc thư mục `frontend.md` §5 đã đủ |
| `code-review` | ⬜ Chưa viết (P4) | Luật backend 1–16 + frontend 17–30 đã đủ |
| `ship` | ⬜ Chưa viết (P5) | Test command FE: `typecheck` + `lint` + `test` |

## File hiện có

| Skill | File |
|---|---|
| `to-spec` | `skills/to-spec/SKILL.md`<br>`skills/to-spec/references/backend/spec-template.md`<br>`skills/to-spec/references/frontend/spec-template.md` |
| `architecture-review` | `skills/architecture-review/SKILL.md`<br>`skills/architecture-review/references/backend/checklist.md`<br>`skills/architecture-review/references/frontend/checklist.md` |

`references/spec-template.md` và `references/checklist.md` ở gốc chỉ còn là stub điều hướng — không chứa nội dung.

## Quy ước

- Mỗi skill một thư mục, `SKILL.md` bắt buộc; tài liệu dài để trong `references/<nhánh>/`.
- `SKILL.md` chỉ chứa quyết định và luật; **không copy code** từ `backend-reference.md`.
- Frontmatter: `name`, `description`, `metadata.short-description`.
- Skill không được tự nâng PROPOSED/DEFERRED/OPEN thành DECIDED.
- **Skill chỉ cover một phía không được đánh dấu hoàn thành.**
- Thêm skill mới → cập nhật bảng trên và `plans/engineering-workflow-plan.md` §0.
