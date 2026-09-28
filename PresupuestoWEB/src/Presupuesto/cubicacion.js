import { COMPONENTS, FINAL_CHECKLIST, INSTALLATION_TYPES, TEMPLATES } from './catalogoCubicacion.js';

const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createTakeoffState = () => ({
  installationTypes: [],
  templates: [],
  components: [],
  routes: [],
  nextMaterialNumber: 1,
  confirmedAt: null,
  checklist: FINAL_CHECKLIST.map((label, index) => ({ id: `review-${index}`, label, status: 'pendiente', note: '' })),
});

export const DESTINATIONS = ['solo_cubicacion', 'partida', 'presupuesto_final', 'ambos'];
export const WORKFLOW_STATES = ['pendiente', 'revisado', 'asignado', 'listo_para_enviar', 'enviado', 'modificado', 'confirmado', 'error'];
export const VALIDATION_STATES = ['valido', 'advertencia', 'error'];
const allocateMaterialId = number => `MAT-${String(number).padStart(6, '0')}`;
const allocateRelationId = prefix => `${prefix}-${createId()}`;

function assignMissingMaterialIds(components, startAt = 1) {
  let nextNumber = startAt;
  const used = new Set(components.map(component => component.materialId).filter(Boolean));
  return components.map(component => {
    if (component.materialId) return component;
    while (used.has(allocateMaterialId(nextNumber))) nextNumber += 1;
    const materialId = allocateMaterialId(nextNumber++);
    used.add(materialId);
    return { ...component, materialId };
  });
}

export const migrateTakeoffState = raw => {
  const base = createTakeoffState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    installationTypes: Array.isArray(raw.installationTypes) ? raw.installationTypes.filter(type => INSTALLATION_TYPES.includes(type)) : [],
    templates: Array.isArray(raw.templates) ? raw.templates.filter(id => TEMPLATES.some(template => template.id === id)) : [],
    components: assignMissingMaterialIds(Array.isArray(raw.components) ? raw.components.map(component => ({
      id: component.id || createId(),
      materialId: component.materialId || '',
      componentId: component.componentId || '',
      label: component.label || '',
      category: component.category || 'Otros',
      specification: component.specification || '',
      unit: component.unit || 'un',
      theoretical: Math.max(0, Number(component.theoretical) || 0),
      reserveMode: ['percent', 'absolute'].includes(component.reserveMode) ? component.reserveMode : 'percent',
      reserveValue: Math.max(0, Number(component.reserveValue) || 0),
      packageSize: Math.max(0, Number(component.packageSize) || 0),
      purchaseStep: Math.max(0, Number(component.purchaseStep) || 0),
      classification: component.classification || 'SEGÚN DISEÑO',
      checklistStatus: component.checklistStatus || 'pendiente',
      note: component.note || '',
      origin: component.origin || 'manual',
      routeId: component.routeId || '',
      destination: DESTINATIONS.includes(component.destination) ? component.destination : 'solo_cubicacion',
      workflowStatus: WORKFLOW_STATES.includes(component.workflowStatus) ? component.workflowStatus : 'pendiente',
      validationStatus: VALIDATION_STATES.includes(component.validationStatus) ? component.validationStatus : 'valido',
      destinationRelations: { itemId: component.destinationRelations?.itemId || '', finalBudgetId: component.destinationRelations?.finalBudgetId || '' },
      audit: Array.isArray(component.audit) ? component.audit : [],
    })) : [], Number(raw.nextMaterialNumber) || 1),
    nextMaterialNumber: Math.max(Number(raw.nextMaterialNumber) || 1, (Array.isArray(raw.components) ? raw.components.length : 0) + 1),
    confirmedAt: raw.confirmedAt || null,
    routes: Array.isArray(raw.routes) ? raw.routes.map(route => ({
      id: route.id || createId(),
      from: route.from || '', to: route.to || '', system: route.system || '', name: route.name || '',
      length: Math.max(0, Number(route.length) || 0), reserveMode: ['percent', 'absolute'].includes(route.reserveMode) ? route.reserveMode : 'percent',
      reserveValue: Math.max(0, Number(route.reserveValue) || 0), note: route.note || '',
      conductors: Array.isArray(route.conductors) ? route.conductors.map(conductor => ({
        id: conductor.id || createId(), function: conductor.function || 'Fase', type: conductor.type || '', section: conductor.section || '', count: Math.max(0, Number(conductor.count) || 0), length: Math.max(0, Number(conductor.length) || 0), color: conductor.color || '', insulation: conductor.insulation || '', pigtails: Math.max(0, Number(conductor.pigtails) || 0), reserveMode: ['percent', 'absolute'].includes(conductor.reserveMode) ? conductor.reserveMode : 'percent', reserveValue: Math.max(0, Number(conductor.reserveValue) || 0), note: conductor.note || '',
      })) : [],
    })) : [],
    checklist: Array.isArray(raw.checklist) ? raw.checklist.map((entry, index) => ({ id: entry.id || `review-${index}`, label: entry.label || FINAL_CHECKLIST[index] || '', status: ['pendiente', 'revisado', 'incluido', 'no-aplica'].includes(entry.status) ? entry.status : 'pendiente', note: entry.note || '' })) : base.checklist,
  };
};

