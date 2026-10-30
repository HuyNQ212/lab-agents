# Checklist — spec-review (Pass 2), nhánh FRONTEND

> Bộ câu hỏi phản biện thiết kế frontend **trước khi viết code**.
> Dùng ở **Pass 2** của `spec-review`. Trục 2 (State ownership) và cấu trúc component/file đã có quyết định trong Design Record → **đối chiếu ở Pass 1** (`references/conformance.md`); ở đây chỉ dùng như lưới an toàn khi Design Record chưa phủ, hoặc spec mâu thuẫn với chính nó.
> `implement` cũng dùng file này làm tiêu chí review diff.
> Không phải nguồn luật: ràng buộc nằm ở `lab-docs/architecture/frontend.md` §0/§5/§6 và `.agents/AGENTS.md` luật 17–30.
> **Vi phạm luật cứng 17–30 tối thiểu là BLOCKER**, kể cả khi mục dưới đây ghi mức thấp hơn.
> Mỗi mục: câu hỏi → dấu hiệu vi phạm → mức mặc định.

## Nguyên tắc gốc — đọc trước mọi trục

**User không đọc source code frontend, chỉ review giao diện.**

Hệ quả khi chấm mức nghiêm trọng:

- Một lỗi **nhìn thấy trên giao diện** (thiếu trạng thái, layout vỡ, chữ khó đọc) → user phát hiện được → mức thường.
- Một lỗi **không nhìn thấy** (cache sai, race condition, contract lệch, state mồ côi) → **không ai phát hiện cho tới khi nó nổ** → nâng một mức so với trực giác thông thường.

Đây là bù trừ có chủ đích, không phải khắt khe quá mức. Viết rõ lý do này khi một finding bị nâng mức, để user không thấy tuỳ tiện.

## 1. Boundary frontend ↔ backend

- Response shape trong spec có khớp **backend spec thật** không? → tự bịa field = **BLOCKER**.
- Mọi response có zod schema parse trước khi vào component chưa? → dùng `as` để bỏ qua = **BLOCKER** (luật 21).
- Có ai đề xuất share package type với backend chưa? → **BLOCKER**, đã DECIDED là không. Viết lại schema ở FE là cố ý — đó là hàng rào phát hiện lệch.
- Error code backend được map sang thông điệp người dùng chưa? → hiển thị `message` của server = **MAJOR** (rò rỉ nội bộ + không kiểm soát được tiếng Việt).
- Endpoint dùng có tồn tại trong backend spec chưa? → gọi endpoint "sẽ có" = **BLOCKER**.
- Có chỗ nào gọi thẳng service nội bộ thay vì qua gateway không? → **BLOCKER**.
- Field mới thêm ở backend có làm vỡ parse không? → zod quá chặt (`.strict()`) trên response = **MAJOR**, vì backend thêm field additive sẽ làm FE chết. Dùng `.strict()` cho **input**, không cho response.

## 2. State ownership

Đây là trục dễ sai nhất và **không thể phát hiện bằng mắt**. Chấm nghiêm.

- Mọi state của màn hình đã phân loại server/url/auth/local chưa? → có state mồ côi = **MAJOR**.
- Có dữ liệu server nào bị copy vào `useState`/Context/store không? → **BLOCKER** (luật 23). Hai nguồn sự thật sẽ lệch nhau, và lệch đó vô hình.
- Filter, sort, page, selected id nằm ở đâu? → `useState` thay vì search params = **MAJOR** (mất deep-link, mất F5, mất back button).
- Search params đã có zod schema chưa? → parse tay `Number(x)` không kiểm tra = **MAJOR**.
- Có ai đề xuất store (Zustand/Redux/Context toàn cục) chưa? → **BLOCKER** nếu không có lý do cụ thể; F-5 đã DECIDED là không store.
- Context có dùng cho gì ngoài auth? → **MAJOR** (re-render toàn subtree).
- State dẫn xuất có bị lưu thay vì tính lại? → **MINOR**, trừ khi nó là nguồn lệch.

## 3. Data fetching và cache

