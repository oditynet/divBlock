// Создаем контекстное меню
browser.contextMenus.create({
  id: "element-blocker",
  title: "Block Element",
  contexts: ["all"]
});

// Обработчик клика по контекстному меню
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "element-blocker") {
    browser.tabs.sendMessage(tab.id, {action: "openBlocker", clickInfo: info}).catch(error => {
      console.log('Error sending message to tab:', error);
    });
  }
});

// Обработчик для запуска анализа из popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startAnalysis" && sender.tab) {
    browser.tabs.sendMessage(sender.tab.id, {action: "startAnalysis"}).catch(error => {
      console.log('Error starting analysis:', error);
    });
  }
  return true;
});

// Обновление баджа с количеством заблокированных элементов
async function updateBadge(tabId) {
  try {
    // Проверяем валидность tabId
    if (!tabId || tabId === -1 || tabId === 'undefined') {
      return;
    }

    const result = await browser.storage.local.get({blockedElements: []});
    const blockedElements = result.blockedElements;
    
    // Получаем информацию о вкладке
    let tab;
    try {
      tab = await browser.tabs.get(tabId);
    } catch (error) {
      console.log('Tab not found:', tabId);
      return;
    }
    
    // Проверяем URL вкладки
    if (!tab.url || !tab.url.startsWith('http')) {
      browser.browserAction.setBadgeText({ text: "", tabId: tabId });
      return;
    }
    
    const currentHost = new URL(tab.url).hostname;
    
    const count = blockedElements.filter(item => {
      if (!item || !item.url) return false;
      
      try {
        // Для старых записей, где url может быть просто hostname
        if (item.url.startsWith('http')) {
          const itemHost = new URL(item.url).hostname;
          return itemHost === currentHost;
        } else {
          // Если url сохранен как просто hostname
          return item.url === currentHost;
        }
      } catch (error) {
        // Если URL невалидный, сравниваем как строки
        return item.url === currentHost;
      }
    }).length;
    
    // Устанавливаем бадж
    browser.browserAction.setBadgeText({
      text: count > 0 ? count.toString() : "",
      tabId: tabId
    });
    
    browser.browserAction.setBadgeBackgroundColor({
      color: count > 0 ? "#FF0000" : "#000000",
      tabId: tabId
    });
  } catch (error) {
    console.log('Error updating badge:', error);
  }
}

// Слушаем изменения в хранилище
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.blockedElements) {
    browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
      if (tabs[0]) {
        updateBadge(tabs[0].id);
      }
    });
  }
});

// Обновляем бадж при переключении вкладок
browser.tabs.onActivated.addListener(activeInfo => {
  updateBadge(activeInfo.tabId);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    updateBadge(tabId);
  }
});

// Инициализация баджа при запуске
browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
  if (tabs[0]) {
    updateBadge(tabs[0].id);
  }
});

// Обработчик сообщений от content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "blockCountUpdated" && sender.tab) {
    updateBadge(sender.tab.id);
  }
  if (message.action === "importCompleted" && sender.tab) {
    updateBadge(sender.tab.id);
  }
  return true;
});
