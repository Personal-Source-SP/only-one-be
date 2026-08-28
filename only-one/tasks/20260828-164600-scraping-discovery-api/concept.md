# Concept: Scraping Discovery & Deterministic URL Validation Engine

## 1. Problem Statement & Root Need (Bối cảnh & Vấn đề Cốt lõi)
- **Core Business Problem**: Khi thu thập dữ liệu sản phẩm từ Data Provider, việc chỉ cào link thô (raw URL crawl) sẽ sinh ra rất nhiều liên kết không liên quan (trang danh mục, giỏ hàng, điều khoản, blog, hoặc sản phẩm không khớp). Hệ thống cần một **cơ chế Discovery tự động kết hợp với Pipeline Validation thông minh** (được kế thừa từ kiến trúc của `orien-trade-backend`) để lọc bỏ rác, chấm điểm chất lượng URL (`confidenceScore`), nhận diện trang sản phẩm chi tiết (PDP), bóc tách giá tiền và hỗ trợ quy trình duyệt (User Action Review) trước khi đưa vào hàng đợi cào chi tiết (`ScrapingData`).
- **Target Audience & Core Value**: Kỹ sư dữ liệu và vận hành hệ thống scraping; loại bỏ 80–90% URL rác ngay tại tầng Discovery, tự động hóa khâu đánh giá chất lượng URL bằng thuật toán xác định (Deterministic Heuristics & Fuzzy Matching) mà không tốn chi phí gọi LLM bên thứ 3.

## 2. Scope Boundaries (Ranh giới Phạm vi)
- **In-Scope**:
  - **Domain Entities & Database Schema**:
    - `DiscoverySessionEntity`: Quản lý phiên cào link, độ sâu `depth`, trạng thái, số lượng URL phát hiện/đã validate/đã đưa vào queue.
    - `DiscoveryUrlEntity`: Lưu trữ URL, domain, tiêu đề, độ sâu `foundAtDepth`, `confidenceScore`, trạng thái validate, `matchResult` (`EXACT_MATCH`, `PARTIAL_MATCH`, `NO_MATCH`, `UNCERTAIN`), `detectedPrice`, `detectedCurrency`, và kết quả duyệt của người dùng (`userAction`, `finalValidationStatus`).
    - `DiscoveryValidationBatchEntity`: Quản lý đợt validate hàng loạt (Batch lifecycle: `PENDING` -> `PROCESSING` -> `COMPLETED` / `CANCELLED`).
    - `DiscoveryValidationLogEntity`: Ghi vết chi tiết lý do khớp, điểm số, thời gian thực thi của từng lần validate.
  - **Deterministic Validation & Heuristic Engine (Kế thừa từ `ai-validation.service.ts` & `ai-product-mapping-helper.ts`)**:
    - *Candidate Filtering via Fuzzy Search*: So khớp đa trường qua Fuse.js / Levenshtein similarity giữa target keyword/brand và URL/title.
    - *Heuristic PDP Analysis*: Nhận diện các mẫu URL sản phẩm (`/dp/`, `/product/`, `/item/`, `/p/`, `-p-`) và loại trừ negative paths (`/category/`, `/cart/`, `/checkout/`, `/search`, `/blog/`).
    - *Price & Currency Extraction*: Bóc tách tự động giá và loại tiền tệ (`detectPriceInText`).
    - *Rule-based Confidence Score & Match Classification*: Tính toán điểm tin cậy tổng hợp (0.00 – 1.00) và gán nhãn `EXACT_MATCH`, `PARTIAL_MATCH`, `NO_MATCH`.
  - **Batch Management & User Review Workflow**:
    - Kích hoạt batch validate toàn bộ session hoặc re-evaluate một URL đơn lẻ (`revalidateDiscoveredUrl`).
    - Hỗ trợ hủy batch an toàn (`cancelValidationBatch`).
    - Submit user action đơn lẻ và hàng loạt (`CONFIRM`, `REJECT`, `EXCLUDE`).
    - Batch Enqueue các URL đã được duyệt (`APPROVED`) sang hàng đợi cào chi tiết (`ScrapingData`).
  - **REST API Endpoints**:
    - `POST /discovery-sessions`: Khởi tạo phiên khám phá.
    - `GET /discovery-sessions`: Phân trang danh sách phiên.
    - `GET /discovery-sessions/:id`: Lấy chi tiết phiên và tổng quan số liệu thống kê.
    - `GET /discovery-sessions/:id/urls`: Lấy danh sách URL theo phiên (lọc theo validation status, match result, search).
    - `POST /discovery-sessions/:id/validate`: Kích hoạt batch validation.
    - `POST /discovery-validation-batches/:id/cancel`: Hủy batch validation.
    - `POST /discovery-urls/:id/user-action`: Submit duyệt/từ chối 1 URL.
    - `POST /discovery-sessions/:id/bulk-user-actions`: Submit duyệt hàng loạt.
    - `POST /discovery-urls/:id/re-validate`: Đánh giá lại 1 URL.
    - `POST /discovery-sessions/:id/enqueue-urls`: Đẩy danh sách URL vào hàng đợi cào.
