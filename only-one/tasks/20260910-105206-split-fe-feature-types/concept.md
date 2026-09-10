# Concept: Tách Nhỏ Types theo Đối Tượng & Tái Cấu Trúc Thư Mục Module Scraping Features Đồng Bộ Backend

## 1. Problem & Goal (Vấn đề & Mục tiêu)

### Problem (Vấn đề & Điểm nghẽn Hiện tại)
- **Bối cảnh & Điểm kích hoạt**: Module Scraping Features ở Frontend (`src/app/(root)/scraping/features/[dataProviderId]`) đang có cấu trúc thư mục bị lồng sâu bên trong dynamic segment `[dataProviderId]`, khác biệt với các module khác như `scraping/discovery`.
- **Hiện tượng & Khiếm khuyết kỹ thuật**:
  - Toàn bộ `components/`, `hooks/`, `utils/`, `enums/`, `constants.ts`, và `types.ts` đều nằm trong thư mục động `[dataProviderId]/` thay vì ở cấp module `features/`.
  - File `types.ts` là monolithic file, chứa hỗn tạp nhiều đối tượng dữ liệu khác nhau và có type chết không còn sử dụng (`TestFeatureContextualRequest`).
  - Có sự sai lệch kiểu dữ liệu so với Backend (`only-one-be` là Single Source of Truth):
    - `service` ở FE đang định nghĩa `service?: string`, trong khi BE là `ScraperServiceEnum`.
    - `UpdateFeatureConfigRequest` ở FE để `changeDescription?: string` và chứa `service?: string`, trong khi BE DTO `UpdateFeatureConfigRequestDto` bắt buộc `changeDescription: string` và không nhận `service`.
    - Cấu hình Feature (`ITargetConfig`, `ISearchTargetConfig`) chưa có type chặt chẽ theo BE `target-config.interface.ts`.
- **Nguyên nhân cốt lõi (Root Cause)**: Chưa phân định cấu trúc type theo từng đối tượng domain cụ thể (Entity / Object boundaries), chưa dọn dẹp các type thừa/lỗi thời, và cấu trúc thư mục module chưa được nâng lên cấp cha.
- **Tác động (Impact / Blast Radius)**: Khó tra cứu type theo đối tượng nghiệp vụ, cấu trúc thư mục không nhất quán với toàn bộ dự án (`discovery/` đang để assets ở cấp module cha).

### Goal (Mục tiêu Kỹ thuật Cần đạt)
- **Mục tiêu cốt lõi**:
  1. **Nâng cấp & Gộp cấu trúc thư mục (Folder Restructuring)**: Đưa toàn bộ assets (`components/`, `types/`, `enums/`, `hooks/`, `utils/`, `constants.ts`) lên cấp `src/app/(root)/scraping/features/`, thư mục `[dataProviderId]/` chỉ giữ file định tuyến Next.js App Router (`page.tsx`).
  2. **Chia nhỏ Types theo Đối tượng (Object-Centric Type Separation)**: Tổ chức thư mục `types/` phân tách rõ ràng theo từng đối tượng nghiệp vụ (`feature`, `config-version`, `target-config`), đồng bộ 100% với BE `interfaces/` và `dtos/`, loại bỏ các type chết (`TestFeatureContextualRequest`).
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - Cấu trúc thư mục mới:
    ```text
    src/app/(root)/scraping/features/
    ├── [dataProviderId]/
    │   └── page.tsx                         # Chỉ chứa Next.js Route Page
    ├── components/
    ├── constants.ts
    ├── enums/
    ├── hooks/
    ├── types/
    │   ├── data-provider-feature.types.ts   # Toàn bộ types của đối tượng Feature (Entity, Requests, Modal State)
    │   ├── config-version.types.ts          # Toàn bộ types của đối tượng Config Version & History
    │   ├── target-config.types.ts           # Toàn bộ types của đối tượng Target Config (Sync từ BE interfaces)
    │   └── index.ts                         # Barrel export toàn bộ
    └── utils/
    ```
  - Loại bỏ hoàn toàn `TestFeatureContextualRequest` do BE chỉ sử dụng stateless test sandbox.
  - Khắc phục toàn bộ sai lệch type với Backend.
  - Re-export toàn bộ qua `types/index.ts` để đảm bảo 100% backward compatibility cho mọi components & hooks.

---

## 2. Scope Boundaries (Ranh giới Phạm vi)

- **In-Scope**:
  - Di chuyển các thư mục `components/`, `enums/`, `hooks/`, `utils/`, `constants.ts` từ `features/[dataProviderId]/` lên `features/`.
  - Tách `types.ts` theo đối tượng vào `features/types/`:
    - `data-provider-feature.types.ts` (loại bỏ `TestFeatureContextualRequest`)
    - `config-version.types.ts`
    - `target-config.types.ts`
    - `index.ts`
  - Cập nhật đường dẫn import trong `features/[dataProviderId]/page.tsx` và các components/hooks con.
  - Đồng bộ kiểu dữ liệu chặt chẽ với BE `interfaces/` và `dtos/`.
