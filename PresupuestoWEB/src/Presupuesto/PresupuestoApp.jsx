import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpenCheck,
  BriefcaseBusiness,
  Calculator,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FilePlus2,
  HardHat,
  ImagePlus,
  Moon,
  Plus,
  Printer,
  Search,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react';
import { addMaterialToTakeoff, applyDestinationBatch, calculateRoutes, consolidateComponents, confirmTakeoffState, createComponentFromCatalog, createItemsFromTemplate, createTakeoffState, getComponentQuantities, migrateTakeoffState, recordMaterialEdit, resetTakeoff, applyReserve, summarizeWorkflow, validateDestinationBatch, validateMaterial, COMPONENTS, DESTINATIONS, INSTALLATION_TYPES, TEMPLATES } from './cubicacion.js';
import './PresupuestoApp.css';
import './Cubicacion.css';
import './TakeoffUX.css';
import './PresupuestoDark.css';

const STORAGE_KEY = 'presupuesto-electrico-draft-v1';
const money = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const qtyFormat = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const today = new Date().toISOString().slice(0, 10);

const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const defaultData = () => ({
  company: { name: '', subtitle: '', rut: '', responsibleName: '', phone: '', email: '' },
  client: { name: '', rut: '', phone: '', email: '', projectAddress: '', projectName: '' },
  budget: { quotationNumber: 'COT-001', issueDate: today, validityDays: 15, workType: '', taxRate: 19, notes: ['Precios expresados en pesos chilenos (CLP).', 'Valores netos; IVA se agrega al final.', 'Alcance sujeto a revisión en terreno y planos aprobados.'] },
  items: [],
  finalBudget: [],
  measurements: { circuits: [], rooms: [] },
  takeoff: createTakeoffState(),
  logo: '',
});

function loadDraft() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultData();
    return normalizeData(JSON.parse(saved));
  } catch {
    return defaultData();
  }
}

function normalizeData(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1 || !raw.data || typeof raw.data !== 'object') {
    throw new Error('El archivo no tiene el formato de presupuesto esperado (versión 1).');
  }
  const data = raw.data;
  if (!data.company || !data.client || !data.budget || !Array.isArray(data.items) || !data.measurements) {
    throw new Error('El JSON no contiene los datos requeridos de empresa, cliente, Items y cubicación.');
  }
  if (data.items.some(item => !item || typeof item.description !== 'string' || !Number.isFinite(Number(item.quantity)) || !Number.isFinite(Number(item.unitPrice)))) {
    throw new Error('Hay Items con descripción o cantidades/precios inválidos.');
  }
  const base = defaultData();
  return {
    ...base,
    ...data,
    company: { ...base.company, ...data.company },
    client: { ...base.client, ...data.client },
    budget: { ...base.budget, ...data.budget, notes: Array.isArray(data.budget.notes) ? data.budget.notes : base.budget.notes },
    items: data.items.map(item => ({ id: item.id || createId(), category: 'Materiales', unit: 'un', quantity: 0, unitPrice: 0, observations: '', ...item })),
    finalBudget: Array.isArray(data.finalBudget) ? data.finalBudget.map(item => ({ id: item.id || createId(), category: 'Materiales', unit: 'un', quantity: 0, unitPrice: 0, observations: '', ...item })) : [],
    measurements: { ...base.measurements, ...data.measurements, circuits: Array.isArray(data.measurements.circuits) ? data.measurements.circuits : [], rooms: Array.isArray(data.measurements.rooms) ? data.measurements.rooms : [] },
    takeoff: migrateTakeoffState(data.takeoff),
    logo: typeof data.logo === 'string' ? data.logo : '',
  };
}

