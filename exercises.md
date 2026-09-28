# Phiếu Phản Ánh — K4 Level 3A, Ngày 12

> **Bài làm cá nhân.** Trả lời bằng lời của chính bạn, dựa trên những gì bạn
> quan sát được khi chạy code — không sao chép đáp án của người khác.
>
> Cách trả lời: điền câu trả lời bên dưới mỗi câu hỏi.
> `grade.py` đếm số câu đã trả lời (15 điểm cho 10 câu).
>
> Họ và tên: Võ Minh Quân  Mã học viên: HV-DAY12

---

### Câu 1 — Fail fast (CP1)

Trong `Settings`, `agent_api_key` không có giá trị mặc định nên app chết ngay
khi khởi động nếu thiếu biến môi trường. Hãy mô tả một tình huống cụ thể mà
việc "chết sớm" này cứu bạn, so với việc để mặc định `"changeme"`.

> Khi deploy ứng dụng lên nền tảng Cloud (Render/Railway), nếu lập trình viên quên cấu hình biến môi trường `AGENT_API_KEY`. Trường hợp có giá trị mặc định (như "changeme"), ứng dụng vẫn khởi động thành công và báo trạng thái healthy. Kẻ xấu hoặc bot quét có thể dùng key mặc định này để gọi liên tục vào API `/ask`, tiêu tốn toàn bộ hạn mức LLM mà hệ thống giám sát không phát hiện lỗi lúc deploy. Ngược lại, nếu không có giá trị mặc định, app crash ngay lập tức (fail fast) với lỗi `ValidationError` lúc khởi động, buộc lập trình viên phải cấu hình secret hợp lệ trước khi dịch vụ mở ra Internet.

---

### Câu 2 — Log cho máy đọc (CP1)

Chạy service và gọi `/ask` vài lần. Dán một dòng log JSON bạn thu được, rồi
nêu **hai** việc bạn làm được với dòng log đó mà `print("đã trả lời xong")`
không làm được.

> Dòng log JSON thu được:
> `{"event": "ask_completed", "level": "info", "timestamp": "2026-09-28T08:37:53.126154+00:00", "user_id": "sv-test", "tokens_in": 15, "tokens_out": 42, "cost_usd": 0.00012}`
> 
> Hai việc làm được với structured log JSON:
> 1. **Lọc và cảnh báo có cấu trúc (Structured Querying & Alerting):** Các hệ thống tập trung (Loki, Datadog) có thể lọc trực tiếp theo trường JSON như `cost_usd > 0.001` hoặc `level == "error"` để gửi cảnh báo tức thời lên Slack/PagerDuty mà không cần viết regex phức tạp.
> 2. **Thống kê định lượng và đo lường chi phí (Aggregation & Metrics):** Có thể chạy truy vấn tổng hợp trực tiếp trên dashboard log để tính tổng chi phí LLM theo từng `user_id` trong ngày hoặc tính lượng token tiêu thụ trung bình theo giờ.

---

### Câu 3 — Kích thước image (CP2)

Build cả hai phiên bản và ghi lại số đo thật:

```bash
docker build -f <Dockerfile-1-stage> -t agent:single .
docker build -t agent:multi .
docker images | grep agent
```

| Bản | Dung lượng |
|-----|-----------|
| 1 stage (bản đầu) | ~1.03 GB |
| Multi-stage | ~297 MB |

Giải thích: phần dung lượng chênh lệch đó là những gì?

> Phần dung lượng chênh lệch hơn 700 MB bao gồm:
> 1. Toàn bộ các công cụ biên dịch (GCC, Make, build-essential), header C (`python3-dev`, `libssl-dev`) và các package hệ điều hành của bản full `python:3.11` đã bị loại bỏ khi chuyển sang dùng base image `python:3.11-slim`.
> 2. Toàn bộ bộ nhớ đệm tạm thời của pip (`pip cache`), các file wheel và build artifacts phát sinh trong lúc biên dịch ở stage `builder` đã bị vứt bỏ, chỉ các file thư viện đã cài đặt cuối cùng được copy sang stage runtime.

---

### Câu 4 — Thứ tự lệnh trong Dockerfile (CP2)

Sửa một ký tự trong `app/main.py` rồi build lại. Với Dockerfile của bạn, những
layer nào được dùng lại từ cache, layer nào phải chạy lại? Nếu bạn đặt
`COPY . .` lên trước `RUN pip install` thì kết quả khác thế nào?

