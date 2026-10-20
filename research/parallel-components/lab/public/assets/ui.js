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
  const anchor = event.target.closest('a[href^="#"]');
  if (anchor) {
    closeNav();
    const id = anchor.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) {
      target.tabIndex = -1;
      // Let the browser update the hash before moving keyboard focus.
      queueMicrotask(() => target.focus({preventScroll: true}));
    }
  }
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
let returnFocus = opener;
opener.addEventListener('click', () => {returnFocus = opener; dialog.showModal();});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#dialog-faq').addEventListener('click', () => {returnFocus = document.querySelector('#faq'); returnFocus.tabIndex = -1; dialog.close();});
dialog.addEventListener('close', () => {returnFocus.focus(); returnFocus = opener;});

const form = document.querySelector('#contact');
const status = document.querySelector('#form-status');
const send = document.querySelector('#form-submit');
const keys = ['name', 'email', 'phone', 'message'];
const identity = document.querySelector('#wizard-identity');
const details = document.querySelector('#wizard-message');
const next = document.querySelector('#wizard-next');
const previous = document.querySelector('#wizard-prev');
const progress = document.querySelector('#wizard-progress');
let step = 0;
function activateStep(index, moveFocus = true) {
  step = index;
  identity.hidden = index !== 0;
  details.hidden = index !== 1;
  next.hidden = index !== 0;
  previous.hidden = index !== 1;
  progress.textContent = `Шаг ${index + 1} из 2: ${index === 0 ? 'контакты' : 'сообщение'}`;
  if (moveFocus) (index === 0 ? document.querySelector('#name') : document.querySelector('#message')).focus();
}
function showErrors(errors) {
  let firstInvalid = null;
  for (const key of keys) {
    const field = form.elements.namedItem(key);
    const message = typeof errors?.[key] === 'string' ? errors[key] : '';
    field.setAttribute('aria-invalid', String(Boolean(message)));
    document.getElementById(`${key}-error`).textContent = message;
    if (message && !firstInvalid) firstInvalid = field;
  }
  return firstInvalid;
}
function validate(keysToCheck) {
  const errors = {};
  const name = form.elements.namedItem('name').value.trim();
  const email = form.elements.namedItem('email').value.trim();
  const message = form.elements.namedItem('message').value.trim();
  if (keysToCheck.includes('name') && (name.length < 2 || name.length > 100)) errors.name = 'Имя: от 2 до 100 символов.';
  if (keysToCheck.includes('email') && (!form.elements.namedItem('email').validity.valid || !email)) errors.email = 'Введите корректный адрес email.';
  if (keysToCheck.includes('message') && (message.length < 10 || message.length > 2000)) errors.message = 'Сообщение: от 10 до 2000 символов.';
  return showErrors(errors);
}
next.addEventListener('click', () => {
  const firstInvalid = validate(['name', 'email']);
  if (firstInvalid) {status.textContent = 'Проверьте поля формы.'; firstInvalid.focus(); return;}
  status.textContent = '';
  activateStep(1);
});
previous.addEventListener('click', () => activateStep(0));
// The wizard is only a UI, never a security boundary. SubmissionBoundary + FormLab validate ALL fields.
activateStep(0, false);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (send.disabled) return;
  const firstClientInvalid = validate(['name','email','message']);
  if (firstClientInvalid) {
    activateStep(['name','email'].includes(firstClientInvalid.name) ? 0 : 1, false);
    status.textContent = 'Проверьте поля формы.';
    firstClientInvalid.focus();
    return;
  }
  send.disabled = true;
  next.disabled = true;
  previous.disabled = true;
  status.textContent = 'Проверяем запрос…';
  try {
    const response = await fetch(form.action, {method: 'POST', body: new URLSearchParams(new FormData(form)),
      headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
    const data = await response.json();
    if (!data || typeof data.code !== 'string' || typeof data.message !== 'string') throw new Error('Untrusted response shape');
    const firstInvalid = showErrors(data.errors && typeof data.errors === 'object' ? data.errors : {});
    status.textContent = `${data.code}: ${data.message}`;
    if (data.code === 'QUEUED_UNCONFIRMED') form.reset();
    const retryForbidden = ['QUEUED_UNCONFIRMED','DELIVERY_UNCONFIRMED','DELIVERY_FAILED','DUPLICATE_REQUEST','CSRF_INVALID'].includes(data.code);
    send.disabled = retryForbidden;
    next.disabled = retryForbidden;
    previous.disabled = retryForbidden;
    if (retryForbidden) status.textContent += ' Для новой попытки обновите страницу.';
    if (firstInvalid) {
      activateStep(['name','email'].includes(firstInvalid.name) ? 0 : 1, false);
      firstInvalid.focus();
    } else status.focus();
  } catch {
    status.textContent = 'NETWORK_UNCONFIRMED: Соединение прервано. Результат отправки неизвестен. Не повторяйте запрос автоматически. Обновите страницу после проверки статуса.';
    send.disabled = true;
    next.disabled = true;
    previous.disabled = true;
    status.focus();
  }
});