- **Explicit Out-of-Scope**:
  - **External LLM Call Dependencies (OpenAI / Gemini API)**: Sử dụng 100% thuật toán nội bộ xác định (deterministic heuristics, fuzzy token search, price detection) để chạy offline, tốc độ cao và 0 đồng chi phí token (nhưng thiết kế sẵn seam `IValidationStrategy` để cắm LLM trong tương lai nếu muốn).
  - **Third-party Search Engine API (Serper / Google Search)**: Giữ cơ chế crawl trực tiếp từ target URL.

## 3. Success Metrics (Thước đo Thành công / Definition of Done)
- **Heuristic Accuracy**: Tự động nhận diện và gán đúng nhãn PDP / Non-PDP cho > 95% URL mẫu của các sàn e-commerce phổ biến (Amazon, Shopee, Tiki, Lazada...).
- **Deterministic Throughput**: Xử lý validate hàng loạt 1,000 URLs trong vòng < 500ms (nhờ chạy local In-Memory Fuzzy & Regex Heuristics).
- **Seamless User Action Transition**: Toàn bộ thao tác user review (`CONFIRM`, `REJECT`) và batch enqueue sang `ScrapingData` được thực hiện an toàn trong database transaction.
- **Test Coverage**: Toàn bộ Controller, Validation Engine, Services đạt unit test coverage > 90%.

## 4. Proposed High-Level Approach (Hướng tiếp cận Tổng quan)
- Tổ chức lại module `data-provider` tại `only-one-be` bằng cách bổ sung 4 thực thể cốt lõi: `DiscoverySessionEntity`, `DiscoveryUrlEntity`, `DiscoveryValidationBatchEntity`, `DiscoveryValidationLogEntity`.
- Xây dựng `DiscoveryValidationService` và `DiscoveryValidationHelper` kế thừa tinh hoa từ `ai-validation.service.ts` của Orien-Trade, thực thi pipeline 3 giai đoạn:
  1. Fuzzy Candidate Filter (Fuse.js)
  2. Heuristic PDP Path & Price Extraction
  3. Weighted Confidence Scoring & Match Classification
- Cung cấp trọn vẹn bộ API quản lý phiên, batch validation, user review actions và enqueue sang `ScrapingData`.

## 5. Technical English Key Patterns
### 1. Deterministic Heuristic Scoring Pipeline
- **Meaning (VI)**: Đường ống chấm điểm dựa trên luật và thuật toán xác định thay vì AI không xác định, đảm bảo tốc độ cực nhanh và tính nhất quán tuyệt đối.
- **Grammar / Usage**: `Employ a deterministic heuristic pipeline to categorize and score candidate URLs without relying on non-deterministic external LLMs.`
- **Engineering Example**: *"We employ a deterministic heuristic pipeline with fuzzy token matching to score candidate URLs at sub-second latency."*

### 2. Multi-Stage Candidate Pruning
- **Meaning (VI)**: Kỹ thuật sàng lọc và cắt tỉa ứng viên qua nhiều tầng (từ thô đến tinh) để tối ưu hiệu năng.
- **Grammar / Usage**: `Prune irrelevant candidates at early ingestion stages before dispatching to deep validation passes.`
- **Engineering Example**: *"The validation engine uses multi-stage candidate pruning, discarding negative path patterns before computing Levenshtein distances."*

### 3. Extensible Strategy Seam
- **Meaning (VI)**: Điểm khớp nối kiến trúc mở rộng cho phép chuyển đổi linh hoạt giữa cơ chế rule-based và AI sau này mà không phá vỡ hợp đồng dữ liệu.
- **Grammar / Usage**: `Decouple the validation runner behind an extensible strategy seam to allow seamless AI-provider plug-ins in future milestones.`
- **Engineering Example**: *"By decoupling the validation logic behind an extensible strategy seam, we can seamlessly plug in LLM-based scoring later without database schema migrations."*
