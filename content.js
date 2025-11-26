// content.js - Полная версия с исправленным позиционированием виджета

// Защита от повторного выполнения
if (window.elementBlockerInstance) {
    console.log('Element Blocker already exists');
} else {
    window.elementBlockerInstance = true;

    class ElementBlocker {
        constructor() {
            this.currentElement = null;
            this.highlightElement = null;
            this.widget = null;
            this.isAnalyzing = false;
            this.blockedCount = 0;
            this.lastRightClickTarget = null;
            this.suspiciousElements = [];
            this.ignoredElements = new Set();
            this.analysisMode = false;
            this.isInitialized = false;
            this.hierarchy = [];
            this.currentLevel = 0;
            
            this.adPatterns = {
                classes: [
                    'ad', 'ads', 'advertisement', 'advert', 'banner', 
                    'pub', 'sponsor', 'promo', 'commercial',
                    'ad-', '_ad', '-ad', 'ad_',
                    'google_ads', 'adsense', 'doubleclick',
                    'teaser', 'recommend', 'widget'
                ],
                ids: [
                    'ad', 'ads', 'banner', 'advert', 'advertisement',
                    'popup', 'modal', 'overlay'
                ],
                selectors: [
                    'iframe[src*="ads"]',
                    'iframe[src*="doubleclick"]',
                    'iframe[src*="googleads"]',
                    'iframe[src*="ad"]',
                    'ins.adsbygoogle',
                    'div[class*="ad"]',
                    'div[id*="ad"]'
                ]
            };

            this.init();
        }

        init() {
            console.log('🔄 Element Blocker starting initialization...');
            this.injectStyles();
            this.createHighlightElement();
            this.applyExistingBlocks();
            this.addEventListeners();
            this.isInitialized = true;
            console.log('✅ Element Blocker initialized');
        }
        
        findVisibleParent(element) {
            if (!element) return null;
            
            console.log('🔍 Поиск видимого родителя для:', element.tagName, element.className);
            
            let currentElement = element;
            let attempts = 0;
            const maxAttempts = 15;
            
            if (this.isElementVisible(currentElement)) {
                console.log('✅ Сам элемент видим');
                return currentElement;
            }
            
            while (currentElement && currentElement !== document.body && attempts < maxAttempts) {
                currentElement = currentElement.parentElement;
                attempts++;
                
                if (!currentElement) break;
                
                console.log(`📋 Проверяем родителя ${attempts}:`, currentElement.tagName, currentElement.className);
                
                if (this.isElementVisible(currentElement)) {
                    console.log('✅ Найден видимый родитель:', currentElement.tagName, currentElement.className);
                    const rect = currentElement.getBoundingClientRect();
                    console.log('📏 Размер родителя:', rect.width, 'x', rect.height);
                    return currentElement;
                }
            }
            
            console.log('❌ Видимый родитель не найден, используем оригинальный элемент');
            return element;
        }

        isElementVisible(element) {
            if (!element) return false;
            
            try {
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                
                const isVisible = (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    rect.width > 5 &&
                    rect.height > 5 &&
                    rect.top < window.innerHeight &&
                    rect.bottom > 0 &&
                    rect.left < window.innerWidth &&
                    rect.right > 0
                );
                
                return isVisible;
            } catch (e) {
                console.log('❌ Ошибка проверки видимости:', e);
                return false;
            }
        }
        
        getElementSize(element) {
            try {
                const rect = element.getBoundingClientRect();
                return `${Math.round(rect.width)}×${Math.round(rect.height)}px`;
            } catch (e) {
                return 'неизвестно';
            }
        }

        getElementPosition(element) {
            try {
                const rect = element.getBoundingClientRect();
                if (rect.top < 0) return 'за экраном';
                if (rect.top < 100) return 'верх';
                if (rect.bottom > window.innerHeight - 100) return 'низ';
                return 'центр';
            } catch (e) {
                return 'неизвестно';
            }
        }

        getElementDetails(element) {
            let details = '';
            
            if (element.id) {
                details += `<div style="color: #1976d2; font-size: 9px; margin-top: 2px;"><strong>ID:</strong> #${element.id}</div>`;
            }
            
            if (element.className && typeof element.className === 'string') {
                const classes = element.className.split(/\s+/).filter(c => c.length > 0).slice(0, 3);
                if (classes.length > 0) {
                    details += `<div style="color: #388e3c; font-size: 9px; margin-top: 2px;"><strong>Классы:</strong> ${classes.join(', ')}${element.className.split(/\s+/).length > 3 ? '...' : ''}</div>`;
                }
            }
            
            const dataAttrs = Array.from(element.attributes)
                .filter(attr => attr.name.startsWith('data-'))
                .slice(0, 2);
            if (dataAttrs.length > 0) {
                details += `<div style="color: #7b1fa2; font-size: 9px; margin-top: 2px;"><strong>Data:</strong> ${dataAttrs.map(attr => attr.name).join(', ')}</div>`;
            }
            
            try {
                const style = window.getComputedStyle(element);
                if (style.position === 'fixed' || style.position === 'sticky') {
                    details += `<div style="color: #f57c00; font-size: 9px; margin-top: 2px;"><strong>Позиция:</strong> ${style.position}</div>`;
                }
            } catch (e) {}
            
            return details;
        }
        
        injectStyles() {
            if (document.getElementById('element-blocker-styles')) {
                return;
            }
            
            const style = document.createElement('style');
            style.id = 'element-blocker-styles';
            style.textContent = `
                .element-blocker-highlight {
                    position: absolute !important;
                    background: rgba(255, 0, 0, 0.3) !important;
                    border: 3px solid #ff0000 !important;
                    pointer-events: none !important;
                    z-index: 2147483645 !important;
                    display: none !important;
                    box-shadow: 0 0 0 3px #ff0000, 0 0 20px rgba(255,0,0,0.8) !important;
                    animation: elementBlockerPulse 1s infinite !important;
                }
                
                @keyframes elementBlockerPulse {
                    0% { 
                        box-shadow: 0 0 0 3px #ff0000, 0 0 20px rgba(255,0,0,0.8);
                        border-color: #ff0000;
                    }
                    50% { 
                        box-shadow: 0 0 0 6px #ff0000, 0 0 40px rgba(255,0,0,1);
                        border-color: #ff4444;
                    }
                    100% { 
                        box-shadow: 0 0 0 3px #ff0000, 0 0 20px rgba(255,0,0,0.8);
                        border-color: #ff0000;
                    }
                }
                
                .element-blocker-widget {
                    position: fixed !important;
                    background: white !important;
                    border: 2px solid #4CAF50 !important;
                    border-radius: 8px !important;
                    padding: 15px !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
                    z-index: 2147483647 !important;
                    font-family: Arial, sans-serif !important;
                    max-width: 400px !important;
                }
                
                .element-blocker-analysis {
                    border-color: #FF9800 !important;
                }
            `;
            
            document.head.appendChild(style);
            console.log('✅ Стили для подсветки добавлены');
        }

        /*createHighlightElement() {
            console.log('🛠️ Creating highlight element...');
            
            const oldHighlights = document.querySelectorAll('.element-blocker-highlight');
            oldHighlights.forEach(el => el.remove());

            this.highlightElement = document.createElement('div');
            this.highlightElement.className = 'element-blocker-highlight';
            
            this.highlightElement.style.cssText = `
                position: absolute !important;
                background: rgba(255, 0, 0, 0.5) !important;
                border: 4px solid #ff0000 !important;
                pointer-events: none !important;
                z-index: 2147483645 !important;
                display: none !important;
                box-shadow: 0 0 0 4px #ff0000, 0 0 40px rgba(255,0,0,1) !important;
            `;
            
            document.body.appendChild(this.highlightElement);
            console.log('✅ Highlight element created and appended to body');
        }*/
        
        createHighlightElement() {
    console.log('🛠️ Creating highlight element...');
    
    // Удаляем старые подсветки
    const oldHighlights = document.querySelectorAll('.element-blocker-highlight');
    oldHighlights.forEach(el => el.remove());

    this.highlightElement = document.createElement('div');
    this.highlightElement.className = 'element-blocker-highlight';
    
    this.highlightElement.style.cssText = `
        position: absolute !important;
        background: rgba(255, 0, 0, 0.3) !important;
        border: 4px solid #ff0000 !important;
        pointer-events: none !important;
        z-index: 2147483646 !important;
        display: none !important;
        box-shadow: 0 0 0 4px #ff0000, 0 0 30px rgba(255,0,0,0.8) !important;
        animation: elementBlockerPulse 1s infinite !important;
    `;
    
    document.body.appendChild(this.highlightElement);
    console.log('✅ Highlight element created and appended to body');
}

        addEventListeners() {
            document.addEventListener('mousedown', (e) => {
                if (e.button === 2) {
                    this.lastRightClickTarget = e.target;
                    console.log('🖱️ Right click target saved:', e.target);
                }
            });

            browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
                console.log('Message received:', message);
                
                if (message.action === "ping") {
                    sendResponse({status: "ready"});
                    return true;
                } else if (message.action === "openBlocker") {
                    this.openFromContextMenu();
                    sendResponse({success: true});
                } else if (message.action === "startAnalysis") {
                    this.startManualAnalysis();
                    sendResponse({success: true});
                }
                return true;
            });
        }

