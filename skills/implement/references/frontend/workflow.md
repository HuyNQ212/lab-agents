# Frontend workflow — cơ chế chi tiết

> Ruột bước 2 và 3 của `implement` cho nhánh frontend.
> Luật cứng: `lab-docs/architecture/frontend.md` §5–§6 + `.agents/AGENTS.md` luật 17–30.
>
> **Ràng buộc gốc:** user **không đọc source code frontend**. Review = **ảnh Storybook**. Nên bước ấn ảnh và đọc ảnh là bước review thật, không phải phụ.

## Cổng bắt buộc, theo thứ tự

### Cổng 1 — Implement theo vertical slice

Một ticket = route + schema + query + UI + test + story. **Không** tách "component trước, wiring sau" — nửa đầu không verify được gì.

Nhắc nhanh chỗ hay vi phạm:

| Luật | Hay vi phạm ở đâu |
|---|---|
| 17 — token trong `@theme` | Dán hex trực tiếp khi chỉnh màu |
| 18 — search params typed + zod | Parse tay `Number(search.x)` |
| 19 — cấm copy server data sang client state | `useState(data)` sau `useQuery` |
| 21 — zod parse mọi response | `as User` cho nhanh |
| 23 — không store | Thêm Zustand "cho tiện dùng nhiều nơi" |
| 24 — token memory, retry 1 lần | Thêm refresh logic trong component |
| 25 — cấm import chéo feature | Import từ `features/planning` vào `features/secrets` |

### Cổng 2 — Gate máy

```bash
npm run typecheck
npm run lint
npm test
```

Fail thì dừng. **Không sang bước ảnh khi test đỏ** — ảnh của code hỏng không có giá trị review.

Test theo thang 3 tầng (`frontend.md` §6):

| Tầng | Ticket này phải có |
|---|---|
| 1 — Logic | zod schema mới, query key, route guard, hàm thuần |
| 2 — Màn hình | happy path + error state |
| 3 — Component lẻ | **không test**, chỉ story |

MSW handler đặt ở `features/<name>/mocks.ts`, export bộ có tên (`happy`, `empty`, `error`, `slow`). **Story và test dùng cùng bộ này.**

### Cổng 3 — Story phủ trạng thái

Mỗi màn hình có story phủ đủ trạng thái mà `spec-frontend.md` §3.2 khai báo (thường: default, loading, empty, error).

- Trạng thái phải tái tạo **bằng MSW handler**, không bằng cách sửa code hay thêm prop debug.
- Component lẻ (Button, Card) chỉ cần 1 story default.
- Component có ≥3 trạng thái → phủ đủ.

### Cổng 4 — Export ảnh

Storybook cần chạy nền trước:

```bash
# Terminal 1 — để chạy nền
npm run storybook

# Chờ port sẵn sàng, rồi terminal 2
npm run shots
```

**Chờ port sẵn sàng** — không đoán bằng `sleep`. Kiểm bằng cách gọi `index.json`:

```bash
curl -s http://localhost:6006/index.json > /dev/null && echo ready
```

Nếu chưa ready thì chờ và thử lại, tối đa ~30 giây, rồi báo user.

`npm run shots` là Playwright script đọc `index.json`, chụp mọi story ở desktop 1280 và mobile 390 → `.artifacts/shots/<storyId>-desktop.png` và `-mobile.png`.

Lệnh này **tất định, một lần, không tốn token**. Cấm dùng Playwright MCP để điều hướng Storybook (tốn token, không tất định, đã từng mất ~10 step chỉ để vào một story). MCP chỉ dùng khi cần smoke chức năng thật trên app đang chạy.

### Cổng 5 — Đọc ảnh đối kháng

Đây là **bước review thật**. Agent đọc ảnh chính nó vừa tạo cũng có vấn đề "thấy điều mình kỳ vọng", nên mỗi ảnh phải trả lời **4 câu hỏi đóng**, không phải "nhìn có đẹp không".

| # | Câu hỏi | Nếu fail | Vì sao quan trọng |
|---|---|---|---|
| 1 | **Empty có khác Error không?** | MAJOR | User sẽ tưởng app hỏng khi thật ra chưa có dữ liệu |
| 2 | **Loading có gây nhảy layout?** — so chiều cao skeleton với nội dung đã tải | MAJOR | Vi phạm target CLS ≤ 0.1 đã DECIDED |
| 3 | **Error có đường thoát?** — nút retry hoặc đường về | MAJOR | Màn hình ngõ cụt = user phải F5 |
| 4 | **Label form có luôn hiển thị?** — ảnh có nội dung đã nhập mà label biến mất | MAJOR | Placeholder-as-label, mất ngữ cảnh |

Mỗi câu trả lời **kèm tên file ảnh** đã dùng để kết luận. Không có tên file = không tính là đã đọc.

Bốn câu này kiểm được **từ ảnh**, và mỗi câu tương ứng một lỗi mà không cách nào khác phát hiện được — vì user chỉ nhìn ảnh, còn thì không ai đọc code.

### Cổng 6 — Contract với backend

- [ ] Mọi response có zod schema, khớp `spec-backend.md` §4
- [ ] Endpoint dùng có tồn tại thật (không bịa)
- [ ] Error code map sang thông điệp tiếng Việt; không hiển thị `message` của server
- [ ] `.strict()` chỉ dùng cho **input**, không cho response (backend thêm field additive sẽ làm FE chết)

## Bằng chứng cho DoD

| Mục | Ghi gì |
|---|---|
| Test | Lệnh + số test pass, tách rõ tầng 1 / tầng 2 |
| Typecheck / lint | Sạch |
| Story | Danh sách story + trạng thái nào đã phủ |
| Ảnh | **Đường dẫn** trong `.artifacts/shots/` — desktop + mobile |
| Đọc ảnh | 4 câu trả lời, mỗi câu kèm tên file ảnh |

## Prompt review frontend

Xem `references/review-protocol.md` §"Prompt mẫu — frontend". Điểm bắt buộc: **truyền đường dẫn ảnh** cho reviewer. Reviewer chỉ đọc diff text sẽ bỏ qua toàn bộ trục giao diện.

Checklist: `architecture-review/references/frontend/checklist.md`.

## Dừng và báo user khi

- Storybook không khởi động được, hoặc `index.json` không trả về.
- `npm run shots` fail hoặc sinh ảnh thiếu story.
- Một trong 4 câu đọc ảnh fail theo cách **không sửa được mà không đổi thiết kế** (ví dụ: spec không mô tả trạng thái error) → ESCALATE.
- Cần component phức tạp đòi thư viện mới ngoài spec.
- Cần semantic color chưa có token.
- Endpoint cần dùng chưa tồn tại ở backend spec.
