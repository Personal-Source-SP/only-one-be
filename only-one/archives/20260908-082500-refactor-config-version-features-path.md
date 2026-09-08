---
id: 20260908-082500-refactor-config-version-features-path
title: Tái Cấu Trúc URI Path Cho Config Version Features
archived_at: 2026-09-08
status: active
references:
  - only-one/archives/20260908-080500-data-provider-and-discovery-engine.md
affected_modules:
  - data-provider
---

# Archive: Tái Cấu Trúc URI Path Cho Config Version Features

## 1. Problem & Core Value (Bài toán & Giá trị Cốt lõi)
- **Vấn đề (Problem)**: `ConfigVersionController` dùng chung base route `@Controller('data-provider-features')` với `DataProviderFeatureController`, gây xung đột tiền tố route và làm mờ ranh giới tài nguyên giữa quản lý tính năng chính và lịch sử phiên bản.
- **Giá trị (Value)**: Chuẩn hóa base route thành `@Controller('config-version-features')` và rút gọn các sub-routes (`:id`, `:id/rollback/:versionId`, `:id/:versionId`), giúp API RESTful rõ ràng, tường minh ngữ cảnh và đồng bộ contract 2 phía BE & FE.

## 2. Key Architecture & Decisions (Kiến trúc & Quyết định Then chốt)
- **Hướng tiếp cận (Approach)**:
  - Backend: Tách biệt controller base thành `@Controller('config-version-features')`, sử dụng các composite decorators `@GetRestApi`, `@PostRestApi`, `@DeleteRestApi`.
  - Frontend: Bổ sung nhóm `API_ENDPOINT.CONFIG_VERSION_FEATURES` và cập nhật các hooks `useFeatureVersionManager` và `useFeatureHistoryManager`.
- **API Contract Mapping**:
  - `GET /config-version-features/:id` $\rightarrow$ Lấy danh sách version theo feature ID.
  - `POST /config-version-features/:id/rollback/:versionId` $\rightarrow$ Rollback về version chỉ định.
  - `DELETE /config-version-features/:id/:versionId` $\rightarrow$ Xóa version không active.

## 3. Scope & Key Changes (Phạm vi & Thay đổi Chính)
- **Backend (`only-one-be`)**:
  - [`config-version.controller.ts`](file:///d:/Sources/PERSONAL/only-one-be/src/modules/data-provider/controllers/config-version.controller.ts): Cập nhật `@Controller('config-version-features')` và chuẩn hóa sub-routes.
- **Frontend (`only-one-fe`)**:
  - [`endpoint.ts`](file:///d:/Sources/PERSONAL/only-one-fe/src/config/endpoint.ts): Bổ sung nhóm `CONFIG_VERSION_FEATURES`.
  - [`useFeatureVersionManager.ts`](file:///d:/Sources/PERSONAL/only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/hooks/useFeatureVersionManager.ts): Chuyển sang endpoint mới.
  - [`useFeatureHistoryManager.ts`](file:///d:/Sources/PERSONAL/only-one-fe/src/app/(root)/scraping/features/[dataProviderId]/hooks/useFeatureHistoryManager.ts): Chuyển sang endpoint mới.

## 4. Verification Evidence & PR (Bằng chứng Nghiệm thu & PR)
- **Trạng thái Test**: 100% Passed (`npm run build` Backend & `npx tsc --noEmit` Frontend đều exit code 0).
- **Branch**: `main` / `local`