async applyExistingBlocks() {
    try {
        const result = await browser.storage.local.get({blockedElements: []});
        const currentHost = window.location.hostname;
        
        console.log('📋 All blocked elements from storage:', result.blockedElements);
        
        const siteBlocks = result.blockedElements.filter(item => {
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
        
        console.log('🎯 Blocks for this site:', siteBlocks.length, siteBlocks);
        
        // Применяем блокировки
        siteBlocks.forEach(item => {
            console.log(`🛠️ Processing block: ${item.selector} for ${item.url}`);
            this.applyBlocking(item);
        });
        
        this.updateBlockCount();
        
        // Повторная проверка через секунду на случай динамической загрузки
        setTimeout(() => {
            console.log('🔄 Re-applying blocks for dynamic content');
            siteBlocks.forEach(item => {
                this.applyBlocking(item);
            });
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error applying existing blocks:', error);
    }
}



applyBlocking(blockItem) {
    try {
        console.log(`🔧 Applying blocking for selector: ${blockItem.selector}`);
        
        // Используем селектор из хранилища
        const elements = document.querySelectorAll(blockItem.selector);
        console.log(`🔧 Found ${elements.length} elements with selector: ${blockItem.selector}`);
        
        elements.forEach(element => {
            this.blockElement(element, blockItem.method);
        });
        
    } catch (error) {
        console.warn('Error applying block:', error, 'for selector:', blockItem.selector);
    }
}

blockElement(element, method) {
    if (!element || element.nodeType !== 1) return;
    
    if (element.classList.contains('element-blocker-blocked')) {
        return;
    }
    
    console.log('🚫 Blocking element:', element);
    
    // Добавляем класс для отслеживания
    element.classList.add('element-blocker-blocked');
    
    // Применяем скрытие
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    
    // Для iframe дополнительно убираем src
    if (element.tagName === 'IFRAME') {
        console.log('Blocking iframe:', element.src);
        element.setAttribute('src', 'about:blank');
    }
}
        updateBlockCount() {
            const currentHost = window.location.hostname;
            browser.storage.local.get({blockedElements: []}).then(result => {
                this.blockedCount = result.blockedElements.filter(item => {
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
                console.log(`📊 Blocked count updated: ${this.blockedCount} for ${currentHost}`);
            });
        }

        startManualAnalysis() {
            console.log('🎬 Starting manual analysis ON PAGE');
            
            this.createHighlightElement();
            this.injectStyles();
            
            this.analysisMode = true;
            this.analyzePage();
        }

        analyzePage() {
            this.suspiciousElements = [];
            this.findAdElements();
            this.findPopupElements();
            this.findFixedElements();
            
            console.log(`Found ${this.suspiciousElements.length} suspicious elements`);
            
            if (this.suspiciousElements.length > 0) {
                this.showAnalysisWidget();
            } else {
                this.showNoElementsMessage();
            }
        }

        findAdElements() {
            this.adPatterns.classes.forEach(className => {
                try {
                    const elements = document.querySelectorAll(`[class*="${className}"]`);
                    elements.forEach(element => {
                        if (this.isElementValid(element)) {
                            this.addSuspiciousElement(element, 'Рекламный элемент', `Класс содержит: ${className}`);
                        }
                    });
                } catch (e) {
                    console.log('Error in class search:', className);
                }
            });

            this.adPatterns.ids.forEach(id => {
                try {
                    const elements = document.querySelectorAll(`[id*="${id}"]`);
                    elements.forEach(element => {
                        if (this.isElementValid(element)) {
                            this.addSuspiciousElement(element, 'Рекламный элемент', `ID содержит: ${id}`);
                        }
                    });
                } catch (e) {
                    console.log('Error in ID search:', id);
                }
            });

            this.adPatterns.selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        if (this.isElementValid(element)) {
                            this.addSuspiciousElement(element, 'Рекламный элемент', `Селектор: ${selector}`);
                        }
                    });
                } catch (e) {
                    console.log('Invalid selector:', selector);
                }
            });
        }

        findPopupElements() {
            const popupSelectors = [
                '.popup', '.modal', '.overlay', '.lightbox',
                '.dialog', '[role="dialog"]', '.popover'
            ];

            popupSelectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {
                        if (this.isElementValid(element) && this.isPopupLike(element)) {
                            this.addSuspiciousElement(element, 'Всплывающее окно', `Селектор: ${selector}`);
                        }
                    });
                } catch (e) {
                    console.log('Invalid popup selector:', selector);
                }
            });
        }

        findFixedElements() {
            try {
                const fixedElements = document.querySelectorAll('[style*="fixed"], [style*="sticky"]');
                fixedElements.forEach(element => {
                    if (this.isElementValid(element)) {
                        const style = window.getComputedStyle(element);
                        if ((style.position === 'fixed' || style.position === 'sticky') && 
                            this.isElementLarge(element)) {
                            this.addSuspiciousElement(element, 'Фиксированный элемент', `position: ${style.position}`);
                        }
                    }
                });
            } catch (e) {
                console.log('Error finding fixed elements');
            }
        }

        isElementValid(element) {
            return element && 
                   document.contains(element) &&
                   this.isVisible(element) && 
                   !this.isAlreadyBlocked(element) && 
                   !this.ignoredElements.has(this.getElementKey(element));
        }

        isVisible(element) {
            if (!element) return false;
            
            try {
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                
                return (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    rect.width > 10 &&
                    rect.height > 10 &&
                    rect.top < window.innerHeight &&
                    rect.bottom > 0
                );
            } catch (e) {
                return false;
            }
        }

        isAlreadyBlocked(element) {
            return element.classList.contains('element-blocker-blocked');
        }

        isPopupLike(element) {
            try {
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                
                return (
                    parseInt(style.zIndex) > 1000 ||
                    style.position === 'fixed' ||
                    (element.hasAttribute('role') && element.getAttribute('role') === 'dialog') ||
                    rect.width > 300 ||
                    rect.height > 200
                );
            } catch (e) {
                return false;
            }
        }

        isElementLarge(element) {
            try {
                const rect = element.getBoundingClientRect();
                return rect.width > 100 && rect.height > 50;
            } catch (e) {
                return false;
            }
        }

        getElementKey(element) {
            if (!element) return '';
            try {
                const rect = element.getBoundingClientRect();
                return `${element.tagName}_${element.className}_${Math.round(rect.left)}_${Math.round(rect.top)}`;
            } catch (e) {
                return `${element.tagName}_${element.className}_${Date.now()}`;
            }
        }

        addSuspiciousElement(element, type, reason) {
            const elementKey = this.getElementKey(element);
            const exists = this.suspiciousElements.some(item => 
                this.getElementKey(item.element) === elementKey
            );
            
            if (!exists) {
                this.suspiciousElements.push({
                    element: element,
                    type: type,
                    reason: reason,
                    selector: this.generateSelector(element),
                    isIgnored: false,
                    elementKey: elementKey
                });
            }
        }

        showAnalysisWidget() {
            console.log('🔄 Creating compact analysis widget...');
            
            if (this.widget) {
                this.widget.remove();
            }
            
            this.widget = document.createElement('div');
            this.widget.className = 'element-blocker-widget element-blocker-analysis';
            this.widget.style.cssText = `
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 500px !important;
                max-height: 70vh !important;
                background: white !important;
                border: 2px solid #FF9800 !important;
                border-radius: 8px !important;
                padding: 20px !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
                z-index: 2147483647 !important;
                font-family: Arial, sans-serif !important;
                font-size: 12px !important;
                display: flex !important;
                flex-direction: column !important;
            `;
            
            this.widget.innerHTML = this.getDetailedAnalysisHTML();
            document.body.appendChild(this.widget);
            this.addAnalysisWidgetEventListeners();
        }

        getDetailedAnalysisHTML() {
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 14px; color: #FF9800;">🔍 Детальный анализ</h3>
                    <span style="background: #FF9800; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                        ${this.suspiciousElements.length} элементов
                    </span>
                </div>
                
                <div style="flex: 1; overflow-y: auto; margin-bottom: 10px; max-height: 50vh;">
                    <div style="font-size: 11px; color: #666; margin-bottom: 8px; text-align: center;">
                        🔍 Наведите на элемент для подсветки, кликните для блокировки
                    </div>
                    
                    <div class="suspicious-list-detailed">
                        ${this.suspiciousElements.slice(0, 15).map((item, index) => `
                            <div class="suspicious-item-detailed" data-index="${index}" 
                                 style="border: 1px solid #e0e0e0; padding: 8px; margin: 6px 0; border-radius: 4px; background: #fafafa; cursor: pointer; font-size: 11px; transition: all 0.2s;">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                                    <div style="font-weight: bold; color: #d32f2f; font-size: 12px;">${item.type}</div>
                                    <div style="display: flex; gap: 4px;">
                                        <button class="analysis-btn block-btn-detailed" data-index="${index}" 
                                                style="background: #4caf50; color: white; border: none; border-radius: 3px; padding: 4px 8px; font-size: 10px; cursor: pointer;">
                                            Блокировать
                                        </button>
                                        <button class="analysis-btn ignore-btn-detailed" data-index="${index}"
                                                style="background: #ff9800; color: white; border: none; border-radius: 3px; padding: 4px 8px; font-size: 10px; cursor: pointer;">
                                            Игнорировать
                                        </button>
                                    </div>
                                </div>
                                
                                <div style="color: #666; margin-bottom: 4px; font-size: 10px;">
                                    <strong>Причина:</strong> ${item.reason}
                                </div>
                                
                                <div style="background: #e8e8e8; padding: 4px 6px; border-radius: 3px; margin-bottom: 4px; font-size: 9px; word-break: break-all; font-family: monospace;">
                                    ${item.selector}
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; color: #888; font-size: 9px;">
                                    <span>📏 ${this.getElementSize(item.element)}</span>
                                    <span>🏷️ ${item.element.tagName}</span>
                                    <span>🎯 ${this.getElementPosition(item.element)}</span>
                                </div>
                                
                                ${this.getElementDetails(item.element)}
                            </div>
                        `).join('')}
                    </div>
                    
                    ${this.suspiciousElements.length > 15 ? `
                        <div style="text-align: center; color: #666; font-size: 10px; margin-top: 8px; padding: 6px; background: #f0f0f0; border-radius: 4px;">
                            ... и еще ${this.suspiciousElements.length - 15} элементов
                        </div>
                    ` : ''}
                </div>
                
                <div style="display: flex; gap: 8px; border-top: 1px solid #e0e0e0; padding-top: 12px;">
                    <button class="element-blocker-btn element-blocker-scan" 
                            style="flex: 1; padding: 8px 12px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        🔄 Сканировать снова
                    </button>
                    <button class="element-blocker-btn element-blocker-close" 
                            style="flex: 1; padding: 8px 12px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        ✕ Закрыть анализ
                    </button>
                </div>
            `;
        }

        hideWidget() {
            console.log('🔄 Hiding widget...');
            
            if (this.widget) {
                this.widget.remove();
                this.widget = null;
            }
            
            this.hideHighlight();
            this.isAnalyzing = false;
            this.lastRightClickTarget = null;
            this.analysisMode = false;
            this.hierarchy = [];
            this.currentLevel = 0;
            
            console.log('✅ All cleaned up');
        }

        showNoElementsMessage() {
            console.log('📭 Showing no elements message');
            
            if (this.widget) {
                this.widget.remove();
            }
            
            this.widget = document.createElement('div');
            this.widget.className = 'element-blocker-widget element-blocker-analysis';
            this.widget.style.cssText = `
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 400px !important;
                background: white !important;
                border: 2px solid #2196F3 !important;
                border-radius: 8px !important;
                padding: 20px !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
                z-index: 2147483647 !important;
                font-family: Arial, sans-serif !important;
                text-align: center !important;
            `;
            
            this.widget.innerHTML = `
                <h3 style="color: #2196F3; margin-top: 0;">🔍 Анализ подозрительных элементов</h3>
                <div class="analysis-stats" style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <strong>Подозрительные элементы не найдены</strong>
                    <br><small style="color: #666;">Попробуйте обновить страницу и запустить анализ снова</small>
                </div>
                <div class="analysis-controls" style="display: flex; gap: 10px; justify-content: center;">
                    <button class="element-blocker-btn element-blocker-scan" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Сканировать снова</button>
                    <button class="element-blocker-btn element-blocker-close" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Закрыть</button>
                </div>
            `;
            
            document.body.appendChild(this.widget);
            this.addAnalysisWidgetEventListeners();
        }

        addAnalysisWidgetEventListeners() {
            this.widget.querySelectorAll('.block-btn-detailed').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(e.target.dataset.index);
                    this.blockSuspiciousElement(index);
                });
            });

            this.widget.querySelectorAll('.ignore-btn-detailed').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(e.target.dataset.index);
                    this.ignoreSuspiciousElement(index);
                });
            });

            const scanBtn = this.widget.querySelector('.element-blocker-scan');
            scanBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                scanBtn.disabled = true;
                scanBtn.textContent = 'Сканируем...';
                
                setTimeout(() => {
                    this.analyzePage();
                    scanBtn.disabled = false;
                    scanBtn.textContent = 'Сканировать снова';
                }, 1000);
            });

            const closeBtn = this.widget.querySelector('.element-blocker-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideWidget();
            });

            this.widget.querySelectorAll('.suspicious-item-detailed').forEach(item => {
                item.addEventListener('mouseenter', (e) => {
                    const index = parseInt(e.currentTarget.dataset.index);
                    this.highlightSuspiciousElement(index);
                });
                
                item.addEventListener('mouseleave', () => {
                    this.hideHighlight();
                });
            });

            this.widget.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        highlightSuspiciousElement(index) {
            console.log('=== НАЧАЛО ПОДСВЕТКИ ===');
            
            const item = this.suspiciousElements[index];
            if (!item || !item.element) {
                console.log('❌ Элемент не найден');
                return;
            }

            const elementToHighlight = this.findVisibleParent(item.element);

            if (!document.body.contains(elementToHighlight)) {
                console.log('❌ Элемент не в DOM');
                return;
            }

            try {
                const rect = elementToHighlight.getBoundingClientRect();

                this.createHighlightElement();

                const left = rect.left + window.scrollX;
                const top = rect.top + window.scrollY;

                this.highlightElement.style.display = 'block';
                this.highlightElement.style.left = left + 'px';
                this.highlightElement.style.top = top + 'px';
                this.highlightElement.style.width = Math.max(rect.width, 10) + 'px';
                this.highlightElement.style.height = Math.max(rect.height, 10) + 'px';
                
                this.highlightElement.style.background = 'rgba(255, 0, 0, 0.3)';
                this.highlightElement.style.border = '3px solid #ff0000';
                this.highlightElement.style.boxShadow = '0 0 0 3px #ff0000, 0 0 30px rgba(255,0,0,0.8)';
                this.highlightElement.style.zIndex = '2147483647';

                console.log('✅ Подсветка установлена');

                this.scrollToElement(elementToHighlight);

            } catch (error) {
                console.error('❌ Ошибка подсветки:', error);
            }
        }

        scrollToElement(element) {
            try {
                const rect = element.getBoundingClientRect();
                const elementTop = rect.top + window.scrollY;
                const viewportHeight = window.innerHeight;
                
                if (rect.top < 100 || rect.bottom > viewportHeight - 100) {
                    const targetScroll = elementTop - (viewportHeight / 3);
                    
                    window.scrollTo({
                        top: Math.max(0, targetScroll),
                        behavior: 'smooth'
                    });
                }
            } catch (e) {
                console.log('Error scrolling to element on page:', e);
            }
        }

        async blockSuspiciousElement(index) {
            const item = this.suspiciousElements[index];
            if (!item) return;
            
            console.log('🛑 Blocking original element:', item.element);
            
            const blockItem = {
                url: window.location.hostname,
                selector: item.selector,
                timestamp: Date.now(),
                method: 'hidden',
                originalHTML: item.element.outerHTML.substring(0, 200),
                pageUrl: window.location.href,
                detectedBy: 'auto-analysis',
                elementType: item.type
            };
            
            try {
                const result = await browser.storage.local.get({blockedElements: []});
                const blockedElements = result.blockedElements;
                
                const exists = blockedElements.some(existingItem => 
                    existingItem.url === blockItem.url && existingItem.selector === blockItem.selector
                );
                
                if (!exists) {
                    blockedElements.push(blockItem);
                    await browser.storage.local.set({blockedElements: blockedElements});
                    
                    this.applyBlocking(blockItem);
                    this.updateBlockCount();
                    
                    this.ignoredElements.add(item.elementKey);
                    this.suspiciousElements.splice(index, 1);
                    
                    if (this.suspiciousElements.length > 0) {
                        this.showAnalysisWidget();
                    } else {
                        this.showNoElementsMessage();
                    }
                    
                    browser.runtime.sendMessage({action: "blockCountUpdated"});
                    
                } else {
                    this.ignoreSuspiciousElement(index);
                }
            } catch (error) {
                console.error('Error blocking element:', error);
            }
        }

        ignoreSuspiciousElement(index) {
            const item = this.suspiciousElements[index];
            if (!item) return;
            
            this.ignoredElements.add(item.elementKey);
            this.suspiciousElements.splice(index, 1);
            
            if (this.suspiciousElements.length > 0) {
                this.showAnalysisWidget();
            } else {
                this.showNoElementsMessage();
            }
        }

        // ОТКРЫТИЕ ИЗ КОНТЕКСТНОГО МЕНЮ
        openFromContextMenu() {
            console.log('🎯 Opening from context menu, target:', this.lastRightClickTarget);
            
            if (this.lastRightClickTarget) {
                this.currentElement = this.lastRightClickTarget;
                this.buildHierarchy();
                this.showHierarchyWidget();
            } else {
                console.log('❌ No right click target found');
            }
        }

        buildHierarchy() {
            this.hierarchy = [];
            let element = this.currentElement;
            
            while (element && element !== document.documentElement) {
                this.hierarchy.push(element);
                element = element.parentElement;
                if (!element || element === document.body) break;
            }
            
            if (element && element === document.body) {
                this.hierarchy.push(element);
            }
            
            this.hierarchy.reverse();
            this.currentLevel = this.hierarchy.length - 1;
            
            console.log('📊 Hierarchy built:', this.hierarchy.length, 'levels');
        }

        showHierarchyWidget() {
            if (this.widget) {
                this.widget.remove();
            }
            
             // Создаем элемент подсветки если его нет
    if (!this.highlightElement) {
        this.createHighlightElement();
    }
            
            this.widget = document.createElement('div');
            this.widget.className = 'element-blocker-widget';
            this.widget.style.cssText = `
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 450px !important;
                max-height: 80vh !important;
                background: white !important;
                border: 2px solid #4CAF50 !important;
                border-radius: 8px !important;
                padding: 15px !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
                z-index: 2147483647 !important;
                font-family: Arial, sans-serif !important;
                font-size: 12px !important;
                overflow-y: auto !important;
            `;
            
            this.widget.innerHTML = this.getHierarchyWidgetHTML();
            
            document.body.appendChild(this.widget);
            this.addHierarchyWidgetEventListeners();
            this.updateHighlight();
        }

        getHierarchyWidgetHTML() {
            const currentElement = this.hierarchy[this.currentLevel];
            const elementInfo = this.getElementInfo(currentElement);
            const hierarchyInfo = this.getHierarchyInfo();
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 14px; color: #4CAF50;">🎯 Выбор элемента</h3>
                    <span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                        ${this.currentLevel + 1}/${this.hierarchy.length}
                    </span>
                </div>
                
                <div class="element-blocker-info" style="margin-bottom: 15px;">
                    <div class="element-info" style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 10px; border-left: 3px solid #4CAF50;">
                        ${elementInfo}
                    </div>
                    <div class="hierarchy-info" style="font-size: 11px; color: #666; background: #f5f5f5; padding: 8px; border-radius: 4px;">
                        ${hierarchyInfo}
                    </div>
                </div>
                
                <div class="hierarchy-controls" style="margin-bottom: 15px;">
                    <div class="slider-container">
                        <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
                            <strong>Перемещайте ползунок для выбора уровня элемента:</strong>
                        </div>
                        <input type="range" class="element-blocker-slider" min="0" max="${this.hierarchy.length - 1}" value="${this.currentLevel}" 
                               style="width: 100%; margin: 8px 0;">
                        <div class="slider-labels" style="display: flex; justify-content: space-between; font-size: 10px; color: #666;">
                            <span>Body (корень)</span>
                            <span>Выбранный элемент</span>
                        </div>
                    </div>
                </div>
                
                <div class="element-blocker-buttons" style="display: flex; gap: 8px;">
                    <button class="element-blocker-btn element-blocker-add" 
                            style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        ✅ Заблокировать
                    </button>
                    <button class="element-blocker-btn element-blocker-close" 
                            style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        ❌ Закрыть
                    </button>
                </div>
            `;
        }

        getElementInfo(element) {
            if (!element) return '<span class="no-element">Нет элемента</span>';
            
            let info = `<div style="margin-bottom: 4px;"><strong>Тег:</strong> <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px;">${element.tagName.toLowerCase()}</code></div>`;
            
            if (element.id) {
                info += `<div style="margin-bottom: 4px;"><strong>ID:</strong> <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px;">#${element.id}</code></div>`;
            }
            
            if (element.className && typeof element.className === 'string' && element.className.trim()) {
                const classes = element.className.split(/\s+/).filter(c => c.length > 0);
                if (classes.length > 0) {
                    info += `<div style="margin-bottom: 4px;"><strong>Классы:</strong> <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px;">.${classes.join(' .')}</code></div>`;
                }
            }
            
            try {
                const rect = element.getBoundingClientRect();
                info += `<div style="margin-bottom: 4px;"><strong>Размер:</strong> ${Math.round(rect.width)}×${Math.round(rect.height)}px</div>`;
                info += `<div><strong>Позиция:</strong> ${this.getElementPosition(element)}</div>`;
            } catch (e) {}
            
            return info;
        }

        getHierarchyInfo() {
            if (this.hierarchy.length === 0) return '';
            
            const levels = [];
            for (let i = 0; i < this.hierarchy.length; i++) {
                const element = this.hierarchy[i];
                const isActive = i === this.currentLevel;
                const tag = element.tagName.toLowerCase();
                const id = element.id ? `#${element.id}` : '';
                const classes = element.className ? `.${element.className.split(' ')[0]}` : '';
                
                levels.push(`<span style="${isActive ? 'color: #4CAF50; font-weight: bold;' : 'color: #666;'}">${tag}${id}${classes}</span>`);
            }
            
            return `<div style="line-height: 1.4;">${levels.join(' › ')}</div>`;
        }

    /*    addHierarchyWidgetEventListeners() {
            const slider = this.widget.querySelector('.element-blocker-slider');
            const addBtn = this.widget.querySelector('.element-blocker-add');
            const closeBtn = this.widget.querySelector('.element-blocker-close');
            
            slider.addEventListener('input', (e) => {
                this.currentLevel = parseInt(e.target.value);
                this.updateHighlight();
                this.updateHierarchyWidgetInfo();
            });
            
            addBtn.addEventListener('click', () => {
                this.addToBlocklist();
            });
            
            closeBtn.addEventListener('click', () => {
                this.hideWidget();
            });
        }*/
        
        addHierarchyWidgetEventListeners() {
    const slider = this.widget.querySelector('.element-blocker-slider');
    const addBtn = this.widget.querySelector('.element-blocker-add');
    const closeBtn = this.widget.querySelector('.element-blocker-close');
    
    slider.addEventListener('input', (e) => {
        this.currentLevel = parseInt(e.target.value);
        this.updateHierarchyWidgetInfo(); // Теперь это обновит и информацию и подсветку
    });
    
    addBtn.addEventListener('click', () => {
        this.addToBlocklist();
    });
    
    closeBtn.addEventListener('click', () => {
        this.hideWidget();
    });
}

    /*    updateHierarchyWidgetInfo() {
            if (!this.widget) return;
            
            const elementInfo = this.widget.querySelector('.element-info');
            const hierarchyInfo = this.widget.querySelector('.hierarchy-info');
            
            console.log("2222222");
            console.log(elementInfo);
            
            if (elementInfo) {
                const currentElement = this.hierarchy[this.currentLevel];
                elementInfo.innerHTML = this.getElementInfo(currentElement);
            }
            
            if (hierarchyInfo) {
                hierarchyInfo.innerHTML = this.getHierarchyInfo();
            }
            
        }
*/

