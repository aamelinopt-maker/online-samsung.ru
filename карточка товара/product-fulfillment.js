/* City selection shared by the receiving row and page header. */
(() => {
  'use strict';
  const page = document.querySelector('.good-page--client-layout');
  if (!page) return;
  const ui = () => window.samsungOffline;
  const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const cityKey = city => city.trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/[.\s-]+/g, ' ');
  const storeCities = [...page.querySelectorAll('.shop-item[data-city-name]')].map(store => store.dataset.cityName);
  const suggestions = [...new Set(['Москва', 'Санкт-Петербург', 'Московская область', 'Ленинградская область', ...storeCities])];
  const normalizeCity = text => {
    const key = cityKey(text);
    if (['спб', 'питер', 'санкт петербург'].includes(key)) return 'Санкт-Петербург';
    if (['мск', 'г москва'].includes(key)) return 'Москва';
    return suggestions.find(city => cityKey(city) === key) || text.trim();
  };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('samsung-offline:fulfillment')) || {}; } catch {}
  const state = {city: typeof saved.city === 'string' ? normalizeCity(saved.city) : 'Москва'};
  function render() {
    const cityButton = page.querySelector('[data-fulfillment-city]');
    if (cityButton) {
      cityButton.innerHTML = escape(state.city) + ' <i class="client-icon" aria-hidden="true">&#xf078;</i>';
      cityButton.setAttribute('aria-haspopup', 'dialog');
      cityButton.setAttribute('aria-label', 'Город получения: ' + state.city + '. Изменить город');
    }
    document.querySelectorAll('[data-home-chrome] [data-city]').forEach(city => { city.textContent = state.city; });
  }
  function chooseCity() {
    const dialog = ui().show('Город получения', `<form class="client-city-form"><label for="client-receiving-city">Ваш город</label><input id="client-receiving-city" name="city" list="client-receiving-cities" autocomplete="address-level2" required minlength="2" maxlength="80" value="${escape(state.city)}"><datalist id="client-receiving-cities">${suggestions.map(city => `<option value="${escape(city)}"></option>`).join('')}</datalist><p>Выберите город получения.</p><button class="btn btn--dark" type="submit">Выбрать город</button></form>`, 'client-installment-dialog client-fulfillment-dialog client-receiving-dialog');
    dialog.setAttribute('aria-label', 'Город получения');
    dialog.addEventListener('close', () => dialog.removeAttribute('aria-label'), {once:true});
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const input = dialog.querySelector('input');
      const value = input.value.trim();
      if (value.length < 2) { input.setCustomValidity('Введите название города.'); input.reportValidity(); return; }
      state.city = normalizeCity(value);
      try { localStorage.setItem('samsung-offline:fulfillment', JSON.stringify({city: state.city})); } catch {}
      render();
      dialog.close();
    };
    dialog.querySelector('input').addEventListener('input', event => event.target.setCustomValidity(''));
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-fulfillment-city]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    chooseCity();
  }, true);
  window.samsungFulfillment = {chooseCity};
  render();
})();
