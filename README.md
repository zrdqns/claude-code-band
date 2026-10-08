# franja

Mod para [Claude Code](https://claude.com/claude-code): una franja de una línea sobre el prompt con lo que conviene tener a la vista mientras se trabaja.

```
◆ opus-5-5  ⎇ main ±3  ▰▰▱▱▱▱▱▱ 24%          Edit register.tsx · 0:42   5h 38%
```

## Qué muestra

| Segmento | Significado |
| --- | --- |
| `◆ opus-5-5` | Modelo de la sesión. El rombo late mientras hay un turno en curso. |
| `⎇ main ±3` | Rama actual y archivos sin commitear. Fuera de un repositorio, `⌂ carpeta`. |
| `▰▰▱▱▱▱▱▱ 24%` | Ventana de contexto usada. Amarillo entre 60 % y 85 %. |
| `Edit register.tsx · 0:42` | Durante un turno: la última herramienta llamada y el cronómetro del turno. |
| `último 1:12 · $0.25` | En reposo: duración y costo del último turno. |
| `5h 38%` | Límite de uso de 5 horas. Amarillo desde 60 %, rojo desde 85 %. |

El lado izquierdo conserva su ancho; cuando un panel lateral estrecha la franja, cede primero la etiqueta de la herramienta.

## Instalación

En el prompt de una sesión de terminal:

```
/plugin install franja --marketplace zrdqns/claude-code-franja
```

Responde `y` para añadir el marketplace y elige el alcance (el de usuario lo carga en todas las sesiones, también en las de la app de escritorio).

Para probarlo desde una copia local, sin instalarlo:

```bash
claude --plugin-dir ./claude-code-franja
```

## Requisitos

- `git` en el `PATH` para el contador de cambios (`±N`). Sin él, la franja muestra la rama sin contador.

## Desarrollo

```bash
claude plugin validate .
claude plugin test .
```

El módulo está en [`hooks/register.tsx`](hooks/register.tsx), su contrato de estado en [`types/index.d.ts`](types/index.d.ts) y los tests en [`tests/`](tests).

## Licencia

[MIT](LICENSE)
