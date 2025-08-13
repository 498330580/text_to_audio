# CosyVoice语音合成器

基于CosyVoice2 API的桌面语音合成工具，使用Electron构建，提供美观易用的图形界面。

## 功能特性

### 🎯 核心功能
- **文本转语音**: 支持多种内置音色，实时合成高质量语音
- **批量处理**: 自动分段处理长文本，支持1500字符智能分割
- **字幕生成**: 可选择同时生成SRT格式字幕文件

### 🎨 界面特色
- 现代化Material Design风格界面
- 响应式布局，支持不同屏幕尺寸
- 直观的拖拽文件上传
- 实时进度显示和状态反馈

### ⚙️ 技术特性
- 支持自定义CosyVoice API服务器地址
- 配置文件自动保存和加载
- 多格式音频文件支持（WAV、MP3、M4A等）
- 安全的进程间通信机制

## 项目结构

```
CosyVoice语音合成器/
├── main.js                 # Electron主进程
├── preload.js             # 预加载脚本（安全桥梁）
├── index.html             # 主界面HTML
├── styles.css             # 样式文件
├── renderer.js            # 渲染进程逻辑
├── package.json           # 项目配置和依赖
├── config.json            # 用户配置文件（自动生成）
├── assets/                # 资源文件
│   └── icon.svg          # 应用图标
├── data/                  # 数据目录
│   └── txt_to_audio/     # 批量合成输出目录
├── tmp/                   # 临时文件目录（自动生成）
├── CosyVoice2 api文档.md  # API文档
├── 使用说明.md             # 详细使用说明
└── README.md              # 项目说明
```

## 安装和使用

### 环境要求
- Node.js 16.0 或更高版本
- Windows 10/11, macOS 10.14+, 或 Linux
- 运行中的CosyVoice2 API服务器

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd 小说合成
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动应用**
   ```bash
   npm start
   ```

### 构建发布版本

```bash
# 构建所有平台
npm run build

# 仅构建当前平台
npm run dist
```

构建完成后，可执行文件将在 `dist/` 目录中生成。

## 使用指南

### 1. 配置API服务器

首次使用时，请在设置中配置CosyVoice API服务器地址：
- 默认地址：`http://127.0.0.1:9933`
- 点击"测试连接"验证服务器状态
- 配置会自动保存到本地

### 2. 文本转语音

1. 在"文本转语音"选项卡中输入要合成的文本
2. 选择合适的音色和语速
3. 可选择同时生成字幕文件
4. 点击"开始合成"并选择保存位置

**注意**: 单次文本长度限制为1500字符

### 3. 文件批量处理

1. 切换到"文件转语音"选项卡
2. 拖拽或点击选择TXT文件
3. 设置分段大小（推荐1500字符）
4. 选择音色和语速
5. 点击"批量合成"，程序会自动分段处理并合并音频

**处理流程**:
- 使用选定的内置音色对所有分段进行合成
- 分段语音文件临时保存到 `tmp/` 文件夹
- 合并后的完整音频保存到 `data/txt_to_audio/` 文件夹
- 最终文件名与原TXT文件名相同（扩展名为.wav）
- 处理完成后自动清理临时文件



## API接口说明

本应用支持CosyVoice2的以下API接口：

- `/tts` - 基础文本转语音
- `/v1/audio/speech` - OpenAI兼容接口

详细API文档请参考 `CosyVoice2 api文档.md`

## 支持的音色

### 内置音色
- 中文女
- 中文男
- 英文女
- 英文男
- 日语男
- 粤语女
- 韩语女



## 技术架构

### 主要技术栈
- **Electron**: 跨平台桌面应用框架
- **Node.js**: 后端运行时
- **HTML/CSS/JavaScript**: 前端界面
- **Axios**: HTTP客户端
- **Form-Data**: 文件上传处理

### 安全特性
- Context Isolation: 隔离渲染进程和主进程
- Preload Scripts: 安全的API暴露
- Node Integration: 禁用以提高安全性

## 开发说明

### 开发环境启动
```bash
# 开发模式（自动重载）
NODE_ENV=development npm start
```

### 代码结构
- `main.js`: 主进程，处理系统级操作和API调用
- `preload.js`: 安全桥梁，暴露必要API给渲染进程
- `renderer.js`: 渲染进程，处理UI交互和业务逻辑
- `styles.css`: 现代化UI样式

### 添加新功能
1. 在 `main.js` 中添加IPC处理器
2. 在 `preload.js` 中暴露API
3. 在 `renderer.js` 中实现前端逻辑
4. 在 `index.html` 和 `styles.css` 中更新界面

## 故障排除

### 常见问题

**Q: 超时问题**
A: 症状：提示"超时"但后台API仍在生成语音
   原因：首次使用时需要加载模型（约2-5分钟）
   解决方案：等待后台完成模型加载，查看后台日志确认"TTS模型加载完成!"
   预防：首次启动后先进行一次简短文本合成，让模型完全加载



**Q: GPU进程意外退出错误**
A: 症状：启动时显示"GPU process exited unexpectedly"
   原因：Electron在某些Windows系统上的硬件加速兼容性问题
   解决方案：已在代码中禁用硬件加速，该错误为非致命性错误，不影响正常使用
   说明：此错误不会影响语音合成功能，可以正常使用应用

**Q: 无法连接到API服务器**
A: 检查CosyVoice2服务是否正常运行，确认端口号正确

**Q: 音频合成失败**
A: 检查文本长度是否超限，网络连接是否正常



**Q: 文件无法保存**
A: 检查目标路径权限，确保磁盘空间充足

### 日志查看
开发模式下可通过开发者工具查看详细日志：
- Windows/Linux: `Ctrl+Shift+I`
- macOS: `Cmd+Option+I`

## 许可证

MIT License - 详见LICENSE文件

## 贡献

欢迎提交Issue和Pull Request来改进项目！

### 贡献指南
1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础文本转语音
- 支持文件批量处理
- 现代化UI界面
- 配置管理功能

---

**技术支持**: 如有问题请提交Issue或联系开发者
**项目主页**: [GitHub Repository](https://github.com/your-username/cosyvoice-synthesizer)