updateHierarchyWidgetInfo() {
    if (!this.widget) return;
    
    const currentElement = this.hierarchy[this.currentLevel];
    const elementInfo = this.getElementInfo(currentElement);
    const hierarchyInfo = this.getHierarchyInfo();
    
    // Обновляем только информационные блоки, не пересоздавая весь виджет
    const elementInfoDiv = this.widget.querySelector('.element-info');
    const hierarchyInfoDiv = this.widget.querySelector('.hierarchy-info');
    const levelSpan = this.widget.querySelector('span[style*="background: #4CAF50"]');
    
    if (elementInfoDiv) elementInfoDiv.innerHTML = elementInfo;
    if (hierarchyInfoDiv) hierarchyInfoDiv.innerHTML = hierarchyInfo;
    if (levelSpan) levelSpan.textContent = `${this.currentLevel + 1}/${this.hierarchy.length}`;
    
    // Обновляем подсветку элемента НА СТРАНИЦЕ
    this.updateHighlight();
}
    /*    updateHighlight() {
            const element = this.hierarchy[this.currentLevel];
            
            console.log("!!!");
            console.log(element);
            if (element) {
                const rect = element.getBoundingClientRect();
                
                this.highlightElement.style.display = 'block';
                this.highlightElement.style.left = (rect.left + window.scrollX) + 'px';
                this.highlightElement.style.top = (rect.top + window.scrollY) + 'px';
                this.highlightElement.style.width = rect.width + 'px';
                this.highlightElement.style.height = rect.height + 'px';
            }
        }*/