export function applyTemplate(state, templateId) {
  const template = TEMPLATES.find(candidate => candidate.id === templateId);
  if (!template || state.templates.includes(templateId)) return state;
  const components = template.ids.map(componentId => {
    const catalogItem = COMPONENTS.find(item => item.id === componentId);
    if (!catalogItem) return null;
    return { id: createId(), componentId, label: catalogItem.label, category: catalogItem.category, specification: '', unit: catalogItem.unit, theoretical: 0, reserveMode: 'percent', reserveValue: 0, packageSize: 0, purchaseStep: 0, classification: catalogItem.classification, checklistStatus: 'pendiente', note: '', origin: template.name, routeId: '' };
  }).filter(Boolean);
  const nextMaterialNumber = Number(state.nextMaterialNumber) || state.components.length + 1;
  const identified = assignMissingMaterialIds(components, nextMaterialNumber);
  return { ...state, confirmedAt: null, nextMaterialNumber: nextMaterialNumber + identified.length, templates: [...state.templates, templateId], components: [...state.components, ...identified] };
}

export function createItemsFromTemplate(templateId, selectedComponentIds) {
  const template = TEMPLATES.find(candidate => candidate.id === templateId);
  if (!template) return [];
  const selected = new Set(selectedComponentIds);
  return template.ids
    .filter(componentId => selected.has(componentId))
    .map(componentId => COMPONENTS.find(item => item.id === componentId))
    .filter(Boolean)
    .map(item => ({
      description: item.label,
      category: item.category || 'Materiales',
      unit: item.unit || 'un',
      quantity: 0,
      unitPrice: 0,
      observations: `Plantilla: ${template.name}`,
      templateId,
      sourceComponentId: item.id,
    }));
}

export function removeTemplateMaterials(takeoff, templateId) {
  const template = TEMPLATES.find(candidate => candidate.id === templateId);
  if (!template) return { takeoff, removed: 0, protected: 0 };
  const templateComponentIds = new Set(template.ids);
  const matches = takeoff.components.filter(component => component.origin === template.name && templateComponentIds.has(component.componentId));
  const removable = new Set(matches.filter(component => (!component.destination || component.destination === 'solo_cubicacion') && !component.destinationRelations?.itemId && !component.destinationRelations?.finalBudgetId).map(component => component.id));
  const protectedCount = matches.length - removable.size;
  const nextTakeoff = {
    ...takeoff,
    confirmedAt: null,
    templates: protectedCount ? takeoff.templates : takeoff.templates.filter(id => id !== templateId),
    components: takeoff.components.filter(component => !removable.has(component.id)),
  };
  return { takeoff: nextTakeoff, removed: removable.size, protected: protectedCount };
}

