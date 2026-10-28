import { describe, expect, it } from 'vitest';
import { employeeToRow, rowToEmployee } from '../services/supabase';
import { Employee } from '../types';
import { employee } from './fixtures';

// Settings that a card can hold and that the table has no column for. These
// are the ones that were silently never saved: configure a card, reopen it
// somewhere else, and the work was gone.
const TEMPLATE_SETTINGS: Partial<Employee> = {
  tenure: '4 ANOS',
  // New Provider panel
  providerLogoWhite: true,
  providerBgAsset: 'https://cdn.test/asset.png',
  providerBgAssetScale: 1.4,
  providerBgAssetX: -20,
  providerBgAssetY: 15,
  providerBgAssetRotate: 12,
  providerSphereBlur: 8,
  providerSphere1X: -30,
  providerSphere1Y: 10,
  providerSphere2X: 25,
  providerSphere2Y: -5,
  providerGatorLogoScale: 1.3,
  providerGatorLogoX: 4,
  providerGatorLogoY: -8,
  providerTitleBoxGap: 24,
  providerCompositionScale: 1.1,
  providerLogoBoxRadius: 28,
  // HR Feedback
  activationLogo: 'gator',
  activationTextMode: 'title_paragraph',
  activationTextAlign: 'left',
  activationParagraph: '<b>Olá</b> time',
  activationTitleFontScale: 1.2,
  activationParagraphFontScale: 0.9,
  activationTitleLineHeight: 1.05,
  activationParagraphLineHeight: 1.4,
  activationImageMode: 'circle',
  activationCircleSize: 220,
  activationCirclePosition: 'right',
  activationFontColor: '#ff8800',
  activationBackgroundHeightScale: 0.7,
  // Hiring
  hiringTitle1: 'ESTAMOS',
  hiringTitle2: 'CONTRATANDO',
  hiringLayout: { logo: { x: 1, y: 2, scale: 1.1 } },
};

const roundTrip = (emp: Employee): Employee => {
  const row = employeeToRow(emp);
  // What Supabase hands back: snake_case columns plus the jsonb blob.
  return rowToEmployee({ ...row, template_settings: row.template_settings });
};

describe('employee persistence', () => {
  it('round-trips every template setting', () => {
    const original = employee(TEMPLATE_SETTINGS);
    const restored = roundTrip(original);
    for (const key of Object.keys(TEMPLATE_SETTINGS) as (keyof Employee)[]) {
      expect(restored[key], `${key} did not survive the round trip`).toEqual(original[key]);
    }
  });

  it('round-trips the fields that have their own columns', () => {
    const original = employee({ photoScale: 1.4, photoPosition: { x: -12, y: 33 } });
    const restored = roundTrip(original);
    expect(restored.name).toBe(original.name);
    expect(restored.role).toBe(original.role);
    expect(restored.photoUrl).toBe(original.photoUrl);
    expect(restored.photoScale).toBe(1.4);
    expect(restored.photoPosition).toEqual({ x: -12, y: 33 });
  });

  it('keeps template settings out of the dedicated columns', () => {
    const row = employeeToRow(employee(TEMPLATE_SETTINGS));
    const blob = row.template_settings as Record<string, unknown>;
    // A field with its own column must not be duplicated into the blob, or
    // the two copies drift and the stale one can win.
    for (const owned of ['id', 'name', 'role', 'photoUrl', 'photoScale', 'photoPosition']) {
      expect(blob, `${owned} should not be in template_settings`).not.toHaveProperty(owned);
    }
    expect(blob).toHaveProperty('providerSphereBlur', 8);
  });

  it('writes the template records like any other employee', () => {
    // These three used to return early from upsertEmployee without writing
    // anything, which is why a configured Baby card only ever existed in one
    // browser's localStorage.
    for (const id of ['hiring-generic', 'baby-generic', 'gaming-generic']) {
      const row = employeeToRow(employee({ id, activationCircleSize: 180 }));
      expect(row.id, `${id} must produce a row`).toBe(id);
      expect(row.template_settings).toHaveProperty('activationCircleSize', 180);
    }
  });

  it('reads a row written before the migration, with no blob at all', () => {
    const restored = rowToEmployee({
      id: 'emp-old', name: 'Antiga', role: 'QA',
      photo_scale: '1.2', photo_position_x: '5', photo_position_y: '-3',
    });
    expect(restored.name).toBe('Antiga');
    expect(restored.photoScale).toBe(1.2);
    expect(restored.photoPosition).toEqual({ x: 5, y: -3 });
    expect(restored.providerSphereBlur).toBeUndefined();
  });

  it('lets a dedicated column win over a stale copy inside the blob', () => {
    const restored = rowToEmployee({
      id: 'emp-1', name: 'Atual', photo_scale: '2',
      template_settings: { name: 'Obsoleta', photoScale: 9 },
    });
    expect(restored.name).toBe('Atual');
    expect(restored.photoScale).toBe(2);
  });

  it('drops undefined fields instead of storing nulls for them', () => {
    const blob = employeeToRow(employee({ providerSphereBlur: undefined })).template_settings as Record<string, unknown>;
    expect(blob).not.toHaveProperty('providerSphereBlur');
  });
});
