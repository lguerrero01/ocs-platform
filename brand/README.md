# Marca

Archivos originales del emblema, tal como los entregó el diseño. No los consume
la aplicación: de aquí salen, por proceso, los archivos de `public/`.

| Archivo | Qué es |
|---|---|
| `ocs-emblema-dorado.png` | Emblema en dorado `#956d2f` sobre transparente, 4501×4501, RGBA. Fuente de todos los assets. |
| `ocs-emblema-blanco-oliva.jpg` | Mismo emblema en blanco sobre oliva `#4d574e`. Sin canal alfa; sirve como referencia de color, no como fuente. |

## De dónde sale la paleta

Los dos colores de marca son el origen de `@theme` en `src/styles.css`:

- **Oliva `#4d574e`** (matiz 126°) → toda la escala neutra: fondo, superficies y
  bordes son ese mismo matiz a distinta luminosidad. Es el color que hace que la
  interfaz «pertenezca» al logo en vez de convivir con él.
- **Dorado `#956d2f`** (matiz 36°) → el acento. En pantalla se usa aclarado a
  `#cb9a4d`, porque el dorado original contrasta 4.1:1 sobre el fondo: suficiente
  para una forma grande, insuficiente para texto. El original sigue disponible
  como `--color-ocs-accent-deep`.

## Cómo se regeneran los assets

`public/logo-ocs.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` y
`favicon.ico` se derivan del PNG dorado: se recorta el margen transparente, se
centra en un lienzo cuadrado, se tiñe con el acento y se reduce por promedio de
área premultiplicado por alfa (si no, los bordes salen sucios).

Si cambia el emblema o el acento, hay que rehacer esos cinco archivos con el
mismo procedimiento — no basta con sustituir el PNG grande, porque el favicon es
un contenedor ICO con un PNG de 48×48 dentro.