export function resetTakeoff(takeoff) {
  const protectedComponents = takeoff.components.filter(component => (component.destination && component.destination !== 'solo_cubicacion') || component.destinationRelations?.itemId || component.destinationRelations?.finalBudgetId);
  if (protectedComponents.length) return { takeoff, removed: 0, protected: protectedComponents.length };
  const fresh = createTakeoffState();
  return { takeoff: { ...fresh, nextMaterialNumber: takeoff.nextMaterialNumber }, removed: takeoff.components.length, protected: 0 };
}

export function addMaterialToTakeoff(takeoff, component) {
  const nextNumber = Number(takeoff.nextMaterialNumber) || takeoff.components.length + 1;
  const [identified] = assignMissingMaterialIds([{ ...component, destination: component.destination || 'solo_cubicacion', workflowStatus: component.workflowStatus || 'pendiente', validationStatus: component.validationStatus || 'valido', destinationRelations: component.destinationRelations || { itemId: '', finalBudgetId: '' }, audit: component.audit || [] }], nextNumber);
  const numericId = Number(identified.materialId?.match(/MAT-(\d+)/)?.[1]) || nextNumber;
  return { ...takeoff, nextMaterialNumber: Math.max(nextNumber, numericId + 1), components: [...takeoff.components, identified], confirmedAt: null };
}

export function applyInstallationTypes(state, types) {
  const selected = [...new Set(types)].filter(type => INSTALLATION_TYPES.includes(type));
  const next = { ...state, installationTypes: selected };
  TEMPLATES.filter(template => template.types.some(type => selected.includes(type))).forEach(template => {
    Object.assign(next, applyTemplate(next, template.id));
  });
  return next;
}

export function applyReserve(quantity, mode, value) {
  const base = Math.max(0, Number(quantity) || 0);
  const reserveValue = Math.max(0, Number(value) || 0);
  const reserve = mode === 'absolute' ? reserveValue : base * reserveValue / 100;
  return { theoretical: base, reserve, adjusted: base + reserve };
}

export function purchaseQuantity(quantity, packageSize, purchaseStep, unit) {
  const amount = Math.max(0, Number(quantity) || 0);
  const pack = Math.max(0, Number(packageSize) || 0);
  const step = Math.max(0, Number(purchaseStep) || 0);
  if (pack > 0) return Math.ceil(amount / pack) * pack;
  if (step > 0) return Math.ceil(amount / step) * step;
  if (['un', 'pto', 'juego', 'set'].includes(String(unit).toLowerCase())) return Math.ceil(amount);
  return amount;
}

export function getComponentQuantities(component) {
  const reserve = applyReserve(component.theoretical, component.reserveMode, component.reserveValue);
  const purchase = purchaseQuantity(reserve.adjusted, component.packageSize, component.purchaseStep, component.unit);
  return { ...reserve, purchase };
}

export function calculateRoutes(routes) {
  const rows = [];
  routes.forEach(route => {
    if (route.length > 0 && route.system) {
      const channel = applyReserve(route.length, route.reserveMode, route.reserveValue);
      rows.push({ key: `route-${route.id}`, routeId: route.id, label: `Canalización ${route.from || ''} → ${route.to || ''}`.trim(), category: 'Canalización', specification: route.system, unit: 'm', ...channel, purchase: channel.adjusted, note: route.note || `Recorrido ingresado: ${route.length} m; reserva ${channel.reserve} m calculada según la política elegida.` });
    }
    route.conductors.forEach(conductor => {
      const quantity = (Number(conductor.length) || Number(route.length) || 0) * (Number(conductor.count) || 0) + (Number(conductor.pigtails) || 0);
      if (quantity <= 0) return;
      const reserved = applyReserve(quantity, conductor.reserveMode, conductor.reserveValue);
      rows.push({ key: `conductor-${route.id}-${conductor.id}`, routeId: route.id, label: `Conductor ${conductor.function}`, category: 'Conductores', specification: [conductor.type, conductor.section, conductor.color, conductor.insulation].filter(Boolean).join(' · '), unit: 'm', ...reserved, purchase: reserved.adjusted, note: `${conductor.length || route.length} m × ${conductor.count} conductor(es) + ${conductor.pigtails} m de chicotes. Sección, tipo y trazado deben ser definidos por el proyectista.` });
    });
  });
  return rows;
}

