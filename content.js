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
        this.createHighlightElement();
        this.applyExistingBlocks();
        this.addEventListeners();
        this.isInitialized = true;
        console.log('Element Blocker initialized');
    }

    createHighlightElement() {
        this.highlightElement = document.createElement('div');
        this.highlightElement.className = 'element-blocker-highlight';
        this.highlightElement.style.cssText = `
            position: absolute;
            background: rgba(255, 0, 0, 0.3);
            border: 2px solid #ff0000;
            pointer-events: none;
            z-index: 2147483645;
            display: none;
            box-shadow: 0 0 0 2px #ff0000, 0 0 10px rgba(255,0,0,0.5);
        `;
        document.body.appendChild(this.highlightElement);
    }

    addEventListeners() {
        document.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                this.lastRightClickTarget = e.target;
            }
        });

        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Message received:', message);
            
            if (message.action === "openBlocker") {
                this.openFromContextMenu();
            } else if (message.action === "startAnalysis") {
                this.startManualAnalysis();
            }
            return true;
        });
    }

    startManualAnalysis() {
        this.analysisMode = true;
        console.log('Manual analysis started');
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
        // Поиск по классам
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

        // Поиск по ID
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

        // Поиск по селекторам
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
        if (this.widget) {
            this.widget.remove();
        }

        this.widget = document.createElement('div');
        this.widget.className = 'element-blocker-widget element-blocker-analysis';
        this.widget.innerHTML = this.getAnalysisWidgetHTML();
        
        document.body.appendChild(this.widget);
        this.addAnalysisWidgetEventListeners();
    }

    showNoElementsMessage() {
        if (this.widget) {
            this.widget.remove();
        }

        this.widget = document.createElement('div');
        this.widget.className = 'element-blocker-widget element-blocker-analysis';
        this.widget.innerHTML = `
            <h3>🔍 Анализ подозрительных элементов</h3>
            <div class="analysis-stats">
                Подозрительные элементы не найдены
                <br><small>Попробуйте обновить страницу и запустить анализ снова</small>
            </div>
            <div class="analysis-controls">
                <button class="element-blocker-btn element-blocker-scan">Сканировать снова</button>
                <button class="element-blocker-btn element-blocker-close">Закрыть</button>
            </div>
        `;
        
        document.body.appendChild(this.widget);
        this.addAnalysisWidgetEventListeners();
    }

    getAnalysisWidgetHTML() {
        return `
            <h3>🔍 Анализ подозрительных элементов</h3>
            <div class="analysis-stats">
                Найдено подозрительных элементов: <strong>${this.suspiciousElements.length}</strong>
                <br><small>Анализ выполнен: ${new Date().toLocaleTimeString()}</small>
            </div>
            <div class="suspicious-list">
                ${this.suspiciousElements.map((item, index) => `
                    <div class="suspicious-item" data-index="${index}">
                        <div class="suspicious-type">${item.type}</div>
                        <div class="suspicious-reason">${item.reason}</div>
                        <div class="suspicious-selector">${item.selector}</div>
                        <div class="suspicious-actions">
                            <button class="analysis-btn block-btn" data-index="${index}">Блокировать</button>
                            <button class="analysis-btn ignore-btn" data-index="${index}">Игнорировать</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="analysis-controls">
                <button class="element-blocker-btn element-blocker-scan">Сканировать снова</button>
                <button class="element-blocker-btn element-blocker-close">Закрыть анализ</button>
            </div>
        `;
    }

    addAnalysisWidgetEventListeners() {
        // Блокировка
        this.widget.querySelectorAll('.block-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.dataset.index);
                this.blockSuspiciousElement(index);
            });
        });

        // Игнорирование
        this.widget.querySelectorAll('.ignore-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.dataset.index);
                this.ignoreSuspiciousElement(index);
            });
        });

        // Сканирование
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

        // Закрытие
        const closeBtn = this.widget.querySelector('.element-blocker-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideWidget();
            this.analysisMode = false;
        });

        // Подсветка при наведении
        this.widget.querySelectorAll('.suspicious-item').forEach(item => {
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
        const item = this.suspiciousElements[index];
        if (item && item.element) {
            const rect = item.element.getBoundingClientRect();
            this.highlightElement.style.display = 'block';
            this.highlightElement.style.left = (rect.left + window.scrollX) + 'px';
            this.highlightElement.style.top = (rect.top + window.scrollY) + 'px';
            this.highlightElement.style.width = rect.width + 'px';
            this.highlightElement.style.height = rect.height + 'px';
        }
    }

    async blockSuspiciousElement(index) {
        const item = this.suspiciousElements[index];
        if (!item) return;
        
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

    // ОСНОВНЫЕ ИЗМЕНЕНИЯ ЗДЕСЬ - добавлен ползунок и улучшено отображение
    openFromContextMenu() {
        if (this.lastRightClickTarget) {
            this.currentElement = this.lastRightClickTarget;
            this.buildHierarchy();
            this.showWidget();
        }
    }

    buildHierarchy() {
        this.hierarchy = [];
        let element = this.currentElement;
        
        // Собираем иерархию от выбранного элемента до body
        while (element && element !== document.documentElement) {
            this.hierarchy.push(element);
            element = element.parentElement;
            if (!element || element === document.body) break;
        }
        
        // Добавляем body в конец иерархии
        if (element && element === document.body) {
            this.hierarchy.push(element);
        }
        
        this.hierarchy.reverse();
        this.currentLevel = this.hierarchy.length - 1; // Начинаем с выбранного элемента
    }

    showWidget() {
        if (this.widget) {
            this.widget.remove();
        }

        this.widget = document.createElement('div');
        this.widget.className = 'element-blocker-widget';
        this.widget.innerHTML = this.getWidgetHTML();
        
        document.body.appendChild(this.widget);
        this.addWidgetEventListeners();
        this.updateHighlight();
    }

    getWidgetHTML() {
        const currentElement = this.hierarchy[this.currentLevel];
        const elementInfo = this.getElementInfo(currentElement);
        const hierarchyInfo = this.getHierarchyInfo();
        
        return `
            <h3>Element Blocker</h3>
            <div class="element-blocker-info">
                <div class="element-info">${elementInfo}</div>
                <div class="hierarchy-info">${hierarchyInfo}</div>
            </div>
            <div class="hierarchy-controls">
                <div class="slider-container">
                    <strong>Иерархия элементов (${this.currentLevel + 1}/${this.hierarchy.length}):</strong>
                    <input type="range" class="element-blocker-slider" min="0" max="${this.hierarchy.length - 1}" value="${this.currentLevel}">
                    <div class="slider-labels">
                        <span class="slider-label">Body</span>
                        <span class="slider-label">Выбранный</span>
                    </div>
                </div>
            </div>
            <div class="element-blocker-buttons">
                <button class="element-blocker-btn element-blocker-add">Добавить в блокировку</button>
                <button class="element-blocker-btn element-blocker-close">Закрыть</button>
            </div>
        `;
    }

    getElementInfo(element) {
        if (!element) return '<span class="no-element">Нет элемента</span>';
        
        let info = `<div class="element-tag"><strong>Tag:</strong> ${element.tagName}</div>`;
        
        if (element.id) {
            info += `<div class="element-id"><strong>ID:</strong> ${element.id}</div>`;
        }
        
        if (element.className && typeof element.className === 'string' && element.className.trim()) {
            const classes = element.className.split(/\s+/).filter(c => c.length > 0);
            if (classes.length > 0) {
                info += `<div class="element-classes"><strong>Class:</strong> ${classes.join(' ')}</div>`;
            }
        }
        
        // Добавляем информацию о размерах
        try {
            const rect = element.getBoundingClientRect();
            info += `<div class="element-size"><strong>Размер:</strong> ${Math.round(rect.width)}×${Math.round(rect.height)}px</div>`;
        } catch (e) {
            // Игнорируем ошибки получения размеров
        }
        
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
            
            levels.push(`<span class="hierarchy-level ${isActive ? 'active' : ''}">${tag}${id}${classes}</span>`);
        }
        
        return `<div class="hierarchy-path">${levels.join(' › ')}</div>`;
    }

    addWidgetEventListeners() {
        const slider = this.widget.querySelector('.element-blocker-slider');
        const addBtn = this.widget.querySelector('.element-blocker-add');
        const closeBtn = this.widget.querySelector('.element-blocker-close');
        
        slider.addEventListener('input', (e) => {
            this.currentLevel = parseInt(e.target.value);
            this.updateHighlight();
            this.updateWidgetInfo();
        });
        
        addBtn.addEventListener('click', () => {
            this.addToBlocklist();
        });
        
        closeBtn.addEventListener('click', () => {
            this.hideWidget();
        });
    }

    updateWidgetInfo() {
        if (!this.widget) return;
        
        const elementInfo = this.widget.querySelector('.element-info');
        const hierarchyInfo = this.widget.querySelector('.hierarchy-info');
        
        if (elementInfo) {
            const currentElement = this.hierarchy[this.currentLevel];
            elementInfo.innerHTML = this.getElementInfo(currentElement);
        }
        
        if (hierarchyInfo) {
            hierarchyInfo.innerHTML = this.getHierarchyInfo();
        }
    }

    updateHighlight() {
        const element = this.hierarchy[this.currentLevel];
        if (element) {
            const rect = element.getBoundingClientRect();
            
            this.highlightElement.style.display = 'block';
            this.highlightElement.style.left = (rect.left + window.scrollX) + 'px';
            this.highlightElement.style.top = (rect.top + window.scrollY) + 'px';
            this.highlightElement.style.width = rect.width + 'px';
            this.highlightElement.style.height = rect.height + 'px';
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
            } else {
                alert('Этот элемент уже заблокирован');
            }
        } catch (error) {
            console.error('Error saving block item:', error);
            alert('Ошибка при блокировке элемента');
        }
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

    async applyExistingBlocks() {
        try {
            const result = await browser.storage.local.get({blockedElements: []});
            const currentHost = window.location.hostname;
            
            result.blockedElements.forEach(item => {
                try {
                    if (item.url === currentHost || 
                        (item.url.startsWith('http') && new URL(item.url).hostname === currentHost)) {
                        this.applyBlocking(item);
                    }
                } catch {
                    if (item.url === currentHost) {
                        this.applyBlocking(item);
                    }
                }
            });
            
            this.updateBlockCount();
        } catch (error) {
            console.error('Error applying existing blocks:', error);
        }
    }

    applyBlocking(blockItem) {
        try {
            const elements = document.querySelectorAll(blockItem.selector);
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
        
        element.classList.add('element-blocker-blocked');
        element.style.setProperty('display', 'none', 'important');
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
        });
    }

    hideWidget() {
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
    }

    hideHighlight() {
        this.highlightElement.style.display = 'none';
    }
}

// Надежная инициализация
function initializeElementBlocker() {
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    if (!window.elementBlocker) {
                        window.elementBlocker = new ElementBlocker();
                    }
                }, 1000);
            });
        } else {
            setTimeout(() => {
                if (!window.elementBlocker) {
                    window.elementBlocker = new ElementBlocker();
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Error initializing Element Blocker:', error);
    }
}

// Запускаем инициализацию
initializeElementBlocker();
