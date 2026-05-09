# Architecture Visualizer 🚀

Visualize your project structure with a stunning, interactive force-directed graph directly inside VS Code.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![VS Code](https://img.shields.io/badge/vscode-extension-blueviolet.svg)

## ✨ Features

- **Interactive Graph**: Drag, zoom, and explore your project's architecture.
- **Physics-Based Layout**: Files and folders automatically arrange themselves for clarity.
- **Real-time Scanning**: Analyzes your workspace dynamically.
- **Glassmorphism UI**: Modern, premium dark-themed interface.
- **Quick Insights**: Hover over nodes to see file paths, sizes, and types.

## 📦 Installation

### From VSIX (Recommended for Users)
1. Download the `arch-viz-0.0.1.vsix` file.
2. In VS Code, open the **Extensions** view (`Ctrl+Shift+X`).
3. Click the `...` (Views and More Actions) in the top right.
4. Select **Install from VSIX...** and choose the downloaded file.

### For Developers
1. Clone this repository.
2. Run `npm install`.
3. Press `F5` to open the Extension Development Host.

## 🚀 How to Use

1. **Open a Project**: Open any folder or workspace in VS Code.
2. **Trigger the Command**: 
   - Press `Ctrl + Shift + P` to open the Command Palette.
   - Type **`Visualize Project Architecture`** and press `Enter`.
3. **Interact**:
   - **Left Click + Drag**: Pan the view.
   - **Scroll Wheel**: Zoom in and out.
   - **Hover**: See file/folder details in the floating panel.

## 🎨 Design Language

- 📁 **Directories**: Large indigo nodes.
- 📄 **TypeScript/JS**: Blue/Yellow nodes.
- 🎨 **CSS/HTML**: Blue/Orange nodes.
- ⚙️ **JSON/Config**: White nodes.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Built with ❤️ by [chuitrai](https://github.com/chuitrai)
