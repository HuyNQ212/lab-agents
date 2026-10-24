---
name: ship
description: Đưa code đã implement trên nhánh feature lên production. Thay thế CI/CD vì Lab không có pipeline — chạy đủ gate (format, lint, typecheck, test, build), tạo PR multi-repo, merge bằng rebase kèm verify tree hash, migration D1, deploy Worker theo thứ tự binding, verify production. Dùng khi user nói "ship", "đưa lên production", "deploy". Không dùng để viết code hay chạy implement.
metadata:
  short-description: Nhánh feature → PR → merge → migration → deploy → verify
---

# ship

Đưa nội dung đã implement lên production. Lab **không có CI/CD**, nên skill này **chính là** CI/CD: nó là thể chế duy nhất thực thi gate trên môi trường thật.

## Hai nửa, tính chất khác nhau

```text
NHÁNH feature ──push──> PR ──merge──> main ──migration──> deploy ──verify──> production
                 ↑       ↑            ↑                                  ↑
              Phase 3   Phase 3    Phase 4                          Phase 5-7
              
        ┌────────── ĐẢO NGƯỢC ĐƯỢC ──────────┐  ┌──── KHÔNG ĐẢO NGƯỢC ────┐
```

| Nửa | Phase | Rủi ro nếu sai |
|---|---|---|
| **Trước merge** — plan, gate, PR | 0–3 | Thấp. Đóng PR, push lại |
| **Sau merge** — merge, migration, deploy | 4–7 | Cao. D1 đã đổi, Worker đã thay, migration forward-only |

**Đây là lý do plan phải được reviewer fresh duyệt trước khi thực thi.** Review trước hành động không hoàn tác được là review giá trị nhất trong toàn chuỗi.

## Điều kiện vào

- [ ] Có nhánh feature với commit của các ticket đã implement xong (DoD đạt)
- [ ] Không còn ticket trong phạm vi đang dở
- [ ] Working tree sạch mọi repo
- [ ] `gh` CLI đã cài và đã auth — **kiểm ở Phase 0, báo rõ nếu thiếu**

## Phase 0 — Inventory & Plan (chỉ đọc, không side effect)

Đầu ra là **một tài liệu plan**, dùng `references/plan-template.md`. Không hành động gì ở phase này.

| Mục | Xác định bằng |
|---|---|
| Repo set | `git status` + `git log origin/main..HEAD` từng repo |
| Nhánh + commit | Hash, ticket ID, đã push chưa |
| Merge order | Thứ tự theo binding dependency — **callee trước caller** |
| Migration set | File `.sql` chưa apply, D1 nào, thứ tự |
| Deploy set | Worker nào, thứ tự callee → caller, FE sau cùng |
| Gate plan | Lệnh gate từng repo + đã chạy chưa |
| Preconditions | `gh` có? repo dirty? repo behind? version mismatch? |
| Risk list | Mỗi bước không hoàn tác được + cách phục hồi |
| Rollback | Worker version ID hiện tại; migration không rollback → cách bù |

Working tree bẩn không rõ nguồn gốc → **dừng**.

## Phase 1 — Plan review (reviewer fresh)

Reviewer nhận **chỉ plan**, không nhận reasoning người viết plan. Checklist `references/deploy-checklist.md` §"Plan review".

Plan phải đạt **PASS** mới thực thi. `NEEDS WORK` → sửa plan, review lại. `BLOCK` → báo user.

Không được tự bỏ qua phase này, kể cả khi ship "chỉ một file".

## Phase 2 — Gate trên nhánh

Áp cho **mọi repo có thay đổi**, không chỉ repo sắp deploy. FE đổi mà BE fail test cũng phải dừng — contract hai phía gắn nhau.

Thứ tự rẻ trước:

```bash
npm run format:check    # Prettier --check
npm run lint
npm run typecheck
npm test
npm run build
```

Fail ở đâu dừng ở đó.

**Ghi output thật** (số test pass, thời gian build), không phải "đã chạy". Với FE: chạy thêm `npm run storybook` build check nếu có lệnh riêng.

### Version và dependency

Không nâng version trong lúc ship. Ship chỉ **xác nhận** trạng thái; nâng version là ticket riêng — trộn upgrade vào ship là cách chắc chắn nhất để không biết cái gì gây lỗi.

| Kiểm | Tiêu chí |
|---|---|
| Lockfile khớp `package.json` | `npm ci` chạy được |
| Không range trôi nổi | Không `^`, `~`, `latest`, `*` |
| Peer dependency | `npm ls` không có `UNMET PEER` |
| `wrangler` version | Ghi lại; cảnh báo nếu lệch major so với lần deploy trước |
| `compatibility_date` | Không cũ hơn 6 tháng, ghi lại |
| Node khớp engines | `node -v` vs `engines` từng repo |
| Dependency mới | Đối chiếu spec — ngoài spec thì dừng |

## Phase 3 — Rebase, push, PR

```bash
git fetch origin
git rebase origin/main          # từng repo
# chạy lại Phase 2 gates sau rebase — rebase có thể làm vỡ test đã pass
git push --force-with-lease
gh pr create --base main --title "<TICKET-ID>: <outcome>" --body-file <file>
```

**Bắt buộc chạy lại gate sau rebase.** Rebase đổi nội dung, test xanh trước đó không còn giá trị.

PR body phải chứa (không có CI thì body là bằng chứng duy nhất đi cùng nội dung):

