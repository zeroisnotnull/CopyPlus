// Проверка валидности контекста расширения
function isExtensionContextValid() {
    try {
      return chrome.runtime && chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }
  
  // Слушаем события копирования
  document.addEventListener('copy', async (e) => {
    try {
      if (!isExtensionContextValid()) {
        console.warn('Контекст расширения недействителен');
        return;
      }
  
      const selectedText = window.getSelection().toString();
      if (selectedText) {
        // Отправляем скопированный текст в фоновый скрипт
        await chrome.runtime.sendMessage({ 
          type: 'NEW_COPY', 
          text: selectedText 
        }).catch(error => {
          if (error.message.includes('Extension context invalidated')) {
            console.warn('Контекст расширения был сброшен');
          } else {
            console.error('Ошибка при отправке сообщения:', error);
          }
        });
      }
    } catch (error) {
      console.error('Ошибка при обработке копирования:', error);
    }
  });