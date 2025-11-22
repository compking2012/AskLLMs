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
  platformBtns.forEach(btn => {
    const platform = btn.dataset.platform;
    const displayName = getPlatformDisplayName(platform);
    btn.setAttribute('data-tooltip', displayName);
    btn.setAttribute('title', displayName);
  });
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
const deepThinkingToggleBtn = document.getElementById('deep-thinking-toggle-btn');

// 页面元素
const mainPage = document.getElementById('main-page');
const historyPage = document.getElementById('history-page');
const settingsBtn = document.getElementById('settings-btn');
const historyBackBtn = document.getElementById('history-back-btn');

// 平台图标映射
const PLATFORM_ICONS = {
  "ChatGPT": "icons/chatgpt.png",
  "Claude": "icons/claude.png",
  "Gemini": "icons/gemini.png",
  "Grok": "icons/grok.png",
  "千问": "icons/qwen.png",
  "豆包": "icons/doubao.png",
  "DeepSeek": "icons/deepseek.png",
  "Kimi": "icons/kimi.png",
  "文心一言": "icons/wenxin.png",
  "智谱清言": "icons/chatglm.png",
  "MiniMax": "icons/minimax.png",
  "腾讯元宝": "icons/yuanbao.png"
};

// 平台名称到 i18n 键的映射（只对中文名字）
const PLATFORM_I18N_KEYS = {
  "千问": "platformQwen",
  "豆包": "platformDoubao",
  "文心一言": "platformWenxin",
  "智谱清言": "platformChatGLM",
  "腾讯元宝": "platformYuanbao"
};

// 获取平台显示名称（支持 i18n）
function getPlatformDisplayName(platform) {
  const i18nKey = PLATFORM_I18N_KEYS[platform];
  if (i18nKey) {
    return i18n(i18nKey);
  }
  return platform; // 英文名字直接返回
}

// 默认设置
const DEFAULT_SETTINGS = {
  theme: 'auto',
  language: 'auto',
  visiblePlatforms: ['ChatGPT', 'Claude', 'Gemini', 'Grok', '千问', '豆包', 'DeepSeek', 'Kimi', '文心一言', '智谱清言', 'MiniMax', '腾讯元宝'],
  tabGroupTitle: '',
  colorMode: 'random',
  fixedColor: 'blue',
  deepThinking: false
};

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
  
  const settings = result.settings || DEFAULT_SETTINGS;
  
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


// 页面切换
function showMainPage() {
  mainPage.classList.add('active');
  historyPage.classList.remove('active');
  // 如果已登录，更新历史记录下拉框
  (async () => {
    const user = await checkLoginStatus();
    if (user) {
      updateHistoryDropdown();
    }
  })();
}

function showHistoryPage() {
  mainPage.classList.remove('active');
  historyPage.classList.add('active');
  loadHistory();
}

// 事件监听
if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  });
}
if (historyBackBtn) {
  historyBackBtn.addEventListener('click', () => {
    showMainPage();
  });
}

// 初始化 i18n
initI18n();

// 加载设置
loadAndApplySettings();

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

// 页面加载时检查并恢复进度
checkAndRestoreProgress();

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
let isDragging = false;
let dragStartBtn = null;
let dragStartState = null;
let processedBtns = new Set();
let mouseDownX = 0;
let mouseDownY = 0;
let hasMoved = false;

