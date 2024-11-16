let currentLanguage = 'en'; // Язык по умолчанию

// Получение текущего языка из URL
function getLanguageFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('lang') || 'en';
}

// Установка языка и обновление отображения
function setLanguage(lang) {
  currentLanguage = lang;

  // Обновление URL с параметром `lang`
  const params = new URLSearchParams(window.location.search);
  params.set('lang', lang);
  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

  // Обновление стиля кнопок выбора языка
  document.querySelectorAll('.language-select a').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      // btn.style.backgroundColor = 'transparent';
      btn.style.color = 'inherit';
      btn.style.opacity = '0.6'; // Слабее выделение
    } else {
      btn.style.backgroundColor = '';
      btn.style.color = '#ffffff';
      btn.style.opacity = '1';
    }
  });

  // Изменение фона страницы в зависимости от языка
  document.body.style.color = lang === 'en' ? '#eef' : '#fee';

  // Загрузка файлов для выбранного языка
  fetchYAMLFiles();
}

// Загрузка YAML файлов для выбранного языка
async function fetchYAMLFiles() {
  const folder = currentLanguage === 'en' ? 'data_en' : 'data_ru';
  const files = [
    `${folder}/About.yaml`,
    `${folder}/Contacts.yaml`,
    `${folder}/Websites.yaml`,
    `${folder}/Pricing.yaml`
  ];

  const dataPromises = files.map(async (file) => {
    const response = await fetch(file);
    if (!response.ok) {
      console.error(`Не удалось загрузить ${file}: ${response.statusText}`);
      return null;
    }
    const yamlText = await response.text();
    return jsyaml.load(yamlText);
  });

  let data = (await Promise.all(dataPromises)).filter(item => item !== null);
  data.sort((a, b) => a.order - b.order);

  // Обновление контента
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
  if (!Array.isArray(item.items)) {
    console.warn("Отсутствует или неверный формат items в item:", item);
    return '';
  }

  const pricingItems = item.items.map(pricing => {
    const priceContent =
      typeof pricing.price === 'string'
        ? `<div class="pricing-modifier">${pricing.price}</div>`
        : `<div class="pricing-price-container">
             <div class="pricing-price">$${pricing.price}</div>
             <div class="pricing-price">€${(pricing.price * exchangeRates.EUR).toFixed(2)}</div>
             <div class="pricing-price">₽${Math.ceil(pricing.price * exchangeRates.RUB)}</div>
           </div>`;

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

function initLanguageSelector() {
  document.querySelectorAll('.language-select a').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lang = e.target.getAttribute('data-lang'); // Берем язык из data-lang
      setLanguage(lang);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  currentLanguage = getLanguageFromURL();
  await fetchExchangeRates();
  setLanguage(currentLanguage);
  initLanguageSelector();
});
