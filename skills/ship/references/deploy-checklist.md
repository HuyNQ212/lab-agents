# Deploy checklist — cho reviewer của ship plan

> Dùng ở Phase 1 của `ship`. Bộ câu hỏi phản biện **plan**, không phải code.
> Reviewer nhận **chỉ plan**, không nhận reasoning của người lập plan.

## Vì sao review ở đây quan trọng nhất trong toàn chuỗi

`to-spec` và `architecture-review` review artifact mà sai thì sửa rẻ. `implement` commit mà sai thì sửa bằng commit mới. **`ship` plan mà sai thì hậu quả đi thẳng vào production D1 và Worker đang chạy** — migration forward-only, không rollback thật.

Vì vậy reviewer ở đây phải chấm chặt hơn, và câu hỏi phải là "nếu bước này hỏng thì trạng thái là gì", không phải "bước này có hợp lý không".

## 1. Phạm vi và thứ tự

- Mọi repo có commit chưa ship đã được liệt kê chưa? → thiếu = **BLOCKER** (ship nửa vời).
- Có commit nào không thuộc ticket đã duyệt? → **MAJOR** (scope drift).
- Merge order có đúng **callee trước caller**? → ngược = **BLOCKER**.
- Thứ tự merge có khớp thứ tự deploy? → lệch = **MAJOR** (khó lần vết khi có sự cố).
- PR nào có dependency vào PR khác đã ghi rõ? → thiếu = **MAJOR**.

## 2. Gate coverage

- Mọi repo có thay đổi đều có gate chạy? → thiếu repo = **BLOCKER**.
- Gate chạy trên nội dung **sau rebase** chưa? → chỉ chạy trước rebase = **BLOCKER**.
- Có output thật (số test, thời gian build) hay chỉ "đã chạy"? → thiếu = **MAJOR**.
- `format:check` có trong danh sách? → thiếu = **MAJOR** (Prettier đã DECIDED).
- Build có chạy, hay chỉ test? → thiếu build = **MAJOR**.
- Có gate nào bị bỏ qua kèm lý do không dẫn được luật? → **MAJOR**.

## 3. Merge strategy và verify

- Merge dùng `--rebase` chứ không `--squash`? → squash = **BLOCKER** (phá giá trị gate: hash khác cái đã test).
- Có bước verify tree hash sau merge? → thiếu = **BLOCKER**.
- Nếu tree hash khác, plan nói làm gì? → không nói = **BLOCKER**.
- Plan có tính trường hợp `main` di chuyển trong lúc review? → không = **MAJOR**.

## 4. Migration

Trục rủi ro cao nhất. Chấm chặt.

- Danh sách file `.sql` chưa apply có đầy đủ, đúng D1? → thiếu = **BLOCKER**.
- Mọi file đã apply **local** thành công? → chưa = **BLOCKER**.
- Mọi file forward-only, additive, không `RENAME`/`DROP TABLE`? → vi phạm = **BLOCKER** (luật 6).
- Thứ tự file khớp dependency giữa bảng? → sai = **BLOCKER** (FK/CHECK fail giữa chừng).
- **"Nếu file fail giữa chừng, schema ở trạng thái nào?" có câu trả lời cụ thể?** → không trả lời được = **BLOCKER**.
- ⚠️ Chưa verify D1 có chạy một file `.sql` trong một transaction không. Plan có **coi mỗi file là có thể hỏng một phần** không? → không = **BLOCKER**.
- Có bước backup D1 trước migrate? → thiếu = **BLOCKER**.
- Backup có đường dẫn + thời điểm cụ thể? → "sẽ backup" = **MAJOR**.
- Apply từng D1 một, verify sau mỗi cái? → gộp = **MAJOR**.
- Verify dùng bằng chứng gì (bảng/cột/index tồn tại, `d1_migrations` có dòng)? → "lệnh chạy không lỗi" = **MAJOR**.

## 5. Deploy

