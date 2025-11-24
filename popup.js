// 消息缓存
let messagesCache = {
  en: null,
  zh_CN: null
};

// 当前语言（同步访问）
let currentLanguage = null;

// 加载消息文件
async function loadMessages(locale) {
  if (messagesCache[locale]) {
    return messagesCache[locale];
  }
  
  try {
    const response = await fetch(chrome.runtime.getURL(`_locales/${locale}/messages.json`));
    const messages = await response.json();
    messagesCache[locale] = messages;
    return messages;
  } catch (e) {
    console.error(`Failed to load messages for ${locale}:`, e);
    return null;
  }
}

// 获取当前语言设置（同步版本，使用缓存）
function getCurrentLanguageSync() {
  if (currentLanguage !== null) {
    return currentLanguage;
  }
  
  // 如果缓存未设置，使用浏览器语言作为默认值
  const browserLang = chrome.i18n.getUILanguage();
  return browserLang.startsWith('zh') ? 'zh_CN' : 'en';
}

// 更新当前语言（从设置中读取）
async function updateCurrentLanguage() {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], resolve);
  });
  const language = result.settings?.language || 'auto';
  
  if (language === 'auto') {
    // 使用浏览器语言
    const browserLang = chrome.i18n.getUILanguage();
    currentLanguage = browserLang.startsWith('zh') ? 'zh_CN' : 'en';
  } else {
    currentLanguage = language;
  }
  
  // 预加载当前语言的消息
  await loadMessages(currentLanguage);
}

// i18n 支持函数（同步版本，支持用户语言设置）
function i18n(messageName, substitutions) {
  const locale = getCurrentLanguageSync();
  const messages = messagesCache[locale];
  
  if (messages && messages[messageName]) {
    let message = messages[messageName].message;
    
    // 处理占位符
    if (substitutions && messages[messageName].placeholders) {
      Object.keys(messages[messageName].placeholders).forEach(placeholder => {
        const placeholderInfo = messages[messageName].placeholders[placeholder];
        const index = parseInt(placeholderInfo.content.replace('$', '')) - 1;
        if (substitutions[index] !== undefined) {
          message = message.replace(`$${placeholder}$`, substitutions[index]);
        }
      });
    }
    
    return message;
  }
  
  // 回退到 Chrome 默认 i18n
  return chrome.i18n.getMessage(messageName, substitutions);
}

// 初始化 i18n
async function initI18n() {
  // 更新当前语言
  await updateCurrentLanguage();
  
  // 翻译所有带有 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const messageName = element.getAttribute('data-i18n');
    element.textContent = i18n(messageName);
  });
  
  // 翻译所有带有 data-i18n-placeholder 属性的元素
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const messageName = element.getAttribute('data-i18n-placeholder');
    element.placeholder = i18n(messageName);
  });
  
  // 翻译所有带有 data-i18n-title 属性的元素
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const messageName = element.getAttribute('data-i18n-title');
    element.title = i18n(messageName);
  });
  
  // 更新平台按钮的 tooltip 和 title（支持 i18n）
  if (platformBtns && platformBtns.length > 0) {
    platformBtns.forEach(btn => {
      const platform = btn.dataset.platform;
      const displayName = getPlatformDisplayName(platform);
      btn.setAttribute('data-tooltip', displayName);
      btn.setAttribute('title', displayName);
    });
  }
}

const textarea = document.getElementById('query-input');
const sendBtn = document.getElementById('send-btn');
const statusDiv = document.getElementById('status');
const platformBtns = document.querySelectorAll('.platform-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressCount = document.getElementById('progress-count');
const progressDetail = document.getElementById('progress-detail');
const historyBtn = document.getElementById('history-btn');
const historyDropdown = document.getElementById('history-dropdown');
let newChatToggle = null; // 延迟初始化

// 页面元素
const mainPage = document.getElementById('main-page');
const settingsBtn = document.getElementById('settings-btn');
const settingsPage = document.getElementById('settings-page');
const backBtn = document.getElementById('back-btn');

// 获取平台显示名称的包装函数（优先使用从 background 获取的数据）
function getPlatformDisplayName(platform) {
  // 优先使用从 background 获取的数据
  if (window._platformData && window._platformData.platformI18nKeys) {
    const i18nKey = window._platformData.platformI18nKeys[platform];
    if (i18nKey && i18n) {
      return i18n(i18nKey);
    }
  }
  // 回退：如果 models/index.js 已加载，使用其中的函数
  if (typeof getPlatformDisplayNameFromModels === 'function') {
    return getPlatformDisplayNameFromModels(platform, i18n);
  }
  return platform; // 最终回退到平台名称
}

// 应用主题
async function applyTheme(themeSetting) {
  let theme = themeSetting;
  
  if (theme === 'auto') {
    // 检测系统主题
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      theme = darkModeQuery.matches ? 'dark' : 'light';
      
      // 监听系统主题变化（只在auto模式下）
      if (!window._themeListener) {
        darkModeQuery.addEventListener('change', async (e) => {
          // 检查当前设置是否仍然是auto
          const result = await new Promise(resolve => {
            chrome.storage.local.get(['settings'], resolve);
          });
          const currentTheme = result.settings?.theme || 'auto';
          if (currentTheme === 'auto') {
            applyTheme('auto');
          }
        });
        window._themeListener = true;
      }
    } else {
      theme = 'light';
    }
  }
  
  // 应用主题类
  document.body.classList.remove('dark-theme', 'light-theme');
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.add('light-theme');
  }
}

