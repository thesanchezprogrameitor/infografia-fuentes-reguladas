# Fuentes de alimentación reguladas · Infografía

Infografía web interactiva sobre la teoría de funcionamiento, la importancia y las aplicaciones de las fuentes de alimentación reguladas.

- Curso: Electrónica Análoga (243006), Universidad Nacional Abierta y a Distancia (UNAD), ECBTI, Ingeniería Electrónica.
- Actividad: Fase 6 · Problema de diseño fuente de alimentación regulada y variable, punto 1.1.
- Autor: Leonardo Sánchez.

Sitio: https://thesanchezprogrameitor.github.io/infografia-fuentes-reguladas/

## Cómo está hecha

- HTML, CSS y SVG generados a mano, sin servidor: funciona directamente desde GitHub Pages.
- Las formas de onda se calculan con un modelo simple de la fuente (transformador de 120 V a 12 V rms, puente de diodos, filtro con capacitor y LM317).
- Animaciones ligadas al scroll con [GSAP](https://gsap.com) y ScrollTrigger, y scroll suave con [Lenis](https://github.com/darkroomengineering/lenis).
- Tipografía [Geist](https://vercel.com/font) (licencia SIL OFL).
- Respeta `prefers-reduced-motion`: sin animaciones, cada etapa se muestra fija.

Las librerías y las fuentes están incluidas en `vendor/` y `fonts/` con sus licencias.
