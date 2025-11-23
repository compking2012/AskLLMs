/**
 * 获取所有 AI 站点信息（从模型类中获取）
 * 注意：此函数需要在 background 上下文中使用，不能直接访问模型类
 * 所以这里保留硬编码作为回退，实际使用时应该通过注入的脚本获取
 */
function getAISites() {
  // 回退：如果模型类未加载，返回硬编码的列表
  return [
    { name: "ChatGPT", url: "https://chatgpt.com" },
    { name: "Claude", url: "https://claude.ai" },
    { name: "Gemini", url: "https://gemini.google.com" },
    { name: "Grok", url: "https://grok.com" },
    { name: "千问", url: "https://www.qianwen.com" },
    { name: "豆包", url: "https://www.doubao.com" },
    { name: "DeepSeek", url: "https://chat.deepseek.com" },
    { name: "Kimi", url: "https://www.kimi.com" },
    { name: "文心一言", url: "https://yiyan.baidu.com" },
    { name: "智谱清言", url: "https://chatglm.cn" },
    { name: "MiniMax", url: "https://agent.minimaxi.com" },
    { name: "腾讯元宝", url: "https://yuanbao.tencent.com" }
  ];
}

// 为了向后兼容，保留 AI_SITES 常量
const AI_SITES = getAISites();

// 平台名称到 i18n 键的映射（只对中文名字）
const PLATFORM_I18N_KEYS = {
  "千问": "platformTongyi",
  "豆包": "platformDoubao",
  "文心一言": "platformWenxin",
  "智谱清言": "platformChatGLM",
  "腾讯元宝": "platformYuanbao"
};

