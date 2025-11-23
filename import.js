// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    initializeImport();
});

function initializeImport() {
    const fileInput = document.getElementById('fileInput');
    const fileDropArea = document.getElementById('fileDropArea');
    const importBtn = document.getElementById('importBtn');
    const closeButton = document.getElementById('closeButton');
    
    // Обработчики для drag & drop
    fileDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropArea.style.borderColor = '#2196F3';
        fileDropArea.style.background = '#f0f7ff';
    });
    
    fileDropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileDropArea.style.borderColor = '#ddd';
        fileDropArea.style.background = 'white';
    });
    
    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropArea.style.borderColor = '#ddd';
        fileDropArea.style.background = 'white';
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });
    
    // Обработчик клика по области
    fileDropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Обработчик выбора файла
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
    
    // Обработчик кнопки импорта
    importBtn.addEventListener('click', startImport);
    
    // Обработчик закрытия
    closeButton.addEventListener('click', closeTab);
}

let selectedFile = null;

function handleFileSelection(file) {
    if (!file || !file.name.endsWith('.json')) {
        showStatus('Пожалуйста, выберите JSON файл', 'error');
        return;
    }
    
    selectedFile = file;
    
    // Показываем информацию о файле
    const fileInfo = document.getElementById('fileInfo');
    fileInfo.innerHTML = `
        <strong>Выбран файл:</strong> ${file.name}<br>
        <strong>Размер:</strong> ${(file.size / 1024).toFixed(2)} KB<br>
        <strong>Тип:</strong> ${file.type || 'application/json'}
    `;
    fileInfo.style.display = 'block';
    
    // Показываем кнопку импорта
    document.getElementById('importBtn').style.display = 'inline-block';
    
    showStatus('Файл успешно выбран. Нажмите "Начать импорт" для продолжения.', 'info');
}

async function startImport() {
    if (!selectedFile) {
        showStatus('Сначала выберите файл', 'error');
        return;
    }
    
    try {
        showStatus('Чтение файла...', 'info');
        
        const text = await selectedFile.text();
        const importData = JSON.parse(text);
        
        // Проверяем формат файла
        if (!importData.blockedElements || !Array.isArray(importData.blockedElements)) {
            throw new Error('Неверный формат файла. Ожидается массив blockedElements.');
        }
        
        showStatus('Проверка данных...', 'info');
        
        // Получаем существующие блокировки
        const existingData = await browser.storage.local.get({blockedElements: []});
        const existingElements = existingData.blockedElements;
        
        // Создаем Set для быстрой проверки дубликатов
        const existingSelectors = new Set();
        existingElements.forEach(item => {
            if (item.selector && item.url) {
                existingSelectors.add(item.selector + '|' + item.url);
            }
        });
        
        let importedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        showStatus('Импорт блокировок...', 'info');
        
        // Импортируем элементы
        for (const element of importData.blockedElements) {
            try {
                if (!element.selector || !element.url) {
                    errorCount++;
                    continue;
                }
                
                const uniqueKey = element.selector + '|' + element.url;
                
                if (existingSelectors.has(uniqueKey)) {
                    skippedCount++;
                    continue;
                }
                
                // Добавляем элемент
                existingElements.push({
                    url: element.url,
                    selector: element.selector,
                    method: element.method || 'hidden',
                    timestamp: element.timestamp || Date.now(),
                    originalHTML: element.originalHTML || '',
                    pageUrl: element.pageUrl || ''
                });
                
                existingSelectors.add(uniqueKey);
                importedCount++;
                
            } catch (error) {
                console.error('Error importing element:', error, element);
                errorCount++;
            }
        }
        
        // Сохраняем обновленный список
        await browser.storage.local.set({blockedElements: existingElements});
        
        // Показываем статистику
        const stats = document.getElementById('stats');
        stats.innerHTML = `
            <strong>Результаты импорта:</strong><br>
            ✅ Успешно импортировано: <strong>${importedCount}</strong><br>
            ⏭️ Пропущено дублей: <strong>${skippedCount}</strong><br>
            ❌ Ошибок: <strong>${errorCount}</strong><br>
            📊 Всего в базе: <strong>${existingElements.length}</strong>
        `;
        stats.style.display = 'block';
        
        if (importedCount > 0) {
            showStatus(`✅ Импорт успешно завершен! Импортировано ${importedCount} блокировок.`, 'success');
            
            // Обновляем badge и интерфейс в других частях расширения
            try {
                browser.runtime.sendMessage({action: "importCompleted"});
            } catch (e) {
                // Игнорируем ошибки, если popup закрыт
            }
        } else {
            showStatus('ℹ️ Не импортировано новых блокировок (все элементы уже существуют или файл пуст).', 'info');
        }
        
    } catch (error) {
        console.error('Import error:', error);
        showStatus('❌ Ошибка импорта: ' + error.message, 'error');
    }
}

function closeTab() {
    browser.tabs.getCurrent().then(tab => {
        browser.tabs.remove(tab.id);
    });
}

function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = message;
    statusEl.className = `status ${type}`;
}