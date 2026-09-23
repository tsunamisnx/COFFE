/* ============================================================
   ЗЕРНО — интернет-магазин кофе (демо)
   Ванильный JS без зависимостей:
   рендер каталога из массива, фильтры + сортировка,
   корзина в localStorage, drawer в 3 шага, маска телефона,
   валидация форм, тост-уведомления
   ============================================================ */

'use strict';

document.documentElement.classList.remove('no-js');

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const RUB = (n) => n.toLocaleString('ru-RU') + ' ₽';
const ROAST_LABEL = { light: 'Светлая', mid: 'Средняя', dark: 'Тёмная' };
const CART_KEY = 'zerno-cart';

/* ---------- 1. Каталог: данные товаров ---------- */
const PRODUCTS = [
  { id: 'ethiopia', name: 'Эфиопия Иргачеффе', notes: 'жасмин, бергамот, персик', cat: 'mono', roast: 'light', price: 890, badge: 'Хит', img: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=700&q=80' },
  { id: 'colombia', name: 'Колумбия Супремо', notes: 'карамель, грецкий орех, тёмный шоколад', cat: 'mono', roast: 'mid', price: 790, img: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=700&q=80' },
  { id: 'brazil', name: 'Бразилия Сантос', notes: 'какао, фундук, мускатный орех', cat: 'mono', roast: 'dark', price: 690, img: 'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?auto=format&fit=crop&w=700&q=80' },
  { id: 'kenya', name: 'Кения Топ Масаи АА', notes: 'чёрная смородина, грейпфрут, трость', cat: 'mono', roast: 'light', price: 990, badge: 'Новинка', img: 'https://images.unsplash.com/photo-1445077100181-a33e9ac94db0?auto=format&fit=crop&w=700&q=80' },
  { id: 'milano', name: 'Бленд «Утро в Милане»', notes: 'молочный шоколад, сухофрукты, апельсин', cat: 'blend', roast: 'mid', price: 590, img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80' },
  { id: 'napoli', name: 'Бленд «Неаполь»', notes: 'дым, горький шоколад, чёрный перец', cat: 'blend', roast: 'dark', price: 640, img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=700&q=80' },
  { id: 'home', name: 'Бленд «Домашний»', notes: 'печенье, яблочный пирог, мёд', cat: 'blend', roast: 'mid', price: 540, badge: 'Хит', img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=700&q=80' },
  { id: 'decaf', name: 'Декаф «Тихий вечер»', notes: 'пралине, вишня, сахарный тростник', cat: 'decaf', roast: 'mid', price: 740, badge: 'Без кофеина', img: 'https://images.unsplash.com/photo-1495774856032-8b90bbb32b32?auto=format&fit=crop&w=700&q=80' },
];

const grid = $('#products-grid');
const catalogEmpty = $('#catalog-empty');
let activeFilter = 'all';
let activeSort = 'pop';

const renderCatalog = () => {
  let list = [...PRODUCTS];

  if (activeFilter !== 'all') list = list.filter((p) => p.cat === activeFilter);
  if (activeSort === 'asc') list.sort((a, b) => a.price - b.price);
  if (activeSort === 'desc') list.sort((a, b) => b.price - a.price);

  catalogEmpty.hidden = list.length > 0;

  grid.innerHTML = list
    .map((p, i) => `
      <article class="product-card" style="animation-delay: ${i * 60}ms">
        <div class="product-card__photo">
          ${p.badge ? `<span class="product-card__badge">${p.badge}</span>` : ''}
          <span class="product-card__roast">${ROAST_LABEL[p.roast]} обжарка</span>
          <img src="${p.img}" alt="Кофе ${p.name}" loading="lazy">
        </div>
        <div class="product-card__body">
          <h3 class="product-card__name">${p.name}</h3>
          <p class="product-card__notes">${p.notes}</p>
          <div class="product-card__footer">
            <span class="product-card__price">${RUB(p.price)}<s>250 г</s></span>
            <button class="product-card__add" data-add="${p.id}" aria-label="Добавить «${p.name}» в корзину">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              В корзину
            </button>
          </div>
        </div>
      </article>
    `)
    .join('');
};

grid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add]');
  if (!btn) return;
  addToCart(btn.dataset.add);
});

$$('.catalog__filters .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    $$('.catalog__filters .chip').forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    activeFilter = chip.dataset.filter;
    renderCatalog();
  });
});

$('#sort-select').addEventListener('change', (e) => {
  activeSort = e.target.value;
  renderCatalog();
});

/* ---------- 2. Корзина: состояние + localStorage ---------- */
// формат: { [id]: количество }
let cart = {};
try {
  cart = JSON.parse(localStorage.getItem(CART_KEY)) || {};
} catch {
  cart = {};
}
cart = Object.fromEntries(
  Object.entries(cart).filter(([id, qty]) => PRODUCTS.some((p) => p.id === id) && qty > 0)
);

