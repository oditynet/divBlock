// patterns-ui.js - ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ INLINE HANDLERS

class PatternsUI {
    constructor() {
        this.patternManager = null;
        this.init();
    }

    async init() {
        if (typeof patternManager === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }
        
        this.patternManager = window.patternManager;
        await this.patternManager.loadCustomPatterns();
        this.setupEventListeners();
        this.loadPatterns();
        this.setupTabs();
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                button.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Добавление элементов
        document.getElementById('addDomain').addEventListener('click', () => this.addDomain());
        document.getElementById('newDomain').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addDomain();
        });

        document.getElementById('addAnalytics').addEventListener('click', () => this.addAnalyticsSelector());
        document.getElementById('newAnalytics').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addAnalyticsSelector();
        });

        document.getElementById('addSelector').addEventListener('click', () => this.addAdSelector());
        document.getElementById('newSelector').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addAdSelector();
        });

        // Закрытие и экспорт/импорт
        document.getElementById('closeButton').addEventListener('click', () => this.closeTab());
        document.getElementById('exportPatterns').addEventListener('click', () => this.exportPatterns());
        document.getElementById('importPatterns').addEventListener('click', () => this.importPatterns());
    }

    async addDomain() {
        const input = document.getElementById('newDomain');
        const domain = input.value.trim();
        
        if (!domain) {
            alert('Введите домен');
            return;
        }

        await this.patternManager.addCustomAdDomain(domain);
        input.value = '';
        await this.loadDomains();
    }

    async addAnalyticsSelector() {
        const input = document.getElementById('newAnalytics');
        const selector = input.value.trim();
        
        if (!selector) {
            alert('Введите CSS селектор');
            return;
        }

        await this.patternManager.addCustomAnalyticsSelector(selector);
        input.value = '';
        await this.loadAnalyticsSelectors();
    }

    async addAdSelector() {
        const input = document.getElementById('newSelector');
        const selector = input.value.trim();
        
        if (!selector) {
            alert('Введите CSS селектор');
            return;
        }

        await this.patternManager.addCustomAdSelector(selector);
        input.value = '';
        await this.loadAdSelectors();
    }

    async removeDomain(domain) {
        console.log('Removing domain:', domain);
        await this.patternManager.removeCustomAdDomain(domain);
        await this.loadDomains();
    }

    async removeAnalyticsSelector(selector) {
        console.log('Removing analytics selector:', selector);
        await this.patternManager.removeCustomAnalyticsSelector(selector);
        await this.loadAnalyticsSelectors();
    }

    async removeAdSelector(selector) {
        console.log('Removing ad selector:', selector);
        await this.patternManager.removeCustomAdSelector(selector);
        await this.loadAdSelectors();
    }

    loadPatterns() {
        this.loadDomains();
        this.loadAnalyticsSelectors();
        this.loadAdSelectors();
    }

    loadDomains() {
        const list = document.getElementById('domainList');
        if (!list) return;
        
        const domains = this.patternManager.customPatterns.customAdDomains;
        
        if (domains.length === 0) {
            list.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Нет добавленных доменов</div>';
            return;
        }
        
        list.innerHTML = domains.map(domain => `
            <div class="pattern-item" data-domain="${this.escapeHtml(domain)}">
                <span>${this.escapeHtml(domain)}</span>
                <button class="remove" data-type="domain" data-value="${this.escapeHtml(domain)}">Удалить</button>
            </div>
        `).join('');
        
        // Добавляем обработчики для кнопок удаления
        list.querySelectorAll('button[data-type="domain"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const domain = e.target.dataset.value;
                this.removeDomain(domain);
            });
        });
    }

    loadAnalyticsSelectors() {
        const list = document.getElementById('analyticsList');
        if (!list) return;
        
        const selectors = this.patternManager.customPatterns.customAnalyticsElements;
        
        if (selectors.length === 0) {
            list.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Нет добавленных селекторов</div>';
            return;
        }
        
        list.innerHTML = selectors.map(selector => `
            <div class="pattern-item" data-selector="${this.escapeHtml(selector)}">
                <span>${this.escapeHtml(selector)}</span>
                <button class="remove" data-type="analytics" data-value="${this.escapeHtml(selector)}">Удалить</button>
            </div>
        `).join('');
        
        list.querySelectorAll('button[data-type="analytics"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selector = e.target.dataset.value;
                this.removeAnalyticsSelector(selector);
            });
        });
    }

    loadAdSelectors() {
        const list = document.getElementById('selectorList');
        if (!list) return;
        
        const selectors = this.patternManager.customPatterns.customAdSelectors;
        
        if (selectors.length === 0) {
            list.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">Нет добавленных селекторов</div>';
            return;
        }
        
        list.innerHTML = selectors.map(selector => `
            <div class="pattern-item" data-selector="${this.escapeHtml(selector)}">
                <span>${this.escapeHtml(selector)}</span>
                <button class="remove" data-type="ad" data-value="${this.escapeHtml(selector)}">Удалить</button>
            </div>
        `).join('');
        
        list.querySelectorAll('button[data-type="ad"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const selector = e.target.dataset.value;
                this.removeAdSelector(selector);
            });
        });
    }

    escapeHtml(str) {
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    exportPatterns() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            patterns: this.patternManager.customPatterns
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `element-blocker-patterns-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async importPatterns() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (data.patterns) {
                    this.patternManager.customPatterns = data.patterns;
                    await this.patternManager.saveCustomPatterns();
                    await this.loadPatterns();
                    alert('Паттерны успешно импортированы!');
                } else {
                    alert('Неверный формат файла');
                }
            } catch (error) {
                alert('Ошибка импорта: ' + error.message);
            }
        };

        input.click();
    }

    closeTab() {
        if (typeof browser !== 'undefined' && browser.tabs) {
            browser.tabs.getCurrent().then(tab => {
                browser.tabs.remove(tab.id);
            }).catch(() => {
                window.close();
            });
        } else {
            window.close();
        }
    }
}

// Инициализация
let patternsUI;

document.addEventListener('DOMContentLoaded', function() {
    patternsUI = new PatternsUI();
});