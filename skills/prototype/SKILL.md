---
name: prototype
description: "Tạo Interactive UX Prototype HTML/CSS/JS thuần trong lab-prototype cho một sản phẩm đã có brief (<PREFIX>-BRIEF), trước breakdown/spec, để user duyệt giao diện và hành vi. Mỗi màn hình gắn mã capability C<n> của brief và, khi đã breakdown, mã story. Lint chặn cứng, tự phê bằng ảnh qua sub-agent Explore (2–3 ảnh, ~2 phút, trần 3 vòng), rồi duyệt qua gói quyết định; trạng thái duyệt ghi bằng dòng **Approval:** trong lab-prototype/README.md. Dùng khi user nói \"làm prototype\", \"dựng màn hình\", \"prototype cho Planning\", \"thử giao diện\", hoặc khi orchestrate chạy bước prototype. Không dùng để code production React, không dùng để viết spec."
metadata:
  short-description: "Prototype HTML-first → tự phê bằng ảnh → duyệt qua gói quyết định"
---

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md`, cách hỏi user ở `.agents/references/decision-packet.md`.

# prototype — Dựng prototype, tự phê bằng ảnh, chờ user duyệt

Prototype là **hợp đồng tham khảo UX**, không phải production code. Giá trị của nó nằm ở chỗ user nhìn thấy và quyết định — không phải ở chỗ agent viết xong.

## Đọc trước

- `<dir>/product-brief.md` của `<PREFIX>` (mục `## Capabilities`, `brief-version`) và `<dir>/stories/` nếu đã breakdown
- `lab-docs/architecture/frontend.md` §2 (Quiet Evergreen, Direct-first), §4 (prototype workflow), §6 (hàng rào chất lượng)
- `lab-prototype/README.md` — mục theo sản phẩm, dòng `**Approval:**`, quy tắc repo
- `lab-prototype/shots.json` — manifest ảnh
- `.agents/skills/prototype/references/checklist.md` — luật UI (đọc TRƯỚC khi viết dòng CSS đầu tiên)
- `.agents/skills/prototype/references/app-screen.md` — luật cho dashboard, danh sách, form
- `.agents/skills/prototype/references/shell.md` — hợp đồng shell nếu trang nằm trong Workspace
- `.agents/skills/prototype/references/critique-loop.md` — vòng tự phê

## Vị trí trong chuỗi

```text
grilling → [prototype] → breakdown → architecture-design → to-spec → spec-review → implement → ship
```

**Đầu vào:** `<PREFIX>` có `<dir>/product-brief.md` (`id: <PREFIX>-BRIEF`). Chưa có brief thì dừng: bước đúng là `grilling`, không dựng prototype từ ý tưởng thô. Prototype là **tùy chọn**; không có gate trong `lab gate`.

Khi hành vi UI đã duyệt thì `breakdown` và `architecture-design` (nhánh frontend) tham chiếu prototype thay vì tự đoán giao diện — chỉ khi mục của `<PREFIX>` có dòng `**Approval:** APPROVED …`.

**Prototype không thay spec.** Nó không chứa API contract, không chứa schema, không chứa state management production. Chuyển sang React là việc của `implement`, và **không copy as-is** (`lab-docs/frameworks/engineering-workflow.md` §5.2).

## Luật cứng

