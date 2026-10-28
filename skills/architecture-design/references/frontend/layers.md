# Các lớp thiết kế — nhánh FRONTEND

> Luồng FULL. Mỗi lớp một gate.
> Luật nền: `design-principles.md`, `frontend.md` §0/§5/§6, AGENTS.md luật 17–30.
> **User không đọc code FE, chỉ xem giao diện** → thiết kế phải làm cho lỗi ẩn khó xảy ra: mọi state có chủ, mọi ranh giới có thể kiểm bằng máy.
> Làm **sau** Design Record backend của cụm (cần endpoint/shape thật). Backend chưa có endpoint → vướng, không bịa.

## G1 — Ranh giới màn hình

**Đầu vào:** stories, prototype APPROVED (chỉ tham chiếu giao diện), Design Record backend.
**Việc:** danh sách route/màn hình; mỗi màn hình: mục đích, search params (zod), trạng thái default/loading/empty/error.
**Câu cần quyết:**
- Route tree: màn hình nào là route riêng; **cấm nested tab**.
- Search params nào, kiểu gì (filter/sort/page/selected id → URL, không `useState`).
- Màn hình/luồng nào cần endpoint chưa có → ghi OPEN, không tự thêm.

**Đầu ra:** mục 1.
**Qua gate khi:** mỗi màn hình có 4 trạng thái nêu rõ; mỗi search param có kiểu.
**Khó đảo ngược nhất:** cấu trúc route, tập search params (deep-link).

## G2 — Chia component, state ownership

**Việc:** cây module/component; **phân loại mọi state** của mọi màn hình.
**Câu cần quyết:**
- Ranh giới feature (cấm import chéo feature, chỉ qua `src/shared/`). Component thuộc feature hay `shared`? Primitive mới chỉ khi ≥2 nơi dùng thật.
- Mỗi state một dòng: server (Query) / url (search params) / auth (module-scope) / local (`useState`). **Không state mồ côi, không copy server data vào local/Context.**
- State không rơi vào loại nào → **vướng**: tín hiệu hỏi lại F-5, không tự thêm store.
- Component phức tạp cần thư viện mới → hỏi, nêu chi phí bundle.

**Đầu ra:** mục 2 (cây component), 3 (state ownership).
**Qua gate khi:** mọi state có chủ; mọi component một trách nhiệm một dòng.
**Khó đảo ngược nhất:** state nào ở URL vs local; ranh giới feature; component nào thành `shared`.

## G3 — Luồng dữ liệu, cây file đích

**Việc:** query key gốc, mutation (optimistic có/không · invalidate key nào · rollback), luồng lỗi; cây file đích.
**Câu cần quyết:**
- Query key là hợp đồng giữa query và mutation — khai báo đủ để invalidate đúng nhánh.
- Mỗi mutation: optimistic hay không; nếu có thì **đường rollback** bắt buộc.
- Lỗi mạng vs lỗi nghiệp vụ hiển thị khác nhau thế nào (map theo `code`, không hiện `message` server).
- Cây file đích: một trách nhiệm một file, giới hạn, ranh giới import. `spec-review` dùng cây này bắt file nhồi/tách sai.
- Cấu trúc story/MSW: handler ở `features/<name>/mocks.ts`, bộ `happy/empty/error/slow` dùng chung test và story.

**Nhãn:** mọi phần tử `core`/`mở rộng` + chi phí khi bỏ.
**Đầu ra:** mục 4, 5, 6, 7.
**Qua gate khi:** mọi mutation có đủ ba ý (optimistic/invalidate/rollback); mọi phần tử có nhãn.
**Khó đảo ngược nhất:** query key, optimistic hay không, ranh giới `shared`.

## G4 — Gọt và đóng băng

Như backend: gom `mở rộng` theo chủ đề, user chọn, cập nhật, user nói rõ "đóng băng" mới đặt `FROZEN`. Agent không đề xuất gọt vì "đơn giản hơn/nhanh hơn".

## Khi vướng

Dừng, báo theo mẫu **vướng gì · lựa chọn (đủ ba dòng L6) · khuyến nghị**. Ví dụ: backend chưa có endpoint · token màu chưa có giá trị (đánh dấu delta, không tự đặt hex) · state không có chỗ đặt theo F-5 · cần thư viện mới.
