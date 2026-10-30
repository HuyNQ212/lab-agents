# Checklist UI — prototype

> Đọc **trước** khi viết dòng CSS đầu tiên, và dùng lại ở bước tự phê.
> Checklist này **viết lại cho Quiet Evergreen**, không chép từ skill bên ngoài.
> Nguồn quyết định: `lab-docs/architecture/frontend.md` §2. Luật máy kiểm được ở
> `.agents/scripts/lint-prototype.mjs` (L1–L9) — mục nào ghi **[máy]** là script chặn.

## Cách dùng

Chia hai nhóm. Nhóm **[máy]** không cần agent phán đoán — chạy `lint-prototype.mjs`.
Nhóm **[mắt]** chỉ kiểm được bằng ảnh, và phải do sub-agent context sạch phê.

**Checklist này KHÔNG phải danh sách đóng.** Nó sinh ra từ lỗi đã xảy ra, nên chỉ bắt được
loại lỗi đã từng gặp — lỗi mới luôn lọt. Vì vậy reviewer **được phép** (và phải) báo lỗi
không khớp mã nào: ghi `FREE:` thay cho mã B…, mô tả cái nhìn thấy và vì sao nó xấu. Tối đa
3 finding `FREE:` mỗi vòng; chúng xếp **ngang hàng** với finding có mã, không phải phụ lục.
Lý do: gò mọi quan sát vào khuôn mã khiến reviewer bỏ qua lỗi thật (chữ tràn trong nút 36px
đã lọt đúng như vậy) hoặc bịa finding cho khớp mã.

## A. Máy kiểm được

| # | Luật | Vì sao |
|---|---|---|
| A1 | Không emoji trong nội dung UI **[máy L1]** | Emoji render khác nhau theo OS; 🔔 từng được dùng làm nút thông báo và trông như mẫu AI |
| A2 | Không `gradient()` **[máy L2]** | Quiet Evergreen là palette phẳng; gradient là dấu hiệu "dashboard AI" |
| A3 | Màu chỉ từ `shared/tokens.css` — hex, `rgb()`/`hsl()`, tên màu; trong `<style>`, `style=""`, file `.css`/`.js` và chuỗi gán vào `.style` **[máy L3]** | 5 badge pastel từng phá palette vì mỗi loại event một màu |
| A4 | Không tài nguyên ngoài (CDN, font, ảnh remote, kể cả `//host/…`) **[máy L4]** | Prototype phải mở offline được; cũng là điều kiện để `file://` từng hoạt động |
| A5 | Link/script nội bộ resolve được, đúng hoa/thường **[máy L5]** | Đổi tên file làm chết nav mà không ai thấy |
| A6 | `[hidden]` thắng `display` **[máy L6]** | Pane ẩn bị `.list-pane { display: grid }` đè, hiện ra dù đã `hidden` |
| A7 | Trang có shell đúng hợp đồng **[máy L7]** | `renderShell` cần `<main class="main">`, tokens, và lời gọi |
| A8 | `shared/shell.css` và `shared/shell.js` chỉ dùng token **[máy L3]** | Shell cũng phải tuân palette; hex được miễn chỉ khi khai trong `SHELL_HEX_ALLOW` của script (hiện rỗng) |
| A9 | Mọi `workspace/*.html` có trong `shots.json` và README; dòng `**Approval:**` đúng dạng **[máy L8]** | Trang ngoài manifest bị `shots.mjs` bỏ qua im lặng, không ai review |
| A10 | Mock không dùng ngày tuyệt đối (`new Date(2026, …)`) — tính từ `today` **[máy L9]** | Ngày cứng tự thành quá khứ, trang đã duyệt vi phạm B6/B18 theo thời gian |

## B. Mắt / ảnh kiểm được

### Bố cục

| # | Luật | Vì sao |
|---|---|---|
| B1 | Có sidebar khi app chứa nhiều mini-app | Workspace sẽ có nhiều công cụ; không có nav thì mỗi tool là ngõ cụt |
| B2 | Direct-first: thông tin và thao tác chính hiện ngay, không giấu sau nested tab | `frontend.md` §2 |
| B3 | Thao tác có ngữ nghĩa khác nhau không nằm chung một menu | "Lưu trữ sự kiện" (cấp event) ≠ "Xóa kỳ này" (cấp kỳ) |
| B4 | Menu "..." đặt ở header vùng chi tiết, không nhồi vào thẻ danh sách | Nút lồng trong nút = lỗi a11y + bấm nhầm |
| B5 | Thứ tự danh sách là **kỳ gần nhất trước** | Người dùng mở app để biết sắp tới cái gì |
| B6 | Không có mục "Sắp tới" chứa ngày đã qua | Lỗi đã thật sự xảy ra: thẻ ghi "đã qua 36 ngày" nằm trong "SẮP TỚI" |
| B28 | Không có chữ tràn, bị cắt, hay xuống dòng bên trong control (nút, chip, nav-item, menu) ở cả 1280 và 390 | Lỗi đã thật sự xảy ra: nhãn "Đăng xuất" bị nhồi vào `.nav-item` ép 36×36 → chữ vỡ thành hai dòng, trông như control hỏng |
| B29 | Icon-only button phải là **chỉ icon** — không còn text node nào bên trong | Sửa CSS mà quên sửa markup sinh ra đúng trạng thái lai: hộp nhỏ + chữ cũ |
| B30 | Hit target ≥ 36×36 (mobile ≥ 44×44); hover đổi màu nền, không đổi kích thước hay bố cục | Nút nhỏ hơn ngón tay = bấm sai; hover làm nhảy layout = cảm giác rung |