function Field({ label, value, onChange, type = 'text', placeholder, min, step, help, required = false }) {
  return (
    <label className="form-field">
      <span>{label}{required && <b className="required-mark"> *</b>}</span>
      {help && <small>{help}</small>}
      <input type={type} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} min={min} step={step} required={required} />
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, rows = 3 }) {
  return <label className="form-field"><span>{label}</span><textarea rows={rows} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

const sectionTitles = {
  details: ['Datos del proyecto', 'Identificación, cliente y condiciones comerciales'],
  takeoff: ['Cubicación asistida', 'Ingresa medidas levantadas; revisa cada supuesto antes de pasar a la cotización.'],
  items: ['Items y precios', 'Edita cantidades, unidades y precios netos. Los importes se actualizan al instante.'],
  preview: ['Vista previa A4', 'Documento listo para imprimir o guardar como PDF.'],
};

export default function PresupuestoApp() {
  const [data, setData] = useState(loadDraft);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('volt_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [activeSection, setActiveSection] = useState('details');
  const [notice, setNotice] = useState('');
  const [draftSaved, setDraftSaved] = useState(true);
  const importRef = useRef(null);
  const logoRef = useRef(null);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('Todas');
  const [templateQuery, setTemplateQuery] = useState('');
  const [takeoffView, setTakeoffView] = useState(() => ['plantillas', 'rutas', 'materiales', 'ric'].includes(localStorage.getItem('volt_takeoff_view')) ? localStorage.getItem('volt_takeoff_view') : 'plantillas');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedTemplateComponents, setSelectedTemplateComponents] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [destinationChoice, setDestinationChoice] = useState('partida');
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [pendingDeletion, setPendingDeletion] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('volt_theme', theme);
    } catch {
      // El tema sigue funcionando durante esta sesión aunque el almacenamiento esté bloqueado.
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data }));
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
      setNotice('No se pudo guardar en este navegador. Exporta una copia JSON para evitar perder los cambios.');
    }
  }, [data]);

  const subtotal = useMemo(() => [...data.items, ...data.finalBudget].reduce((sum, item) => sum + Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0), [data.items, data.finalBudget]);
  const printableItems = useMemo(() => [...data.items, ...data.finalBudget].filter(item => !(item.sourceMaterialId && data.items.some(part => part.sourceMaterialId === item.sourceMaterialId))), [data.items, data.finalBudget]);
  const tax = Math.round((subtotal * (Number(data.budget.taxRate) || 0)) / 100);
  const total = subtotal + tax;

  const setSection = (section, key, value) => setData(current => ({ ...current, [section]: { ...current[section], [key]: value } }));
  const setBudgetField = (key, value) => setSection('budget', key, value);
  const updateItem = (id, key, value) => setData(current => ({ ...current, items: current.items.map(item => item.id === id ? { ...item, [key]: ['quantity', 'unitPrice'].includes(key) ? value === '' ? '' : Math.max(0, Number(value) || 0) : value } : item) }));
  const addItem = (values = {}) => setData(current => ({ ...current, items: [...current.items, { id: createId(), description: '', category: 'Materiales', unit: 'un', quantity: 1, unitPrice: 0, observations: '', ...values }] }));
  const deleteItem = id => setData(current => {
    const item = current.items.find(row => row.id === id);
    return { ...current, items: current.items.filter(row => row.id !== id), takeoff: item?.sourceMaterialId ? { ...current.takeoff, components: current.takeoff.components.map(component => component.materialId === item.sourceMaterialId ? { ...component, destinationRelations: { ...component.destinationRelations, itemId: '' }, destination: component.destination === 'ambos' ? (component.destinationRelations.finalBudgetId ? 'presupuesto_final' : 'solo_cubicacion') : 'solo_cubicacion' } : component) } : current.takeoff };
  });
  const updateFinalBudgetItem = (id, key, value) => setData(current => ({ ...current, finalBudget: current.finalBudget.map(item => item.id === id ? { ...item, [key]: ['quantity', 'unitPrice'].includes(key) ? value === '' ? '' : Math.max(0, Number(value) || 0) : value } : item) }));
  const deleteFinalBudgetItem = id => {
    if (!window.confirm('¿Eliminar esta línea del presupuesto final? El material fuente en Cubicación se conservará.')) return;
    setData(current => {
      const item = current.finalBudget.find(row => row.id === id);
      return { ...current, finalBudget: current.finalBudget.filter(row => row.id !== id), takeoff: item?.sourceMaterialId ? { ...current.takeoff, components: current.takeoff.components.map(component => component.materialId === item.sourceMaterialId ? { ...component, destinationRelations: { ...component.destinationRelations, finalBudgetId: '' }, destination: component.destination === 'ambos' ? (component.destinationRelations.itemId ? 'partida' : 'solo_cubicacion') : 'solo_cubicacion' } : component) } : current.takeoff };
    });
  };
  const updateMeasurement = (group, id, key, value) => setData(current => ({ ...current, measurements: { ...current.measurements, [group]: current.measurements[group].map(row => row.id === id ? { ...row, [key]: ['length', 'conductors', 'reserve', 'lights', 'outlets', 'equipment', 'routeLength', 'metersPerLight', 'metersPerOutlet', 'metersPerEquipment'].includes(key) ? value === '' ? '' : Math.max(0, Number(value) || 0) : value } : row) } }));
  const addMeasurement = group => setData(current => ({ ...current, measurements: { ...current.measurements, [group]: [...current.measurements[group], group === 'circuits' ? { id: createId(), name: '', length: 0, conductors: 3, reserve: 10 } : { id: createId(), name: '', lights: 0, outlets: 0, equipment: 0, routeLength: 0, metersPerLight: 2, metersPerOutlet: 2, metersPerEquipment: 3, reserve: 10 }] } }));
  const deleteMeasurement = (group, id) => setData(current => ({ ...current, measurements: { ...current.measurements, [group]: current.measurements[group].filter(row => row.id !== id) } }));

  const updateTakeoff = updater => setData(current => ({ ...current, takeoff: typeof updater === 'function' ? updater(current.takeoff) : updater }));
  const addCatalogComponent = item => updateTakeoff(state => addMaterialToTakeoff(state, createComponentFromCatalog(item)));
  const updateTakeoffComponent = (id, key, value) => setData(current => {
    const component = current.takeoff.components.find(item => item.id === id);
    if (!component) return current;
    const normalized = ['theoretical', 'reserveValue', 'packageSize', 'purchaseStep'].includes(key) ? value === '' ? '' : Math.max(0, Number(value) || 0) : value;
    return recordMaterialEdit(current, id, { [key]: normalized }, new Date().toISOString());
  });
  const updateRoute = (id, key, value) => updateTakeoff(state => ({ ...state, confirmedAt: null, routes: state.routes.map(route => route.id === id ? { ...route, [key]: key === 'length' || key === 'reserveValue' ? value === '' ? '' : Math.max(0, Number(value) || 0) : value } : route) }));
  const addRoute = () => updateTakeoff(state => ({ ...state, confirmedAt: null, routes: [...state.routes, { id: createId(), from: '', to: '', system: '', name: '', length: 0, reserveMode: 'percent', reserveValue: 0, note: '', conductors: [] }] }));
  const updateRouteConductor = (routeId, conductorId, key, value) => updateTakeoff(state => ({ ...state, confirmedAt: null, routes: state.routes.map(route => route.id === routeId ? { ...route, conductors: route.conductors.map(conductor => conductor.id === conductorId ? { ...conductor, [key]: ['count', 'length', 'pigtails', 'reserveValue'].includes(key) ? value === '' ? '' : Math.max(0, Number(value) || 0) : value } : conductor) } : route) }));
  const addRouteConductor = routeId => updateTakeoff(state => ({ ...state, confirmedAt: null, routes: state.routes.map(route => route.id === routeId ? { ...route, conductors: [...route.conductors, { id: createId(), function: 'Fase', type: '', section: '', count: 1, length: route.length, color: '', insulation: '', pigtails: 0, reserveMode: 'percent', reserveValue: 0, note: '' }] } : route) }));
  const addRouteMaterialToTakeoff = row => updateTakeoff(state => addMaterialToTakeoff(state, { id: createId(), componentId: '', label: row.label, category: row.category, specification: row.specification, unit: row.unit, theoretical: row.theoretical, reserveMode: 'absolute', reserveValue: row.reserve, packageSize: 0, purchaseStep: 0, classification: 'SEGÚN DISEÑO', checklistStatus: 'incluido', note: row.note, origin: `Recorrido ${data.takeoff.routes.find(route => route.id === row.routeId)?.name || row.routeId}`, routeId: row.routeId }));
  const changeInstallationTypes = (type, checked) => updateTakeoff(state => ({ ...state, installationTypes: checked ? [...new Set([...state.installationTypes, type])] : state.installationTypes.filter(item => item !== type), confirmedAt: null }));
  const openTemplate = templateId => {
    const template = TEMPLATES.find(item => item.id === templateId);
    if (!template) return;
    setSelectedTemplate(template);
    setSelectedTemplateComponents([]);
  };
  const cancelTemplateSelection = () => {
    setSelectedTemplate(null);
    setSelectedTemplateComponents([]);
  };
  const confirmTemplateSelection = () => {
    if (!selectedTemplate || selectedTemplateComponents.length === 0) {
      setNotice('Selecciona al menos un elemento de la plantilla.');
      return;
    }
    const newItems = createItemsFromTemplate(selectedTemplate.id, selectedTemplateComponents).map(item => ({ id: createId(), ...item }));
    if (!newItems.length) {
      setNotice('No se encontraron elementos válidos para agregar.');
      return;
    }
    const existingKeys = new Set(data.items.map(item => `${item.category}|${item.description.trim().toLocaleLowerCase('es-CL')}|${item.unit.trim().toLocaleLowerCase('es-CL')}`));
    const duplicates = newItems.filter(item => existingKeys.has(`${item.category}|${item.description.trim().toLocaleLowerCase('es-CL')}|${item.unit.trim().toLocaleLowerCase('es-CL')}`));
    if (duplicates.length && !window.confirm(`${duplicates.length} elemento(s) ya existen en Items. ¿Quieres agregarlos igualmente como líneas separadas?`)) return;
    setData(current => ({ ...current, items: [...current.items, ...newItems] }));
    const templateName = selectedTemplate.name;
    setActiveSection('items');
    cancelTemplateSelection();
    setNotice(`${newItems.length} elemento(s) de “${templateName}” agregado(s) a Items. Completa cantidades y precios.`);
  };
  const resetTakeoffWorkspace = () => {
    if (!window.confirm('¿Restablecer la Cubicación? Se quitarán plantillas, materiales, recorridos y checklist sin destinos. Los materiales ya enviados no se eliminarán.')) return;
    const result = resetTakeoff(data.takeoff);
    if (result.protected) { setNotice(`${result.protected} material(es) tienen destinos activos. No se reinició para proteger Items y Presupuesto final; retira esos destinos y vuelve a intentar.`); return; }
    setData(current => ({ ...current, takeoff: result.takeoff }));
    cancelTemplateSelection();
    setTakeoffView('plantillas');
    setNotice(`Cubicación restablecida. Se retiraron ${result.removed} materiales sin destino.`);
  };
  const removeTakeoffComponent = id => {
    const component = data.takeoff.components.find(item => item.id === id);
    if (!component) return;
    setPendingDeletion(component);
  };
  const confirmMaterialDeletion = () => {
    if (!pendingDeletion) return;
    updateTakeoff(state => ({ ...state, confirmedAt: null, components: state.components.filter(item => item.id !== pendingDeletion.id) }));
    setSelectedMaterials(current => current.filter(itemId => itemId !== pendingDeletion.id));
    setPendingDeletion(null);
  };
  const takeoffConsolidated = useMemo(() => consolidateComponents(data.takeoff.components), [data.takeoff.components]);
  const routeMaterials = useMemo(() => calculateRoutes(data.takeoff.routes), [data.takeoff.routes]);
  const workflowSummary = useMemo(() => summarizeWorkflow(data.takeoff.components), [data.takeoff.components]);
  const visibleCatalog = COMPONENTS.filter(item => (catalogCategory === 'Todas' || item.category === catalogCategory) && `${item.label} ${item.category}`.toLowerCase().includes(catalogQuery.toLowerCase()));
  const visibleTemplates = TEMPLATES.filter(template => template.name.toLowerCase().includes(templateQuery.toLowerCase()));
  const catalogCategories = ['Todas', ...new Set(COMPONENTS.map(item => item.category))];

  const calculatedMaterials = useMemo(() => {
    const rows = [];
    data.measurements.circuits.forEach(circuit => {
      const route = Number(circuit.length) || 0;
      const factor = 1 + (Number(circuit.reserve) || 0) / 100;
      if (route > 0) {
        rows.push({ key: `cable-${circuit.id}`, description: `Conductores circuito ${circuit.name || 'sin nombre'}`, unit: 'm', quantity: route * factor * (Number(circuit.conductors) || 0), observations: `Cubicación: ${qtyFormat.format(route)} m de ruta × ${Number(circuit.conductors) || 0} conductores × ${qtyFormat.format(factor)} (reserva ${Number(circuit.reserve) || 0}%). Confirmar trazado y conductores en planos.` });
        rows.push({ key: `duct-${circuit.id}`, description: `Canalización circuito ${circuit.name || 'sin nombre'}`, unit: 'm', quantity: route * factor, observations: `Cubicación: ruta medida ${qtyFormat.format(route)} m × ${qtyFormat.format(factor)} (reserva ${Number(circuit.reserve) || 0}%).` });
      }
    });
    data.measurements.rooms.forEach(room => {
      const counts = [
        ['Luminarias', Number(room.lights) || 0, Number(room.metersPerLight) || 0],
        ['Enchufes', Number(room.outlets) || 0, Number(room.metersPerOutlet) || 0],
        ['Equipos', Number(room.equipment) || 0, Number(room.metersPerEquipment) || 0],
      ];
      const points = counts.reduce((sum, [, count]) => sum + count, 0);
      const baseLength = (Number(room.routeLength) || 0) + counts.reduce((sum, [, count, meters]) => sum + count * meters, 0);
      const reserve = Number(room.reserve) || 0;
      const length = baseLength * (1 + reserve / 100);
      if (points > 0) {
        rows.push({ key: `points-${room.id}`, description: `Puntos eléctricos — ${room.name || 'recinto sin nombre'}`, unit: 'pto', quantity: points, observations: counts.filter(([, count]) => count).map(([label, count]) => `${count} ${label.toLowerCase()}`).join(', ') + '. Cantidad de puntos indicada por usuario; no define conductor ni protección.' });
        rows.push({ key: `cable-room-${room.id}`, description: `Metraje referencial de conductores — ${room.name || 'recinto sin nombre'}`, unit: 'm', quantity: length, observations: `${qtyFormat.format(Number(room.routeLength) || 0)} m de recorrido + consumos configurables por punto + ${reserve}% de reserva. Supuesto referencial editable; verificar en terreno.` });
        rows.push({ key: `duct-room-${room.id}`, description: `Canalización — ${room.name || 'recinto sin nombre'}`, unit: 'm', quantity: length, observations: `Recorrido y consumos referenciales configurables con ${reserve}% de reserva; revisar rutas y planos.` });
      }
    });
    return rows;
  }, [data.measurements]);

  const addCalculatedRow = row => addItem({ description: row.description, unit: row.unit, quantity: Math.round(row.quantity * 100) / 100, observations: row.observations, category: 'Materiales' });
  const requestDestinationChange = (materialIds, destination) => {
    if (!materialIds.length) { setNotice('Selecciona al menos un material.'); return; }
    const validation = validateDestinationBatch(data.takeoff.components, materialIds, destination);
    setPendingTransfer({ materialIds, destination, validation, onlyValid: false });
  };
  const confirmDestinationChange = onlyValid => {
    if (!pendingTransfer) return;
    const result = applyDestinationBatch(data, pendingTransfer.materialIds, pendingTransfer.destination, { onlyValid, confirmed: true });
    if (result.error) { setNotice(`${result.error} La Cubicación original se conserva sin cambios.`); setPendingTransfer(null); return; }
    setData(result.data);
    setSelectedMaterials(current => current.filter(id => !result.applied.includes(id)));
    setPendingTransfer(null);
    setNotice(`${result.applied.length} material(es) procesados. Revisa Items y el presupuesto final.`);
  };
  const requestSingleDestination = (component, destination) => {
    const validation = validateDestinationBatch(data.takeoff.components, [component.id], destination);
    setPendingTransfer({ materialIds: [component.id], destination, validation, onlyValid: false, single: true });
  };
  const confirmTakeoff = () => {
    if (workflowSummary.errors) { setNotice(`La cubicación tiene ${workflowSummary.errors} error(es) bloqueante(s); corrígelos antes de confirmar.`); return; }
    updateTakeoff(state => confirmTakeoffState(state).takeoff);
    setNotice('Cubicación confirmada.');
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ app: 'Cubicador eléctrico local', version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(data.budget.quotationNumber || 'presupuesto').replace(/[^a-z0-9-_]/gi, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Copia JSON descargada.');
  };
  const importJson = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const imported = normalizeData(JSON.parse(await file.text()));
      setData(imported);
      setNotice('Presupuesto importado y guardado localmente.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo leer el archivo JSON.');
    }
  };
  const newBudget = () => {
    if (!window.confirm('¿Crear un presupuesto nuevo? Se reemplazará el borrador local actual. Descarga una copia JSON si necesitas conservarlo.')) return;
    setData(defaultData());
    setActiveSection('details');
    setNotice('Presupuesto nuevo creado.');
  };
  const handleLogo = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 1_500_000) { setNotice('El logo debe pesar menos de 1,5 MB para guardarlo en el navegador.'); return; }
    const reader = new FileReader();
    reader.onload = () => setData(current => ({ ...current, logo: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const navItems = [
    { id: 'details', label: 'Proyecto', icon: BriefcaseBusiness },
    { id: 'takeoff', label: 'Cubicación', icon: Calculator },
    { id: 'items', label: 'Items', icon: ClipboardList },
    { id: 'preview', label: 'Vista A4', icon: Printer },
  ];

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="app-topbar no-print">
        <a className="brand" href="#inicio" aria-label="Inicio"><span className="brand-icon"><Zap size={21} fill="currentColor" /></span><span><strong>Volt</strong><small>Presupuestos eléctricos</small></span></a>
        <div className="topbar-actions">
          <span className={`save-indicator ${draftSaved ? '' : 'save-error'}`}><Save size={15} />{draftSaved ? 'Guardado local' : 'Pendiente de respaldo'}</span>
          <button className="button button-quiet theme-toggle" type="button" onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Cambiar a modo normal' : 'Cambiar a modo nocturno'} title={theme === 'dark' ? 'Modo normal' : 'Modo nocturno'}><span className="theme-toggle-icon">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</span><span className="theme-toggle-label">{theme === 'dark' ? 'Modo normal' : 'Modo nocturno'}</span></button>
          <button className="button button-quiet" type="button" onClick={() => importRef.current?.click()}><ArrowUpFromLine size={17} />Importar JSON</button>
          <button className="button button-quiet" type="button" onClick={exportJson}><ArrowDownToLine size={17} />Exportar</button>
          <button className="button button-primary" type="button" onClick={() => window.print()}><Printer size={17} />Imprimir A4</button>
        </div>
        <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importJson} />
        <input ref={logoRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} />
      </header>

      <div className="page-heading no-print">
        <div><p className="eyebrow">GESTIÓN DE OBRA · CHILE</p><h1>Presupuesto eléctrico</h1><p className="heading-subtitle">Mide con criterio. Cotiza con claridad.</p></div>
        <button className="button button-outline" type="button" onClick={newBudget}><FilePlus2 size={17} />Nuevo presupuesto</button>
      </div>

      <nav className="section-nav no-print" aria-label="Secciones del presupuesto">
        {navItems.map((item, index) => <button key={item.id} type="button" className={`nav-step ${activeSection === item.id ? 'active' : ''} ${navItems.findIndex(navItem => navItem.id === activeSection) > index ? 'complete' : ''}`} onClick={() => setActiveSection(item.id)}><span className="step-icon"><item.icon size={17} /></span><span className="step-label">{item.label}</span><ChevronRight size={15} className="step-chevron" /></button>)}
      </nav>

      {notice && <div className="notice no-print" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Cerrar aviso">×</button></div>}

      <main className={`workspace ${activeSection === 'preview' ? 'preview-workspace' : ''}`}>
        <section className="editor-panel no-print" hidden={activeSection !== 'details'}>
          <div className="panel-heading"><div><p className="eyebrow">PASO 1 DE 4</p><h2>{sectionTitles.details[0]}</h2><p>{sectionTitles.details[1]}</p></div><span className="heading-badge"><BriefcaseBusiness size={17} />Datos base</span></div>
          <div className="form-section">
            <div className="subsection-title"><span className="subsection-icon"><Zap size={17} /></span><div><h3>Empresa cotizante</h3><p>Estos datos aparecen en el documento final.</p></div></div>
            <div className="logo-row"><button type="button" className="logo-upload" onClick={() => logoRef.current?.click()}>{data.logo ? <img src={data.logo} alt="Logo de empresa" /> : <ImagePlus size={22} />}<span>{data.logo ? 'Cambiar logo' : 'Agregar logo'}</span></button><div className="form-grid three"><Field label="Razón social" value={data.company.name} onChange={v => setSection('company', 'name', v)} placeholder="Nombre de la empresa" /><Field label="RUT empresa" value={data.company.rut} onChange={v => setSection('company', 'rut', v)} placeholder="76.123.456-7" /><Field label="Nombre comercial / especialidad" value={data.company.subtitle} onChange={v => setSection('company', 'subtitle', v)} placeholder="Instalaciones eléctricas" /><Field label="Responsable" value={data.company.responsibleName} onChange={v => setSection('company', 'responsibleName', v)} placeholder="Nombre y apellido" /><Field label="Teléfono" value={data.company.phone} onChange={v => setSection('company', 'phone', v)} type="tel" placeholder="+56 9 ..." /><Field label="Correo" value={data.company.email} onChange={v => setSection('company', 'email', v)} type="email" placeholder="contacto@empresa.cl" /></div></div>
          </div>
          <div className="form-section">
            <div className="subsection-title"><span className="subsection-icon"><HardHat size={17} /></span><div><h3>Cliente y obra</h3><p>Identifica claramente el mandante y la ubicación del trabajo.</p></div></div>
            <div className="form-grid three"><Field label="Cliente / razón social" value={data.client.name} onChange={v => setSection('client', 'name', v)} placeholder="Nombre del cliente" /><Field label="RUT cliente" value={data.client.rut} onChange={v => setSection('client', 'rut', v)} placeholder="Opcional" /><Field label="Nombre del proyecto" value={data.client.projectName} onChange={v => setSection('client', 'projectName', v)} placeholder="Ej. Adecuación local comercial" /><Field label="Dirección de obra" value={data.client.projectAddress} onChange={v => setSection('client', 'projectAddress', v)} placeholder="Calle, comuna, región" /><Field label="Teléfono" value={data.client.phone} onChange={v => setSection('client', 'phone', v)} type="tel" placeholder="Contacto de obra" /><Field label="Correo" value={data.client.email} onChange={v => setSection('client', 'email', v)} type="email" placeholder="cliente@correo.cl" /></div>
          </div>
          <div className="form-section">
            <div className="subsection-title"><span className="subsection-icon"><ClipboardList size={17} /></span><div><h3>Datos de la cotización</h3><p>Control documental y condiciones comerciales.</p></div></div>
            <div className="form-grid three"><Field label="N.º de presupuesto" value={data.budget.quotationNumber} onChange={v => setBudgetField('quotationNumber', v)} placeholder="COT-001" /><Field label="Fecha de emisión" value={data.budget.issueDate} onChange={v => setBudgetField('issueDate', v)} type="date" /><Field label="Validez (días)" value={data.budget.validityDays} onChange={v => setBudgetField('validityDays', v)} type="number" min="0" step="1" /><Field label="Tipo de trabajo" value={data.budget.workType} onChange={v => setBudgetField('workType', v)} placeholder="Montaje, modificación, mantención..." /><Field label="IVA (%)" value={data.budget.taxRate} onChange={v => setBudgetField('taxRate', v)} type="number" min="0" step="0.1" help="Se aplica sobre el subtotal neto." /><TextField label="Alcance / descripción" value={data.budget.scope || ''} onChange={v => setBudgetField('scope', v)} placeholder="Describe brevemente el alcance considerado." /></div>
          </div>
          <div className="panel-footer"><span><Check size={16} />Los cambios se guardan automáticamente en este navegador.</span><button className="button button-primary" type="button" onClick={() => setActiveSection('takeoff')}>Continuar a cubicación<ChevronRight size={17} /></button></div>
        </section>

        <section className="editor-panel no-print" hidden>
          <div className="panel-heading"><div><p className="eyebrow">PASO 2 DE 4</p><h2>{sectionTitles.takeoff[0]}</h2><p>{sectionTitles.takeoff[1]}</p></div><span className="heading-badge"><Calculator size={17} />Estimación revisable</span></div>
          <div className="safety-note"><ShieldCheck size={19} /><p><strong>La herramienta cuantifica; no dimensiona.</strong> No selecciona sección de conductor, protecciones ni capacidad de canalización. Verifica planos, criterios de diseño, normativa aplicable y condiciones de terreno antes de ofertar.</p></div>
          <div className="takeoff-card">
            <div className="takeoff-card-heading"><div><span className="card-number">01</span><div><h3>Circuitos y rutas medidas</h3><p>Metraje de ruta y número de conductores son entradas explícitas del proyectista.</p></div></div><button className="button button-outline button-small" type="button" onClick={() => addMeasurement('circuits')}><Plus size={16} />Agregar circuito</button></div>
            {data.measurements.circuits.length === 0 ? <div className="empty-row">Aún no hay rutas. Agrega un circuito para registrar mediciones.</div> : <div className="measurement-list">{data.measurements.circuits.map((row, index) => <div className="measurement-row" key={row.id}><div className="row-index">{String(index + 1).padStart(2, '0')}</div><Field label="Identificación" value={row.name} onChange={v => updateMeasurement('circuits', row.id, 'name', v)} placeholder="Ej. C-01 Tablero a bombas" /><Field label="Ruta medida (m)" value={row.length} onChange={v => updateMeasurement('circuits', row.id, 'length', v)} type="number" min="0" step="0.1" /><Field label="N.º conductores" value={row.conductors} onChange={v => updateMeasurement('circuits', row.id, 'conductors', v)} type="number" min="0" step="1" /><Field label="Reserva (%)" value={row.reserve} onChange={v => updateMeasurement('circuits', row.id, 'reserve', v)} type="number" min="0" step="1" /><button className="icon-button danger" type="button" onClick={() => deleteMeasurement('circuits', row.id)} aria-label="Eliminar circuito"><Trash2 size={17} /></button><div className="row-calculation">Conductores: <strong>{qtyFormat.format((Number(row.length) || 0) * (Number(row.conductors) || 0) * (1 + (Number(row.reserve) || 0) / 100))} m</strong><span> · Canalización: {qtyFormat.format((Number(row.length) || 0) * (1 + (Number(row.reserve) || 0) / 100))} m</span></div></div>)}</div>}
          </div>
          <div className="takeoff-card">
            <div className="takeoff-card-heading"><div><span className="card-number">02</span><div><h3>Recintos y puntos</h3><p>Los consumos por punto son supuestos configurables. Ajusta estos valores a tu levantamiento.</p></div></div><button className="button button-outline button-small" type="button" onClick={() => addMeasurement('rooms')}><Plus size={16} />Agregar recinto</button></div>
            {data.measurements.rooms.length === 0 ? <div className="empty-row">Agrega un recinto para estimar puntos y metrajes con tus propios factores.</div> : <div className="room-list">{data.measurements.rooms.map((room, index) => <div className="room-card" key={room.id}><div className="room-card-top"><div className="room-name"><span className="row-index">{String(index + 1).padStart(2, '0')}</span><Field label="Recinto / zona" value={room.name} onChange={v => updateMeasurement('rooms', room.id, 'name', v)} placeholder="Ej. Sala de control" /></div><button className="icon-button danger" type="button" onClick={() => deleteMeasurement('rooms', room.id)} aria-label="Eliminar recinto"><Trash2 size={17} /></button></div><div className="form-grid four"><Field label="Luminarias (un)" value={room.lights} onChange={v => updateMeasurement('rooms', room.id, 'lights', v)} type="number" min="0" step="1" /><Field label="Enchufes (un)" value={room.outlets} onChange={v => updateMeasurement('rooms', room.id, 'outlets', v)} type="number" min="0" step="1" /><Field label="Equipos (un)" value={room.equipment} onChange={v => updateMeasurement('rooms', room.id, 'equipment', v)} type="number" min="0" step="1" /><Field label="Ruta principal (m)" value={room.routeLength} onChange={v => updateMeasurement('rooms', room.id, 'routeLength', v)} type="number" min="0" step="0.1" /><Field label="Consumo / luminaria (m)" value={room.metersPerLight} onChange={v => updateMeasurement('rooms', room.id, 'metersPerLight', v)} type="number" min="0" step="0.1" /><Field label="Consumo / enchufe (m)" value={room.metersPerOutlet} onChange={v => updateMeasurement('rooms', room.id, 'metersPerOutlet', v)} type="number" min="0" step="0.1" /><Field label="Consumo / equipo (m)" value={room.metersPerEquipment} onChange={v => updateMeasurement('rooms', room.id, 'metersPerEquipment', v)} type="number" min="0" step="0.1" /><Field label="Reserva (%)" value={room.reserve} onChange={v => updateMeasurement('rooms', room.id, 'reserve', v)} type="number" min="0" step="1" /></div><div className="room-estimate"><Calculator size={16} /><span>Metraje referencial: <strong>{qtyFormat.format(((Number(room.routeLength) || 0) + (Number(room.lights) || 0) * (Number(room.metersPerLight) || 0) + (Number(room.outlets) || 0) * (Number(room.metersPerOutlet) || 0) + (Number(room.equipment) || 0) * (Number(room.metersPerEquipment) || 0)) * (1 + (Number(room.reserve) || 0) / 100))} m</strong></span><small>Ruta + puntos × consumos por punto + reserva</small></div></div>)}</div>}
          </div>
          <div className="calculated-panel"><div className="calculated-heading"><div><h3>Resumen de cantidades sugeridas</h3><p>Agrega solo lo revisado. No se crean partidas automáticamente.</p></div><span className="suggestion-count">{calculatedMaterials.length} conceptos</span></div>{calculatedMaterials.length === 0 ? <div className="empty-row">Al ingresar rutas o puntos se mostrarán aquí los materiales estimados.</div> : <div className="suggestion-list">{calculatedMaterials.map(row => <div className="suggestion-row" key={row.key}><span className="suggestion-icon"><Zap size={16} /></span><div className="suggestion-description"><strong>{row.description}</strong><small>{row.observations}</small></div><span className="suggestion-quantity">{qtyFormat.format(row.quantity)} <small>{row.unit}</small></span><button className="button button-outline button-small" type="button" onClick={() => addCalculatedRow(row)}><Plus size={15} />A partidas</button></div>)}</div>}</div>
          <div className="panel-footer"><span><CircleHelp size={16} />Los factores por punto y reservas son configurables; valida su pertinencia.</span><button className="button button-primary" type="button" onClick={() => setActiveSection('items')}>Revisar Items<ChevronRight size={17} /></button></div>
        </section>

        <section className="editor-panel no-print takeoff-workbench" hidden={activeSection !== 'takeoff'}>
          <div className="panel-heading"><div><p className="eyebrow">PASO 2 DE 4 · MEMORIA DE OBRA</p><h2>Cubicación asistida</h2><p>Activa plantillas para recordar componentes; ingresa cantidades solo con medición o criterio definido.</p></div><div className="takeoff-heading-actions"><span className="heading-badge"><BookOpenCheck size={17} />{data.takeoff.components.length} componentes a revisar</span><button type="button" className="button button-outline button-small" onClick={resetTakeoffWorkspace}>Restablecer Cubicación</button></div></div>
          <div className="safety-note"><ShieldCheck size={19} /><p><strong>Herramienta de recordatorio y cubicación, no de dimensionamiento.</strong> Las clasificaciones ayudan a revisar, no certifican obligatoriedad. Los aspectos normativos quedan pendientes de revisión hasta verificar el documento aplicable.</p></div>
          <div className="takeoff-tabs" role="tablist" aria-label="Herramientas de cubicación">{[['plantillas','Plantillas → Items'],['rutas','Recorridos'],['materiales','Materiales'],['ric','Referencias RIC']].map(([id,label]) => <button key={id} type="button" role="tab" aria-selected={takeoffView===id} className={takeoffView===id?'active':''} onClick={()=>setTakeoffView(id)}>{label}</button>)}</div>

          {takeoffView === 'plantillas' && <div className="takeoff-grid">
            <section className="takeoff-card"><div className="takeoff-card-heading"><div><span className="card-number">01</span><div><h3>Tipos de instalación</h3><p>Selecciona los que correspondan. Desmarcar un tipo no borra materiales ya agregados; usa “Quitar plantilla” o “Restablecer Cubicación”.</p></div></div></div><div className="installation-type-grid">{INSTALLATION_TYPES.map(type=><label key={type} className="type-chip"><input type="checkbox" checked={data.takeoff.installationTypes.includes(type)} onChange={event=>changeInstallationTypes(type,event.target.checked)} /><span>{type}</span></label>)}</div></section>
            <section className="takeoff-card"><div className="takeoff-card-heading"><div><span className="card-number">02</span><div><h3>Elige una plantilla</h3><p>Selecciona una plantilla y luego marca solo los elementos que necesitas. Nada se agrega hasta que confirmes.</p></div></div></div><label className="catalog-search"><Search size={17}/><input value={templateQuery} onChange={event=>setTemplateQuery(event.target.value)} placeholder="Buscar tablero, sistema o equipo" /></label><div className="template-grid">{visibleTemplates.map(template=><article key={template.id} className={`template-card ${selectedTemplate?.id===template.id?'is-active':''}`}><span><ClipboardList size={17}/></span><strong>{template.name}</strong><small>{template.ids.length} elementos</small><button type="button" className="button button-outline button-small" onClick={()=>openTemplate(template.id)}>{selectedTemplate?.id===template.id?'Plantilla seleccionada':'Seleccionar elementos'}</button></article>)}</div>
              {selectedTemplate&&<div className="template-selection"><div className="takeoff-card-heading"><div><span className="card-number">03</span><div><h3>{selectedTemplate.name}</h3><p>Marca los elementos que quieres agregar a Items. Se crearán con cantidad y precio en cero.</p></div></div><span className="suggestion-count">{selectedTemplateComponents.length} seleccionados</span></div><div className="template-selection-actions"><button type="button" className="text-button" onClick={()=>setSelectedTemplateComponents(selectedTemplate.ids.filter(id=>COMPONENTS.some(component=>component.id===id)))}>Seleccionar todos</button><button type="button" className="text-button" onClick={()=>setSelectedTemplateComponents([])}>Limpiar selección</button></div><div className="template-component-list">{selectedTemplate.ids.map(componentId=>{const component=COMPONENTS.find(item=>item.id===componentId);if(!component)return null;const checked=selectedTemplateComponents.includes(componentId);return <label className="template-component-option" key={componentId}><input type="checkbox" checked={checked} onChange={event=>setSelectedTemplateComponents(current=>event.target.checked?[...current,componentId]:current.filter(id=>id!==componentId))}/><span><strong>{component.label}</strong><small>{component.category} · {component.unit}</small></span></label>})}</div><div className="transfer-actions"><button type="button" className="button button-outline" onClick={cancelTemplateSelection}>Cancelar</button><button type="button" className="button button-primary" onClick={confirmTemplateSelection}>Confirmar y agregar a Items ({selectedTemplateComponents.length})</button></div></div>}
            </section>
            <section className="takeoff-card catalog-card"><div className="takeoff-card-heading"><div><span className="card-number">03</span><div><h3>Catálogo de componentes</h3><p>Agrega ítems puntuales cuando una plantilla no cubra el caso.</p></div></div></div><div className="catalog-controls"><label className="catalog-search"><Search size={17}/><input value={catalogQuery} onChange={event=>setCatalogQuery(event.target.value)} placeholder="Buscar material o componente" /></label><select value={catalogCategory} onChange={event=>setCatalogCategory(event.target.value)} aria-label="Filtrar categoría">{catalogCategories.map(category=><option key={category}>{category}</option>)}</select></div><div className="catalog-list">{visibleCatalog.slice(0,60).map(item=><div className="catalog-item" key={item.id}><div><strong>{item.label}</strong><small>{item.category} · {item.unit} · {item.classification}</small></div><button className="button button-outline button-small" type="button" onClick={()=>addCatalogComponent(item)}><Plus size={15}/>Agregar</button></div>)}{visibleCatalog.length>60&&<small>Mostrando 60 de {visibleCatalog.length}; filtra para acotar.</small>}</div></section>
          </div>}

          {takeoffView === 'rutas' && <div className="takeoff-card"><div className="takeoff-card-heading"><div><span className="card-number">01</span><div><h3>Recorridos medidos</h3><p>Los metros de conductor se calculan por separado como longitud × cantidad de conductores + chicotes. Define la misma ruta para canalización y conductores una sola vez.</p></div></div><button type="button" className="button button-primary button-small" onClick={addRoute}><Plus size={16}/>Agregar recorrido</button></div>
            {data.takeoff.routes.length===0?<div className="empty-row">Aún no hay recorridos. Al agregar uno, ingresa origen, destino, sistema y longitud medida.</div>:<div className="route-list">{data.takeoff.routes.map((route,index)=><article className="route-card" key={route.id}><div className="route-card-heading"><span className="row-index">{String(index+1).padStart(2,'0')}</span><strong>Recorrido {route.name||`${route.from||'Origen'} → ${route.to||'Destino'}`}</strong><button className="icon-button danger" type="button" aria-label="Eliminar recorrido" onClick={()=>updateTakeoff(state=>({...state,routes:state.routes.filter(item=>item.id!==route.id)}))}><Trash2 size={16}/></button></div><div className="form-grid four"><Field label="Identificación" value={route.name} onChange={value=>updateRoute(route.id,'name',value)} placeholder="Ej. R-01"/><Field label="Desde" value={route.from} onChange={value=>updateRoute(route.id,'from',value)} placeholder="Tablero"/><Field label="Hasta" value={route.to} onChange={value=>updateRoute(route.id,'to',value)} placeholder="Caja 1"/><Field label="Longitud medida (m)" value={route.length} onChange={value=>updateRoute(route.id,'length',value)} type="number" min="0" step="0.1"/><label className="form-field"><span>Sistema de canalización</span><select value={route.system} onChange={event=>updateRoute(route.id,'system',event.target.value)}><option value="">Seleccionar / no definido</option>{['Conduit embutido','Tubo sobrepuesto','Ducto subterráneo','Canalización aérea','Bandeja portacables','Escalerilla','Canaleta','Otro / especificar'].map(system=><option key={system}>{system}</option>)}</select></label><label className="form-field"><span>Reserva canalización</span><div className="reserve-control"><input type="number" min="0" step="0.1" value={route.reserveValue} onChange={event=>updateRoute(route.id,'reserveValue',event.target.value)}/><select value={route.reserveMode} onChange={event=>updateRoute(route.id,'reserveMode',event.target.value)}><option value="percent">%</option><option value="absolute">m</option></select></div></label><TextField label="Nota / fuente de medición" value={route.note} onChange={value=>updateRoute(route.id,'note',value)} rows={1}/></div>
              <div className="route-math">Canalización teórica <strong>{qtyFormat.format(Number(route.length)||0)} m</strong><span>Reserva: {qtyFormat.format(applyReserve(route.length,route.reserveMode,route.reserveValue).reserve)} m</span><b>Total antes de compra: {qtyFormat.format(applyReserve(route.length,route.reserveMode,route.reserveValue).adjusted)} m</b></div>
              <div className="conductors-heading"><div><h4>Conductores de esta ruta</h4><small>Sección, tipo, color y aislación son datos de proyecto; no se infieren.</small></div><button className="button button-outline button-small" type="button" onClick={()=>addRouteConductor(route.id)}><Plus size={15}/>Agregar conductor</button></div>
              {route.conductors.map(conductor=><div className="conductor-row" key={conductor.id}><select aria-label="Función del conductor" value={conductor.function} onChange={event=>updateRouteConductor(route.id,conductor.id,'function',event.target.value)}>{['Fase','Neutro','PE','Tierra de servicio','Retorno','Viajero / conmutado','Control','Fuerza','Equipo','Alimentador','Subalimentador','Especial'].map(value=><option key={value}>{value}</option>)}</select><Field label="Tipo" value={conductor.type} onChange={value=>updateRouteConductor(route.id,conductor.id,'type',value)} placeholder="Tipo cable"/><Field label="Sección" value={conductor.section} onChange={value=>updateRouteConductor(route.id,conductor.id,'section',value)} placeholder="Según diseño"/><Field label="N.º conductores" value={conductor.count} onChange={value=>updateRouteConductor(route.id,conductor.id,'count',value)} type="number" min="0" step="1"/><Field label="Longitud ruta (m)" value={conductor.length} onChange={value=>updateRouteConductor(route.id,conductor.id,'length',value)} type="number" min="0" step="0.1"/><Field label="Color" value={conductor.color} onChange={value=>updateRouteConductor(route.id,conductor.id,'color',value)} placeholder="Si está especificado"/><Field label="Aislación" value={conductor.insulation} onChange={value=>updateRouteConductor(route.id,conductor.id,'insulation',value)} placeholder="Según especificación"/><Field label="Chicotes (m)" value={conductor.pigtails} onChange={value=>updateRouteConductor(route.id,conductor.id,'pigtails',value)} type="number" min="0" step="0.1"/><label className="form-field"><span>Reserva</span><div className="reserve-control"><input type="number" min="0" step="0.1" value={conductor.reserveValue} onChange={event=>updateRouteConductor(route.id,conductor.id,'reserveValue',event.target.value)}/><select value={conductor.reserveMode} onChange={event=>updateRouteConductor(route.id,conductor.id,'reserveMode',event.target.value)}><option value="percent">%</option><option value="absolute">m</option></select></div></label><button className="icon-button danger" type="button" aria-label="Eliminar conductor" onClick={()=>updateTakeoff(state=>({...state,routes:state.routes.map(item=>item.id===route.id?{...item,conductors:item.conductors.filter(row=>row.id!==conductor.id)}:item)}))}><Trash2 size={15}/></button><div className="route-math conductor-math">Teórico: {qtyFormat.format((Number(conductor.length)||Number(route.length)||0)*(Number(conductor.count)||0)+(Number(conductor.pigtails)||0))} m = recorrido × conductores + chicotes · con reserva: {qtyFormat.format(applyReserve((Number(conductor.length)||Number(route.length)||0)*(Number(conductor.count)||0)+(Number(conductor.pigtails)||0),conductor.reserveMode,conductor.reserveValue).adjusted)} m</div></div>)}
            </article>)}</div>}
          </div>}

          {takeoffView === 'materiales' && <div className="takeoff-card"><div className="takeoff-card-heading"><div><span className="card-number">01</span><div><h3>Consolidado para revisión</h3><p>Cantidad teórica, reserva y compra quedan en columnas separadas. Se consolida solo material + especificación + unidad.</p></div></div><span className="suggestion-count">{takeoffConsolidated.length+routeMaterials.length} conceptos</span></div><div className="items-table-wrap takeoff-table-wrap"><table className="items-table takeoff-table"><thead><tr><th>Categoría</th><th>Material</th><th>Especificación</th><th>Un.</th><th>Teórica</th><th>Reserva</th><th>Ajustada</th><th>Presentación</th><th>Compra</th></tr></thead><tbody>{takeoffConsolidated.map(row=><tr key={row.key}><td>{row.category}</td><td>{row.label}</td><td>{row.specification||'—'}</td><td>{row.unit}</td><td>{qtyFormat.format(row.theoretical)}</td><td>{qtyFormat.format(row.reserve)}</td><td>{qtyFormat.format(row.adjusted)}</td><td>{row.packageSize?`${qtyFormat.format(row.packageSize)} ${row.unit}/envase`:row.purchaseStep?`Paso ${qtyFormat.format(row.purchaseStep)} ${row.unit}`:'Exacta / unidad entera'}</td><td><strong>{qtyFormat.format(row.purchase)} {row.unit}</strong></td></tr>)}{routeMaterials.map(row=><tr key={row.key}><td>{row.category}</td><td>{row.label}</td><td>{row.specification||'—'}</td><td>{row.unit}</td><td>{qtyFormat.format(row.theoretical)}</td><td>{qtyFormat.format(row.reserve)}</td><td>{qtyFormat.format(row.adjusted)}</td><td>Sin empaque configurado</td><td><strong>{qtyFormat.format(row.purchase)} {row.unit}</strong><button type="button" className="text-button" onClick={()=>addRouteMaterialToTakeoff(row)}> + Agregar a componentes</button></td></tr>)}</tbody></table>{takeoffConsolidated.length+routeMaterials.length===0&&<div className="empty-row">Activa plantillas o agrega recorridos y componentes para construir la cubicación.</div>}</div><div className="safety-note compact-note"><CircleHelp size={17}/><p>Para componentes discretos se redondea a unidad entera. Presentación comercial solo se aplica cuando ingresas tamaño de envase o paso de compra en la ficha del componente. No se asumen largos comerciales estándar.</p></div>
            <h4 className="subsection-heading">Componentes agregados · editar cantidades y especificaciones</h4>{data.takeoff.components.length===0?<div className="empty-row">Sin componentes. Agrega una plantilla o busca en el catálogo.</div>:<div className="takeoff-component-list">{data.takeoff.components.map(component=><div className="takeoff-component-row" key={component.id}><div className="component-identity"><strong>{component.label}</strong><small>{component.category} · {component.classification} · {component.origin}</small></div><input aria-label={`Especificación ${component.label}`} value={component.specification} onChange={event=>updateTakeoffComponent(component.id,'specification',event.target.value)} placeholder="Especificación / modelo"/><span className="unit-label">{component.unit}</span><label><small>Cant. teórica</small><input type="number" min="0" step="0.01" value={component.theoretical} onChange={event=>updateTakeoffComponent(component.id,'theoretical',event.target.value)}/></label><label><small>Reserva</small><span className="reserve-control"><input type="number" min="0" step="0.1" value={component.reserveValue} onChange={event=>updateTakeoffComponent(component.id,'reserveValue',event.target.value)}/><select value={component.reserveMode} onChange={event=>updateTakeoffComponent(component.id,'reserveMode',event.target.value)}><option value="percent">%</option><option value="absolute">{component.unit}</option></select></span></label><label><small>Envase (opcional)</small><input type="number" min="0" step="0.01" value={component.packageSize} onChange={event=>updateTakeoffComponent(component.id,'packageSize',event.target.value)} placeholder="Sin empaque"/></label><label><small>Paso de compra</small><input type="number" min="0" step="0.01" value={component.purchaseStep} onChange={event=>updateTakeoffComponent(component.id,'purchaseStep',event.target.value)} placeholder="Sin redondeo"/></label><span className="component-purchase">{qtyFormat.format(getComponentQuantities(component).purchase)} {component.unit}</span><button className="icon-button danger" type="button" aria-label="Quitar componente" onClick={()=>removeTakeoffComponent(component.id)}><Trash2 size={15}/></button><input className="component-note" aria-label={`Nota ${component.label}`} value={component.note} onChange={event=>updateTakeoffComponent(component.id,'note',event.target.value)} placeholder="Nota / origen de cantidad"/></div>)}</div>}
            <div className="panel-footer"><span><Check size={16}/>La selección de plantilla no cambia esta memoria de cantidades.</span><button type="button" className="button button-primary" onClick={()=>setActiveSection('items')}>Revisar Items<ChevronRight size={17}/></button></div>
            <div className="panel-footer"><span><Check size={16}/>Verifica cantidades y completa especificaciones antes de pasar a Items.</span><button type="button" className="button button-primary" onClick={()=>setActiveSection('items')}>Ir a Items<ChevronRight size={17}/></button></div>
          </div>}

          {takeoffView === 'workflow' && data.takeoff.components.length < 0 && <div className="takeoff-card workflow-panel"><div className="takeoff-card-heading"><div><span className="card-number">01</span><div><h3>Gestionar destinos</h3><p>La Cubicación permanece como fuente de verdad; Items y presupuesto final son relaciones de destino, no copias fuente.</p></div></div><span className="suggestion-count">{workflowSummary.total} materiales</span></div>
            <div className="validation-guide" role="note"><strong>¿Qué significa la validación?</strong><div><span className="workflow-badge valido">Válido</span><p>No se detectaron problemas en los datos requeridos; se puede continuar.</p></div><div><span className="workflow-badge advertencia">Advertencia</span><p>Falta un dato recomendado o podría haber duplicado. Puedes continuar, pero revisa el mensaje.</p></div><div><span className="workflow-badge error">Error</span><p>Falta o no es válido un dato obligatorio, o la compra es cero. Ese material no se envía; corrígelo en Materiales.</p></div><small>Es una revisión administrativa de datos, no valida diseño eléctrico, cumplimiento RIC, selección técnica ni precios.</small></div>
            <div className="workflow-summary"><span>{workflowSummary.total} cubicados</span><span>{workflowSummary.pending} pendientes</span><span>{workflowSummary.reviewed} revisados</span><span>{workflowSummary.warnings} advertencias</span><span>{workflowSummary.errors} errores</span><span>Solo cubicación: {workflowSummary.destinations.solo_cubicacion}</span><span>Partidas: {workflowSummary.destinations.partida}</span><span>Presupuesto: {workflowSummary.destinations.presupuesto_final}</span><span>Ambos: {workflowSummary.destinations.ambos}</span><span>Enviados: {workflowSummary.sent}</span><span>Confirmados: {workflowSummary.confirmed}</span></div>
            <div className="workflow-bulk"><label><input type="checkbox" checked={data.takeoff.components.length>0&&selectedMaterials.length===data.takeoff.components.length} onChange={event=>setSelectedMaterials(event.target.checked?data.takeoff.components.map(component=>component.id):[])}/> Seleccionar todos</label><span>{selectedMaterials.length} seleccionados</span><select value={destinationChoice} onChange={event=>setDestinationChoice(event.target.value)} aria-label="Destino para seleccionados">{DESTINATIONS.map(destination=><option key={destination} value={destination}>{destination==='solo_cubicacion'?'Solo cubicación':destination==='partida'?'Partida':destination==='presupuesto_final'?'Presupuesto final':'Partida + Presupuesto final'}</option>)}</select><button type="button" className="button button-outline button-small" onClick={()=>requestDestinationChange(selectedMaterials,destinationChoice)}>Aplicar destino a seleccionados</button><button type="button" className="button button-outline button-small" onClick={confirmTakeoff}>Confirmar cubicación</button></div>
            <div className="items-table-wrap takeoff-table-wrap"><table className="items-table takeoff-table"><thead><tr><th></th><th>ID</th><th>Material / origen</th><th>Especificación</th><th>Compra</th><th>Validación</th><th>Workflow</th><th>Destino</th><th>Acción</th></tr></thead><tbody>{data.takeoff.components.map(component=>{const quantity=getComponentQuantities(component);const validation=validateMaterial(component,data.takeoff.components);return <tr key={component.id}><td><input type="checkbox" aria-label={`Seleccionar ${component.materialId}`} checked={selectedMaterials.includes(component.id)} onChange={event=>setSelectedMaterials(current=>event.target.checked?[...current,component.id]:current.filter(id=>id!==component.id))}/></td><td><strong>{component.materialId}</strong></td><td><strong>{component.label}</strong><small className="workflow-origin">{component.category} · {component.origin||'Origen sin identificar'}</small></td><td>{component.specification||'—'}</td><td>{qtyFormat.format(quantity.purchase)} {component.unit}</td><td><span className={`workflow-badge ${validation.status}`}>{validation.status.toUpperCase()}</span>{validation.errors.concat(validation.warnings).map(message=><small key={message}>{message}</small>)}</td><td><span className="workflow-badge">{component.workflowStatus}</span></td><td><span>{component.destination==='solo_cubicacion'?'Solo cubicación':component.destination==='partida'?'Partida':component.destination==='presupuesto_final'?'Presupuesto final':'Ambos'}</span><select value={component.destination} onChange={event=>requestSingleDestination(component,event.target.value)} aria-label={`Cambiar destino ${component.materialId}`}>{DESTINATIONS.map(destination=><option key={destination} value={destination}>{destination==='solo_cubicacion'?'Solo cubicación':destination==='partida'?'Partida':destination==='presupuesto_final'?'Presupuesto final':'Ambos'}</option>)}</select></td><td><button type="button" className="button button-outline button-small" onClick={()=>requestSingleDestination(component,destinationChoice)}>Enviar a…</button><button className="icon-button danger" type="button" aria-label={`Eliminar ${component.materialId}`} onClick={()=>removeTakeoffComponent(component.id)}><Trash2 size={15}/></button></td></tr>})}{data.takeoff.components.length===0&&<tr><td colSpan="9" className="empty-row">Sin componentes. Agrega una plantilla o busca en el catálogo.</td></tr>}</tbody></table></div>
            {pendingTransfer&&<div className="transfer-confirmation" role="dialog" aria-modal="true" aria-labelledby="transfer-title"><div className="transfer-dialog"><button className="transfer-close" type="button" aria-label="Cancelar" onClick={()=>setPendingTransfer(null)}>×</button><h3 id="transfer-title">{pendingTransfer.single?'Confirmar cambio de destino':'Aplicar destino a seleccionados'}</h3><p>{pendingTransfer.validation.selected} seleccionado(s) · {pendingTransfer.validation.valid} válido(s) · {pendingTransfer.validation.warnings} con advertencias · {pendingTransfer.validation.errors} con error</p><div className="transfer-list">{pendingTransfer.validation.results.map(({component,validation})=><div key={component.id}><strong>{component.materialId} · {component.label}</strong><span>{qtyFormat.format(getComponentQuantities(component).purchase)} {component.unit} · {validation.status.toUpperCase()}</span>{validation.errors.concat(validation.warnings).map(message=><small key={message}>{message}</small>)}</div>)}</div><p>Destino nuevo: <strong>{pendingTransfer.destination==='solo_cubicacion'?'Solo cubicación':pendingTransfer.destination==='partida'?'Partida':pendingTransfer.destination==='presupuesto_final'?'Presupuesto final':'Partida + Presupuesto final'}</strong></p>{pendingTransfer.validation.errors>0&&<p className="validation-block">Hay errores bloqueantes. Puedes cancelar, revisar los errores o procesar solo los materiales válidos.</p>}<div className="transfer-actions"><button type="button" className="button button-outline" onClick={()=>setPendingTransfer(null)}>Cancelar</button>{pendingTransfer.validation.errors>0&&<button type="button" className="button button-outline" onClick={()=>{setPendingTransfer(null);setNotice('Corrige los errores indicados en la tabla antes de reenviar.');}}>Revisar errores</button>}<button type="button" className="button button-primary" onClick={()=>confirmDestinationChange(pendingTransfer.validation.errors>0)}>Confirmar {pendingTransfer.validation.errors>0?'solo válidos':'envío'}</button></div></div></div>}
            {pendingDeletion&&<div className="transfer-confirmation" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="transfer-dialog"><h3 id="delete-title">Eliminar material de Cubicación?</h3><p><strong>{pendingDeletion.materialId} · {pendingDeletion.label}</strong></p><p>Compra: {qtyFormat.format(getComponentQuantities(pendingDeletion).purchase)} {pendingDeletion.unit}</p><p>Relaciones activas: {[pendingDeletion.destinationRelations?.itemId&&'Partidas',pendingDeletion.destinationRelations?.finalBudgetId&&'Presupuesto final'].filter(Boolean).join(', ')||'ninguna'}. Eliminar la fuente no borra automáticamente esas partidas destino.</p><div className="transfer-actions"><button type="button" className="button button-outline" onClick={()=>setPendingDeletion(null)}>Cancelar</button><button type="button" className="button button-primary" onClick={confirmMaterialDeletion}>Eliminar de Cubicación</button></div></div></div>}
            <div className="safety-note compact-note"><CircleHelp size={17}/><p>La cantidad usada en destinos es la de compra; las cantidades teórica, reserva y ajustada se conservan en las observaciones de trazabilidad. Las advertencias no bloquean, los errores sí.</p></div>
            <div className="panel-footer"><span><Check size={16}/>{data.takeoff.confirmedAt?`Cubicación confirmada el ${new Date(data.takeoff.confirmedAt).toLocaleString('es-CL')}`:'Confirma explícitamente al terminar la revisión.'}</span><button type="button" className="button button-primary" onClick={confirmTakeoff}>Confirmar cubicación<ChevronRight size={17}/></button></div>
          </div>}

          {takeoffView === 'ric' && <div className="takeoff-card"><div className="takeoff-card-heading"><div><span className="card-number">01</span><div><h3>Referencia RIC oficial</h3><p>La SEC publica el Decreto 08 y los Pliegos Técnicos RIC. Aquí se indican temas de referencia; no se citan cláusulas como obligaciones sin revisar su texto.</p></div></div></div><div className="safety-note"><ShieldCheck size={18}/><p>Las etiquetas de clasificación del catálogo son recordatorios de revisión y <strong>no equivalen por sí solas a un requisito normativo</strong>. Comprueba vigencia, documentos complementarios y alcance de la instalación.</p></div><div className="ric-list">{[{id:'RIC 02',title:'Tableros eléctricos'},{id:'RIC 03',title:'Alimentadores y demanda de una instalación'},{id:'RIC 04',title:'Conductores, materiales y sistemas de canalización'},{id:'RIC 05',title:'Medidas de protección contra tensiones peligrosas y descargas eléctricas'},{id:'RIC 06',title:'Puesta a tierra y enlace equipotencial'},{id:'RIC 07',title:'Instalaciones de equipos'},{id:'RIC 10',title:'Instalaciones de uso general'},{id:'RIC 11',title:'Instalaciones especiales'},{id:'RIC 15',title:'Infraestructura para la recarga de vehículos eléctricos'}].map(item=><a key={item.id} href="https://www.sec.cl/reglamento-de-seguridad-de-las-instalaciones-de-consumo-de-energia-electrica-decreto-08/" target="_blank" rel="noreferrer"><strong>{item.id}</strong><span>{item.title}</span><small>Listado oficial SEC · verificar versión/documentos asociados en SEC</small></a>)}</div><p className="ric-footnote">Fuente: Superintendencia de Electricidad y Combustibles (SEC), página oficial de Pliegos RIC / Decreto 08. Consulta y revisión registrada al {new Date().toLocaleDateString('es-CL')}.</p></div>}
        </section>

        <section className="editor-panel no-print" hidden={activeSection !== 'items'}>
          <div className="panel-heading"><div><p className="eyebrow">PASO 3 DE 4</p><h2>{sectionTitles.items[0]}</h2><p>{sectionTitles.items[1]}</p></div><div className="mini-total"><small>TOTAL ACTUAL</small><strong>${money.format(total)}</strong></div></div>
          <div className="items-toolbar"><p>{data.items.length} Items <span>·</span> Valores netos en CLP</p><button className="button button-primary" type="button" onClick={() => addItem()}><Plus size={17} />Agregar Item</button></div>
          {data.finalBudget.length>0&&<div className="final-budget-section"><div className="items-toolbar"><p>{data.finalBudget.length} líneas en Presupuesto final <span>·</span> Destino consolidado</p><span className="workflow-badge">EDITABLE</span></div><div className="items-table-wrap"><table className="items-table"><thead><tr><th>ID fuente</th><th>Descripción / trazabilidad</th><th>Unidad</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th><th></th></tr></thead><tbody>{data.finalBudget.map(item=><tr key={item.id}><td><strong>{item.sourceMaterialId}</strong></td><td><strong>{item.description}</strong><small>{item.observations}</small></td><td>{item.unit}</td><td><input className="table-input numeric" type="number" min="0" step="0.01" value={item.quantity} onChange={event=>updateFinalBudgetItem(item.id,'quantity',event.target.value)} aria-label={`Cantidad ${item.sourceMaterialId}`}/></td><td><label className="price-input"><span>$</span><input className="table-input numeric" type="number" min="0" step="1" value={item.unitPrice} onChange={event=>updateFinalBudgetItem(item.id,'unitPrice',event.target.value)} aria-label={`Precio ${item.sourceMaterialId}`}/></label></td><td className="cell-subtotal">${money.format(Math.round((Number(item.quantity)||0)*(Number(item.unitPrice)||0)))}</td><td><button type="button" className="icon-button danger" aria-label={`Eliminar línea ${item.sourceMaterialId}`} onClick={()=>deleteFinalBudgetItem(item.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div></div>}
          <div className="items-table-wrap"><table className="items-table"><thead><tr><th className="col-num">#</th><th className="col-description">Descripción</th><th className="col-category">Tipo</th><th className="col-unit">Unidad</th><th className="col-quantity">Cantidad</th><th className="col-price">P. unitario neto</th><th className="col-subtotal">Subtotal</th><th className="col-actions"> </th></tr></thead><tbody>{data.items.map((item, index) => <tr key={item.id}><td className="cell-number">{String(index + 1).padStart(2, '0')}</td><td><input className="table-text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Descripción de material o servicio" aria-label="Descripción" /><input className="table-observation" value={item.observations} onChange={e => updateItem(item.id, 'observations', e.target.value)} placeholder="Marca, especificación, alcance (opcional)" aria-label="Observaciones" /></td><td><select value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)} aria-label="Tipo de partida"><option>Materiales</option><option>Mano de obra</option><option>Equipos</option><option>Transporte</option><option>Otros</option></select></td><td><input className="table-input table-unit" value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} aria-label="Unidad" placeholder="un" /></td><td><input className="table-input numeric" type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} aria-label="Cantidad" /></td><td><label className="price-input"><span>$</span><input className="table-input numeric" type="number" min="0" step="1" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', e.target.value)} aria-label="Precio unitario neto" /></label></td><td className="cell-subtotal">${money.format(Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)))}</td><td><button type="button" className="icon-button danger" onClick={() => deleteItem(item.id)} aria-label="Eliminar partida"><Trash2 size={16} /></button></td></tr>)}</tbody></table>{data.items.length === 0 && <div className="empty-items"><ClipboardList size={26} /><strong>Aún no hay partidas</strong><span>Agrega una manualmente o pasa cantidades desde la cubicación.</span><button className="button button-outline button-small" type="button" onClick={() => setActiveSection('takeoff')}>Ir a cubicación</button></div>}</div>
          <div className="bottom-summary"><div className="conditions-editor"><div className="subsection-title"><span className="subsection-icon"><ShieldCheck size={17} /></span><div><h3>Notas y condiciones</h3><p>Se imprimen al final del presupuesto.</p></div></div>{data.budget.notes.map((note, index) => <div className="note-edit-row" key={`note-${index}`}><input value={note} onChange={e => setBudgetField('notes', data.budget.notes.map((current, i) => i === index ? e.target.value : current))} aria-label={`Nota ${index + 1}`} /><button className="icon-button danger" type="button" onClick={() => setBudgetField('notes', data.budget.notes.filter((_, i) => i !== index))} aria-label="Eliminar nota"><Trash2 size={15} /></button></div>)}<button className="text-button" type="button" onClick={() => setBudgetField('notes', [...data.budget.notes, ''])}><Plus size={15} />Agregar condición</button></div><Totals subtotal={subtotal} tax={tax} total={total} taxRate={data.budget.taxRate} /></div>
          <div className="panel-footer"><span><Check size={16} />Cantidades y precios pueden editarse antes de emitir.</span><button className="button button-primary" type="button" onClick={() => setActiveSection('preview')}>Revisar presupuesto<ChevronRight size={17} /></button></div>
        </section>

        <section className="preview-section" hidden={activeSection !== 'preview'}>
          <div className="preview-toolbar no-print"><div><p className="eyebrow">PASO 4 DE 4</p><h2>{sectionTitles.preview[0]}</h2><p>{sectionTitles.preview[1]}</p></div><button className="button button-primary" type="button" onClick={() => window.print()}><Printer size={17} />Imprimir / Guardar PDF</button></div>
          <article className="budget-document" aria-label="Presupuesto imprimible tamaño A4">
            <header className="document-header"><div className="document-company">{data.logo ? <img className="document-logo" src={data.logo} alt="Logo" /> : <div className="document-logo-placeholder"><Zap size={25} /></div>}<div>{data.company.name && <h2>{data.company.name}</h2>}{data.company.subtitle && <p>{data.company.subtitle}</p>}<div className="document-company-lines">{data.company.rut && <span>RUT {data.company.rut}</span>}{data.company.phone && <span>{data.company.phone}</span>}{data.company.email && <span>{data.company.email}</span>}</div></div></div><div className="document-number"><small>PRESUPUESTO</small>{data.budget.quotationNumber && <strong>{data.budget.quotationNumber}</strong>}{data.budget.issueDate && <span>{new Date(`${data.budget.issueDate}T00:00:00`).toLocaleDateString('es-CL')}</span>}</div></header>
            <div className="document-accent" />
            {data.budget.workType && <div className="document-title"><div><p>COTIZACIÓN DE SERVICIOS</p><h1>{data.budget.workType}</h1></div><span>CLP</span></div>}
            <section className="document-meta"><div><small>CLIENTE</small>{data.client.name && <strong>{data.client.name}</strong>}{data.client.rut && <span>RUT {data.client.rut}</span>}{data.client.phone && <span>{data.client.phone}</span>}{data.client.email && <span>{data.client.email}</span>}</div><div><small>PROYECTO / OBRA</small>{data.client.projectName && <strong>{data.client.projectName}</strong>}{data.client.projectAddress && <span>{data.client.projectAddress}</span>}</div><div><small>VIGENCIA</small>{data.budget.validityDays && <strong>{data.budget.validityDays} días</strong>}{data.budget.issueDate && <span>desde la fecha de emisión</span>}</div></section>
            {data.budget.scope && <div className="document-scope"><strong>Alcance considerado</strong><p>{data.budget.scope}</p></div>}
            <table className="print-items"><thead><tr><th>#</th><th>Detalle / especificación</th><th>Un.</th><th>Cant.</th><th>Precio unit.</th><th>Total neto</th></tr></thead><tbody>{printableItems.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{item.description && <strong>{item.description}</strong>}{item.observations && <small>{item.observations}</small>}{item.category && <em>{item.category}</em>}</td><td>{item.unit}</td><td>{qtyFormat.format(Number(item.quantity) || 0)}</td><td>${money.format(Number(item.unitPrice) || 0)}</td><td>${money.format(Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)))}</td></tr>)}</tbody></table>
            <div className="document-bottom"><div className="document-notes"><strong>Condiciones comerciales</strong><ul>{data.budget.notes.filter(Boolean).map((note, index) => <li key={`print-note-${index}`}>{note}</li>)}<li>Validez de la oferta: {data.budget.validityDays || 0} días corridos.</li></ul></div><Totals subtotal={subtotal} tax={tax} total={total} taxRate={data.budget.taxRate} printMode /></div>
            <footer className="document-footer"><div>{data.company.responsibleName && <strong>{data.company.responsibleName}</strong>}{data.company.phone && <span>{data.company.phone}</span>}{data.company.email && <span>{data.company.email}</span>}</div></footer>
          </article>
        </section>
      </main>
      <footer className="app-footer no-print"><span>Volt <span>·</span> Herramienta local de cubicación y presupuestos</span><span><ShieldCheck size={14} />Tus datos permanecen en este dispositivo</span></footer>
    </div>
  );
}

function Totals({ subtotal, tax, total, taxRate, printMode = false }) {
  return <div className={`totals-card ${printMode ? 'print-totals' : ''}`}><div className="totals-row"><span>Subtotal neto</span><strong>${money.format(subtotal)}</strong></div><div className="totals-row"><span>IVA ({Number(taxRate) || 0}%)</span><strong>${money.format(tax)}</strong></div><div className="totals-row total-final"><span>Total a pagar</span><strong>${money.format(total)}</strong></div><small>Montos expresados en pesos chilenos (CLP).</small></div>;
}
