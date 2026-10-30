# Review protocol — bắt buộc cho mọi ticket

> Dùng ở bước 4–6 của `implement`. Áp cho cả backend và frontend.
> Checklist chấm điểm nằm ở `spec-review/references/<backend|frontend>/checklist.md` — **không nhân bản** ở đây.

## Vấn đề phải giải

**Sub-agent cùng model, cùng repo, cùng spec sẽ có cùng điểm mù.** Nếu chỉ đưa code và nói "review đi", bạn nhận lại bản tóm tắt những gì code đang làm. Reviewer sẽ đọc lại lý trí của implementer và không phát hiện gì.

Giá trị chỉ đến từ ba thứ, cả ba **phải cưỡng chế**:

| Nguồn giá trị | Cách cưỡng chế |
|---|---|
| **Context sạch** | Reviewer **không** nhận reasoning, không nhận lịch sử debug, không nhận "tôi đã cân nhắc X rồi" |
| **Tiêu chí khác** | Reviewer chấm "vi phạm luật nào", không chấm "code có hợp lý không". Câu hỏi khác → phát hiện khác |
| **Không được tự sửa** | Reviewer chạy bằng sub-agent **chỉ đọc** (ví dụ agent `Explore`, không có Edit/Write). Implementer mới sửa, sau khi triage |

Thiếu dòng 1 → bước review là diễn. Thiếu dòng 3 → reviewer "sửa" theo hướng nó thấy đẹp, và vì không ai đọc code, sai lầm đó đi thẳng vào commit.

## Đầu vào của reviewer — chính xác những gì được đưa

| Đưa | Không đưa |
|---|---|
| Nội dung spec section của ticket | Cả file spec nếu không cần |
| Diff toàn bộ ticket: `git add -A && git diff --cached HEAD` (gồm file mới) | Reasoning, comment "tại sao tôi làm thế" |
| Danh sách AC của story mà ticket phủ | Bảng AC → test do implementer tự lập |
| Danh sách luật cứng áp dụng (1–16 hoặc 17–30) | Checklist tự viết lại từ trí nhớ |
| Đường dẫn checklist chính thức | Kết luận của implementer |
| Đường dẫn ảnh Storybook (frontend) | Output gate (để reviewer không tin "đã pass") |

**Không đưa output gate.** Reviewer phải tự chấm, không được suy ra "test đã pass nên đúng".

`HEAD` là commit của ticket trước trên nhánh `feat/<SPEC-ID>` (ticket đầu: merge-base với `origin/main`), nên diff chỉ chứa ticket hiện tại. Không dùng `origin/main...HEAD`: lệnh đó bỏ sót thay đổi chưa commit và kéo theo các ticket trước.

## Lăng kính bắt buộc ngoài checklist — AC và độ đúng spec

Checklist chấm luật; lăng kính này chấm **làm đúng việc**. Reviewer phải báo:

- Mỗi AC của ticket → tên test ánh xạ (file + tên case). AC không có test = finding MAJOR.
- Hành vi lệch hợp đồng trong spec: shape request/response, mã lỗi, trạng thái UI, quy tắc nghiệp vụ. Lệch = finding, mức theo hậu quả.
- Code làm thêm việc ngoài ticket (endpoint, field, component) = finding MAJOR.

## Prompt mẫu — backend

```text
Review diff dưới đây theo checklist: .agents/skills/spec-review/references/backend/checklist.md

Ràng buộc áp dụng: lab-docs/architecture/backend.md §10 và .agents/AGENTS.md luật 1–16.

Chỉ báo cáo finding. Không sửa file. Không đề xuất refactor ngoài checklist.

Mỗi finding gồm: ID, mức (BLOCKER/MAJOR/MINOR/QUESTION), trục, vị trí (file:line),
vấn đề, vì sao (dẫn luật hoặc hậu quả cụ thể), hướng sửa 1–2 câu.

Bắt buộc lập bảng AC → test (file + tên case) và báo mọi hành vi lệch hợp đồng trong spec.

Kết thúc bằng verdict PASS / NEEDS-WORK / BLOCK.

<spec section + danh sách AC>
<git diff --cached HEAD>
```

## Prompt mẫu — frontend

