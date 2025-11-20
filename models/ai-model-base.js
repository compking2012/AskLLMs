// AI 模型基类
class AIModel {
  constructor(name, url) {
    this.name = name;
    this.url = url;
  }

  // 获取模型名称
  getName() {
    return this.name;
  }

  // 获取模型URL
  getUrl() {
    return this.url;
  }

  // 执行查询（需要在子类中实现）
  async executeQuery(query, options = {}) {
    throw new Error('executeQuery must be implemented by subclass');
  }

  // 是否支持深度思考
  canEnableDeepThinking() {
    return false;
  }

  // 启用深度思考（需要在支持的子类中实现）
  async enableDeepThinking() {
    if (!this.canEnableDeepThinking()) {
      throw new Error(`${this.name} does not support deep thinking`);
    }
    throw new Error('enableDeepThinking must be implemented by subclass');
  }

  // 是否支持网络搜索
  canEnableWebSearch() {
    return false;
  }

  // 启用网络搜索（需要在支持的子类中实现）
  async enableWebSearch() {
    if (!this.canEnableWebSearch()) {
      throw new Error(`${this.name} does not support web search`);
    }
    throw new Error('enableWebSearch must be implemented by subclass');
  }

  // 是否支持上传文件
  canUploadFile() {
    return false;
  }

  // 上传文件（需要在支持的子类中实现）
  async uploadFile(file) {
    if (!this.canUploadFile()) {
      throw new Error(`${this.name} does not support file upload`);
    }
    throw new Error('uploadFile must be implemented by subclass');
  }

  // 是否支持生成图片
  canGenerateImage() {
    return false;
  }

  // 生成图片（需要在支持的子类中实现）
  async generateImage(prompt) {
    if (!this.canGenerateImage()) {
      throw new Error(`${this.name} does not support image generation`);
    }
    throw new Error('generateImage must be implemented by subclass');
  }

  // 是否支持模型选择
  canSelectModel() {
    return false;
  }

  // 获取可用模型列表（需要在支持的子类中实现）
  async getAvailableModels() {
    if (!this.canSelectModel()) {
      throw new Error(`${this.name} does not support model selection`);
    }
    throw new Error('getAvailableModels must be implemented by subclass');
  }

  // 选择模型（需要在支持的子类中实现）
  async selectModel(modelId) {
    if (!this.canSelectModel()) {
      throw new Error(`${this.name} does not support model selection`);
    }
    throw new Error('selectModel must be implemented by subclass');
  }

  // 获取当前选中的模型（需要在支持的子类中实现）
  async getCurrentModel() {
    if (!this.canSelectModel()) {
      throw new Error(`${this.name} does not support model selection`);
    }
    throw new Error('getCurrentModel must be implemented by subclass');
  }

  // 获取显示名称（用于 UI 显示，支持 i18n）
  getDisplayName() {
    return this.name; // 默认返回内部名称，子类可以覆盖
  }

  // 获取图标路径（相对于扩展根目录）
  getIconPath() {
    // 默认根据名称生成图标路径，子类可以覆盖
    const iconName = this.name.toLowerCase().replace(/\s+/g, '-');
    return `icons/${iconName}.png`;
  }

  // 获取平台标识符（用于 data-platform 属性）
  getPlatformId() {
    return this.name; // 默认返回内部名称
  }
}

