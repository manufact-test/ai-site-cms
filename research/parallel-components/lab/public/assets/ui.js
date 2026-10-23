'use strict';
document.documentElement.classList.add('js');
const toggle = document.querySelector('#nav-toggle');
const nav = document.querySelector('#site-nav');
// The menu button has no meaningful behaviour without JavaScript.
toggle.hidden = false;
const media = matchMedia('(min-width: 701px)');
const closeNav = (restore = false) => {
  toggle.setAttribute('aria-expanded', 'false');
  // A hidden desktop menu button cannot be an effective focus destination.
  if (restore && !media.matches && !toggle.hidden) toggle.focus();
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
// On Tab away, let the browser move focus normally, then collapse the mobile menu.
nav.addEventListener('focusout', () => queueMicrotask(() => {
  if (!media.matches && !nav.contains(document.activeElement) &&
      document.activeElement !== toggle) closeNav();
}));
media.addEventListener('change', () => {
  const wasOnToggle = document.activeElement === toggle;
  closeNav();
  // When the button disappears at desktop width, preserve a visible keyboard target.
  if (media.matches && wasOnToggle) nav.querySelector('a')?.focus();
});

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(target, focus = false) {
  for (const tab of tabs) {
    const active = tab === target;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    // No-script panels are ordinary content, not orphaned ARIA tab panels.
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    panel.hidden = !active;
  }
  if (focus) target.focus();
}
for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const index = tabs.indexOf(tab);
    // Arrow keys follow visual order in RTL documents; Home/End remain logical edges.
    const rtl = getComputedStyle(tab.closest('[role="tablist"]')).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    const next = event.key === forward ? (index + 1) % tabs.length
      : event.key === backward ? (index + tabs.length - 1) % tabs.length
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
opener.addEventListener('click', () => {
  // Programmatic re-entry while a modal is open must not throw or reset focus.
  if (dialog.open) return;
  returnFocus = opener;
  dialog.showModal();
});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#dialog-faq').addEventListener('click', () => {returnFocus = document.querySelector('#faq'); returnFocus.tabIndex = -1; dialog.close();});
dialog.addEventListener('close', () => {
  const destination = returnFocus;
  returnFocus = opener;
  // If an explicit destination was removed/hidden while modal, use the opener.
  const usable = node => node?.isConnected && node.getClientRects().length > 0 &&
    !node.closest('[hidden]');
  if (usable(destination)) destination.focus();
  else if (usable(opener)) opener.focus();
});

const form = document.querySelector('#contact');
// No-JS submissions use native required/email/minlength constraints before the PHP boundary;
// the enhanced two-step wizard supplies its own Unicode-consistent validation.
form.noValidate = true;
const status = document.querySelector('#form-status');
const errorSummary = document.querySelector('#form-errors');
const send = document.querySelector('#form-submit');
const keys = ['name', 'email', 'phone_region', 'phone', 'message'];

// Bind the authoritative server protocol to HTTP metadata, never JSON claims alone.
// Unknown or contradictory replies are uncertain: the server may already have sent mail.
const STATUS_BY_CODE = new Map([
  ['QUEUED_UNCONFIRMED',202], ['DUPLICATE_REQUEST',409],
  ['CSRF_INVALID',403], ['ORIGIN_INVALID',403], ['HOST_INVALID',403],
  ['METHOD_NOT_ALLOWED',405], ['UNSUPPORTED_REQUEST',415],
  ['VALIDATION_ERROR',422], ['MALFORMED_FORM',422], ['SPAM_REJECTED',422],
  ['TOO_FAST',422], ['RATE_LIMITED',429],
  ['DELIVERY_FAILED',502], ['DELIVERY_UNCONFIRMED',502],
  ['CONFIGURATION_REQUIRED',503], ['PHONE_VALIDATOR_REQUIRED',503],
  ['ORIGIN_CONFIGURATION_REQUIRED',503], ['ANTI_SPAM_CONFIGURATION_REQUIRED',503],
  ['RECEIPT_STORE_CONFIGURATION_REQUIRED',503], ['RECEIPT_STORE_UNAVAILABLE',503]
]);
const MAX_REPLY_BYTES = 4096;
class ResponseProtocolError extends Error {}
async function verifiedReply(response) {
  if (!response || !Number.isInteger(response.status) ||
      !response.headers || typeof response.headers.get !== 'function' ||
      !response.body || typeof response.body.getReader !== 'function') {
    throw new ResponseProtocolError('Missing HTTP metadata or byte stream');
  }
  const type = response.headers.get('content-type');
  if (typeof type !== 'string' ||
      !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type.trim())) {
    throw new ResponseProtocolError('Unexpected response media type');
  }
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^[0-9]{1,7}$/.test(declared) ||
      Number(declared) > MAX_REPLY_BYTES)) {
    throw new ResponseProtocolError('Untrusted response length');
  }
  const reader = response.body.getReader();
  const parts = [];
  let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    if (!(value instanceof Uint8Array)) throw new ResponseProtocolError('Invalid body chunk');
    length += value.byteLength;
    if (length > MAX_REPLY_BYTES) {
      await reader.cancel();
      throw new ResponseProtocolError('Oversized response');
    }
    parts.push(value);
  }
  if (!length) throw new ResponseProtocolError('Empty response');
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  let data;
  try {
    data = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  } catch {
    throw new ResponseProtocolError('Invalid UTF-8 or JSON');
  }
  if (!data || Array.isArray(data) || typeof data !== 'object' ||
      Object.getPrototypeOf(data) !== Object.prototype ||
      Object.keys(data).length !== 3 ||
      !['code','message','errors'].every(key => Object.hasOwn(data,key)) ||
      typeof data.code !== 'string' || !STATUS_BY_CODE.has(data.code) ||
      STATUS_BY_CODE.get(data.code) !== response.status ||
      typeof data.message !== 'string' || !data.message.trim() ||
      data.message.length > 512 ||
      !data.errors || typeof data.errors !== 'object' || Array.isArray(data.errors) ||
      Object.getPrototypeOf(data.errors) !== Object.prototype) {
    throw new ResponseProtocolError('Contradictory status/code or response shape');
  }
  const errors = Object.entries(data.errors);
  if (errors.length > keys.length ||
      errors.some(([key, message]) => !keys.includes(key) ||
        typeof message !== 'string' || !message.trim() || message.length > 256) ||
      (data.code === 'VALIDATION_ERROR' ? errors.length === 0 : errors.length !== 0)) {
    throw new ResponseProtocolError('Unexpected validation fields');
  }
  return data;
}

