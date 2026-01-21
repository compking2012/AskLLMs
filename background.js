/**
 * Ask LLMs - Background Service Worker (Manifest V3)
 *
 * 主要职责：
 * - 通过 `importScripts(...)` 加载各平台模型类与 `models/index.js` 注册表，汇总平台元数据（站点/图标/i18n key/能力）
 * - 打开/复用各平台标签页，并注入模型脚本，在页面上下文中执行 `sendQuery(...)`
 * - 跟踪每个平台打开/加载/完成进度，并通过 storage + runtime message 双通道通知 popup
 * - 创建/复用标签组，并根据用户设置更新标题与颜色
 *
 * 重要说明：
 * - `models/index.js` 在全局作用域注册了若干工具函数（如 `getAllAISites()` / `getAllModelClasses()` 等）。
 *   这些函数名可能与本文件中的局部包装函数同名；本文件在 `loadModelsData()` 内**有意**使用
 *   `importScripts` 后的全局实现，并将结果缓存到 `modelsDataCache` 供后续流程使用。
 */

// 模型数据缓存（避免每次打开 popup/发送都重复 importScripts + 计算）
let modelsDataCache = null;
let modelsLoadingPromise = null;

// 响应数据存储（用于监控窗口）
let responseData = new Map();

// 运行中的任务（用于中断控制）
let runningTasks = new Map();
let isGlobalStopSignal = false;

// 需要加载/注入的模型脚本清单（顺序很重要：`models/index.js` 依赖前面的类定义）
const MODEL_SCRIPT_FILES = [
  'models/AIModel.js',
  'models/ChatGPT.js',
  'models/Claude.js',
  'models/Gemini.js',
  'models/Grok.js',
  'models/Qwen.js',
  'models/Doubao.js',
  'models/DeepSeek.js',
  'models/Kimi.js',
  'models/Wenxin.js',
  'models/ChatGLM.js',
  'models/MiniMax.js',
  'models/Yuanbao.js',
  'models/index.js' // 必须最后加载：注册表/收集函数依赖所有模型类已定义
];

/**
 * 加载模型类并收集数据
 * @returns {Promise<Object>} 包含所有平台数据的对象
 */
async function loadModelsData() {
  // 如果已经加载过，直接返回缓存
  if (modelsDataCache) {
    return modelsDataCache;
  }

  // 如果正在加载，等待加载完成
  if (modelsLoadingPromise) {
    return await modelsLoadingPromise;
  }

  // 开始加载
  modelsLoadingPromise = (async () => {
    try {
      // 在 service worker 中使用 importScripts 加载模型文件
      // 注意：这会在全局作用域中定义类
      importScripts(
        ...MODEL_SCRIPT_FILES
      );

      // 使用 models/index.js 中的函数来收集数据
      const sites = getAllAISites();
      const icons = getPlatformIcons();
      const i18nKeys = getPlatformI18nKeys();
      const platformNames = getAllPlatformNames();

      // 获取每个模型的能力信息（canDeepThink、canWebSearch和canGenImage）
      const modelCapabilities = {};
      console.log('[Background] Checking getAllModelClasses:', typeof getAllModelClasses);
      if (typeof getAllModelClasses === 'function') {
        const modelClasses = getAllModelClasses();
        console.log('[Background] Found', modelClasses.length, 'model classes');
        for (const ModelClass of modelClasses) {
          if (ModelClass && ModelClass.NAME) {
            try {
              const instance = new ModelClass();
              const canDeepThink = instance.canDeepThink ? instance.canDeepThink() : false;
              const canWebSearch = instance.canWebSearch ? instance.canWebSearch() : false;
              const canGenImage = instance.canGenImage ? instance.canGenImage() : false;
              const canUploadFile = instance.canUploadFile ? instance.canUploadFile() : false;
              modelCapabilities[ModelClass.NAME] = {
                canDeepThink: canDeepThink,
                canWebSearch: canWebSearch,
                canGenImage: canGenImage,
                canUploadFile: canUploadFile
              };
              console.log('[Background] Capabilities for', ModelClass.NAME, ':', {
                canDeepThink,
                canWebSearch,
                canGenImage,
                canUploadFile
              });
            } catch (e) {
              console.warn('[Background] Failed to get capabilities for', ModelClass.NAME, e);
              modelCapabilities[ModelClass.NAME] = {
                canDeepThink: false,
                canWebSearch: false,
                canGenImage: false,
                canUploadFile: false
              };
            }
          }
        }
      } else {
        console.warn('[Background] getAllModelClasses is not available');
      }
      console.log('[Background] Final modelCapabilities:', modelCapabilities);

      // 缓存数据
      modelsDataCache = {
        sites,
        icons,
        i18nKeys,
        platformNames,
        modelCapabilities,
        defaultSettings: {
          theme: 'auto',
          language: 'auto',
          visiblePlatforms: platformNames,
          platformOrder: platformNames, // 添加平台顺序
          tabGroupTitle: '',
          colorMode: 'random',
          fixedColor: 'blue'
        }
      };

      return modelsDataCache;
    } catch (error) {
      console.error('[Background] Failed to load models:', error);
      // 返回空数据，调用者应该处理这种情况
      return {
        sites: [],
        icons: {},
        i18nKeys: {},
        platformNames: [],
        modelCapabilities: {},
        defaultSettings: {
          theme: 'auto',
          language: 'auto',
          visiblePlatforms: [],
          platformOrder: [],
          tabGroupTitle: '',
          colorMode: 'random',
          fixedColor: 'blue'
        }
      };
    } finally {
      modelsLoadingPromise = null;
    }
  })();

  return await modelsLoadingPromise;
}

/**
 * 获取所有 AI 站点信息（从模型类中获取）
 * @returns {Promise<Array<{name: string, url: string}>>}
 */
async function getAISites() {
  const data = await loadModelsData();
  return data.sites;
}

// 为了向后兼容，使用异步初始化（但保持同步访问的兼容性）
let AI_SITES = [];
loadModelsData().then(data => {
  AI_SITES = data.sites;
});

/**
 * 获取所有平台名称（从各个站点中收集）
 * @returns {Promise<Array<string>>} 平台名称数组
 */
async function getAllPlatformNames() {
  const data = await loadModelsData();
  return data.platformNames;
}

/**
 * 获取平台图标映射
 * @returns {Promise<Object>} 平台名称到图标路径的映射
 */
async function getPlatformIcons() {
  const data = await loadModelsData();
  return data.icons;
}

/**
 * 获取平台 i18n 键映射
 * @returns {Promise<Object>} 平台名称到 i18n 键的映射
 */
async function getPlatformI18nKeys() {
  const data = await loadModelsData();
  return data.i18nKeys;
}

/**
 * 获取平台显示名称（支持 i18n）
 * @param {string} platform - 平台名称
 * @returns {Promise<string>} 显示名称
 */
