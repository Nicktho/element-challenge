import { By } from '@flood/element';

export const byPartialAttr = (tag: string, name: string, value: string) => By.js((tag, name, value) => (
  Array.from(document.querySelectorAll(tag))
    .filter(el => el.getAttribute(name)?.startsWith(value))
), tag, name, value);