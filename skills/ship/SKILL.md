---
name: ship
description: "Đưa một spec đã implement xong (<SPEC-ID>, hoặc ID ticket nhỏ) từ nhánh feat/<SPEC-ID> lên production. Thay thế CI/CD vì Lab không có pipeline: lập ship-plan và cho reviewer context sạch duyệt, chạy gate bằng lab repo-gate (format:check → lint → typecheck → test → build + pin exact), tạo PR multi-repo, đưa user một gói quyết định go/no-go, merge bằng rebase kèm --match-head-commit và kiểm tree hash, migration D1 remote có bookmark Time Travel, deploy Worker theo thứ tự suy ra từ services[] trong wrangler.jsonc, verify production bằng tiêu chí máy kiểm được, rollback khi hỏng, rồi lab ship-mark. Mọi lệnh không hoàn tác được đều hỏi user. Dùng khi user nói \"ship\", \"đưa lên production\", \"deploy\", hoặc khi orchestrate chuyển từ implement sang (lab gate ship <SPEC-ID> PASS). Không dùng để viết code hay chạy implement."
metadata:
  short-description: "Plan → gate → PR → go/no-go → merge → migration → deploy → verify → ship-mark"
---

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md`, cách hỏi user ở `.agents/references/decision-packet.md`.

# ship

Đưa nội dung đã implement lên production. Lab **không có CI/CD**, nên skill này **chính là** CI/CD: nó là thể chế duy nhất thực thi gate trên môi trường thật.

## Đầu vào và định danh

| Mục | Giá trị |
|---|---|
| ID nhận vào | `<SPEC-ID>` (thư mục `specs/<SPEC-ID>/`), hoặc ID ticket nhỏ `SETUP-/MAINT-/EXP-<n>` |
| Gate vào | `lab gate ship <SPEC-ID>` PASS: mọi ticket của spec đã tick, ticket nhỏ con đã done. FAIL → chạy `implement` cho ticket còn thiếu |
| Ship ID | `<SPEC-ID>-ship` (ticket nhỏ: `<TICKET-ID>-ship`) |
| Thư mục | `<dir>/specs/<SPEC-ID>-ship/` với `<dir>` là thư mục product/platform của spec |
| Nhánh code | `feat/<SPEC-ID>` ở từng repo trong `repos` (ticket nhỏ: `feat/<TICKET-ID>`), do `implement` đã push |

`lab` = `node .agents/scripts/lab.mjs`, chạy từ gốc workspace.

## Hai nửa, tính chất khác nhau

```text
feat/<SPEC-ID> ─gate─> PR ─go/no-go─> merge ─> migration ─> deploy ─> verify ─> ship-mark
                 ↑      ↑      ↑         ↑         ↑           ↑         ↑
               Ph.2   Ph.3   Ph.3b     Ph.4      Ph.5        Ph.6      Ph.7
        ┌──── ĐẢO NGƯỢC ĐƯỢC ────┐   ┌─────────── KHÔNG ĐẢO NGƯỢC ───────────┐
