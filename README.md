# AnimeVN v1 — Full-stack local prototype

## Chạy
1. Cài Node.js 18+.
2. Mở terminal trong thư mục này.
3. Chạy `npm install`.
4. Chạy `npm start`.
5. Mở `http://localhost:3000`.

## Có gì?
- Express backend
- Database JSON persistent trong `data/db.json`
- Admin setup/login bằng bcrypt + session
- CRUD anime
- Thêm tập
- URL video
- Có endpoint upload video trong backend (`POST /api/upload`)
- Frontend trang chủ / anime / xem tập / admin

## Lưu ý
Đây là bản chạy thử/self-hosted, chưa phải cấu hình production. Trước khi public Internet cần đổi SESSION_SECRET, dùng HTTPS, database thật, object storage/CDN, phân quyền và giới hạn upload.

Chỉ đăng/phát video mà bạn có quyền phân phối.
