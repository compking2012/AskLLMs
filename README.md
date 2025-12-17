# Ask LLMs / 问问大模型

一键向多个大模型发送相同问题，同时对比 ChatGPT、Claude、Gemini、千问、豆包、DeepSeek、Kimi、Grok 的回答。

## 使用方法

### 方式一：点击扩展图标
1. 点击浏览器工具栏中的扩展图标 🤖
2. 在弹出窗口中输入问题
3. 按 Enter 或点击"发送"
4. **优势**：在任何页面（包括 about:blank、chrome:// 等特殊页面）都能使用

### 方式二：使用快捷键
1. 按 `Command+Shift+Y` (Mac) 或 `Ctrl+Shift+Y` (Windows)
2. 在弹出窗口中输入问题
3. 按 Enter 或点击"发送"

## 安装方法

### 方式一：使用打包后的 ZIP 文件（推荐）
1. 运行打包命令（见下方「开发与打包」部分）
2. 在 `dist` 目录中找到 `ask-llms.zip` 文件
3. 打开 Chrome → 地址栏输入 `chrome://extensions`
4. 开启「开发者模式」
5. 点击「加载已解压的扩展程序」，选择解压后的文件夹
   - 或者直接拖拽 ZIP 文件到扩展页面（Chrome 会自动解压）

### 方式二：直接使用源代码
1. 下载本文件夹
2. 打开 Chrome → 地址栏输入 `chrome://extensions`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择本文件夹
5. 完成！

## 开发与打包

### 安装依赖
```bash
npm install
npm run pw:install  # 安装 Playwright 浏览器（用于测试）
```

### 打包（生产模式）
```bash
npm run build
```
- 移除所有 `console.log` 输出
- 代码混淆
- 排除 `tests` 目录
- 生成 `dist/ask-llms.zip` 文件

### 打包（开发模式）
```bash
npm run build:dev
```
- 移除 `console.log` 输出
- 不进行代码混淆（便于调试）
- 排除 `tests` 目录
- 生成 `dist/ask-llms.zip` 文件

## 测试

### 运行测试（Mock 模式，推荐用于 CI）
```bash
npm test -- --mode mock
```
不访问外部网站，使用模拟数据完成测试流程。

### 运行测试（Real 模式，需要登录）
```bash
npm test -- --mode real --userDataDir /path/to/profile --platforms ChatGPT
```
会真正打开 AI 网站并发送查询，需要提前在指定 profile 中登录。

### 调试模式
```bash
npm run test:debug
```
以调试模式运行测试，浏览器会保持打开状态。

### 测试参数说明
- `--platforms <平台列表>`: 指定要测试的平台，如 `ChatGPT,Claude,Gemini` 或 `all`
- `--suite smoke|full|allPairs`: 测试套件类型
- `--toggleMatrixSingle off|each|all`: 单平台测试的开关组合
- `--toggleMatrixMulti off|offAllOn|each|all`: 多平台测试的开关组合
- `--maxCases <N>`: 限制测试用例数量
- `--continueOnError`: 遇到错误继续执行

更多测试说明请参考 `tests/README.md`。

## 功能特点
- ✨ 美观的弹窗界面
- 🚀 自动等待页面加载
- 🎯 智能查找输入框和发送按钮
- 📊 统一标签组方便对比
- 🔍 详细的调试日志