// 平台按钮点击事件
platformBtns.forEach(btn => {
  // 鼠标按下事件
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // 防止拖动图标
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
    hasMoved = false;
    dragStartBtn = btn;
    dragStartState = btn.classList.contains('active');
    processedBtns.clear();
    processedBtns.add(btn);
  });
  
  // 鼠标移动事件（在按钮上）
  btn.addEventListener('mouseenter', (e) => {
    if (isDragging && dragStartBtn && !processedBtns.has(btn)) {
      // dragStartState 是起始按钮切换前的状态
      // 起始按钮切换后的状态应该是 !dragStartState
      // 所以其他按钮应该被设置为与起始按钮切换后的状态一致
      const targetState = !dragStartState;
      const isCurrentlyActive = btn.classList.contains('active');
      
      // 如果目标状态与当前状态不一致，则切换
      if (targetState !== isCurrentlyActive) {
        btn.classList.toggle('active');
      }
      
      processedBtns.add(btn);
    }
  });
  
  // 点击事件（用于非拖拽的点击）
  btn.addEventListener('click', (e) => {
    // 如果是在拖拽过程中，不执行点击逻辑
    if (isDragging || hasMoved) {
      e.preventDefault();
      return;
    }
    
    // 普通点击：切换状态
    btn.classList.toggle('active');
    const selected = getSelectedPlatforms();
    saveSelectedPlatforms(selected);
  });
});

// 在 platforms-grid 容器上监听鼠标移动和释放事件
const platformsGrid = document.querySelector('.platforms-grid');
if (platformsGrid) {
  // 监听鼠标移动，判断是否开始拖拽
  platformsGrid.addEventListener('mousemove', (e) => {
    if (dragStartBtn && !isDragging) {
      const deltaX = Math.abs(e.clientX - mouseDownX);
      const deltaY = Math.abs(e.clientY - mouseDownY);
      // 如果移动距离超过5像素，开始拖拽
      if (deltaX > 5 || deltaY > 5) {
        hasMoved = true;
        isDragging = true;
        // 切换起始按钮的状态
        dragStartBtn.classList.toggle('active');
      }
    }
  });
  
  // 鼠标释放事件
  platformsGrid.addEventListener('mouseup', () => {
    if (isDragging) {
      // 拖拽结束
      isDragging = false;
      dragStartBtn = null;
      dragStartState = null;
      processedBtns.clear();
      
      // 保存选中状态
      const selected = getSelectedPlatforms();
      saveSelectedPlatforms(selected);
    } else if (dragStartBtn && !hasMoved) {
      // 如果没有移动，说明是普通点击，已经在 click 事件中处理了
      dragStartBtn = null;
      dragStartState = null;
      processedBtns.clear();
    } else {
      // 重置状态
      dragStartBtn = null;
      dragStartState = null;
      processedBtns.clear();
      hasMoved = false;
    }
  });
  
  // 鼠标离开容器时也结束拖拽
  platformsGrid.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      dragStartBtn = null;
      dragStartState = null;
      processedBtns.clear();
      
      // 保存选中状态
      const selected = getSelectedPlatforms();
      saveSelectedPlatforms(selected);
    } else {
      // 重置状态
      dragStartBtn = null;
      dragStartState = null;
      processedBtns.clear();
      hasMoved = false;
    }
  });
}

// 初始化
initPlatformButtons();

// 初始化工具栏toggle按钮
async function initToolbarToggles() {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], resolve);
  });
  const settings = result.settings || DEFAULT_SETTINGS;
  
  // 初始化所有toggle按钮（除了上传文件按钮，它有特殊处理）
  const toggles = [
    { id: 'deep-thinking-toggle-btn', key: 'deepThinking', element: deepThinkingToggleBtn },
    { id: 'web-search-toggle-btn', key: 'webSearch', element: document.getElementById('web-search-toggle-btn') },
    { id: 'generate-image-toggle-btn', key: 'generateImage', element: document.getElementById('generate-image-toggle-btn') }
  ];
  
  toggles.forEach(({ element, key }) => {
    if (!element) return;
    
    const isActive = settings[key] || false;
    
    // 设置初始状态
    if (isActive) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
    
    // 监听按钮点击并保存
    element.addEventListener('click', async () => {
      element.classList.toggle('active');
      const isActive = element.classList.contains('active');
      
      const result = await new Promise(resolve => {
        chrome.storage.local.get(['settings'], resolve);
      });
      const currentSettings = result.settings || DEFAULT_SETTINGS;
      currentSettings[key] = isActive;
      await new Promise(resolve => {
        chrome.storage.local.set({ settings: currentSettings }, resolve);
      });
    });
  });
  
  // 初始化上传文件功能（特殊处理）
  initUploadFile();
}

