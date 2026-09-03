# Technical English Learning: Architecture & Design

### 1. Deterministic Heuristic Scoring Pipeline
- **Meaning (VI)**: Đường ống chấm điểm dựa trên luật và thuật toán xác định thay vì AI không xác định.
- **Grammar / Usage**: `Employ a deterministic heuristic pipeline to categorize candidate URLs without introducing external LLM latency.`
- **Engineering Example**:
  > *"We employ a deterministic heuristic pipeline to classify candidate URLs with sub-second turnaround."*
- **Origin Task**: `20260828-164600-scraping-discovery-api`

### 2. Decoupled Strategy Plug-in Seam
- **Meaning (VI)**: Khớp nối kiến trúc tách rời cho phép tích hợp linh hoạt các chiến lược đánh giá khác nhau.
- **Grammar / Usage**: `Abstract the validation runner behind a plug-in strategy seam to allow future LLM integrations with zero schema changes.`
- **Engineering Example**:
  > *"We abstracted the heuristic evaluator behind a strategy seam so we can plug in generative AI models seamlessly down the road."*
- **Origin Task**: `20260828-164600-scraping-discovery-api`

### 3. Hierarchical Resolution Fallback
- **Meaning (VI)**: Kỹ thuật kiểm tra thực thể theo độ ưu tiên từ cao xuống thấp (khóa chính xác -> khóa gần đúng -> tạo mới).
- **Grammar / Usage**: `<Primary Key Check> -> Fallback to <Secondary Key Check> -> Instantiate New Entity`
- **Engineering Example**:
  > *"The system employs a hierarchical resolution strategy, checking the item code first, falling back to product name matching, and only instantiating a new record if both lookups yield no results."*
- **Origin Task**: `20260903-153500-redesign-discovery-item-ingestion-flow`

### 4. Lean Domain Model
- **Meaning (VI)**: Mô hình nghiệp vụ tinh gọn, tập trung đúng trọng tâm bài toán mà không chứa các thuộc tính thừa gây phình schema.
- **Grammar / Usage**: `Achieve a [lean domain model] by pruning [unnecessary attributes]`
- **Engineering Example**:
  > *"Pruning the price attributes allows DiscoveryUrlEntity to achieve a lean domain model focused purely on URL lifecycle management."*
- **Origin Task**: `20260903-161800-purge-price-fields-from-discovery`

### 5. Asynchronous Audit Trailing & Sensitive Data Sanitization
- **Meaning (VI)**: Ghi vết nhật ký kiểm toán theo cơ chế bất đồng bộ kèm làm sạch/ẩn thông tin nhạy cảm.
- **Grammar / Usage**: `Offload [audit event recording] to background workers while applying recursive [sensitive data sanitization]`
- **Engineering Example**:
  > *"The system implements asynchronous audit trailing via Bull queue to eliminate database latency on mutation endpoints while enforcing automatic field redaction."*
- **Origin Task**: `20260903-193230-implement-audit-log-module`

### 6. Targeted Channel Subscription & Bi-directional Event Streaming
- **Meaning (VI)**: Đăng ký nhận tin theo phòng/kênh xác định kèm luồng dữ liệu hai chiều thời gian thực.
- **Grammar / Usage**: `Enable [bi-directional event streaming] with [targeted channel subscriptions] for real-time progress feedback`
- **Engineering Example**:
  > *"WebSocket gateway utilizes targeted channel subscriptions to broadcast job telemetry directly to interested clients without broadcasting globally."*
- **Origin Task**: `20260903-192300-sync-websocket-infrastructure`

### 7. Thin Delegator Worker Pattern & Service Encapsulation
- **Meaning (VI)**: Mô hình worker tinh gọn chỉ điều phối hàng đợi và chuyển giao toàn bộ giao dịch nghiệp vụ sang domain service.
- **Grammar / Usage**: `Structure worker processors as [thin delegators] while encapsulating [multi-entity transactions] in domain services`
- **Engineering Example**:
  > *"Adopting the thin delegator pattern ensures workers focus strictly on queue job dispatching, while the domain service encapsulates atomic batch updates."*
- **Origin Task**: `20260903-211230-refactor-discovery-validation-worker`

