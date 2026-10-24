# <Product/Capability> — Backend Technical Spec

> Template cho skill `to-spec`, nhánh **backend**. Thay placeholder bằng nội dung thật; giữ heading.
> Mục không áp dụng ghi "Không áp dụng — <lý do>".
>
> **Đọc kèm:** `references/frontend/spec-template.md` khi story cần cả hai phía. Đây là hai template **khác nhau**, không trộn.
> Ràng buộc nền: `lab-docs/architecture/backend.md` §10.

**Status:** DRAFT | REVIEWED
**Stories:** <PLN-001, PLN-002>
**Services:** <`lab-planning` (owner)>
**Nguồn:** <stories.md, db-schema.md, decision-ledger — ngày đọc>
**Spec version:** 1

## 1. Scope

<Outcome kỹ thuật của spec, kèm story ID. Không chép lại AC.>

## 2. Non-goals

| Non-goal | Nguồn |
|---|---|
| <...> | <story / ledger / OUT OF SCOPE> |

## 3. Data model delta

Trỏ `db-schema.md`. Chỉ liệt kê phần thay đổi.

| Bảng / cột / index | Thay đổi | Lý do | Query sử dụng |
|---|---|---|---|
| <...> | <...> | <...> | <...> |

Ràng buộc áp dụng: `STRICT`, timestamp `INTEGER` epoch ms, date-only `TEXT` + CHECK GLOB.

## 4. API contract

| Method | Path | Auth | Request | Response | Status | Error codes |
|---|---|---|---|---|---|---|
| <...> | <...> | <...> | <...> | <...> | <...> | <...> |

Chi tiết shape request/response, field optional, validation rule.

## 5. Service boundary

| Caller | Callee | Binding | Mục đích |
|---|---|---|---|
| <...> | <...> | <...> | <...> |

## 6. Migration plan

1. <file `.sql`, thứ tự áp dụng>
2. <verify local>
3. <verify remote>

Rollback: forward-only — bù bằng migration mới.

## 7. Test plan

| Seam | Case | AC |
|---|---|---|
| unit | <...> | <...> |
| integration (D1 thật) | <...> | <...> |

## 8. Tickets

| ID | Outcome | Repo | Blocked by |
|---|---|---|---|
| <STORY-ID>-T1 | <...> | <...> | — |

### <STORY-ID>-T1 — <tên>

- **Outcome:** <kết quả verify được>
- **Scope:** <file/tầng dự kiến, không mô tả code từng dòng>
- **Test:** <case cụ thể>
- **Blocked by:** —
- **Repo:** `services/<name>`
- **Non-goals:** <...>

## 9. Traceability

| Story | AC | Ticket |
|---|---|---|
| <...> | <...> | <...> |

## 10. OPEN

| ID | Câu hỏi | Vì sao chặn | Ai quyết | Nếu sai |
|---|---|---|---|---|
| O-1 | <...> | <...> | user | <...> |

## 11. Ràng buộc bắt buộc — tự kiểm trước khi ghi

- [ ] Mọi AC ánh xạ tới ticket hoặc ghi DEFERRED.
- [ ] Mọi bảng/cột nhắc tới có trong `db-schema.md` hoặc đánh dấu delta.
- [ ] Mọi bảng `STRICT`, timestamp `INTEGER` epoch ms, date-only `TEXT` + CHECK GLOB.
- [ ] Error code đúng prefix service, body `{ error: { code, message } }`.
- [ ] Không leak chi tiết nội bộ.
- [ ] Migration forward-only, additive; không `RENAME`/`DROP TABLE`.
- [ ] Không `SELECT *`, không `RETURNING`, không `prepare().bind().run()` trực tiếp.
- [ ] Test integration dùng D1 thật; port external mock.
- [ ] Không công nghệ mới ngoài ledger DECIDED.