### Chữ

| # | Luật | Vì sao |
|---|---|---|
| B7 | Một họ chữ; 3–4 cỡ chữ cho cả trang | Nhiều cỡ = không có thứ bậc |
| B8 | Tiêu đề không quá 2 dòng ở width 390 | Quá 2 dòng là tiêu đề đang gánh nội dung |
| B9 | Không dùng `eyebrow` (label in hoa nhỏ trên tiêu đề) trừ khi thật cần phân nhóm | Trang đăng nhập có một cái là đủ; rải khắp nơi là trang trí |
| B10 | UI tiếng Việt; tiếng Anh chỉ cho thuật ngữ đã có trong brief | `occurrence` → **kỳ**, `reminder` → **nhắc nhở**. Giữ `Checklist`, `Planning` |
| B11 | Không có chữ tiếng Anh không phổ thông trong UI | "Biweekly" → "Mỗi 14 ngày" |

### Màu và bề mặt

| # | Luật | Vì sao |
|---|---|---|
| B12 | Một ground, một ink, một accent | Chip trạng thái: `--mint` hoặc `.chip.outline`, không 5 màu |
| B13 | Shadow chỉ cho lớp phủ (modal, popover, menu, toast) | Shadow ở card nghỉ làm trang "nổi" giả tạo; overlay thì cần để tách khỏi nền |
| B14 | Không `glass` / blur nền / viền phát sáng | Không thuộc Quiet Evergreen |
| B15 | Viền card dùng `--line`; viền control dùng `--border` | Hai độ đậm khác nhau có mục đích: card nhẹ, control phải thấy được |
| B16 | Trạng thái hover đổi màu, không nhảy vị trí | `translateY` ở hover làm layout rung |

### Nội dung

| # | Luật | Vì sao |
|---|---|---|
| B17 | Mock có nội dung thật, đủ để thấy mật độ thực | Trang rỗng luôn "đẹp"; nội dung thật mới lộ lỗi |
| B18 | Mock nhất quán với hôm nay và với nhau | Ngày trong quá khứ ở mục sắp tới; số đếm không khớp danh sách |
| B19 | Có trạng thái empty, không chỉ trạng thái có dữ liệu | User cần thấy lúc chưa có gì |
| B20 | Không bịa số liệu trông như thật mà không nói là mock | Prototype review dễ bị hiểu là số thật |

### Tương tác

| # | Luật | Vì sao |
|---|---|---|
| B21 | Mọi popover/menu đóng được bằng `Escape` và click ra ngoài | Không đóng được = user mắc kẹt |
| B22 | Popover bám viewport ở width 390, không neo vào icon | Lỗi đã thật sự xảy ra: popover thông báo bị cắt cụt |
| B23 | Trạng thái phá hủy phải qua xác nhận | Xóa kỳ, lưu trữ sự kiện |
| B24 | Thao tác bị chặn phải nói **vì sao**, không chỉ disable | "Kỳ hôm nay không sửa/xóa được" kèm lý do |
| B25 | Mỗi thao tác có phản hồi ngay (toast hoặc đổi trạng thái) | Bấm mà không thấy gì = bấm lại |

### Ảnh chụp

| # | Luật | Vì sao |
|---|---|---|
| B26 | Mọi trạng thái khai trong `shots.json` phải có ảnh ở cả 1280 và 390 | Trạng thái không có ảnh là trạng thái không ai review |
| B27 | Ảnh sinh bằng `shots.mjs`, không bằng MCP | Tất định, không bỏ sót, không tốn token |

## Chống slop — câu hỏi chốt

Trước khi báo xong, trả lời ba câu:

1. **Competitor test** — một dashboard AI generic có trông như thế này không? Nếu có, chỗ nào giống nhất và có cần giống không?
2. **Substance test** — nếu bỏ hết chip, badge, đường kẻ, còn lại gì? Nếu còn lại rỗng, trang đang sống bằng trang trí.
3. **Một thứ sống** — có ít nhất một chỗ tương tác thật (tick được, thêm được, mở được) không? Prototype chỉ đọc là ảnh tĩnh đắt tiền.
