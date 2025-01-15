let clipboardItems = [];
let isContextValid = true;

// Проверка валидности контекста расширения
function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// Загружаем сохраненные элементы при открытии popup
document.addEventListener('DOMContentLoaded', () => {
  if (!isExtensionContextValid()) {
    console.warn('Контекст расширения недействителен');
    isContextValid = false;
    return;
  }
  
  loadClipboardItems();
  setupEventListeners();
  initializeActivationState();
});

// Инициализация состояния переключателя
async function initializeActivationState() {
  try {
    const { isActive = true } = await chrome.storage.local.get('isActive');
    const toggle = document.getElementById('activationToggle');
    const statusText = document.getElementById('statusText');
    
    toggle.checked = isActive;
    updateStatusText(isActive);
    
    toggle.addEventListener('change', async (e) => {
      const isActive = e.target.checked;
      await chrome.storage.local.set({ isActive });
      updateStatusText(isActive);
    });
  } catch (error) {
    console.error('Ошибка при инициализации состояния активации:', error);
  }
}

function updateStatusText(isActive) {
  const statusText = document.getElementById('statusText');
  statusText.textContent = isActive ? 'Расширение активно' : 'Расширение отключено';
  statusText.className = `status-text ${isActive ? 'active' : 'inactive'}`;
}

function loadClipboardItems() {
  if (!isContextValid) return;

  try {
    chrome.storage.local.get(['clipboardHistory'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Ошибка при загрузке истории:', chrome.runtime.lastError);
        return;
      }
      clipboardItems = result.clipboardHistory || [];
      renderClipboardItems(clipboardItems);
    });
  } catch (error) {
    console.error('Ошибка при загрузке истории:', error);
  }
}

function setupEventListeners() {
  if (!isContextValid) return;

  // Функционал поиска
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchText = e.target.value.toLowerCase();
    const filteredItems = clipboardItems.filter(item => 
      item.text.toLowerCase().includes(searchText)
    );
    renderClipboardItems(filteredItems);
  });

  // Кнопка очистки
  document.getElementById('clearAll').addEventListener('click', () => {
    if (!isExtensionContextValid()) {
      console.warn('Контекст расширения недействителен');
      return;
    }

    try {
      clipboardItems = [];
      chrome.storage.local.set({ clipboardHistory: clipboardItems }, () => {
        if (chrome.runtime.lastError) {
          console.error('Ошибка при очистке истории:', chrome.runtime.lastError);
          return;
        }
        renderClipboardItems(clipboardItems);
      });
    } catch (error) {
      console.error('Ошибка при очистке истории:', error);
    }
  });

  // Слушаем изменения в хранилище
  chrome.storage.onChanged.addListener((changes) => {
    if (!isExtensionContextValid()) {
      console.warn('Контекст расширения недействителен');
      return;
    }

    if (changes.clipboardHistory) {
      clipboardItems = changes.clipboardHistory.newValue || [];
      renderClipboardItems(clipboardItems);
    }
  });
}

function showCopyNotification() {
  const notification = document.getElementById('copyNotification');
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}

function formatDate(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера';
  } else {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}

function groupItemsByDate(items) {
  const groups = {};
  
  items.forEach(item => {
    const date = new Date(item.timestamp);
    const dateKey = date.toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = {
        displayDate: formatDate(date),
        items: []
      };
    }
    groups[dateKey].items.push(item);
  });

  return groups;
}

function renderClipboardItems(items) {
  if (!isContextValid) {
    const listElement = document.getElementById('clipboardList');
    listElement.innerHTML = '<div class="error-message">Расширение было обновлено. Пожалуйста, перезагрузите страницу.</div>';
    return;
  }

  const listElement = document.getElementById('clipboardList');
  listElement.innerHTML = '';

  const groupedItems = groupItemsByDate(items);
  
  Object.entries(groupedItems)
    .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
    .forEach(([dateKey, group]) => {
      const dateGroup = document.createElement('div');
      dateGroup.className = 'date-group';
      
      const dateHeader = document.createElement('h2');
      dateHeader.className = 'date-header';
      dateHeader.textContent = group.displayDate;
      dateGroup.appendChild(dateHeader);

      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'items-container';

      group.items.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'clipboard-item';
        
        const textElement = document.createElement('div');
        textElement.className = 'clipboard-text';
        textElement.textContent = item.text.length > 50 
          ? item.text.substring(0, 50) + '...' 
          : item.text;
        
        const timeElement = document.createElement('div');
        timeElement.className = 'time-text';
        const itemDate = new Date(item.timestamp);
        timeElement.textContent = itemDate.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.innerHTML = '<span class="material-icons">close</span>';
        deleteButton.onclick = (e) => {
          try {
            e.stopPropagation();
            if (!isExtensionContextValid()) {
              console.warn('Контекст расширения недействителен');
              return;
            }
            clipboardItems = clipboardItems.filter(i => i.timestamp !== item.timestamp);
            chrome.storage.local.set({ clipboardHistory: clipboardItems }, () => {
              if (chrome.runtime.lastError) {
                console.error('Ошибка при удалении элемента:', chrome.runtime.lastError);
                return;
              }
              renderClipboardItems(clipboardItems);
            });
          } catch (error) {
            console.error('Ошибка при удалении элемента:', error);
          }
        };

        itemElement.onclick = async () => {
          try {
            if (!isExtensionContextValid()) {
              console.warn('Контекст расширения недействителен');
              return;
            }
            await navigator.clipboard.writeText(item.text);
            showCopyNotification();
          } catch (error) {
            console.error('Ошибка при копировании в буфер обмена:', error);
          }
        };

        const itemContent = document.createElement('div');
        itemContent.className = 'item-content';
        itemContent.appendChild(textElement);
        itemContent.appendChild(timeElement);

        itemElement.appendChild(itemContent);
        itemElement.appendChild(deleteButton);
        itemsContainer.appendChild(itemElement);
      });

      dateGroup.appendChild(itemsContainer);
      listElement.appendChild(dateGroup);
    });
}

  // Handle star rating
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      const rating = star.dataset.rating;
      const extensionId = chrome.runtime.id;
      const chromeStoreUrl = `https://chrome.google.com/webstore/detail/${extensionId}`;
      chrome.tabs.create({ url: chromeStoreUrl });
    });
  });