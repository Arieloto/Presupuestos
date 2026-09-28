# Funcionamiento de la cubicación asistida

## Objetivo

La cubicación asistida de Volt sirve como **memoria de obra y apoyo para ordenar materiales** de una instalación eléctrica. Ayuda a recordar familias de elementos, registrar medidas y consolidar cantidades para preparar partidas de presupuesto.

> **No dimensiona ni certifica una instalación.** No selecciona secciones de conductores, protecciones ni capacidades de canalización. Las cantidades y especificaciones deben basarse en planos, mediciones y criterios definidos por el responsable del proyecto. Las etiquetas del catálogo son recordatorios, no determinaciones normativas.

## Acceso

1. Abrir Volt en el navegador.
2. Entrar a la sección **Cubicación** desde la navegación superior o continuar desde los datos del proyecto.
3. Usar el flujo principal **Plantillas → Items**. Recorridos, Materiales, Checklist final y Referencias RIC son herramientas secundarias.

## Flujo recomendado

### 1. Plantillas

En **Plantillas** se eligen tipos de instalación y una plantilla para seleccionar materiales.

- Marca los tipos aplicables: alumbrado, fuerza, tableros, canalizaciones, alimentadores, puesta a tierra, equipos especiales, entre otros.
- La selección de tipos solo organiza tu revisión; no agrega materiales automáticamente.
- Al seleccionar una plantilla se muestra su lista de elementos. Marca únicamente lo necesario; **abrir o cambiar de plantilla no modifica Items**.
- Usa **Seleccionar todos** o **Limpiar selección** para ajustar las casillas. **Cancelar** cierra la selección sin agregar líneas.
- **Confirmar y agregar a Items** crea una línea por elemento marcado, con cantidad y precio unitario en cero. Completa ambos datos en Items.
- Si hay elementos que coinciden con Items existentes, la aplicación avisa y permite cancelar o agregarlos de todos modos como líneas independientes.
- Los elementos incorporados conservan en observaciones el nombre de la plantilla y un origen identificable. La plantilla no calcula cantidades ni especificaciones.
- **Restablecer Cubicación** sigue disponible para limpiar las herramientas de memoria (tipos, componentes, recorridos y checklist); no borra Items existentes.
- El catálogo permite añadir componentes puntuales a la memoria de Cubicación. Los recorridos, cantidades calculadas y materiales de revisión no pasan a Items automáticamente; el usuario decide qué incorporar.

Las plantillas disponibles cubren tableros, puntos de iluminación y enchufes, canalizaciones embutidas/sobrepuestas/subterráneas/aéreas, bandejas, escalerillas, canaletas, alimentadores, puesta a tierra, accesorios, cajas, protecciones y equipos especiales, por ejemplo motores, bombas, hornos y cargadores de vehículos eléctricos.

### 2. Recorridos

En **Recorridos** se registran tramos medidos entre un origen y un destino.

Para cada recorrido puedes indicar:

- origen y destino;
- sistema de canalización;
- longitud de ruta;
- modo y valor de reserva;
- nota de revisión;
- uno o más conductores asociados.

Para cada conductor se registran su función, tipo, sección, cantidad de conductores, longitud, color, aislación, chicotes y reserva. La sección y características técnicas las define el diseño, no la aplicación.

La cantidad teórica del conductor se obtiene así:

`longitud del conductor × número de conductores + longitud de chicotes`

La longitud del conductor usa su longitud específica si se ingresó; si no, usa la longitud del recorrido. Después se calcula la reserva:

- Por porcentaje: `reserva = cantidad teórica × porcentaje / 100`.
- Absoluta: la reserva corresponde al valor ingresado en la unidad del material.
- Ajustada: `teórica + reserva`.

La canalización genera su propia línea cuando el recorrido tiene una longitud mayor que cero y se seleccionó un sistema. Su cantidad se calcula a partir de la longitud del recorrido y su reserva.

**Ejemplo:** 18 m de recorrido, 3 conductores y 2 m de chicotes producen 56 m teóricos. Con 10 % de reserva se agregan 5,6 m y resultan 61,6 m ajustados.

Las líneas calculadas desde recorridos aparecen en la tabla y pueden agregarse a los componentes de la cubicación para editarlas y consolidarlas con el resto.

### 3. Materiales

La pestaña **Materiales** muestra componentes agregados al espacio de memoria o generados desde recorridos. Cada registro tiene un identificador estable (`MAT-######`). Esta vista sirve para revisar cantidades y especificaciones de la cubicación; no es el paso de incorporación comercial a Items.

En los componentes editables puedes registrar:

