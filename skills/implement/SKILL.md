---
name: implement
description: Thực thi ticket list từ một spec đã duyệt thành code chạy được, đã test, đã review và đã commit trên nhánh riêng. Hai nhánh reference — backend (migration gate, D1, query cost, contract) và frontend (story, screenshot, đọc ảnh đối kháng). Dùng khi user nói "implement", "làm ticket", "code ticket PLN-001-T1". Không dùng để viết spec, để review code có sẵn, hay để deploy.
metadata:
  short-description: Spec đã duyệt → code + test + review + commit trên nhánh
---

# implement

Biến spec đã duyệt thành commit sẵn sàng cho `ship`. Đầu ra là **bằng chứng**, không phải lời khẳng định "đã xong".

## Vị trí trong chuỗi

```text
spec (đã duyệt) → implement → ship → production
```

**Không push `main`. Không deploy. Không tạo PR.** Ba việc đó thuộc `ship`.

Push lên **nhánh feature** thì bắt buộc sau mỗi ticket — để không mất việc, và không cần quy tắc "ship trong ngày".

## Hai nhánh, không trộn

| Nhánh | Reference | Ràng buộc nền | Review dựa trên |
|---|---|---|---|
| **Backend** | [`references/backend/workflow.md`](references/backend/workflow.md) | `backend.md` §10, luật 1–16 | Code, SQL, D1 test thật |
| **Frontend** | [`references/frontend/workflow.md`](references/frontend/workflow.md) | `frontend.md` §5–§6, luật 17–30 | **Ảnh Storybook** — user không đọc code |

Vòng lặp **giống nhau** hai phía (đó là lý do chung một skill). Ruột từng bước **khác nhau** (đó là lý do tách reference).

Ticket chạm cả hai → chạy backend trước, frontend sau, trong cùng nhánh feature.

## Đọc trước

1. Spec tương ứng: `spec-backend.md` / `spec-frontend.md` — **chỉ đọc phần ticket được giao**, không đọc cả file nếu không cần.
2. Luật cứng: `.agents/AGENTS.md` luật 1–16 (backend) hoặc 17–30 (frontend).
3. Reference của nhánh: `references/backend/workflow.md` hoặc `references/frontend/workflow.md`.
4. `references/review-protocol.md` — trước khi tới bước review.
5. `decision-ledger.md` — chỉ dòng DECIDED là ràng buộc.

## Bất biến — áp cho mọi ticket

1. **Không ra quyết định thiết kế.** Gặp chỗ spec mơ hồ, thiếu, hoặc mâu thuẫn → **dừng, báo user**. Không tự chọn.
2. **Không commit khi test đỏ.** Không có ngoại lệ, không "commit tạm rồi sửa sau".
3. **Một commit một ticket.** Không gộp nhiều ticket, không tách một ticket thành nhiều commit.
4. **Không nới ràng buộc để test pass.** Test fail vì code sai → sửa code. Test fail vì test sai → sửa test và ghi lý do.
5. **Không thêm dependency ngoài spec** mà không hỏi user.
6. **DoD là bằng chứng**, không phải cảm nhận. Thiếu bằng chứng = chưa xong.

## Quy trình

### 0. Setup nhánh

```bash
git fetch origin
git status --short          # phải sạch, không thì dừng
```

Tạo nhánh từ `main` mới nhất, hoặc rebase nhánh hiện có lên `main` nếu đang làm dở nhiều ticket:

- Nhánh mới: `git switch -c feat/<TICKET-ID> origin/main`
- Đang làm dở, sang ticket tiếp: `git rebase origin/main`

**Rebase đầu mỗi ticket, không đợi tới `ship`.** Conflict nhỏ sửa dễ hơn nhiều so với dồn lại cuối.

### 1. Đọc ticket và chốt phạm vi

- Ticket ID, outcome, scope, test cần có, non-goals, `Blocked by`.
- Nếu `Blocked by` chưa xong → dừng, báo user.
- Liệt kê file dự kiến chạm. Nếu nhiều hơn phạm vi ticket → báo user trước khi viết.

### 2. Implement

Theo reference của nhánh. Trong lúc code, **tuân luật cứng**, không "tạm vi phạm rồi sửa".

### 3. Verify bằng máy

Chạy gate của nhánh (xem reference). **Gate phải xanh trước khi sang review.** Không review code đỏ.

Ghi lại output thật: số test pass, thời gian, lệnh đã chạy. Đây là bằng chứng cho DoD.

### 4. Review — reviewer context sạch

Theo `references/review-protocol.md`. Điểm then chốt: **reviewer không nhận reasoning của người viết code**. Chỉ nhận spec section + diff + checklist. Nếu reviewer thấy cùng lý lẽ với implementer thì bước này vô nghĩa.

### 5. Triage finding

