document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentSiteInfo();
  await loadBlockedElements();
  setupButtons();
});

async function getBlockedElements() {
  return new Promise((resolve) => {
    browser.storage.local.get({blockedElements: []}).then(result => {
      resolve(result.blockedElements);
    });
  });
}

async function removeBlockedElement(globalIndex) {
  try {
    const blockedElements = await getBlockedElements();
    
    if (globalIndex >= 0 && globalIndex < blockedElements.length) {
      const updatedElements = blockedElements.filter((_, i) => i !== globalIndex);
      await browser.storage.local.set({blockedElements: updatedElements});
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing blocked element:', error);
    return false;
  }
}

function setupButtons() {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const patternsBtn = document.getElementById('patternsBtn');
  
  patternsBtn.addEventListener('click', openPatternsManager);
  exportBtn.addEventListener('click', exportBlockedElements);
  importBtn.addEventListener('click', importBlockedElements);
  analyzeBtn.addEventListener('click', startElementAnalysis);
}

async function openPatternsManager() {
  try {
    await browser.tabs.create({
      url: browser.runtime.getURL('patterns.html'),
      active: true
    });
    window.close();
  } catch (error) {
    alert('Ошибка открытия менеджера паттернов: ' + error.message);
  }
}

async function exportBlockedElements() {
  try {
    const blockedElements = await getBlockedElements();
    
    if (!blockedElements || blockedElements.length === 0) {
      alert('Нет блокировок для экспорта');
      return;
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalCount: blockedElements.length,
      blockedElements: blockedElements
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `element-blocker-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    alert('Ошибка при экспорте: ' + error.message);
  }
}

async function importBlockedElements() {
  try {
    await browser.tabs.create({
      url: browser.runtime.getURL('import.html'),
      active: true
    });
    window.close();
  } catch (error) {
    alert('Ошибка открытия импорта: ' + error.message);
  }
}

async function startElementAnalysis() {
  try {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    const currentTab = tabs[0];
    
    console.log('🚀 Starting analysis on tab:', currentTab.id);
    
    // Проверяем, не встроен ли уже content script
    try {
      // Пробуем отправить сообщение - если получится, значит content script уже активен
      await browser.tabs.sendMessage(currentTab.id, {action: "ping"});
      console.log('✅ Content script already active');
    } catch (error) {
      // Если не получилось, встраиваем content script
      console.log('🔄 Injecting content script...');
      await browser.tabs.executeScript(currentTab.id, {
        file: 'content.js',
        runAt: 'document_end'
      });
      
      // Ждем инициализации content script
      console.log('🔄 Waiting for content script initialization...');
      await waitForContentScript(currentTab.id);
    }
    
    // Теперь отправляем команду анализа
    await browser.tabs.sendMessage(currentTab.id, {action: "startAnalysis"});
    console.log('✅ Analysis message sent');
    window.close();
    
  } catch (error) {
    console.error('❌ Error starting analysis:', error);
    
    // Более информативное сообщение об ошибке
    if (error.message.includes('Could not establish connection')) {
      alert('Ошибка: Content script не отвечает. Попробуйте обновить страницу и повторить.');
    } else if (error.message.includes('No tab with id')) {
      alert('Ошибка: Вкладка не найдена. Попробуйте снова.');
    } else {
      alert('Ошибка запуска анализа: ' + error.message);
    }
  }
}

// Функция ожидания готовности content script
async function waitForContentScript(tabId, maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt} to connect to content script...`);
      await browser.tabs.sendMessage(tabId, {action: "ping"});
      console.log('✅ Content script is ready');
      return true;
    } catch (error) {
      if (attempt < maxAttempts) {
        // Ждем перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.error('❌ Content script not ready after', maxAttempts, 'attempts');
        throw new Error('Content script initialization timeout');
      }
    }
  }
}

async function loadCurrentSiteInfo() {
  try {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    if (tabs[0] && tabs[0].url) {
      const url = new URL(tabs[0].url);
      document.getElementById('currentSite').textContent = `Текущий сайт: ${url.hostname}`;
      
      const blockedElements = await getBlockedElements();
      const count = blockedElements.filter(item => {
        try {
          if (item.url.startsWith('http')) {
            const itemHost = new URL(item.url).hostname;
            return itemHost === url.hostname;
          } else {
            return item.url === url.hostname;
          }
        } catch {
          return item.url === url.hostname;
        }
      }).length;
      
      document.getElementById('currentCount').textContent = count;
    }
  } catch (error) {
    document.getElementById('currentSite').textContent = 'Текущий сайт: неизвестен';
    document.getElementById('currentCount').textContent = '0';
  }
}

async function loadBlockedElements() {
  try {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    const currentHost = tabs[0] && tabs[0].url ? new URL(tabs[0].url).hostname : '';
    
    const blockedElements = await getBlockedElements();
    const blockedList = document.getElementById('blockedList');
    
    if (!blockedElements || !Array.isArray(blockedElements)) {
      blockedList.innerHTML = '<div class="empty-message">Ошибка загрузки данных</div>';
      return;
    }
    
    const currentSiteElements = blockedElements.filter((item, globalIndex) => {
      if (!item || !item.url) return false;
      item.globalIndex = globalIndex;
      
      try {
        if (item.url.startsWith('http')) {
          const itemHost = new URL(item.url).hostname;
          return itemHost === currentHost;
        } else {
          return item.url === currentHost;
        }
      } catch {
        return item.url === currentHost;
      }
    });
    
    if (currentSiteElements.length === 0) {
      blockedList.innerHTML = '<div class="empty-message">Нет заблокированных элементов для этого сайта</div>';
      return;
    }
    
    blockedList.innerHTML = currentSiteElements.map((item) => {
      const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Неизвестно';
      const method = item.method || 'hidden';
      const selector = item.selector || 'Неизвестный селектор';
      const globalIndex = item.globalIndex;
      
      return `
        <div class="blocked-item">
          <div class="blocked-header">
            <span class="blocked-selector">${selector}</span>
            <button class="remove-btn" data-global-index="${globalIndex}">Удалить</button>
          </div>
          <div class="blocked-time">Добавлен: ${timestamp}</div>
          <div class="blocked-time">Метод: ${method}</div>
        </div>
      `;
    }).join('');
    
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const globalIndex = parseInt(e.target.dataset.globalIndex);
        if (!isNaN(globalIndex)) {
          const success = await removeBlockedElement(globalIndex);
          if (success) {
            await loadCurrentSiteInfo();
            await loadBlockedElements();
            browser.tabs.reload();
          }
        }
      });
    });
    
  } catch (error) {
    document.getElementById('blockedList').innerHTML = '<div class="empty-message">Ошибка загрузки списка</div>';
  }
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.blockedElements) {
    loadCurrentSiteInfo();
    loadBlockedElements();
  }
});