1. **HTML/CSS/JS thuần.** Không React, không Vite, không package.json, không build, không deploy. Trong `lab-prototype` **không** cài dependency nào.
2. **Không màu ngoài `shared/tokens.css`.** Trang và shell chỉ dùng `var(--…)`: không hex, `rgb()`/`hsl()`, tên màu (`white`, `red`) — kể cả trong `style=""` và chuỗi gán vào `.style`. Cần token mới thì thêm vào `tokens.css`.
3. **Trang trong Workspace dùng shell chung.** `shared/tokens.css` + `shared/shell.css` + `Workspace.renderShell({page, title})`. Không copy sidebar/topbar/chuông sang trang.
4. **Không tài nguyên ngoài.** Không CDN, không Google Fonts, không ảnh remote. Prototype phải chạy offline.
5. **Không emoji trong UI.** Dùng SVG inline (xem `shared/shell.js` → `ICONS`).
6. **Shadow chỉ cho lớp phủ** (modal, popover, menu, toast). Cấm shadow ở trạng thái nghỉ của card/nút.
7. **Một ground / một ink / một accent.** Chip trạng thái dùng `--mint` hoặc `.chip.outline`; cấm bảng màu pastel nhiều màu.
8. **Tiếng Việt cho UI.** Giữ tiếng Anh chỉ với thuật ngữ đã có trong brief/stories (`Checklist`, `Planning`) và tên sản phẩm. `occurrence` → **kỳ**. `reminder` → **nhắc nhở**.
9. **Nội dung thật, không placeholder rỗng.** Mock có ngày/giờ/số liệu hợp lý và **tính tương đối từ hôm nay** (`at(-30)`, không `new Date(2026, 9, 30)`) — ngày cứng tự thành quá khứ và đẩy kỳ đã qua vào mục "Sắp tới".
10. **Mỗi màn hình truy vết về brief.** Mỗi trang ghi mã capability `C<n>` nó thể hiện; đã breakdown thì ghi thêm mã story. Màn hình không truy được về capability nào là phạm vi tự đặt — bỏ, hoặc đưa vào gói quyết định.
11. **Không tự publish.** Commit và push `lab-prototype` chỉ sau khi user duyệt qua gói quyết định (bước 7).

## Luồng

### 1. Chốt phạm vi trước khi viết

Ghi 3 dòng, lấy từ brief (và stories nếu có):

- Prototype **này** phủ màn hình/hành vi nào, ứng với capability `C<n>` nào (không phải cả sản phẩm)
- Dữ liệu mock lấy từ đâu (brief, story)
- Cái gì **cố ý không** làm (auth thật, API, persistence, capability DEFERRED/OUT OF SCOPE)

Chỗ brief chưa nói rõ thì chọn phương án hợp lý nhất, ghi là PROPOSED, và đưa vào gói duyệt ở bước 6 — không dừng giữa chừng để hỏi. Chỉ dừng sớm (gói quyết định riêng) khi không thể vẽ màn hình nếu thiếu câu trả lời.

Một prototype một mục đích. Nếu phạm vi quá lớn, **tách thành nhiều file** — mỗi file một màn hình. Ví dụ Workspace: `home.html` (tổng quan) và `planning.html` (nghiệp vụ) là hai trang, không gộp.

### 2. Vẽ khung bằng text trước

Trước khi viết HTML, viết ra 5–15 dòng mô tả: bố cục, thứ tự thông tin, trạng thái nào có, thao tác nào đính ở đâu. Rẻ hơn sửa CSS.

Ở bước này phải trả lời:

- **Sidebar / nav cần không?** Workspace là nơi chứa nhiều mini-app → có. Trang đăng nhập đứng ngoài shell → không.
- **Mỗi thao tác thuộc cấp nào?** Thao tác cấp *sự kiện* (lưu trữ) và cấp *kỳ* (xóa kỳ này) không được trộn vào một menu nếu ngữ nghĩa khác nhau.
- **Menu "..." đính ở đâu?** Trên header của vùng chi tiết, không nhồi vào từng thẻ trong danh sách (nút lồng trong nút = lỗi a11y + bấm nhầm).

### 3. Viết code, đăng ký trang

- Trang có shell: `<link>` tokens + shell, `<main class="main">`, `<script src="../shared/shell.js">`, gọi `Workspace.renderShell({ page, title })`.
- Style riêng của trang đặt trong `<style>` của trang đó, **không** đẩy vào `shell.css`.
- Trạng thái để chụp ảnh: đọc `?state=…` và tự đưa trang vào trạng thái đó (xem `references/critique-loop.md`).
- Escape mọi chuỗi người dùng nhập trước khi vào `innerHTML` (`Workspace.esc`).
- Truy cập bằng bàn phím: focus-visible có sẵn từ tokens; mọi popover/menu đóng được bằng `Escape`.
- **Ngay khi tạo trang hoặc thêm state:** thêm vào `lab-prototype/shots.json`, và thêm dòng vào mục `## <PREFIX> — <tên>` của `lab-prototype/README.md` (cột File, Capabilities, Stories). Mục mới, hoặc mục đã APPROVED mà bị đổi giao diện/hành vi, ghi `**Approval:** PENDING`. Trang thiếu trong manifest thì `shots.mjs` bỏ qua — lint L8 chặn.

