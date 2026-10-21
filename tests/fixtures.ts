import { CanvasConfig, Employee } from '../types';

// One fixed employee and config for every test, so a snapshot only ever
// changes because a generator changed. Nothing here is random or time-based:
// a Date.now() or a Math.random() anywhere in a template would make these
// snapshots churn, which is itself worth catching.
export const CONFIG: CanvasConfig = {
  primaryColor: '#594C99',
  secondaryColor: '#22d3ee',
  companyLogo: '',
};

export const employee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-fixture-1',
  name: 'Amanda Santos',
  role: 'Product Manager',
  previousRole: 'Associate Product Manager',
  department: 'Marketing',
  photoUrl: 'https://example.test/photo.png',
  photoScale: 1,
  photoPosition: { x: 0, y: 0 },
  dateStr: '12/06',
  admissionDate: '2021-03-01',
  tenure: '4 ANOS',
  birthDate: '1995-06-12',
  description: 'Bio de exemplo.',
  ...overrides,
});

/** A roster of n distinct people, for the group and month layouts. */
export const roster = (n: number): Employee[] =>
  Array.from({ length: n }, (_, i) => employee({
    id: `emp-fixture-${i + 1}`,
    name: `Pessoa ${i + 1} Sobrenome`,
    role: `Cargo ${i + 1}`,
    dateStr: `${String((i % 28) + 1).padStart(2, '0')}/06`,
    photoUrl: `https://example.test/photo-${i + 1}.png`,
  }));
