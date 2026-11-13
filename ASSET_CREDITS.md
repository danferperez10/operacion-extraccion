# Créditos y recursos — Operación Extracción

## Modelos GLB de esta versión

Los cinco modelos de la carpeta `assets/models/` se **recrearon como modelos low-poly originales y muy simples** para hacer posible su publicación directa en GitHub y reducir el uso de recursos.

- `desert_eagle_gun.glb` — pistola low-poly.
- `desert_eagle_fp.glb` — brazos low-poly y animaciones básicas (idle, equipar, caminar, correr, disparar y recargar).
- `ak74m.glb` — rifle low-poly con brazos y animaciones básicas.
- `zombie_soldier.glb` — enemigo humanoide low-poly.
- `zombie_tank.glb` — enemigo pesado low-poly.

**Estos modelos NO son las mallas, texturas o animaciones detalladas de los archivos GLB originales.** Se generaron como geometría simple sin texturas externas, reutilizando cubos y materiales de color. El cambio visual es sustancial. Se mantienen sus nombres de archivo para que funcionen con el código existente.

## Sonidos

No se subió audio binario en esta versión: cuando no encuentra archivos de sonido, `main.js` genera algunos efectos con la Web Audio API. Si después quieres incorporar audio propio o con licencia apropiada, puedes agregarlo en `assets/audio/`.

## Aviso

Los nombres de armas y las referencias genéricas de zombis se usan como descripciones del juego. Si incorporas posteriormente modelos o sonidos de terceros, comprueba sus derechos y añade los créditos y licencias correspondientes. No incluyas modelos comerciales originales sin autorización.
