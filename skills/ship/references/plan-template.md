# Ship plan — template

> Đầu ra Phase 0 của `ship`. Reviewer duyệt file này trước khi thực thi.
> Mục không áp dụng ghi "Không áp dụng — <lý do>". Không để trống.

**Ngày:** <YYYY-MM-DD>
**Người lập:** agent
**Trạng thái:** DRAFT | REVIEWED | EXECUTING | DONE

## 1. Phạm vi

| Repo | Nhánh | Commit (hash) | Ticket | Đã push? |
|---|---|---|---|---|
| `services/lab-planning` | `feat/PLN-001` | `<hash>` | PLN-001-T1..T3 | ✅/❌ |
| `apps/lab-portal` | `feat/PLN-001-fe` | `<hash>` | PLN-001-T4 | ✅/❌ |

Ticket nào **không** thuộc phạm vi ship lần này: <liệt kê hoặc "không có">

## 2. Preconditions

| Kiểm | Kết quả |
|---|---|
| `gh` CLI có? | ✅/❌ version |
| `gh auth status` | ✅/❌ |
| Working tree sạch mọi repo? | ✅/❌ |
| Repo nào behind `origin/main`? | <danh sách hoặc "không"> |
| `node -v` khớp engines từng repo? | ✅/❌ |
| Lockfile khớp `package.json`? | ✅/❌ |
| Có range trôi nổi (`^`/`~`/`latest`)? | ✅ không có / ❌ có |

## 3. PR set và merge order

| # | Repo | PR title | Base | Merge sau |
|---|---|---|---|---|
| 1 | <callee repo> | `<TICKET>: <outcome>` | `main` | — |
| 2 | <caller repo> | `<TICKET>: <outcome>` | `main` | PR #1 |

**Lý do thứ tự:** <callee phải có trước vì caller gọi binding/field của nó>

Merge strategy: `gh pr merge --rebase --delete-branch`. Không squash.

## 4. Gate plan

| Repo | format:check | lint | typecheck | test | build |
|---|---|---|---|---|---|
| <repo> | ✅ <date> | ✅ | ✅ | ✅ <n> test | ✅ <time> |

Output chi tiết đính vào PR body.

Gate chạy **lại sau rebase** (Phase 3) — ghi ngày giờ lần chạy cuối: <...>

## 5. Migration set

| # | D1 | File `.sql` | Đã apply local? | Additive? | Thứ tự vs bảng khác |
|---|---|---|---|---|---|
| 1 | `<DB>` | `0007_add_x.sql` | ✅ | ✅ | phải sau `0006` |

**Nếu file fail giữa chừng, schema ở trạng thái nào?**

<Trả lời cụ thể. Không trả lời được = BLOCKER cho plan này.>

**Cách phục hồi:**

<Migration bù, hoặc reset local, hoặc bước thủ công. Migration là forward-only nên không có rollback thật.>

**Backup:** <lệnh export D1, đường dẫn file, thời điểm>

## 6. Deploy set

| # | Worker | Phụ thuộc vào | Version ID hiện tại (để rollback) |
|---|---|---|---|
| 1 | `<callee>` | — | `<id>` |
| 2 | `<caller>` | `<callee>` | `<id>` |
| 3 | `apps/lab-portal` (static) | tất cả BE | `<id>` |

`check-env.ts` sẽ chạy trước mỗi lần deploy. Secret cần có: <danh sách tên, không giá trị>

## 7. Risk list — bước không hoàn tác được

| # | Bước | Không hoàn tác vì | Đường lùi |
|---|---|---|---|
| 1 | Migration remote | Forward-only | Migration bù mới |
| 2 | Deploy Worker | Version cũ bị thay | `wrangler rollback` về version ID đã ghi |
| 3 | Merge PR | Đã vào `main` | Revert commit (nếu chưa deploy) |

## 8. Verify plan sau khi xong

| Kiểm | Kỳ vọng |
|---|---|
| Tree hash `main` == tested tree | Bằng nhau, ghi cả hai hash |
| Health endpoint | <path> → 200 |
| `requestId` trong log | Có |
| Contract response | Khớp zod schema FE |
| FE tải được | Không màn hình trắng, đúng version |
| Migration | Query trên bảng vừa đổi trả dữ liệu |

## 9. Điểm cần user xác nhận

| # | Điểm dừng | Đã xác nhận? |
|---|---|---|
| 1 | Duyệt PR (hết Phase 3) | ⬜ |
| 2 | Migration remote (trước Phase 5) | ⬜ |
| 3 | Deploy production (trước Phase 6) | ⬜ |

## 10. ESCALATE đang chờ

Finding từ `implement` chưa giải, cần user quyết trước khi ship:

| # | Finding | Vì sao chặn ship |
|---|---|---|
| — | <hoặc "không có"> | — |

Nếu có mục này **và** nó ảnh hưởng nội dung ship → dừng, không ship.
