---
name: to-html
description: "Chuyển nội dung (Markdown, stories, report, spec, breakdown) thành một trang HTML self-contained theo phong cách anthropics/html-effectiveness — palette ivory/clay/olive, serif header, không dependency, mở trực tiếp trong browser. Dùng khi user nói \"to-html\", \"chuyển ra html\", \"xuất html\", \"render html\", \"tạo trang html\"."
metadata:
  short-description: "Nội dung → standalone HTML theo style html-effectiveness"
---

# to-html — Chuyển nội dung thành standalone HTML

Đọc trước: `.agents/AGENTS.md`, hợp đồng bàn giao ở `.agents/skills/README.md`.

Phong cách tham chiếu: repo `anthropics/html-effectiveness` — chỉ để tham khảo, không bắt buộc có bản clone; mọi thứ cần dùng đã nằm trong `references/theme.css`. Mọi trang là **một file `.html` duy nhất**, không build, không dependency ngoài (font system), mở trực tiếp trong browser. Palette và typography cố định — xem `references/theme.css`.

## 0. Đọc trước

- `references/theme.css` — token palette, typography, spacing, component classes chuẩn.
- Nội dung nguồn (Markdown, danh sách story, report, spec…) cần chuyển.

## 1. Luật bất biến

1. **Một file `.html` duy nhất**, self-contained. Không CDN, không framework, không build step.
2. **Palette ivory/clay/olive** (xem theme.css) — mặc định nền ivory sáng. Biến thể dark chỉ đổi token (`prefers-color-scheme` và `data-theme`, đã có trong theme.css), không thêm class riêng cho dark.
3. **Typography:** header serif (`ui-serif, Georgia`), body sans (`system-ui`), code mono (`ui-monospace`). Letter-spacing âm nhẹ cho heading.
4. **Layout:** `.page` max-width 860px, centered; gutter 16px ở màn hình hẹp (theme.css lo). Bảng luôn bọc trong `.table-wrap` để không cuộn ngang cả trang ở 390px.
5. **Component chuẩn:** stat-card, table.shipped, highlights, story, badge, section + hr.rule, details/summary. Chỉ dùng class có trong theme.css; cần class mới thì thêm vào theme.css trước.
6. **Không emoji** trong UI (icon dùng CSS shape hoặc ký tự đơn giản). Tiếng Việt OK.
7. **Accessibility:** semantic tags (header, section, table, details), contrast đủ, `:focus-visible` (đã có trong theme.css).
8. **Print-friendly:** không animation bắt buộc; theme.css tắt animation khi `prefers-reduced-motion: reduce`.

## 2. Quy trình

1. Phân tích nội dung nguồn → xác định cấu trúc (header title, subtitle, summary band stats, sections, tables, lists, notes).
2. Map sang components chuẩn (stat-card cho metric, table cho danh sách, highlights cho bullet, details cho phụ lục).
3. Ghi file `<slug>.html` vào scratchpad của phiên. Chỉ ghi cạnh file nguồn hoặc chỗ khác khi user chỉ định.
4. Chèn toàn bộ CSS từ `references/theme.css` inline vào `<style>`.
5. Kiểm bằng lệnh, không kiểm bằng mắt:
   - `grep -nE '<script[^>]+src=|<link[^>]+href=|@import' <file>` ra rỗng (không dependency ngoài);
   - mọi `class="..."` trong file có selector tương ứng trong theme.css (grep từng class);
   - mọi `<table` nằm trong `.table-wrap`;
   - khi đã publish: mở trang ở viewport 390px (Browser pane, preset mobile), `document.documentElement.scrollWidth <= innerWidth`.

## 3. Cấu trúc trang mẫu

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>...</title>
  <style>/* theme.css inline */</style>
</head>
<body>
  <div class="page">
    <header>
      <div class="header-top">
        <h1>Title</h1>
        <span class="auto-pill">Label</span>
      </div>
      <p class="date-range">...</p>
    </header>

    <section>
      <h2>Section</h2>
      <hr class="rule">
      <div class="summary-band">...</div>
    </section>

    <section>
      <h2>...</h2>
      <hr class="rule">
      <div class="table-wrap"><table class="shipped">...</table></div>
    </section>

    <details>
      <summary>Phụ lục</summary>
      ...
    </details>
  </div>
</body>
</html>
```

## 4. Mapping nội dung → component

| Nội dung | Component |
|---|---|
| Tiêu đề trang | `<h1>` trong header |
| Subtitle / metadata | `.date-range` |
| Metric/KPI | `.stat-card` trong `.summary-band` |
| Danh sách có cột | `table.shipped` |
| Bullet insight | `.highlights` |
| Nhóm collapsible | `<details><summary>` |
| Story/card | `.story` > `.story-head` (`.story-id`, `.story-title`, `.badge`) + `ul` cho AC |
| Badge trạng thái | `.badge`, thêm `.ok` / `.warn` / `.danger` theo trạng thái |

## 5. Bất biến về màu

- Background body: `--ivory: #FAF9F5`
- Text: `--slate: #141413`
- Accent: `--clay: #D97757`
- Success: `--olive: #788C5D`
- Danger: `--rust: #B04A3F`
- Panel: `--white` với border `--gray-300`
- Mono accent cho code/ID: `--mono`

## 6. Output

- **Mặc định publish thành Artifact riêng tư** và gửi liên kết — phiên có thể chạy từ xa, user không mở được file local. Trước khi publish nạp skill `artifact-design` theo hợp đồng của công cụ Artifact. Cập nhật trang đã có thì publish lại cùng đường dẫn file để giữ URL.
- Chỉ giữ file local, không publish, khi user xin file.
- Không commit git trừ khi user yêu cầu.

## Đầu ra / bước tiếp theo

- **Đầu ra:** một trang HTML self-contained, đã publish thành Artifact (liên kết) hoặc file local khi user xin file; tài liệu nguồn không đổi.
- **Bước tiếp theo:** không có — tiện ích trình bày ngoài chuỗi chính, không tạo quyết định. Trang dùng làm gói quyết định thì nội dung theo `.agents/references/decision-packet.md`.
