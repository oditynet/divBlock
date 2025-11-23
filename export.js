async function exportBlockedElements() {
    const result = await browser.storage.local.get();
    const blockedElements = [];
    const seenSelectors = new Set();

    Object.values(result).forEach(item => {
        if (item && item.selector && !seenSelectors.has(item.selector)) {
            seenSelectors.add(item.selector);
            
            // Сохраняем ВСЕ данные без обрезки
            blockedElements.push({
                url: item.url,
                selector: item.selector,
                method: item.method,
                timestamp: item.timestamp,
                addedDate: item.addedDate,
                originalHTML: item.originalHTML, // ПОЛНЫЙ HTML
                pageUrl: item.pageUrl
            });
        }
    });

    const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        totalCount: blockedElements.length,
        blockedElements: blockedElements
    };

    return exportData;
}

function downloadExport(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `element-blocker-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}