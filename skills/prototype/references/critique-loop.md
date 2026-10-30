# Critique loop — tự phê bằng ảnh

> Cơ chế để prototype tự phát hiện lỗi **trước khi** user nhìn.
> Nguyên tắc gốc: **người phê không phải người viết.** Tác giả tự đọc lại file mình
> vừa viết sẽ bỏ qua đúng những chỗ mình vừa quyết định — đây là điểm yếu của
> các skill "self-review" chạy in-context.

## Vì sao phải qua sub-agent

Main agent vừa viết CSS xong nhìn ảnh sẽ thấy "đúng như mình định làm". Nó không
còn khả năng hỏi "cái này có xấu không". Sub-agent có context sạch chỉ thấy:

- ảnh chụp
- `references/checklist.md`
- câu hỏi

Nó không biết bạn vừa cân nhắc gì, nên nó phê được.

Đây là cùng cơ chế `engineering-workflow.md` §6 dùng cho code review (sub-agent review
→ main agent triage ACCEPT/REJECT). Không phát minh thêm quy trình.

## Luồng một vòng

### 1. Chụp

```bash
node .agents/scripts/lint-prototype.mjs        # chặn cứng, phải pass trước
node .agents/scripts/shots.mjs                 # mọi trang × trạng thái × width trong shots.json
```

Nếu vừa sửa một trang (không chạm `shared/`):

```bash
node .agents/scripts/shots.mjs --only planning --width 390
```

### 2. Chọn ảnh để phê

Không phê cả bộ ảnh mỗi vòng — tốn và loãng. Chọn theo thứ tự ưu tiên:

1. Trang **mới nhất / vừa sửa**
2. Width **390** trước (lỗi bố cục lộ rõ nhất ở hẹp)
3. Trạng thái **empty** và **error** (dễ bị bỏ quên nhất)
4. Width 1280 sau

### 3. Prompt cho sub-agent

**Hợp đồng spawn — không thương lượng.** Review ảnh là việc bounded; mọi thứ dưới đây
đều là ràng buộc cứng, không phải gợi ý:

| Ràng buộc | Giá trị | Vì sao |
|---|---|---|
| Loại agent | `Explore` (read-only) | Agent full-tool sẽ đi grep/đọc source/chạy script — đúng thứ bị cấm, và là lý do một việc 30 giây phình thành 13 phút |
| Số ảnh | **2–3**, chọn theo bước 2 | Ảnh full-res là token đắt nhất; 6 ảnh làm loãng phán đoán |
| Chạy | **Foreground**, chờ trong cùng lượt | Không bàn giao "đang chờ" cho user; agent nền kẹt thì không ai biết |
| Ngân sách | **~2 phút**, giữ bằng prompt: chỉ `Read` đúng các ảnh đã cho và checklist, tối đa 5 finding | Agent foreground chặn main agent tới lúc trả về, nên không đo giờ hay dừng giữa chừng được; giới hạn phải nằm trong prompt |
| Kết quả lạc phạm vi | Kết quả cho thấy sub-agent đã đọc HTML/CSS/JS hoặc chạy lệnh → bỏ cả vòng đó, tự phê bằng ảnh | Finding dựa trên code là phê code, không phải phê giao diện |

Không dùng agent khác `Explore`. Phiên không có `Explore` thì tự phê bằng ảnh và ghi rõ trong gói bàn giao rằng vòng đó không có sub-agent.

Giao đúng ngần này, không giao thêm:

```text
Bạn review một UX prototype HTML (không phải production code).

Ảnh: <liệt kê đường dẫn ảnh>
Checklist: .agents/skills/prototype/references/checklist.md — đọc mục B (mục A do script lo)

Chỉ ra tối đa 5 lỗi thực sự, xếp theo mức nghiêm trọng. Mỗi lỗi ghi:
- Mã luật nếu khớp (B…), **hoặc** `FREE:` nếu là lỗi thật mà checklist chưa có luật
- Ảnh nào
- Mô tả cụ thể cái gì sai (không nói "trông không ổn")

Được phép có tối đa 3 finding `FREE:` — checklist là danh sách mở, đừng ép quan sát vào mã
có sẵn và đừng bỏ qua vì "không có luật". Ví dụ FREE hợp lệ: chữ tràn/cắt trong control,
khoảng cách làm hai cột lệch, một chi tiết trông rẻ tiền so với phần còn lại.

Không khen. Không đề xuất thêm tính năng. Không nhận xét code. Chỉ dùng Read để xem ảnh; không đọc file HTML/CSS/JS, không chạy lệnh.
Nếu không có lỗi thật, nói "không có lỗi" — đừng bịa cho đủ 5.
```

**Không** giao: file HTML nguồn (để nó không phê code thay vì phê giao diện), lý do bạn đã chọn thiết kế, hay câu "tôi vừa sửa X, thấy ổn chưa".

### 4. Triage — main agent

Mỗi finding gắn nhãn:

