# EcoSmart UCS Table · Simulador 3D

Simulación interactiva del concepto de una mesa con asientos, sombra y carga para celulares mediante energía solar y eólica. Preparada como sitio estático para GitHub Pages. El modelo 3D representa el concepto del proyecto; no es un plano de fabricación.

## Qué puedes explorar

- Girar y acercar la vista de la mesa y su cubierta solar; observar la turbina y la iluminación.
- Ajustar la irradiancia solar de **0 a 1000 W/m²** y el viento de **0 a 25 m/s**.
- Comparar la **potencia instantánea (W)** y la **energía acumulada (Wh)** de cada fuente por separado.
- Conectar de **0 a 6 celulares** y observar la demanda, la reserva de batería y el balance energético.
- Probar escenarios soleado, nublado y nocturno, acelerar el tiempo, pausar y reiniciar el experimento.
- Descargar los datos del experimento en CSV para analizarlos o usarlos en una presentación.

La simulación comienza **en pausa**, con una velocidad de **60×** y la batería al **60 %**. Inicia el experimento para acumular energía. Reiniciar devuelve el tiempo y los acumulados a cero y la batería al 60 %, conservando las condiciones elegidas. Cambiar un control modifica la potencia inmediatamente; el tiempo solo avanza durante la ejecución.

La animación de la turbina sigue representando el viento aunque el experimento esté en pausa: **pausar detiene el tiempo y la energía acumulada**, no la representación visual del entorno. Al ocultar la pestaña, el tiempo simulado también se detiene; no se acumula energía en segundo plano.

Los escenarios son ejemplos de comparación, **no registros meteorológicos del campus**:

| Escenario | Irradiancia | Viento |
|---|---:|---:|
| Soleado | 1000 W/m² | 5 m/s |
| Nublado | 250 W/m² | 8 m/s |
| Noche | 0 W/m² | 9 m/s |

## Abrir en tu computadora

**Descomprime la carpeta completa y abre `index.html` con doble clic.** Se abrirá en tu navegador. Pulsa **Iniciar** para comenzar a acumular energía y usa los controles del sol y del viento para cambiar las condiciones.

Mantén `app.bundle.js`, `styles.css` y los demás archivos junto a `index.html`; no muevas únicamente ese archivo a otra carpeta. La versión incluida ya está preparada para funcionar: **no necesitas instalar paquetes, Node.js ni Python**, ni ejecutar una compilación. No requiere una cuenta, una clave de API ni conexión a un servicio externo.

La entrega también incluye **`ABRIR_EcoSmart_3D.html`**, fuera de esta carpeta: es una versión autónoma que puedes abrir con doble clic y trasladar por sí sola. Para editar el proyecto y subirlo a GitHub, utiliza esta carpeta completa.

Opcionalmente, si ya tienes Node.js, puedes ejecutar `npm start` desde esta carpeta y abrir `http://localhost:8000`. Una vez publicado en GitHub Pages, basta con abrir el enlace del sitio.

## Publicarlo en GitHub Pages

El proyecto está listo para subir. Estos pasos los realizas en tu cuenta; la entrega no crea un repositorio ni publica contenido automáticamente.

1. Crea un repositorio en GitHub. Para una publicación sencilla con GitHub Pages, utiliza un repositorio público o un plan que admita Pages para repositorios privados.
2. Sube el **contenido de esta carpeta** a la raíz del repositorio: `index.html` debe quedar en la raíz, junto a `app.bundle.js`, `styles.css`, los archivos fuente y las demás carpetas incluidas. No subas únicamente el ZIP ni dejes el sitio dentro de una carpeta adicional. No subas `node_modules/` si instalaste herramientas para editar el código.
3. Conserva el archivo `.nojekyll` y las carpetas incluidas. Puedes usar la carga de archivos de GitHub o Git para subirlos.
4. En el repositorio, abre **Settings → Pages**.
5. En **Build and deployment**, selecciona **Deploy from a branch**.
6. Selecciona la rama **main** y la carpeta **/(root)**, luego **Save**.
7. Espera a que GitHub termine de publicar. La sección Pages mostrará el enlace real del sitio; ábrelo y compártelo.

