# HIẾN PHÁP DỰ ÁN (PROJECT CONSTITUTION)

Tài liệu này là quy chuẩn tối cao và bắt buộc tuân thủ đối với mọi tác vụ, thay đổi, chỉnh sửa mã nguồn và cấu trúc giao diện trong dự án **Web Quản Lý Sơ Đồ & Thông Tin Lớp Học**.

---

## ĐIỀU 1: TỐI ƯU HIỆU NĂNG VÀ TẢI TRỌNG (PERFORMANCE FIRST)
1. **Đối tượng sử dụng**: Trang web phục vụ lớp học, có thể có nhiều người (học sinh, giáo viên, phụ huynh) cùng truy cập đồng thời.
2. **Yêu cầu kỹ thuật**:
   - Tối ưu hóa dung lượng tải (payload) và tài nguyên tĩnh (assets, CSS, JS).
   - Sử dụng Vanilla JavaScript và CSS tinh gọn, hạn chế các thư viện cồng kềnh không cần thiết.
   - Tránh re-render toàn bộ DOM khi chỉ có một phần nhỏ dữ liệu thay đổi; dọn dẹp các event listener để tránh memory leak.
   - Thao tác `localStorage` phải an toàn, nhanh chóng và có xử lý lỗi.

---

## ĐIỀU 2: CODE NGẮN GỌN & ĐƠN GIẢN HÓA (KISS & CLEAN CODE)
1. **Tiêu chuẩn mã nguồn**:
   - Code phải luôn ngắn gọn, súc tích, dễ đọc, dễ bảo trì và có cấu trúc rõ ràng.
   - **Tuyệt đối tránh phức tạp hóa (Over-engineering)**: Không thêm các lớp trừu tượng dư thừa nếu không cần thiết.
   - Viết hàm theo nguyên tắc đơn nhiệm (Single Responsibility).
2. **Kiểm tra chéo (Code Review)**:
   - **Codex** và **Claude Code** sẽ thực hiện kiểm tra và đánh giá lại chất lượng mã nguồn sau khi hoàn thành. Code phải đảm bảo sạch sẽ, chuẩn mực và không có code thừa/rác (dead code).

---

## ĐIỀU 3: TẬN DỤNG CÁC SKILLS ĐÃ ĐƯỢC TRANG BỊ (SKILL UTILIZATION)
1. Luôn chủ động rà soát và áp dụng các **Skills** phù hợp đã được cấu hình trong hệ thống để tối ưu hóa quy trình phân tích, xử lý dữ liệu và xây dựng ứng dụng web.
2. Tuân thủ các hướng dẫn và best practices từ hệ thống kỹ năng để đạt chất lượng đầu ra cao nhất.

---

## ĐIỀU 4: QUY TRÌNH QUẢN LÝ GIT & GITHUB (GIT POLICY)
1. **Không tự ý commit/push**: Tuyệt đối **KHÔNG** tự động chạy lệnh `git commit` hoặc `git push` lên repository GitHub khi chưa có sự xác nhận và đồng ý rõ ràng từ người dùng.
2. **Quy chuẩn thông điệp (Commit Message)**: Khi được phép commit, thông điệp commit phải ngắn gọn, rõ ràng theo chuẩn Conventional Commits (ví dụ: `feat: ...`, `fix: ...`, `refactor: ...`).

---

## ĐIỀU 5: CHUYÊN GIA DEBUG & TIÊU CHUẨN TRẢI NGHIỆM NGƯỜI DÙNG (UX/UI EXCELLENCE)
1. **Nguyên tắc thiết kế**:
   - Giao diện phải hiện đại, thân thiện, dễ hiểu và dễ sử dụng cho mọi đối tượng.
   - **Chống tràn & Chèn lấn (No Overlapping/Clutter)**: Tất cả chữ viết, nhãn, bảng biểu, thẻ học sinh và các thành phần giao diện (UI components) phải có khoảng cách hợp lý, không được đè lên nhau, không bị cắt xén (clipping) hay hiển thị thừa thãi.
2. **Thích ứng & Trực quan (Responsive & Polish)**:
   - Đảm bảo hiển thị chuẩn xác trên nhiều kích thước màn hình và không làm hỏng tính năng In (Print) hoặc Xuất Ảnh (Export Image) của sơ đồ lớp.
   - Mọi tương tác (hover, click, kéo thả, đóng mở modal) phải mượt mà và có phản hồi thị giác rõ ràng.

---

*Hiến pháp này có hiệu lực bắt buộc cho mọi phiên làm việc tiếp theo.*
