# Composition & Shared Architecture

## Responsibilities & Locations

The Composition Root wires feature modules into the central application (`AppModule`). The Shared Layer (`SharedModule`) encapsulates cross-cutting infrastructure services, third-party integrations, and system-wide abstractions reused across multiple feature modules.

- **Locations**:
  - Root composition: `AppModule` (`src/app.module.ts`)
  - Shared module container: `SharedModule` (`src/shared/shared.module.ts`)
  - Common base classes: `BaseController`, `BaseService`, `AbstractEntity` (`src/common/`)

---

## Standard Components of `src/shared/`

The `src/shared/` layer should house cross-cutting services and utilities that are domain-agnostic or shared across multiple feature domains:

```text
src/shared/
├── shared.module.ts         # Central Global/Shared Module registering and exporting shared services
├── services/                # Cross-cutting infrastructure & integration services
│   ├── api-config.service.ts       # Typed environment config & secret resolution
│   ├── logger.service.ts           # Centralized structured logger
│   ├── cache.service.ts            # Redis / memory caching abstractions
│   ├── distributed-lock.service.ts # Redlock / concurrency lock management
│   ├── http.service.ts             # Resilient HTTP client wrapper (Axios / Fetch with retry)
│   ├── s3.service.ts               # AWS S3 / Cloud Object Storage integration
│   ├── upload.service.ts           # File upload validation & CDN processing
│   ├── otp.service.ts              # One-time password generation & SMS/Email delivery
│   ├── payload-seal.service.ts     # HMAC signature verification & payload encryption
│   ├── translation.service.ts      # Multi-language localization & translation helpers
│   ├── localize.service.ts         # Runtime locale resolution & string formatting
│   ├── validator.service.ts        # Custom data format validators
│   ├── abstract-api.service.ts     # Abstract base for third-party API clients
│   └── base-cron.service.ts        # Base scheduler with error handling & lock safety
├── middlewares/             # Global / shared HTTP middlewares (e.g., logger.middleware.ts)
├── profiles/                # Shared AutoMapper profiles (e.g., translation.profile.ts)
└── providers/               # Dynamic factory providers & third-party SDK clients
```

---

## Guidelines: When to Place in `SharedModule` vs `FeatureModule`

| Layer / Scope | Place in `src/shared/` (`SharedModule`) | Place in `src/modules/<feature>/` (`FeatureModule`) |
| :--- | :--- | :--- |
| **Domain Coupling** | **Domain-Agnostic**: Infrastructure, external gateways, caching, locking, configuration, or utility SDKs. | **Domain-Specific**: Business rules, aggregate workflows, feature entity states. |
| **Entity Ownership** | Does **NOT** own or inject specific feature ORM entity repositories. | Owns and injects feature entity repositories (`@InjectRepository(FeatureEntity)`). |
| **Consumer Breadth** | Consumed by **2 or more independent feature modules** (or entire app). | Consumed exclusively within the bounded context of the feature module. |
| **Persistence** | Operates with generic cache, S3 storage, Redis, or external third-party REST/gRPC APIs. | Operates with relational database persistence and schema migrations. |

---

## Guidelines & Rules

- ✅ **Standard Abstraction Reuse**:
  - Feature Controllers must extend `BaseController` to format responses via `ResponseDto`.
  - Persistence Services must extend `BaseService`.
  - Persistence Entities must extend `AbstractEntity` (UUID primary key, audit timestamps, soft delete support).
  - Inject shared infrastructure services (`ApiConfigService`, `LoggerService`, `CacheService`, `DistributedLockService`) from `SharedModule` rather than creating ad-hoc implementations in feature modules.
- ✅ **Global / Shared Exports**:
  - `SharedModule` should be decorated with `@Global()` or explicitly imported by feature modules.
  - All shared services must be listed in both `providers` and `exports` arrays of `SharedModule`.
- ✅ **Module Ownership Graph**: Import Feature Modules into `AppModule` or parent feature modules following strict dependency direction.
- ❌ **No Circular/Reverse Imports**: Never import `AppModule` back into a feature module or `SharedModule`.
- ❌ **No Feature Entities in Shared**: Do not inject or register feature-specific ORM entities inside `SharedModule`.
- ❌ **No Duplicate Base Code**: Do not copy `BaseService`, `BaseController`, or shared service utilities into individual feature folders.