- Query key đã khai báo đủ để invalidate đúng nhánh chưa? → key quá cụ thể (`['list', id]`) khiến không invalidate được cả list = **MAJOR**.
- Mutation có nêu: optimistic có/không, invalidate key nào, rollback khi lỗi? → thiếu = **MAJOR**.
- Optimistic update có đường rollback không? → optimistic mà không rollback = **BLOCKER**, vì lỗi sẽ khiến UI hiển thị dữ liệu không tồn tại và không tự sửa.
- `staleTime` có chủ đích hay mặc định? → dữ liệu thay đổi nhanh mà `staleTime` dài = **MAJOR**.
- Có refetch loop khả dĩ không? (refetchOnWindowFocus + dữ liệu luôn stale) → **MAJOR**.
- Có tải trùng khi hai component cùng mount không? → nêu dedupe/`staleTime` để tránh = **MINOR**.
- Loading/error state lấy từ Query hay tự dựng cờ riêng? → tự dựng cờ song song = **MAJOR** (hai nguồn sự thật).

## 4. UX states

- Mỗi màn hình có đủ 4 trạng thái default/loading/empty/error? → thiếu = **MAJOR**.
- Trạng thái **empty** có hành động gợi ý, hay chỉ "không có dữ liệu"? → thiếu hành động = **MINOR**.
- Trạng thái **error** có phân biệt lỗi mạng vs lỗi nghiệp vụ không? → gộp làm một = **MAJOR** (user không biết có nên retry).
- Error có nút retry khi lỗi transient? → thiếu = **MINOR**.
- Loading có gây nhảy layout (CLS)? → skeleton sai kích thước, spinner đẩy nội dung = **MAJOR** (target CLS ≤ 0.1).
- Sau mutation thành công, UI chuyển đi đâu và invalidate gì? → không mô tả = **MAJOR**.
- Có trạng thái **disabled** cho hành động không hợp lệ, hay để user bấm rồi báo lỗi? → thiếu = **MINOR**.
- Empty và loading có bị trùng nhau (màn hình nháy empty trước khi có dữ liệu)? → **MAJOR**, đây là lỗi nhìn thấy được và gây cảm giác app lỗi.

## 5. Auth flow

- Route có guard chưa, guard ở tầng nào? → guard rải rác trong từng component = **MAJOR**.
- Bootstrap session có ở root `beforeLoad` không? → refresh trong `useEffect` của từng màn = **BLOCKER** (request rác + nháy error state).
- Có logic refresh token nào ngoài `client.ts` không? → **BLOCKER** (luật 24; nhiều đường refresh = phá single-flight).
- 401 retry có bị loop khả dĩ không? → thiếu cờ `hasRetried`, hoặc retry cả `/auth/refresh` = **BLOCKER**.
- Access token có bị ghi vào localStorage/sessionStorage không? → **BLOCKER** (IAM DECIDED: memory only).
- Trạng thái chờ khi bootstrap có được mô tả? → render màn hình với token rỗng = **MAJOR**.
- Logout có xử lý lỗi mạng đúng (giữ đăng nhập, cho retry)? → tự logout phía client khi request fail = **MAJOR** (trái IAM-004).
- Deep-link khi chưa đăng nhập: có quay lại đúng route sau login không? → không mô tả = **MINOR**.

## 6. Kiểm chứng bằng máy

Trục này thay thế vai trò review code đã mất. Thiếu ở đây nghĩa là **không có gì bảo vệ code**.

- Mỗi màn hình có test happy + error (tầng 2) chưa? → thiếu = **MAJOR**.
- Logic ở `client.ts`, zod schema, query key, route guard có test tầng 1 chưa? → thiếu = **BLOCKER** — đây chính xác là code user không đọc và không thấy được.
- Có test nào cho component lẻ (tầng 3) không? → có = **MINOR**, chỉ là lãng phí; story đã đủ.
- Mỗi màn hình có story phủ đủ 4 trạng thái chưa? → thiếu = **MAJOR** (user mất khả năng review trạng thái đó).
- Story và test có dùng **cùng** bộ MSW handler ở `features/<name>/mocks.ts` không? → hai bộ riêng = **MAJOR** (mock lệch nhau, test xanh mà giao diện sai).
- Có mock `fetch` bằng tay thay vì MSW không? → **MAJOR** (bỏ qua `client.ts`, tức là bỏ qua tầng dễ sai nhất).
- Có import chéo feature không? → **BLOCKER** (luật 25).
- `noUncheckedIndexedAccess` có bị tắt cục bộ để né không? → **MAJOR**.