```

| Nửa | Phase | Rủi ro nếu sai |
|---|---|---|
| **Trước merge** — plan, gate, PR | 0–3b | Thấp. Đóng PR, sửa ở `implement` |
| **Sau merge** — merge, migration, deploy | 4–7 | Cao. D1 đã đổi, Worker đã thay, migration forward-only |

**Đây là lý do plan phải được reviewer context sạch duyệt trước khi thực thi.** Review trước hành động không hoàn tác được là review giá trị nhất trong toàn chuỗi.

## Lệnh không hoàn tác được — luôn hỏi user

Hook `bash-guard.mjs` và `permissions.ask` trong `.claude/settings.json` bắt user xác nhận từng lệnh dưới đây. Skill **cũng** phải, trước mỗi lệnh: nêu bước, lệnh chính xác, và bước verify chạy ngay sau. Không gộp nhiều lệnh vào một lần gọi Bash để lách hỏi từng lệnh.

| Lệnh | Verify ngay sau |
|---|---|
| `gh pr merge ...` | tree hash `main` == tree đã test (Phase 4) |
| `npx wrangler d1 migrations apply <DB> --remote` | `npx wrangler d1 migrations list <DB> --remote` báo không còn migration chưa apply |
| `npx wrangler d1 execute <DB> --remote ...` | kết quả lệnh ghi vào execution-log |
| `npx wrangler deploy` | `npx wrangler deployments status --name <worker> --json` ra version mới |
| `npx wrangler rollback <version-id> ...` | `deployments status` ra đúng version cũ |
| `npx wrangler d1 time-travel restore ...` | `migrations list --remote` khớp trạng thái trước migration |
| `npx wrangler secret put <KEY>` | `npx wrangler secret list --name <worker>` có khóa đó |

**Bị cấm (hook chặn, chỉ user tự làm):** mọi `git push --force` / `-f` / `--force-with-lease`, `wrangler delete`, `wrangler d1 delete`, xóa nhánh `main`. Push thẳng `main` của repo code chỉ qua `gh pr merge` trong ship.

Giá trị secret là dữ liệu của user: agent không tự nhập, không đọc từ `lab-secrets`, không in ra. Thiếu secret → user tự chạy `npx wrangler secret put <KEY>` (SEC-5).

## Phase 0 — Inventory & Plan (chỉ đọc, không side effect)

Đầu ra là `<dir>/specs/<SPEC-ID>-ship/ship-plan.md` theo `references/plan-template.md`: frontmatter `id: <SPEC-ID>-ship`, `type: ship-plan`, `status: in-progress`, `repos`, `parent: <SPEC-ID>`, khối `## Tasks` T1–T7. Tick từng bước bằng `lab tick <SPEC-ID>-ship T<n>`.

| Mục | Xác định bằng |
|---|---|
| Repo set | Cột Repo của bảng Tickets trong spec + `git log origin/main..origin/feat/<SPEC-ID>` từng repo |
| Nhánh + commit | Hash đầu nhánh, ticket ID trong commit, đã push chưa |
| Đồ thị binding | `services[]` trong `wrangler.jsonc` của mọi Worker trong `services/` |
| Merge/deploy order | Sắp xếp tô-pô đồ thị binding: **callee trước caller**, `apps/lab-portal` cuối |
| Migration set | `npx wrangler d1 migrations list <DB> --remote` từng D1 có thay đổi |
| Secret và biến môi trường | Khóa của `envVarSchema` trong `src/config.ts` so với `npx wrangler secret list --name <worker>` và `vars` trong `wrangler.jsonc` |
| Tài khoản | `npx wrangler whoami --json` — đúng account của Lab, đã auth |
| Preconditions | `gh auth status`, working tree sạch, Phase 0b không có mục chặn |
| Rollback | Version ID hiện tại từng Worker: `npx wrangler versions list --name <worker> --json` |

Working tree bẩn không rõ nguồn gốc → **dừng**, báo trong gói quyết định.

`check-env.ts` chỉ đọc `.env` local, nên nó chỉ là **kiểm cấu hình local**, không phải bằng chứng production. Bằng chứng production là bảng đối chiếu secret/vars ở trên: khóa nào trong `envVarSchema` không có trong `secret list` hay `vars` → mục chặn. Riêng `ENVIRONMENT` phải là `production` trên Worker deploy; thiếu `vars.ENVIRONMENT` trong `wrangler.jsonc` → ticket MAINT qua `capture`, dừng.

## Phase 0b — Bootstrap lần ship đầu (kiểm mọi lần, thường chỉ vướng lần đầu)

