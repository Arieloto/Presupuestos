export const CLASSIFICATIONS = ['OBLIGATORIO', 'SEGÚN DISEÑO', 'SEGÚN EQUIPO', 'SEGÚN INSTALACIÓN', 'OPCIONAL', 'REVISAR NORMATIVA'];

export const INSTALLATION_TYPES = [
  'Alumbrado', 'Fuerza', 'Alumbrado + fuerza', 'Tablero general', 'Tablero de distribución', 'Tablero de fuerza', 'Tablero de alumbrado', 'Tablero de control', 'Instalación embutida', 'Instalación sobrepuesta', 'Instalación subterránea', 'Instalación aérea', 'Bandejas portacables', 'Escalerillas', 'Canaletas', 'Alimentadores', 'Subalimentadores', 'Equipos especiales', 'Puesta a tierra', 'Instalaciones exteriores', 'Instalaciones interiores', 'Instalaciones en recintos especiales',
];

const make = (id, label, category, unit = 'un', classification = 'SEGÚN DISEÑO', fields = []) => ({ id, label, category, unit, classification, fields });
const enclosure = [make('board-cabinet', 'Gabinete', 'Tableros'), make('board-door', 'Puerta', 'Tableros'), make('board-cover', 'Cubierta cubreequipos', 'Tableros'), make('board-plate', 'Placa de montaje', 'Tableros'), make('board-din', 'Riel DIN', 'Tableros', 'm'), make('board-phase-bar', 'Barras de fase', 'Tableros'), make('board-neutral-bar', 'Barra de neutro', 'Tableros'), make('board-pe-bar', 'Barra PE / tierra', 'Tableros'), make('board-main-switch', 'Interruptor general', 'Protecciones'), make('board-breaker', 'Interruptores automáticos', 'Protecciones'), make('board-rcd', 'Diferenciales', 'Protecciones'), make('board-spd', 'Protección contra sobretensión (SPD)', 'Protecciones', 'un', 'REVISAR NORMATIVA'), make('board-motor-protector', 'Guardamotores', 'Protecciones', 'un', 'SEGÚN EQUIPO'), make('board-fuse', 'Fusibles y portafusibles', 'Protecciones'), make('board-isolator', 'Seccionadores', 'Protecciones'), make('board-contactor', 'Contactores', 'Control'), make('board-overload', 'Relés térmicos', 'Control', 'un', 'SEGÚN EQUIPO'), make('board-relay', 'Relés auxiliares', 'Control'), make('board-timer', 'Temporizadores', 'Control'), make('board-vfd', 'Variadores', 'Control', 'un', 'SEGÚN EQUIPO'), make('board-starter', 'Arrancadores', 'Control', 'un', 'SEGÚN EQUIPO'), make('board-selector', 'Selectores', 'Control'), make('board-button', 'Pulsadores', 'Control'), make('board-estop', 'Parada de emergencia', 'Control', 'un', 'SEGÚN EQUIPO'), make('board-pilot', 'Luces piloto', 'Control'), make('board-terminals', 'Borneras y terminales', 'Conexión'), make('board-comb', 'Peines y puentes', 'Conexión'), make('board-internal-duct', 'Canaletas internas', 'Tableros', 'm'), make('board-gland', 'Prensaestopas', 'Accesorios'), make('board-blanks', 'Tapas ciegas', 'Tableros'), make('board-fixings', 'Fijaciones y accesorios de montaje', 'Fijaciones'), make('board-labels', 'Rotulación', 'Documentación'), make('board-schematic', 'Diagrama unilineal / documentación', 'Documentación'), make('board-spare', 'Espacio de reserva', 'Tableros', 'un', 'REVISAR NORMATIVA')];

