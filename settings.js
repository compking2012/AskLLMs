/**
 * 设置页面逻辑
 * 此文件包含设置页面的所有逻辑，但集成在 popup 中
 */

// 设置页面事件监听器初始化标志
let settingsEventListenersInitialized = false;

/**
 * 初始化设置页面
 * @param {Array<HTMLElement>} platformBtns - 平台按钮元素数组
 * @param {Object} PLATFORM_ICONS - 平台图标映射
 * @param {Function} getPlatformDisplayName - 获取平台显示名称的函数
 * @param {Object} DEFAULT_SETTINGS - 默认设置
 * @param {Function} loadAndApplySettings - 加载并应用设置的函数
 * @param {Function} initI18n - 初始化 i18n 的函数
 */
async function initSettingsPage(platformBtns, PLATFORM_ICONS, getPlatformDisplayName, DEFAULT_SETTINGS, loadAndApplySettings, initI18n) {
  // 生成平台复选框
  const platformCheckboxes = document.getElementById('platform-checkboxes');
  if (!platformCheckboxes) return;
  
  platformCheckboxes.innerHTML = '';
  
  // 获取平台顺序（从设置中读取，如果没有则使用默认顺序）
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], resolve);
  });
  const settings = result.settings || DEFAULT_SETTINGS;
  const allPlatforms = Array.from(platformBtns).map(btn => btn.dataset.platform);
  const platformOrder = settings.platformOrder && settings.platformOrder.length > 0 
    ? settings.platformOrder.filter(p => allPlatforms.includes(p))
    : allPlatforms;
  
  // 按照顺序生成复选框
  platformOrder.forEach(platform => {
    const btn = Array.from(platformBtns).find(b => b.dataset.platform === platform);
    if (!btn) return; // 如果平台不存在，跳过
    
    const checkbox = document.createElement('label');
    checkbox.className = 'settings-checkbox draggable';
    checkbox.draggable = true;
    checkbox.dataset.platform = platform;
    const displayName = getPlatformDisplayName(platform);
    checkbox.innerHTML = `
      <span class="drag-handle">⋮⋮</span>
      <input type="checkbox" value="${platform}" data-platform="${platform}">
      <span class="icon"><img src="${PLATFORM_ICONS[platform]}" alt="${platform}" draggable="false"></span>
      <span>${displayName}</span>
    `;
    // 阻止拖拽手柄的点击事件冒泡到复选框
    const dragHandle = checkbox.querySelector('.drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      dragHandle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }
    platformCheckboxes.appendChild(checkbox);
  });
  
  // 添加拖拽排序功能
  initDragAndDrop(platformCheckboxes, loadAndApplySettings, initI18n);
  
  // 加载设置并填充表单
  loadSettingsToForm(DEFAULT_SETTINGS, loadAndApplySettings, initI18n);
  
  // 只初始化一次事件监听器（避免重复添加）
  if (!settingsEventListenersInitialized) {
    // 颜色模式切换
    document.querySelectorAll('input[name="color-mode"]').forEach(radio => {
      radio.addEventListener('change', async (e) => {
        const colorSelector = document.getElementById('color-selector');
        if (colorSelector) {
          if (e.target.value === 'fixed') {
            colorSelector.style.display = 'block';
          } else {
            colorSelector.style.display = 'none';
          }
        }
        // 立即保存
        await saveSettings(loadAndApplySettings, initI18n);
      });
    });
    
    // 为主题单选按钮添加立即保存
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.addEventListener('change', async () => {
        await saveSettings(loadAndApplySettings, initI18n);
      });
    });
    
    // 为语言单选按钮添加立即保存
    document.querySelectorAll('input[name="language"]').forEach(radio => {
      radio.addEventListener('change', async () => {
        await saveSettings(loadAndApplySettings, initI18n);
      });
    });
    
    // 为颜色单选按钮添加立即保存
    document.querySelectorAll('input[name="color"]').forEach(radio => {
      radio.addEventListener('change', async () => {
        await saveSettings(loadAndApplySettings, initI18n);
      });
    });
    
    // 为标签组标题输入框添加立即保存（使用 debounce）
    const tabGroupTitleInput = document.getElementById('tab-group-title');
    if (tabGroupTitleInput) {
      let titleInputTimeout = null;
      tabGroupTitleInput.addEventListener('input', () => {
        clearTimeout(titleInputTimeout);
        titleInputTimeout = setTimeout(async () => {
          await saveSettings(loadAndApplySettings, initI18n);
        }, 500); // 500ms 延迟，避免频繁保存
      });
    }
    
    // 清空历史记录按钮
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', async () => {
        // 获取 i18n 函数（从全局作用域）
        const i18nFunc = window.i18n;
        if (!i18nFunc) {
          console.error('[Settings] i18n function not available');
          alert('i18n function not available');
          return;
        }
        
        // 确认对话框
        const confirmMessage = i18nFunc('clearHistoryConfirm');
        if (!confirm(confirmMessage)) {
          return;
        }
        
        // 调用清空历史记录函数（从全局作用域）
        const clearQueryHistoryFunc = window.clearQueryHistory;
        if (!clearQueryHistoryFunc) {
          console.error('[Settings] clearQueryHistory function not available');
          alert('clearQueryHistory function not available');
          return;
        }
        
        const success = await clearQueryHistoryFunc();
        if (success) {
          // 显示成功消息
          const successMessage = i18nFunc('clearHistorySuccess');
          alert(successMessage);
        } else {
          const errorMessage = i18nFunc('errorSendFailed') || 'Failed to clear history';
          alert(errorMessage);
        }
      });
    }
    
    settingsEventListenersInitialized = true;
  }
}