| Điều kiện | Phát hiện bằng | Hành động |
|---|---|---|
| Remote rỗng hoặc chưa có `main` | `git ls-remote --heads origin main` rỗng | Dừng. Ticket SETUP qua `capture`: tạo remote, push `main` khởi tạo (user xác nhận) |
| Commit nằm thẳng trên `main` local, không có `feat/*` | `git log origin/main..main` báo lỗi hoặc có commit | Dừng. Ticket SETUP: đưa commit sang `feat/<ID>` theo `implement` |
| `database_id` rỗng | `"database_id": ""` trong `wrangler.jsonc` | Dừng. Ticket SETUP: `npx wrangler d1 create <name>` (kiểm `--help` trước khi chạy) rồi ghi id vào `wrangler.jsonc` qua `implement` |
| Worker đích của binding chưa deploy | Repo callee không có `package.json`, hoặc `npx wrangler deployments list --name <callee>` lỗi | Dừng. Gói quyết định: deploy callee trước trong cùng ship, hay ticket SETUP gỡ binding chưa dùng |
| Binding khai `entrypoint` mà callee không export tên đó | `services[].entrypoint` so với `export` trong `src/index.ts` callee | Dừng. Ticket MAINT bỏ `entrypoint` (backend.md §10.4 chốt HTTP interface) |
| Repo thiếu script gate, dependency không pin exact, thiếu `package-lock.json` | `lab repo-gate <repo>` báo `thiếu script` / `không pin exact` / `thiếu package-lock.json` | Dừng. Ticket MAINT qua `capture`; không sửa trong ship, không lặp review |

Mọi mục ở đây ghi vào mục Preconditions của plan. Còn mục chặn → không sang Phase 1.

## Phase 1 — Plan review (reviewer context sạch)

Spawn một sub-agent context sạch (cùng cơ chế với `implement/references/review-protocol.md`), đưa **đúng hai file**: `ship-plan.md` và `references/deploy-checklist.md`. Không đưa reasoning của người lập plan.

Reviewer ghi `<dir>/specs/<SPEC-ID>-ship/ship-plan-review.md`: frontmatter `id: <SPEC-ID>-ship-review`, `type: review`, `status: done`, `repos`, `parent: <SPEC-ID>-ship`, `verdict: PASS|NEEDS-WORK|BLOCK`, `open-questions: <n>`. PASS chỉ khi `open-questions: 0`.

| Verdict | Làm gì |
|---|---|
| PASS | `lab tick <SPEC-ID>-ship T2`, sang Phase 2 |
| NEEDS-WORK | Sửa plan, review lại bằng sub-agent mới. **Trần 2 vòng** |
| BLOCK, hoặc quá 2 vòng | Dừng, đưa finding vào gói quyết định |

Không tự bỏ qua phase này, kể cả khi ship "chỉ một file".

## Phase 2 — Gate trên nhánh

Áp cho **mọi repo có thay đổi**, không chỉ repo sắp deploy. FE đổi mà BE fail test cũng phải dừng — contract hai phía gắn nhau.

```bash
lab repo-gate <repo>     # vd services/lab-user
```

Bộ gate duy nhất là `REPO_GATES` trong `lab.mjs`: `format:check → lint → typecheck → test → build`, cộng pin exact (không `^`, `~`, `latest`, `*`) và có `package-lock.json`. Không tự chạy bộ lệnh khác thay thế. Exit khác 0 → dừng; lỗi do thiếu script hay range có sẵn từ trước → ticket MAINT (Phase 0b), lỗi code → quay lại `implement`.

**Ghi output thật** (số test pass, thời gian build) vào plan, không ghi "đã chạy".

### Version và dependency

Không nâng version trong lúc ship. Ship chỉ **xác nhận** trạng thái; nâng version là ticket MAINT riêng — trộn upgrade vào ship là cách chắc chắn nhất để không biết cái gì gây lỗi.

| Kiểm | Tiêu chí |
|---|---|
| Lockfile khớp `package.json` | `npm ci` chạy được |
| Pin exact | `lab repo-gate` không báo `không pin exact` |
| Peer dependency | `npm ls` không có `UNMET PEER` |
| `wrangler` version | Ghi lại; cảnh báo nếu lệch major so với lần deploy trước |
| `compatibility_date` | Không cũ hơn 6 tháng, ghi lại |
| Node | Ghi `node -v`; repo có `engines` thì phải khớp |
| Dependency mới | Đối chiếu spec — ngoài spec thì dừng |

## Phase 3 — Cập nhật nhánh, PR, `tested-sha`

Không rebase local rồi force push (hook chặn mọi force push). Cập nhật nhánh bằng GitHub:

