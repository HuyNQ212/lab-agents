---
name: prototype
description: Tạo Interactive UX Prototype HTML/CSS/JS thuần trong lab-prototype trước khi breakdown/spec, để user duyệt giao diện và hành vi. Có vòng tự phê bằng ảnh chụp qua sub-agent (trần 3 vòng) và gate user duyệt. Dùng khi user nói "làm prototype", "dựng màn hình", "prototype cho Planning", "thử giao diện". Không dùng để code production React, không dùng để viết spec.
metadata:
  short-description: Prototype HTML-first → tự phê bằng ảnh → user duyệt
---

# prototype — Dựng prototype, tự phê bằng ảnh, chờ user duyệt

Prototype là **hợp đồng tham khảo UX**, không phải production code. Giá trị của nó nằm ở chỗ user nhìn thấy và quyết định — không phải ở chỗ agent viết xong.

## Đọc trước

- `lab-docs/architecture/frontend.md` §2 (Quiet Evergreen, Direct-first), §4 (prototype workflow), §6 (hàng rào chất lượng)
- `lab-prototype/README.md` — trạng thái publish, quy tắc repo
- `lab-prototype/shots.json` — manifest ảnh
- `.agents/skills/prototype/references/checklist.md` — luật UI (đọc TRƯỚC khi viết dòng CSS đầu tiên)
- `.agents/skills/prototype/references/shell.md` — hợp đồng shell nếu trang nằm trong Workspace
- `.agents/skills/prototype/references/critique-loop.md` — vòng tự phê

## Vị trí trong chuỗi

```text
grilling → [prototype] → breakdown → architecture-design → to-spec → spec-review → implement → ship
```

Prototype là **tùy chọn** và đứng trước breakdown: khi hành vi UI đã duyệt thì `delivery-breakdown` được phép tham chiếu prototype thay vì tự đoán giao diện.

**Prototype không thay spec.** Nó không chứa API contract, không chứa schema, không chứa state management production. Chuyển sang React là việc của `implement`, và **không copy as-is** (`engineering-workflow.md` §5.2).

## Luật cứng

1. **HTML/CSS/JS thuần.** Không React, không Vite, không package.json, không build, không deploy. Trong `lab-prototype` **không** cài dependency nào.
2. **Không màu ngoài `shared/tokens.css`.** Trang chỉ dùng `var(--…)`. Cần token mới thì thêm vào `tokens.css`, không viết hex trong trang.
3. **Trang trong Workspace dùng shell chung.** `shared/tokens.css` + `shared/shell.css` + `Workspace.renderShell({page, title})`. Không copy sidebar/topbar/chuông sang trang.
4. **Không tài nguyên ngoài.** Không CDN, không Google Fonts, không ảnh remote. Prototype phải chạy offline.
5. **Không emoji trong UI.** Dùng SVG inline (xem `shared/shell.js` → `ICONS`).
6. **Shadow chỉ cho lớp phủ** (modal, popover, menu, toast). Cấm shadow ở trạng thái nghỉ của card/nút.
7. **Một ground / một ink / một accent.** Chip trạng thái dùng `--mint` hoặc `.chip.outline`; cấm bảng màu pastel nhiều màu.
8. **Tiếng Việt cho UI.** Giữ tiếng Anh chỉ với thuật ngữ đã có trong brief/stories (`Checklist`, `Planning`) và tên sản phẩm. `occurrence` → **kỳ**. `reminder` → **nhắc nhở**.
9. **Nội dung thật, không placeholder rỗng.** Mock phải có ngày/giờ/số liệu hợp lý và **nhất quán với hôm nay** — cấm để kỳ trong quá khứ nằm trong mục "Sắp tới".
10. **Không tự publish.** Chỉ ghi file; publish và commit là bước sau khi user duyệt.

## Luồng

### 1. Chốt phạm vi trước khi viết

Nêu rõ 3 dòng, chờ user xác nhận nếu có gì mơ hồ:

- Prototype **này** phủ màn hình/hành vi nào (không phải cả sản phẩm)
- Dữ liệu mock lấy từ đâu (brief? story? user?)
- Cái gì **cố ý không** làm (auth thật, API, persistence)

Một prototype một mục đích. Nếu phạm vi quá lớn, **tách thành nhiều file** — mỗi file một màn hình. Ví dụ Workspace: `home.html` (tổng quan) và `planning.html` (nghiệp vụ) là hai prototype, không gộp.

### 2. Vẽ khung bằng text trước

Trước khi viết HTML, viết ra 5–15 dòng mô tả: bố cục, thứ tự thông tin, trạng thái nào có, thao tác nào đính ở đâu. Rẻ hơn sửa CSS.

Ở bước này phải trả lời:

