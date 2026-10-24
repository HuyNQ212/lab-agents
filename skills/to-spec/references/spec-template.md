# Đã chia template — không còn dùng file này

Template spec đã tách làm hai, vì frontend và backend có tiêu chí khác nhau:

| Nhánh | File |
|---|---|
| Backend | [`references/backend/spec-template.md`](backend/spec-template.md) — data model delta, API contract, service boundary, migration, test seam |
| Frontend | [`references/frontend/spec-template.md`](frontend/spec-template.md) — UI surface, data fetching, state ownership, form, test 3 tầng, story |

Dùng cả hai khi story cần cả hai phía. Không trộn nội dung — một mục của backend không có nghĩa ở frontend và ngược lại.
