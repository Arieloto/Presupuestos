# Compatibilidad de workflow de materiales (borradores existentes)

El siguiente modelo describe relaciones guardadas por versiones anteriores. El flujo actual de plantillas agrega elementos directamente a **Items** después de que el usuario los selecciona y confirma; no usa la pestaña «Gestionar destinos».

## Estados y destinos

Cada material se conserva como registro fuente en `takeoff.components` con identificador `MAT-######`. Su `workflowStatus` (pendiente, revisado, asignado, listo_para_enviar, enviado, modificado, confirmado o error) es independiente de `validationStatus` (válido, advertencia o error) y de `destination` (solo cubicación, partida, presupuesto final o ambos).

El envío a destinos requiere una acción de usuario y confirmación explícita. El lote se previsualiza con cantidades, destino y validaciones. Errores bloquean el envío del lote; el usuario puede cancelar, volver a corregir o confirmar el subconjunto válido. Las advertencias no bloquean, pero son visibles en la tabla y el diálogo.

## Fuente de verdad, relaciones y reversibilidad

- `takeoff.components` es la fuente de verdad y no se borra al enviar a otro destino.
- `items` conserva Items del presupuesto y `finalBudget` conserva las líneas consolidadas creadas por el workflow anterior. Cada línea derivada tiene `sourceMaterialId` y su ID destino se guarda en `destinationRelations` del material. Las líneas finales se incluyen en totales y A4.
- Reenviar un material actualiza sus líneas vinculadas en lugar de duplicarlas. Los precios unitarios editados se preservan al actualizar metadatos/cantidades.
- Cambiar el destino o volver a “solo cubicación” elimina únicamente las relaciones administradas por ese material; no elimina el material fuente.
- Eliminar desde Cubicación requiere confirmación y no elimina partidas destino automáticamente. La UI identifica que hay que retirar esas relaciones por separado.
- Eliminar una línea desde Partidas/presupuesto final requiere confirmación y limpia solo la relación correspondiente, dejando el material fuente.
- Editar el material fuente recalcula las cantidades vinculadas y conserva los precios comerciales unitarios; borrar una relación exige la acción explícita desde su destino.
- Las ediciones posteriores a un envío marcan el material como `modificado`. Confirmar la cubicación vuelve a registrar timestamp y auditoría; las modificaciones de datos invalidan la confirmación global.

## Validación y auditoría

El validador comprueba identificador único, categoría, descripción, unidad, cantidad finita/no negativa y destino. Un destino externo además exige cantidad mayor que cero. Especificación, origen, nota y duplicados potenciales generan advertencias. Cada cambio confirmado de destino y cada confirmación de Cubicación agregan un evento a `audit`, con hora ISO, acción, estado anterior/nuevo, ID de material y origen.

La migración de borradores versión 1 agrega IDs y estados faltantes sin cambiar datos comerciales existentes. La importación/exportación JSON incluye estas relaciones y auditoría a través del guardado de `data`.

## Límites

La acción “confirmar Cubicación” registra una confirmación local, no emite documentos ni envía datos a terceros. Las líneas finales tienen precio unitario cero al crearse y requieren revisión comercial. El estado enviado significa que el material se asignó al destino interno, no que haya sido transmitido externamente.