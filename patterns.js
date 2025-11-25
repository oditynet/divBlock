// patterns.js - Динамические списки для обнаружения рекламы и аналитики

class PatternManager {
    constructor() {
        this.defaultPatterns = {
            adDomains: [
                'doubleclick.net',
                'googleadservices.com',
                'googlesyndication.com',
                'google-analytics.com',
                'yandex.ru/adsystem',
                'adsystem.yandex.ru',
                'an.yandex.ru',
                'mc.yandex.ru',
                'ads.youtube.com',
                'securepubads.g.doubleclick.net',
                'pagead2.googlesyndication.com',
                'adservice.google.com',
                'ad.doubleclick.net',
                'ads.facebook.com',
                'analytics.facebook.com',
                'connect.facebook.net',
                'www.google.com/ads',
                'pubads.g.doubleclick.net',
                'stats.g.doubleclick.net',
                'cm.g.doubleclick.net',
                'partner.googleadservices.com',
                'tpc.googlesyndication.com',
                'adclick.g.doubleclick.net',
                'www.googletagservices.com',
                'googletagservices.com',
                'www.google.com/pagead',
                'pagead.l.doubleclick.net',
                'ads.yahoo.com',
                'analytics.yahoo.com',
                'bing.com/ads',
                'ads.bing.com',
                'adserver.adtechus.com',
                'ad.directrev.com',
                'ads.twitch.tv',
                'telemetry.twitch.tv',
                'tracking.epicgames.com',
                'analytics.steamgames.com'
            ],

            analyticsElements: [
                '[class*="analytics"]',
                '[class*="metric"]',
                '[class*="track"]',
                '[class*="beacon"]',
                '[class*="telemetry"]',
                '[class*="statistic"]',
                '[class*="measure"]',
                '[id*="analytics"]',
                '[id*="metric"]',
                '[id*="track"]',
                '[id*="beacon"]',
                '[id*="telemetry"]',
                '[id*="statistic"]',
                '[id*="measure"]',
                'script[src*="analytics"]',
                'script[src*="metric"]',
                'script[src*="track"]',
                'script[src*="beacon"]',
                'img[src*="pixel"]',
                'img[src*="track"]',
                'img[src*="beacon"]',
                'iframe[src*="analytics"]',
                'iframe[src*="track"]',
                'div[style*="1x1"]',
                'div[style*="1px"]',
                'img[width="1"][height="1"]',
                'div[width="1"][height="1"]',
                '[data-analytics]',
                '[data-tracking]',
                '[data-metric]',
                '[data-telemetry]'
            ],

            adSelectors: [
                'iframe[src*="ads"]',
                'iframe[src*="ad."]',
                'iframe[src*="banner"]',
                'iframe[src*="pub"]',
                'ins.adsbygoogle',
                'div[id*="ad-"]',
                'div[class*="ad-"]',
                'div[id*="_ad"]',
                'div[class*="_ad"]',
                'div[id*="-ad"]',
                'div[class*="-ad"]',
                'div[data-ad]',
                'div[data-ad-unit]',
                'div[data-ad-client]',
                'div[data-ad-slot]',
                'div[data-ad-position]',
                'script[src*="ads"]',
                'script[src*="ad."]'
            ]
        };

        this.init();
    }

    async init() {
        await this.loadCustomPatterns();
    }

    async loadCustomPatterns() {
        try {
            const result = await browser.storage.local.get({
                customAdDomains: [],
                customAnalyticsElements: [],
                customAdSelectors: []
            });

            this.customPatterns = result;
        } catch (error) {
            console.error('Error loading custom patterns:', error);
            this.customPatterns = {
                customAdDomains: [],
                customAnalyticsElements: [],
                customAdSelectors: []
            };
        }
    }

    async saveCustomPatterns() {
        try {
            await browser.storage.local.set(this.customPatterns);
        } catch (error) {
            console.error('Error saving custom patterns:', error);
        }
    }

    // Получить все домены для проверки
    getAllAdDomains() {
        return [...this.defaultPatterns.adDomains, ...this.customPatterns.customAdDomains];
    }

    // Получить все селекторы аналитики
    getAllAnalyticsSelectors() {
        return [...this.defaultPatterns.analyticsElements, ...this.customPatterns.customAnalyticsElements];
    }

    // Получить все рекламные селекторы
    getAllAdSelectors() {
        return [...this.defaultPatterns.adSelectors, ...this.customPatterns.customAdSelectors];
    }

    // Добавить кастомный домен
    async addCustomAdDomain(domain) {
        if (!this.customPatterns.customAdDomains.includes(domain)) {
            this.customPatterns.customAdDomains.push(domain);
            await this.saveCustomPatterns();
        }
    }

    // Добавить кастомный селектор аналитики
    async addCustomAnalyticsSelector(selector) {
        if (!this.customPatterns.customAnalyticsElements.includes(selector)) {
            this.customPatterns.customAnalyticsElements.push(selector);
            await this.saveCustomPatterns();
        }
    }

    // Добавить кастомный рекламный селектор
    async addCustomAdSelector(selector) {
        if (!this.customPatterns.customAdSelectors.includes(selector)) {
            this.customPatterns.customAdSelectors.push(selector);
            await this.saveCustomPatterns();
        }
    }

    // Удалить кастомный домен
    async removeCustomAdDomain(domain) {
        this.customPatterns.customAdDomains = this.customPatterns.customAdDomains.filter(d => d !== domain);
        await this.saveCustomPatterns();
    }

    // Удалить кастомный селектор
    async removeCustomAnalyticsSelector(selector) {
        this.customPatterns.customAnalyticsElements = this.customPatterns.customAnalyticsElements.filter(s => s !== selector);
        await this.saveCustomPatterns();
    }

    // Удалить кастомный рекламный селектор
    async removeCustomAdSelector(selector) {
        this.customPatterns.customAdSelectors = this.customPatterns.customAdSelectors.filter(s => s !== selector);
        await this.saveCustomPatterns();
    }

    // Проверить URL на рекламный домен
    isAdDomain(url) {
        try {
            const urlObj = new URL(url);
            const allDomains = this.getAllAdDomains();
            
            return allDomains.some(domain => {
                return urlObj.hostname.includes(domain) || 
                       urlObj.hostname.endsWith(domain) ||
                       urlObj.href.includes(domain);
            });
        } catch (error) {
            // Если URL невалидный, проверяем как строку
            const allDomains = this.getAllAdDomains();
            return allDomains.some(domain => url.includes(domain));
        }
    }

    // Получить все паттерны для анализа
    getAllPatterns() {
        return {
            adDomains: this.getAllAdDomains(),
            analyticsSelectors: this.getAllAnalyticsSelectors(),
            adSelectors: this.getAllAdSelectors()
        };
    }
}

// Создаем глобальный экземпляр
window.patternManager = new PatternManager();
