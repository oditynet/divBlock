// background.js - Исправленная версия

let contextMenuCreated = false;

// Создаем контекстное меню при установке расширения
browser.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    createContextMenu();
});

// Функция создания контекстного меню
function createContextMenu() {
    if (contextMenuCreated) {
        return;
    }
    
    browser.contextMenus.removeAll(() => {
        browser.contextMenus.create({
            id: "element-blocker",
            title: "Block Element", 
            contexts: ["all"],
            documentUrlPatterns: ["<all_urls>"]
        }, () => {
            if (browser.runtime.lastError) {
                console.log('Context menu creation error:', browser.runtime.lastError);
            } else {
                contextMenuCreated = true;
                console.log('Context menu created successfully');
            }
        });
    });
}

// Обработчик клика по контекстному меню
browser.contextMenus.onClicked.addListener((info, tab) => {
    console.log('Context menu clicked on tab:', tab.id);
    
    if (info.menuItemId === "element-blocker") {
        // Внедряем content script и отправляем сообщение
        injectContentScript(tab.id);
    }
});

// Функция для вставки content script
function injectContentScript(tabId) {
    console.log('Injecting content script into tab', tabId);
    
    browser.tabs.executeScript(tabId, {
        file: 'content.js',
        runAt: 'document_end'
    }).then(() => {
        console.log('Content script injected successfully');
        // Ждем инициализации и отправляем сообщение
        setTimeout(() => {
            browser.tabs.sendMessage(tabId, {action: "openBlocker"})
                .then(() => console.log('Message sent after injection'))
                .catch(error => {
                    console.log('Error sending message after injection:', error);
                    // Пробуем выполнить код напрямую
                    browser.tabs.executeScript(tabId, {
                        code: `
                            if (window.elementBlocker) {
                                window.elementBlocker.openFromContextMenu();
                            } else {
                                console.error('Element blocker not initialized');
                            }
                        `,
                        runAt: 'document_end'
                    });
                });
        }, 500);
    }).catch(error => {
        console.log('Error injecting content script:', error);
    });
}

// Обработчик сообщений от popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message.action);
    
    if (message.action === "startAnalysis" && sender.tab) {
        // Запуск анализа из popup
        injectContentScriptForAnalysis(sender.tab.id)
            .then(() => {
                sendResponse({success: true});
            })
            .catch(error => {
                sendResponse({success: false, error: error.message});
            });
        return true;
    }
    
    if (message.action === "blockCountUpdated" && sender.tab) {
        updateBadge(sender.tab.id);
        sendResponse({success: true});
    }
    
    return true;
});

// Функция для запуска анализа
function injectContentScriptForAnalysis(tabId) {
    return new Promise((resolve, reject) => {
        browser.tabs.executeScript(tabId, {
            file: 'content.js',
            runAt: 'document_end'
        }).then(() => {
            console.log('Content script injected for analysis');
            setTimeout(() => {
                browser.tabs.sendMessage(tabId, {action: "startAnalysis"})
                    .then(() => resolve())
                    .catch(error => {
                        // Пробуем выполнить код напрямую
                        browser.tabs.executeScript(tabId, {
                            code: `
                                if (window.elementBlocker) {
                                    window.elementBlocker.startManualAnalysis();
                                }
                            `,
                            runAt: 'document_end'
                        }).then(() => resolve())
                        .catch(finalError => reject(finalError));
                    });
            }, 500);
        }).catch(error => {
            reject(error);
        });
    });
}

// Функция обновления баджа
async function updateBadge(tabId) {
    try {
        if (!tabId) return;

        const result = await browser.storage.local.get({blockedElements: []});
        const blockedElements = result.blockedElements;
        
        let tab;
        try {
            tab = await browser.tabs.get(tabId);
        } catch (error) {
            return;
        }
        
        if (!tab.url || !tab.url.startsWith('http')) {
            browser.browserAction.setBadgeText({ text: "", tabId: tabId });
            return;
        }
        
        const currentHost = new URL(tab.url).hostname;
        
        const count = blockedElements.filter(item => {
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
        }).length;
        
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

// Обновляем бадж при обновлении вкладки
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        updateBadge(tabId);
    }
});

// Инициализация при запуске
browser.tabs.query({active: true, currentWindow: true}).then(tabs => {
    if (tabs[0]) {
        updateBadge(tabs[0].id);
    }
});
