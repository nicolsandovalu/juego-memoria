# Proyecto: Juego de memoria 

🎮 **¡Si quieres jugar, visita la web!** [Jugar Memoria aquí](https://nicolsandovalu.github.io/juego-memoria/)

Este repositorio contiene la entrega del proyecto de Programación Front End. Es un juego interactivo desarrollado con JavaScript Vanilla, HTML semántico y CSS, enfocado en el manejo riguroso del DOM y eventos asíncronos.

## 1. ¿Dónde me ayudó la IA y dónde tuve que corregir código?
Usé la Inteligencia Artificial para generar rápido la estructura base del HTML y los estilos visuales iniciales. Sin embargo, me entregó código con varias fallas lógicas y malas prácticas que tuve que auditar y corregir manualmente o a través de prompts:

* **Sin semántica HTML**: El marcado original carecía de estructura real. La IA abusó de etiquetas ```<div>``` genéricas para todo, por lo que tuve que refactorizar el código utilizando elementos semánticos de HTML5 ```(<main>,<section>, <header>)``` para cumplir con los estándares web.

* **Vulnerabilidad XSS**: Al pedirle que agregara un input para el nombre del jugador, la IA inyectó el valor en el DOM usando innerHTML. Tuve que cambiar esto inmediatamente porque dejaba la aplicación vulnerable a ataques de Cross-Site Scripting. Además, realizando una última auditoría al código ya listo, en la línea 154 se encontraba otro InnerHTML, si bien, no representaba un riesgo, es importante mantener las buenas prácticas de programación. 

* **Condiciones de carrera (Bugs de asincronía)**: La IA no supo manejar bien la limpieza de los setTimeout. Si el jugador hacía clic en "Reiniciar" mientras las cartas se estaban volteando, los tiempos se cruzaban y el tablero se rompía. Tuve que programar un estado de bloqueo global (state.bloqueado) y forzar la limpieza de los temporizadores al reiniciar.

* **CSS Rígido**: El diseño original estaba hecho completamente en píxeles (px), lo que rompía la vista en distintas pantallas. Tuve que usar prompts específicos para obligarla a refactorizar hacia unidades relativas (rem, %) para hacerlo verdaderamente responsivo.

* **Errores de sintaxis**: Introdujo caracteres sobrantes (una 'R' perdida en el código) que rompían la ejecución del script, obligándome a revisar el código línea por línea.

## 2. Justificación de decisiones de diseño
Para cumplir con las buenas prácticas y asegurar el rendimiento de la aplicación, tomé estas dos decisiones arquitectónicas:

* **Uso estricto de textContent (Seguridad)**: En lugar de usar innerHTML para mostrar el nombre del jugador en el modal de victoria y en el historial, decidí crear los nodos con document.createElement() e inyectar el texto con textContent. Esto garantiza que cualquier input del usuario se procese como texto plano, neutralizando cualquier intento de inyectar código malicioso.

* **Delegación de Eventos**: En lugar de ponerle un addEventListener a cada una de las cartas generadas (lo que saturaría la memoria si se juega en dificultad alta con 32 cartas), le asigné un único listener al contenedor padre (#tablero). Usando e.target.closest('.carta') capturo el clic exacto. Esto mejora muchísimo el rendimiento del navegador y evita fugas de memoria al cambiar de dificultad.

* **Diseño fluido y accesibilidad (`rem` vs `px`):** En lugar de estructurar la interfaz con medidas absolutas (`px`) que vuelven el diseño rígido, decidí implementar una arquitectura CSS basada en unidades relativas (`rem` para tipografías/espaciados y `%` para contenedores). Esta decisión no solo garantiza que el juego sea verdaderamente responsivo, sino que respeta la configuración nativa de accesibilidad del navegador si el usuario requiere una fuente más grande.

## 3. Oportunidades de Mejora
Si el alcance y el tiempo del proyecto lo permitieran, escalaría la aplicación en las siguientes áreas:

* **Base de Datos**: Actualmente el juego guarda el récord y el historial de la sesión de forma local. Con más tiempo, conectaría la aplicación a una base de datos en la nube (como Firebase) para crear un ranking global. Esto me permitiría cruzar el desarrollo web con el análisis de datos, pudiendo extraer y visualizar métricas de desempeño reales entre distintos jugadores.

* **Encapsulamiento y protección del estado**: La app funciona a través de un objeto ```state```, por lo que si un usario con conocimiento técnivos abre la consola del navegador, podría escribir ```state.cartas``` e inspeccionar las opciones exactas de cada elemento, haciendo trampa. La mejora clave de seguridad sería utilizar Closures en JS o o el patrón Módulo para encapsular la memoria del juego, volviendo el estado estrictamente privado e inaccesible desde la consola.

<img width="864" height="227" alt="image" src="https://github.com/user-attachments/assets/50fc8f75-a94d-487e-a44e-dc0a05a72af0" />

* **Temáticas dinámicas a través de consumo de APIs**:En lugar de depender de un arreglo estático de emojis quemado en el código, el juego podría realizar una petición ```fetch``` a una API REST externa al momento de seleccionar la dificultad. Esto permitiría que las cartas se generen con imágenes reales o temáticas dinámicas obtenidas en tiempo real, separando por completo la lógica del juego de su contenido visual.
