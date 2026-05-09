# Architecture Visualizer 🚀

Trực quan hóa cấu trúc dự án của bạn với biểu đồ tương tác sinh động ngay trong VS Code.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![VS Code](https://img.shields.io/badge/vscode-extension-blueviolet.svg)

## ✨ Tính năng nổi bật

- **Biểu đồ tương tác**: Kéo, thả, thu phóng và khám phá cấu trúc dự án.
- **Sắp xếp vật lý**: Các tệp và thư mục tự động sắp xếp vị trí để tối ưu tầm nhìn.
- **Quét thời gian thực**: Phân tích workspace của bạn một cách năng động.
- **Giao diện Glassmorphism**: Thiết kế hiện đại, cao cấp với chế độ tối (dark mode).
- **Thông tin nhanh**: Di chuột qua các nút (node) để xem đường dẫn, kích thước và loại tệp.

## 📦 Cài đặt

### Từ file VSIX (Dành cho người dùng)
1. Tải về tệp `arch-viz-0.0.1.vsix`.
2. Trong VS Code, mở trình quản lý **Extensions** (`Ctrl+Shift+X`).
3. Nhấp vào biểu tượng `...` (nhiều lựa chọn hơn) ở góc trên bên phải.
4. Chọn **Install from VSIX...** và chọn tệp vừa tải về.

### Dành cho lập trình viên
1. Clone repository này về máy.
2. Chạy lệnh `npm install`.
3. Nhấn `F5` để mở cửa sổ Extension Development Host.

## 🚀 Cách sử dụng

1. **Mở dự án**: Mở bất kỳ thư mục hoặc workspace nào trong VS Code.
2. **Kích hoạt lệnh**: 
   - Nhấn `Ctrl + Shift + P` để mở Command Palette.
   - Gõ **`Visualize Project Architecture`** và nhấn `Enter`.
3. **Tương tác**:
   - **Click chuột trái + Kéo**: Di chuyển toàn bộ biểu đồ.
   - **Cuộn chuột**: Phóng to hoặc thu nhỏ.
   - **Di chuột**: Xem chi tiết tệp/thư mục ở bảng thông tin nổi.

## 🎨 Quy ước màu sắc

- 📁 **Thư mục**: Các nút lớn màu Indigo.
- 📄 **TypeScript/JS**: Các nút màu Xanh dương/Vàng.
- 🎨 **CSS/HTML**: Các nút màu Xanh nhạt/Cam.
- ⚙️ **JSON/Cấu hình**: Các nút màu Trắng.

## 📝 Giấy phép

Dự án này được cấp phép theo Giấy phép MIT - xem tệp [LICENSE](LICENSE) để biết thêm chi tiết.

---
Được xây dựng với ❤️ bởi [chuitrai](https://github.com/chuitrai)