initToolbarToggles();

// ============================================================================
// 上传文件功能
// ============================================================================

// 初始化上传文件功能
function initUploadFile() {
  const uploadFileBtn = document.getElementById('upload-file-btn');
  const fileInput = document.getElementById('file-input');
  const uploadFileWrapper = document.getElementById('upload-file-wrapper');
  const uploadFileDropdownList = document.getElementById('upload-file-dropdown-list');
  const uploadFileDropdownArrow = document.getElementById('upload-file-dropdown-arrow');
  
  if (!uploadFileBtn || !fileInput || !uploadFileWrapper) return;
  
  // 点击上传文件按钮
  uploadFileBtn.addEventListener('click', (e) => {
    // 如果点击的是下拉箭头区域，打开/关闭下拉框
    const rect = uploadFileBtn.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const buttonWidth = rect.width;
    const arrowAreaStart = buttonWidth - 28; // 箭头区域从右边28px开始
    
    if (clickX >= arrowAreaStart && uploadFileDropdownArrow && uploadFileDropdownArrow.style.display !== 'none') {
      // 点击了箭头区域，切换下拉框
      e.stopPropagation();
      uploadFileWrapper.classList.toggle('open');
    } else {
      // 点击了按钮主体，打开文件选择器
      fileInput.click();
    }
  });
  
  // 文件选择处理
  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // 保存文件信息
    await saveUploadedFiles(files);
    
    // 更新UI
    updateUploadFileUI();
    
    // 清空input，允许重复选择同一文件
    fileInput.value = '';
  });
  
  // 点击外部关闭下拉框
  document.addEventListener('click', (e) => {
    if (uploadFileWrapper && !uploadFileWrapper.contains(e.target)) {
      uploadFileWrapper.classList.remove('open');
    }
  });
  
  // 初始化时更新UI
  updateUploadFileUI();
}

// 检查文件是否已存在（通过文件名、大小和最后修改时间判断）
function isFileDuplicate(file, existingFiles) {
  return existingFiles.some(existingFile => 
    existingFile.name === file.name &&
    existingFile.size === file.size &&
    existingFile.lastModified === file.lastModified
  );
}

// 保存上传的文件信息
async function saveUploadedFiles(newFiles) {
  // 读取现有文件列表
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['uploadedFiles'], resolve);
  });
  
  const existingFiles = result.uploadedFiles || [];
  
  // 过滤掉重复的文件
  const uniqueNewFiles = newFiles.filter(file => !isFileDuplicate(file, existingFiles));
  
  if (uniqueNewFiles.length === 0) {
    // 所有文件都是重复的，显示提示
    showStatus(i18n('errorDuplicateFiles') || '文件已存在，未添加重复文件', 'info');
    return;
  }
  
  // 如果有部分文件重复，显示提示
  if (uniqueNewFiles.length < newFiles.length) {
    const duplicateCount = newFiles.length - uniqueNewFiles.length;
    showStatus(i18n('errorSomeDuplicateFiles') || `${duplicateCount}个文件已存在，已跳过`, 'info');
  }
  
  // 将新文件转换为可存储的格式
  const filesToAdd = await Promise.all(uniqueNewFiles.map(async (file) => {
    // 将文件转换为base64（用于存储）
    const base64 = await fileToBase64(file);
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      base64: base64,
      id: Date.now() + Math.random() // 唯一ID
    };
  }));
  
  // 合并到现有文件列表
  const allFiles = [...existingFiles, ...filesToAdd];
  
  // 保存到storage
  await new Promise(resolve => {
    chrome.storage.local.set({ uploadedFiles: allFiles }, resolve);
  });
  
  // 显示成功添加的提示
  if (filesToAdd.length > 0) {
    showStatus(i18n('successFilesAdded') || `成功添加${filesToAdd.length}个文件`, 'success');
  }
}

