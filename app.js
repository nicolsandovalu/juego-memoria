// =============================================================
// app.js — Juego de Memoria (Versión Auditada y Optimizada)
// Arquitectura: Single Source of Truth, Delegación de Eventos
// =============================================================

const EMOJIS_POOL = ['🍎','🚀','🐱','🌵','🎲','🎧','⚽','🍕','🦊','🌙','🎸','🏄','🦋','🍦','🎯','🌈'];

// 1. ESTADO GLOBAL (Single Source of Truth)
const state = {
  cartas: [],        // { emoji, encontrada, volteada }
  volteadas: [],     // Índices de las cartas volteadas en el turno actual (máx 2)
  bloqueado: false,  // Control de asincronía
  movimientos: 0,
  pares: 0,
  totalPares: 0,
  iniciado: false,
  tiempoInicio: null,
  tiempoFin: null,
  dificultad: 12,
  nombreJugador: ''
};

// 2. UTILIDADES
function barajar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatearTiempo(ms) {
  const seg = Math.floor(ms / 1000);
  const min = Math.floor(seg / 60);
  return `${min}:${String(seg % 60).padStart(2, '0')}`;
}

// 3. MUTACIONES DE ESTADO Y LÓGICA CENTRAL
function iniciarJuego() {
  const sel = document.getElementById('dificultad');
  const inputNombre = document.getElementById('nombre');
  
  state.dificultad = Number(sel.value);
  state.nombreJugador = inputNombre.value.trim() || 'Jugador Anónimo';

  const emojis = barajar([...EMOJIS_POOL]).slice(0, state.dificultad);
  const mazo = [];
  emojis.forEach(e => {
    mazo.push({ emoji: e, encontrada: false, volteada: false });
    mazo.push({ emoji: e, encontrada: false, volteada: false });
  });

  state.cartas = barajar(mazo);
  state.volteadas = [];
  state.bloqueado = false;
  state.movimientos = 0;
  state.pares = 0;
  state.totalPares = state.dificultad;
  state.iniciado = false;
  state.tiempoInicio = null;
  state.tiempoFin = null;

  detenerCronometro();
  construirTableroDOM(); // Crea los nodos HTML
  actualizarUI();        // Actualiza clases y textos
  mostrarRecord();
}

function voltearCarta(indice) {
  const carta = state.cartas[indice];

  // GUARD CLAUSES (Control de flujo temprano)
  if (state.bloqueado) return;
  if (carta.encontrada) return;
  if (state.volteadas.includes(indice)) return; // Evita el bug del doble click

  // Iniciar tiempo en el primer click
  if (!state.iniciado) {
    state.iniciado = true;
    state.tiempoInicio = Date.now();
    iniciarCronometro();
  }

  // Actualizar estado
  carta.volteada = true;
  state.volteadas.push(indice);
  actualizarUI(); // Reflejar la carta volteada de inmediato

  // Evaluar turno
  if (state.volteadas.length === 2) {
    state.movimientos++;
    state.bloqueado = true; // Bloqueo de turno
    actualizarUI();

    const [idxA, idxB] = state.volteadas;

    // FIX: Comparación desde la fuente de verdad (estado), no del DOM
    if (state.cartas[idxA].emoji === state.cartas[idxB].emoji) {
      // PAR ENCONTRADO - Resolución instantánea (sin setTimeout)
      state.cartas[idxA].encontrada = true;
      state.cartas[idxB].encontrada = true;
      state.pares++;
      state.volteadas = [];
      state.bloqueado = false;
      actualizarUI();
      
      if (state.pares === state.totalPares) {
        terminarJuego();
      }
    } else {
      // NO COINCIDEN - Retardo asíncrono
      setTimeout(() => {
        state.cartas[idxA].volteada = false;
        state.cartas[idxB].volteada = false;
        state.volteadas = [];
        state.bloqueado = false; // Liberar tablero
        actualizarUI();
      }, 900);
    }
  }
}

function terminarJuego() {
  state.tiempoFin = Date.now();
  detenerCronometro();
  guardarRecord();
  mostrarVictoria();
  mostrarRecord();
}

// 4. CAPA DE RENDERIZADO (DOM)
const elTablero = document.getElementById('tablero');
const elMovs = document.getElementById('display-movimientos');
const elTiempo = document.getElementById('display-tiempo');
const elPares = document.getElementById('display-pares');
const elMensaje = document.getElementById('mensaje-victoria');
const elRecord = document.getElementById('display-record');