| Phán quyết | Điều kiện | Hành động |
|---|---|---|
| **ACCEPT** | Dẫn được luật cứng hoặc hậu quả cụ thể | Sửa |
| **REJECT** | Sở thích cá nhân, hoặc dẫn luật sai | Không sửa. Ghi lý do vào commit message |
| **ESCALATE** | Finding đúng, nhưng sửa nghĩa là **đổi thiết kế** | **Dừng, báo user.** Không tự quyết |

`ESCALATE` là hàng rào chống lỗi nghiêm trọng nhất: implement không được phép đổi thiết kế. Chỉ hai đường — implement đúng spec, hoặc dừng.

REJECT **phải** vào commit message. Nếu chỉ nằm trong đầu agent, phiên sau reviewer khác sẽ báo lại đúng điều đó.

### 6. Sửa → verify lại

Sau mỗi vòng sửa, **chạy lại toàn bộ gate**. Sửa có thể làm vỡ test đã pass.

Lặp tối đa **2 vòng**. Vòng 3 vẫn còn finding ACCEPT → dừng, báo user. Lặp vô hạn là dấu hiệu spec hoặc checklist có vấn đề, không phải code.

### 7. Commit

Message:

```
<TICKET-ID>: <outcome ngắn>

- <thay đổi chính>
- Review: accepted <n>, rejected <n> — <lý do reject>
```

Chỉ một commit. Nếu lỡ commit nhiều lần trong lúc làm → squash trước khi push, để `ship` nhận một commit/ticket.

### 8. Push nhánh

```bash
git push -u origin feat/<TICKET-ID>
```

Bắt buộc, ngay sau commit. Nhánh feature an toàn tuyệt đối — không ảnh hưởng `main`, không ai deploy từ đó.

Báo lại: hash commit, tên nhánh, số commit đang chờ `ship`.

### 9. Ticket tiếp theo

Quay lại bước 0 với ticket tiếp. Rebase nhánh lên `main` trước.

Hết ticket trong phạm vi → báo user, liệt kê: ticket xong, commit hash, finding ESCALATE đang chờ, và **`ship` là bước tiếp theo**.

## Definition of Done — bằng chứng bắt buộc

Commit chỉ được tạo khi đủ bảng này. Thiếu ô nào → chưa xong.

| Phía | Bằng chứng |
|---|---|
| **Backend** | `npm test` pass (kèm số test) · `typecheck` + `lint` sạch · file `.sql` đã apply local (nếu có migration) · nếu có endpoint: một lời gọi thật trả đúng status/body · `rows_read` không tăng tuyến tính với query mới |
| **Frontend** | `typecheck` + `lint` + `test` sạch · danh sách story đã phủ + trạng thái nào · **đường dẫn ảnh** trong `docs/delivery/<ID>/shots/` · 4 câu đọc ảnh đã trả lời (xem reference) |
| **Chung** | commit hash + message · danh sách finding REJECT kèm lý do · finding ESCALATE (nếu có) chưa sửa, đang chờ user · `node .agents/scripts/lab.mjs check` pass (file theo dõi nếu có thay đổi) |

**Vị trí artifact** theo chuẩn `lab-docs/frameworks/documentation-standards.md` §2: gate output, đo đạc query, triage ghi vào `<repo>/docs/delivery/<ID>/`; ảnh chụp vào `docs/delivery/<ID>/shots/`. Bằng chứng **phải được commit và merge vào `main` cùng PR** — bằng chứng nằm chết trên nhánh đã xóa thì bằng không.

Khi xong một ticket: `node .agents/scripts/lab.mjs tick <ID> <Tn>` (hoặc `done` nếu hết task). Việc lộ ra ngoài ticket → skill `capture`, không tự nhét vào ticket hiện tại.

## Dừng và báo user khi

- Spec mơ hồ, thiếu, hoặc mâu thuẫn với chính nó.
- Ticket cần đổi thiết kế (phát hiện trong lúc code hoặc qua ESCALATE).
- Cần dependency chưa có trong spec.
- `Blocked by` chưa xong.
- Working tree bẩn không rõ nguồn gốc.
- Hai vòng review vẫn còn finding ACCEPT.
- Phạm vi thực tế vượt xa ticket.

## Không làm

- Không push `main`, không deploy, không tạo PR — đó là `ship`.
- Không sửa spec, không sửa ledger, không sửa `db-schema.md`.
- Không nới luật cứng để code chạy được.
- Không tự thêm endpoint, tính năng, hoặc component ngoài ticket.
- Không commit khi gate đỏ.
- Không tự quyết finding ESCALATE.
- Không dùng Playwright MCP để điều hướng Storybook.

## Vị trí trong chuỗi

```text
spec-review → implement → ship
```

**Đầu ra tài liệu:** commit trên nhánh feature (`feat/<ID>`) + bằng chứng tại `<repo>/docs/delivery/<ID>/` (gate output, review-triage, ảnh story) → **bước tiếp theo:** ship → invoke `ship <prefix>`

**Điều kiện vào:** `lab gate implement <ID>` — yêu cầu spec đã duyệt + `review.md` có `Verdict: PASS`. Nếu FAIL, chạy `spec-review` trước.
