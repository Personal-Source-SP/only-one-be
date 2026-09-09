---
id: 20260909-154500-refactor-discovery-runner-return-type
title: Refactor DiscoveryRunner Methods Return Type & Request Parameters
archived_at: 2026-09-09
status: active
references:
  - only-one/archives/20260908-080500-data-provider-and-discovery-engine.md
affected_modules:
  - data-provider
---

# Archive: Refactor DiscoveryRunner Methods Return Type & Request Parameters

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: Hai phương thức `runApiDiscovery` và `runHtmlDiscovery` trong `DiscoveryRunner` trước đây nhận danh sách positional arguments và đột biến trực tiếp mảng `discoveredRecords: DiscoveryUrlEntity[]` truyền vào với kiểu trả về `Promise<void>`, gây ra side-effects ngầm định và làm giảm khả năng test độc lập.
- **Giá trị (Value)**: Chuyển đổi tham số sang object `IRunDiscoveryParams` và kiểu trả về `Promise<DiscoveryUrlEntity[]>` thuần túy, nâng cao tính rõ ràng, loại bỏ hoàn toàn side-effects và chuẩn hóa giao tiếp nội bộ trong runner.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Hướng tiếp cận (Approach)**:
  - Định nghĩa `IRunDiscoveryParams` tại `discovery-runner.interface.ts` gồm `session`, `targetConfig?`, `targetKeyword?`.
  - Cập nhật `runApiDiscovery` và `runHtmlDiscovery` khởi tạo mảng `discoveredRecords` cục bộ và trả về trực tiếp.
  - `DiscoveryRunner.runDiscovery` gán kết quả trả về vào `discoveredRecords` trước khi lưu vào cơ sở dữ liệu.

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- [discovery-runner.interface.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/interfaces/discovery-runner.interface.ts): Khai báo interface `IRunDiscoveryParams`.
- [discovery.runner.ts](file:///Users/kiem/Sources/PERSONAL/only-one-be/src/modules/data-provider/runners/discovery.runner.ts): Refactor tham số và kiểu trả về của `runApiDiscovery` / `runHtmlDiscovery`.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Trạng thái Test**: 100% Passed (Typecheck `tsc` và ESLint đạt 0 lỗi).
