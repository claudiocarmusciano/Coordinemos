# Brief para LLM — Perfil del desarrollador y tipo de aplicaciones que construye

> **Cómo usar este documento:** sos un LLM que tiene que generar una **página web (landing) informativa y promocional** sobre el trabajo de este desarrollador y el tipo de aplicaciones que hace. Toda la información que necesitás está acá. Donde diga **[COMPLETAR]**, son datos personales/de contacto que el desarrollador debe llenar — **no los inventes**. Tampoco exageres capacidades: el objetivo es comunicar con precisión y de forma atractiva, no inflar.

---

## 1. En una frase

Desarrollador full-stack independiente que construye **aplicaciones web a medida tipo SaaS** para comercios, clubes, ligas deportivas y comunidades —de la idea a producción— combinando ingeniería sólida (Java/Spring + React) con **features potenciados por IA**.

Base: **Olavarría, Argentina.** Trabaja con foco en negocios y comunidades locales, pero las apps son multi-cliente y escalables.

---

## 2. Perfil del desarrollador

- **Rol:** desarrollador full-stack que se hace cargo del ciclo completo — diseño de dominio, backend, frontend, base de datos, infraestructura, deploy y mantenimiento.
- **Modalidad:** independiente / autor de producto. No es "un freelance que entrega y se va": construye productos reales, los pone en producción y los itera con el cliente.
- **Diferencial de forma de trabajo:** entiende el **dominio del negocio** antes de programar (reglas, roles, flujos reales) y modela el software alrededor de eso. Prioriza una evaluación **honesta y crítica** de las decisiones técnicas por sobre la complejidad innecesaria.
- **Metodología de entrega:** construye en una rama, prueba en local, valida con el cliente y **recién entonces** despliega a producción. Los cambios chicos y seguros van directo. Esto da previsibilidad y cero sorpresas en producción.
- **Marca asociada:** trabaja bajo/junto a la marca **"Coordinemos"** (apps de coordinación y gestión). *(Confirmar posicionamiento exacto de la marca — ver [COMPLETAR].)*

---

## 3. Qué tipo de aplicaciones construye (ejemplos reales)

Usar estos casos como prueba de capacidad. Se pueden presentar como "proyectos" o casos de estudio.

### a) Plataforma de gestión de ligas y torneos deportivos (pádel)
SaaS **multi-tenant** para una liga zonal: administra clubes/complejos, categorías, padrón de jugadores compartido, **fixtures y zonas automáticos**, llaves de eliminación, **ranking por categoría** y cronograma de canchas. Cada club entra con su propio login, ve toda la liga (lectura) y edita solo lo suyo; el administrador controla todo. Incluye emails transaccionales (altas, contraseñas) y reglas de negocio finas (ej. segunda ronda de zona, permisos de gestión de ranking).
**Por qué impresiona:** arquitectura multi-tenant real, jerarquía de roles, lógica deportiva no trivial automatizada.

### b) Plataforma de venta de tecnología con IA
E-commerce/catálogo de productos tecnológicos con una capa de **inteligencia artificial que parsea listas de precios enviadas por WhatsApp** y las convierte en productos estructurados. Orientada a un comercio local.
**Por qué impresiona:** integración de LLMs para automatizar carga de datos desde mensajería informal (un dolor real de muchos comercios).

### c) Apps de coordinación / gestión ("Coordinemos")
Aplicaciones web para coordinar y administrar actividades de comunidades y comercios (turnos, fixtures, organización). Construidas con stack moderno (Next.js).

> Patrón común de todos los proyectos: **digitalizar un proceso que hoy se hace con planillas, grupos de WhatsApp y memoria**, y convertirlo en una herramienta ordenada, con roles, automatización y datos confiables.

---

## 4. Stack tecnológico (real, en uso)

**Backend**
- Java 21 + **Spring Boot 4** (Spring Web, Spring Data JPA)
- **Spring Security 6 + JWT** (autenticación y autorización por roles)
- **Hibernate / JPA** sobre **PostgreSQL**
- Node.js / **Next.js (API routes)** + **Prisma** en proyectos del ecosistema JS

**Frontend**
- **React + TypeScript + Vite**
- **Tailwind CSS + shadcn/ui** (UI moderna y accesible)
- **TanStack Query** (estado de servidor, caché, sincronización)
- **Next.js** para apps full-stack JS

**Datos**
- **PostgreSQL** como base principal
- Modelado de dominio cuidado (entidades, relaciones, aislamiento por tenant)
- SQLite en prototipos

**Infraestructura / DevOps**
- **Docker** (imágenes multi-stage)
- Deploy en **Railway** con **CI/CD: auto-deploy on push** a la rama principal
- Caddy como reverse proxy en algunos setups
- Manejo de variables de entorno y secretos para distintos entornos

**IA / features inteligentes**
- Integración de **LLMs** para automatizar tareas (ej. extraer datos estructurados de mensajes de WhatsApp)
- Uso de **asistentes de IA para desarrollo** (pair-programming con herramientas tipo Claude Code) como parte del flujo de trabajo — más velocidad sin resignar control de calidad