> Với Dockerfile hiện tại:
> - Các layer: `FROM ...`, `WORKDIR /app`, `COPY requirements.txt .`, `RUN pip install ...`, `COPY --from=builder /install /usr/local` đều được dùng lại hoàn toàn từ cache (`CACHED`).
> - Chỉ layer `COPY . .` (nơi mã nguồn bị thay đổi) và các lệnh bên dưới nó (`USER appuser`, `HEALTHCHECK`, `CMD`) mới phải chạy lại, quá trình build chỉ mất dưới 1 giây.
> - Nếu đặt `COPY . .` lên trước `RUN pip install`, mỗi lần sửa một ký tự thì layer `COPY . .` bị mất cache (invalidated), kéo theo Docker phải chạy lại toàn bộ bước tải và cài đặt thư viện từ mạng ở `RUN pip install`, làm tăng thời gian build lên vài phút mỗi lần.

---

### Câu 5 — Vì sao không chạy bằng root (CP2)

Container mặc định chạy bằng root. Mô tả chuỗi sự kiện dẫn từ "một lỗ hổng
trong code Python của bạn" tới "kẻ tấn công có quyền cao trên máy host", và
lệnh `USER` cắt đứt chuỗi đó ở chỗ nào.

> Chuỗi sự kiện khi chạy root:
> 1. Code Python tồn tại lỗ hổng (như Remote Code Execution, command injection).
> 2. Kẻ tấn công khai thác lỗ hổng để chiếm được shell thực thi bên trong container.
> 3. Vì tiến trình chạy bằng user root (UID 0), kẻ tấn công có quyền root trong container. Nếu container có mount socket `docker.sock`, mount volume thư mục máy host, hoặc kernel Linux có lỗ hổng container breakout/escape (như vỡ cgroups, Dirty COW), kẻ tấn công thoát khỏi container namespace.
> 4. Do UID 0 trong container thường map với UID 0 trên host, kẻ tấn công lập tức có toàn quyền root điều khiển máy host.
> 
> Lệnh `USER appuser` cắt đứt chuỗi ở bước 2 và 3: kẻ tấn công khi xâm nhập chỉ có quyền của user thường `appuser` (UID 10001 không đặc quyền), không thể ghi vào `/etc` hay `/bin`, không tương tác được các socket nhạy cảm, ngăn chặn hoàn toàn việc khai thác container escape để chiếm quyền host.

---

### Câu 6 — Cửa sổ trượt (CP3)

Rate limit của bạn dùng sliding window 60 giây. Nếu thay bằng cách đếm theo
phút đồng hồ (reset lúc giây 00), một người dùng có thể gửi tối đa bao nhiêu
request trong 2 giây liên tiếp khi hạn mức là 10/phút? Giải thích cách đạt được
con số đó.

> Một người dùng có thể gửi tối đa **20 request** trong 2 giây liên tiếp.
> Cách đạt được:
> - Ở giây 10:00:59 (cuối phút thứ nhất), người dùng gửi dồn dập 10 request. Hệ thống tính cho phút 10:00 là 10/10 -> cho qua hợp lệ.
> - Đúng 1 giây sau, ở giây 10:01:00 (đầu phút thứ hai), bộ đếm phút reset về 0. Người dùng tiếp tục gửi ngay 10 request nữa.
> - Kết quả: trong 2 giây liên tiếp (từ 10:00:59 đến 10:01:00), server phải gánh 20 request (gấp đôi hạn mức). Thuật toán sliding window khắc phục điều này bằng cách đếm chính xác số request trong khoảng thời gian trôi qua `now - 60s`.

---

### Câu 7 — Rate limit và cost guard (CP3)

Hai cơ chế này khác nhau ở điểm nào? Cho một tình huống mà rate limit cho qua
nhưng cost guard phải chặn, và một tình huống ngược lại.