// 将File对象转换为base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // 移除data:type;base64,前缀
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 更新上传文件UI
async function updateUploadFileUI() {
  const uploadFileWrapper = document.getElementById('upload-file-wrapper');
  const uploadFileBtn = document.getElementById('upload-file-btn');
  const uploadFileDropdownList = document.getElementById('upload-file-dropdown-list');
  const uploadFileDropdownArrow = document.getElementById('upload-file-dropdown-arrow');
  
  if (!uploadFileWrapper || !uploadFileBtn || !uploadFileDropdownList) return;
  
  // 读取已上传的文件
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['uploadedFiles'], resolve);
  });
  
  const files = result.uploadedFiles || [];
  
  // 更新按钮的has-files类和箭头显示
  if (files.length > 0) {
    uploadFileBtn.classList.add('has-files');
    if (uploadFileDropdownArrow) {
      uploadFileDropdownArrow.style.display = 'block';
    }
  } else {
    uploadFileBtn.classList.remove('has-files');
    if (uploadFileDropdownArrow) {
      uploadFileDropdownArrow.style.display = 'none';
    }
    uploadFileWrapper.classList.remove('open');
  }
  
  // 更新下拉列表
  if (files.length === 0) {
    uploadFileDropdownList.innerHTML = '';
  } else {
    uploadFileDropdownList.innerHTML = files.map((file) => {
      // 转义file.id以防止XSS和特殊字符问题
      const fileIdEscaped = String(file.id).replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `
      <div class="upload-file-item" data-file-id="${fileIdEscaped}">
        <span class="upload-file-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <button class="upload-file-item-delete" data-file-id="${fileIdEscaped}" title="删除">×</button>
      </div>
    `;
    }).join('');
    
    // 使用事件委托处理删除按钮点击
    uploadFileDropdownList.querySelectorAll('.upload-file-item-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fileId = btn.getAttribute('data-file-id');
        await deleteUploadedFile(fileId);
      });
    });
  }
}

// 删除上传的文件（使用文件ID）
async function deleteUploadedFile(fileId) {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['uploadedFiles'], resolve);
  });
  
  const files = result.uploadedFiles || [];
  // 使用字符串比较，因为fileId可能是字符串
  const filteredFiles = files.filter(file => String(file.id) !== String(fileId));
  
  await new Promise(resolve => {
    chrome.storage.local.set({ uploadedFiles: filteredFiles }, resolve);
  });
  
  // 更新UI
  updateUploadFileUI();
}

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
  
  // 获取所有toggle按钮状态
  const deepThinking = deepThinkingToggleBtn.classList.contains('active');
  const webSearch = document.getElementById('web-search-toggle-btn')?.classList.contains('active') || false;
  const generateImage = document.getElementById('generate-image-toggle-btn')?.classList.contains('active') || false;
  
  // 检查是否有上传的文件
  const uploadedFilesResult = await new Promise(resolve => {
    chrome.storage.local.get(['uploadedFiles'], resolve);
  });
  const uploadedFiles = uploadedFilesResult.uploadedFiles || [];
  const uploadFile = uploadedFiles.length > 0;
  
  // 如果已登录，保存历史记录
  saveQueryHistory(query);
  
  // 发送消息到 background，包含选中的平台和所有toggle状态
  chrome.runtime.sendMessage({ 
    action: 'sendToAllAIs', 
    query,
    platforms: selectedPlatforms,
    deepThinking: deepThinking,
    webSearch: webSearch,
    uploadFile: uploadFile,
    uploadedFiles: uploadedFiles, // 包含文件信息
    generateImage: generateImage
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
  
  // error 和 info 类型自动隐藏
  if (type === 'error' || type === 'info') {
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

// ============================================================================
// 登录功能
// ============================================================================

// 检查登录状态
async function checkLoginStatus() {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['user'], resolve);
  });
  return result.user || null;
}

