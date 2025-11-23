/**
 * AI 模型注册表
 * 将所有模型类注册到一个对象中，方便通过域名查找
 * 
 * 注意：此文件需要在页面上下文中执行，模型类必须已经加载
 */

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
 * 获取所有 AI 站点信息（从模型类中获取）
 * @returns {Array<{name: string, url: string}>}
 */
function getAllAISites() {
  const modelClasses = {
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
  
  const sites = [];
  const addedNames = new Set();
  
  for (const domain in modelClasses) {
    const ModelClass = modelClasses[domain];
    if (ModelClass && typeof ModelClass.getSiteInfo === 'function') {
      const siteInfo = ModelClass.getSiteInfo();
      // 避免重复添加（DeepSeek 有两个域名）
      if (!addedNames.has(siteInfo.name)) {
        sites.push(siteInfo);
        addedNames.add(siteInfo.name);
      }
    }
  }
  
  return sites;
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