// 加载并应用设置
async function loadAndApplySettings() {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], resolve);
  });
  
  // 优先使用从 background 获取的数据
  let defaultSettings = null;
  if (window._platformData && window._platformData.defaultSettings) {
    defaultSettings = window._platformData.defaultSettings;
  } else {
    // 回退：构建默认设置
    defaultSettings = { 
      theme: 'auto', 
      language: 'auto', 
      visiblePlatforms: window._platformData?.platformNames || [], 
      tabGroupTitle: '', 
      colorMode: 'random', 
      fixedColor: 'blue' 
    };
  }
  
  const settings = result.settings || defaultSettings;
  
  // 应用主题设置
  await applyTheme(settings.theme || 'auto');
  
  // 应用语言设置
  if (settings.language !== 'auto') {
    // 设置语言（需要重新加载i18n）
    chrome.i18n.getAcceptLanguages((languages) => {
      // 这里可以强制设置语言，但Chrome扩展的i18n机制比较复杂
      // 暂时先保持自动检测
    });
  }
  
  // 应用可见平台设置
  applyVisiblePlatforms(settings.visiblePlatforms);
  
  return settings;
}

// 应用可见平台设置
function applyVisiblePlatforms(visiblePlatforms) {
  platformBtns.forEach(btn => {
    const platform = btn.dataset.platform;
    if (visiblePlatforms.includes(platform)) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });
}

// 设置页面相关函数已移至 settings.js
// 使用 settings.js 中的函数
async function initSettingsPage() {
  if (typeof window.initSettingsPageFromSettings === 'function') {
    // 优先使用从 background 获取的数据
    let defaultSettings = null;
    let platformIcons = {};
    
    if (window._platformData) {
      defaultSettings = window._platformData.defaultSettings;
      platformIcons = window._platformData.platformIcons || {};
    } else {
      // 回退：构建默认设置
      defaultSettings = { 
        theme: 'auto', 
        language: 'auto', 
        visiblePlatforms: [], 
        tabGroupTitle: '', 
        colorMode: 'random', 
        fixedColor: 'blue' 
      };
    }
    
    window.initSettingsPageFromSettings(platformBtns, platformIcons, getPlatformDisplayName, defaultSettings, loadAndApplySettings, initI18n);
  } else {
    console.warn('settings.js not loaded, using fallback');
  }
}

async function loadSettingsToForm() {
  if (typeof window.loadSettingsToFormFromSettings === 'function') {
    // 优先使用从 background 获取的数据
    let defaultSettings = null;
    if (window._platformData && window._platformData.defaultSettings) {
      defaultSettings = window._platformData.defaultSettings;
    } else {
      // 回退：构建默认设置
      defaultSettings = { 
        theme: 'auto', 
        language: 'auto', 
        visiblePlatforms: window._platformData?.platformNames || [], 
        tabGroupTitle: '', 
        colorMode: 'random', 
        fixedColor: 'blue' 
      };
    }
    await window.loadSettingsToFormFromSettings(defaultSettings, loadAndApplySettings, initI18n);
  } else {
    console.warn('settings.js not loaded, using fallback');
  }
}

async function saveSettings() {
  if (typeof window.saveSettingsFromSettings === 'function') {
    await window.saveSettingsFromSettings(loadAndApplySettings, initI18n);
  } else {
    console.warn('settings.js not loaded, using fallback');
  }
}

// 页面切换
function showMainPage() {
  mainPage.classList.add('active');
  if (settingsPage) {
    settingsPage.classList.remove('active');
  }
}

async function showSettingsPage() {
  if (!settingsPage) {
    console.error('Settings page not found');
      showStatus(i18n('errorLoadSettings') || '加载设置页面失败', 'error');
      return;
  }
  
  mainPage.classList.remove('active');
  settingsPage.classList.add('active');
  
  // 重新初始化设置页面（确保数据是最新的）
  initSettingsPage();
  // 重新初始化i18n（设置页面可能刚显示）
  initI18n();
}

// 事件监听
settingsBtn.addEventListener('click', showSettingsPage);

// 绑定返回按钮事件
if (backBtn) {
  backBtn.addEventListener('click', showMainPage);
}

// 从 background 获取平台数据
let platformDataCache = null;
async function getPlatformDataFromBackground() {
  if (platformDataCache) {
    return platformDataCache;
  }
  
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getPlatformData' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    
    if (response && response.success) {
      platformDataCache = response;
      return response;
    }
  } catch (e) {
    console.warn('[Popup] Failed to get platform data from background:', e);
  }
  
  // 回退到使用 AIModel 的静态方法
  return null;
}

// 初始化函数
async function initializeApp() {
  // 确保 AIModel 已加载
  if (typeof AIModel === 'undefined') {
    // 如果 AIModel 还没加载，等待一下
    await new Promise(resolve => {
      const checkAIModel = () => {
        if (typeof AIModel !== 'undefined') {
          resolve();
        } else {
          setTimeout(checkAIModel, 50);
        }
      };
      checkAIModel();
    });
  }
  
  // 尝试从 background 获取平台数据
  const platformData = await getPlatformDataFromBackground();
  if (platformData) {
    // 更新 AIModel 的默认设置（如果可用）
    if (platformData.defaultSettings && typeof AIModel !== 'undefined') {
      // 将数据存储到全局变量中供后续使用
      window._platformData = platformData;
    }
  }

// 初始化 i18n
  await initI18n();

// 加载设置
  await loadAndApplySettings();
  
  // 清理历史记录中的无效数据
  await cleanQueryHistory();
  
  // 初始化历史记录下拉框
  await updateHistoryDropdown();
  
  // 初始化新对话 toggle
  initNewChatToggle();
  
  // 检查并恢复进度
  await checkAndRestoreProgress();
}