const normalize = value => String(value || '').trim().toLocaleLowerCase('es-CL').replace(/\s+/g, ' ');
export function consolidateComponents(components) {
  const map = new Map();
  components.forEach(component => {
    const quantity = getComponentQuantities(component);
    const key = [component.category, component.label, component.specification, component.unit, component.packageSize, component.purchaseStep].map(normalize).join('|');
    const existing = map.get(key);
    if (existing) {
      existing.theoretical += quantity.theoretical;
      existing.reserve += quantity.reserve;
      existing.adjusted += quantity.adjusted;
      existing.purchaseRaw += quantity.purchase;
      existing.origins.push(component.origin || 'Manual');
      existing.componentIds.push(component.id);
      return;
    }
    map.set(key, { key, category: component.category, label: component.label, specification: component.specification, unit: component.unit, theoretical: quantity.theoretical, reserve: quantity.reserve, adjusted: quantity.adjusted, purchaseRaw: quantity.purchase, packageSize: component.packageSize, purchaseStep: component.purchaseStep, origins: [component.origin || 'Manual'], componentIds: [component.id], classification: component.classification });
  });
  return [...map.values()].map(row => ({ ...row, purchase: purchaseQuantity(row.adjusted, row.packageSize, row.purchaseStep, row.unit) }));
}

export function buildChecklist(takeoff) {
  const entries = takeoff.checklist || [];
  const relevant = new Set(takeoff.components.map(component => normalize(component.category)));
  const labels = new Set(takeoff.components.map(component => normalize(component.label)));
  return entries.map(entry => ({ ...entry, relevant: relevant.has(normalize(entry.label)) || labels.has(normalize(entry.label)) || entry.status !== 'pendiente' }));
}

export function createComponentFromCatalog(item) {
  return { id: createId(), materialId: '', componentId: item.id, label: item.label, category: item.category, specification: '', unit: item.unit, theoretical: 0, reserveMode: 'percent', reserveValue: 0, packageSize: 0, purchaseStep: 0, classification: item.classification, checklistStatus: 'pendiente', note: '', origin: 'Catálogo manual', routeId: '', destination: 'solo_cubicacion', workflowStatus: 'pendiente', validationStatus: 'valido', destinationRelations: { itemId: '', finalBudgetId: '' }, audit: [] };
}

export function validateMaterial(component, components = []) {
  const errors = [];
  const warnings = [];
  if (!String(component.label || '').trim()) errors.push('Falta descripción.');
  if (!String(component.unit || '').trim()) errors.push('Falta unidad.');
  if (!String(component.category || '').trim()) errors.push('Falta categoría.');
  if (!Number.isFinite(Number(component.theoretical)) || Number(component.theoretical) < 0) errors.push('La cantidad teórica debe ser numérica y no negativa.');
  const quantities = getComponentQuantities(component);
  if (DESTINATIONS.includes(component.destination) && component.destination !== 'solo_cubicacion' && quantities.purchase <= 0) errors.push('La cantidad de compra debe ser mayor que cero para enviar a un destino.');
  if (!String(component.materialId || '').trim()) errors.push('Falta identificador único.');
  if (!DESTINATIONS.includes(component.destination || 'solo_cubicacion')) errors.push('El destino no es válido.');
  if (component.materialId && components.some(other => other.id !== component.id && other.materialId === component.materialId)) errors.push('El identificador de material está duplicado.');
  if (!String(component.specification || '').trim()) warnings.push('Falta especificación comercial.');
  if (!String(component.origin || '').trim()) warnings.push('Origen no identificado.');
  if (!String(component.note || '').trim()) warnings.push('Material sin observación.');
  const duplicateKey = [component.category, component.label, component.specification, component.unit, component.packageSize, component.purchaseStep].map(value => String(value || '').trim().toLocaleLowerCase('es-CL')).join('|');
  if (components.some(other => other.id !== component.id && [other.category, other.label, other.specification, other.unit, other.packageSize, other.purchaseStep].map(value => String(value || '').trim().toLocaleLowerCase('es-CL')).join('|') === duplicateKey)) warnings.push('Posible duplicado; se mantiene separado hasta confirmar.');
  return { status: errors.length ? 'error' : warnings.length ? 'advertencia' : 'valido', errors, warnings };
}

