# Publicar Operación Extracción con GitHub Pages

Este proyecto es una página estática (HTML, JS y archivos GLB/MP3). No requiere compilarse, instalar dependencias ni crear un servidor de aplicaciones para los visitantes.

## Opción A: subir desde la web de GitHub

1. Entra en [GitHub](https://github.com/) con tu cuenta.
2. Pulsa **New repository**. Nombre sugerido: `operacion-extraccion`. Selecciona **Public** y crea el repositorio **sin añadir** README ni archivos de ejemplo (aquí ya están incluidos).
3. En el repositorio vacío pulsa **uploading an existing file** / **Add file → Upload files**.
4. Descomprime el ZIP y **arrastra los archivos y carpetas que están dentro de `operacion-extraccion-github/`**, no la carpeta exterior ni el ZIP: `index.html` tiene que verse en la raíz del repositorio.
5. Pulsa **Commit changes**. Los archivos individuales son menores que 25 MiB, el límite por archivo al subir desde el navegador. Si GitHub rechaza algún archivo, usa la opción B con Git.
6. Ve a **Settings → Pages**. En **Build and deployment**, selecciona **Deploy from a branch**, rama `main` y carpeta **/(root)**, y pulsa **Save**.
7. Cuando termine la publicación, abre `https://TU_USUARIO.github.io/operacion-extraccion/` (sustituye `TU_USUARIO` por tu usuario real).

## Opción B: subir usando Git (terminal en la carpeta del proyecto)

Primero crea en GitHub un repositorio público vacío llamado `operacion-extraccion`. Después ejecuta:

```bash
git init
git branch -M main
git add .
git commit -m "Publicar Operación Extracción"
git remote add origin https://github.com/TU_USUARIO/operacion-extraccion.git
git push -u origin main
```

Sustituye `TU_USUARIO` por tu usuario de GitHub y sigue el paso 6 de la opción A para activar Pages. Git puede pedir que configures `user.name`, `user.email` o la autenticación desde Git Credential Manager.

## Comprobación de la publicación

- Al abrir la URL aparece el menú de **Operación Extracción** y no un error 404.
- Cargan la pistola, el rifle y los enemigos.
- La tabla de controles indica **Espacio** para agacharse.
- Los modelos GLB y el audio se descargan desde `assets/`.
- La primera carga necesita internet porque Three.js se importa desde jsDelivr.

## Si aparece 404 o faltan modelos

- Verifica que `index.html` está directamente en la raíz de `main`.
- Confirma **Settings → Pages → Deploy from a branch → main / (root)**.
- Espera a que la publicación termine y vuelve a abrir la URL.
- Comprueba que no cambiaste mayúsculas o minúsculas en `assets/models/`.
- Puedes usar **F12 → Consola / Network** en Chrome para ver qué archivo falla.

> **Antes de hacer público el repositorio**, revisa [ASSET_CREDITS.md](ASSET_CREDITS.md) por licencias de modelos, audio y derechos de terceros.