async function getPlatformDisplayName(platform) {
  await loadModelsData(); // 确保模型已加载
  const data = modelsDataCache;
  
  // 尝试使用 models/index.js 中的函数
  // 由于函数名冲突，我们通过检查函数参数数量来区分
  // models/index.js 中的 getPlatformDisplayName 接受2个参数 (platform, i18n)
  // 当前函数只接受1个参数 (platform)
  try {
    // 在 service worker 中，通过 importScripts 加载的函数会在全局作用域
    // 但由于函数名冲突，我们需要保存原始引用
    const modelsGetPlatformDisplayName = (() => {
      // 尝试从全局作用域获取（如果 models/index.js 已加载）
      // 由于 importScripts 会覆盖同名函数，我们需要在加载前保存引用
      // 这里我们直接使用数据中的 i18n 键来构建显示名称
      return null; // 暂时不使用，避免冲突
    })();
    
    if (modelsGetPlatformDisplayName) {
      const i18nWrapper = (key) => chrome.i18n.getMessage(key) || key;
      return modelsGetPlatformDisplayName(platform, i18nWrapper);
    }
  } catch (e) {
    // 忽略错误，使用回退方案
  }
  
  // 回退：直接使用 i18n 键和模型类的 getDisplayName 方法
  // 通过遍历所有模型类来找到对应的类
  const modelClasses = getAllModelClasses ? getAllModelClasses() : [];
  for (const ModelClass of modelClasses) {
    if (ModelClass && ModelClass.NAME === platform) {
      const i18nWrapper = (key) => chrome.i18n.getMessage(key) || key;
      return ModelClass.getDisplayName(i18nWrapper);
    }
  }
  
  // 最终回退：直接使用 i18n 键
  const i18nKey = data.i18nKeys[platform];
  if (i18nKey) {
    return chrome.i18n.getMessage(i18nKey) || platform;
  }
  return platform; // 英文名字直接返回
}

/**
 * 默认设置
 * @returns {Promise<Object>}
 */
async function getDefaultSettings() {
  const data = await loadModelsData();
  return data.defaultSettings;
}