---

## 5. Técnicas y prácticas de ingeniería (diferenciales para destacar)

- **Arquitectura multi-tenant:** una sola app sirve a múltiples clientes/organizaciones con datos aislados entre sí.
- **Control de acceso por roles (RBAC):** jerarquías de permisos (admin global, administrador de organización, usuario de sucursal, invitado de solo lectura) con aislamiento de lectura y escritura.
- **Automatización de reglas de negocio:** lo que un humano haría a mano (armar un fixture, calcular un ranking, programar canchas) lo resuelve el sistema.
- **Emails transaccionales** (SMTP) para onboarding, contraseñas y notificaciones.
- **Integración de IA** para sacar trabajo manual repetitivo (carga de datos, parsing).
- **Despliegue continuo** y entornos separados (local / producción).
- **Disciplina de release:** branch → test local → validación del cliente → deploy. Migraciones y datos tratados con backups y verificación.
- **Diseño orientado al dominio:** el modelo de datos refleja el negocio real, no una abstracción genérica.

---

## 6. Propuesta de valor (mensajes centrales para la landing)

1. **De la planilla a la plataforma.** Convierte procesos informales (Excel, WhatsApp, papel) en software ordenado, con roles y automatización.
2. **A medida, no genérico.** Cada app se modela sobre las reglas reales del negocio del cliente.
3. **Full-stack de punta a punta.** Una sola persona responsable del producto completo: menos intermediarios, decisiones coherentes.
4. **IA aplicada con criterio.** Usa inteligencia artificial donde aporta valor real (automatizar lo aburrido), no como adorno.
5. **Producción de verdad.** No son demos: son apps desplegadas, en uso, mantenidas e iteradas.
6. **Tecnología sólida y actual.** Stack moderno (Spring Boot, React, PostgreSQL, Docker, CI/CD).

---

## 7. Clientes ideales / a quién le sirve

- **Clubes y ligas deportivas** que organizan torneos y rankings.
- **Comercios y PyMEs** que necesitan catálogo, ventas o automatización de carga de datos.
- **Comunidades y organizaciones** que coordinan turnos, actividades o socios.
- En general: cualquiera que hoy gestione su operación con planillas y mensajería y quiera profesionalizarla con una herramienta propia.

---

## 8. Tono y estilo de la página

- **Idioma:** español rioplatense, cercano pero profesional (tratamiento informal "vos" es aceptable y deseable).
- **Tono:** claro, concreto, sin humo. Nada de jerga vacía ("soluciones disruptivas de vanguardia"). Mostrar resultados y capacidades reales.
- **Énfasis:** los problemas que resuelve (planillas, desorden, trabajo manual) y cómo el software los elimina. Hablar el idioma del cliente, no solo el técnico.
- **Tecnología:** mencionarla como respaldo de seriedad, pero traducida a beneficios (ej. "multi-tenant" → "tu organización con su propio espacio seguro").

---

## 9. Estructura sugerida para la landing

1. **Hero:** propuesta de valor en una frase + CTA ("Contame tu proyecto" / "Pedí una demo").
2. **El problema:** "¿Tu negocio funciona a planilla y WhatsApp?" — identificación con el dolor.
3. **Qué hago:** tipos de aplicaciones (gestión deportiva, e-commerce con IA, apps de coordinación).
4. **Casos / proyectos:** los 3 ejemplos de la sección 3 como tarjetas.
5. **Cómo trabajo:** método (entender el dominio → construir → validar → deployar).
6. **Stack / tecnología:** chips de tecnologías como prueba de solidez.
7. **Diferenciales:** propuesta de valor (sección 6).
8. **Sobre mí / la marca Coordinemos.**
9. **CTA final + contacto.**
10. **Footer.**

---

## 10. Datos a completar por el desarrollador (NO inventar)

- **[COMPLETAR]** Nombre y/o marca pública a mostrar.
- **[COMPLETAR]** Email / WhatsApp / formulario de contacto.
- **[COMPLETAR]** Links: portfolio, GitHub, LinkedIn, demos públicas.
- **[COMPLETAR]** ¿Se pueden nombrar clientes reales o conviene anonimizar los casos?
- **[COMPLETAR]** Posicionamiento exacto y paleta de la marca "Coordinemos" (hay un manual de marca disponible).
- **[COMPLETAR]** ¿Ofrece también mantenimiento/soporte mensual? ¿Modelo de cobro (proyecto cerrado / suscripción)?

---

## 11. Qué NO afirmar

- No inventar cantidades de clientes, ingresos, premios ni años de experiencia que no estén confirmados.
- No prometer plazos ni precios específicos sin que el desarrollador los defina.
- No describir tecnologías que no estén en la sección 4.
- No exponer datos sensibles (emails internos, credenciales, nombres de clientes sin permiso).
- No presentar la IA como "100% autónoma" ni como reemplazo del criterio humano: el desarrollador mantiene el control y la calidad.