// Outbound delivery may have succeeded even when the reply is unknown.
// Permit another POST only for explicit authoritative pre-delivery responses.
const SAFE_RETRY_CODES = new Set([
  'VALIDATION_ERROR', 'TOO_FAST', 'CONFIGURATION_REQUIRED', 'PHONE_VALIDATOR_REQUIRED',
  'ORIGIN_CONFIGURATION_REQUIRED', 'ANTI_SPAM_CONFIGURATION_REQUIRED',
  'RECEIPT_STORE_CONFIGURATION_REQUIRED', 'RECEIPT_STORE_UNAVAILABLE', 'RATE_LIMITED'
]);
// Server has final authority; avoid stale announced errors after a user correction.
function renderErrorSummary() {
  // Every link points to a known local field; untrusted server text is never HTML.
  errorSummary.replaceChildren();
  const failed = keys.map(key => ({
    key, field: form.elements.namedItem(key),
    message: document.getElementById(`${key}-error`).textContent.trim()
  })).filter(item => item.message);
  errorSummary.hidden = failed.length === 0;
  if (!failed.length) return;
  const heading = document.createElement('p');
  heading.textContent = 'Исправьте ошибки в форме:';
  const list = document.createElement('ul');
  for (const {key, field, message} of failed) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${field.id}`;
    link.dataset.field = key;
    link.textContent = message;
    item.append(link);
    list.append(item);
  }
  errorSummary.append(heading, list);
}
function clearFieldError(field) {
  if (!keys.includes(field.name)) return;
  field.removeAttribute('aria-invalid');
  const error = document.getElementById(`${field.name}-error`);
  if (error) error.textContent = '';
  renderErrorSummary();
}
const identity = document.querySelector('#wizard-identity');
const details = document.querySelector('#wizard-message');
const next = document.querySelector('#wizard-next');
const previous = document.querySelector('#wizard-prev');
const progress = document.querySelector('#wizard-progress');
errorSummary.addEventListener('click', event => {
  const link = event.target.closest('a[data-field]');
  if (!link || !errorSummary.contains(link) || !keys.includes(link.dataset.field)) return;
  event.preventDefault();
  const key = link.dataset.field;
  activateStep(['name','email'].includes(key) ? 0 : 1, false);
  form.elements.namedItem(key).focus();
});
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
  renderErrorSummary();
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
    const data = await verifiedReply(response);
    const firstInvalid = showErrors(data.errors);
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
  } catch (error) {
    status.textContent = error instanceof ResponseProtocolError
      ? 'RESPONSE_UNCONFIRMED: Ответ сервера не подтверждён или повреждён. Заявка могла быть принята. Не повторяйте запрос автоматически. Обновите страницу после проверки статуса.'
      : 'NETWORK_UNCONFIRMED: Соединение прервано. Результат отправки неизвестен. Не повторяйте запрос автоматически. Обновите страницу после проверки статуса.';
    send.disabled = true;
    next.disabled = true;
    previous.disabled = true;
    status.focus();
  }
});
