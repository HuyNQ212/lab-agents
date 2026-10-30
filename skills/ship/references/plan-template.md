# Ship plan — template

> Đầu ra Phase 0 của `ship`, lưu tại `<dir>/specs/<SPEC-ID>-ship/ship-plan.md`. Reviewer context sạch duyệt file này trước khi thực thi.
> Mục không áp dụng ghi "Không áp dụng — <lý do>". Không để trống.

```markdown
---
id: <SPEC-ID>-ship
type: ship-plan
status: in-progress
repos: [lab-user, lab-identity]
parent: <SPEC-ID>
---

# Ship plan — <SPEC-ID>

**Ngày:** <YYYY-MM-DD> · **Người lập:** agent

## Tasks
- [ ] T1: lập plan (Phase 0, 0b)
- [ ] T2: plan review PASS (Phase 1)
- [ ] T3: gate sau rebase xanh, PR tạo đủ, gói go/no-go được duyệt (Phase 2–3b)
- [ ] T4: merge + tree hash khớp (Phase 4)
- [ ] T5: migration remote + verify (Phase 5)
- [ ] T6: deploy theo order + ghi version (Phase 6)
- [ ] T7: verify production mọi dòng PASS (Phase 7)
```

Tick bằng `lab tick <SPEC-ID>-ship T<n>`; tick T7 thì script tự đặt `status: done`.

## 1. Phạm vi

| Repo | Nhánh | Đầu nhánh (hash) | Ticket | Đã push? |
|---|---|---|---|---|
| `services/lab-planning` | `feat/<SPEC-ID>` | `<hash>` | PLN-001-T1..T3 | ✅/❌ |
| `apps/lab-portal` | `feat/<SPEC-ID>` | `<hash>` | PLN-001-T4 | ✅/❌ |

Ticket **không** thuộc phạm vi ship lần này: <liệt kê hoặc "không có">

## 2. Preconditions (gồm Phase 0b)

| Kiểm | Lệnh | Kết quả |
|---|---|---|
| `gh` đã auth | `gh auth status` | ✅/❌ |
| Đúng account Cloudflare | `npx wrangler whoami --json` | ✅/❌ account |
| Working tree sạch mọi repo | `git status --porcelain` | ✅/❌ |
| Remote có `main` | `git ls-remote --heads origin main` | ✅/❌ từng repo |
| `database_id` không rỗng | `wrangler.jsonc` | ✅/❌ từng D1 |
| Worker đích của mọi binding đã deploy | `npx wrangler deployments list --name <callee>` | ✅/❌ |
| `entrypoint` của binding khớp export callee | `services[]` vs `src/index.ts` | ✅/❌ |
| Script gate đủ, pin exact, có lockfile | `lab repo-gate <repo>` | ✅/❌ |
| Node | `node -v` (khớp `engines` nếu repo có) | <version> |

Mục ❌ nào cũng chặn: ghi ticket SETUP/MAINT đã tạo qua `capture` hoặc câu hỏi trong gói quyết định.

## 3. Đồ thị binding, PR set và merge order

| Worker | Gọi tới (`services[]`) |
|---|---|
| `<caller>` | `<callee>` |

| # | Repo | PR title | `tested-sha` | Merge sau |
|---|---|---|---|---|
| 1 | <callee repo> | `[<SPEC-ID>] <mô tả>` | `<sha>` | — |
| 2 | <caller repo> | `[<SPEC-ID>] <mô tả>` | `<sha>` | PR #1 |

Merge: `gh pr merge <n> --rebase --match-head-commit <tested-sha> --delete-branch`. Không squash, không force push.

## 4. Gate

| Repo | `lab repo-gate` lần cuối (sau rebase) | Test pass | Build |
|---|---|---|---|
| <repo> | ✅ <ngày giờ> | <n> test | ✅ <thời gian> |

Output chi tiết đính vào PR body.

## 5. Migration set

| # | D1 | File `.sql` | Đã apply local? | Additive? | Thứ tự vs bảng khác |
|---|---|---|---|---|---|
| 1 | `<DB>` | `0007_add_x.sql` | ✅ | ✅ | phải sau `0006` |

**Nếu dừng giữa hai file, schema ở trạng thái nào:** <cụ thể; `migrations apply` rollback riêng file lỗi, file trước giữ nguyên>

**Bookmark trước migrate:** `npx wrangler d1 time-travel info <DB> --json` → <bookmark, thời điểm> (ghi lúc chạy)

**Đường lùi:** restore bookmark (user quyết) hoặc migration bù qua `to-spec`.

## 6. Deploy set và secret

| # | Worker | Phụ thuộc vào | Version hiện tại (rollback) | Code cũ chạy được với schema mới? |
|---|---|---|---|---|
| 1 | `<callee>` | — | `<id>` | ✅ additive |
| 2 | `<caller>` | `<callee>` | `<id>` | ✅ |
| 3 | `apps/lab-portal` | mọi BE | `<id>` | — |

| Worker | Khóa `envVarSchema` | Có trong `secret list` / `vars`? |
|---|---|---|
| `<worker>` | `ENVIRONMENT` (= `production`), `<KEY>` | ✅/❌ |

Chỉ ghi tên khóa, không ghi giá trị.

## 7. Risk list — bước không hoàn tác được

| # | Bước | Lệnh | Verify ngay sau | Đường lùi |
|---|---|---|---|---|
| 1 | Merge PR | `gh pr merge ...` | tree hash | Dừng trước migrate/deploy; sửa qua ticket mới |
| 2 | Migration remote | `npx wrangler d1 migrations apply <DB> --remote` | `migrations list --remote` | Restore bookmark (user quyết) / migration bù |
| 3 | Deploy Worker | `npx wrangler deploy --message "<SPEC-ID>-ship"` | `deployments status --json` | `npx wrangler rollback <version-id> --name <worker> --yes` |

## 8. Verify plan

| Kiểm | Lệnh | PASS khi |
|---|---|---|
| Tree hash | `git rev-parse origin/main^{tree}` vs `<tested-sha>^{tree}` | bằng nhau |
| Health | `curl ... <url>/health` | `200` |
| Version | `npx wrangler deployments status --name <worker> --json` | = version mới |
| `requestId` + lỗi | `npx wrangler tail <worker> --format json` | có `requestId`, 0 entry lỗi |
| Contract | gọi `<endpoint>`, zod parse | parse thành công |
| Migration | `npx wrangler d1 migrations list <DB> --remote` | không còn migration chờ |
| FE | `curl -s <portal-url>/` | `200`, asset khớp `dist/` |

## 9. ESCALATE đang chờ

| # | Finding | Vì sao chặn ship |
|---|---|---|
| — | <hoặc "không có"> | — |

Có mục ảnh hưởng nội dung ship → không hỏi go, dừng.