/**
 * 加载设置到表单
 * @param {Object} DEFAULT_SETTINGS - 默认设置
 * @param {Function} loadAndApplySettings - 加载并应用设置的函数
 * @param {Function} initI18n - 初始化 i18n 的函数
 */
async function loadSettingsToForm(DEFAULT_SETTINGS, loadAndApplySettings, initI18n) {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], resolve);
  });
  
  const settings = result.settings || DEFAULT_SETTINGS;
  
  // 主题设置
  const themeValue = settings.theme || 'auto';
  const themeRadio = document.getElementById(`theme-${themeValue}`);
  if (themeRadio) themeRadio.checked = true;
  
  // 语言设置
  const langRadio = document.getElementById(`lang-${settings.language === 'auto' ? 'auto' : settings.language === 'zh_CN' ? 'zh' : 'en'}`);
  if (langRadio) langRadio.checked = true;
  
  // 可见平台设置
  document.querySelectorAll('#platform-checkboxes input[type="checkbox"]').forEach(checkbox => {
    const platform = checkbox.dataset.platform;
    checkbox.checked = settings.visiblePlatforms.includes(platform);
    const label = checkbox.closest('.settings-checkbox');
    if (label) {
      if (checkbox.checked) {
        label.classList.add('active');
      } else {
        label.classList.remove('active');
      }
    }
  });
  
  // 标签组标题
  const tabGroupTitleInput = document.getElementById('tab-group-title');
  if (tabGroupTitleInput) {
    tabGroupTitleInput.value = settings.tabGroupTitle || '';
  }
  
  // 颜色模式
  const colorModeRadio = document.getElementById(`color-${settings.colorMode}`);
  if (colorModeRadio) colorModeRadio.checked = true;
  const colorSelector = document.getElementById('color-selector');
  if (colorSelector) {
    if (settings.colorMode === 'fixed') {
      colorSelector.style.display = 'block';
      const colorRadio = document.querySelector(`input[name="color"][value="${settings.fixedColor}"]`);
      if (colorRadio) colorRadio.checked = true;
    } else {
      colorSelector.style.display = 'none';
    }
  }
  
  // 复选框点击事件（立即保存）
  document.querySelectorAll('#platform-checkboxes input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const label = e.target.closest('.settings-checkbox');
      if (label) {
        if (e.target.checked) {
          label.classList.add('active');
        } else {
          label.classList.remove('active');
        }
      }
      // 立即保存
      await saveSettings(loadAndApplySettings, initI18n);
    });
  });
}