const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const cartCount = () => Object.values(cart).reduce((sum, qty) => sum + qty, 0);
const cartSum = () =>
  Object.entries(cart).reduce((sum, [id, qty]) => sum + PRODUCTS.find((p) => p.id === id).price * qty, 0);

const badge = $('#cart-badge');

const updateBadge = () => {
  const count = cartCount();
  badge.hidden = count === 0;
  badge.textContent = count;
  badge.classList.remove('bump');
  if (count > 0) {
    // перезапуск CSS-анимации
    void badge.offsetWidth;
    badge.classList.add('bump');
  }
};

/* ---------- 3. Drawer корзины: 3 шага ---------- */
const cartEl = $('#cart');
const stepList = $('#cart-step-list');
const stepForm = $('#cart-step-form');
const stepSuccess = $('#cart-step-success');

const showStep = (name) => {
  stepList.hidden = name !== 'list';
  stepForm.hidden = name !== 'form';
  stepSuccess.hidden = name !== 'success';
};

const openCart = () => {
  showStep('list');
  renderCart();
  cartEl.classList.add('is-open');
  cartEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
};

const closeCart = () => {
  cartEl.classList.remove('is-open');
  cartEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
};

$('#cart-open').addEventListener('click', openCart);
$$('[data-close-cart]').forEach((el) => el.addEventListener('click', closeCart));
$('#cart-success-done').addEventListener('click', closeCart);

/* ---------- 4. Рендер корзины ---------- */
const cartItemsBox = $('#cart-items');
const cartEmptyBox = $('#cart-empty');
const cartFoot = $('#cart-foot');
const cartTotalEl = $('#cart-total');
const orderTotalEl = $('#order-total');

const updateTotals = () => {
  const sum = cartSum();
  cartTotalEl.textContent = RUB(sum);
  orderTotalEl.textContent = RUB(sum);
};

const renderCart = () => {
  const entries = Object.entries(cart);

  cartEmptyBox.hidden = entries.length > 0;
  cartFoot.hidden = entries.length === 0;
  updateTotals();

  cartItemsBox.innerHTML = entries
    .map(([id, qty]) => {
      const p = PRODUCTS.find((item) => item.id === id);
      return `
        <div class="cart-item">
          <img class="cart-item__img" src="${p.img}" alt="${p.name}">
          <div class="cart-item__info">
            <p class="cart-item__name">${p.name}</p>
            <p class="cart-item__weight">250 г · ${ROAST_LABEL[p.roast]} обжарка</p>
            <div class="cart-item__qty">
              <button data-qty="-1" data-id="${id}" aria-label="Убавить количество">−</button>
              <span>${qty}</span>
              <button data-qty="1" data-id="${id}" aria-label="Прибавить количество">+</button>
            </div>
          </div>
          <div class="cart-item__side">
            <span class="cart-item__price">${RUB(p.price * qty)}</span>
            <button class="cart-item__remove" data-remove="${id}">убрать</button>
          </div>
        </div>
      `;
    })
    .join('');
};

cartItemsBox.addEventListener('click', (e) => {
  const qtyBtn = e.target.closest('[data-qty]');
  const removeBtn = e.target.closest('[data-remove]');

  if (qtyBtn) {
    const { id, qty } = qtyBtn.dataset;
    const next = (cart[id] || 0) + Number(qty);
    if (next <= 0) delete cart[id];
    else cart[id] = next;
    saveCart();
    renderCart();
    updateBadge();
  }

  if (removeBtn) {
    delete cart[removeBtn.dataset.remove];
    saveCart();
    renderCart();
    updateBadge();
  }
});

/* ---------- 5. Добавление в корзину ---------- */
const addToCart = (id) => {
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  updateBadge();
  const product = PRODUCTS.find((p) => p.id === id);
  toast(`«${product.name}» — в корзине ☕`);
};

/* ---------- 6. Оформление заказа ---------- */
const orderForm = $('#order-form');
const addressField = $('#address-field');
const phoneInput = $('#o-phone');

$('#cart-checkout').addEventListener('click', () => {
  if (cartCount() === 0) return;
  showStep('form');
});

$('#cart-back').addEventListener('click', () => showStep('list'));

// самовывоз — адрес не нужен
orderForm.addEventListener('change', (e) => {
  if (e.target.name !== 'delivery') return;
  addressField.hidden = e.target.value === 'pickup';
  if (addressField.hidden) setError('address', '');
});

// маска телефона +7 (999) 123-45-67
phoneInput.addEventListener('input', () => {
  let digits = phoneInput.value.replace(/\D/g, '');
  if (digits.length === 0) {
    phoneInput.value = '';
    return;
  }
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);

  let result = '+7';
  if (digits.length > 1) result += ' (' + digits.slice(1, 4);
  if (digits.length >= 5) result += ') ' + digits.slice(4, 7);
  if (digits.length >= 8) result += '-' + digits.slice(7, 9);
  if (digits.length >= 10) result += '-' + digits.slice(9, 11);

  phoneInput.value = result;
});