// 等待 DOM 和脚本加载完成后再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM 已经加载完成，直接初始化
  initializeApp();
}

// 检查是否有进行中的进度并恢复
async function checkAndRestoreProgress() {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['progressUpdate', 'progressComplete', 'progressUpdateTime'], resolve);
  });
  
  // 检查是否有进度数据，且不是已完成状态，且时间在最近5分钟内（避免恢复过期的进度）
  if (result.progressUpdate && !result.progressComplete) {
    const timeDiff = Date.now() - (result.progressUpdateTime || 0);
    const fiveMinutes = 5 * 60 * 1000;
    
    if (timeDiff < fiveMinutes) {
      console.log('[Popup] Restoring progress:', result.progressUpdate);
      
      // 恢复进度显示
      updateProgress(result.progressUpdate);
      
      // 禁用输入框和按钮
      textarea.disabled = true;
      sendBtn.disabled = true;
      sendBtn.textContent = i18n('sending');
      
      // 重新启动进度监听
      startProgressListening();
    } else {
      // 进度过期，清除
      console.log('[Popup] Progress expired, clearing');
      chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
    }
  }
}

// checkAndRestoreProgress() 现在在 initializeApp() 中调用

// 获取所有平台名称（只返回可见的）
function getAllPlatforms() {
  return Array.from(platformBtns)
    .filter(btn => btn.style.display !== 'none')
    .map(btn => btn.dataset.platform);
}

// 从 chrome.storage 加载选中的平台
async function loadSelectedPlatforms() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['selectedPlatforms'], (result) => {
      if (result.selectedPlatforms) {
        resolve(result.selectedPlatforms);
      } else {
        resolve(getAllPlatforms()); // 默认全选
      }
    });
  });
}

// 保存选中的平台到 chrome.storage
function saveSelectedPlatforms(platforms) {
  chrome.storage.local.set({ selectedPlatforms: platforms });
}

// 获取当前选中的平台
function getSelectedPlatforms() {
  return Array.from(platformBtns)
    .filter(btn => btn.classList.contains('active'))
    .map(btn => btn.dataset.platform);
}