- **Explicit Out-of-Scope**:
  - Không sửa đổi mã nguồn Backend (`only-one-be`).
  - Không thay đổi hành vi/logic nghiệp vụ UI của các component.
  - Không thay đổi URL route của người dùng (URL vẫn là `/scraping/features/:dataProviderId`).

---

## 3. Proposed Solution & Core Mechanism (Giải pháp Đề xuất & Cơ chế)

### Chi Tiết Phân Chia Types Theo Đối Tượng

```
src/app/(root)/scraping/features/types/
├── data-provider-feature.types.ts
├── config-version.types.ts
├── target-config.types.ts
└── index.ts
```

#### 1. `data-provider-feature.types.ts` (Đối tượng Data Provider Feature)
Gom toàn bộ entity, request payloads và UI state trực tiếp của Feature:
- `IDataProviderFeature` (Kế thừa `Abstract`):
  - `dataProviderId: string`
  - `type: DataProviderFeatureType`
  - `service: ScraperServiceEnum` *(chuẩn hóa khớp BE)*
  - `status: DataProviderFeatureStatus`
  - `config?: ITargetConfig | ISearchTargetConfig | Record<string, any>`
  - `consecutiveFailures: number`
  - `lastErrorMessage?: string`
  - `lastErrorType?: DataProviderFeatureErrorType`
  - `lastFailedRunAt?: Date`
  - `lastSuccessfulRunAt?: Date`
  - `dataProvider?: IDataProvider`
  - `versions?: IConfigVersion[]`
- **Request Payloads**:
  - `CreateDataProviderFeatureRequest`: `{ type, service: ScraperServiceEnum, config?, input? }`
  - `UpdateFeatureConfigRequest`: `{ changeDescription: string, config?, input? }`
  - `TestFeatureStatelessRequest`: `{ type, service?: ScraperServiceEnum, config, input? }`
- **UI State của Feature**:
  - `FeatureModalTab = 'config' | 'test'`
  - `FeatureModalState`: `{ open: boolean, feature: IDataProviderFeature | null, activeTab: FeatureModalTab }`

#### 2. `config-version.types.ts` (Đối tượng Config Version & Lịch sử Cấu hình)
Gom toàn bộ entity và UI state liên quan đến lịch sử phiên bản cấu hình:
- `IConfigVersion` (Kế thừa `Abstract`):
  - `featureId: string`
  - `isActive: boolean`
  - `versionId: number`
  - `config: Record<string, any>`
  - `changeType: ConfigVersionType`
  - `changeDescription?: string`
  - `createdBy?: string`
  - `user?: IUser`
  - `feature?: IDataProviderFeature`
- **UI State của Version History**:
  - `HistoryModalState`: `{ open: boolean, feature: IDataProviderFeature | null }`

#### 3. `target-config.types.ts` (Đối tượng Cấu hình Thu thập Target Config - Sync 100% BE)
Đồng bộ trực tiếp từ `only-one-be/src/modules/data-provider/interfaces/target-config.interface.ts`:
- `ITargetConfig`:
  - `functionGenerator: string`
  - `mainContentSelector?`, `isGetParentElement?`, `queryParams?`, `firstQueryParams?`
  - `maxResults?`, `retryDelay?`, `retryAttempts?`, `userAgent?`, `headers?`, `cookies?`
  - `timeout?`, `waitForTimeout?`, `stealthMode?`, `cloudflareBypass?`, `waitForSelector?`, `javascriptEnabled?`, `imagesEnabled?`, `cssEnabled?`
- `ISearchTargetConfig` (extends `ITargetConfig`):
  - `searchUrlPattern?`, `queryPlaceholder?`, `resultSelector?`, `sampleQuery?`
- `IRunFunctionExtractData`, `IRunApiFunctionExtractData`, `IRunSearchFunctionExtractData`, `IRunApiSearchFunctionExtractData`, `ISearchExtractDataResponse`

#### 4. `index.ts` (Barrel Export)
- Re-export toàn bộ types từ 3 file trên:
  ```typescript
  export * from './config-version.types';
  export * from './data-provider-feature.types';
  export * from './target-config.types';
  ```

---

## 4. Critical Risks & Edge Cases (Rủi ro & Kịch bản Biên)

- **Circular Reference giữa `IDataProviderFeature` và `IConfigVersion`**:
  - *Giải pháp*: Trong TypeScript, sử dụng `import type` giữa các file type đảm bảo không bao giờ gây ra circular dependency runtime và được type checker xử lý sạch sẽ.
- **Đường dẫn Relative Imports khi di chuyển**:
  - *Giải pháp*: Cập nhật đồng bộ các relative path trong `components/`, `hooks/`, `utils/` và `[dataProviderId]/page.tsx` trỏ đúng về `./types` (ở cùng cấp `features/`) hoặc `@/app/(root)/scraping/features/types`.