const validators = {
  name: (v) => v.trim().length >= 2 || 'Введи имя — минимум 2 буквы',
  phone: (v) => v.replace(/\D/g, '').length === 11 || 'Введи номер полностью',
  address: (v) => v.trim().length >= 5 || 'Введи адрес — улица и дом',
};

const setError = (fieldName, message) => {
  const input = orderForm.elements[fieldName];
  const errorEl = $(`[data-error-for="${fieldName}"]`, orderForm);
  if (!input || !errorEl) return;
  const invalid = Boolean(message);
  errorEl.textContent = invalid ? message : '';
  errorEl.classList.toggle('is-visible', invalid);
  input.classList.toggle('is-invalid', invalid);
};

const validateField = (fieldName) => {
  const result = validators[fieldName](orderForm.elements[fieldName].value);
  setError(fieldName, result === true ? '' : result);
  return result === true;
};

orderForm.addEventListener('input', (e) => {
  const field = e.target;
  if (!field.name || !validators[field.name]) return;
  const errorEl = $(`[data-error-for="${field.name}"]`, orderForm);
  if (errorEl.classList.contains('is-visible')) validateField(field.name);
});

orderForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const isPickup = orderForm.elements.delivery.value === 'pickup';
  const fields = isPickup ? ['name', 'phone'] : ['name', 'phone', 'address'];
  let valid = true;
  fields.forEach((name) => {
    if (!validateField(name)) valid = false;
  });

  if (!valid) {
    orderForm.querySelector('.is-invalid')?.focus();
    return;
  }

  // Демо-режим: здесь в реальном проекте будет fetch() к backend / CRM
  $('#order-number').textContent = 'ЗН-' + Math.floor(1000 + Math.random() * 9000);
  cart = {};
  saveCart();
  updateBadge();
  orderForm.reset();
  addressField.hidden = false;
  showStep('success');
});

/* ---------- 7. Подписка на кофе ---------- */
const subscribeForm = $('#subscribe-form');

const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

const setSubscribeError = (fieldName, message) => {
  const input = subscribeForm.elements[fieldName];
  const errorEl = $(`[data-error-for="${fieldName}"]`, subscribeForm);
  const invalid = Boolean(message);
  errorEl.textContent = invalid ? message : '';
  errorEl.classList.toggle('is-visible', invalid);
  input.classList.toggle('is-invalid', invalid);
};

subscribeForm.addEventListener('submit', (e) => {
  e.preventDefault();

  let valid = true;
  const email = subscribeForm.elements.email.value;
  const name = subscribeForm.elements.name.value;

  if (!emailValid(email)) {
    setSubscribeError('email', 'Похоже, в адресе опечатка');
    valid = false;
  } else setSubscribeError('email', '');

  if (name.trim().length < 2) {
    setSubscribeError('name', 'Введи имя — минимум 2 буквы');
    valid = false;
  } else setSubscribeError('name', '');

  if (!valid) return;

  // Демо-режим: здесь будет fetch() к сервису рассылки
  subscribeForm.reset();
  toast('Подписка оформлена! Первое письмо уже в пути ☕');
});

/* ---------- 8. Тост-уведомления ---------- */
const toastEl = $('#toast');
let toastTimer = null;

const toast = (message) => {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
};

/* ---------- 9. Шапка, бургер, reveal-анимации ---------- */
const header = $('#header');
const toggleSticky = () => header.classList.toggle('is-sticky', window.scrollY > 30);
toggleSticky();
window.addEventListener('scroll', toggleSticky, { passive: true });

const burger = $('#burger');
const mobileMenu = $('#mobile-menu');

const closeMenu = () => {
  burger.classList.remove('is-active');
  mobileMenu.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Открыть меню');
  document.body.classList.remove('no-scroll');
};

burger.addEventListener('click', () => {
  const opened = mobileMenu.classList.toggle('is-open');
  burger.classList.toggle('is-active', opened);
  burger.setAttribute('aria-expanded', String(opened));
  burger.setAttribute('aria-label', opened ? 'Закрыть меню' : 'Открыть меню');
  document.body.classList.toggle('no-scroll', opened);
});

$$('.mobile-menu a').forEach((a) => a.addEventListener('click', closeMenu));

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (cartEl.classList.contains('is-open')) closeCart();
  if (mobileMenu.classList.contains('is-open')) closeMenu();
});

const revealEls = $$('.reveal');

const groups = new Map();
revealEls.forEach((el) => {
  const count = groups.get(el.parentElement) || 0;
  groups.set(el.parentElement, count + 1);
  el.style.transitionDelay = Math.min(count * 70, 350) + 'ms';
});

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* ---------- 10. Старт ---------- */
renderCatalog();
updateBadge();
