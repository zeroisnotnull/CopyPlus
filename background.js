// Проверка валидности контекста расширения
function isExtensionContextValid() {
    try {
      return chrome.runtime && chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }
  
  // Инициализация состояния активации при установке
  chrome.runtime.onInstalled.addListener(() => {
    if (isExtensionContextValid()) {
      chrome.storage.local.set({ isActive: true });
      console.log('История Буфера Обмена Pro установлена');
    }
  });
  
  // Обработка сообщений от контент-скрипта
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (!isExtensionContextValid()) {
      console.warn('Контекст расширения недействителен');
      return;
    }
  
    if (message.type === 'NEW_COPY') {
      const { isActive } = await chrome.storage.local.get('isActive');
      if (isActive) {
        saveToClipboardHistory(message.text)
          .catch(error => console.error('Ошибка при сохранении в историю:', error));
      }
    } else if (message.type === 'GET_STATE') {
      const { isActive } = await chrome.storage.local.get('isActive');
      sendResponse({ isActive });
    }
    return true;
  });
  
  // Функция для сохранения текста в историю буфера обмена
  async function saveToClipboardHistory(text) {
    try {
      if (!isExtensionContextValid()) {
        throw new Error('Контекст расширения недействителен');
      }
  
      // Получаем существующие элементы
      const { clipboardHistory = [] } = await chrome.storage.local.get('clipboardHistory');
      
      // Удаляем дубликат, если существует
      const filteredItems = clipboardHistory.filter(item => item.text !== text);
      
      // Добавляем новый элемент в начало
      const newItems = [{
        text,
        timestamp: new Date().toISOString()
      }, ...filteredItems];
      
      // Оставляем только последние 50 элементов
      const trimmedItems = newItems.slice(0, 50);
      
      // Сохраняем в хранилище
      await chrome.storage.local.set({ clipboardHistory: trimmedItems });
    } catch (err) {
      console.error('Не удалось сохранить в историю буфера обмена:', err);
      throw err;
    }
  }