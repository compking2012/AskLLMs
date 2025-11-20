// 所有AI模型的具体实现
// 注意：这些类依赖于 AIModel 基类（在 ai-model-base.js 中定义）
// 每个模型类都在独立的文件中定义
// 模型类已经在 background.js 中通过 importScripts 加载

// 注册所有模型到工厂
AIModelFactory.registerModel(new ChatGPTModel());
AIModelFactory.registerModel(new ClaudeModel());
AIModelFactory.registerModel(new GeminiModel());
AIModelFactory.registerModel(new GrokModel());
AIModelFactory.registerModel(new TongyiModel());
AIModelFactory.registerModel(new DoubaoModel());
AIModelFactory.registerModel(new DeepSeekModel());
AIModelFactory.registerModel(new KimiModel());
AIModelFactory.registerModel(new WenxinModel());
AIModelFactory.registerModel(new ChatGLMModel());
AIModelFactory.registerModel(new MiniMaxModel());
AIModelFactory.registerModel(new YuanbaoModel());

