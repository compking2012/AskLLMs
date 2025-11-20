# AI 模型模块说明

## 文件结构

### 1. `ai-model-base.js`
- **作用**: 定义 AI 模型基类 `AIModel`
- **内容**: 
  - 基础属性：`name`, `url`
  - 基础方法：`getName()`, `getUrl()`, `executeQuery()`
  - 功能接口（预留）：
    - `canEnableDeepThinking()` / `enableDeepThinking()` - 深度思考
    - `canEnableWebSearch()` / `enableWebSearch()` - 网络搜索
    - `canUploadFile()` / `uploadFile()` - 上传文件
    - `canGenerateImage()` / `generateImage()` - 生成图片
    - `canSelectModel()` / `selectModel()` / `getAvailableModels()` / `getCurrentModel()` - 模型选择

### 2. `ai-model-factory.js`
- **作用**: 模型工厂类 `AIModelFactory`
- **功能**:
  - `registerModel(model)` - 注册模型
  - `getModel(name)` - 根据名称获取模型
  - `getAllModels()` - 获取所有模型
  - `getModelsByNames(names)` - 根据名称列表获取模型列表
  - `getAllModelNames()` - 获取所有模型名称

### 3. `ai-model-implementations.js`
- **作用**: 所有 AI 模型的具体实现
- **依赖**: 需要先加载 `ai-model-base.js` 和 `ai-model-factory.js`
- **内容**: 
  - 所有模型类（ChatGPT, Claude, Gemini 等）
  - 自动注册所有模型到工厂

## 加载顺序

在 `background.js` 中使用 `importScripts` 按以下顺序加载：

```javascript
importScripts(
  'models/ai-model-base.js',           // 1. 基类定义
  'models/ai-model-factory.js',        // 2. 工厂类
  'models/ai-model-implementations.js' // 3. 所有模型实现
);
```

## 使用示例

```javascript
// 获取所有模型
const allModels = AIModelFactory.getAllModels();

// 根据名称获取模型
const chatGPT = AIModelFactory.getModel('ChatGPT');

// 检查功能支持
if (chatGPT.canEnableDeepThinking()) {
  await chatGPT.enableDeepThinking();
}

// 执行查询
await chatGPT.executeQuery('Hello', { deepThinking: true });
```

## 扩展新功能

当需要实现新功能时（如网络搜索、文件上传等），只需：

1. 在基类中已有接口定义（如 `canEnableWebSearch()`）
2. 在支持的模型子类中重写相应方法
3. 实现具体逻辑

例如，为 ChatGPT 添加网络搜索支持：

```javascript
class ChatGPTModel extends AIModel {
  canEnableWebSearch() {
    return true; // ChatGPT 支持网络搜索
  }

  async enableWebSearch() {
    // 实现 ChatGPT 的网络搜索启用逻辑
  }
}
```