```bash
gh pr create --base main --head feat/<SPEC-ID> --title "[<SPEC-ID>] <mô tả>" --body-file <file>
gh pr update-branch <n> --rebase          # chỉ khi nhánh đi sau origin/main
git fetch origin && git switch --detach origin/feat/<SPEC-ID>
lab repo-gate <repo>                      # chạy lại gate trên đúng nội dung sau rebase
git rev-parse HEAD                        # = tested-sha, ghi vào plan
```

**Bắt buộc chạy lại gate sau khi nhánh đổi.** Rebase đổi nội dung, test xanh trước đó không còn giá trị. `tested-sha` là SHA đầu nhánh mà gate vừa chạy xanh; ghi cho từng repo vào plan.

PR body (không có CI thì body là bằng chứng duy nhất đi cùng nội dung): ticket ID + đường dẫn spec, output gate thật, finding đã REJECT kèm lý do, đường dẫn ảnh Storybook (frontend), ESCALATE còn chờ.

**Tạo PR theo merge order: callee trước caller.** `lab tick <SPEC-ID>-ship T3`.

## Phase 3b — Gói quyết định go/no-go (điểm dừng duy nhất của ship)

Một gói theo `.agents/references/decision-packet.md`, đăng sau khi plan review PASS và gate sau rebase xanh. Đầu trang:

- Danh sách hành động không hoàn tác được theo thứ tự: PR nào merge (số, `tested-sha`), D1 nào migrate (file nào, bookmark sẽ ghi), Worker nào deploy (version hiện tại để rollback), FE.
- Rủi ro còn lại và đường lùi của từng bước.
- ESCALATE từ `implement` còn mở, mục chặn từ Phase 0b.
- Câu hỏi: `Q1: Ship <SPEC-ID> theo plan? A. Đồng ý (đề xuất) / B. Dừng`.

User không phải đọc code hay tự smoke: bằng chứng máy (gate, review, verify plan) nằm phía dưới trang để tra khi cần.

Có ESCALATE ảnh hưởng nội dung ship → không hỏi go, dừng và chuyển về bước sở hữu (`to-spec`/`implement`). User trả lời B hoặc không trả lời → dừng. Trả lời A → Phase 4–7 chạy liền; mỗi lệnh không hoàn tác được vẫn qua hook hỏi user như bảng trên.

## Phase 4 — Merge + verify tree hash

Kiểm tài khoản trước merge: `npx wrangler whoami --json` đúng account của plan; lệch → dừng.

```bash
gh pr merge <n> --rebase --match-head-commit <tested-sha> --delete-branch
```

**Không dùng `--squash`.** Squash tạo commit mới, mất liên hệ với commit đã test. `--rebase` giữ cây nội dung khi `main` không đổi. `--match-head-commit` làm GitHub từ chối merge nếu đầu nhánh không còn là `tested-sha`.

Sau **mỗi** merge:

```bash
git fetch origin
git rev-parse origin/main^{tree}           # tree trên main
git rev-parse <tested-sha>^{tree}          # tree đã test
```

**Bằng nhau → đúng.** Khác → `main` đã có commit khác không có trong nhánh (không conflict nhưng đổi cây): chạy `lab repo-gate <repo>` trên `origin/main`. Gate fail sau merge → dừng, không migrate, không deploy, báo user (xem Khi hỏng).

Merge theo thứ tự đã duyệt, xong tất cả mới sang Phase 5. `lab tick <SPEC-ID>-ship T4`.

## Phase 5 — Migration remote (nếu có)

Tuần tự từng D1, chạy trong thư mục repo sở hữu D1 đó, không đảo thứ tự:

| # | Bước | Lệnh |
|---|---|---|
| 1 | Liệt kê migration chưa apply, khớp plan | `npx wrangler d1 migrations list <DB> --remote` |
| 2 | Đã apply local thành công | bằng chứng gate trong `docs/delivery/<TICKET-ID>/` |
| 3 | Đọc lại file: forward-only, additive, không `RENAME`/`DROP TABLE` | đọc `.sql` |
| 4 | Ghi bookmark Time Travel trước khi migrate | `npx wrangler d1 time-travel info <DB> --json` → bookmark vào execution-log |
| 5 | Apply (hook hỏi user) | `npx wrangler d1 migrations apply <DB> --remote` |
| 6 | Verify không còn migration chờ | `npx wrangler d1 migrations list <DB> --remote` |
| 7 | Verify bảng/cột/index (hook hỏi user) | `npx wrangler d1 execute <DB> --remote --command "PRAGMA table_info(<bảng>)"` |
| 8 | `PRAGMA optimize` (backend.md §10.5, hook hỏi user) | `npx wrangler d1 execute <DB> --remote --command "PRAGMA optimize"` |