/**
 * 保存设置（立即保存，不返回主页面）
 * @param {Function} loadAndApplySettings - 加载并应用设置的函数
 * @param {Function} initI18n - 初始化 i18n 的函数
 */
async function saveSettings(loadAndApplySettings, initI18n) {
  // 获取当前平台顺序
  const platformOrder = Array.from(document.querySelectorAll('#platform-checkboxes .draggable'))
    .map(item => item.dataset.platform);
  
  const settings = {
    theme: document.querySelector('input[name="theme"]:checked')?.value || 'auto',
    language: document.querySelector('input[name="language"]:checked')?.value || 'auto',
    visiblePlatforms: Array.from(document.querySelectorAll('#platform-checkboxes input[type="checkbox"]:checked'))
      .map(cb => cb.dataset.platform),
    platformOrder: platformOrder.length > 0 ? platformOrder : undefined,
    tabGroupTitle: document.getElementById('tab-group-title')?.value.trim() || '',
    colorMode: document.querySelector('input[name="color-mode"]:checked')?.value || 'random',
    fixedColor: document.querySelector('input[name="color"]:checked')?.value || 'blue'
  };
  
  await new Promise(resolve => {
    chrome.storage.local.set({ settings }, resolve);
  });
  
  // 立即应用设置
  if (loadAndApplySettings) {
    await loadAndApplySettings();
  }
  
  // 更新语言缓存并重新初始化 i18n，让语言设置立即生效
  if (typeof currentLanguage !== 'undefined') {
    currentLanguage = null; // 清除缓存，强制重新读取
  }
  if (initI18n) {
    await initI18n();
  }
  
  // 如果在设置页面，需要重新生成平台复选框以更新名称
  const settingsPage = document.getElementById('settings-page');
  if (settingsPage && settingsPage.classList.contains('active')) {
    // 需要重新调用 initSettingsPage，但这里我们无法直接调用
    // 所以依赖外部调用
  }
}

/**
 * 初始化拖拽排序功能
 * @param {HTMLElement} container - 容器元素
 * @param {Function} loadAndApplySettings - 加载并应用设置的函数
 * @param {Function} initI18n - 初始化 i18n 的函数
 */
function initDragAndDrop(container, loadAndApplySettings, initI18n) {
  let draggedElement = null;
  
  container.querySelectorAll('.draggable').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedElement = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', item.innerHTML);
      // 阻止事件冒泡，避免触发复选框点击
      e.stopPropagation();
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedElement = null;
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const afterElement = getDragAfterElement(container, e.clientY);
      if (afterElement == null) {
        container.appendChild(draggedElement);
      } else {
        container.insertBefore(draggedElement, afterElement);
      }
    });
    
    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (draggedElement) {
        // 保存新的顺序
        const newOrder = Array.from(container.querySelectorAll('.draggable')).map(item => item.dataset.platform);
        await savePlatformOrder(newOrder, loadAndApplySettings, initI18n);
      }
    });
  });
}

/**
 * 获取拖拽后的元素位置
 * @param {HTMLElement} container - 容器元素
 * @param {number} y - 鼠标Y坐标
 * @returns {HTMLElement|null}
 */
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * 保存平台顺序
 * @param {Array<string>} order - 平台顺序数组
 * @param {Function} loadAndApplySettings - 加载并应用设置的函数
 * @param {Function} initI18n - 初始化 i18n 的函数
 */
async function savePlatformOrder(order, loadAndApplySettings, initI18n) {
  const result = await new Promise(resolve => {
    chrome.storage.local.get(['settings'], resolve);
  });
  
  const settings = result.settings || {};
  settings.platformOrder = order;
  
  await new Promise(resolve => {
    chrome.storage.local.set({ settings }, resolve);
  });
  
  // 立即应用设置
  if (loadAndApplySettings) {
    await loadAndApplySettings();
  }
}

// 导出函数到全局作用域，供 popup.js 调用
window.initSettingsPageFromSettings = initSettingsPage;
window.loadSettingsToFormFromSettings = loadSettingsToForm;
window.saveSettingsFromSettings = saveSettings;

