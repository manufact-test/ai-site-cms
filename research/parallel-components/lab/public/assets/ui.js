'use strict';
document.documentElement.classList.add('js');
const toggle = document.querySelector('#nav-toggle');
const nav = document.querySelector('#site-nav');
// The menu button has no meaningful behaviour without JavaScript.
toggle.hidden = false;
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
// Without scripts both panels are readable and nonfunctional tab controls stay hidden.
// Once interactive, establish a single ARIA-selected tab before revealing controls.
selectTab(tabs[0]);
document.querySelector('[role="tablist"]').hidden = false;
const dialog = document.querySelector('#info-dialog');
const opener = document.querySelector('#open-dialog');
opener.hidden = false;
let returnFocus = opener;
opener.addEventListener('click', () => {returnFocus = opener; dialog.showModal();});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#dialog-faq').addEventListener('click', () => {returnFocus = document.querySelector('#faq'); returnFocus.tabIndex = -1; dialog.close();});
dialog.addEventListener('close', () => {returnFocus.focus(); returnFocus = opener;});

const form = document.querySelector('#contact');
// No-JS submissions use native required/email/minlength constraints before the PHP boundary;
// the enhanced two-step wizard supplies its own Unicode-consistent validation.
form.noValidate = true;
const status = document.querySelector('#form-status');
const send = document.querySelector('#form-submit');
const keys = ['name', 'email', 'phone_region', 'phone', 'message'];
// Outbound delivery may have succeeded even when the reply is unknown.
// Permit another POST only for explicit authoritative pre-delivery responses.
const SAFE_RETRY_CODES = new Set([
  'VALIDATION_ERROR', 'TOO_FAST', 'CONFIGURATION_REQUIRED', 'PHONE_VALIDATOR_REQUIRED',
  'ORIGIN_CONFIGURATION_REQUIRED', 'ANTI_SPAM_CONFIGURATION_REQUIRED',
  'RECEIPT_STORE_CONFIGURATION_REQUIRED', 'RECEIPT_STORE_UNAVAILABLE', 'RATE_LIMITED'
]);
// Server has final authority; avoid stale announced errors after a user correction.
function clearFieldError(field) {
  if (!keys.includes(field.name)) return;
  field.removeAttribute('aria-invalid');
  const error = document.getElementById(`${field.name}-error`);
  if (error) error.textContent = '';
}
const identity = document.querySelector('#wizard-identity');
const details = document.querySelector('#wizard-message');
const next = document.querySelector('#wizard-next');
const previous = document.querySelector('#wizard-prev');
const progress = document.querySelector('#wizard-progress');
form.addEventListener('input', event => {
  const field = event.target;
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    clearFieldError(field);
  }
});
form.addEventListener('change', event => {
  if (event.target instanceof HTMLSelectElement) clearFieldError(event.target);
});
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
// JS .length counts UTF-16 code units; PHP server counts Unicode code points.
const codePointLength = value => Array.from(value).length;
function validate(keysToCheck) {
  const errors = {};
  const name = form.elements.namedItem('name').value.trim();
  const email = form.elements.namedItem('email').value.trim();
  const message = form.elements.namedItem('message').value.trim();
  if (keysToCheck.includes('name') && (codePointLength(name) < 2 || codePointLength(name) > 100)) errors.name = 'Имя: от 2 до 100 символов.';
  if (keysToCheck.includes('email') && (!form.elements.namedItem('email').validity.valid || !email)) errors.email = 'Введите корректный адрес email.';
  if (keysToCheck.includes('message') && (codePointLength(message) < 10 || codePointLength(message) > 2000)) errors.message = 'Сообщение: от 10 до 2000 символов.';
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
    // Default-deny on novel/mismatched status codes, not only known failures.
    // In particular MALFORMED_FORM, SPAM_REJECTED and any unknown value cannot silently resend.
    const retryForbidden = !SAFE_RETRY_CODES.has(data.code);
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
