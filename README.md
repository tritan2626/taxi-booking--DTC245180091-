# 🚖 Taxi Booking Platform - Dockerized Microservices & Observability

Hệ thống quản lý đặt xe taxi (Taxi Booking System) hoàn chỉnh được đóng gói bằng Docker và Docker Compose. Dự án tích hợp đầy đủ Backend Node.js/Express, Cơ sở dữ liệu PostgreSQL, Giao diện quản trị pgAdmin, Frontend Web UI tương tác trực tiếp, Nginx Reverse Proxy (có cơ chế Rate Limiting & Security Hardening), cùng hệ sinh thái giám sát toàn diện gồm Prometheus, Grafana, Loki và Promtail.

---

## 📌 1. Danh sách các dịch vụ & Cổng truy cập (Port Mappings)

| Dịch vụ | Công nghệ | Cổng Host (Port) | Mô tả |
| :--- | :--- | :--- | :--- |
| **Frontend Web UI** | HTML5 / CSS / JS | `http://localhost` | Giao diện đặt xe và quản lý chuyến đi trực quan |
| **Reverse Proxy** | Nginx Alpine | `http://localhost:80` | Điểm truy cập chính, cân bằng tải, Rate Limiting & Security Headers |
| **Backend API** | Node.js + Express | `http://localhost:5000` | RESTful API CRUD và xuất Prometheus Metrics (`/metrics`) |
| **Database** | PostgreSQL 16 | `localhost:5432` | Lưu trữ dữ liệu khách hàng, tài xế, chuyến đi |
| **DB Admin UI** | pgAdmin 4 | `http://localhost:5050` | Giao diện quản trị PostgreSQL trực quan |
| **Metrics Monitor** | Prometheus | `http://localhost:9090` | Thu thập time-series metrics định kỳ từ Backend |
| **Log Aggregator** | Grafana Loki | `http://localhost:3100` | Gom và đánh chỉ mục log tập trung |
| **Log Collector** | Promtail | `Internal (9080)` | Đọc log từ Nginx & Docker containers gửi về Loki |
| **Dashboard** | Grafana | `http://localhost:3000` | Trực quan hóa Metrics & Logs với Dashboard dựng sẵn |

---

## 🏗️ 2. Cấu trúc thư mục dự án

```text
taxibooking/
├── .env.example                               # Biến môi trường mẫu
├── .env                                       # Cấu hình môi trường thực thi
├── .gitignore                                 # Bỏ qua tệp nhạy cảm & artifacts
├── docker-compose.yml                         # Tệp dựng 8 dịch vụ container & 2 mạng cô lập
├── README.md                                  # Hướng dẫn chi tiết sử dụng & truy vấn LogQL
├── backend/
│   ├── Dockerfile                             # Container build cho Backend (USER node non-root)
│   ├── .dockerignore
│   ├── package.json                           # Khai báo thư viện & dependencies
│   └── src/
│       ├── app.js                             # Khởi tạo Express, static public & Middleware
│       ├── server.js                          # Entrypoint & Graceful Shutdown
│       ├── public/
│       │   └── index.html                     # Giao diện Web Đặt xe & Quản lý chuyến đi
│       ├── config/
│       │   └── db.js                          # Kết nối PostgreSQL Pool & migration tự động
│       ├── controllers/
│       │   ├── customerController.js          # Nghiệp vụ Khách hàng (Customers)
│       │   ├── driverController.js            # Nghiệp vụ Tài xế (Drivers)
│       │   └── rideController.js              # Nghiệp vụ Chuyến đi (Rides & Status)
│       ├── middlewares/
│       │   ├── metrics.js                     # Cấu hình prom-client thu thập metrics
│       │   └── errorHandler.js                # Xử lý lỗi tập trung & 404
│       ├── migrations/
│       │   └── init.sql                       # Tạo bảng dữ liệu & nạp dữ liệu mẫu
│       └── routes/
│           ├── customerRoutes.js
│           ├── driverRoutes.js
│           └── rideRoutes.js
├── nginx/
│   └── nginx.conf                             # Reverse Proxy, Security Headers & Rate Limiting
├── prometheus/
│   └── prometheus.yml                         # Target cấu hình scrape /metrics từ backend
├── loki/
│   └── loki-config.yml                        # Cấu hình lưu trữ và indexing log Loki
├── promtail/
│   └── promtail-config.yml                    # Cấu hình thu gom log đẩy về Loki (job=varlogs)
└── grafana/
    └── provisioning/
        ├── datasources/
        │   └── datasources.yml                # Tự động nạp sẵn Prometheus & Loki
        └── dashboards/
            ├── dashboard-provider.yml         # Tự động nạp Dashboard
            └── taxi-dashboard.json            # Dashboard mẫu trực quan hóa hệ thống
```

