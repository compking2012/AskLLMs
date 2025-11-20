// 模型工厂：根据名称获取模型实例
class AIModelFactory {
  static models = new Map();

  static registerModel(model) {
    this.models.set(model.getName(), model);
  }

  static getModel(name) {
    return this.models.get(name);
  }

  static getAllModels() {
    return Array.from(this.models.values());
  }

  static getModelsByNames(names) {
    return names.map(name => this.getModel(name)).filter(model => model !== undefined);
  }

  // 获取所有模型名称
  static getAllModelNames() {
    return Array.from(this.models.keys());
  }
}