export function validateDestinationBatch(components, selectedIds, destination) {
  const selected = components.filter(component => selectedIds.includes(component.id));
  const results = selected.map(component => ({ component, validation: validateMaterial({ ...component, destination }, components) }));
  return {
    selected: selected.length,
    valid: results.filter(result => result.validation.status !== 'error').length,
    warnings: results.filter(result => result.validation.status === 'advertencia').length,
    errors: results.filter(result => result.validation.status === 'error').length,
    results,
  };
}

function makeDestinationRow(component, quantity, existingId, kind) {
  const rowId = existingId || allocateRelationId(kind === 'item' ? 'PART' : 'PRES');
  const observations = [component.specification, `Material ${component.materialId}; teórica ${quantity.theoretical} ${component.unit}; reserva ${quantity.reserve} ${component.unit}; ajustada ${quantity.adjusted} ${component.unit}; compra ${quantity.purchase} ${component.unit}.`, `Origen: ${component.origin || 'No identificado'}`, component.note].filter(Boolean).join(' · ');
  return { id: rowId, sourceMaterialId: component.materialId, description: component.label, category: component.category || 'Materiales', unit: component.unit, quantity: quantity.purchase, unitPrice: 0, observations, specification: component.specification || '', origin: component.origin || '', quantityTheoretical: quantity.theoretical, reserve: quantity.reserve, quantityAdjusted: quantity.adjusted };
}

export function applyDestinationBatch(data, selectedIds, destination, { onlyValid = false, confirmed = false, now = new Date().toISOString() } = {}) {
  if (!confirmed) return { data, applied: [], blocked: selectedIds, error: 'La acción requiere confirmación explícita.' };
  if (!DESTINATIONS.includes(destination)) return { data, applied: [], blocked: selectedIds, error: 'El destino seleccionado no es válido.' };
  const validation = validateDestinationBatch(data.takeoff.components, selectedIds, destination);
  if (validation.errors && !onlyValid) return { data, applied: [], blocked: validation.results.filter(item => item.validation.status === 'error').map(item => item.component.id), error: 'Hay materiales con errores bloqueantes.' };
  const eligible = validation.results.filter(item => item.validation.status !== 'error');
  const eligibleIds = new Set(eligible.map(item => item.component.id));
  if (eligible.length === 0) return { data, applied: [], blocked: selectedIds, error: 'No hay materiales válidos para procesar.' };

  const eligibleMaterialIds = new Set(eligible.map(item => item.component.materialId));
  const nextItems = data.items.filter(item => !eligibleMaterialIds.has(item.sourceMaterialId));
  const nextFinalBudget = (data.finalBudget || []).filter(item => !eligibleMaterialIds.has(item.sourceMaterialId));
  const replacements = new Map();
  for (const { component, validation: itemValidation } of eligible) {
    const quantity = getComponentQuantities(component);
    const wantsItem = ['partida', 'ambos'].includes(destination);
    const wantsFinal = ['presupuesto_final', 'ambos'].includes(destination);
    const oldItem = data.items.find(item => item.id === component.destinationRelations?.itemId);
    const oldFinal = (data.finalBudget || []).find(item => item.id === component.destinationRelations?.finalBudgetId);
    const itemRow = wantsItem ? { ...oldItem, ...makeDestinationRow(component, quantity, component.destinationRelations?.itemId, 'item'), unitPrice: oldItem?.unitPrice ?? 0 } : null;
    const finalRow = wantsFinal ? { ...oldFinal, ...makeDestinationRow(component, quantity, component.destinationRelations?.finalBudgetId, 'final'), unitPrice: oldFinal?.unitPrice ?? 0 } : null;
    if (itemRow) nextItems.push(itemRow);
    if (finalRow) nextFinalBudget.push(finalRow);
    replacements.set(component.id, {
      ...component,
      destination,
      workflowStatus: 'enviado',
      validationStatus: itemValidation.status,
      destinationRelations: { itemId: itemRow?.id || '', finalBudgetId: finalRow?.id || '' },
      audit: [...(component.audit || []), { at: now, action: 'cambio_destino', materialId: component.materialId, from: component.destination || 'solo_cubicacion', to: destination, workflowFrom: component.workflowStatus || 'pendiente', workflowTo: 'enviado', origin: component.origin || '' }],
    });
  }
  return {
    data: { ...data, items: nextItems, finalBudget: nextFinalBudget, takeoff: { ...data.takeoff, confirmedAt: null, components: data.takeoff.components.map(component => replacements.get(component.id) || component) } },
    applied: [...eligibleIds],
    blocked: validation.results.filter(item => item.validation.status === 'error').map(item => item.component.id),
    error: '',
  };
}