Theo `--help` của wrangler 4.156.0: `migrations apply` chụp backup sau khi apply, và **migration lỗi thì được rollback riêng file đó**, các migration trước vẫn giữ. Plan vẫn ghi trạng thái schema nếu dừng giữa hai file.

Không `d1 export` dữ liệu production vào repo hay thư mục được commit — bookmark Time Travel là đường lùi.

`lab tick <SPEC-ID>-ship T5` (không có migration: tick kèm ghi "Không áp dụng" trong plan).

## Phase 6 — Deploy

| # | Bước | Lệnh |
|---|---|---|
| 1 | Đối chiếu secret với `envVarSchema` từng Worker | `npx wrangler secret list --name <worker>` — thiếu → dừng, user tự `secret put` |
| 2 | Ghi version hiện tại để rollback | `npx wrangler versions list --name <worker> --json` |
| 3 | Deploy theo order của plan, **tuần tự** (hook hỏi user) | `npx wrangler deploy --message "<SPEC-ID>-ship"` trong thư mục repo |
| 4 | Ghi version mới | `npx wrangler deployments status --name <worker> --json` → execution-log |
| 5 | Frontend sau cùng, sau khi mọi BE verify xong | trong `apps/lab-portal`: `npm run build` rồi `npx wrangler deploy --message "<SPEC-ID>-ship"` |

Order lấy từ đồ thị `services[]` (backend.md §10.4): callee trước caller. Ví dụ đồ thị hiện tại: `lab-user` → `lab-identity` → `lab-planning`, `lab-notification` → `lab-gateway` → `lab-portal`. Binding mới: callee phải deploy trước, nếu không caller gọi binding chưa tồn tại.

`lab tick <SPEC-ID>-ship T6`.

## Phase 7 — Verify production (máy kiểm, có ngưỡng)

Agent tự chạy, ghi lệnh và output vào execution-log. User không smoke tay.

| Kiểm | Lệnh / cách | PASS khi |
|---|---|---|
| Worker sống | `curl -s -o /dev/null -w "%{http_code}" <gateway-url>/health` (và portal) | `200` |
| Version đúng | `npx wrangler deployments status --name <worker> --json` | version = version ghi ở Phase 6 |
| Auth context | `npx wrangler tail <worker> --format json` chạy nền trong lúc gửi một request thật | có entry chứa `requestId` của response, `outcome` = `ok` |
| Log lỗi | cùng phiên tail, lọc `--status error` | 0 entry trong lúc smoke |
| Contract | gọi endpoint chính của spec, parse response bằng zod schema của FE (hoặc schema trong spec) | parse thành công |
| Migration | `npx wrangler d1 migrations list <DB> --remote` | không còn migration chờ |
| FE | `curl -s <portal-url>/` | `200`, HTML trỏ tới asset có trong `dist/` vừa build |

Mọi dòng PASS → `lab tick <SPEC-ID>-ship T7`, sang Hoàn tất. Một dòng FAIL → Khi hỏng.

## Khi hỏng (Phase 4–7)

