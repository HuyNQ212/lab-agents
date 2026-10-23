# AGENTS.md — Lab Workspace

> Hướng dẫn cho AI agents làm việc trong workspace `personal-lab`.
> Đọc file này TRƯỚC khi thực hiện bất kỳ thao tác nào.

## Workspace layout

Workspace `personal-lab` là multi-repo container, KHÔNG có git root.
Mỗi thư mục con là một git repo độc lập của tài khoản GitHub `HuyNQ212`.

**Quan trọng:** Cấu trúc thư mục và quy tắc clone được định nghĩa trong
[setup.md](setup.md). LUÔN đọc `setup.md` trước khi clone, tạo repo,
hoặc tham chiếu đường dẫn — không đoán layout từ trí nhớ phiên chat.

## Source of truth

| Nội dung | Nơi tham chiếu |
|---|---|
| Quyết định product & kiến trúc | `lab-docs/README.md`, `lab-docs/decisions/decision-ledger.md` |
| Kiến trúc hệ thống | `lab-docs/architecture/system-overview.md` |
| Frontend & UX | `lab-docs/architecture/frontend.md` |
| IAM | `lab-docs/architecture/iam.md` |
| Local dev & secrets | `lab-docs/architecture/local-development.md` |
| Workflow phân rã giao việc | `lab-docs/frameworks/delivery-breakdown.md` |
| Prototypes đã publish | `lab-prototype/` (repo `lab-prototype`) |
| Production code | `services/lab-*` (Workers), `apps/lab-portal` (React) |

- Prototype được publish vào `lab-prototype`; production code là source of truth về implementation.
- `lab-docs` là source of truth về các quyết định — KHÔNG tự diễn giải.

## Quy tắc làm việc

1. **Status vocabulary:** chỉ có DECIDED là ràng buộc. PROPOSED/ASSUMED/DEFERRED/OPEN/OUT OF SCOPE không được tự nâng cấp thành DECIDED.
2. **Workflow:** BRAINSTORM → Product Brief → BREAKDOWN → Spec/Code. Chỉ tạo Spec/Plan/Code khi user yêu cầu rõ ràng.
3. **Cloudflare:** backend multi-repo, mỗi service là một Worker + D1 riêng, private, gọi nhau qua Service Bindings. API Gateway là public entry duy nhất. KHÔNG tự thêm KV, Queues, Durable Objects, Redis — các mục này DEFERRED.
4. **Không commit secrets** (plaintext, age private key). Dev secrets dùng SOPS trong `lab-secrets/`.
5. **Chạy git từ đúng repo**: luôn `cd` vào thư mục repo con trước khi chạy lệnh git. Workspace root không có git.
6. **Thêm repo mới:** cập nhật bảng trong `setup.md` trước, clone sau, rồi commit vào repo này.
7. **Git identity:** config per-repo local theo `setup.md`. Username/email là dữ liệu của user — PHẢI hỏi user để lấy giá trị, không hardcode hay suy đoán.

## Đọc tài liệu trước khi code

Trước khi làm việc với bất kỳ service hay frontend nào:
1. Đọc `lab-docs/README.md` và `lab-docs/decisions/decision-ledger.md`.
2. Đọc tài liệu kiến trúc liên quan (bảng ở trên).
3. Nếu làm UI: đọc `lab-docs/architecture/frontend.md` và tham chiếu prototype trong `lab-prototype/`.

Nếu một tài liệu không tồn tại hoặc chưa truy cập được, đánh dấu là chưa
kiểm chứng — không suy diễn "chưa có" từ một path duy nhất.
