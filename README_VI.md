# DDG Tracking Web v1

Đây là bản **Web Browser** dùng cùng Supabase với app desktop DDG Tracking.

## Có thể dùng trên trình duyệt
- Login bằng Supabase account hiện tại.
- Dashboard / Project Portfolio.
- Project Setup cơ bản.
- Project Lead hiển thị theo project_members.
- Task Management: Status, Phase, Tracked Hours, nhiều Assignees.
- Change Orders.
- Attendance / Live Team / Leave Requests.
- Dùng chung dữ liệu với Tracking.exe.

## Không thay thế Tracking.exe
Trình duyệt không nên dùng để:
- theo dõi keyboard/mouse toàn máy,
- phát hiện application đang dùng toàn hệ thống,
- auto screenshot desktop,
- chạy nền ở System Tray.

Các chức năng tracking máy tính vẫn để ở Tracking.exe. Web dùng cho quản lý/xem dữ liệu.

## Chạy thử trên máy
1. Giải nén folder.
2. Double-click `run_web.bat`.
3. Trình duyệt mở `http://localhost:8080`.
4. Login bằng tài khoản Supabase đang dùng trong Tracking.exe.

Không mở trực tiếp `index.html` bằng file:// vì browser module/CDN có thể bị chặn.

## Đưa lên Internet
Đây là static website, có thể deploy lên:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

Chỉ cần upload toàn bộ folder. Không cần server riêng cho frontend vì backend là Supabase.

## Bảo mật
Web chỉ chứa Supabase Publishable Key. Quyền thực tế phải được bảo vệ bằng RLS trong Supabase. Không đưa service_role / secret key vào frontend.