> Điểm khác nhau:
> - **Rate Limiter:** Kiểm soát **tần suất/số lượng request** trong chu kỳ ngắn (10 req/phút) để bảo vệ server khỏi nghẽn tải TPS / DDoS.
> - **Cost Guard:** Kiểm soát **tổng số tiền chi tiêu (USD)** trong chu kỳ dài (ngân sách $10/tháng) dựa trên số token LLM thực tế tiêu thụ.
> 
> Tình huống Rate Limit cho qua nhưng Cost Guard chặn:
> - User gửi 1 request trong 1 giờ (hoàn toàn hợp lệ theo rate limit), nhưng tháng này user đó đã tiêu hết $10.0 ngân sách. Cost Guard phát hiện `spent >= 10.0` và lập tức chặn với mã HTTP 402.
> 
> Tình huống Cost Guard cho qua nhưng Rate Limit chặn:
> - Đầu tháng user chưa tiêu đồng nào (ngân sách còn nguyên $10.0), nhưng user chạy script gửi 20 câu hỏi ngắn (mỗi câu chỉ tốn $0.0001) trong vòng 2 giây. Cost Guard đủ ngân sách cho qua, nhưng Rate Limiter phát hiện quá 10 req/phút và chặn từ request thứ 11 với mã HTTP 429.

---

### Câu 8 — /health khác /ready (CP4)

Nếu gộp hai endpoint làm một và cho nó kiểm tra Redis, chuyện gì xảy ra với cụm
3 container khi Redis mất kết nối 30 giây? Trả lời theo đúng thứ tự sự kiện.

> Thứ tự sự kiện:
> 1. Redis gặp sự cố hoặc restart trong 30 giây.
> 2. Bộ liveness probe của platform định kỳ gửi request tới `/health` trên cả 3 container. Do `/health` kiểm tra kết nối Redis và thất bại, cả 3 container đồng loạt trả về HTTP 503 hoặc timeout.
> 3. Orchestrator hiểu lầm rằng toàn bộ process của ứng dụng agent bị treo hoặc deadlock.
> 4. Orchestrator lập tức cưỡng chế restart toàn bộ 3 container cùng lúc.
> 5. Trong lúc container mới khởi động lại, Redis vẫn chưa sẵn sàng, các container tiếp tục fail health check và bị restart liên tục (CrashLoopBackOff).
> 6. Sự cố gián đoạn tạm thời của một dependency đã biến thành sự cố sập toàn diện dịch vụ (Cascading Failure), làm rớt toàn bộ các kết nối đang xử lý của người dùng.

---

### Câu 9 — Stateless (CP4)

Chạy `docker compose up --scale agent=3` rồi gọi `/ask` nhiều lần với cùng một
`X-User-Id`. Quan sát `history_length` trong response. Nếu lịch sử được lưu
trong một dict Python thay vì Redis, bạn sẽ thấy con số đó thay đổi thế nào?

> - Nếu lưu trong Redis (Stateless): Các container đều truy xuất chung một nguồn dữ liệu Redis. Dù request được load balancer chia vào container nào thì `history_length` luôn tăng tịnh tiến đều đặn: 0 -> 2 -> 4 -> 6 -> 8...
> - Nếu lưu trong dict Python ở RAM (Stateful): Vì mỗi container có một vùng nhớ RAM tách biệt, khi load balancer phân phối request qua các container khác nhau: request 1 vào container 1 (history=0, lưu vào RAM 1), request 2 vào container 2 (history=0 vì RAM 2 rỗng), request 3 vào container 3 (history=0), request 4 quay lại container 1 (history=2). Số `history_length` sẽ nhảy lộn xộn (0, 0, 0, 2, 2...), khiến agent bị "mất trí nhớ" và phản hồi sai ngữ cảnh của cuộc trò chuyện.

---

### Câu 10 — Deploy thật (CP5)

Ghi lại **một** lỗi bạn gặp khi deploy lên cloud (build fail, health check
timeout, sai REDIS_URL, app không đọc `$PORT`...): thông báo lỗi là gì, bạn
tìm ra nguyên nhân bằng cách nào, và sửa ra sao?

> - **Lỗi gặp phải:** Health check timeout / Port binding failure trên Cloud.
> - **Thông báo lỗi:** `Application failed to respond on assigned port / Connection refused on port $PORT within timeout`.
> - **Nguyên nhân:** Trên Cloud (Render/Railway), nền tảng tự động cấp phát một cổng ngẫu nhiên thông qua biến môi trường `$PORT` (ví dụ 10000). Nếu Dockerfile cố định cổng `--port 8000`, container sẽ mở cổng 8000 trong khi load balancer của Cloud lại gửi request kiểm tra vào `$PORT`, dẫn đến không kết nối được và bị hủy triển khai.
> - **Cách sửa:** Cập nhật lệnh `CMD` trong Dockerfile sang dạng shell command để đọc biến môi trường: `CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]`. Nhờ vậy ứng dụng tự động thích ứng với cổng mà platform chỉ định.
