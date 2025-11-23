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

async function removeBlockedElement(index) {
  const blockedElements = await getBlockedElements();
  const updatedElements = blockedElements.filter((_, i) => i !== index);
  await browser.storage.local.set({blockedElements: updatedElements});
  return true;
}

function setupButtons() {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  
  exportBtn.addEventListener('click', exportBlockedElements);
  importBtn.addEventListener('click', importBlockedElements);
  analyzeBtn.addEventListener('click', startElementAnalysis);
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
      blockedElements: blockedElements.map(item => ({
        url: item.url,
        selector: item.selector,
        method: item.method,
        timestamp: item.timestamp,
        originalHTML: item.originalHTML || '',
        pageUrl: item.pageUrl || ''
      }))
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    
    const blob = new Blob([jsonData], { 
      type: 'application/json;charset=utf-8' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `element-blocker-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Экспортировано блокировок:', blockedElements.length);
  } catch (error) {
    console.error('Ошибка при экспорте:', error);
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
    console.error('Error opening import tab:', error);
    alert('Ошибка открытия импорта: ' + error.message);
  }
}

async function startElementAnalysis() {
  try {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    await browser.tabs.sendMessage(tabs[0].id, {action: "startAnalysis"});
    window.close();
  } catch (error) {
    alert('Ошибка запуска анализа: ' + error.message);
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
    console.log('Error loading current site info:', error);
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
    
    const currentSiteElements = blockedElements.filter(item => {
      if (!item || !item.url) return false;
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
    
    blockedList.innerHTML = currentSiteElements.map((item, index) => {
      const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Неизвестно';
      const method = item.method || 'hidden';
      const url = item.url || 'Неизвестный сайт';
      const selector = item.selector || 'Неизвестный селектор';
      
      return `
        <div class="blocked-item">
          <div class="blocked-header">
            <span class="blocked-url">${url}</span>
            <button class="remove-btn" data-index="${index}">Удалить</button>
          </div>
          <div class="blocked-selector">${selector}</div>
          <div class="blocked-time">Добавлен: ${timestamp}</div>
          <div class="blocked-time">Метод: ${method}</div>
        </div>
      `;
    }).join('');
    
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        if (!isNaN(index)) {
          await removeBlockedElement(index);
          await loadCurrentSiteInfo();
          await loadBlockedElements();
          browser.tabs.reload();
        }
      });
    });
    
  } catch (error) {
    console.log('Error loading blocked elements:', error);
    document.getElementById('blockedList').innerHTML = '<div class="empty-message">Ошибка загрузки списка</div>';
  }
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.blockedElements) {
    loadCurrentSiteInfo();
    loadBlockedElements();
  }
});
