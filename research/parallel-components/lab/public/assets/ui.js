'use strict';
document.documentElement.classList.add('js');
const toggle = document.querySelector('#nav-toggle');
const nav = document.querySelector('#site-nav');
const closeNav = (restore = false) => {
  toggle.setAttribute('aria-expanded', 'false');
  if (restore) toggle.focus();
};
toggle.addEventListener('click', () => {
  toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') !== 'true'));
});
nav.addEventListener('click', event => {
  if (event.target.closest('a')) closeNav();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeNav(true);
});
document.addEventListener('pointerdown', event => {
  if (!nav.contains(event.target) && !toggle.contains(event.target)) closeNav();
});
const media = matchMedia('(min-width: 701px)');
media.addEventListener('change', () => closeNav());

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(target, focus = false) {
  for (const tab of tabs) {
    const active = tab === target;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  }
  if (focus) target.focus();
}
for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const index = tabs.indexOf(tab);
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next === -1) return;
    event.preventDefault();
    selectTab(tabs[next], true);
  });
}
const dialog = document.querySelector('#info-dialog');
const opener = document.querySelector('#open-dialog');
opener.addEventListener('click', () => dialog.showModal());
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => opener.focus());

const form = document.querySelector('#contact');
const status = document.querySelector('#form-status');
const send = document.querySelector('#form-submit');
const keys = ['name', 'email', 'phone', 'message'];
function showErrors(errors) {
  let firstInvalid = null;
  for (const key of keys) {
    const field = form.elements.namedItem(key);
    const message = errors[key] || '';
    field.setAttribute('aria-invalid', String(Boolean(message)));
    document.getElementById(`${key}-error`).textContent = message;
    if (message && !firstInvalid) firstInvalid = field;
  }
  if (firstInvalid) firstInvalid.focus();
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (send.disabled) return;
  const errors = {};
  const name = form.elements.namedItem('name').value.trim();
  const email = form.elements.namedItem('email').value.trim();
  const message = form.elements.namedItem('message').value.trim();
  if (name.length < 2 || name.length > 100) errors.name = 'Имя: от 2 до 100 символов.';
  if (!form.elements.namedItem('email').validity.valid || email.length > 254) errors.email = 'Введите корректный адрес email.';
  if (message.length < 10 || message.length > 2000) errors.message = 'Сообщение: от 10 до 2000 символов.';
  showErrors(errors);
  if (Object.keys(errors).length) {status.textContent = 'Проверьте поля формы.'; return;}
  send.disabled = true;
  status.textContent = 'Проверяем запрос…';
  try {
    const response = await fetch(form.action, {method: 'POST', body: new URLSearchParams(new FormData(form)),
      headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
    const data = await response.json();
    showErrors(data.errors || {});
    status.textContent = `${data.code}: ${data.message}`;
    if (data.code === 'QUEUED_UNCONFIRMED') {
      form.reset(); // Token deliberately remains consumed. Refresh required for another delivery.
      send.disabled = true;
    }
  } catch {
    status.textContent = 'NETWORK_UNCONFIRMED: Соединение прервано. Результат отправки неизвестен. Не повторяйте запрос автоматически.';
  } finally {
    if (!status.textContent.startsWith('QUEUED_UNCONFIRMED')) send.disabled = false;
    status.focus();
  }
});