// 初始化平台按钮状态
async function initPlatformButtons() {
  const selectedPlatforms = await loadSelectedPlatforms();
  
  platformBtns.forEach(btn => {
    const platform = btn.dataset.platform;
    if (selectedPlatforms.includes(platform)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// 拖拽选择功能
let isDragSelecting = false;
let dragStartBtn = null;
let visitedButtons = new Set();
let mouseDownTime = 0;
let hasMoved = false;

// 平台按钮点击事件
platformBtns.forEach(btn => {
  
  // 设置按钮不可拖动，防止图标被拖动
  btn.setAttribute('draggable', 'false');
  
  // 阻止默认的拖拽行为
  btn.addEventListener('dragstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  });
  
  btn.addEventListener('mousedown', (e) => {
    mouseDownTime = Date.now();
    hasMoved = false;
    isDragSelecting = false;
    dragStartBtn = btn;
    visitedButtons.clear();
    // 不将起始按钮添加到 visitedButtons，这样它也会被取反处理
    
    // 添加拖拽选择样式
    btn.classList.add('drag-selecting');
    document.body.classList.add('drag-select-mode');
  });
  
  btn.addEventListener('mouseenter', (e) => {
    if (isDragSelecting && dragStartBtn) {
      if (!visitedButtons.has(btn)) {
        visitedButtons.add(btn);
        // 取反操作：如果当前是选中的就取消选中，如果未选中就选中
        btn.classList.toggle('active');
        
        const selected = getSelectedPlatforms();
        saveSelectedPlatforms(selected);
      }
    }
  });
  
  btn.addEventListener('click', (e) => {
    // 如果是在拖拽选择模式下，阻止默认的点击切换行为
    // 主要检查 isDragSelecting，因为一旦进入拖拽选择模式，就不应该触发点击切换
    if (isDragSelecting) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    btn.classList.toggle('active');
    
    const selected = getSelectedPlatforms();
    saveSelectedPlatforms(selected);
  });
});

// 全局鼠标移动事件处理拖拽选择
document.addEventListener('mousemove', (e) => {
  if (dragStartBtn && !hasMoved) {
    const timeSinceMouseDown = Date.now() - mouseDownTime;
    // 如果按住超过 200ms 或移动了超过 5px，开始拖拽选择模式
    const moved = Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5;
    if (timeSinceMouseDown > 200 || moved) {
      hasMoved = true;
      isDragSelecting = true;
      
      // 拖拽开始时，对起始按钮也进行取反操作
      if (dragStartBtn && !visitedButtons.has(dragStartBtn)) {
        visitedButtons.add(dragStartBtn);
        dragStartBtn.classList.toggle('active');
        const selected = getSelectedPlatforms();
        saveSelectedPlatforms(selected);
      }
      
      // 防止文本选择
      e.preventDefault();
    }
  }
  
  // 检查鼠标是否在平台按钮上
  if (isDragSelecting) {
    const target = e.target.closest('.platform-btn');
    if (target && dragStartBtn && !visitedButtons.has(target)) {
      visitedButtons.add(target);
      // 取反操作：如果当前是选中的就取消选中，如果未选中就选中
      target.classList.toggle('active');
      
      const selected = getSelectedPlatforms();
      saveSelectedPlatforms(selected);
    }
  }
});

// 结束拖拽选择
function endDragSelect() {
  if (dragStartBtn) {
    isDragSelecting = false;
    visitedButtons.clear();
    dragStartBtn = null;
    hasMoved = false;
    mouseDownTime = 0;
    
    // 移除拖拽选择样式
    platformBtns.forEach(btn => {
      btn.classList.remove('drag-selecting');
    });
    document.body.classList.remove('drag-select-mode');
  }
}

// 全局鼠标事件处理
document.addEventListener('mouseup', () => {
  endDragSelect();
});

// 处理鼠标离开窗口的情况
document.addEventListener('mouseleave', (e) => {
  // 如果鼠标离开窗口，结束拖拽选择
  if (isDragSelecting && (!e.relatedTarget || e.relatedTarget === null)) {
    endDragSelect();
  }
});

// 防止拖拽选择时选中文本
document.addEventListener('selectstart', (e) => {
  if (isDragSelecting) {
    e.preventDefault();
  }
});

// 初始化
initPlatformButtons();

// 自动调整输入框高度
textarea.addEventListener('input', () => {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
});

// 更新平台按钮的进度条
function updatePlatformProgress(platform, status) {
  const btn = Array.from(platformBtns).find(b => b.dataset.platform === platform);
  if (!btn) return;
  
  const progressRing = btn.querySelector('.progress-ring');
  const progressCircle = btn.querySelector('.progress-circle');
  if (!progressRing || !progressCircle) return;
  
  // 计算进度
  let progress = 0;
  if (status === 'opening') {
    progress = 25; // 25% - 正在打开
    btn.classList.add('loading');
    btn.classList.remove('completed', 'error');
  } else if (status === 'loading') {
    progress = 75; // 75% - 正在加载
    btn.classList.add('loading');
    btn.classList.remove('completed', 'error');
  } else if (status === 'completed') {
    progress = 100; // 100% - 完成
    btn.classList.remove('loading');
    btn.classList.add('completed');
  } else {
    // 未知状态，隐藏进度条
    btn.classList.remove('loading', 'completed', 'error');
    progress = 0;
  }
  
  // 更新进度条
  const circumference = 2 * Math.PI * 18; // r=18
  const offset = circumference - (progress / 100) * circumference;
  progressCircle.style.strokeDashoffset = offset;
  
  // 显示/隐藏进度条
  if (progress > 0) {
    progressRing.style.opacity = '1';
  } else {
    progressRing.style.opacity = '0';
  }
}

// 更新进度条
function updateProgress(progress) {
  const { total, opened, loading, completed, currentAction, statuses } = progress;
  
  // 显示进度容器
  progressContainer.classList.add('active');
  statusDiv.style.display = 'none';
  
  // 更新每个平台按钮的进度条
  if (statuses) {
    Object.entries(statuses).forEach(([platform, status]) => {
      updatePlatformProgress(platform, status);
    });
  }
  
  // 计算进度百分比（已完成的算100%，加载中的算50%，已打开的算25%）
  const progressValue = (completed * 100 + loading * 50 + (opened - loading - completed) * 25) / total;
  const percentage = Math.min(100, Math.max(0, progressValue));
  
  // 更新进度条
  progressBar.style.width = percentage + '%';
  
  // 更新计数
  progressCount.textContent = `${completed}/${total}`;
  
  // 更新详细文本
  const detailParts = [];
  if (opened > 0) detailParts.push(i18n('progressOpened', [opened.toString()]));
  if (loading > 0) detailParts.push(i18n('progressLoading', [loading.toString()]));
  if (completed > 0) detailParts.push(i18n('progressCompleted', [completed.toString()]));
  
  if (detailParts.length > 0) {
    progressDetail.textContent = detailParts.join(' • ');
  } else {
    progressDetail.textContent = i18n('progressPreparing');
  }
  
  // 更新状态文本
  if (currentAction) {
    progressText.textContent = currentAction;
  } else if (completed === total) {
    progressText.textContent = i18n('progressAllCompleted');
  } else {
    progressText.textContent = i18n('progressStatus');
  }
}

// 重置进度条
function resetProgress() {
  progressContainer.classList.remove('active');
  progressBar.style.width = '0%';
  progressCount.textContent = '0/0';
  progressDetail.textContent = '';
  statusDiv.style.display = '';
  
  // 重置所有平台按钮的进度条
  platformBtns.forEach(btn => {
    btn.classList.remove('loading', 'completed', 'error');
    const progressRing = btn.querySelector('.progress-ring');
    const progressCircle = btn.querySelector('.progress-circle');
    if (progressRing && progressCircle) {
      progressRing.style.opacity = '0';
      progressCircle.style.strokeDashoffset = '113'; // 重置为0%
    }
  });
}

// 进度监听器
let progressListenerActive = false;
let storageChangeListener = null;

function startProgressListening() {
  if (progressListenerActive) {
    console.log('[Popup] Progress listener already active');
    return;
  }
  
  console.log('[Popup] Starting progress listener');
  progressListenerActive = true;
  
  // 方式1: 使用 storage.onChanged 监听器（推荐）
  storageChangeListener = (changes, areaName) => {
    if (areaName !== 'local') return;
    
    if (changes.progressUpdate) {
      const newProgress = changes.progressUpdate.newValue;
      if (newProgress) {
        console.log('[Popup] Progress updated via storage.onChanged:', newProgress);
        updateProgress(newProgress);
      }
    }
    
    if (changes.progressComplete) {
      const isComplete = changes.progressComplete.newValue;
      if (isComplete) {
        console.log('[Popup] Progress complete via storage.onChanged!');
        stopProgressListening();
        chrome.storage.local.get(['progressUpdate'], (result) => {
          if (result.progressUpdate) {
            setTimeout(() => {
              showStatus(i18n('statusSuccess', [result.progressUpdate.total.toString()]), 'success');
              resetProgress();
              textarea.value = '';
              textarea.style.height = 'auto';
              textarea.disabled = false;
              sendBtn.disabled = false;
              sendBtn.textContent = i18n('sendButton');
              
              // 清除进度数据
              chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
              
              // 2秒后关闭popup
              setTimeout(() => {
                window.close();
              }, 2000);
            }, 500);
          }
        });
      }
    }
  };
  
  chrome.storage.onChanged.addListener(storageChangeListener);
  
  // 方式2: 轮询作为备选（每500ms检查一次）
  const pollInterval = setInterval(() => {
    chrome.storage.local.get(['progressUpdate', 'progressComplete'], (result) => {
      if (result.progressUpdate) {
        console.log('[Popup] Progress update via polling:', result.progressUpdate);
        updateProgress(result.progressUpdate);
        
        if (result.progressComplete) {
          console.log('[Popup] Progress complete via polling!');
          clearInterval(pollInterval);
          stopProgressListening();
          setTimeout(() => {
            showStatus(i18n('statusSuccess', [result.progressUpdate.total.toString()]), 'success');
            resetProgress();
            textarea.value = '';
            textarea.style.height = 'auto';
            textarea.disabled = false;
            sendBtn.disabled = false;
            sendBtn.textContent = i18n('sendButton');
            
            chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
            
            setTimeout(() => {
              window.close();
            }, 2000);
          }, 500);
        }
      }
    });
  }, 500);
  
  // 保存 interval ID 以便清理
  window._progressPollInterval = pollInterval;
}

function stopProgressListening() {
  if (window._progressPollInterval) {
    clearInterval(window._progressPollInterval);
    window._progressPollInterval = null;
  }
  if (storageChangeListener) {
    chrome.storage.onChanged.removeListener(storageChangeListener);
    storageChangeListener = null;
  }
  progressListenerActive = false;
  console.log('[Popup] Progress listener stopped');
}

// 暂时禁用进度监听功能
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'progressUpdate') {
//     updateProgress(message.progress);
//     chrome.storage.local.set({ 
//       progressUpdate: message.progress,
//       progressUpdateTime: Date.now()
//     });
//   } else if (message.action === 'progressComplete') {
//     stopProgressListening();
//     updateProgress(message.progress);
//     setTimeout(() => {
//       showStatus(i18n('statusSuccess', [message.progress.total.toString()]), 'success');
//       resetProgress();
//       textarea.value = '';
//       textarea.style.height = 'auto';
//       sendBtn.disabled = false;
//       sendBtn.textContent = i18n('sendButton');
//       chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
//       setTimeout(() => {
//         window.close();
//       }, 2000);
//     }, 500);
//   } else if (message.action === 'progressError') {
//     stopProgressListening();
//     showStatus(i18n('errorSendFailed', [message.error || '']), 'error');
//     resetProgress();
//     sendBtn.disabled = false;
//     sendBtn.textContent = i18n('sendButton');
//     chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
//   }
// });

// 历史记录管理
const MAX_HISTORY_COUNT = 50; // 最多保存50条历史记录

// 格式化日期时间
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const isZh = getCurrentLanguageSync() === 'zh_CN';
  
  // 今天
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString(isZh ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }
  
  // 昨天
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
    const yesterdayText = isZh ? '昨天' : 'Yesterday';
    return yesterdayText + ' ' + date.toLocaleTimeString(isZh ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }
  
  // 一周内
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    if (isZh) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[date.getDay()] + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else {
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return weekdays[date.getDay()] + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  }
  
  // 更早的日期
  return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { month: '2-digit', day: '2-digit' }) + ' ' + 
         date.toLocaleTimeString(isZh ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

// 清理历史记录中的无效数据（兼容旧格式）
async function cleanQueryHistory() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['queryHistory'], resolve);
    });
    
    const history = result.queryHistory || [];
    if (history.length === 0) return;
    
    // 检查是否是旧格式（字符串数组）
    if (history.length > 0 && typeof history[0] === 'string') {
      // 转换为新格式
      const newHistory = history
        .filter(item => item && typeof item === 'string' && item.trim() !== '' && item !== '[object Object]')
        .map((query, index) => ({
          query: query.trim(),
          timestamp: Date.now() - (history.length - index) * 60000, // 假设每条间隔1分钟
          pinned: false
        }));
      
      await new Promise(resolve => {
        chrome.storage.local.set({ queryHistory: newHistory }, resolve);
      });
    } else {
      // 新格式，清理无效项
      const cleanedHistory = history
        .filter(item => item && typeof item === 'object' && item.query && typeof item.query === 'string' && item.query.trim() !== '')
        .map(item => ({
          query: item.query.trim(),
          timestamp: item.timestamp || Date.now(),
          pinned: item.pinned || false
        }));
      
      if (cleanedHistory.length !== history.length) {
        await new Promise(resolve => {
          chrome.storage.local.set({ queryHistory: cleanedHistory }, resolve);
        });
      }
    }
  } catch (error) {
    console.error('Failed to clean query history:', error);
  }
}

