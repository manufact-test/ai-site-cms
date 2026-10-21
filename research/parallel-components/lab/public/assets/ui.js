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
