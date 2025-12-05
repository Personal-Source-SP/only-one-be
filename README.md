# Only One Backend

Backend API cho hệ thống Only One - một nền tảng tích hợp các dịch vụ cloud, web scraping, automation và quản lý dữ liệu.

## Tổng quan

Only One Backend là một hệ thống backend được xây dựng trên NestJS, cung cấp các tính năng:

- **Web Scraping & Data Extraction**: Thu thập và trích xuất dữ liệu từ các website sử dụng Puppeteer
- **Browser Automation & Simulation**: Tự động hóa các thao tác trên trình duyệt, mô phỏng hành vi người dùng
- **Cloud Data Integration**: Tích hợp với Google Drive và Telegram để quản lý dữ liệu cloud
- **Scheduled Tasks**: Hệ thống lập lịch thực thi các tác vụ tự động
- **Queue Management**: Xử lý các tác vụ bất đồng bộ thông qua Redis và Bull Queue
- **Real-time Communication**: WebSocket hỗ trợ giao tiếp real-time
- **Data Import/Export**: Nhập xuất dữ liệu từ các file Excel và các định dạng khác

## Công nghệ sử dụng

### Core Framework
- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Language**: TypeScript
- **ORM**: [TypeORM](https://typeorm.io/)
- **Database**: PostgreSQL

### Key Libraries & Tools
- **Web Scraping**: Puppeteer với stealth mode và adblocker plugins
- **Queue System**: Bull Queue với Redis
- **Authentication**: JWT với Passport
- **API Documentation**: Swagger/OpenAPI
- **Logging**: Winston với daily rotate file
- **Task Scheduling**: @nestjs/schedule
- **WebSocket**: Socket.io với Redis adapter
- **HTTP Client**: Axios
- **Validation**: class-validator, class-transformer
- **Object Mapping**: AutoMapper

### Infrastructure
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint, Prettier, Husky, lint-staged

## Cấu trúc dự án

```
src/
├── modules/              # Các module chính của ứng dụng
│   ├── auth/            # Xác thực và phân quyền
│   ├── user/            # Quản lý người dùng
│   ├── google/          # Tích hợp Google services (Drive, OAuth)
│   ├── cloud-data/      # Quản lý dữ liệu cloud (Telegram, etc.)
│   ├── data-provider/   # Web scraping và data extraction
│   ├── simulation/      # Browser automation và simulation
│   ├── schedule/        # Scheduled tasks execution
│   ├── queue/           # Queue management
│   ├── worker/          # Background workers
│   ├── import-data/     # Import/Export dữ liệu
│   ├── notification/   # Hệ thống thông báo
│   ├── setting/         # Cấu hình hệ thống
│   └── websocket/       # WebSocket communication
├── common/              # Shared components (DTOs, entities, enums)
├── shared/              # Shared services và utilities
├── filters/             # Exception filters
├── guards/              # Authentication guards
├── interceptors/        # Response interceptors
└── migrations/          # Database migrations
```

## Cài đặt và Cấu hình

### Yêu cầu hệ thống

- Node.js >= 18.x
- PostgreSQL >= 12.x
- Redis >= 6.x (cho queue và caching)
- npm hoặc yarn

### Cài đặt

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd only-one-be
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   # hoặc
   yarn install
   ```

3. **Cấu hình Environment Variables:**
   
   Tạo file `.env` từ `.env.sample` và cập nhật các giá trị:
   ```bash
   cp .env.sample .env
   ```
   
   Các biến môi trường quan trọng:
   - Database: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
   - Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
   - JWT: `JWT_SECRET`, `JWT_EXPIRES_IN`
   - Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - Application: `PORT`, `NODE_ENV`, `ORIGIN`

4. **Database Setup:**
   
   Đảm bảo PostgreSQL đang chạy, sau đó chạy migrations:
   ```bash
   npm run migration:run
   ```
   
   Hoặc nếu muốn tự động tạo schema (chỉ dùng cho development):
   - Set `AUTO_MIGRATION=true` trong `.env`
   - **Lưu ý**: Không khuyến khích dùng cho production

5. **Seed dữ liệu (tùy chọn):**
   ```bash
   npm run seed
   ```

## Chạy ứng dụng

### Development Mode
```bash
npm run start:dev
# hoặc
yarn start:dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000` (hoặc port được cấu hình trong `.env`)

### Production Mode
```bash
npm run build
npm run start:prod
```

### Debug Mode
```bash
npm run start:debug
```

## API Documentation

Khi chạy ở môi trường `development` hoặc `staging`, Swagger UI sẽ có sẵn tại:
- Swagger UI: `http://localhost:3000/swagger`
- Swagger JSON: `http://localhost:3000/swagger.json`

## Các tính năng chính

### 1. Web Scraping & Data Provider
- Thu thập dữ liệu từ các website sử dụng Puppeteer
- Hỗ trợ stealth mode để tránh bị phát hiện
- Cấu hình linh hoạt cho các target khác nhau
- Parser function để trích xuất dữ liệu từ HTML
- Queue system để xử lý scraping tasks

### 2. Browser Automation & Simulation
- Mô phỏng các thao tác người dùng trên trình duyệt
- Hỗ trợ các action: click, fill input, navigate, wait, select option
- Execution context để quản lý state
- Logging chi tiết cho debugging

### 3. Google Services Integration
- OAuth 2.0 authentication với Google
- Google Drive file sync và management
- Token management tự động (refresh token)
- Xem chi tiết tại [docs/google-drive.md](./docs/google-drive.md)

### 4. Cloud Data Management
- Tích hợp với Telegram cloud data
- Quản lý cloud data providers
- Event-driven architecture cho data sync

### 5. Scheduled Tasks
- Cron-based scheduling
- Job execution với Redis lock để tránh duplicate
- Job events tracking
- Support cho data provider scheduling

### 6. Queue & Workers
- Background job processing với Bull Queue
- Redis-backed queue system
- Worker processors cho các tác vụ nặng
- Retry mechanism và error handling

## Scripts có sẵn

```bash
# Development
npm run start:dev          # Chạy ở chế độ development với watch mode
npm run start:debug        # Chạy ở chế độ debug

# Production
npm run build              # Build ứng dụng
npm run start:prod         # Chạy production build

# Database
npm run migration:generate # Tạo migration mới (với --name=migration_name)
npm run migration:create   # Tạo migration file trống (với --name=migration_name)
npm run migration:run      # Chạy migrations
npm run migration:revert   # Revert migration cuối cùng
npm run schema:drop        # Xóa toàn bộ schema (cẩn thận!)

# Code Quality
npm run lint               # Kiểm tra lỗi linting
npm run lint:fix           # Tự động sửa lỗi linting
npm run format             # Format code với Prettier
npm run prettier:write     # Format toàn bộ project

# Utilities
npm run seed               # Chạy database seeder
npm run clean              # Xóa thư mục dist
npm run clean-logs         # Xóa log files
```

## Cấu trúc Database

Dự án sử dụng TypeORM với PostgreSQL, hỗ trợ:
- Snake case naming strategy
- Migration system
- Entity relationships
- Query builder
- Transaction support

## Security

- JWT authentication cho tất cả protected endpoints
- Password hashing với bcrypt
- CORS configuration
- Helmet cho security headers
- Rate limiting
- Input validation với class-validator

## Logging

Hệ thống sử dụng Winston logger với:
- Daily rotate file logs
- Console output cho development
- Log levels: error, warn, info, debug
- Request logging với Morgan middleware

## Testing

```bash
# Chạy tests (nếu có)
npm test
```

## Docker

Dự án hỗ trợ containerization với Docker:
```bash
# Build image
docker build -t only-one-be .

# Run container
docker-compose up
```

## Contributing

1. Tạo branch mới từ `main`
2. Commit theo convention (sử dụng commitizen)
3. Tạo Pull Request
4. Đảm bảo code pass linting và tests

## License

UNLICENSED - Private project

## Tác giả

Only One Team