Si tu rama principal tiene otro nombre, elige esa rama. Las rutas de archivos son relativas para funcionar también cuando GitHub Pages aloja el sitio bajo el nombre del repositorio.

Referencia: [documentación oficial de GitHub Pages sobre publicación desde una rama](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Cómo se calculan los resultados

Son **estimaciones didácticas**, no mediciones del prototipo. Se conservan las capacidades nominales del documento del proyecto: paneles de **300 Wp**, aerogenerador de **150 W** y batería de **12 V × 20 Ah = 240 Wh**. Los demás parámetros que siguen son supuestos explícitos para explorar el comportamiento.

### Energía solar

El control representa la **irradiancia efectiva que llega a los paneles**, en W/m²; no iluminancia en lux.

```text
Potencia solar = 300 × (irradiancia / 1000) × 0,85
```

El factor fijo **0,85** representa pérdidas globales supuestas. No es la eficiencia de conversión de una célula ni un valor medido. A 1000 W/m², el resultado estimado es **255 W**. No se calculan por separado temperatura, orientación, suciedad ni sombras locales; el control ya representa la irradiancia efectiva sobre el conjunto.

### Energía eólica

Se utiliza una curva ilustrativa basada en el crecimiento cúbico de la energía disponible en el viento:

| Velocidad `v` | Potencia eólica estimada |
|---|---|
| `v ≤ 3 m/s` | 0 W |
| `3 < v < 12 m/s` | `150 × (v³ − 3³) / (12³ − 3³)` W |
| `12 ≤ v < 25 m/s` | 150 W |
| `v ≥ 25 m/s` | 0 W por parada de protección |

Las velocidades de arranque, nominal y protección son **supuestos**, no especificaciones del aerogenerador propuesto. Para predecir producción real hacen falta la curva del fabricante y mediciones del emplazamiento. El movimiento de la turbina es una representación visual, no una predicción de revoluciones por minuto.

### Consumo, batería y tiempo

- Cada celular solicita **15 W constantes**. No se modela su porcentaje de batería ni la variación de la carga rápida.
- La batería almacena hasta **240 Wh** y comienza con **144 Wh**. Esta reserva inicial no se cuenta como generación solar o eólica.
- La batería es ideal: no hay pérdidas, reserva mínima, envejecimiento ni límite de potencia de carga o descarga. No se incluyen consumos auxiliares del controlador, sensores o inversor.
- La generación atiende primero la demanda. El excedente carga la batería; al llenarse, el excedente restante se recorta. Cuando falta generación, la batería atiende la diferencia hasta agotarse.
- **W** expresa potencia en un instante. **Wh** expresa energía acumulada: `energía = potencia × horas`.
- A **60×**, un segundo real equivale a un minuto simulado. La aceleración cambia el tiempo, no los vatios.

La energía acumulada de cada fuente representa su energía disponible **antes del recorte por almacenamiento lleno**. El balance conserva:

```text
Reserva inicial + generación solar + generación eólica
= batería actual + consumo atendido + excedente recortado

Demanda total = consumo atendido + consumo no atendido
```

El cálculo respeta los límites incluso cuando la batería se llena o se agota a mitad de un intervalo. Los resultados no incorporan datos del clima real del Campus Villa, turbulencia, obstáculos, estacionalidad ni una validación estructural o eléctrica.

### Fuentes de los principios físicos

Estas referencias respaldan los principios; no certifican los parámetros escogidos ni el prototipo.

- [NREL: PVWatts Version 1 Technical Reference, ecuación 5](https://www.nrel.gov/docs/fy14osti/60272.pdf): relación entre potencia fotovoltaica e irradiancia referida a 1000 W/m². El simulador usa una simplificación propia y no implementa el modelo completo de PVWatts.
- [U.S. Department of Energy: Small Wind Guidebook](https://www.energy.gov/cmei/systems/windexchange/small-wind-guidebook): dependencia cúbica respecto a la velocidad del viento y necesidad de considerar la curva del equipo y el recurso local.
- [U.S. Department of Energy: Enabling Wind Power Nationwide, sección 3](https://www.energy.gov/sites/prod/files/2015/05/f22/Enabling%20Wind%20Power%20Nationwide_18MAY2015_FINAL.pdf): velocidades de arranque, potencia nominal y parada de protección.

## Personalizar el proyecto

| Archivo | Qué modifica |
|---|---|
| `index.html` | Textos, estructura y controles de la interfaz |
| `styles.css` | Colores, tipografía, disposición y adaptación a pantallas pequeñas |
| `scene.js` | Geometría de la mesa, asientos, cubierta, turbina, entorno y animaciones 3D |
| `model.js` | Capacidades nominales, curva de generación, consumo y balance de batería |
| `app.js` | Interacción entre controles, gráficos, tiempo, exportación y escena |
| `app.bundle.js` | Versión preparada del código y de Three.js que carga el navegador; se genera con `npm run build` |
| `vendor/` | Three.js y controles de cámara incluidos localmente |
| `build.mjs` | Preparación de `app.bundle.js` con esbuild |
| `tests/model.test.mjs` | Comprobaciones del modelo energético |
| `server.mjs` | Servidor local para la vista previa; GitHub Pages no lo necesita |

Si cambias capacidades o fórmulas en `model.js`, actualiza también los textos explicativos de la interfaz y este documento. Conserva coherentes las unidades y vuelve a ejecutar las pruebas.

Para **modificar el código JavaScript**, instala Node.js y ejecuta una vez desde esta carpeta:

```sh
npm install
```

Después de editar `app.js`, `scene.js`, `model.js` o las dependencias de `vendor/`, regenera la versión que usa el navegador:

```sh
npm run build
```

Este paso usa **esbuild 0.25.10** y actualiza `app.bundle.js`. Luego recarga `index.html` y sube también el archivo generado a GitHub. Los cambios en `styles.css` e `index.html` se aplican directamente al recargar y no necesitan compilación. La copia autónoma `ABRIR_EcoSmart_3D.html` es una instantánea de la entrega: no se actualiza al editar esta carpeta.

## Comprobar el modelo

Con Node.js instalado, desde esta carpeta:

```sh
npm test
```

También puedes ejecutar directamente:

```sh
node --test tests/model.test.mjs
```

Las pruebas verifican noche y calma, límites solares y eólicos, demanda, batería llena y vacía, conservación de energía, ausencia de cambios al pausar y equivalencia entre pasos temporales de diferente tamaño.

## Accesibilidad y compatibilidad

Los controles usan etiquetas y se pueden recorrer con el teclado; los valores energéticos están disponibles como texto, además de la representación gráfica. En pantallas pequeñas, los paneles se reorganizan. La vista 3D requiere WebGL y un navegador compatible. Si WebGL no está disponible, se muestra una explicación y los controles y resultados del modelo siguen siendo utilizables. La visualización 3D es complementaria a los datos numéricos.

## Créditos y licencias

La escena representa el concepto **EcoSmart UCS Table** del proyecto de innovación y creatividad de la Universidad Científica del Sur. La escala visual y la ambientación son ilustrativas.

Three.js **0.180.0** y OrbitControls se distribuyen bajo la licencia MIT incluida en [`vendor/LICENSE-three.txt`](vendor/LICENSE-three.txt). Conserva ese aviso al redistribuirlos. esbuild es una herramienta de desarrollo bajo licencia MIT; su licencia se incluye en el paquete instalado al ejecutar `npm install`. Esta entrega **no asigna una licencia nueva a los contenidos del proyecto**: su titular puede elegirla antes de publicar. Hacer público un repositorio no sustituye la elección de una licencia de reutilización.