export function confirmTakeoffState(takeoff, components = takeoff.components, now = new Date().toISOString()) {
  const validation = summarizeWorkflow(components);
  if (validation.errors) return { takeoff, error: `${validation.errors} error(es) bloqueante(s).` };
  return {
    takeoff: {
      ...takeoff,
      confirmedAt: now,
      components: components.map(component => ({ ...component, workflowStatus: 'confirmado', audit: [...(component.audit || []), { at: now, action: 'confirmacion_cubicacion', materialId: component.materialId, origin: component.origin || '' }] })),
    },
    error: '',
  };
}

export function recordMaterialEdit(data, componentId, patch, now = new Date().toISOString()) {
  const component = data.takeoff.components.find(item => item.id === componentId);
  if (!component) return data;
  const quantity = getComponentQuantities({ ...component, ...patch });
  const updatedSource = { ...component, ...patch, workflowStatus: ['enviado', 'confirmado'].includes(component.workflowStatus) ? 'modificado' : component.workflowStatus, validationStatus: 'valido', audit: [...(component.audit || []), { at: now, action: 'edicion_material', materialId: component.materialId, origin: component.origin || '' }] };
  const updateLinked = rows => rows.map(row => row.sourceMaterialId === component.materialId ? { ...row, description: updatedSource.label, category: updatedSource.category, unit: updatedSource.unit, quantity: quantity.purchase, observations: [updatedSource.specification, `Material ${updatedSource.materialId}; teórica ${quantity.theoretical} ${updatedSource.unit}; reserva ${quantity.reserve} ${updatedSource.unit}; ajustada ${quantity.adjusted} ${updatedSource.unit}; compra ${quantity.purchase} ${updatedSource.unit}.`, `Origen: ${updatedSource.origin || 'No identificado'}`, updatedSource.note].filter(Boolean).join(' · ') } : row);
  return {
    ...data,
    items: updateLinked(data.items),
    finalBudget: updateLinked(data.finalBudget || []),
    takeoff: { ...data.takeoff, confirmedAt: null, components: data.takeoff.components.map(item => item.id === componentId ? updatedSource : item) },
  };
}

export function summarizeWorkflow(components) {
  const validations = components.map(component => validateMaterial(component, components));
  return {
    total: components.length,
    pending: components.filter(component => component.workflowStatus === 'pendiente').length,
    reviewed: components.filter(component => ['revisado', 'asignado', 'listo_para_enviar'].includes(component.workflowStatus)).length,
    warnings: validations.filter(result => result.status === 'advertencia').length,
    errors: validations.filter(result => result.status === 'error').length,
    destinations: Object.fromEntries(DESTINATIONS.map(destination => [destination, components.filter(component => component.destination === destination).length])),
    sent: components.filter(component => component.workflowStatus === 'enviado').length,
    confirmed: components.filter(component => component.workflowStatus === 'confirmado').length,
  };
}

export { COMPONENTS, FINAL_CHECKLIST, INSTALLATION_TYPES, TEMPLATES };
