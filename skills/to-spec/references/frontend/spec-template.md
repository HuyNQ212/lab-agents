# <Product/Feature> — Frontend Technical Spec

> Template cho skill `to-spec`, nhánh **frontend**. Thay placeholder bằng nội dung thật; giữ heading.
> Mục không áp dụng ghi "Không áp dụng — <lý do>".
>
> **Đọc kèm:** `references/backend/spec-template.md` khi story cần cả hai phía. Đây là hai template **khác nhau**, không trộn.
> Ràng buộc nền: `lab-docs/architecture/frontend.md` §0, §5, §6 và `.agents/AGENTS.md` luật 17–30.

**Status:** DRAFT | REVIEWED
**Stories:** <STORY-ID>
**Repo:** `apps/lab-portal`
**Nguồn:** <stories.md, backend spec, decision-ledger — ngày đọc>
**Spec version:** 1

> **Nhắc trước khi viết:** user **không đọc code frontend**, chỉ review giao diện. Spec này phải đủ để agent implement mà không đoán, và đủ để máy kiểm chứng — vì sẽ không có người đọc code để phát hiện sai.

## 1. Scope

<Outcome người dùng thấy được, kèm story ID. Không chép lại AC.>

## 2. Non-goals

| Non-goal | Nguồn |
|---|---|
| <...> | <story / ledger / OUT OF SCOPE> |

## 3. UI surface

### 3.1 Route

| Route | Search params (typed) | Layout | Mô tả |
|---|---|---|---|
| `/_app/<feature>` | `?<key>=<schema>` | <route tree nông — không nested tab> | <...> |

- Route tree **nông**: mọi mini-app ở cấp 1 dưới `/_app`. Cấm nested tab (Direct-first, `frontend.md` §2).
- Search params phải có zod schema. Ghi rõ schema ở đây, không để "agent tự nghĩ".

### 3.2 Màn hình và trạng thái

Mỗi màn hình **bắt buộc** khai báo đủ 4 trạng thái. Thiếu trạng thái nào là thiếu story.

| Màn hình | Default | Loading | Empty | Error |
|---|---|---|---|---|
| <tên> | <nội dung chính> | <skeleton/spinner gì> | <câu + hành động gợi ý> | <thông điệp + retry?> |

Trạng thái phụ nếu có: `disabled`, `offline`, `optimistic`, `stale`.

### 3.3 Thành phần

| Component | Loại | Tái dùng từ | Ghi chú |
|---|---|---|---|
| <tên> | screen / primitive | `shared/ui` hoặc mới | <...> |

- Primitive mới chỉ tạo khi **≥2 nơi dùng** thật.
- Component phức tạp (data table, date picker) mới cân nhắc thư viện — nêu chi phí bundle.

### 3.4 Tokens và style

- Dùng token trong `@theme` (Quiet Evergreen). Ghi rõ token mới nếu cần.
- Cấm hex trực tiếp trong JSX khi đã có token tương ứng.
- Semantic color (warning/error/success) chưa chốt giá trị — nếu story cần, đánh dấu là **delta cần bổ sung token**, không tự bịa hex.

## 4. Data fetching

| Query key | Endpoint | staleTime | Invalidate khi | Optimistic |
|---|---|---|---|---|
| `['<feature>', '<resource>', <params>]` | `<METHOD> /api/...` | <ms> | <mutation nào> | có/không |

- Query key là **hợp đồng** giữa mutation và cache. Ghi rõ key gốc để invalidate đúng nhánh.
- Mutations: điền bảng riêng.

| Mutation | Endpoint | Optimistic | Invalidate | Rollback khi lỗi |
|---|---|---|---|---|
| <tên> | <...> | có/không | <key> | <cách> |

- Cấm copy kết quả query vào `useState`/Context.
- Danh sách endpoint phải khớp **§API contract** của backend spec. Nếu backend spec chưa có endpoint → dừng, đây là blocker.

## 5. State ownership

Bắt buộc phân loại **mọi** state của màn hình. Đây là mục dễ sai nhất và không ai phát hiện giúp.

| State | Loại | Lưu ở đâu | Vì sao |
|---|---|---|---|
| <tên> | server / url / auth / local | Query / search params / module-scope / `useState` | <lý do> |

Quy tắc áp dụng (F-5, `AGENTS.md` luật 23):
- Dữ liệu từ server → **luôn** TanStack Query. Không copy sang state khác.
- Filter, sort, page, selected id → **URL search params**, để deep-link và F5 giữ được.
- Auth token → module-scope trong `shared/api/`. Không Context, không state.
- Còn lại (modal mở/đóng, draft text) → `useState` tại component gần nhất.
- Context chỉ dùng cho auth. Cấm tạo store.

Nếu spec thấy cần store → **dừng và hỏi user**, vì F-5 đã DECIDED là không store.

## 6. API client và contract

### 6.1 Zod schema

| Schema | Dùng cho | Nguồn |
|---|---|---|
| `<name>Schema` | parse response `<endpoint>` | viết tay theo backend spec |

