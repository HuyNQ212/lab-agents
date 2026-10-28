# Các lớp thiết kế — nhánh BACKEND

> Luồng FULL. Mỗi lớp: một gate. Giữa các gate, chỉ dừng cho quyết định hoặc khi vướng.
> Luật nền: `design-principles.md` L1–L7b, `backend.md` §10, AGENTS.md luật 1–16. File này chỉ nói **lớp nào hỏi gì**.

## G1 — Entity, ownership, ranh giới service

**Đầu vào:** stories của cụm, Design Record/`db-schema.md` đã có, `system-overview.md`.
**Việc:** liệt kê thực thể mà cụm cần; mỗi thực thể gán **một** service sở hữu.
**Câu cần quyết (mỗi câu một lượt):**
- Thực thể X thuộc service nào? Nếu có hai ứng viên → trình bày cả hai theo L6; ứng viên đòi service này chạm dữ liệu service kia bị loại (L2).
- Cần service/D1 mới không? (Gộp service vì "ít dữ liệu" bị cấm.)
- Chiều gọi giữa các service; chỗ nào cần sự kiện thay vì gọi.

**Đầu ra:** mục 1 (Ownership) của Design Record + flowchart ranh giới.
**Qua gate khi:** mọi thực thể có đúng một owner; không ô nào ghi "tạm"; user nói rõ đã duyệt.
**Quyết định khó đảo ngược nhất ở lớp này:** owner của từng thực thể; có tách service mới hay không.

## G2 — Quan hệ, cardinality, invariant, đồng bộ chéo

**Việc:** quan hệ giữa các thực thể trong cùng service (1-1/1-N/N-N, FK, cascade); **invariant mà bảng không diễn đạt được**; mọi luồng chéo service.
**Câu cần quyết:**
- Cardinality và hướng sở hữu (ai xóa ai khi cascade — nhớ D1 không cho rebuild bảng, backend.md §10).
- Với mỗi invariant: ai giữ (hàm ghi duy nhất? ràng buộc DB?) và **kiểm bằng máy cách nào**. Invariant không có cách kiểm → chưa xong.
- Với mỗi luồng chéo service: chọn theo thứ tự L3 (sự kiện → sync → cache). Nêu khi bên kia lỗi, idempotency, partial failure. "Queues DEFERRED" không phải lý do né sự kiện (L4: outbox + cron).
- Xóa dữ liệu: soft hay hard, và với cái gì.

**Đầu ra:** mục 2 (ERD per service), 3 (Invariant), 4 (Đồng bộ/failure).
**Qua gate khi:** mọi quan hệ có cardinality + hướng sở hữu; mọi invariant có "cách kiểm bằng máy"; mọi luồng chéo có hành vi khi lỗi.
**Khó đảo ngược nhất:** hướng cascade, cardinality, cơ chế đồng bộ chéo.

## G3 — Cột, kiểu, index, migration, cây file đích

**Việc:** viết **`db-schema.md`** đúng L7b (bảng `Cột | Kiểu | Ràng buộc | Vì sao có`, bảng index `Index | Cột | Phục vụ`, **không DDL, không văn xuôi**), kế hoạch migration, và cây file đích.
**Câu cần quyết:**
- Cột/kiểu/ràng buộc từng bảng (STRICT, epoch ms INTEGER, date-only TEXT + CHECK GLOB ≤50 byte, UUIDv7…). Cột chỉ lưu thứ **không suy ra được** từ cột khác.
- Index: chỉ UNIQUE, FK, hoặc truy vấn đã biết cụ thể — mỗi index kèm câu SQL; đo `EXPLAIN QUERY PLAN` + `rows_read` thuộc `implement` (cổng 4), nhưng **câu SQL phải nêu ngay ở đây**. Không index "chuẩn bị trước" dù đang ở "trần thiết kế" (L6b).
- Migration forward-only additive; thứ tự local → remote; có backfill không.
- Cây file đích: mỗi file một trách nhiệm, giới hạn kích thước, ranh giới import. Đây là thứ `spec-review` dùng để bắt "nhồi một file".

**Nhãn:** mọi bảng/cột/index/file gắn `core` hoặc `mở rộng` + chi phí khi bỏ — đặt trong Design Record (mục 5–6), **không** trong `db-schema.md` (L7b cấm).
**Đầu ra:** `db-schema.md` bản đầy đủ + mục 5 (cây file), 6 (quyết định), 7 (giả định hạ tầng).
**Qua gate khi:** mọi cột có lý do một dòng; mọi index có câu SQL; mọi phần tử có nhãn.
**Khó đảo ngược nhất:** kiểu cột, UNIQUE/CHECK, FK + cascade, cột `user_id` bản sao.

## G4 — Gọt và đóng băng

**Việc:** liệt kê mọi phần tử `mở rộng` kèm chi phí khi bỏ, **gom theo chủ đề** (không đưa 40 dòng rời). User chọn bỏ/giữ. Agent cập nhật Design Record + `db-schema.md` (phần tử bỏ → `REMOVED` trong Design Record), chạy lại kiểm sơ đồ ↔ bảng, trình bày bản cuối.
**Agent không đề xuất gọt vì "đơn giản hơn/nhanh hơn" (L1, L5).** Nếu user hỏi ý kiến → nêu đánh đổi thật, không thiên vị.
**Qua gate khi:** user nói rõ "đóng băng". Chỉ khi đó mới đặt `FROZEN` và báo `to-spec` có thể chạy.

## Khi vướng ở bất kỳ lớp nào

Dừng. Báo theo mẫu: **vướng gì · các lựa chọn (mỗi cái đủ ba dòng L6) · khuyến nghị**. Ví dụ điển hình: thiếu dữ liệu service khác (→ sự kiện hay gọi?), hạ tầng chưa có (→ việc phải dựng, không phải việc phải tránh), hai story mâu thuẫn. Không tự chọn.
