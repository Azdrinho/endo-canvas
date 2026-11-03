import type { Template } from './types';
import { hrUpdate } from './hrUpdate';
import { birthday } from './birthday';
import { milestone } from './milestone';

// Every template the editor knows about. A template is a module that exports
// one object; adding one here is the only wiring step, because the inspector,
// the persistence layer and the picker all read from the declaration rather
// than needing their own copy of it.
export const TEMPLATES: Template[] = [hrUpdate, birthday, milestone];

const BY_ID = new Map(TEMPLATES.map(t => [t.id, t]));

export const getTemplate = (id: string): Template => {
  const found = BY_ID.get(id);
  // Falling back rather than throwing: a card saved against a template that
  // has since been renamed should open on something, not take the app down.
  if (!found) {
    console.warn(`[templates] unknown template "${id}", falling back to ${TEMPLATES[0].id}`);
    return TEMPLATES[0];
  }
  return found;
};

export const hasTemplate = (id: string): boolean => BY_ID.has(id);

export const FAMILY_LABELS: Record<Template['family'], string> = {
  pessoas: 'Pessoas',
  comunicacao: 'Comunicação',
  comercial: 'Comercial',
};
