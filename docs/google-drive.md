# Google Drive Service

Service này cung cấp khả năng sync dữ liệu từ Google Drive về database local.

## Tính năng

- **OAuth 2.0 Authentication**: Xác thực với Google Drive API
- **File Sync**: Đồng bộ files từ Google Drive về database
- **Token Management**: Quản lý access token và refresh token
- **File Management**: CRUD operations cho files đã sync
- **Filtering**: Lọc files theo folder, trạng thái, loại file

## Cấu hình

### Environment Variables

Thêm các biến môi trường sau vào file `.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Google Cloud Console Setup

1. Tạo project trên Google Cloud Console
2. Enable Google Drive API
3. Tạo OAuth 2.0 credentials
4. Thêm redirect URI: `http://localhost:3000/auth/google/callback`

## API Endpoints

### 1. Authorize Google Drive Access

```http
POST /google-drive/authorize
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "code": "authorization_code_from_google",
  "redirectUri": "http://localhost:3000/auth/google/callback"
}
```

### 2. Sync Files

```http
POST /google-drive/sync
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "folderId": "optional_folder_id",
  "includeTrashed": false,
  "starredOnly": false,
  "mimeType": "application/pdf"
}
```

### 3. Get User Files (with filtering and pagination)

```http
GET /google-drive/files?page=1&limit=20&mimeType=application/pdf&starredOnly=false&trashedOnly=false
Authorization: Bearer <jwt_token>
```

### 4. Get Google Drive Status

```http
GET /google-drive/status
Authorization: Bearer <jwt_token>
```

### 5. Get Specific File

```http
GET /google-drive/files/:id
Authorization: Bearer <jwt_token>
```

### 6. Refresh Token

```http
POST /google-drive/refresh-token
Authorization: Bearer <jwt_token>
```

### 7. Revoke Access

```http
DELETE /google-drive/revoke
Authorization: Bearer <jwt_token>
```

## Database Schema

### google_drive_tokens

| Column        | Type          | Description                |
| ------------- | ------------- | -------------------------- |
| id            | UUID          | Primary key                |
| user_id       | UUID          | Foreign key to users table |
| access_token  | VARCHAR(2000) | Google access token        |
| refresh_token | VARCHAR(2000) | Google refresh token       |
| expires_at    | TIMESTAMP     | Token expiration time      |
| scope         | VARCHAR(100)  | OAuth scope                |
| token_type    | VARCHAR(100)  | Token type                 |
| is_active     | BOOLEAN       | Token status               |

### google_drive_files

| Column            | Type          | Description                |
| ----------------- | ------------- | -------------------------- |
| id                | UUID          | Primary key                |
| google_drive_id   | VARCHAR(100)  | Google Drive file ID       |
| name              | VARCHAR(500)  | File name                  |
| mime_type         | VARCHAR(100)  | MIME type                  |
| size              | BIGINT        | File size in bytes         |
| web_view_link     | VARCHAR(1000) | Web view link              |
| web_content_link  | VARCHAR(1000) | Web content link           |
| thumbnail_link    | VARCHAR(1000) | Thumbnail link             |
| parent_folder_id  | VARCHAR(100)  | Parent folder ID           |
| last_modified     | TIMESTAMP     | Last modified time         |
| last_viewed_by_me | TIMESTAMP     | Last viewed time           |
| is_trashed        | BOOLEAN       | Trashed status             |
| is_starred        | BOOLEAN       | Starred status             |
| user_id           | UUID          | Foreign key to users table |
| metadata          | JSONB         | Additional metadata        |

## Sử dụng

### 1. Setup OAuth Flow

```typescript
// Frontend: Redirect user to Google OAuth
const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${REDIRECT_URI}&` +
    `scope=https://www.googleapis.com/auth/drive.readonly&` +
    `response_type=code&` +
    `access_type=offline`;

window.location.href = googleAuthUrl;
```

### 2. Handle OAuth Callback

```typescript
// Frontend: Get authorization code from URL
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

// Send to backend
await fetch('/google-drive/authorize', {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        code,
        redirectUri: REDIRECT_URI,
    }),
});
```

### 3. Sync Files

```typescript
// Sync all files
const syncResult = await fetch('/google-drive/sync', {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
});

// Sync specific folder
const syncResult = await fetch('/google-drive/sync', {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        folderId: 'folder_id_here',
    }),
});
```

### 4. Get Files

```typescript
// Get paginated files
const response = await fetch('/google-drive/files?page=1&limit=20', {
    headers: {
        Authorization: `Bearer ${jwtToken}`,
    },
});

const { files, total, page, limit } = await response.json();
```

## Migration

Chạy migration để tạo các bảng:

```bash
npm run migration:run
```

## Error Handling

Service xử lý các lỗi sau:

- **401 Unauthorized**: Token không hợp lệ hoặc hết hạn
- **400 Bad Request**: Tham số không hợp lệ
- **404 Not Found**: File không tồn tại
- **500 Internal Server Error**: Lỗi server

## Logging

Service sử dụng Winston logger để log các hoạt động:

- Authorization success/failure
- Token refresh
- File sync progress
- Error details

## Security

- Access tokens được mã hóa trong database
- JWT authentication cho tất cả endpoints
- Token expiration handling
- Secure OAuth flow
