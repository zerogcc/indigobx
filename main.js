async function fetchYAMLFiles() {
  // Список файлов для загрузки
  const files = [
    'data/About.yaml',
    'data/Contacts.yaml',
    'data/Websites.yaml',
    'data/Pricing.yaml'
  ];
  
  // Загружаем каждый файл YAML с помощью fetch и преобразуем его в объект
  const dataPromises = files.map(async (file) => {
    const response = await fetch(file);
    
    if (!response.ok) {
      console.error(`Не удалось загрузить ${file}: ${response.statusText}`);
      return null;
    }

    const yamlText = await response.text();
    const yamlData = jsyaml.load(yamlText);
    
    // Извлекаем порядок из названия файла (числа до первого подчеркивания)
    // yamlData.order = parseInt(file.match(/\d+/)[0]);
    return yamlData;
  });

  // Ждем загрузки всех файлов и отфильтровываем любые неудачные загрузки
  let data = (await Promise.all(dataPromises)).filter(item => item !== null);
  
  // Сортируем данные по порядку
  data.sort((a, b) => a.order - b.order);

  // Отображаем данные на странице
  displayData(data);
}


let exchangeRates = {}; // Переменная для хранения курсов валют

// Функция для загрузки курсов валют с https://www.cbr-xml-daily.ru/daily_json.js
async function fetchExchangeRates() {
  try {
    const response = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
    const data = await response.json();
    exchangeRates = {
      USD: 1, // Базовая валюта — доллар
      EUR: data.Valute.EUR.Value / data.Valute.USD.Value, // Курс евро к доллару
      RUB: data.Valute.USD.Value // Курс доллара к рублю
    };
  } catch (error) {
    console.error("Ошибка загрузки курсов валют:", error);
  }
}


function displayData(data) {
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = data.map(item => renderCard(item)).join('');
}

function renderCard(item) {
  switch (item.type) {
    case 'text':
      return renderTextCard(item);
    case 'links':
      return renderLinksCard(item);
    case 'pricing':
      return renderPricingCard(item);
    default:
      console.warn(`Неизвестный тип карточки: ${item.type}`);
      return '';
  }
}

function renderTextCard(item) {
  return `
    <div class="card">
      <div class="card-content">
        <span class="card-title">
          <i class="${item.icon}" style="color: ${item['icon-color']}"></i> ${item.header}
        </span>
        <div class="card-text">${item.content}</div>
      </div>
    </div>
  `;
}

function renderLinksCard(item) {
  const linksHTML = item.links.map(link => {
    if (link.image) {
      return `<a href="${link.url}" target="_blank" class="link-item">
                <img src="${link.image}" alt="${link.name}" class="link-icon">
                <span>${link.name}</span>
              </a>`;
    } else if (link.icon) {
      return `<a href="${link.url}" target="_blank" class="link-item">
                <i class="${link.icon} link-icon" style="color: ${link['icon-color'] || 'inherit'};"></i>
                <span>${link.name}</span>
              </a>`;
    } else {
      return `<a href="${link.url}" target="_blank" class="link-item">
                <span>${link.name}</span>
              </a>`;
    }
  }).join('');

  return `
    <div class="card">
      <div class="card-content">
        <span class="card-title">
          ${item.icon ? `<i class="${item.icon}" style="color: ${item['icon-color']}"></i>` : ''}
          ${item.header}
        </span>
        <div class="links-container">${linksHTML}</div>
      </div>
    </div>
  `;
}

function renderPricingCard(item) {
  // Проверка, что item.items существует и является массивом
  if (!Array.isArray(item.items)) {
    console.warn("Отсутствует или неверный формат items в item:", item);
    return '';
  }

  // Генерация элементов прайсинга
  const pricingItems = item.items.map(pricing => {
    // Проверяем, является ли цена модификатором
    const priceContent =
      typeof pricing.price === 'string'
        ? `<div class="pricing-modifier">${pricing.price}</div>`
        : `<div class="pricing-price-container">
             <div class="pricing-price usd">$${pricing.price}</div>
             <div class="pricing-price eur">€${(pricing.price * exchangeRates.EUR).toFixed(2)}</div>
             <div class="pricing-price rub">₽${Math.ceil(pricing.price * exchangeRates.RUB)}</div>
           </div>`;

    // Обработка ссылок с иконками
    const links = [];
    if (pricing.example_url) {
      links.push(`
        <a href="${pricing.example_url}" target="_blank" class="link-item">
          ${pricing.example_icon ? `<i class="${pricing.example_icon} link-icon"></i>` : ''}
          <span>Example</span>
        </a>
      `);
    }
    if (pricing.finished_url) {
      links.push(`
        <a href="${pricing.finished_url}" target="_blank" class="link-item">
          ${pricing.finished_icon ? `<i class="${pricing.finished_icon} link-icon"></i>` : ''}
          <span>Finished</span>
        </a>
      `);
    }
    const linksContent = links.length > 0 ? `<div class="pricing-links">${links.join('')}</div>` : '';

    return `
      <div class="pricing-item">
        <div class="pricing-title">${pricing.name}</div>
        <div class="pricing-content">
          <div class="pricing-description">${pricing.description}</div>
          ${linksContent}
        </div>
        ${priceContent}
      </div>
    `;
  }).join('');

  // Генерация карточки с заголовком и текстами top/bottom
  return `
    <div class="card">
      <div class="card-content">
        <span class="card-title">
          ${item.icon ? `<i class="${item.icon}" style="color: ${item['icon-color']}"></i>` : ''}
          ${item.header}
        </span>
        <div class="pricing-top">${item.top || ''}</div>
        <div class="pricing-container">${pricingItems}</div>
        <div class="pricing-bottom">${item.bottom || ''}</div>
      </div>
    </div>
  `;
}



// Вызов загрузки данных и курсов валют при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  await fetchExchangeRates();
  fetchYAMLFiles();
});