/**
 * 说明（历史遗留）：
 * 早期版本通过注入 `sendQueryToPage()` 再调用的方式发送 query。
 * 目前为了减少依赖/命名冲突/加载时序问题，已改为在 `openAndSend()` 内使用
 * `chrome.scripting.executeScript({ func })` 直接“内联执行”发送逻辑。
 */
  
  // 等待标签页加载完成
  // 等待标签页加载完成并检查页面就绪
  async function waitForTabLoad(tabId) {
    const maxWaitTime = 30000; // 最大等待时间 30 秒
    const checkInterval = 200; // 检查间隔 200ms
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkTab = async () => {
        try {
          const tab = await chrome.tabs.get(tabId);
          
          // 检查是否超时
          if (Date.now() - startTime > maxWaitTime) {
            console.warn('[Background] Tab load timeout:', tabId);
            resolve(false);
            return;
          }
          
          // 检查标签页状态
          if (tab.status === 'complete') {
            // 额外检查：尝试注入一个简单的脚本来验证页面是否真的就绪
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                  // 检查 document.readyState 和 document.body
                  return document.readyState === 'complete' && document.body !== null;
                }
              });
              console.log('[Background] Tab', tabId, 'is ready');
              resolve(true);
            } catch (e) {
              // 如果注入失败，可能是页面还在加载或 CSP 限制
              console.log('[Background] Tab', tabId, 'status complete but script injection failed, waiting...');
              setTimeout(checkTab, checkInterval);
            }
          } else {
            setTimeout(checkTab, checkInterval);
          }
        } catch (e) {
          console.error('[Background] Error checking tab:', e);
          resolve(false);
        }
      };
      checkTab();
    });
  }
  
  // 发送进度更新（使用 storage 和 runtime message 双重方式）
  function sendProgressUpdate(progress) {
    console.log('[Background] Sending progress update:', progress);
    
    // 方式1: 存储到 chrome.storage（popup 可以轮询）
    chrome.storage.local.set({ 
      progressUpdate: progress,
      progressUpdateTime: Date.now()
    }).then(() => {
      console.log('[Background] Progress saved to storage');
    }).catch((err) => {
      console.error('[Background] Failed to save progress to storage:', err);
    });
    
    // 方式2: 发送 runtime message（如果 popup 打开）
    try {
      chrome.runtime.sendMessage({
        action: 'progressUpdate',
        progress: progress
      }).then(() => {
        console.log('[Background] Progress message sent');
      }).catch((err) => {
        // 如果 popup 已关闭，忽略错误
        console.log('[Background] Progress message failed (popup may be closed):', err.message);
      });
    } catch (e) {
      console.error('[Background] Error sending progress message:', e);
    }
  }
  
  // 打开或复用 AI 标签页并发送
  async function openAndSend(url, query, progressTracker, siteName, startNewChat = false, deepThink = false, webSearch = false, genImage = false, fileData = null) {
    console.log('[Background] ===== openAndSend START =====');
    console.log('[Background] Site:', siteName, 'URL:', url, 'Query:', query.substring(0, 50) + '...');
    const fileInfo = fileData ? (Array.isArray(fileData) ? `${fileData.length} file(s)` : fileData.name) : null;
    console.log('[Background] openAndSend - startNewChat:', startNewChat, 'deepThink:', deepThink, 'webSearch:', webSearch, 'genImage:', genImage, 'file:', fileInfo);

    console.log('[Background] Opening:', url, 'for site:', siteName);
    
    // 提取域名用于更灵活的匹配
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // 尝试查找已存在的标签页（匹配同域名）
    const allTabs = await chrome.tabs.query({});
    const existingTab = allTabs.find(tab => {
      if (!tab.url) return false;
      try {
        const tabUrl = new URL(tab.url);
        return tabUrl.hostname === domain || tabUrl.hostname.endsWith('.' + domain);
      } catch {
        return false;
      }
    });
    
    let tab;
    let isNewTab = false;
    
    if (existingTab) {
      // 复用已存在的标签页
      tab = existingTab;
      // 注册tab（在reload之前，这样监听器能捕获到reload事件）
      progressTracker.registerTab(tab.id, siteName);
      sendProgressUpdate(progressTracker.getProgress());
      
      await chrome.tabs.update(tab.id, { active: false }); // 不抢焦点
      await chrome.tabs.reload(tab.id); // 刷新页面以确保干净状态
      isNewTab = false;
      console.log('[Background] Reusing tab:', tab.id);
    } else {
      // 创建新标签页
      tab = await chrome.tabs.create({ url, active: false });
      // 注册tab（创建后立即注册，监听器会捕获后续的loading状态）
      progressTracker.registerTab(tab.id, siteName);
      sendProgressUpdate(progressTracker.getProgress());
      
      isNewTab = true;
      console.log('[Background] Created new tab:', tab.id);
    }
  
    // 等待页面加载完成（tab监听器会自动更新状态为loading和complete）
    await waitForTabLoad(tab.id);
    
    // 检查任务是否已取消
    if (!runningTasks.has(siteName) || isGlobalStopSignal) {
      throw new Error('Task cancelled');
    }
    
    // 新标签页需要更长的等待时间，让JS完全初始化
    if (isNewTab) {
      await new Promise(r => setTimeout(r, 3000));
    } else {
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // 检查任务是否已取消
    if (!runningTasks.has(siteName) || isGlobalStopSignal) {
      throw new Error('Task cancelled');
    }
  
    // 脚本注入重试机制
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // 检查任务是否已取消
      if (!runningTasks.has(siteName) || isGlobalStopSignal) {
        throw new Error('Task cancelled');
      }

      try {
        console.log(`[Background] Injection attempt ${attempt}/${maxRetries} for tab ${tab.id}`);
        
        // 先注入模型类文件（按依赖顺序）
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: MODEL_SCRIPT_FILES
        });
        console.log('[Background] Model classes injected to tab:', tab.id);
        
        // 等待一小段时间确保模型类已加载
        
        // 检查任务是否已取消
        if (!runningTasks.has(siteName) || isGlobalStopSignal) {
          throw new Error('Task cancelled');
        }

        await new Promise(r => setTimeout(r, 500));
        
        // 直接执行查询（内联 sendQueryToPage 逻辑）
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (query, startNewChat, deepThink, webSearch, genImage, fileData, siteName) => {
            console.log('[MultiAI] ===== Inline execution START =====');
            console.log('[MultiAI] Query:', query.substring(0, 50) + '...');
            const fileInfo = fileData ? (Array.isArray(fileData) ? `${fileData.length} file(s)` : fileData.name) : null;
            console.log('[MultiAI] StartNewChat:', startNewChat, 'DeepThink:', deepThink, 'WebSearch:', webSearch, 'GenImage:', genImage, 'File:', fileInfo);
            const host = window.location.hostname;
            console.log('[MultiAI] Hostname:', host);
            console.log('[MultiAI] getModelByHostname available:', typeof getModelByHostname === 'function');
            console.log('[MultiAI] getFallbackActions available:', typeof getFallbackActions === 'function');
            
            // 将文件数据转换回 File 对象（支持单个文件或文件数组）
            let files = null;
            if (fileData) {
              try {
                // 支持单个文件对象或文件数组
                const fileDataArray = Array.isArray(fileData) ? fileData : [fileData];
                
                files = fileDataArray.map(fileDataItem => {
                  // 将数组转换回 Uint8Array，然后创建 Blob，最后创建 File
                  const uint8Array = new Uint8Array(fileDataItem.data);
                  const blob = new Blob([uint8Array], { type: fileDataItem.type });
                  return new File([blob], fileDataItem.name, { 
                    type: fileDataItem.type,
                    lastModified: fileDataItem.lastModified || Date.now()
                  });
                });
                
                // 如果只有一个文件，保持向后兼容（单个对象）
                // 如果有多个文件，使用数组
                files = files.length === 1 ? files[0] : files;
                
                const fileNames = Array.isArray(files) ? files.map(f => f.name).join(', ') : files.name;
                console.log(`[MultiAI] ${Array.isArray(files) ? files.length : 1} file object(s) created:`, fileNames);
              } catch (error) {
                console.error('[MultiAI] Failed to create File object(s):', error);
              }
            }
            
            let model = null;
            try {
              // 尝试使用模型类（通过 models/index.js 中的注册表）
              if (typeof getModelByHostname === 'function') {
                model = getModelByHostname(host);
                if (model) {
                  console.log('[MultiAI] Detected:', host, 'using model:', model.name);
                  const result = await model.sendQuery(query, startNewChat, deepThink, webSearch, genImage, files);
                  console.log('[MultiAI] Query execution result:', result);
                  
                  // 发送查询后，开始获取响应
                  if (result && typeof model.fetchResponse === 'function') {
                    console.log('[MultiAI] Starting fetchResponse for:', siteName);
                    try {
                      // 使用流式回调实时更新响应，并等待完成
                      // 增加超时时间到 120 秒，以覆盖长回答
                      await model.fetchResponse((content) => {
                        // 发送响应更新到 background
                        chrome.runtime.sendMessage({
                          action: 'responseUpdate',
                          platform: siteName,
                          content: content,
                          status: 'streaming'
                        }).catch(() => {
                          // 忽略错误（background 可能未准备好）
                        });
                      }, 120000).then((finalContent) => {
                        // 响应完成
                        chrome.runtime.sendMessage({
                          action: 'responseUpdate',
                          platform: siteName,
                          content: finalContent,
                          status: 'complete'
                        }).catch(() => {
                          // 忽略错误
                        });
                      }).catch((error) => {
                        console.error('[MultiAI] fetchResponse error:', error);
                        chrome.runtime.sendMessage({
                          action: 'responseUpdate',
                          platform: siteName,
                          content: error.message || '获取响应失败',
                          status: 'error'
                        }).catch(() => {
                          // 忽略错误
                        });
                        // 即使 fetchResponse 失败，只要 sendQuery 成功，也视为发送成功，但不抛出异常中断流程
                      });
                    } catch (fetchError) {
                      console.error('[MultiAI] Error calling fetchResponse:', fetchError);
                    }
                  }
                  
                  return result;
                }
              }
            } catch (error) {
              console.error(`[MultiAI] Error using model class:`, error);
              throw error;
            }
            
            // 回退：尝试使用静态 fallback 方法
            console.log('[MultiAI] Model class not available, trying fallback for:', host);
            try {
              if (typeof getFallbackActions === 'function') {
                const fallbackActions = getFallbackActions();
                if (fallbackActions[host]) {
                  const result = await fallbackActions[host](query);
                  console.log('[MultiAI] Fallback execution result:', result);
                  return result;
                }
                
                // 模糊匹配回退
                for (const domain in fallbackActions) {
                  if (host === domain || host.endsWith('.' + domain)) {
                    const result = await fallbackActions[domain](query);
                    console.log('[MultiAI] Fallback execution result (fuzzy match):', result);
                    return result;
                  }
                }
              }
            } catch (fallbackError) {
              console.error(`[MultiAI] Fallback also failed:`, fallbackError);
              throw fallbackError;
            }
            
            console.error('[MultiAI] Unknown domain or all methods failed:', host);
            throw new Error(`No model handler found for domain: ${host}`);
          },
          args: [query, startNewChat, deepThink, webSearch, genImage, fileData, siteName]
        });
        
        // 等待一小段时间确保执行完成
        await new Promise(r => setTimeout(r, 1000));
        console.log('[Background] Script injected and executed successfully for tab:', tab.id);
        
        // 更新状态为loading（查询已发送，正在执行）
        await progressTracker.updateStatus(siteName, 'loading');
        // 记录loading开始时间
        progressTracker.loadingStartTime[siteName] = Date.now();
        sendProgressUpdate(progressTracker.getProgress());
        
        // 启动查询状态检查（如果还没启动）
        // 禁用状态检查，因为我们现在通过 openAndSend 等待 fetchResponse 完成
        // progressTracker.startQueryStatusCheck();
        
        // 成功，退出重试循环
        break;
        
      } catch (e) {
        lastError = e;
        console.error(`[Background] Injection attempt ${attempt} failed for tab ${tab.id}:`, e);
        
        if (attempt < maxRetries) {
          // 等待后重试，等待时间递增
          const waitTime = attempt * 1000; // 1s, 2s, 3s
          console.log(`[Background] Waiting ${waitTime}ms before retry...`);
          await new Promise(r => setTimeout(r, waitTime));
          
          // 重新等待页面就绪
          console.log('[Background] Re-checking tab status before retry...');
          await waitForTabLoad(tab.id);
        } else {
          // 最后一次尝试也失败
          console.error("[Background] All injection attempts failed for", url, e);
          progressTracker.updateStatus(siteName, 'completed');
          sendProgressUpdate(progressTracker.getProgress());
          throw e; // 重新抛出错误以便上层处理
        }
      }
    }
    console.log('[Background] ===== openAndSend SUCCESS =====');
    console.log('[Background] Tab ID:', tab.id, 'for site:', siteName);
    return tab.id;
  }
  
  // 全局跟踪当前正在执行的查询
  let currentProgressTracker = null;
  
  // 进度跟踪器类
  class ProgressTracker {
    constructor(total, sites) {
      this.total = total;
      this.sites = sites; // [{name, url}]
      this.statuses = {}; // {siteName: 'opening'|'loading'|'completed'}
      this.tabMap = {}; // {tabId: siteName} - 映射tab ID到site名称
      this.tabIdToSiteName = {}; // {tabId: siteName} - 反向映射
      this.currentAction = '';
      this.tabUpdateListener = null;
      this.queryCheckInterval = null; // 查询状态检查定时器
      this.hasEnteredQueryMode = {}; // {siteName: boolean} - 跟踪平台是否曾经进入查询状态
      this.loadingStartTime = {}; // {siteName: timestamp} - 记录loading状态的开始时间
    }
    
    // 注册tab ID和site名称的映射
    registerTab(tabId, siteName) {
      this.tabMap[tabId] = siteName;
      this.tabIdToSiteName[tabId] = siteName;
      // 初始状态为opening
      if (!this.statuses[siteName]) {
        this.statuses[siteName] = 'opening';
      }
    }
    
    // 获取正在执行中的平台列表（opening或loading状态）
    getActivePlatforms() {
      return Object.entries(this.statuses)
        .filter(([name, status]) => status === 'opening' || status === 'loading')
        .map(([name]) => name);
    }
    
    // 获取指定平台的tabId
    getTabIdForPlatform(siteName) {
      return Object.entries(this.tabIdToSiteName)
        .find(([tabId, name]) => name === siteName)?.[0] || null;
    }
    
    // 根据tab的实际状态更新进度
    async updateTabStatus(tabId, status) {
      const siteName = this.tabMap[tabId];
      if (!siteName) return;
      
      // status可能是 'loading' 或 'complete'
      if (status === 'loading') {
        this.statuses[siteName] = 'loading';
      } else if (status === 'complete') {
        this.statuses[siteName] = 'completed';
      }
      
      await this.updateCurrentAction();
      sendProgressUpdate(this.getProgress());
    }
    
    // 手动更新状态（用于特殊情况）
    async updateStatus(siteName, status) {
      this.statuses[siteName] = status;
      await this.updateCurrentAction();
    }
    
    async updateCurrentAction() {
      // 更新当前操作文本
      const loadingSites = this.getSitesByStatus('loading');
      const openingSites = this.getSitesByStatus('opening');
      
      if (loadingSites.length > 0) {
        const platformName = await getPlatformDisplayName(loadingSites[0]);
        this.currentAction = chrome.i18n.getMessage('actionLoading', [platformName]);
      } else if (openingSites.length > 0) {
        const platformName = await getPlatformDisplayName(openingSites[0]);
        this.currentAction = chrome.i18n.getMessage('actionOpening', [platformName]);
      } else {
        this.currentAction = '';
      }
    }
    
    getSitesByStatus(status) {
      return Object.entries(this.statuses)
        .filter(([name, s]) => s === status)
        .map(([name]) => name);
    }
    
    getProgress() {
      const opened = Object.keys(this.statuses).length;
      const loading = this.getSitesByStatus('loading').length;
      const completed = this.getSitesByStatus('completed').length;
      
      return {
        total: this.total,
        opened: opened,
        loading: loading,
        completed: completed,
        currentAction: this.currentAction,
        statuses: { ...this.statuses } // 返回每个平台的状态
      };
    }
    
    // 设置tab更新监听器
    setupTabListener() {
      if (this.tabUpdateListener) return; // 已经设置过了
      
      this.tabUpdateListener = (tabId, changeInfo, tab) => {
        // 只处理我们跟踪的tab
        if (!this.tabMap[tabId]) return;
        
        // 当tab开始加载时
        if (changeInfo.status === 'loading') {
          console.log('[Background] Tab', tabId, 'started loading for', this.tabMap[tabId]);
          this.updateTabStatus(tabId, 'loading').catch(err => {
            console.error('[Background] Error updating tab status:', err);
          });
        }
        // 当tab加载完成时
        else if (changeInfo.status === 'complete') {
          console.log('[Background] Tab', tabId, 'resource loaded for', this.tabMap[tabId]);
          // 忽略 complete 事件，因为这只表示页面资源加载完成，不代表 AI 回答完成
          // 我们的 openAndSend 会在脚本执行完成后才标记 completed
          // 仅当状态还不是 loading 时才更新（例如从 opening -> complete）
          // 但通常 opening -> loading (start load) -> complete
          // 所以这里不做任何状态变更，防止覆盖 loading 状态
        }
      };
      
      chrome.tabs.onUpdated.addListener(this.tabUpdateListener);
      console.log('[Background] Tab update listener registered');
    }
    
    // 启动查询状态检查（使用isQueryingMode判断）
    startQueryStatusCheck() {
      if (this.queryCheckInterval) {
        return; // 已经启动了
      }
      
      console.log('[Background] Starting query status check using isQueryingMode');
      
      // 每2秒检查一次查询状态
      this.queryCheckInterval = setInterval(async () => {
        const activePlatforms = this.getActivePlatforms();
        
        if (activePlatforms.length === 0) {
          // 没有活跃平台，停止检查
          this.stopQueryStatusCheck();
          return;
        }
        
        // 检查每个活跃平台的查询状态
        for (const siteName of activePlatforms) {
          const tabId = this.getTabIdForPlatform(siteName);
          if (!tabId) {
            console.warn(`[Background] No tab ID found for platform: ${siteName}`);
            continue;
          }
          
          try {
            // 检查该平台是否还在查询中
            const result = await chrome.scripting.executeScript({
              target: { tabId: parseInt(tabId) },
              func: async () => {
                const host = window.location.hostname;
                if (typeof getModelByHostname === 'function') {
                  const model = getModelByHostname(host);
                  if (model && typeof model.isQueryingMode === 'function') {
                    return await model.isQueryingMode();
                  }
                }
                return false; // 如果无法判断，返回false（视为完成）
              }
            });
            
            const isQuerying = result && result[0] && result[0].result === true;
            const currentStatus = this.statuses[siteName];
            const loadingStartTime = this.loadingStartTime[siteName] || Date.now();
            const loadingDuration = Date.now() - loadingStartTime;
            
            if (isQuerying) {
              // 检测到正在查询中，标记为已进入查询状态
              if (!this.hasEnteredQueryMode[siteName]) {
                console.log(`[Background] Platform ${siteName} entered query mode (isQueryingMode=true)`);
                this.hasEnteredQueryMode[siteName] = true;
              }
            } else {
              // isQueryingMode() == false
              // 需要判断是否真的完成，还是还在加载/启动阶段
              
              if (this.hasEnteredQueryMode[siteName]) {
                // 曾经进入过查询状态，现在返回false，说明查询已完成
                console.log(`[Background] Platform ${siteName} query completed (was querying, now isQueryingMode=false)`);
                await this.updateStatus(siteName, 'completed');
                sendProgressUpdate(this.getProgress());
              } else if (currentStatus === 'loading' && loadingDuration < 30000) {
                // 还在loading状态，且loading时间少于30秒，且从未进入查询状态
                // 说明可能还在页面加载或查询启动阶段，保持loading状态
                console.log(`[Background] Platform ${siteName} still in loading phase (${Math.round(loadingDuration/1000)}s), isQueryingMode=false but not completed yet`);
                // 不更新状态，继续等待
              } else if (currentStatus === 'loading' && loadingDuration >= 30000) {
                // loading状态超过30秒，且从未进入查询状态，可能是页面加载失败或查询启动失败
                // 标记为完成（避免无限等待）
                console.log(`[Background] Platform ${siteName} loading timeout (${Math.round(loadingDuration/1000)}s), marking as completed`);
                await this.updateStatus(siteName, 'completed');
                sendProgressUpdate(this.getProgress());
              } else if (currentStatus === 'opening') {
                // 还在opening状态，保持opening状态
                console.log(`[Background] Platform ${siteName} still opening, isQueryingMode=false but not completed yet`);
                // 不更新状态，继续等待
              } else {
                // 其他情况，标记为完成
                console.log(`[Background] Platform ${siteName} query completed (isQueryingMode=false, status=${currentStatus})`);
                await this.updateStatus(siteName, 'completed');
                sendProgressUpdate(this.getProgress());
              }
            }
            
            // 如果当前平台被标记为completed，检查是否所有平台都已完成
            if (this.statuses[siteName] === 'completed') {
              // 检查是否所有平台都已完成
              const remainingActive = this.getActivePlatforms();
              if (remainingActive.length === 0) {
                console.log('[Background] All platforms completed');
                this.stopQueryStatusCheck();
                
                // 设置完成标志
                const finalProgress = this.getProgress();
                chrome.storage.local.set({ 
                  progressUpdate: finalProgress,
                  progressUpdateTime: Date.now()
                }).then(() => {
                  setTimeout(() => {
                    chrome.storage.local.set({ 
                      progressComplete: true
                    }).catch(() => {});
                  }, 100);
                }).catch(() => {});
                
                // 清理并清除当前查询跟踪
                this.cleanup();
                if (currentProgressTracker === this) {
                  currentProgressTracker = null;
                }
              }
            }
          } catch (error) {
            console.error(`[Background] Error checking query status for ${siteName}:`, error);
            // 如果检查失败，可能是tab已关闭或其他原因，标记为完成
            await this.updateStatus(siteName, 'completed');
            sendProgressUpdate(this.getProgress());
            
            // 检查是否所有平台都已完成
            const remainingActive = this.getActivePlatforms();
            if (remainingActive.length === 0) {
              this.stopQueryStatusCheck();
              const finalProgress = this.getProgress();
              chrome.storage.local.set({ 
                progressUpdate: finalProgress,
                progressUpdateTime: Date.now()
              }).then(() => {
                setTimeout(() => {
                  chrome.storage.local.set({ 
                    progressComplete: true
                  }).catch(() => {});
                }, 100);
              }).catch(() => {});
              
              this.cleanup();
              if (currentProgressTracker === this) {
                currentProgressTracker = null;
              }
            }
          }
        }
      }, 2000); // 每2秒检查一次
    }
    
    // 停止查询状态检查
    stopQueryStatusCheck() {
      if (this.queryCheckInterval) {
        clearInterval(this.queryCheckInterval);
        this.queryCheckInterval = null;
        console.log('[Background] Query status check stopped');
      }
    }
    
    // 清理监听器
    cleanup() {
      if (this.tabUpdateListener) {
        chrome.tabs.onUpdated.removeListener(this.tabUpdateListener);
        this.tabUpdateListener = null;
        console.log('[Background] Tab update listener removed');
      }
      this.stopQueryStatusCheck();
    }
  }
  
  // 创建标签组或复用现有组
  async function createTabGroup(tabIds) {
    console.log('[Background] ===== createTabGroup START =====');
    console.log('[Background] Input tabIds:', tabIds);
    console.log('[Background] chrome.tabs.group exists:', typeof chrome.tabs.group !== 'undefined');
    
    if (!chrome.tabs.group) {
      console.error('[Background] chrome.tabs.group API not available!');
      console.error('[Background] chrome.tabs methods:', Object.keys(chrome.tabs || {}));
      return;
    }
    
    if (!tabIds || tabIds.length === 0) {
      console.warn('[Background] No tab IDs provided');
      return;
    }
    
    try {
      // 验证标签页是否存在
      console.log('[Background] Step 1: Validating tabs...');
      const allTabs = await chrome.tabs.query({});
      console.log('[Background] Total tabs in browser:', allTabs.length);
      
      const validTabIds = tabIds.filter(id => {
        const exists = allTabs.some(tab => tab.id === id);
        if (!exists) {
          console.warn('[Background] Tab ID', id, 'does not exist');
        }
        return exists;
      });
      
      console.log('[Background] Valid tab IDs:', validTabIds, 'out of', tabIds.length);
      
      if (validTabIds.length === 0) {
        console.error('[Background] No valid tab IDs found!');
        return;
      }
      
      // 获取标签页信息
      console.log('[Background] Step 2: Getting tab info...');
      const tabInfo = await chrome.tabs.get(validTabIds[0]);
      console.log('[Background] First tab info:', { id: tabInfo.id, windowId: tabInfo.windowId, url: tabInfo.url });
      const windowId = tabInfo.windowId;
      
      // 查询现有组（使用 chrome.tabs API 获取标签页的 groupId）
      console.log('[Background] Step 3: Querying existing groups...');
      let existingGroupId = null;
      try {
        // 检查所有标签页，查找标题为"大模型"的组
        // 通过检查标签页的 groupId，然后尝试获取组信息
        const TAB_GROUP_ID_NONE = chrome.tabs.TAB_GROUP_ID_NONE || -1;
        
        // 获取所有标签页的 groupId
        const groupIds = new Set();
        for (const tabId of validTabIds) {
          const tab = await chrome.tabs.get(tabId);
          if (tab.groupId !== undefined && tab.groupId !== TAB_GROUP_ID_NONE && tab.groupId >= 0) {
            groupIds.add(tab.groupId);
          }
        }
        
        console.log('[Background] Found groupIds from tabs:', Array.from(groupIds));
        
        // 尝试通过 chrome.tabGroups 查询（如果可用）
        if (typeof chrome.tabGroups !== 'undefined' && chrome.tabGroups.query) {
          try {
            const allGroups = await chrome.tabGroups.query({ windowId });
            console.log('[Background] Found', allGroups.length, 'tab groups in window', windowId);
            if (allGroups.length > 0) {
              console.log('[Background] Groups:', allGroups.map(g => ({ id: g.id, title: g.title })));
              // 查找匹配的组（使用设置中的标题或默认标题）
              const expectedTitle = await getTabGroupTitle();
              const targetGroup = allGroups.find(group => group.title === expectedTitle);
              if (targetGroup && targetGroup.id >= 0) {
                existingGroupId = targetGroup.id;
                console.log('[Background] Found existing group:', existingGroupId, 'with title:', expectedTitle);
              }
            }
          } catch (queryError) {
            console.warn('[Background] Error querying tabGroups:', queryError);
          }
        }
        
        // 如果没找到，但标签页已经在某个组中，使用第一个组
        if (!existingGroupId && groupIds.size > 0) {
          const firstGroupId = Array.from(groupIds)[0];
          if (firstGroupId >= 0) {
            existingGroupId = firstGroupId;
            console.log('[Background] Using existing group from tabs:', existingGroupId);
          }
        }
      } catch (queryError) {
        console.warn('[Background] Error checking existing groups:', queryError);
      }
      
      // 验证 existingGroupId 是否有效
      const TAB_GROUP_ID_NONE = chrome.tabs.TAB_GROUP_ID_NONE || -1;
      if (existingGroupId !== null && existingGroupId !== undefined && existingGroupId >= 0 && existingGroupId !== TAB_GROUP_ID_NONE) {
        // 复用现有组
        console.log('[Background] Step 4: Reusing existing group...');
        console.log('[Background] Validated existingGroupId:', existingGroupId);
        try {
          await chrome.tabs.group({ groupId: existingGroupId, tabIds: validTabIds });
          console.log('[Background] ✓ Reused existing tab group:', existingGroupId);
          
          // 确保现有组的标题和颜色正确
          const color = await getTabGroupColor();
          await updateGroupTitleAndColor(existingGroupId, color);
        } catch (groupError) {
          console.error('[Background] Error adding tabs to existing group:', groupError);
          console.error('[Background] Error details:', groupError.message, groupError.stack);
          console.log('[Background] Falling back to creating new group...');
          // 如果失败，尝试创建新组
          await createNewGroup(validTabIds, windowId);
        }
      } else {
        // 创建新组
        console.log('[Background] Step 4: Creating new group...');
        console.log('[Background] No valid existing group found (existingGroupId:', existingGroupId, ')');
        await createNewGroup(validTabIds, windowId);
      }
    } catch (e) {
      console.error('[Background] Unexpected error in createTabGroup:', e);
      console.error('[Background] Error stack:', e.stack);
    }
    console.log('[Background] ===== createTabGroup END =====');
  }
  
  // 创建新标签组
  async function createNewGroup(tabIds, windowId) {
    const color = await getTabGroupColor();
    
    console.log('[Background] createNewGroup called with', tabIds.length, 'tabs, windowId:', windowId);
    console.log('[Background] Selected color:', color);
    
    try {
      console.log('[Background] Step 4.1: Calling chrome.tabs.group...');
        const groupId = await chrome.tabs.group({ tabIds });
      console.log('[Background] ✓ Tab group created, groupId:', groupId);
      
      // 使用重试机制尝试更新组标题和颜色
      await updateGroupTitleAndColor(groupId, color);
      
    } catch (createError) {
      console.error('[Background] Error in createNewGroup:', createError);
      console.error('[Background] Error message:', createError.message);
      console.error('[Background] Error stack:', createError.stack);
      throw createError;
    }
  }
  
  // 获取设置
  async function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        const settings = result.settings || {
          tabGroupTitle: '',
          colorMode: 'random',
          fixedColor: 'blue'
        };
        resolve(settings);
      });
    });
  }
  
  // 获取标签组标题
  async function getTabGroupTitle() {
    const settings = await getSettings();
    if (settings.tabGroupTitle && settings.tabGroupTitle.trim()) {
      return settings.tabGroupTitle.trim();
    }
    // 默认值：根据浏览器语言
    const lang = chrome.i18n.getUILanguage();
    return lang.startsWith('zh') ? '大模型' : 'LLM';
  }
  
  // 获取标签组颜色
  async function getTabGroupColor() {
    const settings = await getSettings();
    if (settings.colorMode === 'fixed') {
      return settings.fixedColor || 'blue';
    }
    // 随机颜色
    const colors = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan"];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  // 更新标签组标题和颜色（带重试机制）
  async function updateGroupTitleAndColor(groupId, color) {
    const title = await getTabGroupTitle();
    console.log('[Background] Attempting to update group', groupId, 'with title', title, 'and color', color);
    
    // 重试最多5次，每次等待时间递增
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const waitTime = attempt * 200; // 200ms, 400ms, 600ms, 800ms, 1000ms
      console.log(`[Background] Attempt ${attempt}/${maxRetries}: Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // 检查 chrome.tabGroups 是否可用
      if (typeof chrome.tabGroups !== 'undefined' && chrome.tabGroups.update) {
        try {
          console.log(`[Background] Attempt ${attempt}: chrome.tabGroups is available, updating...`);
          await chrome.tabGroups.update(groupId, { title: title, color: color });
          console.log('[Background] ✓ Tab group updated successfully with title', title, 'and color', color);
          
          // 验证更新
          try {
            const updatedGroup = await chrome.tabGroups.get(groupId);
            console.log('[Background] Group after update:', { 
              id: updatedGroup.id, 
              title: updatedGroup.title, 
              color: updatedGroup.color 
            });
            
            if (updatedGroup.title === title && updatedGroup.color === color) {
              console.log('[Background] ✓ Group title and color confirmed');
              return; // 成功，退出重试循环
            } else {
              console.warn('[Background] Group update may not have taken effect:', {
                expected: { title: title, color: color },
                actual: { title: updatedGroup.title, color: updatedGroup.color }
              });
            }
          } catch (verifyError) {
            console.warn('[Background] Could not verify group update:', verifyError);
          }
          
          // 如果更新成功，退出重试循环
          return;
        } catch (updateError) {
          console.warn(`[Background] Attempt ${attempt} failed:`, updateError.message);
          if (attempt === maxRetries) {
            console.error('[Background] All attempts failed. Group created but title/color not set.');
            console.error('[Background] Error:', updateError);
          }
        }
      } else {
        console.log(`[Background] Attempt ${attempt}: chrome.tabGroups not available yet`);
        if (attempt === maxRetries) {
          console.warn('[Background] chrome.tabGroups API never became available');
          console.warn('[Background] Group created successfully (groupId:', groupId, '), but title/color cannot be set');
        }
      }
    }
  }
  
  // 监听页面发来的发送请求
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 处理响应更新
    if (request.action === 'responseUpdate') {
      const { platform, content, status } = request;
      const responseInfo = { content, status, timestamp: Date.now() };
      responseData.set(platform, responseInfo);
      
      // 存储到 chrome.storage，监控窗口可以通过 chrome.storage.onChanged 监听
      const storageData = {};
      responseData.forEach((data, key) => {
        storageData[`response_${key}`] = data;
      });
      chrome.storage.local.set(storageData).catch(() => {
        // 忽略错误
      });
      
      sendResponse({ success: true });
      return true;
    }
    
    // 处理获取所有响应的请求
    if (request.action === 'getAllResponses') {
      chrome.storage.local.get(null, (items) => {
        const responses = {};
        Object.keys(items).forEach(key => {
          if (key.startsWith('response_')) {
            const platform = key.replace('response_', '');
            responses[platform] = items[key];
          }
        });
        sendResponse({ success: true, responses });
      });
      return true;
    }
    
    // 处理清空所有响应的请求
    if (request.action === 'clearAllResponses') {
      responseData.clear();
      chrome.storage.local.get(null, (items) => {
        const keysToRemove = Object.keys(items).filter(key => key.startsWith('response_'));
        if (keysToRemove.length > 0) {
          chrome.storage.local.remove(keysToRemove);
        }
        sendResponse({ success: true });
      });
      return true;
    }
    
    // 处理获取平台数据的请求
    if (request.action === 'getPlatformData') {
      (async () => {
        try {
          const data = await loadModelsData();
          sendResponse({
            success: true,
            platformNames: data.platformNames,
            platformIcons: data.icons,
            platformI18nKeys: data.i18nKeys,
            modelCapabilities: data.modelCapabilities,
            defaultSettings: data.defaultSettings
          });
        } catch (error) {
          console.error('[Background] Error getting platform data:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // 保持消息通道开放以进行异步响应
    }
    
    // 处理停止所有任务
    if (request.action === 'stopAll') {
      console.log('[Background] Stopping all tasks...');
      isGlobalStopSignal = true;
      
      // 1. 中断所有正在进行的 Promise (openAndSend 层面)
      runningTasks.forEach((controller, platform) => {
        if (controller && typeof controller.reject === 'function') {
           console.log('[Background] Rejecting task promise for:', platform);
           controller.reject(new Error('Task cancelled'));
        }
      });
      runningTasks.clear();

      // 2. 尝试调用页面内的 stopQuery 方法 (内容脚本层面)
      if (currentProgressTracker) {
        const activePlatforms = currentProgressTracker.getActivePlatforms();
        for (const siteName of activePlatforms) {
            const tabId = currentProgressTracker.getTabIdForPlatform(siteName);
            if (tabId) {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: async () => {
                        const host = window.location.hostname;
                        if (typeof getModelByHostname === 'function') {
                            const model = getModelByHostname(host);
                            if (model && typeof model.stopQuery === 'function') {
                                await model.stopQuery();
                            }
                        }
                    }
                }).catch(err => console.warn('[Background] Failed to stop query in tab:', err));
            }
            // 立即更新状态为 completed
            currentProgressTracker.updateStatus(siteName, 'completed');
        }
        sendProgressUpdate(currentProgressTracker.getProgress());
      }
      
      sendResponse({ success: true });
      return true;
    }
    
    // 处理停止单个任务
    if (request.action === 'stopOne') {
      const platform = request.platform;
      if (platform && runningTasks.has(platform)) {
        console.log('[Background] Stopping task:', platform);
        runningTasks.delete(platform);
      }
      sendResponse({ success: true });
      return true;
    }
    
    if (request.action === 'sendToAllAIs') {
      (async () => {
        try {
          const query = request.query;
          const sites = await getAISites();
          const selectedPlatforms = request.platforms || sites.map(s => s.name); // 默认全部
          
          console.log('[Background] Received sendToAllAIs request');
          console.log('[Background] Query:', query);
          console.log('[Background] Selected platforms:', selectedPlatforms);
          
          // 根据选中的平台过滤要打开的站点
          const sitesToOpen = sites.filter(site => selectedPlatforms.includes(site.name));
          console.log('[Background] Will open', sitesToOpen.length, 'tabs');
          
          if (sitesToOpen.length === 0) {
            sendResponse({ success: false, error: 'No platforms selected' });
            return;
          }
          
          // 创建进度跟踪器
          const progressTracker = new ProgressTracker(sitesToOpen.length, sitesToOpen);
          // 保存为当前正在执行的查询
          currentProgressTracker = progressTracker;
          
          // 设置tab状态监听器（监听所有tab的加载状态）
          progressTracker.setupTabListener();
          
          const promises = [];
          
          const startNewChat = request.startNewChat || false;
          const deepThink = request.deepThink || false;
          const webSearch = request.webSearch || false;
          const genImage = request.genImage || false;
          const fileData = request.file || null;
          const fileInfo = fileData ? (Array.isArray(fileData) ? `${fileData.length} file(s)` : fileData.name) : null;
          console.log('[Background] StartNewChat:', startNewChat, 'DeepThink:', deepThink, 'WebSearch:', webSearch, 'GenImage:', genImage, 'File:', fileInfo);
          
          // 重置全局停止信号
          isGlobalStopSignal = false;
          runningTasks.clear();
          
          for (const site of sitesToOpen) {
            // 检查全局停止信号
            if (isGlobalStopSignal) break;
            
            // 创建可控 Promise
            let rejectFunc = null;
            const taskPromise = new Promise((resolve, reject) => {
               rejectFunc = reject;
               // 执行真正的逻辑
               openAndSend(site.url, query, progressTracker, site.name, startNewChat, deepThink, webSearch, genImage, fileData)
                 .then(resolve)
                 .catch(reject);
            });

            // 注册任务控制器
            runningTasks.set(site.name, { 
              startTime: Date.now(),
              reject: rejectFunc
            });
            
            console.log('[Background] Processing:', site.name, site.url);
            
            // 包装 taskPromise 以处理完成和清理
            const promise = taskPromise.then(id => {
              console.log('[Background] Completed:', site.name, 'tab id:', id);
              runningTasks.delete(site.name); // 任务完成，移除
              
              // 标记为完成
              progressTracker.updateStatus(site.name, 'completed');
              sendProgressUpdate(progressTracker.getProgress());
              
              // 检查是否所有任务都已完成
              const remainingActive = progressTracker.getActivePlatforms();
              if (remainingActive.length === 0) {
                 console.log('[Background] All tasks completed');
                 // 设置完成标志
                 const finalProgress = progressTracker.getProgress();
                 chrome.storage.local.set({ 
                   progressUpdate: finalProgress,
                   progressUpdateTime: Date.now()
                 }).then(() => {
                   setTimeout(() => {
                     chrome.storage.local.set({ 
                       progressComplete: true
                     }).catch(() => {});
                   }, 100);
                 }).catch(() => {});
                 
                 // 清理
                 progressTracker.cleanup();
                 if (currentProgressTracker === progressTracker) {
                   currentProgressTracker = null;
                 }
              }
              
              return id;
            }).catch(async (err) => {
              if (err.message === 'Task cancelled') {
                console.log('[Background] Task cancelled:', site.name);
              } else {
                console.error('[Background] Failed:', site.name, err);
              }
              // 即使失败也标记为完成
              await progressTracker.updateStatus(site.name, 'completed');
              sendProgressUpdate(progressTracker.getProgress());
              runningTasks.delete(site.name); // 任务失败或取消，移除
              
              // 检查是否所有任务都已完成
              const remainingActive = progressTracker.getActivePlatforms();
              if (remainingActive.length === 0) {
                 console.log('[Background] All tasks completed (after error)');
                 // 设置完成标志
                 const finalProgress = progressTracker.getProgress();
                 chrome.storage.local.set({ 
                   progressUpdate: finalProgress,
                   progressUpdateTime: Date.now()
                 }).then(() => {
                   setTimeout(() => {
                     chrome.storage.local.set({ 
                       progressComplete: true
                     }).catch(() => {});
                   }, 100);
                 }).catch(() => {});
                 
                 // 清理
                 progressTracker.cleanup();
                 if (currentProgressTracker === progressTracker) {
                   currentProgressTracker = null;
                 }
              }
              
              return null; // 返回 null 而不是 undefined
            });
            
            promises.push(promise);
          }
          
          // 等待所有标签页打开后创建标签组
          Promise.all(promises).then(async (ids) => {
            // 过滤掉 null（失败的标签页）
            const tabIds = ids.filter(id => id !== null);
            console.log('[Background] All tabs opened, tabIds:', tabIds);
            console.log('[Background] Creating group with', tabIds.length, 'tabs');
            
            if (tabIds.length > 0) {
              try {
                await createTabGroup(tabIds);
              } catch (groupError) {
                console.error('[Background] Error creating tab group:', groupError);
              }
            } else {
              console.warn('[Background] No valid tab IDs to group');
            }
            
            // 注意：不再在这里设置完成标志和清理
            // 完成标志由 queryStatusCheck 在检测到所有平台 isQueryingMode() == false 时设置
            // cleanup() 会在所有平台完成后由 queryStatusCheck 调用
            // 这里只记录标签页已打开，查询状态检查会继续监控查询完成状态
            console.log('[Background] All tabs opened, query status check will monitor completion');
            
            try {
              chrome.runtime.sendMessage({
                action: 'progressComplete',
                progress: finalProgress
              }).catch(() => {
                // 如果 popup 已关闭，忽略错误
              });
            } catch (e) {
              // 忽略错误
            }
            
            sendResponse({ success: true, count: tabIds.length });
          }).catch(async (err) => {
            console.error('[Background] Error in Promise.all:', err);
            
            // 清理tab监听器
            progressTracker.cleanup();
            // 清除当前查询跟踪
            if (currentProgressTracker === progressTracker) {
              currentProgressTracker = null;
            }
            
            // 发送错误消息
            try {
              chrome.runtime.sendMessage({
                action: 'progressError',
                error: err.message
              }).catch(() => {
                // 如果 popup 已关闭，忽略错误
              });
            } catch (e) {
              // 忽略错误
            }
            
            sendResponse({ success: false, error: err.message });
          });
        } catch (error) {
          console.error('[Background] Error in sendToAllAIs:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // 保持消息通道开放以进行异步响应
    }
    
    // 处理停止查询请求
    if (request.action === 'stopQuery') {
      (async () => {
        try {
          const platform = request.platform; // 如果指定平台，只停止该平台；否则停止所有
          
          if (!platform) {
             // 如果没有指定平台，视为 stopAll
             console.log('[Background] stopQuery called without platform, delegating to stopAll logic');
             isGlobalStopSignal = true;
             
             // 1. 中断 Promise
             runningTasks.forEach((controller, p) => {
                if (controller && typeof controller.reject === 'function') {
                   controller.reject(new Error('Task cancelled'));
                }
             });
             runningTasks.clear();
             
             // 2. 页面内停止
             if (currentProgressTracker) {
                const activePlatforms = currentProgressTracker.getActivePlatforms();
                for (const siteName of activePlatforms) {
                    const tabId = currentProgressTracker.getTabIdForPlatform(siteName);
                    if (tabId) {
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            func: async () => {
                                const host = window.location.hostname;
                                if (typeof getModelByHostname === 'function') {
                                    const model = getModelByHostname(host);
                                    if (model && typeof model.stopQuery === 'function') {
                                        await model.stopQuery();
                                    }
                                }
                            }
                        }).catch(() => {});
                    }
                    currentProgressTracker.updateStatus(siteName, 'completed');
                }
                sendProgressUpdate(currentProgressTracker.getProgress());
             }
             
             sendResponse({ success: true });
             return;
          }

          if (!currentProgressTracker) {
            sendResponse({ success: false, error: 'No active query to stop' });
            return;
          }
          
          const activePlatforms = currentProgressTracker.getActivePlatforms();
          if (activePlatforms.length === 0) {
            sendResponse({ success: false, error: 'No active platforms to stop' });
            return;
          }
          
          const platformsToStop = platform ? [platform] : activePlatforms;
          const stoppedPlatforms = [];
          
          for (const siteName of platformsToStop) {
            const tabId = currentProgressTracker.getTabIdForPlatform(siteName);
            if (!tabId) {
              console.warn(`[Background] No tab ID found for platform: ${siteName}`);
              continue;
            }
            
            try {
              // 先注入模型类文件
              await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: MODEL_SCRIPT_FILES
              });
              await new Promise(r => setTimeout(r, 500)); // 等待注入完成
              
              // 在对应标签页中执行stopQuery
              const stopResult = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: async (siteName) => {
                  const host = window.location.hostname;
                  console.log(`[MultiAI] Calling stopQuery for ${siteName} on hostname:`, host);
                  
                  // 尝试使用模型类
                  if (typeof getModelByHostname === 'function') {
                    const model = getModelByHostname(host);
                    if (model && typeof model.stopQuery === 'function') {
                      console.log(`[MultiAI] Executing stopQuery for ${siteName}`);
                      const result = await model.stopQuery();
                      console.log(`[MultiAI] stopQuery result for ${siteName}:`, result);
                      return result;
                    }
                  }
                  
                  console.warn(`[MultiAI] stopQuery not available for ${siteName} on hostname:`, host);
                  return false;
                },
                args: [siteName]
              });
              
              // 等待stopQuery完成（stopResult[0].result是Promise的结果）
              const stopSuccess = stopResult && stopResult[0] && stopResult[0].result;
              console.log(`[Background] stopQuery completed for ${siteName}, result:`, stopSuccess);
              
              // 更新状态为completed（停止后视为完成）
              await currentProgressTracker.updateStatus(siteName, 'completed');
              stoppedPlatforms.push(siteName);
              console.log(`[Background] Stopped query for platform: ${siteName}`);
            } catch (error) {
              console.error(`[Background] Error stopping query for ${siteName}:`, error);
              // 即使出错，也标记为完成，避免阻塞状态转换
              await currentProgressTracker.updateStatus(siteName, 'completed');
              stoppedPlatforms.push(siteName);
            }
          }
          
          // 发送进度更新
          sendProgressUpdate(currentProgressTracker.getProgress());
          
          // 检查是否所有平台都已完成
          const remainingActive = currentProgressTracker.getActivePlatforms();
          if (remainingActive.length === 0) {
            // 所有平台都已完成，标记为完成
            const finalProgress = currentProgressTracker.getProgress();
            chrome.storage.local.set({ 
              progressUpdate: finalProgress,
              progressUpdateTime: Date.now()
            }).then(() => {
              setTimeout(() => {
                chrome.storage.local.set({ 
                  progressComplete: true
                }).catch(() => {});
              }, 100);
            }).catch(() => {});
            
            currentProgressTracker.cleanup();
            currentProgressTracker = null;
          }
          
          sendResponse({ 
            success: true, 
            stoppedPlatforms: stoppedPlatforms,
            remainingActive: remainingActive
          });
        } catch (error) {
          console.error('[Background] Error in stopQuery:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // 保持消息通道开放以进行异步响应
    }
  });
  
  // 快捷键或点击图标触发：发送消息给 popup，由 popup 处理注入
  // injectInputUI 函数已移至 popup.js 中
  chrome.action.onClicked.addListener(async () => {
    // 发送消息给 popup，让 popup 处理注入逻辑
    // 如果 popup 未打开，则打开 popup（popup 会在打开时自动处理）
    // 这里我们直接打开 popup，让用户通过 popup 操作
    chrome.action.openPopup();
  });
  
  // 快捷键也触发
  // 注意：_execute_action 已绑定到 action.onClicked（见 manifest）
  // 所以无需额外监听 commands
  // 所以无需额外监听 commands