### 4. Gate bằng máy (bắt buộc, chặn cứng)

```bash
node .agents/scripts/lint-prototype.mjs
```

FAIL thì **sửa**, không được bỏ qua. Chín luật L1–L9 trong script tương ứng từng lỗi đã thực sự xảy ra; xem đầu file để biết lý do. Cảnh báo "duyệt theo brief cũ" không chặn, nhưng phải nhắc trong gói duyệt.

### 5. Vòng tự phê bằng ảnh — qua sub-agent

```bash
node .agents/scripts/shots.mjs                    # mọi trang × trạng thái × width trong manifest
node .agents/scripts/shots.mjs --only planning --width 390
```

`shots.mjs` tự dựng server trong `lab-prototype/` và FAIL khi trang trả khác 200. FAIL vì môi trường: thiếu trình duyệt thì chạy một lần `npx --yes playwright@1.64.1 install chromium`; thiếu Python hoặc vẫn FAIL thì dừng và đưa lỗi vào gói quyết định, không chụp bằng cách khác.

Sau đó **spawn một sub-agent context sạch** để phê, không tự đọc lại file mình vừa viết. Sub-agent chỉ nhận: 2–3 ảnh ưu tiên + `references/checklist.md` + câu hỏi "cái gì sai". Main agent triage ACCEPT/REJECT/ESCALATE.

**Bắt buộc:** agent `Explore` (read-only), chạy **foreground** và chờ trong cùng lượt, ngân sách ~2 phút giữ bằng prompt (chỉ `Read` ảnh đã cho và checklist, tối đa 5 finding). Kết quả cho thấy nó đã đọc mã nguồn hoặc chạy lệnh thì bỏ vòng đó và tự phê bằng ảnh. Không giao agent full-tool, không giao 6 ảnh. Lý do và bảng ràng buộc ở `references/critique-loop.md` §3.

**Checklist là danh sách mở, không phải khuôn.** Reviewer được ghi `FREE:` (tối đa 3 finding) cho lỗi thật không khớp mã B… nào. Triage `FREE:` như finding thường, nhưng **kiểm bằng dữ liệu** (đo pixel, đọc DOM) trước khi ACCEPT.

Sửa xong chạy lại `shots`. **Sửa `shared/` thì chạy `shots.mjs` không có `--only`** (shell đổi là mọi trang đổi), mở Playwright kiểm render thật (computed style + `textContent`), và liệt kê các mục `## <PREFIX>` đã APPROVED bị ảnh hưởng — các mục đó về `PENDING` và vào gói duyệt. **Trần 3 vòng.** Hết 3 vòng vẫn còn lỗi lớn thì dừng, đưa danh sách lỗi chưa giải vào gói quyết định, không tự lặp tiếp.

### 6. Gói duyệt — điểm dừng bắt buộc

**Không được tự coi là xong.** Đăng một gói quyết định theo `.agents/references/decision-packet.md` (trang HTML riêng tư, gửi liên kết). Đầu trang:

- Câu mở: `prototype <PREFIX>`, brief `<PREFIX>-BRIEF v<n>`.
- `Q1: Duyệt và publish (commit + push lab-prototype) các trang <danh sách>?` — đề xuất: duyệt.
- Mỗi finding ESCALATE và mỗi chỗ PROPOSED ở bước 1 là một câu `Q<n>` có phương án đề xuất.
- Mục APPROVED bị ảnh hưởng vì sửa `shared/` (nếu có) — một câu xác nhận lại.

Phần dưới: ảnh 390 và 1280 của từng trang/trạng thái nhúng trong trang, bảng trang ↔ `C<n>` ↔ story, các finding đã REJECT kèm lý do, cái gì cố ý chưa làm, cảnh báo lint (brief cũ), và cách xem trên máy (`cd lab-prototype && python -m http.server 4173 --bind 127.0.0.1`).