- Ticket ID + link spec
- Output gate thật
- Danh sách finding đã REJECT kèm lý do
- Đường dẫn ảnh Storybook (frontend)
- Điểm ESCALATE đang chờ (nếu có)

**Tạo PR theo merge order: callee trước caller.**

**Dừng chờ user duyệt PR.** Đây là cổng người thật duy nhất — **không được tự merge**.

## Phase 4 — Merge + verify tree hash

```bash
gh pr merge <n> --rebase --delete-branch
```

**Không dùng `--squash`.** Squash tạo commit mới, **khác hash** với cái đã test — gate mất giá trị. `--rebase` giữ nguyên cây nội dung, chỉ đổi hash.

Sau **mỗi** merge, verify nội dung trên `main` đúng là nội dung đã test:

```bash
git switch main && git pull
git rev-parse HEAD^{tree}              # tree trên main
git rev-parse <tested-sha>^{tree}      # tree của commit đã test
```

**Bằng nhau → đúng. Khác → `main` đã di chuyển trong lúc review → chạy lại Phase 2 gate trên `main` trước khi deploy.**

Bỏ bước này thì kịch bản xấu là: gate xanh trên nhánh, PR khác merge vào trước, rebase-merge resolve conflict tự động, nội dung đổi, deploy cái chưa test.

Merge theo thứ tự đã duyệt. Xong tất cả mới sang Phase 5.

## Phase 5 — Migration remote (nếu có)

Thứ tự bắt buộc, không đảo:

| # | Bước |
|---|---|
| 1 | Liệt kê file `.sql` **chưa apply** ở từng D1 |
| 2 | Xác nhận đã apply **local** thành công |
| 3 | Đọc lại: forward-only? additive? không `RENAME`/`DROP`? |
| 4 | Đối chiếu thứ tự file với dependency giữa bảng |
| 5 | **Backup D1** trước khi migrate |
| 6 | Apply remote **từng D1 một**, verify sau mỗi cái |
| 7 | Verify: bảng/cột/index tồn tại, `d1_migrations` có dòng mới |

⚠️ **Chưa verify: một file `.sql` có chạy trong một transaction không.** Nếu không, file nhiều câu lệnh fail giữa chừng để lại schema nửa vời. Ship phải coi mỗi file là **có thể hỏng một phần** và ghi cách phục hồi **trước khi** apply.

**Dừng chờ user xác nhận** trước khi apply remote — đây là hành động không hoàn tác được.

## Phase 6 — Deploy

| # | Bước |
|---|---|
| 1 | `scripts/check-env.ts` pass cho từng Worker (fail-fast thật) |
| 2 | Dựng đồ thị phụ thuộc từ Service Bindings |
| 3 | Deploy **callee trước, caller sau** (backend.md §10.4) |
| 4 | **Tuần tự**, không song song — fail một cái thì dừng hẳn |
| 5 | Ghi lại Worker version ID mỗi lần deploy (để rollback) |
| 6 | FE deploy sau cùng, sau khi tất cả BE verify xong |

Thêm binding mới: deploy callee trước rồi mới caller. Đảo lại → caller gọi binding chưa tồn tại.

**Dừng chờ user xác nhận** trước khi deploy production.

## Phase 7 — Verify production + ghi nhận

| Kiểm | Cách |
|---|---|
| Worker sống | Health endpoint, đúng status |
| Auth context | Một request có `X-Lab-Context`, `requestId` có trong log |
| Contract thật | Một lời gọi endpoint chính, shape response khớp zod schema của FE |
| Log | Workers Logs có entry, không có error level bất thường |
| FE | Tải trang thật, không màn hình trắng, đúng version vừa deploy |
| Migration | Query đơn giản trên bảng vừa đổi trả dữ liệu |

Đây là bước **user** smoke. Skill đưa danh sách cần tick và bằng chứng cần nhìn, không tự kết luận "ổn".

Ghi log ship: repo/commit đã push, PR đã merge (số), Worker version đã deploy, migration file đã apply, bằng chứng verify.

## Thứ tự push và deploy

**Push và merge trước, deploy sau.** Lý do: khi `main` đã có nội dung cần chạy và đã verify tree hash, deploy đúng cái đó. Nếu deploy trước rồi push sau mà push fail vì conflict, remote sẽ thiếu code đang chạy — trạng thái tệ hơn.

## Ba điểm dừng bắt buộc chờ user

1. **Hết Phase 3** — duyệt PR
2. **Trước Phase 5** — migration remote
3. **Trước Phase 6** — deploy production

Ba chỗ này không hoàn tác được. Không được tự vượt.

## Dừng và báo user khi

- `gh` CLI không có, hoặc chưa auth.
- Repo nào dirty không rõ nguồn gốc.
- Gate fail.
- Plan review không PASS.
- Tree hash sau merge khác cái đã test.
- Migration file không additive/forward-only.
- Không trả lời được "nếu file migration fail giữa chừng thì sao".
- Deploy order không xác định được từ binding.
- `check-env.ts` fail.

## Không làm

- Không sửa code trong lúc ship. Code hỏng → quay lại `implement`.
- Không nâng version dependency trong lúc ship.
- Không `--squash` merge.
- Không merge PR khi chưa user duyệt.
- Không deploy song song nhiều Worker.
- Không bỏ qua verify tree hash sau merge.
- Không tự kết luận production "ổn" — đó là việc user smoke.
