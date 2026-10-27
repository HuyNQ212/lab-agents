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
node .agents/scripts/shots.mjs                 # 18 ảnh: desktop + mobile + mọi trạng thái
```

Nếu vừa sửa một trang:

```bash
node .agents/scripts/shots.mjs --only planning --width 390
```

### 2. Chọn ảnh để phê

Không phê cả 18 ảnh mỗi vòng — tốn và loãng. Chọn theo thứ tự ưu tiên:

1. Trang **mới nhất / vừa sửa**
2. Width **390** trước (lỗi bố cục lộ rõ nhất ở hẹp)
3. Trạng thái **empty** và **error** (dễ bị bỏ quên nhất)
4. Width 1280 sau

### 3. Prompt cho sub-agent

Giao đúng ngần này, không giao thêm:

```text
Bạn review một UX prototype HTML (không phải production code).

Ảnh: <liệt kê đường dẫn ảnh>
Checklist: .agents/skills/prototype/references/checklist.md — đọc mục B (mục A do script lo)

Chỉ ra tối đa 5 lỗi thực sự, xếp theo mức nghiêm trọng. Với mỗi lỗi:
- Luật nào trong checklist (mã B…)
- Ảnh nào
- Mô tả cụ thể cái gì sai (không nói "trông không ổn")

Không khen. Không đề xuất thêm tính năng. Không nhận xét code.
Nếu không có lỗi thật, nói "không có lỗi" — đừng bịa cho đủ 5.
```

**Không** giao: file HTML nguồn (để nó không phê code thay vì phê giao diện), lý do bạn đã chọn thiết kế, hay câu "tôi vừa sửa X, thấy ổn chưa".

### 4. Triage — main agent

Mỗi finding gắn nhãn:

- **ACCEPT** — đúng, sửa ngay
- **REJECT** — sai hoặc không áp dụng; ghi lý do vào báo cáo cuối
- **ESCALATE** — đúng nhưng sửa sẽ đổi hành vi đã chốt với user → hỏi user

Chỉ sửa ACCEPT. Không sửa REJECT vì "thấy cũng hợp lý" — đó là cách tiêu một vòng.

### 5. Sửa, chụp lại, dừng

Sửa → `shots` lại → nhìn ảnh đã sửa. Không cần sub-agent cho mọi lần; một vòng
sub-agent cho mỗi 2–3 lần sửa là đủ.

**Trần 3 vòng sub-agent.** Hết 3 vòng còn lỗi lớn → dừng, báo user kèm danh sách
lỗi chưa giải và lý do. Không tự lặp tiếp: vòng lặp mở là thứ Lab cấm ở mọi
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

Thêm state mới thì cập nhật `lab-prototype/shots.json` cùng lúc — state không
có trong manifest là state không ai review.