// 模拟登录（后端未开发，简单验证）
async function login(username, password) {
  // 模拟登录：任何非空用户名和密码都可以登录
  if (!username || !password) {
    return { success: false, message: i18n('loginRequired') };
  }
  
  // 模拟登录成功
  const user = {
    username: username,
    loginTime: Date.now()
  };
  
  await new Promise(resolve => {
    chrome.storage.local.set({ user }, resolve);
  });
  
  return { success: true, user };
}

// 登出
async function logout() {
  await new Promise(resolve => {
    chrome.storage.local.remove(['user'], resolve);
  });
  updateLoginUI();
}

// 更新登录UI
async function updateLoginUI() {
  const user = await checkLoginStatus();
  const loginSection = document.getElementById('login-section');
  const loggedInSection = document.getElementById('logged-in-section');
  const loggedInUsername = document.getElementById('logged-in-username');
  const historyDropdownContainer = document.getElementById('history-dropdown-container');
  
  if (user) {
    if (loginSection) loginSection.style.display = 'none';
    if (loggedInSection) loggedInSection.style.display = 'block';
    if (loggedInUsername) {
      loggedInUsername.textContent = user.username;
    }
    // 显示历史记录下拉框
    if (historyDropdownContainer) {
      historyDropdownContainer.style.display = 'block';
      updateHistoryDropdown();
    }
  } else {
    if (loginSection) loginSection.style.display = 'block';
    if (loggedInSection) loggedInSection.style.display = 'none';
    // 隐藏历史记录下拉框
    if (historyDropdownContainer) {
      historyDropdownContainer.style.display = 'none';
    }
    // 清空输入框
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
  }
}

// 初始化登录UI
async function initLogin() {
  await updateLoginUI();
  
  // 登录按钮事件
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const usernameInput = document.getElementById('login-username');
      const passwordInput = document.getElementById('login-password');
      if (!usernameInput || !passwordInput) return;
      
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();
      
      const result = await login(username, password);
      if (result.success) {
        await updateLoginUI();
        showStatus(i18n('loginSuccess'), 'success');
      } else {
        showStatus(result.message || i18n('loginFailed'), 'error');
      }
    });
  }
  
  // 登出按钮事件
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
      showStatus(i18n('logoutButton'), 'success');
    });
  }
  
  // 查看历史按钮事件（在设置页面中，通过消息传递）
  // 这个功能在 settings.js 中处理
}

// 初始化登录功能
initLogin();

// 页面加载时检查登录状态并更新历史记录下拉框
(async () => {
  const user = await checkLoginStatus();
  if (user) {
    updateHistoryDropdown();
  }
})();

// ============================================================================
// 历史记录功能
// ============================================================================

// 保存查询历史
async function saveQueryHistory(query) {
  const user = await checkLoginStatus();
  if (!user) return; // 未登录不保存
  
  const historyItem = {
    query: query,
    timestamp: Date.now(),
    date: new Date().toLocaleString()
  };
  
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['queryHistory'], resolve);
  });
  
  const history = result.queryHistory || [];
  // 添加到开头，避免重复
  if (history.length === 0 || history[0].query !== query) {
    history.unshift(historyItem);
    // 最多保存100条
    if (history.length > 100) {
      history.pop();
    }
    
    await new Promise(resolve => {
      chrome.storage.local.set({ queryHistory: history }, resolve);
    });
    
    // 更新下拉框
    updateHistoryDropdown();
  }
}

// 加载历史记录
async function loadHistory() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['queryHistory'], resolve);
  });
  
  const history = result.queryHistory || [];
  
  if (history.length === 0) {
    historyList.innerHTML = `<div class="history-empty" data-i18n="historyEmpty">${i18n('historyEmpty')}</div>`;
    return;
  }
  
  historyList.innerHTML = history.map((item, index) => `
    <div class="history-item">
      <div class="history-item-content">${escapeHtml(item.query)}</div>
      <div class="history-item-meta">
        <span>${item.date || new Date(item.timestamp).toLocaleString()}</span>
        <div class="history-item-actions">
          <button class="history-btn history-btn-use" onclick="useHistoryQuery('${escapeHtml(item.query).replace(/'/g, "\\'")}')" data-i18n="historyUse">${i18n('historyUse')}</button>
          <button class="history-btn history-btn-delete" onclick="deleteHistoryItem(${index})" data-i18n="historyDelete">${i18n('historyDelete')}</button>
        </div>
      </div>
    </div>
  `).join('');
}

