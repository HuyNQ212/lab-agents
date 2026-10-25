---
name: to-html
description: Chuyển nội dung (Markdown, stories, report, spec, breakdown) thành một trang HTML self-contained theo phong cách anthropics/html-effectiveness — palette ivory/clay/olive, serif header, không dependency, mở trực tiếp trong browser. Dùng khi user nói "to-html", "chuyển ra html", "xuất html", "render html", "tạo trang html".
metadata:
  short-description: Nội dung → standalone HTML theo style html-effectiveness
---

# to-html — Chuyển nội dung thành standalone HTML

Phong cách tham chiếu: repo `anthropics/html-effectiveness` (đã clone tại `/tmp/he`). Mọi trang là **một file `.html` duy nhất**, không build, không dependency ngoài (font system), mở trực tiếp trong browser. Palette và typography cố định — xem `references/theme.css`.

## 0. Đọc trước

- `references/theme.css` — token palette, typography, spacing, component classes chuẩn.
- Nội dung nguồn (Markdown, danh sách story, report, spec…) cần chuyển.

## 1. Luật bất biến

1. **Một file `.html` duy nhất**, self-contained. Không CDN, không framework, không build step.
2. **Palette ivory/clay/olive** (xem theme.css) — không dùng dark theme mặc định; light ivory background.
3. **Typography:** header serif (`ui-serif, Georgia`), body sans (`system-ui`), code mono (`ui-monospace`). Letter-spacing âm nhẹ cho heading.
4. **Layout:** `.page` max-width 860px, centered, padding 56px 24px 120px. Mobile-first responsive.
5. **Component chuẩn:** stat-card, table.shipped, highlights, section + hr.rule, details/summary. Tái dùng class names trong theme.css.
6. **Không emoji** trong UI (icon dùng CSS shape hoặc ký tự đơn giản). Tiếng Việt OK.
7. **Accessibility:** semantic tags (header, section, table, details), contrast đủ, focus visible.
8. **Print-friendly:** không animation bắt buộc; nếu có animation thì `prefers-reduced-motion` respect.

## 2. Quy trình

1. Phân tích nội dung nguồn → xác định cấu trúc (header title, subtitle, summary band stats, sections, tables, lists, notes).
2. Map sang components chuẩn (stat-card cho metric, table cho danh sách, highlights cho bullet, details cho phụ lục).
3. Tạo file `.html` tại vị trí user chỉ định (mặc định cạnh file nguồn, tên `<slug>.html`). Nếu user không chỉ định, đặt trong scratchpad và trả link.
4. Chèn toàn bộ CSS từ `references/theme.css` inline vào `<style>`.
5. Verify: mở mental — không horizontal scroll ở 390px, không dependency ngoài.

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
      <table class="shipped">...</table>
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
| Story/card | `.story` (xem breakdown-view) — background white, border, radius panel |
| Badge trạng thái | `.badge` (pill) |

## 5. Bất biến về màu

- Background body: `--ivory: #FAF9F5`
- Text: `--slate: #141413`
- Accent: `--clay: #D97757`
- Success: `--olive: #788C5D`
- Danger: `--rust: #B04A3F`
- Panel: `--white` với border `--gray-300`
- Mono accent cho code/ID: `--mono`

## 6. Output

- Tạo file `.html` và báo đường dẫn clickable cho user.
- Nếu user yêu cầu "render/preview", dùng Artifact tool (publish) sau khi viết file — theo contract artifact-design. Nếu chỉ muốn file local, không publish.
- Không commit git trừ khi user yêu cầu.