/*        updateHighlight() {
    const element = this.hierarchy[this.currentLevel];
    
    if (!element) return;
    
    console.log('🔄 Updating highlight for element:', element);
    
    try {
        const rect = element.getBoundingClientRect();
        
        this.highlightElement.style.display = 'block';
        this.highlightElement.style.left = (rect.left + window.scrollX) + 'px';
        this.highlightElement.style.top = (rect.top + window.scrollY) + 'px';
        this.highlightElement.style.width = rect.width + 'px';
        this.highlightElement.style.height = rect.height + 'px';
        
        console.log('✅ Highlight updated for:', element.tagName, element.id || element.className);
    } catch (error) {
        console.error('❌ Error updating highlight:', error);
    }
}*/


updateHighlight() {
    const element = this.hierarchy[this.currentLevel];
    
    if (!element) {
        console.log('❌ No element to highlight');
        return;
    }
    
    console.log('🔄 Updating highlight for element:', element.tagName, element.id || element.className);
    
    // Убедимся, что highlightElement существует
    if (!this.highlightElement) {
        console.log('🛠️ Creating highlight element...');
        this.createHighlightElement();
    }
    
    try {
        const rect = element.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        
        console.log('📏 Element rect:', rect);
        console.log('🎯 Scroll position:', scrollX, scrollY);
        
        // Яркая подсветка для лучшей видимости
 this.highlightElement.style.cssText = `
            position: absolute !important;
            left: ${rect.left + scrollX}px !important;
            top: ${rect.top + scrollY}px !important;
            width: ${rect.width}px !important;
            height: ${rect.height}px !important;
            background: rgba(255, 0, 0, 0.15) !important; /* Более прозрачный */
            border: 2px solid #ff4444 !important; /* Тонкая рамка */
            pointer-events: none !important;
            z-index: 2147483646 !important;
            display: block !important;
            box-shadow: 0 0 0 1px #ff4444, 0 0 15px rgba(255,68,68,0.4) !important; /* Мягкая тень */
            animation: elementBlockerPulse 1.5s infinite !important; /* Медленнее пульсация */
        `;

        
        console.log('✅ Highlight applied to:', element);
        
    } catch (error) {
        console.error('❌ Error updating highlight:', error);
    }
}
        async addToBlocklist() {
            const element = this.hierarchy[this.currentLevel];
            if (!element) return;
            
            const selector = this.generateSelector(element);
            const blockItem = {
                url: window.location.hostname,
                selector: selector,
                timestamp: Date.now(),
                method: 'hidden',
                originalHTML: element.outerHTML.substring(0, 200),
                pageUrl: window.location.href
            };
            
            try {
                const result = await browser.storage.local.get({blockedElements: []});
                const blockedElements = result.blockedElements;
                
                const exists = blockedElements.some(item => 
                    item.url === blockItem.url && item.selector === blockItem.selector
                );
                
                if (!exists) {
                    blockedElements.push(blockItem);
                    await browser.storage.local.set({blockedElements: blockedElements});
                    
                    this.applyBlocking(blockItem);
                    this.updateBlockCount();
                    this.hideWidget();
                    
                    browser.runtime.sendMessage({action: "blockCountUpdated"});
                    
                    this.showSuccessNotification('Элемент успешно заблокирован!');
                } else {
                    alert('Этот элемент уже заблокирован');
                }
            } catch (error) {
                console.error('Error saving block item:', error);
                alert('Ошибка при блокировке элемента');
            }
        }

        showSuccessNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed !important;
                bottom: 80px !important;
                right: 20px !important;
                background: #4CAF50 !important;
                color: white !important;
                padding: 10px 15px !important;
                border-radius: 4px !important;
                z-index: 2147483647 !important;
                font-family: Arial, sans-serif !important;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
                font-size: 12px !important;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);
        }

        generateSelector(element) {
            if (!element) return '';
            
            if (element.id) {
                return `#${this.escapeCSS(element.id)}`;
            }
            
            let selector = element.tagName.toLowerCase();
            
            if (element.className && typeof element.className === 'string') {
                const classes = element.className.split(/\s+/).filter(c => c.length > 0);
                if (classes.length > 0) {
                    selector += '.' + this.escapeCSS(classes[0]);
                }
            }
            
            if (element.parentElement) {
                const parent = element.parentElement;
                const children = Array.from(parent.children);
                const index = children.indexOf(element) + 1;
                selector += `:nth-child(${index})`;
            }
            
            return selector;
        }

        escapeCSS(str) {
            return CSS.escape ? CSS.escape(str) : str.replace(/([\\'"])/g, '\\$1');
        }

        hideHighlight() {
            if (this.highlightElement) {
                this.highlightElement.style.display = 'none';
            }
        }
    }

    // Инициализация
    function initializeElementBlocker() {
        try {
            if (!window.elementBlocker) {
                window.elementBlocker = new ElementBlocker();
                console.log('✅ Element Blocker initialized successfully');
            } else {
                console.log('ℹ️ Element Blocker already exists');
            }
        } catch (error) {
            console.error('❌ Error initializing Element Blocker:', error);
        }
    }

    // Запускаем инициализацию
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeElementBlocker);
    } else {
        initializeElementBlocker();
    }
}