- Mọi response **phải** parse qua zod trước khi vào component (`AGENTS.md` luật 21).
- Không share package với backend (DECIDED). Viết lại schema ở FE là **cố ý** — nó là hàng rào phát hiện lệch contract.
- Ghi rõ schema nào tái dùng được cho form (xem §7).

### 6.2 Lỗi

| Error code backend | Hiển thị cho user | Hành vi |
|---|---|---|
| `<SERVICE>_<REASON>` | <câu tiếng Việt> | <retry / đóng modal / về danh sách> |

- `ApiError { code, status, requestId }` — dùng `code`, không dùng `message` của server để hiển thị.
- 401 đã xử lý ở `client.ts` (refresh single-flight, retry 1 lần). Spec **không** tự thêm logic refresh ở component.

## 7. Form

| Form | Schema zod | Field | Reuse từ |
|---|---|---|---|
| <tên> | `<schema>` | <liệt kê> | §6.1 nếu cùng shape |

- `react-hook-form` + `zodResolver`. Không validate bằng HTML attribute thuần.
- Hiển thị lỗi: **dưới field**, label luôn hiển thị (không placeholder-as-label).
- Submit: nút `disabled` khi đang gửi; lỗi server hiển thị ở đâu phải ghi rõ (field-level hay form-level).
- Trạng thái sau submit thành công: chuyển đâu, invalidate query nào.

## 8. Auth và bảo vệ route

| Route | Yêu cầu | Hành vi khi thiếu quyền |
|---|---|---|
| <...> | đã đăng nhập | redirect `/login` |

- Bootstrap session nằm ở root `beforeLoad` — spec **không** tự thêm refresh ở tầng màn hình.
- Ghi rõ trạng thái chờ khi bootstrap đang chạy (dùng `pendingComponent`).
- Logout chỉ hoàn tất sau khi server xác nhận revoke; lỗi mạng giữ trạng thái đăng nhập.

## 9. Test plan

Theo thang 3 tầng (`frontend.md` §6). Không test tầng 3.

| Tầng | Case | AC |
|---|---|---|
| 1 — Logic | <zod schema, query key, route guard, pure function> | <AC> |
| 2 — Màn hình | <happy path> | <AC> |
| 2 — Màn hình | <error state> | <AC> |

- Network mock qua MSW, handler đặt ở `features/<name>/mocks.ts`, **cùng** bộ với story.
- Cấm mock `fetch` bằng tay; cấm mock ở tầng component.
- E2E Playwright trên app thật: **DEFERRED**, không đưa vào spec trừ khi user yêu cầu.

## 10. Storybook và ảnh review

| Story | Trạng thái phủ | Mock handler |
|---|---|---|
| `features/<name>/<Screen>` | default, loading, empty, error | `handlers.happy` / `.empty` / `.error` / `.slow` |

- Story là **bề mặt review chính** của user. Mỗi màn hình phải có story phủ đủ 4 trạng thái ở §3.2.
- Trạng thái phải tái tạo được bằng MSW handler, không bằng cách sửa code.
- Ảnh review: `npm run shots` sinh `.artifacts/shots/<storyId>-desktop.png` và `-mobile.png`.
- Component lẻ (Button, Card) chỉ cần 1 story default, không cần 4 trạng thái.

## 11. Tickets

| ID | Outcome | Repo | Blocked by |
|---|---|---|---|
| <STORY-ID>-T1 | <...> | `apps/lab-portal` | — |

### <STORY-ID>-T1 — <tên>

- **Outcome:** <kết quả nhìn thấy được trên giao diện>
- **Scope:** <route, component, hook, schema dự kiến — không mô tả code từng dòng>
- **Test:** <case tầng 1/2 cụ thể>
- **Story:** <story nào phủ trạng thái nào>
- **Blocked by:** —
- **Repo:** `apps/lab-portal`
- **Non-goals:** <...>

**Quy tắc ticket FE:** vertical slice — route + data + UI + test + story trong **một** ticket. Không tách "dựng component trước, nối data sau".

## 12. Traceability

| Story | AC | Ticket | Kiểm chứng bằng |
|---|---|---|---|
| <...> | <...> | <...> | test / story / ảnh |

## 13. OPEN

| ID | Câu hỏi | Vì sao chặn | Ai quyết | Nếu sai |
|---|---|---|---|---|
| O-1 | <...> | <...> | user | <...> |

## 14. Ràng buộc bắt buộc — tự kiểm trước khi ghi

- [ ] Mỗi màn hình có đủ 4 trạng thái ở §3.2.
- [ ] Mọi state đã phân loại ở §5; không state nào mồ côi.
- [ ] Mọi response có zod schema ở §6.1.
- [ ] Mọi endpoint ở §4 khớp backend spec, không tự bịa.
- [ ] Query key đã khai báo để invalidate đúng.
- [ ] Mỗi màn hình có story phủ đủ trạng thái ở §10.
- [ ] Test tầng 1 và tầng 2 có case cụ thể; không có test tầng 3.
- [ ] Không hex trực tiếp, không token tự bịa.
- [ ] Không tạo store, không copy server data vào local state.
- [ ] Ticket là vertical slice, không tách tầng.