// 获取平台显示名称（支持 i18n）
function getPlatformDisplayName(platform) {
  const i18nKey = PLATFORM_I18N_KEYS[platform];
  if (i18nKey) {
    return chrome.i18n.getMessage(i18nKey) || platform;
  }
  return platform; // 英文名字直接返回
}
  
  // 注入到目标 AI 页面的脚本（发送 query）
  // 注意：此函数需要先注入模型类代码才能使用
  function sendQueryToPage(query) {
    const host = window.location.hostname;
  
    // 使用模型类处理
    (async () => {
      try {
        // 尝试使用模型类（通过 models/index.js 中的注册表）
        if (typeof getModelByHostname === 'function') {
          const model = getModelByHostname(host);
          if (model) {
            console.log('[MultiAI] Detected:', host, 'using model:', model.name);
            await model.sendQuery(query);
            return;
          }
        }
      } catch (error) {
        console.error(`[MultiAI] Error using model class:`, error);
      }
      
      // 回退：尝试使用静态 fallback 方法
      console.log('[MultiAI] Model class not available, trying fallback for:', host);
      try {
        if (typeof getFallbackActions === 'function') {
          const fallbackActions = getFallbackActions();
          if (fallbackActions[host]) {
            await fallbackActions[host](query);
            return;
          }
          
          // 模糊匹配回退
          for (const domain in fallbackActions) {
            if (host === domain || host.endsWith('.' + domain)) {
              await fallbackActions[domain](query);
              return;
            }
          }
        }
      } catch (fallbackError) {
        console.error(`[MultiAI] Fallback also failed:`, fallbackError);
      }
      
      console.log('[MultiAI] Unknown domain or all methods failed:', host);
    })();
  }
  
  // 注意：旧的 actions 对象代码已移至各模型类的 fallback 方法中
  // 功能现在完全由模型类提供，通过 getModelByHostname() 和 getFallbackActions() 访问
  // injectInputUI 函数已移至 inject-ui.js 文件中
  
  // 等待标签页加载完成
  function waitForTabLoad(tabId) {
    return new Promise((resolve) => {
      const checkTab = async () => {
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab.status === 'complete') {
            resolve(true);
          } else {
            setTimeout(checkTab, 200);
          }
        } catch (e) {
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
  async function openAndSend(url, query, progressTracker, siteName) {
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
    
    // 新标签页需要更长的等待时间，让JS完全初始化
    if (isNewTab) {
      await new Promise(r => setTimeout(r, 3000));
    } else {
      await new Promise(r => setTimeout(r, 2000));
    }
  
    try {
      // 先注入模型类文件（按依赖顺序）
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
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
          'models/index.js'  // 最后注入注册表
        ]
      });
      console.log('[Background] Model classes injected to tab:', tab.id);
      
      // 然后注入发送函数
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: sendQueryToPage,
        args: [query]
      });
      console.log('[Background] Script injected to tab:', tab.id);
      // 注意：状态已经在tab监听器中更新为completed了
    } catch (e) {
      console.error("[Background] 发送失败", url, e);
      // 即使失败也标记为完成（避免卡住）
      progressTracker.updateStatus(siteName, 'completed');
      sendProgressUpdate(progressTracker.getProgress());
    }
    return tab.id;
  }
  
  // 进度跟踪器类
  class ProgressTracker {
    constructor(total, sites) {
      this.total = total;
      this.sites = sites; // [{name, url}]
      this.statuses = {}; // {siteName: 'opening'|'loading'|'completed'}
      this.tabMap = {}; // {tabId: siteName} - 映射tab ID到site名称
      this.currentAction = '';
      this.tabUpdateListener = null;
    }
    
    // 注册tab ID和site名称的映射
    registerTab(tabId, siteName) {
      this.tabMap[tabId] = siteName;
      // 初始状态为opening
      if (!this.statuses[siteName]) {
        this.statuses[siteName] = 'opening';
      }
    }
    
    // 根据tab的实际状态更新进度
    updateTabStatus(tabId, status) {
      const siteName = this.tabMap[tabId];
      if (!siteName) return;
      
      // status可能是 'loading' 或 'complete'
      if (status === 'loading') {
        this.statuses[siteName] = 'loading';
      } else if (status === 'complete') {
        this.statuses[siteName] = 'completed';
      }
      
      this.updateCurrentAction();
      sendProgressUpdate(this.getProgress());
    }
    
    // 手动更新状态（用于特殊情况）
    updateStatus(siteName, status) {
      this.statuses[siteName] = status;
      this.updateCurrentAction();
    }
    
    updateCurrentAction() {
      // 更新当前操作文本
      const loadingSites = this.getSitesByStatus('loading');
      const openingSites = this.getSitesByStatus('opening');
      
      if (loadingSites.length > 0) {
        const platformName = getPlatformDisplayName(loadingSites[0]);
        this.currentAction = chrome.i18n.getMessage('actionLoading', [platformName]);
      } else if (openingSites.length > 0) {
        const platformName = getPlatformDisplayName(openingSites[0]);
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
          this.updateTabStatus(tabId, 'loading');
        }
        // 当tab加载完成时
        else if (changeInfo.status === 'complete') {
          console.log('[Background] Tab', tabId, 'completed loading for', this.tabMap[tabId]);
          this.updateTabStatus(tabId, 'complete');
        }
      };
      
      chrome.tabs.onUpdated.addListener(this.tabUpdateListener);
      console.log('[Background] Tab update listener registered');
    }
    
    // 清理监听器
    cleanup() {
      if (this.tabUpdateListener) {
        chrome.tabs.onUpdated.removeListener(this.tabUpdateListener);
        this.tabUpdateListener = null;
        console.log('[Background] Tab update listener removed');
      }
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
    if (request.action === 'sendToAllAIs') {
      const query = request.query;
      const selectedPlatforms = request.platforms || AI_SITES.map(s => s.name); // 默认全部
      
      console.log('[Background] Received sendToAllAIs request');
      console.log('[Background] Query:', query);
      console.log('[Background] Selected platforms:', selectedPlatforms);
      
      // 根据选中的平台过滤要打开的站点
      const sitesToOpen = AI_SITES.filter(site => selectedPlatforms.includes(site.name));
      console.log('[Background] Will open', sitesToOpen.length, 'tabs');
      
      if (sitesToOpen.length === 0) {
        sendResponse({ success: false, error: 'No platforms selected' });
        return false;
      }
      
      // 创建进度跟踪器
      const progressTracker = new ProgressTracker(sitesToOpen.length, sitesToOpen);
      
      // 设置tab状态监听器（监听所有tab的加载状态）
      progressTracker.setupTabListener();
      
      const promises = [];
      
      for (const site of sitesToOpen) {
        console.log('[Background] Processing:', site.name, site.url);
        // 直接传递 progressTracker 和 siteName
        const promise = openAndSend(site.url, query, progressTracker, site.name).then(id => {
          console.log('[Background] Completed:', site.name, 'tab id:', id);
          return id;
        }).catch(err => {
          console.error('[Background] Failed:', site.name, err);
          // 即使失败也标记为完成
          progressTracker.updateStatus(site.name, 'completed');
          sendProgressUpdate(progressTracker.getProgress());
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
        
        // 清理tab监听器
        progressTracker.cleanup();
        
        // 发送完成消息
        const finalProgress = progressTracker.getProgress();
        console.log('[Background] Final progress:', finalProgress);
        
        // 存储最终进度（分两步，确保 onChanged 能触发）
        chrome.storage.local.set({ 
          progressUpdate: finalProgress,
          progressUpdateTime: Date.now()
        }).then(() => {
          // 延迟设置完成标志，确保进度更新先触发
          setTimeout(() => {
            chrome.storage.local.set({ 
              progressComplete: true
            }).then(() => {
              console.log('[Background] Progress complete flag set');
            }).catch((err) => {
              console.error('[Background] Failed to set progressComplete:', err);
            });
          }, 100);
        }).catch((err) => {
          console.error('[Background] Failed to save final progress:', err);
        });
        
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
      }).catch(err => {
        console.error('[Background] Error in Promise.all:', err);
        
        // 清理tab监听器
        progressTracker.cleanup();
        
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