// 保存历史记录
async function saveQueryHistory(query) {
  // 确保 query 是字符串
  const queryText = typeof query === 'string' ? query.trim() : String(query).trim();
  
  if (!queryText || queryText === '') return;
  
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['queryHistory'], resolve);
    });
    
    let history = result.queryHistory || [];
    
    // 兼容旧格式
    if (history.length > 0 && typeof history[0] === 'string') {
      await cleanQueryHistory();
      const result2 = await new Promise(resolve => {
        chrome.storage.local.get(['queryHistory'], resolve);
      });
      history = result2.queryHistory || [];
    }
    
    // 移除重复项（如果存在）
    history = history.filter(item => item.query !== queryText);
    
    // 添加到开头
    history.unshift({
      query: queryText,
      timestamp: Date.now(),
      pinned: false
    });
    
    // 限制数量（保留置顶项）
    const pinnedCount = history.filter(item => item.pinned).length;
    const nonPinned = history.filter(item => !item.pinned);
    const maxNonPinned = Math.max(0, MAX_HISTORY_COUNT - pinnedCount);
    
    if (nonPinned.length > maxNonPinned) {
      const pinned = history.filter(item => item.pinned);
      history = [...pinned, ...nonPinned.slice(0, maxNonPinned)];
    }
    
    // 保存
    await new Promise(resolve => {
      chrome.storage.local.set({ queryHistory: history }, resolve);
    });
    
    // 更新下拉框显示
    updateHistoryDropdown();
  } catch (error) {
    console.error('Failed to save query history:', error);
  }
}

