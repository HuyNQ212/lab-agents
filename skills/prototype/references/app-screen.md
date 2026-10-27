# Nhánh app screen — dashboard, danh sách, form

> Prototype Lab gần như luôn là **app screen** (dashboard, inbox, settings, danh sách
> chi tiết), không phải landing/marketing page. Luật của hai loại khác nhau, và
> copy luật page sang app là cách nhanh nhất để làm hỏng một dashboard.

## Page và app screen khác nhau ở đâu

| | Page (landing, portfolio) | App screen (nhánh này) |
|---|---|---|
| Mục tiêu | Thuyết phục trong 10 giây | Làm việc lặp lại hằng ngày |
| Hình ảnh | Cần ảnh chủ đạo, tối thiểu vài ảnh | Thường **không cần ảnh**; dữ liệu là hình ảnh |
| Scroll | Dài, kể chuyện | Ngắn; thao tác chính phải thấy không cần scroll |
| Section gap | 120–240px | 16–32px |
| Chuyển động | Có đất để diễn | Chỉ phản hồi thao tác, ≤240ms |
| Nội dung | Copy viết | Dữ liệu thật/mock có cấu trúc |
| Thành công | Ấn tượng | Xong việc nhanh, ít bấm |

**Không áp dụng cho app screen:** yêu cầu "một ảnh chủ đạo", "sàn 4 ảnh", "section
gap lớn", "hero", "motion layer". Những luật đó đúng cho page, vô nghĩa với dashboard.

## Ba dạng app screen và luật riêng

### 1. Danh sách + chi tiết (master–detail)

Đây là dạng của `planning.html`.

| Luật | Vì sao |
|---|---|
| Danh sách hẹp (~340px), chi tiết rộng — hoặc danh sách trên, chi tiết dưới ở mobile | Mắt đọc danh sách theo chiều dọc, chi tiết cần bề ngang |
| Sort theo thứ tự người dùng cần, và **nói rõ thứ tự đó** | Danh sách "sắp tới" phải là kỳ gần nhất trước |
| Mỗi item phải trả lời được 2 câu: *cái gì* và *còn bao lâu / bao nhiêu* | Không có con số thì user phải mở từng item |
| Item đang chọn phải thấy được (viền + thanh bên, không chỉ đổi nền nhạt) | Đổi nền rất nhạt không đủ tương phản |
| Mobile: danh sách và chi tiết là hai màn, có nút quay lại | Không nhồi cả hai vào 390px |
| Thao tác cấp item nằm ở header chi tiết, không trên từng row | Nút lồng trong button |

### 2. Dashboard tổng quan

Đây là dạng của `home.html`.

| Luật | Vì sao |
|---|---|
| Trả lời "tôi vào đây để làm gì" trong 1 câu đầu | Home chỉ có lời chào là ngõ cụt |
| Có ít nhất một đường vào công cụ thật | Không có nav/link thì không dùng được |
| Không nhồi số liệu không có nguồn | Mock số liệu trông như thật dễ bị hiểu là thật |
| Giữ được sự thật khi thêm mini-app thứ 2, 3 | Lưới card tự giãn, không hardcode 1 card |

### 3. Form / modal

| Luật | Vì sao |
|---|---|
| Modal cho ≤4 field; nhiều hơn thì dùng trang riêng | Modal dài phải scroll trong hộp — khó chịu |
| Label ở trên field, không placeholder làm label | Placeholder biến mất khi gõ |
| Nút chính bên phải, hủy bên trái | Quy ước quen thuộc |
| Lỗi hiện gần field gây lỗi, không chỉ toast | Toast biến mất trước khi user kịp sửa |
| Trạng thái phá hủy dùng `.btn-danger` và phải qua bước xác nhận | Xóa/lưu trữ không hoàn tác được |
| Disabled phải kèm lý do nhìn thấy được | "Không sửa được" mà không nói vì sao là bế tắc |

## Điều đặc biệt của Workspace

Workspace là **portal chứa nhiều mini-app**, không phải một app.

- **Luôn có sidebar.** Mỗi tool mới là một mục trong `NAV` của `shared/shell.js`. Không
  có sidebar thì tool thứ hai không có đường vào.
- **Topbar dùng chung:** chuông + avatar. Không mỗi trang một kiểu.
- **Chuông là của shell, không của trang:** notification là capability xuyên app
  (shared Notification Service), nên nó không thuộc Planning.
- **Trang đăng nhập đứng ngoài shell.** Nó không có nav, không có chuông — cố ý.
- **Một trang một mini-app.** `home.html` là tổng quan Workspace; `planning.html` là
  Planning. Gộp chúng lại làm mất khả năng thay từng mini-app độc lập.

## Khi nào tách prototype

Tách khi:

- Phạm vi vượt quá ~1 màn hình + 1 modal
- Hai phần có vòng đời khác nhau (home sẽ đổi khi thêm tool; planning đổi theo nghiệp vụ)
- Một phần là khung (shell), phần kia là nội dung

Không tách khi:

- Chỉ để né việc file dài
- Hai màn hình luôn luôn đi cùng nhau và không có ý nghĩa riêng (ví dụ: danh sách và
  chi tiết của **cùng** một nghiệp vụ → một file, hai pane)

`planning.html` là ví dụ của "một file hai pane": danh sách và chi tiết chia sẻ cùng
state, cùng mock, cùng thao tác. Tách ra sẽ phải đồng bộ state qua URL — thêm phức
tạp mà không thêm giá trị review.
