# Shell — hợp đồng dùng chung

> `shared/shell.css` + `shared/shell.js` dựng sidebar, topbar, chuông, menu tài khoản,
> drawer mobile và toast cho **mọi** trang trong Workspace.
> Sửa shell một chỗ là mọi trang đổi theo. Không copy sang trang.

## Ba file

| File | Chứa gì | Ai được sửa |
|---|---|---|
| `shared/tokens.css` | Quiet Evergreen + reset. **Nguồn duy nhất** của palette | Chỉ khi thêm token mới; phải map về bảng gốc trong `frontend.md` §2 |
| `shared/shell.css` | Khung, popover, menu, primitive, modal, mobile | Xu hướng chung của mọi trang — không để style riêng một trang vào đây |
| `shared/shell.js` | `Workspace.renderShell`, popover, chuông, drawer, toast, review states | Giữ API nhỏ; không thêm nghiệp vụ |

## Dùng trong trang

```html
<link rel="stylesheet" href="../shared/tokens.css">
<link rel="stylesheet" href="../shared/shell.css">
...
<main class="main">
  <!-- nội dung trang -->
</main>
<script src="../shared/shell.js"></script>
<script>
  (function () {
    Workspace.renderShell({ page: 'planning', title: 'Planning' });
    // ... logic trang
  })();
</script>
```

`renderShell` làm 5 việc, theo thứ tự:

1. Dựng `.shell` gồm sidebar + backdrop + `.content` chứa topbar
2. **Di chuyển `<main class="main">` của trang vào `.content`** — nên `<main>` phải
   có sẵn trong HTML, không được tạo bằng JS sau đó
3. Đặt `document.title` = `<title> | Workspace`
4. Wiring chuông, menu tài khoản, drawer, `Escape`, click-ra-ngoài
5. Áp `?state=` nếu có (xem `critique-loop.md`)

Nên gọi `renderShell` **sớm** trong IIFE, trước khi bind sự kiện của trang — topbar
cần có trong DOM trước khi trang query nó.

## Danh sách trang

`NAV` trong `shell.js` là nguồn duy nhất của sidebar. Thêm mini-app:

```js
{ id: 'notes', label: 'Ghi chú', href: 'notes.html', group: 'Công cụ', icon: 'calendar' }
```

Icon phải có trong `ICONS` (SVG path). Không thêm nút "Thêm công cụ" — công cụ là
do code, không phải user tự tạo.

## Markup shell sinh ra

Các `id` dưới đây là **hợp đồng ổn định**. Trang và script được phép query chúng.

| `id` / class | Là gì |
|---|---|
| `#sidebar` | Thẻ `<aside>` điều hướng; mobile thêm class `.open` |
| `#backdrop` | Lớp phủ khi mở drawer; `hidden` khi đóng |
| `#menu-btn` | Nút mở drawer; chỉ hiện dưới 900px |
| `.topbar` | Thanh trên, sticky, chứa `h1` + actions |
| `#notif-btn` | Nút chuông, có `aria-expanded` |
| `#notif-dot` | Chấm báo chưa đọc; `hidden` khi không còn |
| `#user-btn` | Avatar mở menu tài khoản |
| `.anchor` | Wrapper `position: relative` để neo `.popover` / `.menu` |
| `.main` | `<main>` của trang; padding do shell quy định |

**Cuộn:** sidebar cao đúng viewport và tự cuộn bên trong (`position: sticky`), nên khối
user/đăng xuất luôn nằm trong màn hình; chỉ `.main` cuộn theo trang. Trang **không** được
đặt `position: fixed` hay `height: 100vh` lên `.sidebar`, và không tự dựng lại cột trái.

**Chân sidebar:** một hàng duy nhất gồm thông tin user co giãn và nút đăng xuất **chỉ icon**
(`aria-label="Đăng xuất"`, `title="Đăng xuất"`). Không xếp đăng xuất thành dòng thứ hai —
chân sidebar chiếm thêm chiều cao mà không thêm thông tin.

**Cache:** `python -m http.server` gửi `Last-Modified` và trình duyệt sẽ dùng bản cache, nên
sửa `shared/*.js|css` **không** tự hiện ở tab đang mở. Sau khi sửa shell, hard-refresh
(Ctrl+F5) trước khi kết luận; báo user hard-refresh nếu họ đang mở tab từ trước. Trạng thái
lai (markup mới + CSS cũ hoặc ngược lại) là lỗi thật — `shots.mjs` không thấy vì luôn mở
context sạch.

## API `Workspace`

| API | Dùng để |
|---|---|
| `renderShell({ page, title })` | Dựng khung. Gọi đúng một lần |
| `toast(msg)` | Phản hồi ngắn 2.4s, tự xóa |
| `esc(str)` | Escape HTML trước khi vào `innerHTML`. **Bắt buộc** với chuỗi người dùng nhập |
| `svg(name, size, stroke)` | SVG inline từ `ICONS`. Thay emoji |
| `isMobile()` | Đang ở ≤900px hay không |
| `notifications` | Mảng mock của shell — shell tự quản read/unread |

## Primitive có sẵn trong `shell.css`

`.btn` (`.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-ghost`), `.card`,
`.chip` (+ `.chip.outline`), `.section-label`, `.muted-note`, `.empty`, `.toast`,
`.modal-backdrop` + `.modal` + `.field` + `.modal-actions`, `.icon-btn`, `.avatar`.

Trang nghiệp vụ dùng lại những class này. Cần primitive mới mà **≥2 trang** sẽ
dùng → thêm vào `shell.css`. Chỉ một trang dùng → để trong `<style>` của trang.

## Quy ước

- Popover/menu luôn là con của `.anchor` và đóng bằng `Escape` + click ngoài.
- Dưới 900px, `.popover` chuyển sang bám viewport (`position: fixed`) để không bị cắt.
- Modal dùng `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- Shadow chỉ có ở overlay (modal, popover, menu, toast). Card/nút ở trạng thái nghỉ
  **không** shadow — `lint-prototype.mjs` không bắt được cái này, review bằng mắt.
- Mock của shell là **thông báo** (dùng chung mọi trang). Mock **nghiệp vụ** thuộc
  trang, không đẩy vào shell.