- **ACCEPT** — đúng, sửa ngay
- **REJECT** — sai hoặc không áp dụng; ghi lý do vào báo cáo cuối
- **ESCALATE** — đúng nhưng sửa sẽ đổi hành vi đã chốt với user → không sửa, đưa thành một câu hỏi trong gói quyết định ở bước duyệt

Chỉ sửa ACCEPT. Không sửa REJECT vì "thấy cũng hợp lý" — đó là cách tiêu một vòng.

### 5. Sửa, chụp lại, dừng

Sửa → `shots` lại → nhìn ảnh đã sửa. **Kiểm bằng dữ liệu trước khi tin finding:** finding
gắn mã phải đối chiếu số đo (đo pixel, đếm DOM) — reviewer đọc ảnh có thể sai về tỷ lệ thanh,
nhầm ảnh có/không có. Không cần sub-agent cho mọi lần; một vòng sub-agent cho mỗi 2–3 lần sửa.

**Sửa `shared/` thì chụp lại toàn bộ và kiểm bằng browser thật.** Chạy `shots.mjs` không có `--only` (shell đổi là mọi trang đổi), và liệt kê trong gói bàn giao các mục `## <PREFIX>` đã APPROVED bị ảnh hưởng để user xác nhận lại. `shots.mjs` mở context mới nên luôn
thấy bản cuối; tab của user thì không. Sau khi đổi `shared/shell.{js,css}`, mở trang bằng
Playwright, đọc `getComputedStyle` + `textContent` của control vừa sửa, và nếu đổi markup
icon-only thì xác nhận `textContent === ''`. Kèm cache-busting `?v=<hash>` khi nhúng
`shared/` nếu cần, hoặc nhắc user hard-refresh trước khi kết luận là xong.

**Trần 3 vòng sub-agent.** Hết 3 vòng còn lỗi lớn → dừng, đưa danh sách lỗi chưa giải
và lý do vào gói quyết định. Không tự lặp tiếp: vòng lặp mở là thứ Lab cấm ở mọi
skill khác, prototype không được ngoại lệ.

## Lỗi thật mà cơ chế này đã bắt được

Ghi lại để nhớ vì sao không được bỏ bước. Cả ba đều **không** phát hiện được
bằng đọc code:

| Lỗi | Ảnh phát hiện | Sửa |
|---|---|---|
| Popover thông báo bị cắt cụt ở 390 | `planning-notif-390.png` | `.popover` bám viewport dưới 900px |
| Thẻ "đã qua 36 ngày" nằm trong mục "SẮP TỚI" | `planning-1280.png` | Mock đẩy sang tương lai, thêm một kỳ "Hôm nay" |
| Vòng tròn trang trí tràn từ panel tối sang panel form | `login-1280.png` | `.intro { overflow: hidden }` |

Cái thứ ba đặc biệt đáng nhớ: nó là lỗi **chỉ** nhìn ảnh mới thấy. Code đọc lên
hoàn toàn đúng — `::after` có `position:absolute` với `z-index:-1`, hợp lệ. Nhưng
`isolation: isolate` không cắt tràn, phải có `overflow: hidden`.

## Lỗi mà cơ chế này ĐÃ BỎ SÓT — và vì sao

| Lỗi | Ai phát hiện | Root cause |
|---|---|---|
| Nhãn "Đăng xuất" bị nhồi vào nút ép 36×36, chữ vỡ hai dòng; hover cũng xấu | **User**, sau khi tự sửa xong | Reviewer bị buộc gắn mã B…; checklist không có luật nào cho text tràn trong control. Trạng thái lai (markup cũ + CSS mới) chỉ tồn tại trong tab **cache** của user, `shots.mjs` không bao giờ thấy |

Hai sửa đã vào vì lỗi này: (1) checklist thành **danh sách mở** — reviewer được ghi `FREE:`
khi không khớp mã; (2) bước 5 bắt buộc kiểm `shared/` bằng browser thật sau khi sửa.

Bài học chung: taxonomy sinh từ lỗi quá khứ chỉ bắt được lỗi quá khứ. Khi một control
được sửa cả markup lẫn CSS, phải xem **kết quả render**, không phải diff.

## Trạng thái để chụp ảnh

Trang tự đọc `?state=` để đưa mình vào trạng thái cần chụp. Không viết script
bấm chuột — thứ đó không tất định.

Shell hỗ trợ sẵn (`shared/shell.js` → `applyReviewState`):

| `?state=` | Kết quả |
|---|---|
| `notif` | Mở popover thông báo |
| `user` | Mở menu tài khoản |
| `drawer` | Mở sidebar dạng drawer (dùng cho ảnh mobile) |

Trang tự xử lý state riêng, ví dụ `planning.html`:

| `?state=` | Kết quả |
|---|---|
| `empty` | Không có sự kiện nào |
| `archived` | Có một sự kiện đã lưu trữ |
| `create` | Mở sẵn modal tạo, điền dữ liệu mẫu |
| `detail` | Mở vùng chi tiết, mở sẵn ô thêm việc con (ảnh mobile) |

Thêm state mới thì cập nhật `lab-prototype/shots.json` cùng lúc — state không
có trong manifest là state không ai review.