// FIX Arquitectónico: Separar la creación (DOM) de la actualización (Clases)
// Esto evita destruir los divs en cada click, permitiendo que la animación CSS 3D funcione.
function construirTableroDOM() {
  elTablero.innerHTML = ''; // Se limpia solo al iniciar el juego
  
  const cols = state.dificultad <= 8 ? 4 : state.dificultad <= 12 ? 4 : 6;
  elTablero.style.setProperty('--columnas', cols);

  state.cartas.forEach((carta, i) => {
    const divCarta = document.createElement('div');
    divCarta.className = 'carta';
    divCarta.dataset.indice = i;
    divCarta.setAttribute('role', 'gridcell');

    const inner = document.createElement('div');
    inner.className = 'carta-inner';

    const dorso = document.createElement('div');
    dorso.className = 'carta-dorso';
    dorso.textContent = '✦';

    const frente = document.createElement('div');
    frente.className = 'carta-frente';
    frente.textContent = carta.emoji; 

    inner.appendChild(dorso);
    inner.appendChild(frente);
    divCarta.appendChild(inner);
    elTablero.appendChild(divCarta);
  });
  
  elMensaje.classList.add('oculto');
}

// Esta función solo muta clases y textos, es rapidísima y respeta animaciones
function actualizarUI() {
  elMovs.textContent = state.movimientos;
  elPares.textContent = `${state.pares} / ${state.totalPares}`;

  const nodosCartas = elTablero.children;
  state.cartas.forEach((carta, i) => {
    const nodo = nodosCartas[i];
    
    // Toggle de clases basado estrictamente en el estado
    nodo.classList.toggle('volteada', carta.volteada);
    nodo.classList.toggle('encontrada', carta.encontrada);
    
    nodo.setAttribute('aria-label', carta.encontrada || carta.volteada ? carta.emoji : 'Carta boca abajo');
  });
}

// FIX Seguridad: Prevención XSS
function mostrarVictoria() {
  const ms = state.tiempoFin - state.tiempoInicio;
  const tiempo = formatearTiempo(ms);

  elMensaje.classList.remove('oculto');
  elMensaje.textContent = ''; // Limpieza segura

  const titulo = document.createElement('p');
  titulo.className = 'titulo-victoria';
  titulo.textContent = `¡Excelente, ${state.nombreJugador}! 🎉`; // textContent previene ejecución de scripts

  const detalle = document.createElement('p');
  detalle.className = 'detalle-victoria';
  detalle.textContent = `${state.movimientos} movimientos · ${tiempo} · ${state.totalPares} pares`;

  elMensaje.appendChild(titulo);
  elMensaje.appendChild(detalle);
}

// 5. CRONÓMETRO
let intervaloCronometro = null;
function iniciarCronometro() {
  intervaloCronometro = setInterval(() => {
    const ms = Date.now() - state.tiempoInicio;
    elTiempo.textContent = formatearTiempo(ms);
  }, 500);
}

function detenerCronometro() {
  clearInterval(intervaloCronometro);
  if (state.tiempoInicio && state.tiempoFin) {
    elTiempo.textContent = formatearTiempo(state.tiempoFin - state.tiempoInicio);
  } else {
    elTiempo.textContent = '0:00';
  }
}

// 6. RECORD CON LOCALSTORAGE (BONUS)
function claveRecord() {
  return `memoria_record_${state.dificultad}`;
}

function guardarRecord() {
  const ms = state.tiempoFin - state.tiempoInicio;
  const dataGuardada = JSON.parse(localStorage.getItem(claveRecord()));
  
  if (!dataGuardada || ms < dataGuardada.ms) {
    const nuevoRecord = {
      ms: ms,
      nombre: state.nombreJugador,
      movimientos: state.movimientos
    };
    localStorage.setItem(claveRecord(), JSON.stringify(nuevoRecord));
  }
}

function mostrarRecord() {
  const dataGuardada = JSON.parse(localStorage.getItem(claveRecord()));
  if (!dataGuardada) {
    elRecord.textContent = '';
    return;
  }
  elRecord.textContent = `🏆 Récord en ${state.dificultad} pares: ${formatearTiempo(dataGuardada.ms)} por ${dataGuardada.nombre}`;
}

// 7. MANEJADORES DE EVENTOS
// Delegación de eventos estricta
elTablero.addEventListener('click', e => {
  const divCarta = e.target.closest('.carta');
  if (!divCarta) return;
  const indice = Number(divCarta.dataset.indice);
  voltearCarta(indice);
});

document.getElementById('btn-reiniciar').addEventListener('click', iniciarJuego);

document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'r') {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    iniciarJuego();
  }
});

document.getElementById('dificultad').addEventListener('change', iniciarJuego);

// 8. ARRANQUE
iniciarJuego();