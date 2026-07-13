# Informe — Test funcional masivo de Coordinemos

**Fecha:** 2026-07-02
**Entorno:** DB local de desarrollo (`db/custom.db`), servidor `next dev` en `localhost:3000`
**Método:** script Node/TypeScript que llama a los endpoints reales de la API (no inserts SQL directos) para generar datos y simular el uso de jugadores/clubes reales.

## 1. Alcance generado

| Entidad | Cantidad |
|---|---|
| Clubes (`loadtest_club_01`…`10`) | 10 |
| Jugadores (10 por club) | 100 |
| Torneos (10 por club) | 100 |
| Canchas (3 por club) | 30 |
| Turnos disponibles (14 días × 3 canchas × 6 horarios, por club) | 252/club (2.520 total) |
| Parejas (4 por torneo, round-robin) | 400 |
| Partidos (todos-contra-todos, 6 por torneo) | **600** |
| Preferencias de turno enviadas por jugadores | **2.400** |

Fase 1 (setup) corrió en ~76s sin errores. Fase 2 (preferencias + verificación) corrió sin errores sobre los 600 partidos.

## 2. Casos de test y resultados

Cada torneo (6 partidos) se armó con una mezcla fija de 4 escenarios:

| Escenario | Descripción | Partidos | Resultado |
|---|---|---|---|
| **Feliz** | Los 4 jugadores eligen exactamente el mismo turno | 200 | 140 confirmaron automáticamente; 60 fueron bloqueados por doble-reserva legítima (ver §3) |
| **Colisión** | Un segundo partido intenta reservar un turno que otro partido ya confirmó | 100 | 100/100 — rechazado correctamente, sin duplicar el turno |
| **Negativo** | Las dos parejas eligen turnos distintos (sin acuerdo) | 200 | 200/200 — ninguno confirmó prematuramente |
| **Parcial** | 3 de 4 jugadores coinciden, 1 elige otro turno | 100 | 100/100 — ninguno confirmó con acuerdo incompleto |

**Errores de sistema durante todo el test: 0** (sobre ~3.700 llamadas a la API).

## 3. Hallazgo: los 60 casos "feliz" sin confirmar

Al investigar, los 60 partidos "feliz" que no confirmaron **no son un bug**: en el 100% de los casos, al menos uno de los 4 jugadores ya tenía un turno confirmado en otro partido a la misma fecha y hora (en otra cancha). Es la protección anti-doble-reserva de `checkAndConfirmMatch()` funcionando como corresponde.

La causa fue una limitación de mi propio diseño de datos de prueba: concentré demasiados turnos "objetivo" en pocos días calendario, y como los jugadores rotan entre los 10 torneos de un mismo club, terminaron compartiendo horarios entre sí. Verifiqué contra la base los 60 casos uno por uno — los 60 tienen esa explicación, cero anomalías sin explicar.

## 4. Notificaciones

- **700 notificaciones** de tipo `SLOT_CONFIRMED` creadas (140 confirmaciones × 5 destinatarios: 4 jugadores + 1 club). Cuadra exacto con lo esperado.
- Verificado en vivo: logueado como jugador de prueba (`90000000` / `PlayerTest123!`), aparecieron 7 notificaciones reales de "¡Turno confirmado!" con torneo, club, cancha, fecha/hora y nombres de las 4 parejas.
- Muestra de 10 jugadores (uno por club) verificada por API: 10/10 tenían la notificación de confirmación.

## 5. Ocultamiento de turnos reservados

En los 10 clubes se verificó:

| Club | Turnos confirmados | Turnos disponibles | Fuga (confirmado apareciendo como disponible) |
|---|---|---|---|
| 0–9 (los 10) | 14 c/u | 238 c/u | **0** |

Ningún turno confirmado apareció en la lista de disponibles, en ningún club. Verificado también en vivo desde el dashboard del club (`loadtest_club_01`): 238 turnos disp. / 14 confirmados, coincide exacto con la auditoría por API.

## 6. Conclusión

El flujo central de Coordinemos (confirmación automática de turno cuando los 4 jugadores coinciden, notificaciones a todos los involucrados, y ocultamiento de turnos ya reservados) funciona correctamente a escala — 600 partidos, 100 torneos, 10 clubes, sin bugs encontrados. La única desviación respecto a lo esperado (60/200 "feliz" sin confirmar) se explica en su totalidad por la protección anti-doble-reserva actuando correctamente sobre datos de prueba con horarios superpuestos entre torneos.

## 7. Próximo paso

Pendiente: borrado de los datos de prueba de `db/custom.db`. A definir con el usuario si se borra solo `loadtest_*` o toda la base (dejando únicamente el admin).