Trong lúc chờ, mục giữ `**Approval:** PENDING`. Không chuyển sang bước sau.

### 7. Sau khi user trả lời

- **Q1 duyệt:** sửa dòng của mục thành `**Approval:** APPROVED <yyyy-mm-dd> — brief <PREFIX>-BRIEF v<n>` (`<n>` = `brief-version` hiện tại, ngày = hôm nay), chạy lại `lint-prototype.mjs`, rồi trong `lab-prototype/`: kiểm `git config user.name` và `user.email` đã đặt local (thiếu thì hỏi user qua gói quyết định, không đoán), commit đúng các file của prototype này với message `[<PREFIX>] <mô tả>`, `git push origin main`. Câu trả lời duyệt Q1 là xác nhận push; không push khi chưa có nó.
- **Q1 không duyệt:** giữ `PENDING`, sửa theo góp ý, quay lại bước 4. Trần 3 vòng tự phê tính lại từ đầu cho mỗi vòng góp ý.
- **Câu ESCALATE/PROPOSED được trả lời** là quyết định UX: ghi `DECIDED <yyyy-mm-dd>` kèm nguyên văn lựa chọn vào `lab-docs/decisions/decision-ledger.md` (dòng nhắc mã `<PREFIX>-BRIEF`), rồi `node .agents/scripts/lab.mjs commit <PREFIX>-BRIEF "ghi quyết định UX prototype"`. Câu không trả lời giữ PROPOSED. Quyết định làm đổi brief thì quay về `grilling`, không tự sửa brief.

## Xem prototype

```bash
cd lab-prototype
python -m http.server 4173 --bind 127.0.0.1
# http://127.0.0.1:4173/workspace/home.html
```

Server phải chạy **trong** `lab-prototype/` (chạy ở gốc workspace thì mọi trang 404). Cần server vì trang dùng `shared/`. Không phải build pipeline — vẫn là HTML/CSS/JS thuần.

MCP Playwright **được phép** dùng để smoke hành vi thật (bấm qua luồng), nhưng **không** dùng để chụp ảnh review — việc đó thuộc `shots.mjs`, tất định và không tốn token.

## Sai thường gặp

| Sai | Đúng |
|---|---|
| Gộp nhiều màn hình vào một file cho "tiện" | Một file một màn hình; shell dùng chung lo phần khung |
| Copy sidebar sang từng trang | `Workspace.renderShell` |
| Tự bấm MCP chụp ảnh rồi tự khen | `shots.mjs` + sub-agent `Explore` phê với context sạch |
| Thêm trang vào `shots.json` sau vòng tự phê | Thêm ngay ở bước 3; trang ngoài manifest không được chụp |
| Mock có ngày cứng | Tính từ `today`; thêm một kỳ "Hôm nay" để phủ trạng thái |
| Màn hình không ghi `C<n>` | Mỗi trang có cột Capabilities trong README |
| Dịch `occurrence` thành "lần xuất hiện" | **kỳ** |
| Hỏi user rải rác trong chat | Một gói quyết định ở bước 6 |
| Báo xong khi chưa ai duyệt | `PENDING` → gói duyệt → `APPROVED <ngày> — brief <PREFIX>-BRIEF v<n>` |

## Đầu ra / bước tiếp theo

- **Đầu ra:** trang trong `lab-prototype/workspace/`, mục trong `lab-prototype/shots.json`, mục `## <PREFIX> — <tên>` trong `lab-prototype/README.md` có dòng `**Approval:** APPROVED <yyyy-mm-dd> — brief <PREFIX>-BRIEF v<n>`; `lint-prototype.mjs` OK; đã commit và push `lab-prototype`.
- **Kết thúc khi:** user duyệt qua gói quyết định.
- **Bước tiếp theo:** chưa có stories → `breakdown <PREFIX>`. Đã có stories → điền cột Stories trong README, rồi đi tiếp ở bước mà `node .agents/scripts/lab.mjs status` cho thấy (thường là `architecture-design` nhánh frontend cho story có màn hình).
