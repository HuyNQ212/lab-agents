# Lab Workspace — Setup & Layout

> File này định nghĩa cấu trúc chuẩn của workspace `personal-lab`. Agents và developers
> phải clone repo theo đúng bảng bên dưới để mọi đường dẫn reference trong tài liệu
> luôn chính xác trên mọi máy.

## Nguyên tắc
- `personal-lab` là **workspace container**, KHÔNG có git root. Mỗi thư mục con là một git repo độc lập.
- Không dùng git submodule / subtree giữa workspace và các repo con.
- Không tự ý đổi tên thư mục đích khi clone.

## Bảng clone chuẩn

| Repo GitHub | Thư mục local | Vai trò |
|---|---|---|
| `HuyNQ212/lab-agents` | `.agents/` | Conventions & instructions cho AI agents |
| `HuyNQ212/lab-docs` | `lab-docs/` | Source of truth về decisions & tài liệu |
| `HuyNQ212/lab-prototype` | `lab-prototype/` | Prototypes HTML/CSS/JS thuần |
| `HuyNQ212/lab-secrets` | `lab-secrets/` | Dev secrets (SOPS + age) |
| `HuyNQ212/lab-gateway` | `services/lab-gateway/` | API Gateway Worker (public entry) |
| `HuyNQ212/lab-identity` | `services/lab-identity/` | Identity Worker + D1 |
| `HuyNQ212/lab-planning` | `services/lab-planning/` | Planning Worker + D1 |
| `HuyNQ212/lab-notification` | `services/lab-notification/` | Notification Worker + D1 |
| `HuyNQ212/lab-user` | `services/lab-user/` | User Worker + D1 |
| `HuyNQ212/lab-portal` | `apps/lab-portal/` | Frontend React + TypeScript + Vite |

## Lệnh clone

```bash
# Từ root workspace personal-lab/
gh repo clone HuyNQ212/lab-docs lab-docs
gh repo clone HuyNQ212/lab-prototype lab-prototype
gh repo clone HuyNQ212/lab-secrets lab-secrets
gh repo clone HuyNQ212/lab-agents .agents

# Services (khi repo tồn tại)
gh repo clone HuyNQ212/lab-gateway services/lab-gateway
gh repo clone HuyNQ212/lab-identity services/lab-identity
gh repo clone HuyNQ212/lab-planning services/lab-planning
gh repo clone HuyNQ212/lab-notification services/lab-notification
gh repo clone HuyNQ212/lab-user services/lab-user

# Frontend (khi repo tồn tại)
gh repo clone HuyNQ212/lab-portal apps/lab-portal
```

`gh repo clone` tự tạo thư mục đích (kể cả `services/xxx` lồng nhau).

## Tạo repo mới

```bash
gh repo create HuyNQ212/lab-<tên> --private
# rồi clone theo bảng ở trên
```

- Backend service repo: đặt tên `lab-<domain>` (không thêm hậu tố `-service`; thành phần "service" đã thể hiện qua vị trí `services/`).
- Frontend repo duy nhất: `lab-portal`.
- Tất cả repo để **private** trừ khi user yêu cầu public.

## Cấu trúc mục tiêu

```
personal-lab/
├── .agents/
├── lab-docs/
├── lab-prototype/
├── lab-secrets/
├── services/
│   ├── lab-gateway/
│   ├── lab-identity/
│   ├── lab-planning/
│   ├── lab-notification/
│   └── lab-user/
└── apps/
    └── lab-portal/
```

## Wrangler & Cloudflare — quy ước per-service

- **Wrangler là devDependency của từng service repo** (`npm i -D wrangler`), KHÔNG cài global. Mỗi repo pin version riêng để ai clone về đều có toolchain nhất quán.
- Script chuẩn trong `package.json` của mỗi service: `"dev": "wrangler dev"`, `"deploy": "wrangler deploy"`, `"cf-typegen": "wrangler types"`.
- **Auth là global per-máy, không per-repo:** `wrangler login` chỉ cần chạy **1 lần duy nhất trên mỗi máy**, token lưu ở user config và dùng chung cho mọi repo. Không yêu cầu login lại trong từng repo.
- **Dự án KHÔNG dùng CI/CD (GitHub Actions).** `ship` trong `.agents/skills/ship/` là cơ quan cưỡng chế gate duy nhất: format → lint → typecheck → test → build, chạy trên máy, trước khi merge + deploy. Lệnh deploy chạy từ máy đã `wrangler login`.
- `wrangler.jsonc` nằm trong từng repo, định nghĩa name/main/compatibility_date/bindings (D1, Service Bindings) riêng của service.
- KHÔNG tự thêm KV, Queues, Durable Objects vào `wrangler.jsonc` — các mục này DEFERRED (xem `lab-docs/decisions/decision-ledger.md`).

## Git identity — quy tắc bắt buộc

Git identity được config **per-repo local** (KHÔNG dùng `--global`), trong file
`.git/config` của từng repo:

```bash
cd <repo>
git config user.name "<your-username>"
git config user.email "<your-email>"
```

**Quan trọng cho agents:** username/email là dữ liệu của từng user, KHÔNG hardcode
hay suy đoán từ bất kỳ nguồn nào (tên repo, owner GitHub, commit cũ...).
Khi config một repo mới, **phải hỏi user để lấy username/email** trước khi chạy lệnh.

## Khi thêm repo mới trong tương lai
1. Hỏi user git username/email (nếu chưa biết) → config per-repo như trên.
2. Cập nhật bảng clone trong file này trước, clone sau.
3. Commit và push thay đổi vào `HuyNQ212/lab-agents` để mọi máy cùng tuân theo một quy ước.
