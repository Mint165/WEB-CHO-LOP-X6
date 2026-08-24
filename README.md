# Ứng Dụng Xếp Sơ Đồ Lớp Học Kéo Thả

Ứng dụng giúp quản lý sơ đồ lớp 12/6: kéo thả, khóa chỗ, xáo trộn, nhập danh sách và xuất ảnh.

## Đồng bộ đa thiết bị

Ứng dụng dùng Supabase Database, Auth và Realtime. Hãy đăng nhập **cùng một tài khoản email** trên điện thoại, máy tính hoặc máy tính bảng; mọi thay đổi về học sinh, vị trí ngồi, trạng thái khóa, tiêu đề và thông tin giáo viên sẽ xuất hiện trực tiếp trên các thiết bị khác.

Lần đầu mở phiên bản mới, bạn có thể tạo tài khoản ngay tại màn hình đăng nhập. Nếu Supabase yêu cầu xác nhận email, hãy xác nhận rồi đăng nhập lại.

## Phát triển cục bộ

```bash
npm install
npm run dev
```

Migration Supabase được lưu tại `supabase/migrations/`. Khóa publishable ở `js/supabaseClient.js` chỉ dùng phía trình duyệt; quyền truy cập dữ liệu được bảo vệ bằng Supabase Auth và Row Level Security. Không thêm khóa `service_role` vào mã nguồn hoặc trình duyệt.