const conduitEm = ['Conduit', 'Coplas', 'Curvas', 'Adaptadores', 'Terminales', 'Cajas', 'Fijaciones', 'Accesorios'];
const conduitSurf = ['Tubos', 'Curvas', 'Coplas', 'Abrazaderas', 'Cajas', 'Adaptadores', 'Terminales', 'Soportes', 'Fijaciones'];
const conduitUnd = ['Ductos', 'Conduit', 'Cámaras', 'Tapas', 'Curvas', 'Coplas', 'Terminales', 'Cinta de advertencia', 'Protección mecánica', 'Material de protección', 'Señalización', 'Prensaestopas', 'Fijaciones'];
const conduitAir = ['Canalización', 'Mensajero', 'Tensores', 'Herrajes', 'Grapas', 'Abrazaderas', 'Soportes', 'Separadores', 'Cajas', 'Prensaestopas', 'Fijaciones'];
const tray = ['Tramos rectos', 'Curvas', 'Tes', 'Cruces', 'Reducciones', 'Uniones', 'Tapas', 'Soportes', 'Ménsulas', 'Varillas roscadas', 'Pernos', 'Tuercas', 'Arandelas', 'Fijaciones', 'Separadores'];
const ladder = ['Tramos', 'Curvas', 'Tes', 'Uniones', 'Soportes', 'Ménsulas', 'Fijaciones', 'Tapas'];
const channel = ['Tramos rectos', 'Curvas', 'Tes', 'Uniones', 'Tapas', 'Derivaciones', 'Separadores', 'Soportes', 'Fijaciones'];
const makeSystem = (prefix, name, rows) => rows.map((label, index) => make(`${prefix}-${index}`, label, `Canalización ${name}`, /tramos|tubos|conduit|ductos|canalización|mensajero|varillas/i.test(label) ? 'm' : 'un', label === 'Material de protección' ? 'REVISAR NORMATIVA' : 'SEGÚN INSTALACIÓN'));

