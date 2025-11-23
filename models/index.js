/**
 * AI 模型注册表
 * 将所有模型类注册到一个对象中，方便通过域名查找
 * 
 * 注意：此文件需要在页面上下文中执行，模型类必须已经加载
 */

// 所有模型类的列表（统一管理，避免在基类中硬编码）
const ALL_MODEL_CLASSES = [
  ChatGPT, Claude, Gemini, Grok, Qwen, Doubao,
  DeepSeek, Kimi, Wenxin, ChatGLM, MiniMax, Yuanbao
];

// 模型注册表（在页面上下文中使用）
const AIModelRegistry = {
  'chatgpt.com': () => new ChatGPT(),
  'claude.ai': () => new Claude(),
  'gemini.google.com': () => new Gemini(),
  'grok.com': () => new Grok(),
  'www.qianwen.com': () => new Qwen(),
  'www.doubao.com': () => new Doubao(),
  'deepseek.com': () => new DeepSeek(),
  'chat.deepseek.com': () => new DeepSeek(),
  'www.kimi.com': () => new Kimi(),
  'yiyan.baidu.com': () => new Wenxin(),
  'chatglm.cn': () => new ChatGLM(),
  'agent.minimaxi.com': () => new MiniMax(),
  'yuanbao.tencent.com': () => new Yuanbao()
};

/**
 * 根据域名获取对应的模型实例
 * @param {string} hostname - 域名
 * @returns {AIModel|null}
 */
function getModelByHostname(hostname) {
  // 直接匹配
  if (AIModelRegistry[hostname]) {
    return AIModelRegistry[hostname]();
  }
  
  // 模糊匹配（支持子域名）
  for (const domain in AIModelRegistry) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      return AIModelRegistry[domain]();
    }
  }
  
  return null;
}

/**
 * 获取所有模型类
 * @returns {Array<Function>} 所有模型类的数组
 */
function getAllModelClasses() {
  return ALL_MODEL_CLASSES.filter(cls => cls && typeof cls === 'function');
}

/**
 * 获取所有 AI 站点信息（从模型类中获取）
 * @returns {Array<{name: string, url: string}>}
 */
function getAllAISites() {
  const sites = [];
  const addedNames = new Set();
  
  for (const ModelClass of ALL_MODEL_CLASSES) {
    if (ModelClass && ModelClass.NAME && ModelClass.URL) {
      // 避免重复添加（DeepSeek 有两个域名）
      if (!addedNames.has(ModelClass.NAME)) {
        sites.push({
          name: ModelClass.NAME,
          url: ModelClass.URL
        });
        addedNames.add(ModelClass.NAME);
      }
    }
  }
  
  return sites;
}

/**
 * 获取所有平台名称
 * @returns {Array<string>} 平台名称数组
 */
function getAllPlatformNames() {
  const names = [];
  const addedNames = new Set();
  
  for (const ModelClass of ALL_MODEL_CLASSES) {
    if (ModelClass && ModelClass.NAME) {
      if (!addedNames.has(ModelClass.NAME)) {
        names.push(ModelClass.NAME);
        addedNames.add(ModelClass.NAME);
      }
    }
  }
  
  return names;
}

/**
 * 获取平台图标映射
 * @returns {Object} 平台名称到图标路径的映射
 */
function getPlatformIcons() {
  const icons = {};
  
  for (const ModelClass of ALL_MODEL_CLASSES) {
    if (ModelClass && ModelClass.NAME && ModelClass.ICON) {
      icons[ModelClass.NAME] = ModelClass.ICON;
    }
  }
  
  return icons;
}

/**
 * 获取平台 i18n 键映射
 * @returns {Object} 平台名称到 i18n 键的映射
 */
function getPlatformI18nKeys() {
  const keys = {};
  
  for (const ModelClass of ALL_MODEL_CLASSES) {
    if (ModelClass && ModelClass.NAME && ModelClass.I18N_KEY) {
      keys[ModelClass.NAME] = ModelClass.I18N_KEY;
    }
  }
  
  return keys;
}

/**
 * 获取平台显示名称（支持 i18n）
 * @param {string} platform - 平台名称
 * @param {Function} i18n - i18n 函数
 * @returns {string} 显示名称
 */
function getPlatformDisplayName(platform, i18n) {
  // 找到对应的模型类
  for (const ModelClass of ALL_MODEL_CLASSES) {
    if (ModelClass && ModelClass.NAME === platform) {
      return ModelClass.getDisplayName(i18n);
    }
  }
  return platform; // 如果找不到，直接返回平台名称
}

/**
 * 获取所有回退 actions（用于模型类未加载时的回退）
 * @returns {Object} actions 对象
 */
function getFallbackActions() {
  const actions = {};
  
  // 为每个模型创建回退函数
  for (const domain in AIModelRegistry) {
    actions[domain] = async (query) => {
      // 尝试使用模型类
      try {
        const model = AIModelRegistry[domain]();
        if (model && typeof model.sendQuery === 'function') {
          return await model.sendQuery(query);
        }
      } catch (e) {
        console.log(`[MultiAI] Model class not available for ${domain}, using fallback`);
      }
      
      // 如果模型类不可用，调用模型的回退方法
      const modelClass = {
        'chatgpt.com': ChatGPT,
        'claude.ai': Claude,
        'gemini.google.com': Gemini,
        'grok.com': Grok,
        'www.qianwen.com': Qwen,
        'www.doubao.com': Doubao,
        'deepseek.com': DeepSeek,
        'chat.deepseek.com': DeepSeek,
        'www.kimi.com': Kimi,
        'yiyan.baidu.com': Wenxin,
        'chatglm.cn': ChatGLM,
        'agent.minimaxi.com': MiniMax,
        'yuanbao.tencent.com': Yuanbao
      };
      
      if (modelClass[domain] && typeof modelClass[domain].fallback === 'function') {
        return await modelClass[domain].fallback(query);
      }
      
      return false;
    };
  }
  
  return actions;
}

// 导出函数供 popup.js 使用（如果 models/index.js 被加载到 popup 上下文）
if (typeof window !== 'undefined') {
  window.getPlatformDisplayNameFromModels = getPlatformDisplayName;
}
