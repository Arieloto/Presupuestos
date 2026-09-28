import { describe, expect, it } from 'vitest';
import { addMaterialToTakeoff, applyDestinationBatch, applyInstallationTypes, applyReserve, calculateRoutes, confirmTakeoffState, consolidateComponents, createItemsFromTemplate, createTakeoffState, getComponentQuantities, migrateTakeoffState, recordMaterialEdit, removeTemplateMaterials, resetTakeoff, summarizeWorkflow, validateDestinationBatch, validateMaterial, INSTALLATION_TYPES, TEMPLATES } from './cubicacion.js';

describe('cubicación asistida', () => {
  it('carga un catálogo completo de tipos de instalación y plantillas', () => {
    expect(INSTALLATION_TYPES).toContain('Instalación subterránea');
    expect(INSTALLATION_TYPES).toContain('Puesta a tierra');
    expect(TEMPLATES.some(template => template.name === 'Tablero de fuerza')).toBe(true);
    expect(TEMPLATES.some(template => template.name === 'Equipo especial: Motor')).toBe(true);
  });

  it('convierte solo la selección de plantilla en Items con cantidad y precio cero', () => {
    const template = TEMPLATES.find(item => item.ids.length > 1);
    const selected = template.ids.slice(0, 1);
    const rows = createItemsFromTemplate(template.id, selected);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quantity: 0, unitPrice: 0, templateId: template.id, sourceComponentId: selected[0] });
    expect(createItemsFromTemplate(template.id, [])).toEqual([]);
    expect(createItemsFromTemplate('missing-template', selected)).toEqual([]);
  });

  it('activa las plantillas aplicables sin añadir duplicados', () => {
    const state = applyInstallationTypes(createTakeoffState(), ['Instalación aérea']);
    const twice = applyInstallationTypes(state, ['Instalación aérea']);
    expect(state.templates).toContain('conduit-aerial');
    expect(twice.components).toHaveLength(state.components.length);
  });

  it('permite deshacer una plantilla sin quitar componentes manuales ni materiales enviados', () => {
    const template = TEMPLATES.find(item => item.id === 'conduit-aerial');
    const state = applyInstallationTypes(createTakeoffState(), ['Instalación aérea']);
    const originalIds = new Set(state.components.map(item => item.id));
    const manual = { id: 'manual', componentId: 'manual-item', label: 'Manual', origin: 'Catálogo manual', destination: 'solo_cubicacion' };
    const sent = { ...state.components[0], id: 'sent', destination: 'partida', destinationRelations: { itemId: 'PART-1', finalBudgetId: '' } };
    const result = removeTemplateMaterials({ ...state, components: [...state.components, manual, sent] }, template.id);
    expect(result.removed).toBe(state.components.length);
    expect(result.protected).toBe(1);
    expect(result.takeoff.components.map(item => item.id)).toEqual(['manual', 'sent']);
    expect([...originalIds].length).toBeGreaterThan(0);
    expect(result.takeoff.templates).toContain(template.id);
  });

  it('restablece la cubicación cuando no hay destinos y protege el estado si hay relaciones', () => {
    const state = applyInstallationTypes(createTakeoffState(), ['Instalación aérea']);
    const reset = resetTakeoff(state);
    expect(reset.removed).toBe(state.components.length);
    expect(reset.takeoff.components).toHaveLength(0);
    expect(reset.takeoff.templates).toHaveLength(0);
    const protectedState = { ...state, components: [{ ...state.components[0], destination: 'partida' }] };
    expect(resetTakeoff(protectedState)).toMatchObject({ takeoff: protectedState, removed: 0, protected: 1 });
  });

  it('separa cantidad teórica, reserva y compra', () => {
    expect(applyReserve(100, 'percent', 10)).toEqual({ theoretical: 100, reserve: 10, adjusted: 110 });
    expect(getComponentQuantities({ theoretical: 84, reserveMode: 'percent', reserveValue: 10, packageSize: 0, purchaseStep: 0, unit: 'm' })).toEqual({ theoretical: 84, reserve: 8.4, adjusted: 92.4, purchase: 92.4 });
    expect(getComponentQuantities({ theoretical: 3, reserveMode: 'percent', reserveValue: 0, packageSize: 0, purchaseStep: 0, unit: 'un' }).purchase).toBe(3);
  });

  it('calcula ruta por número de conductores, más chicotes, antes de reserva', () => {
    const [row] = calculateRoutes([{ id: 'r1', from: 'Tablero', to: 'Caja', length: 18, system: '', conductors: [{ id: 'c1', function: 'Fase', count: 3, length: 18, pigtails: 2, reserveMode: 'percent', reserveValue: 10 }] }]);
    expect(row.theoretical).toBe(56);
    expect(row.reserve).toBeCloseTo(5.6);
    expect(row.adjusted).toBeCloseTo(61.6);
  });

  it('consolida coincidencias sin mezclar especificaciones diferentes', () => {
    const rows = consolidateComponents([
      { id: '1', label: 'Cable', category: 'Conductores', specification: '6 mm²', unit: 'm', theoretical: 10, reserveMode: 'percent', reserveValue: 10, origin: 'R1' },
      { id: '2', label: 'Cable', category: 'Conductores', specification: '6 mm²', unit: 'm', theoretical: 20, reserveMode: 'percent', reserveValue: 10, origin: 'R2' },
      { id: '3', label: 'Cable', category: 'Conductores', specification: '10 mm²', unit: 'm', theoretical: 5, reserveMode: 'percent', reserveValue: 0, origin: 'R3' },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find(row => row.specification === '6 mm²').theoretical).toBe(30);
  });

  it('asigna ID estable incremental y migra datos preexistentes', () => {
    const first = addMaterialToTakeoff(createTakeoffState(), { id: 'component-a', label: 'Interruptor', unit: 'un', theoretical: 1 });
    const second = addMaterialToTakeoff(first, { id: 'component-b', label: 'Enchufe', unit: 'un', theoretical: 2 });
    expect(first.components[0].materialId).toBe('MAT-000001');
    expect(second.components[1].materialId).toBe('MAT-000002');
    const migrated = migrateTakeoffState({ components: [{ id: 'old', label: 'Cable', unit: 'm', theoretical: 4 }] });
    expect(migrated.components[0].materialId).toBe('MAT-000001');
    expect(migrated.components[0].destination).toBe('solo_cubicacion');
  });

  it('valida campos y marca advertencias sin bloquear envío', () => {
    const component = { id: '1', materialId: 'MAT-000001', label: 'Conductor', category: 'Conductores', unit: 'm', theoretical: 10, specification: '', origin: 'R1', note: '', destination: 'solo_cubicacion' };
    expect(validateMaterial(component).status).toBe('advertencia');
    expect(validateMaterial({ ...component, label: '' }).status).toBe('error');
  });

  it('valida cantidad de compra, no solo cantidad teórica, al enviar', () => {
    const component = { id: '1', materialId: 'MAT-000001', label: 'Cable', category: 'Conductores', unit: 'm', theoretical: 0, reserveMode: 'absolute', reserveValue: 5, specification: '2.5 mm²', origin: 'R1', note: 'Medido' };
    expect(validateMaterial({ ...component, destination: 'partida' }).status).toBe('valido');
    expect(validateMaterial({ ...component, reserveValue: 0, destination: 'partida' }).errors).toContain('La cantidad de compra debe ser mayor que cero para enviar a un destino.');
  });

  it('no modifica datos si se cancela o no se confirma', () => {
    const data = { items: [], finalBudget: [], takeoff: { ...createTakeoffState(), components: [{ id: '1', materialId: 'MAT-000001', label: 'Cable', category: 'Conductores', specification: '2.5 mm²', unit: 'm', theoretical: 10, reserveMode: 'percent', reserveValue: 0, packageSize: 0, purchaseStep: 0, origin: 'R1', note: 'Medido', destination: 'solo_cubicacion' }] } };
    const result = applyDestinationBatch(data, ['1'], 'partida', { confirmed: false });
    expect(result.data).toBe(data);
    expect(result.data.items).toHaveLength(0);
  });

  it('envía a ambos destinos con relación estable e idempotente y sin perder fuente', () => {
    const component = { id: '1', materialId: 'MAT-000001', label: 'Cable', category: 'Conductores', specification: '2.5 mm²', unit: 'm', theoretical: 10, reserveMode: 'percent', reserveValue: 10, packageSize: 0, purchaseStep: 0, origin: 'R1', note: 'Medido', destination: 'solo_cubicacion', destinationRelations: { itemId: '', finalBudgetId: '' }, audit: [] };
    const data = { items: [], finalBudget: [], takeoff: { ...createTakeoffState(), components: [component] } };
    const first = applyDestinationBatch(data, ['1'], 'ambos', { confirmed: true, now: '2026-01-01T00:00:00Z' });
    const second = applyDestinationBatch(first.data, ['1'], 'ambos', { confirmed: true, now: '2026-01-02T00:00:00Z' });
    expect(first.data.items).toHaveLength(1);
    expect(first.data.finalBudget).toHaveLength(1);
    expect(first.data.items[0].sourceMaterialId).toBe('MAT-000001');
    expect(first.data.takeoff.components[0].id).toBe('1');
    expect(first.data.takeoff.components[0].audit).toHaveLength(1);
    expect(second.data.items).toHaveLength(1);
    expect(second.data.finalBudget).toHaveLength(1);
    expect(second.data.items[0].id).toBe(first.data.items[0].id);
  });

  it('bloquea lote completo con errores y permite sólo válidos bajo solicitud explícita', () => {
    const components = [
      { id: 'ok', materialId: 'MAT-000001', label: 'Cable', category: 'Conductores', specification: '2.5 mm²', unit: 'm', theoretical: 5, reserveMode: 'percent', reserveValue: 0, origin: 'R1', note: 'Medido' },
      { id: 'bad', materialId: 'MAT-000002', label: '', category: 'Conductores', unit: 'm', theoretical: 5, reserveMode: 'percent', reserveValue: 0 },
    ];
    const validation = validateDestinationBatch(components, ['ok', 'bad'], 'partida');
    expect(validation.errors).toBe(1);
    const data = { items: [], finalBudget: [], takeoff: { ...createTakeoffState(), components } };
    expect(applyDestinationBatch(data, ['ok', 'bad'], 'partida', { confirmed: true }).error).toContain('errores');
    const partial = applyDestinationBatch(data, ['ok', 'bad'], 'partida', { confirmed: true, onlyValid: true });
    expect(partial.applied).toEqual(['ok']);
    expect(partial.data.items).toHaveLength(1);
    expect(partial.blocked).toEqual(['bad']);
  });

  it('no permite confirmar cubicación con errores y cuenta advertencias independientemente', () => {
    const valid = { id: '1', materialId: 'MAT-000001', label: 'Conductor', category: 'Conductores', specification: '', unit: 'm', theoretical: 3, origin: 'R1', note: '', destination: 'solo_cubicacion', workflowStatus: 'pendiente', audit: [] };
    const state = { ...createTakeoffState(), components: [valid] };
    expect(summarizeWorkflow(state.components).warnings).toBe(1);
    const confirmed = confirmTakeoffState(state, state.components, '2026-01-01T00:00:00Z');
    expect(confirmed.takeoff.confirmedAt).toBe('2026-01-01T00:00:00Z');
    expect(confirmed.takeoff.components[0].workflowStatus).toBe('confirmado');
  });

  it('al editar después del envío marca modificado, invalida confirmación y actualiza relaciones sin perder precio', () => {
    const component = { id: '1', materialId: 'MAT-000001', label: 'Cable', category: 'Conductores', specification: '2.5 mm²', unit: 'm', theoretical: 10, reserveMode: 'percent', reserveValue: 0, packageSize: 0, purchaseStep: 0, origin: 'R1', note: 'Medido', destination: 'ambos', workflowStatus: 'enviado', destinationRelations: { itemId: 'PART-1', finalBudgetId: 'PRES-1' }, audit: [] };
    const data = { items: [{ id: 'PART-1', sourceMaterialId: 'MAT-000001', quantity: 10, unitPrice: 700, description: 'Cable' }], finalBudget: [{ id: 'PRES-1', sourceMaterialId: 'MAT-000001', quantity: 10, unitPrice: 900, description: 'Cable' }], takeoff: { ...createTakeoffState(), confirmedAt: '2026-01-01', components: [component] } };
    const edited = recordMaterialEdit(data, '1', { theoretical: 16 }, '2026-01-02');
    expect(edited.takeoff.confirmedAt).toBeNull();
    expect(edited.takeoff.components[0].workflowStatus).toBe('modificado');
    expect(edited.items[0].quantity).toBe(16);
    expect(edited.items[0].unitPrice).toBe(700);
    expect(edited.finalBudget[0].quantity).toBe(16);
    expect(edited.finalBudget[0].unitPrice).toBe(900);
    expect(edited.takeoff.components[0].audit).toHaveLength(1);
  });
});
