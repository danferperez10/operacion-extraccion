# 🎮 Operación Extracción — FPS 3D

Juego de disparos en primera persona desarrollado con **Three.js r160 y WebGL**. La misión es atravesar una instalación infestada de zombis, administrar la munición y llegar a la zona de extracción.

**Jugar online:** después de activar GitHub Pages, el enlace habitual será `https://TU_USUARIO.github.io/operacion-extraccion/` si el repositorio se llama `operacion-extraccion`.

## Cómo jugar

1. Abre el enlace del juego desde un navegador de escritorio compatible con WebGL.
2. Pulsa **INICIAR MISIÓN** y haz clic en la pantalla si es necesario para capturar el mouse.
3. Derrota o esquiva a los zombis hasta llegar a la zona de extracción.

| Tecla | Acción |
|---|---|
| W / A / S / D | Moverse |
| Mouse | Apuntar |
| Clic izquierdo | Disparar |
| 1 / 2 | Cambiar de arma |
| R | Recargar |
| **Espacio (mantener)** | **Agacharse** |
| Shift | Correr hacia delante |
| T | Linterna |
| Q | Cambiar calidad gráfica |
| F3 | Ver FPS y diagnóstico |
| F | Pantalla completa |
| Esc | Pausar |

## Ejecutar en tu PC

El juego usa módulos JavaScript y modelos GLB, por lo que necesita un servidor web local (no abras el HTML directamente con doble clic).

```bash
python -m http.server 8000
```

Abre `http://localhost:8000/` en Chrome o Edge. No hace falta instalar npm, Node.js ni compilar el proyecto. Se necesita conexión a internet para descargar Three.js desde jsDelivr.

## Publicarlo con GitHub Pages

Hay instrucciones paso a paso en **[PUBLICAR_EN_GITHUB.md](PUBLICAR_EN_GITHUB.md)**. El proyecto ya tiene `index.html` en la raíz y las rutas de recursos son relativas; no requiere compilación.

## Estructura

```text
index.html                 Pantalla de inicio y HUD
main.js                    Lógica del juego
assets/models/             Modelos 3D GLB (5 archivos)
assets/audio/              Grito de zombi
ASSET_CREDITS.md           Autores, fuentes, licencias y advertencias
PUBLICAR_EN_GITHUB.md     Guía de publicación
.nojekyll                  Evita la compilación Jekyll en GitHub Pages
.gitignore                 Archivos locales excluidos de Git
```

## Características

- Dos armas: Desert Eagle y AK-74M, con cargador y reserva de munición.
- Tres tipos de enemigos: soldado, corredor y tanque.
- Cajas para recoger munición durante el recorrido.
- Iluminación dinámica, efectos gráficos y opciones de calidad.
- Diagnóstico básico de rendimiento con **F3**.

## Rendimiento

Si va lento, pulsa **Q** hasta seleccionar calidad baja. Se puede usar **F3** para revisar FPS y cantidad de geometrías/texturas. El juego utiliza resolución dinámica, reutilización de efectos y oculta zombis lejanos. La ejecución depende de las capacidades WebGL del navegador y del equipo.

## Recursos y derechos

Consulta [ASSET_CREDITS.md](ASSET_CREDITS.md) antes de publicar. El repositorio incluye contenido de terceros con licencias y derechos que deben respetarse. En particular, conviene revisar los derechos de los personajes de los modelos de zombis y la procedencia del audio. No se incluye una licencia general del código porque su titular no ha escogido una todavía.

Proyecto de práctica académica desarrollado con Three.js.