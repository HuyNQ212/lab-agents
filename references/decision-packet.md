# Gói quyết định — cách mọi skill hỏi user

User chỉ đưa yêu cầu và quyết định. Mọi chỗ skill cần user (duyệt, chọn phương án, trả lời câu hỏi mở) đi qua **một** kênh duy nhất dưới đây, không hỏi rải rác trong chat.

## Khi nào dùng

- Có ít nhất một mục cần user quyết định (OPEN, PROPOSED, chọn A/B, duyệt artifact).
- Một lần dừng = một gói. Gom mọi câu hỏi của bước hiện tại vào cùng một gói; không dừng nhiều lần cho cùng một bước.
- Không dùng cho việc agent tự quyết được bằng luật đã có (AGENTS.md, Design Record FROZEN, design-principles).

## Hình thức

Đăng thành **trang HTML riêng tư** (Artifact) và gửi liên kết. Phiên có thể chạy từ xa, user không mở được file local.

Đầu trang, trước mọi nội dung khác:

1. **Một câu**: đang ở bước nào của ID nào (`architecture-design PLN-E01`, `spec-review GTW-E01`...).
2. **Danh sách câu hỏi đánh số** `Q1, Q2, ...`. Mỗi câu gồm:
   - câu hỏi một dòng;
   - các phương án, phương án đề xuất đứng đầu và ghi `(đề xuất)`;
   - lý do kỹ thuật ngắn cho đề xuất, và hệ quả nếu chọn phương án khác;
   - mục bị ảnh hưởng (ID capability, mục Design Record, ticket).
3. **Cách trả lời**: "Trả lời theo dạng `Q1: A, Q2: đồng ý, Q3: <ý khác>`. Câu không trả lời giữ nguyên PROPOSED."

Phần dưới là bối cảnh và bản nháp đầy đủ để user tra khi cần — không bắt user đọc hết mới trả lời được.

Trong chat chỉ gửi: liên kết, số câu hỏi, và câu đề xuất của từng câu (một dòng mỗi câu).

## Sau khi user trả lời

- Câu được trả lời → ghi vào tài liệu nguồn với nhãn `DECIDED <yyyy-mm-dd>` và nhắc lại nguyên văn lựa chọn của user. Quyết định khó đảo ngược thì ghi thêm dòng vào `lab-docs/decisions/decision-ledger.md`.
- Câu không trả lời → giữ `PROPOSED`/`OPEN`. Không tự nâng thành DECIDED, kể cả khi "rõ ràng".
- User trả lời "duyệt"/"ok hết" cho cả gói → mọi đề xuất trong gói thành DECIDED.
- Cập nhật trang (cùng URL) để ghi lại câu trả lời, không tạo trang mới.

## Không được

- Hỏi câu đã có quyết định trong ledger hoặc Design Record FROZEN.
- Đặt câu hỏi mở không có phương án đề xuất.
- Tiếp tục bước sau khi gói còn câu chặn (gate của bước sau sẽ FAIL).
