# 🎮 Operación Extracción — FPS 3D low-poly

Juego de supervivencia y disparos en primera persona desarrollado con **Three.js r160 y WebGL**. Tu objetivo es atravesar una instalación infestada de zombis, recoger munición y llegar a la zona de extracción.

**Juega online:** https://danferperez10.github.io/operacion-extraccion/ (estará disponible una vez que actives GitHub Pages).

## Controles

| Tecla | Acción |
|---|---|
| W / A / S / D | Moverse |
| Mouse | Apuntar |
| Clic izquierdo | Disparar |
| 1 / 2 | Cambiar arma |
| R | Recargar |
| **Espacio (mantener)** | **Agacharse** |
| Shift | Correr |
| T | Encender o apagar linterna |
| Q | Cambiar calidad gráfica |
| F3 | Ver estadísticas |
| F | Pantalla completa |
| Esc | Pausa |

## Jugar localmente

Abre una terminal en esta carpeta y ejecuta:

```bash
python -m http.server 8000
```

Abre http://localhost:8000/ en Chrome o Edge. Necesitas conexión a internet para cargar Three.js desde el CDN. No requiere npm ni compilación.

## Publicar en GitHub Pages

En tu repositorio, abre **Settings → Pages**, selecciona **Deploy from a branch**, rama **main**, directorio **/(root)** y guarda. GitHub Pages publicará el archivo `index.html`.

## Estructura

```text
index.html
main.js
assets/
  models/
    desert_eagle_fp.glb
    desert_eagle_gun.glb
    ak74m.glb
    zombie_soldier.glb
    zombie_tank.glb
ASSET_CREDITS.md
PUBLICAR_EN_GITHUB.md
.nojekyll
.gitignore
.gitattributes
```

## Versión ligera

Los cinco modelos GLB se recrearon como **versiones low-poly nuevas, sin texturas** para poder subirlos directamente y reducir drásticamente el peso. Los gráficos y las animaciones de armas son bastante más sencillos que en los modelos detallados originales. Mantienen los nombres y clips básicos esperados por el código, pero aún hace falta probar una partida completa desde un navegador.

El código admite sonidos opcionales en `assets/audio/`; cuando faltan algunos archivos, usa efectos sintetizados mediante Web Audio API.

Revisa [ASSET_CREDITS.md](ASSET_CREDITS.md) para más información.
