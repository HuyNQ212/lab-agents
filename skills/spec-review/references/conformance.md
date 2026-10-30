# Pass 1 — Độ tuân thủ: spec ↔ Design Record

> Câu hỏi duy nhất của pass này: **spec có làm đúng thứ đã được duyệt không?** Không hỏi "thiết kế có hay không".
> Mỗi mã dưới đây: kiểm gì → **cách kiểm bằng máy nếu có** → dấu hiệu lệch → mức mặc định.
> Lệch phần **FROZEN** của Design Record (hoặc delta đã duyệt) mặc định **BLOCKER**; riêng tên gọi lệch mà cùng nghĩa → MINOR.
> Mã L1–L7b dẫn tới `lab-docs/frameworks/design-principles.md`; luật cứng 1–30 dẫn tới `.agents/AGENTS.md`.

## Chung (cả hai nhánh)

| Mã | Kiểm gì | Cách kiểm | Dấu hiệu lệch | Mức |
|---|---|---|---|---|
| **C7** Tự quyết | Mỗi quyết định kỹ thuật trong spec truy được về một ID (D/INV/OWN/SYNC/FILE…) hoặc dòng ledger DECIDED | Lập danh sách quyết định trong spec (công nghệ, cơ chế, cấu trúc) rồi đối từng cái với bảng Quyết định | Spec chọn cơ chế/công nghệ/cấu trúc không có trong Design Record | BLOCKER nếu đụng ranh giới/dữ liệu; MAJOR nếu còn lại |
| **C5** Workaround/tricky | Spec có giải pháp vòng vo, "tạm thời", đường tắt không có trong Design Record | grep `tạm\|workaround\|MVP\|sau này\|cho chạy\|hack` trong spec; đọc lại các mục "Lưu ý/Ghi chú" | Có cụm từ vựng L5, hoặc giải pháp làm được nhờ phá ranh giới/bản sao dữ liệu | BLOCKER |
| **C10** Quá phạm vi | Phần tử đã `REMOVED` ở G4, hoặc ngoài cụm story, vẫn xuất hiện trong spec | Đối spec với các dòng `REMOVED` và danh sách story của cụm | Có thứ đã gọt/không thuộc story | MAJOR |
| **C11** Phủ ngược | Mọi phần tử `core` của Design Record có chỗ trong spec/ticket (đặc biệt invariant và cách kiểm bằng máy của chúng) | Duyệt từng ID `core` → tìm trong spec/ticket | Design Record có, spec không | MAJOR (invariant/failure thiếu → BLOCKER) |
| **C12** Delta | Phần spec vượt Design Record có đi qua LITE delta đã duyệt không | Đối nhật ký delta | Spec thêm thứ mà không có delta duyệt | BLOCKER |

## Backend

| Mã | Kiểm gì | Cách kiểm | Dấu hiệu lệch | Mức |
|---|---|---|---|---|
| **C1** Schema | Mọi bảng/cột/index/ràng buộc spec nhắc đều **có** trong `db-schema.md`; kiểu và ràng buộc khớp | Trích mọi định danh (backtick) trong mục data model/API của spec, grep từng cái trong `db-schema.md`; so kiểu, NULL, CHECK, UNIQUE | Bảng/cột lạ; kiểu khác; thêm index; ràng buộc nới lỏng | BLOCKER (delta chưa duyệt) |
| **C2** Ownership & ranh giới | Mỗi truy cập dữ liệu nằm đúng service sở hữu (OWN) | Với mỗi repo/query trong spec, tra bảng OWN; tìm `D1` của service khác | Service A đọc/ghi bảng của B; dữ liệu B được copy vào A "vài cột" | BLOCKER (L2) |
| **C3** Contract chéo service | Cơ chế đồng bộ đúng SYNC (sự kiện/sync/cache); chiều gọi, tên binding, hành vi khi lỗi khớp | Đối bảng SYNC với mục service boundary của spec | Đổi sự kiện thành gọi đồng bộ/cache; thiếu idempotency; bỏ outbox | BLOCKER |
| **C4** Invariant | Mỗi INV có: ai giữ đúng như đã chọn, có test kiểm bằng máy | Tìm INV-ID/tên invariant trong spec và test plan | Invariant thiếu, giữ ở chỗ khác, hoặc chỉ "code giữ" không có test | BLOCKER |
| **C6** Cấu trúc file | Cây file trong spec/ticket khớp FILE; mỗi file đúng một trách nhiệm; giới hạn không bị vượt | So cây đề xuất với bảng FILE; đếm use case/handler/entity trong mỗi file | Gộp nhiều use case vào một file; tách file khác cây đích; import chéo domain | MAJOR (BLOCKER nếu phá ranh giới import) |

## Frontend

| Mã | Kiểm gì | Cách kiểm | Dấu hiệu lệch | Mức |
|---|---|---|---|---|
| **C8** State ownership | Mọi state của spec khớp bảng State ownership: loại, chủ sở hữu | Liệt kê state trong spec, đối từng dòng bảng | State mới chưa phân loại; đổi loại (URL → local); copy server data vào local/Context; thêm store | BLOCKER (lỗi vô hình — nâng mức, ghi lý do) |
| **C9** Chia component/module | Cây component/file trong spec khớp Design Record; không import chéo feature; primitive mới có ≥2 nơi dùng | So cây; grep import chéo feature trong cây đề xuất | Component nhồi nhiều trách nhiệm; đặt sai feature/`shared`; primitive "cho tiện" | MAJOR (import chéo feature → BLOCKER) |
| **C13** Luồng dữ liệu | Query key gốc, optimistic/invalidate/rollback khớp mục Luồng dữ liệu | Đối từng mutation | Key khác; thêm optimistic không có rollback; invalidate sai nhánh | BLOCKER nếu optimistic thiếu rollback; MAJOR còn lại |
| **C14** Route & search params | Route, search params + zod khớp mục Ranh giới màn hình | Đối bảng route | Route mới; param lạ; nested tab | MAJOR |

## Cách ghi finding

- Cột **Design Record** luôn dẫn ID (OWN2, INV1, FILE3, D4, state ID…), kèm file.
- Nếu **không tìm được ID** cho một phần tử spec → mã **C7**, ghi "không truy được về Design Record".
- Nếu spec và Design Record lệch nhưng Design Record có vẻ sai (mâu thuẫn ràng buộc DECIDED/luật cứng) → vẫn ghi lệch, thêm một **QUESTION** "Design Record có cần mở lại?". Không coi spec đúng.