---

## 🚀 3. Hướng dẫn khởi chạy nhanh

### Yêu cầu tiên quyết:
- Đã cài đặt **Docker** & **Docker Compose** (Docker Desktop trên Windows/macOS hoặc Docker Engine trên Linux).

### Bước 1: Khởi động toàn bộ cụm dịch vụ
Mở terminal tại thư mục gốc dự án:
```bash
docker compose up -d --build
```

### Bước 2: Kiểm tra trạng thái các container
```bash
docker compose ps
```
Tất cả các container sẽ hiển thị trạng thái `running` (hoặc `healthy` đối với cơ sở dữ liệu `postgres` và `backend`).

### Bước 3: Xem log theo thời gian thực (nếu cần)
```bash
docker compose logs -f backend
```

---

## 💻 4. Giao diện Web Người Dùng (Frontend Web UI)

Dự án cung cấp sẵn giao diện Web responsive tại tệp [backend/src/public/index.html](file:///c:/Users/TRAN%20XUAN%20TRI/Desktop/taxibooking/backend/src/public/index.html), được phục vụ trực tiếp qua Nginx Reverse Proxy tại địa chỉ:
👉 **`http://localhost`**

### Các tính năng chính trên giao diện:
1. **Form Đặt Chuyến Xe Mới:**
   - Nhập `customer_id` (hỗ trợ nút chọn nhanh Khách hàng mẫu #1, #2, #3).
   - Nhập `pickup_location` (Điểm đón) và `dropoff_location` (Điểm đến).
   - Nhập `fare` (Cước phí VNĐ).
   - Bấm nút **"Xác Nhận Đặt Xe"** để gọi API `POST /api/rides`.
2. **Bảng Danh Sách Chuyến Xe Trực Quan:**
   - Tự động gọi API `GET /api/rides` để lấy danh sách các chuyến xe hiện có trong database.
   - Hiển thị đầy đủ thông tin: Mã chuyến, Khách hàng, Điểm đón/trả, Cước phí, Trạng thái (Badge màu) và Thời gian đặt.
   - Bộ lọc theo trạng thái (`PENDING`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
3. **Thao Tác Chuyển Đổi Trạng Thái Nhanh:**
   - Cạnh mỗi chuyến xe có 2 nút thao tác nhanh:
     - Nút **"Xong"**: Chuyển trạng thái sang `COMPLETED` (gọi `PATCH /api/rides/:id/status`).
     - Nút **"Hủy"**: Chuyển trạng thái sang `CANCELLED` (gọi `PATCH /api/rides/:id/status`).
   - Khi trạng thái thay đổi, hệ thống vừa cập nhật database, vừa kích hoạt Counter Metric `taxibooking_ride_status_transitions_total` trên Prometheus.

---

## 📡 5. Tài liệu RESTful API Chi Tiết

Bạn có thể gọi trực tiếp qua cổng Nginx (`http://localhost`) hoặc cổng Backend (`http://localhost:5000`).

### 5.1. Hệ thống & Giám sát
- **Giao diện Web:**
  ```bash
  curl http://localhost/
  ```
- **Thông tin API (JSON):**
  ```bash
  curl http://localhost/api-info
  ```
- **Health Check:**
  ```bash
  curl http://localhost/health
  ```
- **Prometheus Metrics (prom-client):**
  ```bash
  curl http://localhost/metrics
  ```

---

### 5.2. Quản lý Khách hàng (`/api/customers`)

- **Lấy danh sách khách hàng:**
  ```bash
  curl -X GET http://localhost/api/customers
  ```
- **Lấy chi tiết 1 khách hàng:**
  ```bash
  curl -X GET http://localhost/api/customers/1
  ```
- **Tạo mới khách hàng:**
  ```bash
  curl -X POST http://localhost/api/customers \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Le Thi Mai",
      "phone": "0988112233",
      "email": "lethimai@example.com"
    }'
  ```
- **Cập nhật khách hàng:**
  ```bash
  curl -X PUT http://localhost/api/customers/1 \
    -H "Content-Type: application/json" \
    -d '{"name": "Nguyen Van A (VIP)"}'
  ```
- **Xóa khách hàng:**
  ```bash
  curl -X DELETE http://localhost/api/customers/3
  ```

---

### 5.3. Quản lý Tài xế (`/api/drivers`)

- **Lấy danh sách tài xế (có thể lọc theo status `AVAILABLE`, `BUSY`, `OFFLINE`):**
  ```bash
  curl -X GET "http://localhost/api/drivers?status=AVAILABLE"
  ```
- **Thêm mới tài xế:**
  ```bash
  curl -X POST http://localhost/api/drivers \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Tran Van Binh",
      "phone": "0977223344",
      "license_number": "B2-998877",
      "status": "AVAILABLE",
      "rating": 5.0
    }'
  ```
- **Cập nhật tài xế:**
  ```bash
  curl -X PUT http://localhost/api/drivers/1 \
    -H "Content-Type: application/json" \
    -d '{"status": "BUSY"}'
  ```
- **Xóa tài xế:**
  ```bash
  curl -X DELETE http://localhost/api/drivers/3
  ```

---

### 5.4. Quản lý Chuyến đi (`/api/rides`) & Cập nhật trạng thái

- **Lấy danh sách chuyến đi (kèm thông tin khách hàng và tài xế):**
  ```bash
  curl -X GET http://localhost/api/rides
  ```
- **Lấy danh sách chuyến đi đang ở trạng thái `PENDING`:**
  ```bash
  curl -X GET "http://localhost/api/rides?status=PENDING"
  ```
- **Tạo chuyến đi mới (Mặc định trạng thái là `PENDING`):**
  ```bash
  curl -X POST http://localhost/api/rides \
    -H "Content-Type: application/json" \
    -d '{
      "customer_id": 1,
      "pickup_location": "Sân bay Tân Sơn Nhất, TP.HCM",
      "dropoff_location": "Chợ Bến Thành, Quận 1, TP.HCM",
      "fare": 135000,
      "status": "PENDING"
    }'
  ```
- **Cập nhật trạng thái chuyến đi sang `COMPLETED` hoặc `CANCELLED`:**
  ```bash
  curl -X PATCH http://localhost/api/rides/1/status \
    -H "Content-Type: application/json" \
    -d '{"status": "COMPLETED"}'
  ```
- **Cập nhật thông tin chi tiết chuyến đi:**
  ```bash
  curl -X PUT http://localhost/api/rides/1 \
    -H "Content-Type: application/json" \
    -d '{"fare": 140000}'
  ```
- **Hủy/Xóa chuyến đi:**
  ```bash
  curl -X DELETE http://localhost/api/rides/1
  ```

---

## 🛡️ 6. Bảo Mật & Hardening Hệ Thống (Security & Network Isolation)

Dự án áp dụng đầy đủ các kỹ thuật bảo mật ở nhiều tầng (Defense in Depth):

### 6.1. Nginx Hardening & Security Headers
Cấu hình tại [nginx/nginx.conf](file:///c:/Users/TRAN%20XUAN%20TRI/Desktop/taxibooking/nginx/nginx.conf):
- **Ẩn thông tin phiên bản Nginx:** `server_tokens off;` ngăn kẻ tấn công thu thập phiên bản Nginx để khai thác lỗ hổng đã biết (CVE).
- **Security Headers bắt buộc:**
  + `add_header X-Frame-Options "SAMEORIGIN" always;`: Ngăn chặn tấn công Clickjacking bằng cách cấm nhúng trang web vào iframe trên tên miền khác.
  + `add_header X-XSS-Protection "1; mode=block" always;`: Kích hoạt bộ lọc chống Cross-Site Scripting (XSS) trên trình duyệt cũ.
  + `add_header X-Content-Type-Options "nosniff" always;`: Ngăn trình duyệt tự ý đoán định dạng MIME (MIME-sniffing), giảm nguy cơ thực thi mã độc giả dạng tệp tin tĩnh.
  + `add_header Referrer-Policy "no-referrer-when-downgrade" always;`: Bảo vệ thông tin nhạy cảm trong URL khi chuyển hướng.
- **Rate Limiting:**
  + Giới hạn tối đa **10 requests/giây** cho mỗi IP client (`rate=10r/s`), bộ đệm `burst=20`.
  + Trả về phản hồi JSON an toàn kèm mã `429 Too Many Requests`:
    ```json
    {
      "success": false,
      "statusCode": 429,
      "error": "Too Many Requests",
      "message": "Rate limit exceeded. Maximum 10 req/s. Please slow down."
    }
    ```

### 6.2. Docker Hardening (Non-root User)
- Trong [backend/Dockerfile](file:///c:/Users/TRAN%20XUAN%20TRI/Desktop/taxibooking/backend/Dockerfile), lệnh `USER node` được khai báo ngay trước lệnh `CMD ["npm", "start"]`.
- Container chạy với quyền tài khoản `node` không có đặc quyền root, triệt tiêu nguy cơ chiếm quyền điều khiển host (Container Escape) nếu ứng dụng có lỗ hổng.

### 6.3. Docker Network Isolation (Cô lập mạng 2 lớp)
Hệ thống được phân tách thành 2 mạng Bridge riêng biệt trong [docker-compose.yml](file:///c:/Users/TRAN%20XUAN%20TRI/Desktop/taxibooking/docker-compose.yml):
- **`frontend-net`**: Mạng công khai bên ngoài.
  - Chứa `nginx` (cổng 80) và `backend`.
- **`backend-net`**: Mạng nội bộ khép kín.
  - Chứa `backend`, `postgres`, `pgadmin`, `prometheus`, `loki`, `promtail`, `grafana`.

```text
               [ INTERNET / CLIENT ]
                         │
                         ▼ (Port 80)
                ┌─────────────────┐
                │   taxi_nginx    │ (Chỉ nối frontend-net)
                └────────┬────────┘
                         │
        ═════════════════╪═════════════════  [frontend-net]
                         │
                ┌────────┴────────┐
                │  taxi_backend   │ (Nối frontend-net & backend-net)
                └────────┬────────┘
                         │
        ═════════════════╪═════════════════  [backend-net]
                         │
       ┌─────────────────┼─────────────────────────┐
       ▼                 ▼                         ▼
┌──────────────┐  ┌──────────────┐         ┌──────────────┐
│taxi_postgres │  │taxi_pgadmin  │         │ Observability│
│  (Database)  │  │   (Admin)    │         │(Prom/Grafana/│
└──────────────┘  └──────────────┘         │ Loki/Promtail)
                                           └──────────────┘
```
> [!NOTE]
> Service `postgres` **chỉ nối mạng `backend-net`** và hoàn toàn không thể bị truy cập trực tiếp từ phía `nginx`, đảm bảo an toàn tuyệt đối cho cơ sở dữ liệu.

---

## 📊 7. Giám sát & Quản trị Hệ sinh thái Observability

### 7.1. Prometheus (`http://localhost:9090`)
Thu thập metrics từ backend mỗi 3 giây:
- `taxibooking_http_requests_total`: Số lượng request HTTP phân theo method, route, mã phản hồi.
- `taxibooking_http_request_duration_seconds`: Phân vị thời gian phản hồi API.
- `taxibooking_ride_status_transitions_total`: Số lượt chuyển đổi trạng thái chuyến xe.
- `taxibooking_active_rides_count`: Số chuyến xe hiện có theo từng trạng thái.

### 7.2. Grafana Dashboard (`http://localhost:3000`)
- **Tài khoản đăng nhập mặc định:**
  - Username: `admin`
  - Password: `admin`
- **Dashboard dựng sẵn:** Vào mục **Dashboards** > **Taxi Booking** > chọn **"Taxi Booking System Dashboard"**.
- Tự động nạp sẵn 2 Datasources **Prometheus** và **Loki**, biểu đồ trực quan hóa Real-time throughput, latency p95/p50, phân bổ trạng thái chuyến xe và khung xem live logs.

### 7.3. Tra cứu Log trên Grafana Loki với LogQL
Truy cập **Grafana** (`http://localhost:3000`) > menu bên trái chọn **Explore** (hoặc truy cập thẳng `http://localhost:3000/explore`), chọn Datasource **Loki** ở góc trên cùng.

Dưới đây là **3 câu truy vấn LogQL mẫu** phục vụ tra cứu và kiểm toán hệ thống theo đúng yêu cầu đề tài:

#### 1️⃣ Truy vấn toàn bộ luồng logs hệ thống:
```logql
{job="varlogs"}
```
- **Ý nghĩa & Mục đích:** Sử dụng Stream Selector `{job="varlogs"}` để trích xuất toàn bộ dòng log được Promtail thu thập từ hệ thống container (Backend, Nginx, PostgreSQL) và tệp tin log hệ thống.
- **Ứng dụng:** Quan sát toàn cảnh hoạt động của hệ thống theo thời gian thực (Live Tail).

#### 2️⃣ Lọc các dòng log ghi nhận lỗi:
```logql
{job="varlogs"} |= "error"
```
- **Ý nghĩa & Mục đích:** Sử dụng bộ lọc dòng (Line Filter) `|=` để tìm kiếm chính xác các dòng log có chứa chuỗi ký tự `"error"`.
- **Ứng dụng:** Phát hiện nhanh các lỗi xử lý trong mã nguồn backend, lỗi truy vấn cơ sở dữ liệu PostgreSQL hoặc lỗi kết nối.

#### 3️⃣ Lọc log Backend hoặc các phương thức HTTP GET / POST bằng Regex:
```logql
{job="varlogs"} |~ "taxi_backend|GET|POST"
```
- **Ý nghĩa & Mục đích:** Sử dụng bộ lọc biểu thức chính quy (Regex Filter) `|~` để tìm các dòng log xuất phát từ container `taxi_backend` hoặc các dòng HTTP access log chứa phương thức `GET` hoặc `POST`.
- **Ứng dụng:** Phân tích lưu lượng truy cập API, theo dõi các yêu cầu đặt xe (`POST /api/rides`) và tra cứu danh sách chuyến xe (`GET /api/rides`).

#### Bảng tổng hợp cú pháp bộ lọc dòng trong LogQL:
| Toán tử | Tên gọi | Mô tả chức năng | Ví dụ |
| :--- | :--- | :--- | :--- |
| `|=` | Line contains | Dòng log **phải chứa** chuỗi con | `{job="varlogs"} \|= "error"` |
| `!=` | Line does not contain | Dòng log **không chứa** chuỗi con | `{job="varlogs"} != "debug"` |
| `\|~` | Regex match | Dòng log **khớp** biểu thức chính quy | `{job="varlogs"} \|~ "taxi_backend\|GET\|POST"` |
| `!~` | Regex does not match | Dòng log **không khớp** biểu thức chính quy | `{job="varlogs"} !~ "health"` |

---

### 7.4. pgAdmin (`http://localhost:5050`)
- **Tài khoản đăng nhập pgAdmin:**
  - Email: `admin@taxi.com`
  - Password: `admin`
- **Kết nối vào PostgreSQL:**
  - Nhấp chuột phải vào `Servers` > `Register` > `Server...`
  - Tab **General**: Đặt Name bất kỳ (VD: `Taxi Database`)
  - Tab **Connection**:
    - Host name/address: `postgres`
    - Port: `5432`
    - Maintenance database: `taxidb`
    - Username: `taxi_user`
    - Password: `taxi_password`
  - Nhấn **Save** để bắt đầu quản trị cơ sở dữ liệu.

---

## 📦 8. Hướng dẫn thực hiện Git Commit theo 3 Mốc (Commit Milestones)

Để đáp ứng tiêu chuẩn đánh giá đề tài về việc ghi nhận lịch sử phát triển phần mềm qua các commit rõ ràng, dự án được phân chia thành **3 mốc Git Commit** logic và tuần tự như sau:

### 🔹 Mốc 1: Khởi tạo Kiến trúc Cốt lõi & Cơ sở dữ liệu (Core API & Database)
- **Mục tiêu:** Thiết lập cấu trúc dự án, Backend Express API, kết nối PostgreSQL, nạp seed data khởi tạo và cấu hình build container cơ bản.
- **Các lệnh thực thi:**
  ```bash
  # 1. Khởi tạo kho chứa Git (nếu chưa có)
  git init

  # 2. Thêm các tệp cấu hình và mã nguồn Backend + Database
  git add .gitignore .env.example backend/src/config/ backend/src/controllers/ backend/src/migrations/ backend/src/routes/ backend/src/middlewares/ backend/src/server.js backend/package.json backend/package-lock.json

  # 3. Tạo commit mốc 1
  git commit -m "feat(core): Thiet lap Backend API CRUD, Database schema PostgreSQL va seed data"
  ```

---

### 🔹 Mốc 2: Nginx Hardening, Network Isolation & Frontend Web UI
- **Mục tiêu:** Tích hợp Nginx Reverse Proxy, cấu hình Rate Limiting, Security Headers (`server_tokens off`, `X-Frame-Options`,...), phân tách mạng cô lập `frontend-net` / `backend-net`, chạy container dưới quyền non-root `USER node`, và xây dựng giao diện Web đặt xe `index.html`.
- **Các lệnh thực thi:**
  ```bash
  # 1. Thêm cấu hình Nginx, Frontend UI, Dockerfile hardening và docker-compose mạng phân tách
  git add nginx/ backend/src/public/index.html backend/src/app.js backend/Dockerfile docker-compose.yml

  # 2. Tạo commit mốc 2
  git commit -m "feat(security-frontend): Cau hinh Nginx hardening, network isolation va Frontend Web UI"
  ```

---

### 🔹 Mốc 3: Giám sát Toàn diện Observability & Hoàn thiện Tài liệu
- **Mục tiêu:** Tích hợp hệ sinh thái Prometheus metrics (`prom-client`), Grafana dashboard dựng sẵn, Loki log aggregation, Promtail shipper với nhãn `varlogs`, và hoàn thiện tài liệu hướng dẫn truy vấn LogQL trong `README.md`.
- **Các lệnh thực thi:**
  ```bash
  # 1. Thêm cấu hình giám sát Prometheus, Loki, Promtail, Grafana và tài liệu
  git add prometheus/ loki/ promtail/ grafana/ README.md

  # 2. Tạo commit mốc 3
  git commit -m "feat(observability): Tich hop he sinh thai Prometheus, Grafana Loki, Promtail va huong dan LogQL"
  ```

### 🔍 Kiểm tra lại lịch sử 3 mốc commit:
```bash
git log --oneline --graph --decorate
```
Kết quả hiển thị chuẩn dạng:
```text
* [Commit 3] feat(observability): Tich hop he sinh thai Prometheus, Grafana Loki, Promtail va huong dan LogQL
* [Commit 2] feat(security-frontend): Cau hinh Nginx hardening, network isolation va Frontend Web UI
* [Commit 1] feat(core): Thiet lap Backend API CRUD, Database schema PostgreSQL va seed data
```

---

## 🛑 9. Dừng hệ thống
```bash
# Dừng các container
docker compose down

# Dừng và xóa toàn bộ dữ liệu volumes (nếu muốn làm mới từ đầu)
docker compose down -v
```