| Tình huống | Làm gì | Xong khi (máy kiểm) |
|---|---|---|
| Gate fail trên `main` sau merge | Dừng. Không migrate, không deploy. Ticket qua `capture`, sửa bằng `implement` rồi ship lại | `main` chưa có deploy mới: `deployments status` = version trước ship |
| Migration file lỗi | Dừng, không deploy. Ghi lỗi + bookmark vào execution-log. Gói quyết định: restore về bookmark (`npx wrangler d1 time-travel restore <DB> --bookmark <bookmark>`, hook hỏi) hay migration bù qua `to-spec` | `migrations list --remote` khớp trạng thái đã chọn |
| Deploy Worker thứ k lỗi | Không deploy tiếp. Worker k chưa lên version mới thì không rollback; callee 1..k-1 giữ nguyên (thay đổi tương thích ngược) | `deployments status` của k = version cũ |
| Verify Phase 7 FAIL | Rollback các Worker vừa deploy, **caller trước callee** (ngược order deploy): `npx wrangler rollback <version-id> --name <worker> --message "<SPEC-ID>-ship rollback" --yes` (hook hỏi) | `deployments status` mỗi Worker = version ghi ở Phase 6 bước 2; health `200` |
| Cần khôi phục D1 | Không tự chạy. Gói quyết định một câu có/không | user trả lời; restore xong thì `migrations list --remote` khớp |

Rollback Worker chỉ quay code, không quay schema. Chỉ rollback khi code cũ còn chạy với schema mới — thường đúng vì migration bắt buộc additive; plan phải ghi điều này cho từng Worker. Mọi sự cố ghi execution-log (append-only), báo user bằng gói quyết định nếu cần chọn hướng, không tự kết luận "ổn".

## Hoàn tất

```bash
lab ship-mark <SPEC-ID> <SPEC-ID>-ship        # ghi shipped: vào story của spec
lab check
lab commit <SPEC-ID> "ship <SPEC-ID> lên production" --push
```

`lab commit <SPEC-ID>` gom cả thư mục `<SPEC-ID>-ship/` và story vừa ship-mark (cùng tiền tố ID). Ticket nhỏ đứng riêng không có `specs/<ID>/` spec nên `ship-mark` không áp dụng; ghi kết quả vào execution-log.

Tick T7 đã đưa `ship-plan.md` sang `status: done` (script tự dẫn xuất); không sửa tay.

`execution-log.md` cùng thư mục, không có frontmatter (không có Tasks; tiến độ nằm ở `ship-plan.md`). Ghi theo thời gian: repo/commit, PR đã merge (số, `tested-sha`, hai tree hash), bookmark D1, migration đã apply, version Worker trước/sau, output verify. **Append-only** — không sửa dòng cũ.

## Dừng và báo user khi

- `gh` không có hoặc chưa auth; `wrangler whoami` sai account hoặc chưa auth.
- Repo dirty không rõ nguồn gốc, hoặc còn mục chặn ở Phase 0b.
- `lab repo-gate` fail.
- Plan review không PASS sau 2 vòng, hoặc BLOCK.
- Tree hash sau merge khác và gate trên `main` fail.
- Migration không additive/forward-only, hoặc thiếu secret/vars production.
- Deploy order không suy ra được từ `services[]` (vòng binding).

Mọi lần dừng cần user chọn hướng đi qua gói quyết định; dừng do thiếu điều kiện tự sửa được thì sinh ticket qua `capture`.

## Không làm

- Không sửa code trong lúc ship. Code hỏng → `capture` + `implement`.
- Không nâng version dependency trong lúc ship.
- Không `--squash` merge, không force push, không xóa Worker/D1.
- Không merge khi chưa có go từ gói quyết định.
- Không deploy song song nhiều Worker.
- Không bỏ qua verify tree hash sau merge.
- Không tự nhập giá trị secret, không tự restore D1.

## Đầu ra / bước tiếp theo

| | |
|---|---|
| Đầu vào | `<SPEC-ID>` hoặc ID ticket nhỏ; `lab gate ship <SPEC-ID>` PASS |
| Đầu ra | `<dir>/specs/<SPEC-ID>-ship/ship-plan.md`, `ship-plan-review.md`, `execution-log.md`; PR đã merge, migration đã apply, Worker đã deploy |
| Kết thúc khi | Phase 7 mọi dòng PASS → `lab ship-mark <SPEC-ID> <SPEC-ID>-ship`, `lab check`, `lab commit <SPEC-ID> "..." --push` |
| Bước tiếp theo | Hết chuỗi. `orchestrate` thấy story có `shipped:` thì coi là xong. Retro tùy chọn |
