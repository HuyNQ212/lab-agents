# Deploy checklist — cho reviewer của ship plan

> Dùng ở Phase 1 của `ship`. Bộ câu hỏi phản biện **plan**, không phải code.
> Reviewer là sub-agent context sạch, nhận **đúng hai file**: `ship-plan.md` và file này. Không nhận reasoning của người lập plan.

## Vì sao review ở đây quan trọng nhất trong toàn chuỗi

`architecture-design`, `to-spec` và `spec-review` review artifact mà sai thì sửa rẻ. `implement` commit mà sai thì sửa bằng commit mới. **`ship` plan mà sai thì hậu quả đi thẳng vào production D1 và Worker đang chạy** — migration forward-only, không rollback thật.

Vì vậy reviewer ở đây phải chấm chặt hơn, và câu hỏi phải là "nếu bước này hỏng thì trạng thái là gì", không phải "bước này có hợp lý không".

## 1. Phạm vi và thứ tự

- Mọi repo có commit chưa ship đã được liệt kê chưa? → thiếu = **BLOCKER** (ship nửa vời).
- Có commit nào không thuộc ticket đã duyệt? → **MAJOR** (scope drift).
- Merge order có đúng **callee trước caller**? → ngược = **BLOCKER**.
- Thứ tự merge có khớp thứ tự deploy? → lệch = **MAJOR** (khó lần vết khi có sự cố).
- PR nào có dependency vào PR khác đã ghi rõ? → thiếu = **MAJOR**.

## 2. Gate coverage

- Mọi repo có thay đổi đều có gate chạy? → thiếu repo = **BLOCKER**.
- Gate là `lab repo-gate <repo>` (bộ `REPO_GATES` trong `lab.mjs`: format:check → lint → typecheck → test → build + pin exact + lockfile)? → bộ lệnh tự chọn khác = **BLOCKER**.
- Gate chạy trên nội dung **sau rebase**, có `tested-sha` từng repo? → thiếu = **BLOCKER**.
- Có output thật (số test, thời gian build) hay chỉ "đã chạy"? → thiếu = **MAJOR**.
- Có gate nào bị bỏ qua? → **BLOCKER**. Thiếu script có sẵn từ trước phải thành ticket MAINT, không bỏ qua.

## 3. Merge strategy và verify

- Merge dùng `--rebase --match-head-commit <tested-sha>`, không `--squash`? → squash hoặc thiếu `--match-head-commit` = **BLOCKER**.
- Có bước force push nào? → **BLOCKER** (hook chặn; cập nhật nhánh bằng `gh pr update-branch --rebase`).
- Có bước verify tree hash sau merge? → thiếu = **BLOCKER**.
- Nếu tree hash khác, plan nói làm gì? → không nói = **BLOCKER**.
- Plan có tính trường hợp `main` di chuyển trong lúc review (chạy gate trên `origin/main`, fail thì không migrate/deploy)? → không = **MAJOR**.
- `wrangler whoami` đúng account trước merge? → thiếu = **MAJOR**.

## 4. Migration

Trục rủi ro cao nhất. Chấm chặt.

- Danh sách file `.sql` chưa apply có đầy đủ, đúng D1? → thiếu = **BLOCKER**.
- Mọi file đã apply **local** thành công? → chưa = **BLOCKER**.
- Mọi file forward-only, additive, không `RENAME`/`DROP TABLE`? → vi phạm = **BLOCKER** (luật 6).
- Thứ tự file khớp dependency giữa bảng? → sai = **BLOCKER** (FK/CHECK fail giữa chừng).
- **"Nếu dừng giữa hai file, schema ở trạng thái nào?" có câu trả lời cụ thể?** (`migrations apply` rollback riêng file lỗi, file trước giữ) → không trả lời được = **BLOCKER**.
- Có bước ghi bookmark `npx wrangler d1 time-travel info <DB> --json` trước migrate? → thiếu = **BLOCKER**.
- Có `d1 export` dữ liệu production vào thư mục được commit? → **BLOCKER**.
- Apply từng D1 một bằng `npx wrangler d1 migrations apply <DB> --remote`, verify sau mỗi cái? → gộp = **MAJOR**.
- Verify dùng `migrations list <DB> --remote` (rỗng) + `PRAGMA table_info`? → "lệnh chạy không lỗi" = **MAJOR**.
- Có `PRAGMA optimize` sau migration (backend.md §10.5)? → thiếu = **MINOR**.

## 5. Deploy

