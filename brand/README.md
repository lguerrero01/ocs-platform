# Marca

Archivos originales del emblema, tal como los entregó el diseño. No los consume
la aplicación: de aquí salen, por proceso, los archivos de `public/`.

| Archivo | Qué es |
|---|---|
| `ocs-emblema-dorado.png` | Emblema en dorado `#956d2f` sobre transparente, 4501×4501, RGBA. Fuente de todos los assets. |
| `ocs-emblema-blanco-oliva.jpg` | Mismo emblema en blanco sobre oliva `#4d574e`. Sin canal alfa; sirve como referencia de color, no como fuente. |

## La paleta

La organización fijó seis colores. Son el origen de `@theme` en
`src/styles.css`, donde está anotado a qué rol va cada uno:

| Color | Código | Rol en la interfaz |
|---|---|---|
| Blanco | `#ffffff` | Texto principal |
| Mostaza | `#b78b4c` | Acento: botones, enlaces, estado activo, emblema |
| Mostaza Oscuro | `#654922` | Solo superficies grandes — sobre el fondo da 1.9:1 |
| Gris Verdoso | `#4d574e` | Bordes que deben leerse, como los de los campos |
| Marrón | `#2b2821` | Superficies: tarjetas, barra lateral |
| Negro | `#202221` | Fondo de la aplicación |

Tres tonos intermedios se derivan mezclando dos de los seis, porque la paleta no
trae nada entre el Marrón y el Gris Verdoso: `--color-ocs-elevated`,
`--color-ocs-border` y `--color-ocs-muted`. Las recetas están en `styles.css`.

El **texto secundario** no puede ser Gris Verdoso puro: contrasta 2.1:1 sobre el
fondo, muy por debajo del 4.5:1 que exige WCAG AA. Se aclara con Blanco hasta
8.3:1 conservando su familia de color.

**Éxito y peligro** (`#8fae92`, `#cf7d6f`) son los dos únicos tonos ajenos a la
paleta. La organización no definió un verde ni un rojo, y sin ellos un error y
una confirmación se verían idénticos. Están elegidos apagados para convivir con
el mostaza y el marrón.

## Cómo se regeneran los assets

Los archivos de `public/` se derivan del PNG dorado: se recorta el margen
transparente, se tiñe con el acento y se compone centrado, reduciendo con
LANCZOS sobre el alfa original para que los bordes no salgan sucios.

| Archivo | Fondo | Ocupación del emblema |
|---|---|---|
| `logo-ocs.png` | transparente | 92% — se pinta dentro de la interfaz |
| `favicon.ico` | transparente | 94% — la pestaña puede ser clara u oscura |
| `icon-192.png`, `icon-512.png` | Negro sólido | 74% |
| `icon-512-maskable.png` | Negro sólido | 56% — dentro de la zona segura |
| `apple-touch-icon.png` | Negro sólido | 72% |

Los iconos de PWA **no pueden ser transparentes**: el sistema los compone sobre
blanco o negro según le convenga. Y el maskable necesita además que el emblema
quepa en el círculo del 80%, porque Android recorta el icono a su antojo.

Si cambia el emblema o el acento hay que rehacer los seis archivos con el mismo
procedimiento — no basta con sustituir el PNG grande, porque el favicon es un
contenedor ICO con un PNG de 48×48 dentro.