- **Sidebar / nav cần không?** Workspace là nơi chứa nhiều mini-app → có. Trang đăng nhập đứng ngoài shell → không.
- **Mỗi thao tác thuộc cấp nào?** Thao tác cấp *sự kiện* (lưu trữ) và cấp *kỳ* (xóa kỳ này) không được trộn vào một menu nếu ngữ nghĩa khác nhau.
- **Menu "..." đính ở đâu?** Trên header của vùng chi tiết, không nhồi vào từng thẻ trong danh sách (nút lồng trong nút = lỗi a11y + bấm nhầm).

### 3. Viết code

- Trang có shell: `<link>` tokens + shell, `<main class="main">`, `<script src="../shared/shell.js">`, gọi `Workspace.renderShell({ page, title })`.
- Style riêng của trang đặt trong `<style>` của trang đó, **không** đẩy vào `shell.css`.
- Trạng thái để chụp ảnh: đọc `?state=…` và tự đưa trang vào trạng thái đó (xem `references/critique-loop.md`).
- Escape mọi chuỗi người dùng nhập trước khi vào `innerHTML` (`Workspace.esc`).
- Truy cập bằng bàn phím: focus-visible có sẵn từ tokens; mọi popover/menu đóng được bằng `Escape`.

### 4. Gate bằng máy (bắt buộc, chặn cứng)

```bash
node .agents/scripts/lint-prototype.mjs
```

FAIL thì **sửa**, không được bỏ qua. Bảy luật L1–L7 trong script tương ứng từng lỗi đã thực sự xảy ra trong repo này; xem đầu file để biết lý do.

### 5. Vòng tự phê bằng ảnh — qua sub-agent

```bash
node .agents/scripts/shots.mjs                    # ảnh desktop + mobile, mọi trạng thái
node .agents/scripts/shots.mjs --only planning --width 390
```

Sau đó **spawn một sub-agent context sạch** để phê, không tự đọc lại file mình vừa viết. Sub-agent chỉ nhận: 2–3 ảnh ưu tiên + `references/checklist.md` + câu hỏi "cái gì sai". Main agent triage ACCEPT/REJECT.

**Bắt buộc:** agent `Explore`/`Ask` (read-only), chạy **foreground** và chờ trong cùng lượt, ngân sách ~2 phút — quá thì `TaskStop` và tự phê. Không giao agent full-tool, không giao 6 ảnh, không bàn giao "đang chờ" cho user. Lý do và bảng ràng buộc ở `references/critique-loop.md` §3.

**Checklist là danh sách mở, không phải khuôn.** Reviewer được ghi `FREE:` (tối đa 3 finding) cho lỗi thật không khớp mã B… nào — UI/UX không ép hết vào taxonomy sinh từ lỗi cũ. Triage `FREE:` như finding thường, nhưng **kiểm bằng dữ liệu** (đo pixel, đọc DOM) trước khi ACCEPT.

Sửa xong chạy lại `shots`. **Sửa `shared/` thì mở Playwright kiểm render thật** (computed style + `textContent`), vì `shots.mjs` dùng context sạch còn tab của user thì cache — trạng thái lai chỉ hiện ở phía user. **Trần 3 vòng.** Hết 3 vòng vẫn còn lỗi lớn thì dừng và báo user, không tự lặp tiếp.

### 6. Cập nhật manifest + bàn giao

- Thêm trang/trạng thái mới vào `lab-prototype/shots.json`.
- Cập nhật `lab-prototype/README.md` (danh sách prototype, cách xem, mock hỗ trợ gì).
- Báo user: đường dẫn xem, lệnh chạy server, ảnh ở đâu, cái gì cố ý chưa làm.

### 7. Gate user duyệt — điểm dừng bắt buộc

**Không được tự coi là xong.** Prototype chỉ chuyển sang PUBLISHED khi user nói duyệt. Trước đó nó là DRAFT.

Khi user duyệt: commit vào `lab-prototype` (`main`), cập nhật README, và nếu có quyết định UX mới thì thêm dòng vào `lab-docs/decisions/decision-ledger.md`.

## Xem prototype

```bash
python -m http.server 4173 --bind 127.0.0.1
# http://127.0.0.1:4173/workspace/home.html
```

Server cần thiết vì trang dùng `shared/`. Không phải build pipeline — vẫn là HTML/CSS/JS thuần mở bằng trình duyệt.

MCP Playwright **được phép** dùng để smoke hành vi thật (bấm qua luồng), nhưng **không** dùng để chụp ảnh review — việc đó thuộc `shots.mjs`, tất định và không tốn token.

## Sai thường gặp

| Sai | Đúng |
|---|---|
| Gộp nhiều màn hình vào một file cho "tiện" | Một file một màn hình; shell dùng chung lo phần khung |
| Copy sidebar sang từng trang | `Workspace.renderShell` |
| Tự bấm MCP chụp ảnh rồi tự khen | `shots.mjs` + sub-agent phê với context sạch |
| Mock có ngày trong quá khứ | Mock nhất quán với hôm nay; thêm một kỳ "Hôm nay" để phủ trạng thái |
| Dịch `occurrence` thành "lần xuất hiện" | **kỳ** |
| Báo xong khi chưa ai duyệt | DRAFT → chờ user → PUBLISHED |