```text
Review diff và ảnh Storybook dưới đây theo checklist:
.agents/skills/spec-review/references/frontend/checklist.md

Ràng buộc: lab-docs/architecture/frontend.md §5–§6 và .agents/AGENTS.md luật 17–30.

Lưu ý: user không đọc source code frontend, chỉ xem giao diện. Lỗi không nhìn thấy
trên giao diện (cache sai, state mồ côi, contract lệch, thiếu test) phải chấm nặng hơn
một mức so với trực giác. Khi nâng mức, ghi lý do trong cột "Vì sao".

Bắt buộc trả lời 4 câu đọc ảnh (xem frontend/workflow.md), mỗi câu kèm tên file ảnh.
Bắt buộc lập bảng AC → test (file + tên case) và báo mọi hành vi lệch hợp đồng trong spec.

Chỉ báo cáo finding. Không sửa file.

<spec section + danh sách AC>
<git diff --cached HEAD>
<đường dẫn apps/lab-portal/docs/delivery/<TICKET-ID>/shots/*.png>
```

## Triage — bắt buộc, không được bỏ

Với **từng** finding, ghi phán quyết và lý do vào `<repo>/docs/delivery/<TICKET-ID>/review-triage.md`:

| Phán quyết | Điều kiện | Hành động |
|---|---|---|
| **ACCEPT** | Dẫn được luật cứng, hoặc hậu quả kỹ thuật cụ thể | Sửa |
| **REJECT** | Sở thích cá nhân, hoặc dẫn luật sai/không tồn tại | Không sửa. Ghi lý do vào `review-triage.md` |
| **ESCALATE** | Finding đúng, **nhưng sửa nghĩa là đổi thiết kế hoặc đổi spec** | Dừng theo giao thức "Dừng giữa chừng" của `SKILL.md`, hỏi qua gói quyết định (`.agents/references/decision-packet.md`) |

### Khi nào một finding là REJECT hợp lệ

- Reviewer dẫn luật không tồn tại, hoặc dẫn sai số luật.
- Reviewer yêu cầu tách file/thêm abstraction mà không nêu hậu quả cụ thể.
- Reviewer yêu cầu pattern khác pattern spec đã chốt.
- Reviewer đề xuất thêm dependency ngoài spec.

**REJECT không phải "bỏ qua".** Phải viết ra lý do. Không có lý do = phải ACCEPT.

### Khi nào một finding là ESCALATE

Đây là mục quan trọng nhất, và là chỗ dễ sai nhất — vì sửa có vẻ dễ nên implementer hay tự làm luôn.

ESCALATE khi finding đụng một trong:

- Shape response hoặc request của API (đổi contract giữa hai phía).
- Schema D1: bảng, cột, kiểu dữ liệu, index.
- Trạng thái UI mà spec không mô tả.
- Chỗ đặt state (server/url/auth/local) khác spec.
- Thứ tự ưu tiên, quy tắc nghiệp vụ, thông điệp hiển thị cho user.
- Có thêm dependency hoặc công nghệ mới.

**Quy tắc:** nếu sửa xong phải cập nhật spec mới đúng → đó là ESCALATE, không phải ACCEPT.

## Tối đa 2 vòng review

Sửa → `lab repo-gate <repo>` lại toàn bộ → review lại diff mới (mọi mức, không chỉ MAJOR+).

Sau vòng 2 vẫn còn finding ACCEPT → dừng theo giao thức, hỏi qua gói quyết định. Lặp vô hạn là dấu hiệu spec hoặc checklist có vấn đề, không phải code.

## Ghi lại triage

`review-triage.md` — mỗi vòng một mục, append, không sửa vòng cũ:

```
## Vòng <n>
| Finding | Mức | Phán quyết | Lý do |
|---|---|---|---|
| <ID> | MAJOR | REJECT | <dẫn luật/spec, một dòng> |

AC → test: <AC> → <file>::<tên case>
```

Commit message chỉ tóm tắt `Review: accepted <n>, rejected <n>, escalated <n>` và trỏ tới file này. Reviewer phiên sau đọc file này; REJECT chỉ nằm trong đầu agent sẽ bị báo lại y nguyên.

## Checklist trước khi kết thúc bước review

- [ ] Reviewer là sub-agent chỉ đọc, không nhận reasoning hay output gate.
- [ ] Diff không rỗng, gồm file mới, và chỉ chứa file của ticket này.
- [ ] Mọi AC của ticket có test ánh xạ; hành vi khớp hợp đồng spec.
- [ ] Reviewer nhận đúng checklist chính thức, không phải bản tự viết.
- [ ] Frontend: reviewer đã nhận đường dẫn ảnh và trả lời đủ 4 câu.
- [ ] Mọi finding có phán quyết ACCEPT / REJECT / ESCALATE.
- [ ] Mọi REJECT có lý do dẫn được, đã ghi vào `review-triage.md`.
- [ ] Không có finding nào bị bỏ im lặng.
- [ ] Finding ESCALATE không bị tự sửa.
- [ ] Gate chạy lại sau mỗi vòng sửa.