- descripción, categoría, especificación y unidad;
- cantidad teórica;
- reserva porcentual o absoluta;
- envase comercial o paso de compra, si se conoce;
- notas y estado de revisión.

También se registra el origen del material (catálogo o recorrido). Los estados y relaciones de destino que puedan existir en borradores anteriores se conservan para compatibilidad, pero el gestor de destinos ya no forma parte del flujo visible.

La aplicación conserva separadas estas cifras:

1. **Teórica:** cantidad base ingresada o calculada.
2. **Reserva:** cantidad adicional según el modo elegido.
3. **Ajustada:** teórica más reserva.
4. **Compra:** cantidad redondeada según el envase o paso de compra indicado. Si no se especifica, no se inventa una presentación comercial. Para unidades enteras, la compra se redondea al entero superior.

El consolidado de consulta agrupa por categoría, descripción, especificación y unidad. La política de envase/paso de compra se aplica al registro editable; confirma que los materiales agrupados y sus presentaciones sean compatibles antes de usar el consolidado en una oferta.

### 4. Checklist final

En **Checklist final** revisa las familias de materiales y registra su estado. Cada entrada permite marcarla como pendiente, revisada, incluida o no aplicable, además de añadir una nota.

La checklist no confirma automáticamente que un material sea exigible; deja constancia de que el usuario lo revisó para esa obra.

### 5. Referencias RIC

La pestaña **Referencias RIC** ofrece accesos a la página oficial de la SEC y temas relacionados con tableros, alimentadores, conductores, protecciones, puesta a tierra, equipos, instalaciones de uso general, instalaciones especiales y recarga de vehículos eléctricos.

Las referencias son temáticas. Antes de definir una obligación o solución, consulta el texto oficial aplicable y verifica su vigencia y alcance para el proyecto. Si no se ha verificado un requisito concreto, debe tratarse como pendiente de revisión normativa.

### 6. Items y presupuesto final

**Items** es la lista comercial que se usa para calcular el presupuesto. Las líneas agregadas desde plantillas aparecen allí con cantidad y precio cero para que el usuario complete los valores. Los Items existentes no se reemplazan al agregar una plantilla; coincidencias se anuncian antes de crear otra línea. El área heredada **Presupuesto final** y sus vínculos de borradores antiguos se mantienen para compatibilidad, pero no se ofrecen como destino en el nuevo flujo de plantillas.

## Guardado y respaldo

Los datos se guardan automáticamente en el almacenamiento local del navegador. La cubicación, IDs, destinos, relaciones y auditoría forman parte de los datos del presupuesto y se incluyen en la exportación JSON existente. La migración de borradores anteriores completa campos nuevos sin cambiar las partidas comerciales preexistentes. Usa **Exportar** para guardar una copia de respaldo y **Importar JSON** para recuperar un archivo.

El guardado local pertenece a ese navegador y dispositivo; borrar sus datos puede eliminar el borrador. Mantén una copia exportada si necesitas conservar el trabajo.

## Recomendaciones de uso

- Registra medidas reales o tomadas de planos revisados; evita tratar estimaciones como cantidades verificadas.
- Revisa por separado fase, neutro, PE, retornos, conductores de control y chicotes cuando correspondan.
- Completa las especificaciones para que la consolidación no una materiales distintos.
- Configura envases o pasos de compra solo con información comercial confirmada.
- Verifica cajas, uniones, curvas, conectores, fijaciones, soportes, terminales, rotulación, puesta a tierra, documentación y reservas antes de cerrar.
- Confirma la cubicación y los requisitos técnicos/normativos con la documentación del proyecto y el profesional responsable.
- Antes de confirmar un lote, lee la vista previa y verifica que no haya materiales enviados al destino equivocado; usa **Cancelar** si necesitas revisar.
- “Enviado” significa asignado a un destino interno del presupuesto; no significa que se haya enviado a un cliente, proveedor o sistema externo.

## Módulos relacionados

- `src/Presupuesto/PresupuestoApp.jsx`: interfaz, estado del presupuesto, persistencia local y selección de plantilla a Items.
- `src/Presupuesto/catalogoCubicacion.js`: catálogo, tipos de instalación, plantillas, checklist y referencias.
- `src/Presupuesto/cubicacion.js`: migración de datos, IDs estables, reservas, validación, cálculo de recorridos, destinos, relaciones y auditoría.
- `src/Presupuesto/Cubicacion.css`: estilos de las vistas de cubicación.
- `src/Presupuesto/catalogoCubicacion.test.js`: pruebas de catálogo y cálculos.
- `WORKFLOW_CUBICACION.md`: estados, reglas de destino, validaciones y trazabilidad del workflow.