- Deploy order **callee → caller**? → ngược = **BLOCKER** (caller gọi binding chưa tồn tại).
- Deploy tuần tự, dừng khi fail? → song song = **BLOCKER**.
- `check-env.ts` chạy trước mỗi lần deploy? → thiếu = **BLOCKER** (fail-fast thật, không hình thức).
- Version ID hiện tại của từng Worker đã ghi để rollback? → thiếu = **MAJOR**.
- Có binding mới? → callee phải deploy trước, plan có ghi rõ? → thiếu = **BLOCKER**.
- FE deploy sau khi tất cả BE verify xong? → trước = **MAJOR**.

## 6. Version và dependency

- Có nâng version dependency nào trong lần ship này? → có = **BLOCKER** (version là ticket riêng; trộn vào ship làm không biết cái gì gây lỗi).
- Lockfile khớp `package.json`? → lệch = **BLOCKER**.
- Có range trôi nổi (`^`/`~`/`latest`/`*`)? → có = **MAJOR** (đã DECIDED pin exact).
- `npm ls` có `UNMET PEER`? → có = **MAJOR**.
- `wrangler` version lệch major so với lần deploy trước? → lệch mà không ghi lý do = **MAJOR**.
- `compatibility_date` cũ hơn 6 tháng? → **MINOR**, ghi nhận.
- Node version khớp `engines`? → lệch = **BLOCKER** (build sẽ khác local).

## 7. Verify production

- Có kế hoạch verify cho **từng** Worker vừa deploy? → thiếu = **MAJOR**.
- Verify có kiểm `requestId` trong log (auth context chảy đúng)? → thiếu = **MAJOR**.
- Có kiểm contract thật khớp zod schema của FE? → thiếu = **MAJOR** (đây là chỗ lệch contract nổ).
- Có bước kiểm FE tải được (không màn hình trắng)? → thiếu = **MAJOR**.
- Có kiểm query trên bảng vừa migration? → thiếu = **MAJOR**.
- Plan có phân biệt rõ "skill verify" và "user smoke"? → lẫn = **QUESTION** (làm rõ ai chịu trách nhiệm kết luận).

## 8. Điểm dừng và rollback

- Ba điểm dừng bắt buộc (duyệt PR, migration remote, deploy) đã ghi rõ? → thiếu = **BLOCKER**.
- Mỗi bước không hoàn tác được có đường lùi cụ thể? → "sẽ xử lý nếu cần" = **BLOCKER**.
- Có ESCALATE nào từ `implement` còn chờ user mà ảnh hưởng nội dung ship? → có = **BLOCKER** (không ship khi thiết kế chưa chốt).
- Preconditions (`gh`, dirty, behind, node) đều ✅? → ❌ mà plan vẫn tiếp = **BLOCKER**.

## Output của reviewer

Giống `architecture-review`, dùng cùng thang mức:

```markdown
## Verdict: NEEDS WORK

### Findings

| ID | Mức | Trục | Vị trí | Vấn đề | Vì sao | Hướng sửa |
|---|---|---|---|---|---|---|
| SH-1 | BLOCKER | Migration | plan §5 | Không trả lời "fail giữa chừng thì sao" | Migration forward-only, schema nửa vời không rollback được | Ghi rõ trạng thái sau lỗi + migration bù |

### Đã kiểm tra, không thấy vấn đề
- Gate coverage: 3/3 repo
- Deploy order: callee → caller đúng
```

Plan chỉ được thực thi khi verdict **PASS**.

## Trước khi trả

- [ ] Reviewer không nhận reasoning của người lập plan.
- [ ] Mọi BLOCKER dẫn được luật cứng hoặc hậu quả không hoàn tác cụ thể.
- [ ] Đã kiểm câu "nếu bước này hỏng thì schema/hệ thống ở trạng thái nào".
- [ ] Không có finding chỉ dựa trên preference.
- [ ] Verdict khớp mức cao nhất.