// 加载历史记录
async function loadQueryHistory() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['queryHistory'], resolve);
    });
    const history = result.queryHistory || [];
    
    // 兼容旧格式
    if (history.length > 0 && typeof history[0] === 'string') {
      await cleanQueryHistory();
      const result2 = await new Promise(resolve => {
        chrome.storage.local.get(['queryHistory'], resolve);
      });
      return result2.queryHistory || [];
    }
    
    // 清理无效项
    return history.filter(item => 
      item && 
      typeof item === 'object' && 
      item.query && 
      typeof item.query === 'string' && 
      item.query.trim() !== ''
    );
  } catch (error) {
    console.error('Failed to load query history:', error);
    return [];
  }
}

// 删除历史记录
async function deleteHistoryItem(queryText) {
  try {
    const history = await loadQueryHistory();
    const filteredHistory = history.filter(item => item.query !== queryText);
    
    await new Promise(resolve => {
      chrome.storage.local.set({ queryHistory: filteredHistory }, resolve);
    });
    
    updateHistoryDropdown();
  } catch (error) {
    console.error('Failed to delete history item:', error);
  }
}

// 切换置顶状态
async function togglePinHistoryItem(queryText) {
  try {
    const history = await loadQueryHistory();
    const item = history.find(item => item.query === queryText);
    if (!item) return;
    
    item.pinned = !item.pinned;
    
    // 重新排序：置顶项在前
    const pinned = history.filter(item => item.pinned);
    const nonPinned = history.filter(item => !item.pinned);
    const sortedHistory = [...pinned, ...nonPinned];
    
    await new Promise(resolve => {
      chrome.storage.local.set({ queryHistory: sortedHistory }, resolve);
    });
    
    updateHistoryDropdown();
  } catch (error) {
    console.error('Failed to toggle pin history item:', error);
  }
}

// 移动历史记录到新位置
async function moveHistoryItemToPosition(queryText, newIndex) {
  try {
    const history = await loadQueryHistory();
    const oldIndex = history.findIndex(item => item.query === queryText);
    if (oldIndex === -1 || oldIndex === newIndex) return;
    
    // 移除旧位置的项
    const [movedItem] = history.splice(oldIndex, 1);
    // 插入到新位置
    history.splice(newIndex, 0, movedItem);
    
    await new Promise(resolve => {
      chrome.storage.local.set({ queryHistory: history }, resolve);
    });
    
    updateHistoryDropdown();
  } catch (error) {
    console.error('Failed to move history item:', error);
  }
}

// 更新历史记录下拉框显示
async function updateHistoryDropdown() {
  const history = await loadQueryHistory();
  const emptyDiv = historyDropdown.querySelector('.history-empty');
  
  // 清除现有项目（除了空提示）
  const existingItems = historyDropdown.querySelectorAll('.history-item');
  existingItems.forEach(item => item.remove());
  
  if (history.length === 0) {
    if (emptyDiv) {
      emptyDiv.style.display = 'block';
    }
  } else {
    if (emptyDiv) {
      emptyDiv.style.display = 'none';
    }
    
    // 添加历史记录项
    history.forEach((item, index) => {
      const queryText = item.query;
      
      // 跳过无效的查询
      if (!queryText || queryText.trim() === '') {
        return;
      }
      
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item' + (item.pinned ? ' pinned' : '');
      historyItem.dataset.query = queryText;
      
      // 拖拽手柄 - 已禁用
      // const dragHandle = document.createElement('div');
      // dragHandle.className = 'history-item-drag-handle';
      // dragHandle.textContent = '⋮⋮';
      // dragHandle.draggable = false;
      
      // 让整个历史记录项可拖拽 - 已禁用
      historyItem.draggable = false;
      
      // 内容区域
      const contentDiv = document.createElement('div');
      contentDiv.className = 'history-item-content';
      
      const textDiv = document.createElement('div');
      textDiv.className = 'history-item-text';
      textDiv.textContent = queryText;
      
      contentDiv.appendChild(textDiv);
      
      // 元数据区域 - 时间和删除按钮在同一行
      const metaDiv = document.createElement('div');
      metaDiv.className = 'history-item-meta';
      
      const timeDiv = document.createElement('div');
      timeDiv.className = 'history-item-time';
      timeDiv.textContent = formatDateTime(item.timestamp);
      
      // 删除按钮
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'history-action-btn delete';
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = i18n('historyDelete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(queryText);
      });
      
      metaDiv.appendChild(timeDiv);
      metaDiv.appendChild(deleteBtn);
      
      // historyItem.appendChild(dragHandle); // 拖拽手柄已禁用
      historyItem.appendChild(contentDiv);
      historyItem.appendChild(metaDiv);
      
      // 点击整个历史记录项填充输入框（排除操作按钮）
      const handleItemClick = (e) => {
        // 如果点击的是操作按钮，不处理
        if (e.target.closest('.history-item-actions')) {
          return;
        }
        textarea.value = queryText;
        textarea.focus();
        // 自动调整高度
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
        // 关闭下拉框
        historyDropdown.classList.remove('show');
      };
      
      historyItem.addEventListener('click', handleItemClick);
      contentDiv.addEventListener('click', handleItemClick);
      
      historyDropdown.appendChild(historyItem);
    });
  }
}