// 使用历史查询
function useHistoryQuery(query) {
  textarea.value = query;
  textarea.focus();
  showMainPage();
}

// 删除历史项
async function deleteHistoryItem(index) {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['queryHistory'], resolve);
  });
  
  const history = result.queryHistory || [];
  history.splice(index, 1);
  
  await new Promise(resolve => {
    chrome.storage.local.set({ queryHistory: history }, resolve);
  });
  
  loadHistory();
  // 更新下拉框
  updateHistoryDropdown();
}

// HTML转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 将函数暴露到全局作用域，供HTML中的onclick使用
window.useHistoryQuery = useHistoryQuery;
window.deleteHistoryItem = deleteHistoryItem;

// ============================================================================
// 历史记录下拉框功能
// ============================================================================

// 更新历史记录下拉框
async function updateHistoryDropdown() {
  const historyDropdownContainer = document.getElementById('history-dropdown-container');
  const historyLastQuery = document.getElementById('history-last-query');
  const historyDropdownList = document.getElementById('history-dropdown-list');
  
  if (!historyDropdownContainer || !historyLastQuery || !historyDropdownList) return;
  
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['queryHistory'], resolve);
  });
  
  const history = result.queryHistory || [];
  
  // 更新最后一次查询显示
  if (history.length > 0) {
    const lastQuery = history[0].query;
    // 如果太长，截断显示
    const displayText = lastQuery.length > 30 ? lastQuery.substring(0, 30) + '...' : lastQuery;
    historyLastQuery.textContent = displayText;
    historyLastQuery.title = lastQuery; // 完整内容显示在title中
  } else {
    historyLastQuery.textContent = i18n('historyEmpty');
    historyLastQuery.title = '';
  }
  
  // 更新下拉列表
  if (history.length === 0) {
    historyDropdownList.innerHTML = `<div class="history-dropdown-item" style="cursor: default; color: #9ca3af;">${i18n('historyEmpty')}</div>`;
  } else {
    historyDropdownList.innerHTML = history.map((item, index) => `
      <div class="history-dropdown-item" onclick="selectHistoryQuery('${escapeHtml(item.query).replace(/'/g, "\\'")}')">
        <div>${escapeHtml(item.query.length > 50 ? item.query.substring(0, 50) + '...' : item.query)}</div>
        <div class="history-dropdown-item-time">${item.date || new Date(item.timestamp).toLocaleString()}</div>
      </div>
    `).join('');
  }
}

// 选择历史查询
function selectHistoryQuery(query) {
  textarea.value = query;
  textarea.focus();
  // 关闭下拉框
  const historyDropdownContainer = document.getElementById('history-dropdown-container');
  if (historyDropdownContainer) {
    historyDropdownContainer.classList.remove('open');
  }
}

// 初始化历史记录下拉框
function initHistoryDropdown() {
  const historyDropdownContainer = document.getElementById('history-dropdown-container');
  const historyDropdownTrigger = document.getElementById('history-dropdown-trigger');
  
  if (!historyDropdownContainer || !historyDropdownTrigger) return;
  
  // 点击触发器打开/关闭下拉框
  historyDropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    historyDropdownContainer.classList.toggle('open');
  });
  
  // 点击外部关闭下拉框
  document.addEventListener('click', (e) => {
    if (!historyDropdownContainer.contains(e.target)) {
      historyDropdownContainer.classList.remove('open');
    }
  });
  
  // 初始化时更新下拉框
  updateHistoryDropdown();
}

// 初始化历史记录下拉框
initHistoryDropdown();

// 将函数暴露到全局作用域
window.selectHistoryQuery = selectHistoryQuery;

