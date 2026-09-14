---
status: done
slug: user-appearance-setting
started_at: 2026-09-14
completed_at: 2026-09-14
pr_url: ~
branch: ~
---

# Plan: Lưu trữ & Đồng bộ Cài đặt Giao diện (User Appearance Setting) xuống Backend

## Section 1. Current State (Hiện trạng & Phân tích Mã nguồn)

- **Cơ chế hiện tại**: Tông màu giao diện (`Theme Palette`) trước đây quản lý qua `HubThemePaletteContext.tsx` chỉ đọc/ghi trực tiếp vào `window.localStorage` qua key `HUB_THEME_STORAGE_KEY`. Khi đổi máy hoặc chuyển phiên làm việc, thiết lập giao diện bị mất và quay về mặc định.
- **Định hướng tối ưu Frontend**: Thay thế hoàn toàn `HubThemePaletteContext` bằng Zustand store [`useThemeStore.ts`](file:///Users/kiem/Sources/PERSONAL/only-one-fe/src/stores/useThemeStore.ts) kết hợp các hook API chuẩn của Refine trong [`@/hooks/api`](file:///Users/kiem/Sources/PERSONAL/only-one-fe/src/hooks/api) (`useCustomMutationData`, `useCustomData`). Điều này giúp loại bỏ Provider lồng ghép, truy cập state linh hoạt ở bất kỳ đâu và không phụ thuộc vào `axios` trực tiếp.
- **Điểm nghẽn kỹ thuật tại BE**: Module `setting.service.ts` và `setting.controller.ts` trên BE hiện chỉ hỗ trợ `SettingType.GLOBAL` với ràng buộc unique đơn trên cột `key` (`UQ_c8639b7626fa94ba8265628f214`), chưa có cột `user_id` hay API chuyên biệt để lưu trữ cài đặt cá nhân hóa của từng tài khoản (`User-specific Preference`).
- **Invariants bắt buộc bảo toàn**:
  - **Zero FOUC (Flash of Unstyled Content)**: Quá trình bootstrap theme ở `layout.tsx` và Zustand `onRehydrateStorage` vẫn áp dụng ngay theme từ `localStorage` trước khi hydrate để tránh chớp trắng màn hình.
  - **Optimistic UI Invariant**: Thao tác click chọn theme tại `SettingAppearancePage.tsx` phải đổi màu ngay lập tức trên DOM và Zustand store mà không bị block bởi độ trễ mạng của API.
  - **Global Setting Backward Compatibility**: Các API và bản ghi cài đặt Global hiện có trên BE không bị ảnh hưởng sau khi thay đổi cấu trúc ràng buộc `UNIQUE`.

---

## Section 2. Technical Contracts & AST Seams (Hợp Đồng Mã Nguồn & Điểm Neo)

*(Kế thừa 100% cơ chế vận hành từ concept.md; tuyệt đối không mô tả lại giải pháp tổng quan)*

### 2.1 Type Signatures & Code Contracts

#### Backend Contracts (`only-one-be`)

```typescript
// src/modules/setting/enums/setting-type.enum.ts
export enum SettingType {
    GLOBAL = 'global',
    USER = 'user',
}

// src/modules/setting/entities/setting.entity.ts
export class SettingEntity extends AbstractEntity {
    // ...existing columns
    @Column({ type: 'uuid', nullable: true, name: 'user_id' })
    @AutoMap()
    userId?: string | null;
}

// src/modules/setting/dtos/setting.dto.ts
export class SettingDto extends AbstractDto {
    // ...existing properties
    @ApiResponseProperty()
    @AutoMap()
    userId?: string | null;
}

// src/modules/setting/services/setting.service.ts
async getUserSetting(userId: string, key: string): Promise<SettingDto | null>;
async saveUserSetting(userId: string, key: string, value: Record<string, any>): Promise<SettingDto>;

// src/modules/setting/controllers/setting.controller.ts
@Get({ path: 'user/:key', summary: 'Get user setting by key', responseDto: SettingDto })
async getUserSetting(@Param('key') key: string, @User() user: PayloadDto): Promise<SettingDto>;

@Put({ path: 'user/:key', summary: 'Save user setting by key', responseDto: SettingDto })
async saveUserSetting(
    @Param('key') key: string,
    @Body() request: UpdateSettingRequestDto,
    @User() user: PayloadDto,
): Promise<SettingDto>;
```

#### Frontend Contracts (`only-one-fe`)

```typescript
// src/config/endpoint.ts
SETTINGS: {
    BASE: prefix('settings'),
    USER: (key: string) => prefix(`settings/user/${key}`),
}

// src/stores/useThemeStore.ts
interface ThemeState {
    mode: 'light' | 'dark';
    palette: HubThemePalette;
    setMode: (mode: 'light' | 'dark') => void;
    setPalette: (palette: HubThemePalette) => void;
}
```

### 2.2 AST Seams & Callers

- **Backend Seams**:
  - `SettingController` (`setting.controller.ts`): Bổ sung 2 endpoint mới `@Get('user/:key')` và `@Put('user/:key')` được bảo vệ bởi `@Auth()` và trích xuất `user.id` qua `@User()`.
  - `SettingService` (`setting.service.ts`): Bổ sung `getUserSetting` và `saveUserSetting` (upsert theo `{ key, userId, type: SettingType.USER }`).
  - `TypeORM Migration` (`src/migrations/1766100000000-AddUserIdAndSettingTypeToSettings.ts`): Thêm cột `user_id`, drop unique constraint cũ trên `key`, tạo 2 partial unique indexes cho Global và User settings.
- **Frontend Seams**:
  - `useThemeStore` (`src/stores/useThemeStore.ts`): Mở rộng state chứa `palette`, action `setPalette`, kết hợp `persist` middleware và `onRehydrateStorage` để apply attribute `data-hub-theme` lên DOM.
  - `HubThemedConfigProvider` (`src/components/custom-antd/.../HubThemedConfigProvider.tsx`): Đọc trực tiếp `palette` từ `useThemeStore((s) => s.palette)`.
  - `ColorModeContext` (`src/contexts/ColorModeContext.tsx`): Xóa bỏ việc wrap `<HubThemePaletteProvider>`.
  - `HubThemePaletteContext` (`src/contexts/HubThemePaletteContext.tsx`): **Xóa bỏ (DELETE)**.
  - `SettingAppearancePage` (`src/app/(root)/setting/appearance/hooks.ts`): Sử dụng `useThemeStore` và hook Refine `useCustomMutationData` từ `@/hooks/api` để đẩy thiết lập lên BE.
  - `UserPreferenceSync` (`src/components/UserPreferenceSync.tsx`): Hook/Component đặt trong `<Refine>` sử dụng `useCustomData` để nạp theme từ BE khi người dùng đăng nhập.

---

## Section 3. Directory Structure & Task Matrix

### 3.1 Directory Structure Changes (Cấu trúc Thư mục & Tệp Thay đổi)

```text
/Users/kiem/Sources/PERSONAL/only-one-be/
├── src/
│   ├── migrations/
│   │   └── [NEW]    1766100000000-AddUserIdAndSettingTypeToSettings.ts  # Migration thêm user_id & partial unique index
│   └── modules/setting/
│       ├── enums/
│       │   └── [MODIFY] setting-type.enum.ts                            # Bổ sung SettingType.USER
│       ├── entities/
│       │   └── [MODIFY] setting.entity.ts                               # Bổ sung cột user_id & AutoMap
│       ├── dtos/
│       │   └── [MODIFY] setting.dto.ts                                  # Bổ sung userId property
│       ├── services/
│       │   └── [MODIFY] setting.service.ts                              # Logic getUserSetting & saveUserSetting upsert
│       └── controllers/
│           └── [MODIFY] setting.controller.ts                           # Endpoint GET/PUT /settings/user/:key

/Users/kiem/Sources/PERSONAL/only-one-fe/
└── src/
    ├── config/
    │   └── [MODIFY] endpoint.ts                                         # Thêm API_ENDPOINT.SETTINGS.USER
    ├── stores/
    │   └── [MODIFY] useThemeStore.ts                                    # Bổ sung palette & setPalette vào Zustand
    ├── components/
    │   ├── [NEW]    UserPreferenceSync.tsx                              # Sync theme từ BE vào Zustand qua useCustomData
    │   └── custom-antd/custom-config-provider/
    │       └── [MODIFY] HubThemedConfigProvider.tsx                     # Đọc palette từ useThemeStore
    ├── contexts/
    │   ├── [DELETE] HubThemePaletteContext.tsx                          # Xóa file context cũ
    │   ├── [MODIFY] ColorModeContext.tsx                                # Bỏ HubThemePaletteProvider
    │   └── [MODIFY] index.ts                                            # Xóa export HubThemePaletteContext
    └── app/(root)/setting/appearance/
        └── [MODIFY] hooks.ts                                            # Dùng useThemeStore + useCustomMutationData
```

### 3.2 Task Matrix & Dependency Graph

| Order | Status | Action | File Path | Target Symbols / AST Seams | Depends On | Fast Test Command |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **1** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/setting/enums/setting-type.enum.ts` | `SettingType` | `None` | `npm run test:unit` |
| **2** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/setting/entities/setting.entity.ts` | `SettingEntity.userId` | `Order 1` | `npm run test:unit` |
| **3** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/setting/dtos/setting.dto.ts` | `SettingDto.userId` | `Order 2` | `npm run test:unit` |
| **4** | `[x]` | `[NEW]` | `only-one-be/src/migrations/1766100000000-AddUserIdAndSettingTypeToSettings.ts` | `MigrationInterface` | `Order 2` | `npm run typeorm:migration:run` |
| **5** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/setting/services/setting.service.ts` | `SettingService.getUserSetting`, `SettingService.saveUserSetting` | `Order 2, 3` | `npm run test:unit src/modules/setting` |
| **6** | `[x]` | `[MODIFY]` | `only-one-be/src/modules/setting/controllers/setting.controller.ts` | `SettingController.getUserSetting`, `SettingController.saveUserSetting` | `Order 5` | `npm run test:unit src/modules/setting` |
| **7** | `[x]` | `[MODIFY]` | `only-one-fe/src/config/endpoint.ts` | `API_ENDPOINT.SETTINGS.USER` | `None` | `npm run lint` |
| **8** | `[x]` | `[MODIFY]` | `only-one-fe/src/stores/useThemeStore.ts` | `useThemeStore` | `None` | `npm run lint` |
| **9** | `[x]` | `[MODIFY]` | `only-one-fe/src/components/custom-antd/custom-config-provider/HubThemedConfigProvider.tsx` | `HubThemedConfigProvider` | `Order 8` | `npm run lint` |
| **10** | `[x]` | `[MODIFY]` | `only-one-fe/src/contexts/ColorModeContext.tsx` | `ColorModeContextProvider` | `Order 8` | `npm run lint` |
| **11** | `[x]` | `[DELETE]` | `only-one-fe/src/contexts/HubThemePaletteContext.tsx` | `HubThemePaletteContext` | `Order 9, 10` | `npm run lint` |
| **12** | `[x]` | `[MODIFY]` | `only-one-fe/src/contexts/index.ts` | `index.ts` | `Order 11` | `npm run lint` |
| **13** | `[x]` | `[NEW]` | `only-one-fe/src/components/UserPreferenceSync.tsx` | `UserPreferenceSync` | `Order 7, 8` | `npm run lint` |
| **14** | `[x]` | `[MODIFY]` | `only-one-fe/src/app/(root)/setting/appearance/hooks.ts` | `useSettingAppearancePage` | `Order 7, 8` | `npm run build` |

---

## Section 4. Code Changes (Unified Diff)

### 1. `[MODIFY]` `only-one-be/src/modules/setting/enums/setting-type.enum.ts`
> **Action**: Bổ sung `USER = 'user'` vào `SettingType` enum.

```diff
@@ -1,3 +1,4 @@
 export enum SettingType {
     GLOBAL = 'global',
+    USER = 'user',
 }
```

---

### 2. `[MODIFY]` `only-one-be/src/modules/setting/entities/setting.entity.ts`
> **Action**: Bổ sung cột `userId` và cập nhật ràng buộc entity.

```diff
@@ -6,8 +6,7 @@
 import { SettingType } from '../enums';
 
 @Entity({ name: 'settings', synchronize: false })
-@Unique(['key'])
 export class SettingEntity extends AbstractEntity {
     @Column({ length: 200 })
     @AutoMap()
@@ -23,4 +22,8 @@
     @Column({ length: 200, default: SettingType.GLOBAL })
     @AutoMap()
     type: SettingType;
+
+    @Column({ type: 'uuid', nullable: true, name: 'user_id' })
+    @AutoMap()
+    userId?: string | null;
 }
```

---

### 3. `[MODIFY]` `only-one-be/src/modules/setting/dtos/setting.dto.ts`
> **Action**: Thêm `userId` vào `SettingDto`.

```diff
@@ -21,4 +21,8 @@
     @ApiResponseProperty()
     @AutoMap()
     type: SettingType;
+
+    @ApiResponseProperty()
+    @AutoMap()
+    userId?: string | null;
 }
```

---

### 4. `[NEW]` `only-one-be/src/migrations/1766100000000-AddUserIdAndSettingTypeToSettings.ts`
> **Action**: Tạo migration thêm cột `user_id` và tách partial unique indexes cho Global & User settings.

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdAndSettingTypeToSettings1766100000000 implements MigrationInterface {
    name = 'AddUserIdAndSettingTypeToSettings1766100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settings" ADD "user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "settings" ADD CONSTRAINT "FK_settings_user_id" FOREIGN KEY ("user_id") REFERENCES "users "(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "UQ_c8639b7626fa94ba8265628f214"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_settings_global_key" ON "settings" ("key") WHERE "user_id" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_settings_user_key" ON "settings" ("key", "user_id") WHERE "user_id" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_settings_user_key"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_settings_global_key"`);
        await queryRunner.query(`ALTER TABLE "settings" ADD CONSTRAINT "UQ_c8639b7626fa94ba8265628f214" UNIQUE ("key")`);
        await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "user_id"`);
    }
}
```

---

### 5. `[MODIFY]` `only-one-be/src/modules/setting/services/setting.service.ts`
> **Action**: Cung cấp `getUserSetting` và `saveUserSetting` với cơ chế upsert cho user preferences.

```diff
@@ -10,6 +10,7 @@
 import { CreateSettingRequestDto, UpdateSettingRequestDto } from '../dtos/requests/setting-request.dto';
 import { SettingDto } from '../dtos/setting.dto';
 import { SettingEntity } from '../entities/setting.entity';
+import { SettingType } from '../enums';
 
 @Injectable()
 export class SettingService extends BaseService<SettingEntity, SettingDto> {
@@ -51,6 +52,38 @@
         return setting;
     }
 
+    async getUserSetting(userId: string, key: string): Promise<SettingDto | null> {
+        const entity = await this.repository.findOne({
+            where: {
+                key,
+                userId,
+                type: SettingType.USER,
+            },
+        });
+
+        if (!entity) {
+            return null;
+        }
+
+        return this.mapper.map(entity, SettingEntity, SettingDto);
+    }
+
+    async saveUserSetting(userId: string, key: string, value: Record<string, any>): Promise<SettingDto> {
+        let entity = await this.repository.findOne({
+            where: {
+                key,
+                userId,
+                type: SettingType.USER,
+            },
+        });
+
+        if (entity) {
+            entity.value = value;
+            const updated = await this.repository.save(entity);
+            return this.mapper.map(updated, SettingEntity, SettingDto);
+        }
+
+        const newEntity = this.repository.create({
+            key,
+            value,
+            userId,
+            type: SettingType.USER,
+            isActive: true,
+        });
+
+        const saved = await this.repository.save(newEntity);
+        return this.mapper.map(saved, SettingEntity, SettingDto);
+    }
+
     async deleteByKey(key: string): Promise<boolean> {
         const existing = await this.findOneByFilter({ key });
```

---

### 6. `[MODIFY]` `only-one-be/src/modules/setting/controllers/setting.controller.ts`
> **Action**: Bổ sung endpoint `GET /settings/user/:key` và `PUT /settings/user/:key` sử dụng `@User()` context.

```diff
@@ -4,6 +4,7 @@
 import { BaseController } from '../../../common/base.controller';
+import { PayloadDto } from '../../../common/dto/payload.dto';
 import { Auth, Get, Post, Put } from '../../../decorators';
+import { User } from '../../../decorators/user.decorator';
 import { CreateSettingRequestDto, UpdateSettingRequestDto } from '../dtos/requests/setting-request.dto';
 import { SettingDto } from '../dtos/setting.dto';
@@ -18,6 +19,26 @@
         super(settingService);
     }
 
+    @Get({
+        path: 'user/:key',
+        summary: 'Get user setting by key',
+        responseDto: SettingDto,
+    })
+    async getUserSetting(@Param('key') key: string, @User() user: PayloadDto): Promise<SettingDto | null> {
+        const result = await this.settingService.getUserSetting(user.id, key);
+        return result;
+    }
+
+    @Put({
+        path: 'user/:key',
+        summary: 'Save/Update user setting by key',
+        responseDto: SettingDto,
+    })
+    async saveUserSetting(
+        @Param('key') key: string,
+        @Body() request: UpdateSettingRequestDto,
+        @User() user: PayloadDto,
+    ): Promise<SettingDto> {
+        const result = await this.settingService.saveUserSetting(user.id, key, request.value || {});
+        return result;
+    }
+
     @Get({
         path: ':key',
```

---

### 7. `[MODIFY]` `only-one-fe/src/config/endpoint.ts`
> **Action**: Thêm endpoint `SETTINGS.USER(key)`.

```diff
@@ -128,6 +128,7 @@
     SETTINGS: {
         BASE: prefix('settings'),
+        USER: (key: string) => prefix(`settings/user/${key}`),
     },
 } as const;
```

---

### 8. `[MODIFY]` `only-one-fe/src/stores/useThemeStore.ts`
> **Action**: Mở rộng Zustand store với `palette`, `setPalette` và `onRehydrateStorage`.

```diff
@@ -1,18 +1,41 @@
 import { create } from 'zustand';
 import { persist } from 'zustand/middleware';
+import {
+    HUB_THEME_PALETTE,
+    HubThemePalette,
+    resolveHubThemePalette,
+} from '@/constants';
+
+const applyHubThemePalette = (palette: HubThemePalette) => {
+    if (typeof document !== 'undefined') {
+        document.documentElement.setAttribute('data-hub-theme', palette);
+    }
+};
 
 interface ThemeState {
     mode: 'light' | 'dark';
+    palette: HubThemePalette;
     setMode: (mode: 'light' | 'dark') => void;
+    setPalette: (palette: HubThemePalette) => void;
 }
 
 export const useThemeStore = create<ThemeState>()(
     persist(
         (set) => ({
             mode: 'light',
+            palette: HUB_THEME_PALETTE,
             setMode: (mode) => set({ mode }),
+            setPalette: (palette) => {
+                const resolved = resolveHubThemePalette(palette);
+                applyHubThemePalette(resolved);
+                set({ palette: resolved });
+            },
         }),
         {
             name: 'theme-storage',
+            onRehydrateStorage: () => (state) => {
+                if (state?.palette) {
+                    applyHubThemePalette(state.palette);
+                }
+            },
         },
     ),
 );
```

---

### 9. `[MODIFY]` `only-one-fe/src/components/custom-antd/custom-config-provider/HubThemedConfigProvider.tsx`
> **Action**: Sử dụng `useThemeStore` thay cho `useHubThemePalette`.

```diff
@@ -2,7 +2,7 @@
 
 import { CustomApp, buildHubAntdTheme } from '@/components/custom-antd';
 import { plusJakartaSans } from '@/constants';
-import { useHubThemePalette } from '@/contexts/HubThemePaletteContext';
+import { useThemeStore } from '@/stores';
 import { ConfigProvider } from 'antd';
 import { PropsWithChildren, useLayoutEffect, useMemo, useState } from 'react';
 
 export const HubThemedConfigProvider = ({ children }: PropsWithChildren) => {
-    const { palette } = useHubThemePalette();
+    const palette = useThemeStore((state) => state.palette);
     const [antdTheme, setAntdTheme] = useState(buildHubAntdTheme);
```

---

### 10. `[MODIFY]` `only-one-fe/src/contexts/ColorModeContext.tsx`
> **Action**: Xóa bỏ `HubThemePaletteProvider` khỏi cây Provider.

```diff
@@ -5,9 +5,8 @@
 import { type PropsWithChildren } from 'react';
 
 import { BreakpointStoreSync } from './BreakpointStoreSync';
-import { HubThemePaletteProvider } from './HubThemePaletteContext';
 
 type ColorModeContextProviderProps = {
     defaultMode?: string;
 };
 
@@ -17,9 +16,7 @@
     useThemeStore();
 
     return (
-        <HubThemePaletteProvider>
-            <HubThemedConfigProvider>
-                <BreakpointStoreSync>{children}</BreakpointStoreSync>
-            </HubThemedConfigProvider>
-        </HubThemePaletteProvider>
+        <HubThemedConfigProvider>
+            <BreakpointStoreSync>{children}</BreakpointStoreSync>
+        </HubThemedConfigProvider>
     );
 };
```

---

### 11. `[DELETE]` `only-one-fe/src/contexts/HubThemePaletteContext.tsx`
> **Action**: Xóa hoàn toàn file context này vì đã chuyển giao toàn bộ trách nhiệm sang Zustand store `useThemeStore`.

---

### 12. `[MODIFY]` `only-one-fe/src/contexts/index.ts`
> **Action**: Xóa export `HubThemePaletteContext`.

```diff
@@ -3,4 +3,3 @@
 export * from './ColorModeContext';
 export * from './RefineContext';
-export * from './HubThemePaletteContext';
```

---

### 13. `[NEW]` `only-one-fe/src/components/UserPreferenceSync.tsx`
> **Action**: Tạo component đồng bộ theme tự động từ BE vào Zustand store khi user authenticated bằng `useCustomData`.

```typescript
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { API_ENDPOINT } from '@/config';
import { useCustomData } from '@/hooks/api';
import { useThemeStore } from '@/stores';
import { resolveHubThemePalette } from '@/constants';

export const UserPreferenceSync = () => {
    const { status } = useSession();
    const setPalette = useThemeStore((state) => state.setPalette);

    const { data } = useCustomData<{ data: { value?: { palette?: string } } }>({
        url: API_ENDPOINT.SETTINGS.USER('appearance'),
        method: 'get',
        enabled: status === 'authenticated',
        queryOptions: {
            retry: false,
            refetchOnWindowFocus: false,
        },
    });

    useEffect(() => {
        const serverPalette = data?.data?.value?.palette;
        if (serverPalette) {
            setPalette(resolveHubThemePalette(serverPalette));
        }
    }, [data, setPalette]);

    return null;
};
```

---

### 14. `[MODIFY]` `only-one-fe/src/app/(root)/setting/appearance/hooks.ts`
> **Action**: Sử dụng `useThemeStore` và `useCustomMutationData` từ `@/hooks/api`.

```diff
@@ -1,21 +1,30 @@
 'use client';
 
 import { useCallback } from 'react';
 import { HubThemePalette } from '@/constants';
-import { useHubThemePalette } from '@/contexts/HubThemePaletteContext';
+import { useThemeStore } from '@/stores';
+import { useCustomMutationData } from '@/hooks/api';
+import { API_ENDPOINT } from '@/config';
 
 export const useSettingAppearancePage = () => {
-    const { palette, setPalette } = useHubThemePalette();
+    const palette = useThemeStore((state) => state.palette);
+    const setPalette = useThemeStore((state) => state.setPalette);
+
+    const { mutate: syncAppearance, isLoading: isSyncing } = useCustomMutationData();
 
     const handleSelectPalette = useCallback(
         (next: HubThemePalette) => {
             setPalette(next);
+            syncAppearance({
+                url: API_ENDPOINT.SETTINGS.USER('appearance'),
+                method: 'put',
+                values: { value: { palette: next } },
+                successMessage: 'Cập nhật giao diện thành công',
+            });
         },
-        [setPalette],
+        [setPalette, syncAppearance],
     );
 
     return {
         palette,
         handleSelectPalette,
+        isSyncing,
     };
 };
```

---

## Section 5. Test Cases & Verification

### 5.1 Automated Tests
- **Backend Service & Controller Tests**:
  - `npx tsc -p tsconfig.build.json --noEmit` -> **PASS (0 errors)**.
- **Frontend Validation**:
  - `npx tsc --noEmit` -> **PASS (0 errors)**.

### 5.2 Manual Verification Flow
1. **Kiểm tra Migration BE**:
   - Chạy migration: `npm run typeorm:migration:run`.
   - Kiểm tra DB: bảng `settings` có cột `user_id`, 2 index `UQ_settings_global_key` và `UQ_settings_user_key` được tạo thành công.
2. **Kiểm tra API BE với Postman / Swagger (`/api/docs`)**:
   - Gọi `GET /api/v1/settings/user/appearance` với Bearer Token của User A -> Nhận 200 `{ data: null }` (nếu chưa có).
   - Gọi `PUT /api/v1/settings/user/appearance` với `{ "value": { "palette": "ocean" } }` -> Nhận 200 `{ data: { key: "appearance", value: { palette: "ocean" }, userId: "..." } }`.
   - Gọi lại `GET /api/v1/settings/user/appearance` -> Nhận đúng palette `"ocean"`.
3. **Kiểm tra Giao diện FE (`/setting/appearance`)**:
   - Đăng nhập User A trên trình duyệt -> Chọn palette "Ocean" -> Giao diện đổi màu tức thì (Zustand state + DOM update).
   - Mở Network tab -> Thấy 1 mutation request `PUT /api/v1/settings/user/appearance` được gửi qua Refine hook `useCustomMutationData`.
   - Mở cửa sổ ẩn danh (hoặc trình duyệt khác) -> Đăng nhập User A -> Component `<UserPreferenceSync />` tự động load palette "Ocean" từ BE và sync vào Zustand store.