// 切换历史记录下拉框
function toggleHistoryDropdown() {
  historyDropdown.classList.toggle('show');
  if (historyDropdown.classList.contains('show')) {
    updateHistoryDropdown();
  }
}

// 点击历史记录按钮
if (historyBtn) {
  historyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleHistoryDropdown();
  });
}

// 点击外部关闭下拉框
document.addEventListener('click', (e) => {
  if (historyDropdown && historyBtn && 
      !historyDropdown.contains(e.target) && 
      !historyBtn.contains(e.target)) {
    historyDropdown.classList.remove('show');
  }
});

// 新对话 toggle 状态管理
let startNewChatEnabled = false;
let deepThinkEnabled = false;
let webSearchEnabled = false;

// 加载新对话 toggle 状态
async function loadNewChatToggleState() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['startNewChatEnabled'], resolve);
    });
    startNewChatEnabled = result.startNewChatEnabled || false;
    updateNewChatToggleUI();
  } catch (error) {
    console.error('Failed to load new chat toggle state:', error);
  }
}

// 加载深度思考 toggle 状态
async function loadDeepThinkToggleState() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['deepThinkEnabled'], resolve);
    });
    deepThinkEnabled = result.deepThinkEnabled || false;
    updateDeepThinkToggleUI();
  } catch (error) {
    console.error('Failed to load deep think toggle state:', error);
  }
}

// 加载网络搜索 toggle 状态
async function loadWebSearchToggleState() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['webSearchEnabled'], resolve);
    });
    webSearchEnabled = result.webSearchEnabled || false;
    updateWebSearchToggleUI();
  } catch (error) {
    console.error('Failed to load web search toggle state:', error);
  }
}

// 保存新对话 toggle 状态
async function saveNewChatToggleState(enabled) {
  startNewChatEnabled = enabled;
  try {
    await new Promise(resolve => {
      chrome.storage.local.set({ startNewChatEnabled: enabled }, resolve);
    });
  } catch (error) {
    console.error('Failed to save new chat toggle state:', error);
  }
}

// 更新新对话 toggle UI
function updateNewChatToggleUI() {
  if (newChatToggle) {
    if (startNewChatEnabled) {
      newChatToggle.classList.add('active');
    } else {
      newChatToggle.classList.remove('active');
    }
  }
}

// 保存深度思考 toggle 状态
async function saveDeepThinkToggleState(enabled) {
  deepThinkEnabled = enabled;
  try {
    await new Promise(resolve => {
      chrome.storage.local.set({ deepThinkEnabled: enabled }, resolve);
    });
  } catch (error) {
    console.error('Failed to save deep think toggle state:', error);
  }
}

// 更新深度思考 toggle UI
function updateDeepThinkToggleUI() {
  const deepThinkToggle = document.getElementById('deep-think-toggle');
  if (deepThinkToggle) {
    if (deepThinkEnabled) {
      deepThinkToggle.classList.add('active');
    } else {
      deepThinkToggle.classList.remove('active');
    }
  }
}

// 保存网络搜索 toggle 状态
async function saveWebSearchToggleState(enabled) {
  webSearchEnabled = enabled;
  try {
    await new Promise(resolve => {
      chrome.storage.local.set({ webSearchEnabled: enabled }, resolve);
    });
  } catch (error) {
    console.error('Failed to save web search toggle state:', error);
  }
}

// 更新网络搜索 toggle UI
function updateWebSearchToggleUI() {
  const webSearchToggle = document.getElementById('web-search-toggle');
  if (webSearchToggle) {
    if (webSearchEnabled) {
      webSearchToggle.classList.add('active');
    } else {
      webSearchToggle.classList.remove('active');
    }
  }
}

// 初始化新对话 toggle
function initNewChatToggle() {
  newChatToggle = document.getElementById('new-chat-toggle');
  if (newChatToggle) {
    console.log('[Popup] Initializing new chat toggle button');
    newChatToggle.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      startNewChatEnabled = !startNewChatEnabled;
      console.log('[Popup] Toggle clicked, new state:', startNewChatEnabled);
      await saveNewChatToggleState(startNewChatEnabled);
      updateNewChatToggleUI();
      
      // 验证保存是否成功
      const verify = await new Promise(resolve => {
        chrome.storage.local.get(['startNewChatEnabled'], (result) => {
          resolve(result.startNewChatEnabled);
        });
      });
      console.log('[Popup] Verified saved state:', verify);
    });
    
    // 加载初始状态
    loadNewChatToggleState();
  } else {
    console.warn('[Popup] new-chat-toggle button not found');
  }
  
  // 初始化深度思考 toggle
  const deepThinkToggle = document.getElementById('deep-think-toggle');
  if (deepThinkToggle) {
    deepThinkToggle.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      deepThinkEnabled = !deepThinkEnabled;
      console.log('[Popup] Deep think toggle clicked, new state:', deepThinkEnabled);
      await saveDeepThinkToggleState(deepThinkEnabled);
      updateDeepThinkToggleUI();
      
      // 验证保存是否成功
      const verify = await new Promise(resolve => {
        chrome.storage.local.get(['deepThinkEnabled'], (result) => {
          resolve(result.deepThinkEnabled);
        });
      });
      console.log('[Popup] Verified deep think saved state:', verify);
    });
    loadDeepThinkToggleState();
  }
  
  // 初始化网络搜索 toggle
  const webSearchToggle = document.getElementById('web-search-toggle');
  if (webSearchToggle) {
    webSearchToggle.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      webSearchEnabled = !webSearchEnabled;
      console.log('[Popup] Web search toggle clicked, new state:', webSearchEnabled);
      await saveWebSearchToggleState(webSearchEnabled);
      updateWebSearchToggleUI();
      
      // 验证保存是否成功
      const verify = await new Promise(resolve => {
        chrome.storage.local.get(['webSearchEnabled'], (result) => {
          resolve(result.webSearchEnabled);
        });
      });
      console.log('[Popup] Verified web search saved state:', verify);
    });
    loadWebSearchToggleState();
  }
}