const point = (prefix, details) => details.map(([label, category, unit = 'un', classification = 'SEGÚN DISEÑO']) => make(`${prefix}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, label, category, unit, classification));
const lightPoint = point('point-light', [['Caja', 'Cajas'], ['Luminaria', 'Iluminación', 'un', 'SEGÚN EQUIPO'], ['Portalámparas', 'Iluminación', 'un', 'SEGÚN EQUIPO'], ['Interruptor y placa', 'Mando'], ['Fase', 'Conductores', 'm'], ['Neutro', 'Conductores', 'm'], ['PE', 'Conductores', 'm'], ['Retorno', 'Conductores', 'm'], ['Canalización', 'Canalización', 'm'], ['Conectores', 'Conexión'], ['Chicotes', 'Conductores', 'm'], ['Fijaciones', 'Fijaciones']]);
const outletPoint = point('point-outlet', [['Caja', 'Cajas'], ['Enchufe y placa', 'Mecanismos'], ['Fase', 'Conductores', 'm'], ['Neutro', 'Conductores', 'm'], ['PE', 'Conductores', 'm'], ['Canalización', 'Canalización', 'm'], ['Conectores', 'Conexión'], ['Chicotes', 'Conductores', 'm'], ['Fijaciones', 'Fijaciones']]);
const equipmentPoint = point('point-equipment', [['Caja / salida', 'Cajas'], ['Protección', 'Protecciones', 'un', 'REVISAR NORMATIVA'], ['Conductores', 'Conductores', 'm'], ['PE', 'Conductores', 'm'], ['Canalización', 'Canalización', 'm'], ['Seccionamiento', 'Protecciones', 'un', 'REVISAR NORMATIVA'], ['Conectores', 'Conexión'], ['Prensaestopas', 'Accesorios'], ['Terminales', 'Conexión'], ['Fijaciones', 'Fijaciones']]);

const equipmentNames = ['Horno', 'Cocina eléctrica', 'Termo', 'Lavadora', 'Bomba', 'Motor', 'Ventilador', 'Aire acondicionado', 'Portón', 'Compresor', 'Soldadora', 'Equipo industrial', 'Cargador de vehículo eléctrico', 'Generador', 'UPS', 'Otro equipo de potencia'];
const motor = ['Alimentación', 'Canalización', 'Conductores', 'PE', 'Protección', 'Guardamotor', 'Contactor', 'Relé térmico', 'Seccionamiento', 'Mando y control', 'Terminales', 'Prensaestopas', 'Puesta a tierra', 'Accesorios'];
const equipmentTemplate = name => {
  const special = name === 'Motor' ? motor : ['Alimentación', 'Canalización', 'Conductores', 'PE', 'Protección', 'Seccionamiento', 'Conexiones y terminales', 'Prensaestopas', 'Puesta a tierra', 'Accesorios'];
  return special.map((label, index) => make(`equipment-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`, label, `Equipo · ${name}`, label === 'Canalización' || label === 'Conductores' ? 'm' : 'un', ['Conductores', 'Protección', 'Puesta a tierra'].includes(label) ? 'REVISAR NORMATIVA' : 'SEGÚN EQUIPO'));
};

const feeder = ['Conductores de fase', 'Conductor neutro', 'Conductor PE', 'Tierra de servicio', 'Canalización / soporte', 'Terminales / punteras', 'Prensaestopas / pasamuros', 'Protección origen', 'Protección destino', 'Seccionamiento', 'Identificación', 'Fijaciones y accesorios'];
const ground = ['Barra PE', 'Barra equipotencial', 'Conductor PE', 'Conductor de tierra', 'Tierra de servicio', 'Electrodos / barras', 'Cámaras y tapas', 'Conectores y abrazaderas', 'Uniones', 'Conductor enterrado', 'Protección mecánica', 'Elementos equipotenciales'];
const generalAccessories = ['Conectores', 'Regletas', 'Borneras', 'Terminales', 'Punteras', 'Manguitos', 'Empalmes', 'Conectores de compresión', 'Prensaestopas', 'Pasamuros', 'Adaptadores', 'Contratuercas', 'Coplas', 'Curvas', 'Uniones', 'Tes', 'Cruces', 'Reducciones', 'Tapas', 'Derivaciones', 'Abrazaderas', 'Grapas', 'Tarugos', 'Tornillos', 'Pernos', 'Tuercas', 'Arandelas', 'Soportes', 'Ménsulas', 'Varillas roscadas'];
const boxes = ['Caja de interruptor', 'Caja de enchufe', 'Caja de derivación', 'Caja de paso', 'Caja de conexión', 'Caja exterior', 'Caja estanca', 'Caja para equipos', 'Cámara subterránea', 'Caja asociada a tablero'];
const protection = ['Interruptor general', 'Automáticos', 'Diferenciales', 'Guardamotores', 'Fusibles', 'Portafusibles', 'Seccionadores', 'SPD / sobretensión', 'Protecciones de motores', 'Relés de protección'];
const conductors = ['Fase', 'Neutro', 'PE', 'Tierra de servicio', 'Retornos', 'Viajeros / conmutados', 'Control', 'Fuerza', 'Equipos', 'Alimentadores', 'Subalimentadores', 'Conductores especiales'];

export const COMPONENTS = [
  ...enclosure,
  ...makeSystem('embutida', 'embutida', conduitEm), ...makeSystem('sobrepuesta', 'sobrepuesta', conduitSurf), ...makeSystem('subterranea', 'subterránea', conduitUnd), ...makeSystem('aerea', 'aérea', conduitAir), ...makeSystem('bandeja', 'bandeja portacables', tray), ...makeSystem('escalerilla', 'escalerilla', ladder), ...makeSystem('canaleta', 'canaleta', channel),
  ...lightPoint, ...outletPoint, ...equipmentPoint,
  ...feeder.map((name, i) => make(`feeder-${i}`, name, 'Alimentadores', /conductores|tierra/i.test(name) ? 'm' : 'un', /protección/i.test(name) ? 'REVISAR NORMATIVA' : 'SEGÚN DISEÑO')),
  ...ground.map((name, i) => make(`ground-${i}`, name, 'Puesta a tierra', /conductor/i.test(name) ? 'm' : 'un', 'REVISAR NORMATIVA')),
  ...generalAccessories.map((name, i) => make(`accessory-${i}`, name, 'Accesorios', /varillas/i.test(name) ? 'm' : 'un', 'SEGÚN INSTALACIÓN')),
  ...boxes.map((name, i) => make(`box-${i}`, name, 'Cajas', 'un', 'SEGÚN INSTALACIÓN')),
  ...protection.map((name, i) => make(`protection-${i}`, name, 'Protecciones', 'un', 'REVISAR NORMATIVA', ['polos', 'corrienteNominal', 'curvaTipo', 'poderCorte', 'sensibilidad', 'marcaModelo', 'observaciones'])),
  ...conductors.map((name, i) => make(`conductor-${i}`, name, 'Conductores', 'm', 'SEGÚN DISEÑO', ['tipo', 'seccion', 'numeroConductores', 'longitud', 'color', 'aislacion', 'sistema', 'reserva'])),
  ...equipmentNames.flatMap(name => equipmentTemplate(name)),
];

export const TEMPLATES = [
  { id: 'panel-light', name: 'Tablero de alumbrado', types: ['Tablero de alumbrado', 'Alumbrado'], ids: ['board-cabinet', 'board-door', 'board-cover', 'board-plate', 'board-din', 'board-phase-bar', 'board-neutral-bar', 'board-pe-bar', 'board-main-switch', 'board-breaker', 'board-rcd', 'board-spd', 'board-terminals', 'board-comb', 'board-internal-duct', 'board-gland', 'board-blanks', 'board-fixings', 'board-labels', 'board-schematic', 'board-spare'] },
  { id: 'panel-force', name: 'Tablero de fuerza', types: ['Tablero de fuerza', 'Fuerza'], ids: ['board-cabinet', 'board-door', 'board-cover', 'board-plate', 'board-din', 'board-phase-bar', 'board-neutral-bar', 'board-pe-bar', 'board-main-switch', 'board-breaker', 'board-rcd', 'board-spd', 'board-motor-protector', 'board-fuse', 'board-isolator', 'board-contactor', 'board-overload', 'board-relay', 'board-timer', 'board-vfd', 'board-starter', 'board-selector', 'board-button', 'board-estop', 'board-pilot', 'board-terminals', 'board-comb', 'board-internal-duct', 'board-gland', 'board-blanks', 'board-fixings', 'board-labels', 'board-schematic', 'board-spare'] },
  { id: 'panel-mixed', name: 'Tablero mixto', types: ['Alumbrado + fuerza', 'Tablero general', 'Tablero de distribución'], ids: [...new Set(['board-cabinet', 'board-door', 'board-cover', 'board-plate', 'board-din', 'board-phase-bar', 'board-neutral-bar', 'board-pe-bar', 'board-main-switch', 'board-breaker', 'board-rcd', 'board-spd', 'board-motor-protector', 'board-fuse', 'board-isolator', 'board-contactor', 'board-overload', 'board-relay', 'board-vfd', 'board-terminals', 'board-comb', 'board-internal-duct', 'board-gland', 'board-blanks', 'board-fixings', 'board-labels', 'board-schematic', 'board-spare'])] },
  { id: 'conduit-embedded', name: 'Canalización embutida', types: ['Instalación embutida'], ids: conduitEm.map((_, i) => `embutida-${i}`) },
  { id: 'conduit-surface', name: 'Canalización sobrepuesta', types: ['Instalación sobrepuesta'], ids: conduitSurf.map((_, i) => `sobrepuesta-${i}`) },
  { id: 'conduit-underground', name: 'Canalización subterránea', types: ['Instalación subterránea'], ids: conduitUnd.map((_, i) => `subterranea-${i}`) },
  { id: 'conduit-aerial', name: 'Canalización aérea', types: ['Instalación aérea'], ids: conduitAir.map((_, i) => `aerea-${i}`) },
  { id: 'cable-tray', name: 'Bandeja portacables', types: ['Bandejas portacables'], ids: tray.map((_, i) => `bandeja-${i}`) },
  { id: 'cable-ladder', name: 'Escalerilla', types: ['Escalerillas'], ids: ladder.map((_, i) => `escalerilla-${i}`) },
  { id: 'cable-trunking', name: 'Canaletas', types: ['Canaletas'], ids: channel.map((_, i) => `canaleta-${i}`) },
  { id: 'light-point', name: 'Punto de iluminación', types: ['Alumbrado'], ids: lightPoint.map(item => item.id) },
  { id: 'outlet-point', name: 'Punto de enchufe simple/doble/triple', types: ['Fuerza'], ids: outletPoint.map(item => item.id) },
  { id: 'equipment-outlet', name: 'Salida para equipo', types: ['Equipos especiales'], ids: equipmentPoint.map(item => item.id) },
  { id: 'feeder', name: 'Alimentador / subalimentador', types: ['Alimentadores', 'Subalimentadores'], ids: feeder.map((_, i) => `feeder-${i}`) },
  { id: 'grounding', name: 'Puesta a tierra y equipotencialidad', types: ['Puesta a tierra'], ids: ground.map((_, i) => `ground-${i}`) },
  { id: 'accessories', name: 'Conectores y accesorios', types: ['Alumbrado', 'Fuerza'], ids: generalAccessories.map((_, i) => `accessory-${i}`) },
  { id: 'boxes', name: 'Familia de cajas', types: ['Alumbrado', 'Fuerza'], ids: boxes.map((_, i) => `box-${i}`) },
  { id: 'protection', name: 'Protecciones', types: ['Tablero general', 'Tablero de distribución'], ids: protection.map((_, i) => `protection-${i}`) },
  ...equipmentNames.map((name, i) => ({ id: `special-${i}`, name: `Equipo especial: ${name}`, types: [name, 'Equipos especiales'], ids: equipmentTemplate(name).map(item => item.id) })),
];

export const FINAL_CHECKLIST = [
  'Cajas', 'Enchufes', 'Interruptores', 'Luminarias', 'Conductores fase', 'Conductores neutro', 'Conductores PE', 'Retornos', 'Canalizaciones', 'Curvas', 'Coplas', 'Cajas de derivación', 'Conectores', 'Fijaciones', 'Tableros', 'Protecciones', 'Diferenciales', 'Puesta a tierra', 'Equipos especiales', 'Elementos exteriores', 'Elementos subterráneos', 'Elementos aéreos', 'Accesorios', 'Reserva / desperdicio', 'Rotulación', 'Documentación',
];

export const RIC_REFERENCES = [
  { id: 'RIC-02', title: 'Tableros eléctricos', url: 'https://www.sec.cl/reglamento-de-seguridad-de-las-instalaciones-de-consumo-de-energia-electrica-decreto-08/' },
  { id: 'RIC-03', title: 'Alimentadores y demanda de una instalación', url: 'https://www.sec.cl/reglamento-de-seguridad-de-las-instalaciones-de-consumo-de-energia-electrica-decreto-08/' },
  { id: 'RIC-04', title: 'Conductores, materiales y sistemas de canalización', url: 'https://www.sec.cl/reglamento-de-seguridad-de-las-instalaciones-de-consumo-de-energia-electrica-decreto-08/' },
  { id: 'RIC-05', title: 'Protección contra tensiones peligrosas y descargas eléctricas', url: 'https://www.sec.cl/reglamento-de-seguridad-de-las-instalaciones-de-consumo-de-energia-electrica-decreto-08/' },
  { id: 'RIC-06', title: 'Puesta a tierra y enlace equipotencial', url: 'https://www.sec.cl/reglamento-de-seguridad-de-las-instalaciones-de-consumo-de-energia-electrica-decreto-08/' },
  { id: 'RIC-07', title: 'Instalaciones de equipos', url: 'https://www.sec.cl/reglamento-de-seguridad-de-las-instalaciones-de-consumo-de-energia-electrica-decreto-08/' },
  { id: 'RIC-10', title: 'Instalaciones de uso general', url: 'https://www.sec.cl/reglamento-de-seguridad-de-las-instalaciones-de-consumo-de-energia-electrica-decreto-08/' },
  { id: 'RIC-11', title: 'Instalaciones especiales', url: 'https://www.sec.cl/reglamento-de-seguridad-de-las-instalaciones-de-consumo-de-energia-electrica-decreto-08/' },
  { id: 'RIC-15', title: 'Infraestructura para la recarga de vehículos eléctricos', url: 'https://www.sec.cl/reglamento-de-seguridad-de-las-instalaciones-de-consumo-de-energia-electrica-decreto-08/' },
];