## 7. Bundle và performance

- Route có lazy load không? → mini-app không dùng vẫn nằm trong initial bundle = **MAJOR**.
- Có dependency nặng mới không (UI framework, date lib, chart lib)? → nêu chi phí, so với tự dựng = **MAJOR** nếu không có lý do.
- Ảnh/icon/font có ảnh hưởng LCP không? → font tiếng Việt tải chặn render = **MAJOR**.
- Có animation nào đụng `layout` thuộc tính (width/height/top/left)? → **MAJOR** (layout thrash).
- Danh sách dài có phân trang hoặc windowing? → render hết = **MINOR**, trừ khi > 200 phần tử → **MAJOR**.
- Có đo bundle thật chưa, hay chỉ ước lượng? → ước lượng trong spec = **MINOR** nhưng phải ghi rõ là chưa đo.

## 8. Giao diện và tính nhất quán

- Có hex trực tiếp trong khi đã có token? → **BLOCKER** (luật 17; đổi palette sẽ bỏ sót).
- Token mới có được đề xuất như delta rõ ràng, hay bịa giá trị? → bịa = **MAJOR**.
- Route có nested tab không? → **MAJOR** (trái Direct-first, `frontend.md` §2).
- Form: label có luôn hiển thị? → placeholder-as-label = **MAJOR** (mất label khi có nội dung).
- Lỗi field hiển thị ở đâu? → chỉ hiện toast chung chung = **MAJOR**.
- Nút submit có disable khi đang gửi? → không = **MAJOR** (double submit).
- Màu chữ trên nền có đủ tương phản? → **MINOR** ghi nhận, trừ khi rõ ràng không đọc được → **MAJOR**.
- `prefers-reduced-motion`: **không tự áp**. Đây là trade-off đã biết của user (`frontend.md` §2). Chỉ nêu khi user hỏi.

## 9. Scope hygiene

- Có công nghệ mới ngoài F-1→F-10 chưa? → **BLOCKER** nếu là store/router/style lib khác; **MAJOR** nếu là tiện ích nhỏ.
- Có quyết định F-x nào bị chốt ngầm khác với `frontend.md` §5 không? → **BLOCKER**.
- Ticket có tách "component trước, wiring sau" không? → **MAJOR** (nửa đầu không verify được gì).
- Có endpoint/thư viện nào được thêm mà không story nào cần? → **MINOR**.
- Có OPEN nào bị trả lời ngầm trong spec không? → **MAJOR**.
- Spec có chép lại AC hoặc mô tả code từng dòng không? → **MINOR**.

## 10. Luật cứng chưa có ở trục trên

Mọi vi phạm = **BLOCKER** (`.agents/AGENTS.md`). Ở spec-review áp cho cây file, danh sách dependency và mã mẫu trong spec; `implement` áp cho mọi diff.

- Có `tailwind.config.js`, hoặc token khai ở nhiều hơn một file CSS `@theme`? (luật 17)
- Route lồng nhau/nested tab, hoặc search params không typed/validate bằng zod? (luật 18)
- Tự viết hook fetch/cache thay vì TanStack Query 5? (luật 19)
- Dùng axios hoặc thư viện HTTP khác thay vì fetch wrapper ở `src/shared/api/`? (luật 20)
- Form không dùng react-hook-form + `@hookform/resolvers` + zod, hoặc validate bằng HTML attribute khi đã có zod schema? (luật 22)
- Mock thứ hai ngoài `features/<name>/mocks.ts` (thiếu bộ `happy`/`empty`/`error`/`slow`)? (luật 28)
- Ảnh review không qua `npm run shots`, hoặc dùng Playwright MCP để điều hướng Storybook? (luật 29)
- Version không pin exact (`^`/`~`), hoặc thiếu lockfile? (luật 30)