// 发送函数
async function sendQuery() {
  const query = textarea.value.trim();
  
  if (!query) {
    showStatus(i18n('errorNoQuery'), 'error');
    return;
  }
  
  const selectedPlatforms = getSelectedPlatforms();
  
  if (selectedPlatforms.length === 0) {
    showStatus(i18n('errorNoPlatform'), 'error');
    return;
  }
  
  // 优先检查 DOM 状态（最准确，反映用户当前的选择）
  const newChatToggleBtn = document.getElementById('new-chat-toggle');
  const deepThinkToggleBtn = document.getElementById('deep-think-toggle');
  const webSearchToggleBtn = document.getElementById('web-search-toggle');
  
  const domState = {
    startNewChat: newChatToggleBtn?.classList.contains('active') || false,
    deepThink: deepThinkToggleBtn?.classList.contains('active') || false,
    webSearch: webSearchToggleBtn?.classList.contains('active') || false
  };
  
  // 同时从存储中读取状态（作为备份）
  const currentState = await new Promise(resolve => {
    chrome.storage.local.get(['startNewChatEnabled', 'deepThinkEnabled', 'webSearchEnabled'], (result) => {
      resolve({
        startNewChat: result.startNewChatEnabled || false,
        deepThink: result.deepThinkEnabled || false,
        webSearch: result.webSearchEnabled || false
      });
    });
  });
  
  // 优先使用 DOM 状态（用户可能刚点击了但还没保存到存储）
  startNewChatEnabled = domState.startNewChat;
  deepThinkEnabled = domState.deepThink;
  webSearchEnabled = domState.webSearch;
  
  console.log('[Popup] State check - DOM:', domState, 'Storage:', currentState);
  console.log('[Popup] Using DOM state - startNewChat:', startNewChatEnabled, 'deepThink:', deepThinkEnabled, 'webSearch:', webSearchEnabled);
  
  // 如果 DOM 状态和存储状态不一致，同步存储状态（确保一致性）
  if (domState.startNewChat !== currentState.startNewChat) {
    console.log('[Popup] Syncing startNewChat state to storage:', domState.startNewChat);
    await saveNewChatToggleState(domState.startNewChat);
  }
  if (domState.deepThink !== currentState.deepThink) {
    console.log('[Popup] Syncing deepThink state to storage:', domState.deepThink);
    await saveDeepThinkToggleState(domState.deepThink);
  }
  if (domState.webSearch !== currentState.webSearch) {
    console.log('[Popup] Syncing webSearch state to storage:', domState.webSearch);
    await saveWebSearchToggleState(domState.webSearch);
  }
  
  // 保存历史记录
  saveQueryHistory(query);
  
  // 禁用输入框和按钮
  textarea.disabled = true;
  sendBtn.disabled = true;
  sendBtn.textContent = i18n('sending');
  
  // 重置并启动进度条
  resetProgress();
  const initialProgress = {
    total: selectedPlatforms.length,
    opened: 0,
    loading: 0,
    completed: 0,
    currentAction: i18n('progressStarting'),
    statuses: {}
  };
  updateProgress(initialProgress);
  chrome.storage.local.set({
    progressUpdate: initialProgress,
    progressUpdateTime: Date.now(),
    progressComplete: false
  }).catch(() => {});
  startProgressListening();
  
  // 发送消息到 background，包含选中的平台和新对话状态
  console.log('[Popup] Sending query with startNewChat:', startNewChatEnabled, 'deepThink:', deepThinkEnabled, 'webSearch:', webSearchEnabled);
  chrome.runtime.sendMessage({ 
    action: 'sendToAllAIs', 
    query,
    platforms: selectedPlatforms,
    startNewChat: startNewChatEnabled,
    deepThink: deepThinkEnabled,
    webSearch: webSearchEnabled
  }, (response) => {
    if (chrome.runtime.lastError) {
      stopProgressListening();
      showStatus(i18n('errorSendFailed', [chrome.runtime.lastError.message]), 'error');
      resetProgress();
      textarea.disabled = false;
      sendBtn.disabled = false;
      sendBtn.textContent = i18n('sendButton');
      chrome.storage.local.remove(['progressUpdate', 'progressUpdateTime', 'progressComplete']);
    }
    // 注意：成功的情况由进度监听器处理
  });
}

// 显示状态
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  
  if (type === 'error') {
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
}

// 点击发送按钮
sendBtn.addEventListener('click', sendQuery);

// 按 Enter 发送（Shift+Enter 换行）
textarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendQuery();
  }
});

// 自动聚焦
textarea.focus();