- Deploy order suy ra từ `services[]` trong `wrangler.jsonc`, **callee → caller**? → ngược hoặc chép tay = **BLOCKER** (caller gọi binding chưa tồn tại).
- Deploy tuần tự, dừng khi fail? → song song = **BLOCKER**.
- Mọi khóa `envVarSchema` có trong `npx wrangler secret list` hoặc `vars`, `ENVIRONMENT` = `production`? → thiếu = **BLOCKER**. `check-env.ts` chỉ kiểm `.env` local, không thay được bước này.
- Version ID hiện tại của từng Worker đã ghi để rollback? → thiếu = **BLOCKER**.
- Mỗi Worker ghi "code cũ chạy được với schema mới"? → thiếu = **MAJOR** (rollback chỉ quay code).
- Bootstrap (remote rỗng, `database_id` rỗng, callee chưa deploy, `entrypoint` không khớp) đã xử lý? → còn = **BLOCKER**.
- Có binding mới? → callee phải deploy trước, plan có ghi rõ? → thiếu = **BLOCKER**.
- FE deploy sau khi tất cả BE verify xong? → trước = **MAJOR**.

## 6. Version và dependency

- Có nâng version dependency nào trong lần ship này? → có = **BLOCKER** (version là ticket riêng; trộn vào ship làm không biết cái gì gây lỗi).
- Lockfile khớp `package.json`? → lệch = **BLOCKER**.
- Có range trôi nổi (`^`/`~`/`latest`/`*`)? → có = **BLOCKER** (pin exact; `lab repo-gate` fail).
- `npm ls` có `UNMET PEER`? → có = **MAJOR**.
- `wrangler` version lệch major so với lần deploy trước? → lệch mà không ghi lý do = **MAJOR**.
- `compatibility_date` cũ hơn 6 tháng? → **MINOR**, ghi nhận.
- Repo có `engines` mà `node -v` lệch? → **BLOCKER**. Không có `engines` → ghi `node -v`.

## 7. Verify production

- Mỗi dòng verify có lệnh và ngưỡng PASS máy kiểm được? → "kiểm bằng mắt"/"user smoke" = **MAJOR**.
- Có kế hoạch verify cho **từng** Worker vừa deploy? → thiếu = **MAJOR**.
- Verify có kiểm `requestId` trong log (auth context chảy đúng)? → thiếu = **MAJOR**.
- Có kiểm contract thật khớp zod schema của FE? → thiếu = **MAJOR** (đây là chỗ lệch contract nổ).
- Có bước kiểm FE tải được (không màn hình trắng)? → thiếu = **MAJOR**.
- Có kiểm query trên bảng vừa migration? → thiếu = **MAJOR**.

## 8. Điểm dừng và rollback

- Gói quyết định go/no-go liệt kê đủ hành động không hoàn tác được (PR, D1, Worker, FE)? → thiếu = **BLOCKER**.
- Mỗi bước không hoàn tác được có lệnh, verify ngay sau, và đường lùi cụ thể? → "sẽ xử lý nếu cần" = **BLOCKER**.
- Rollback Worker theo thứ tự caller trước callee; restore D1 là câu hỏi cho user? → sai = **BLOCKER**.
- Có ESCALATE nào từ `implement` còn chờ user mà ảnh hưởng nội dung ship? → có = **BLOCKER** (không ship khi thiết kế chưa chốt).
- Preconditions (`gh`, `whoami`, dirty, bootstrap, gate) đều ✅? → ❌ mà plan vẫn tiếp = **BLOCKER**.

## Output của reviewer

Ghi `<dir>/specs/<SPEC-ID>-ship/ship-plan-review.md`. Frontmatter bắt buộc (`lab check` kiểm):

```markdown
---
id: <SPEC-ID>-ship-review
type: review
status: done
repos: [<repo>, ...]
parent: <SPEC-ID>-ship
verdict: NEEDS-WORK
open-questions: 0
---

## Verdict: NEEDS-WORK

### Findings

| ID | Mức | Trục | Vị trí | Vấn đề | Vì sao | Hướng sửa |
|---|---|---|---|---|---|---|
| SH-1 | BLOCKER | Migration | plan §5 | Không trả lời "fail giữa chừng thì sao" | Migration forward-only, schema nửa vời không rollback được | Ghi rõ trạng thái sau lỗi + migration bù |

### Đã kiểm tra, không thấy vấn đề
- Gate coverage: 3/3 repo
- Deploy order: callee → caller đúng
```

Plan chỉ được thực thi khi `verdict: PASS` và `open-questions: 0`. `NEEDS-WORK` khi mọi finding sửa được trong plan; `BLOCK` khi finding cần user quyết hoặc nằm ngoài ship (ESCALATE, bootstrap, code hỏng).

## Trước khi trả

- [ ] Reviewer không nhận reasoning của người lập plan.
- [ ] Mọi BLOCKER dẫn được luật cứng hoặc hậu quả không hoàn tác cụ thể.
- [ ] Đã kiểm câu "nếu bước này hỏng thì schema/hệ thống ở trạng thái nào".
- [ ] Không có finding chỉ dựa trên preference.
- [ ] Verdict khớp finding: sửa được trong plan → NEEDS-WORK, cần user hoặc bước khác → BLOCK.
