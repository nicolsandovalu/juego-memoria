// =============================================================
// app.js — Juego de Memoria (Versión Final Corregida)
// =============================================================

const EMOJIS_POOL = ['🐶','🐱','🦊','🐼','🦁','🐸','🦄','🐙','🍕','🍩','🍉','🚀','🌟','🎮','🎨','🌻'];

// 1. ESTADO GLOBAL (Single Source of Truth)
const state = {
  cartas: [],
  volteadas: [],
  bloqueado: false, // ESTADO DE BLOQUEO CRÍTICO
  movimientos: 0,
  pares: 0,
  totalPares: 0,
  iniciado: false,
  tiempoInicio: null,
  tiempoFin: null,
  dificultad: 12,
  nombreJugador: '',
  partidasJugadas: 0,
  tiempoTotalAcumulado: 0,
  historialPartidas: []
};

// VARIABLES DE CONTROL ASÍNCRONO
let intervaloCronometro = null;
let timeoutTurno = null; // FIX: Controla el retardo al voltear cartas

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

// 2. LÓGICA Y MUTACIONES
function iniciarJuego(reinicioFuerte = false) {
  const sel = document.getElementById('dificultad');
  const inputNombre = document.getElementById('nombre');
  
  state.dificultad = Number(sel.value);
  state.nombreJugador = inputNombre.value.trim() || 'Jugador';

  // FIX: Si el usuario presiona "Reiniciar", borramos el historial
  if (reinicioFuerte) {
    state.partidasJugadas = 0;
    state.tiempoTotalAcumulado = 0;
    state.historialPartidas = [];
  }

  const emojis = barajar([...EMOJIS_POOL]).slice(0, state.dificultad);
  const mazo = [];
  emojis.forEach(e => {
    mazo.push({ emoji: e, encontrada: false, volteada: false });
    mazo.push({ emoji: e, encontrada: false, volteada: false });
  });

  if (timeoutTurno) clearTimeout(timeoutTurno);
  detenerCronometro();

  state.cartas = barajar(mazo);
  state.volteadas = [];
  state.bloqueado = false;
  state.movimientos = 0;
  state.pares = 0;
  state.totalPares = state.dificultad;
  state.iniciado = false;
  state.tiempoInicio = null;
  state.tiempoFin = null;
  
  const elTiempo = document.getElementById('display-tiempo');
  if (elTiempo) elTiempo.textContent = '0:00';

  construirTableroDOM();
  actualizarUI();
  mostrarRecord();
  renderizarHistorial();
}
function voltearCarta(indice) {
  const carta = state.cartas[indice];

  // GUARD CLAUSES (Previene los bugs reportados por la IA)
  if (state.bloqueado) return;
  if (carta.encontrada) return;
  if (state.volteadas.includes(indice)) return; 

  if (!state.iniciado) {
    state.iniciado = true;
    state.tiempoInicio = Date.now();
    iniciarCronometro();
  }

  carta.volteada = true;
  state.volteadas.push(indice);
  actualizarUI(); 

  if (state.volteadas.length === 2) {
    state.movimientos++;
    state.bloqueado = true; // BLOQUEA EL TABLERO
    actualizarUI();

    const [idxA, idxB] = state.volteadas;

    if (state.cartas[idxA].emoji === state.cartas[idxB].emoji) {
      // COINCIDEN
      state.cartas[idxA].encontrada = true;
      state.cartas[idxB].encontrada = true;
      state.pares++;
      state.volteadas = [];
      state.bloqueado = false; // LIBERA EL TABLERO
      actualizarUI();
      
      if (state.pares === state.totalPares) {
        terminarJuego();
      }
    } else {
      // NO COINCIDEN - Retardo
      // FIX: Asignar a timeoutTurno para poder cancelarlo si el usuario reinicia
      timeoutTurno = setTimeout(() => {
        state.cartas[idxA].volteada = false;
        state.cartas[idxB].volteada = false;
        state.volteadas = [];
        state.bloqueado = false; // LIBERA EL TABLERO
        actualizarUI();
      }, 900);
    }
  } // <-- AQUI FALTABA ESTA LLAVE DE CIERRE PARA voltearCarta()
}

function terminarJuego() {
  state.tiempoFin = Date.now();
  detenerCronometro();
  guardarRecord();
  mostrarVictoria();
  mostrarRecord();
}

// 3. RENDERIZADO DOM
const elTablero = document.getElementById('tablero');
const elMovs = document.getElementById('display-movimientos');
const elTiempo = document.getElementById('display-tiempo');
const elPares = document.getElementById('display-pares');
const elOverlay = document.getElementById('overlay-victoria');
const elMensaje = document.getElementById('mensaje-victoria');
const elRecord = document.getElementById('display-record');

function construirTableroDOM() {
  elTablero.innerHTML = ''; 

  // FIX UX: Cálculo dinámico para evitar el scroll vertical.
  // Mantenemos la cuadrícula en un máximo de 4 filas siempre.
  let cols = 4;
  if (state.dificultad === 8) cols = 8; // Fácil (16 cartas): 8 columnas x 2 filas
  if (state.dificultad === 12) cols = 6; // 24 cartas = 6 columnas x 4 filas
  if (state.dificultad === 16) cols = 8; // 32 cartas = 8 columnas x 4 filas
  
elTablero.style.setProperty('--columnas', cols);

  state.cartas.forEach((carta, i) => {
    const divCarta = document.createElement('div');
    divCarta.className = 'carta';
    divCarta.dataset.indice = i;

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
  
  elOverlay.classList.remove('visible');
}

function actualizarUI() {
  elMovs.textContent = state.movimientos;
  elPares.textContent = `${state.pares} / ${state.totalPares}`;

  const nodosCartas = elTablero.children;
  state.cartas.forEach((carta, i) => {
    const nodo = nodosCartas[i];
    nodo.classList.toggle('volteada', carta.volteada);
    nodo.classList.toggle('encontrada', carta.encontrada);
  });
}
function renderizarHistorial() {
  const contenedor = document.getElementById('lista-historial');
  if (!contenedor) return;

  contenedor.textContent = ''; // Limpieza segura del DOM

  if (state.historialPartidas.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No hay partidas registradas en esta sesión.';
    li.style.justifyContent = 'center';
    li.style.color = 'var(--texto-tenue)';
    contenedor.appendChild(li);
    return;
  }

  // Renderizar el arreglo en orden inverso (las más recientes primero)
  const historialInvertido = [...state.historialPartidas].reverse();
  
  historialInvertido.forEach(partida => {
    const li = document.createElement('li');
    
    // Construcción del texto: "Partida 1 | 12 pares | 24 movs | 0:45s"
    li.textContent = `Partida ${partida.numero}: ${partida.pares} pares — ${partida.movimientos} movs. en ${partida.tiempo}`;
    
    contenedor.appendChild(li);
  });
}

// FIX Seguridad: Prevención XSS. 
// Uso exclusivo de createElement y textContent. NO se usa innerHTML.
function mostrarVictoria() {
  const ms = state.tiempoFin - state.tiempoInicio;
  const tiempoPartida = formatearTiempo(ms);

  // Acumulamos los logros de esta sesión ANTES de mostrar el modal
  state.partidasJugadas++;
  state.tiempoTotalAcumulado += ms;
  const tiempoTotal = formatearTiempo(state.tiempoTotalAcumulado);
  state.historialPartidas.push({
    numero: state.partidasJugadas,
    pares: state.totalPares,
    movimientos: state.movimientos,
    tiempo: tiempoPartida
  });

  // Actualizar el historial visualmente por detrás del modal
  renderizarHistorial();

  elOverlay.classList.add('visible');
  elMensaje.textContent = ''; // Limpiar seguro

  const titulo = document.createElement('h2');
  titulo.className = 'titulo-victoria';
  titulo.textContent = `¡Felicidades, ${state.nombreJugador}! 🏆`; 

  const detallePartida = document.createElement('p');
  detallePartida.className = 'detalle-victoria';
  detallePartida.textContent = `⏱️ Esta partida: ${state.movimientos} movimientos en ${tiempoPartida}s.`;

  // Nueva sección visual de logros acumulados
  const detalleAcumulado = document.createElement('p');
  detalleAcumulado.style.marginTop = '10px';
  detalleAcumulado.style.fontSize = '0.95rem';
  detalleAcumulado.style.color = '#747d8c';
  detalleAcumulado.textContent = `🔥 Racha actual: ${state.partidasJugadas} partidas ganadas (Tiempo total: ${tiempoTotal}s)`;

const btnCerrar = document.createElement('button');
  btnCerrar.textContent = 'Jugar de nuevo';
  btnCerrar.style.marginTop = '24px';
  btnCerrar.style.width = '100%';
  btnCerrar.style.justifyContent = 'center';
  btnCerrar.addEventListener('click', () => {
    elOverlay.classList.remove('visible');
    // Reinicio suave: mantiene la racha de victorias
    iniciarJuego(false); 
  });

  elMensaje.appendChild(titulo);
  elMensaje.appendChild(detallePartida);
  elMensaje.appendChild(detalleAcumulado);
  elMensaje.appendChild(btnCerrar);
}

// 4. CRONÓMETRO Y LOCALSTORAGE
function iniciarCronometro() {
  // Limpiar por precaución antes de iniciar uno nuevo
  if (intervaloCronometro) clearInterval(intervaloCronometro);
  
  intervaloCronometro = setInterval(() => {
    const elTiempoAct = document.getElementById('display-tiempo');
    if (elTiempoAct && state.tiempoInicio) {
      elTiempoAct.textContent = formatearTiempo(Date.now() - state.tiempoInicio);
    }
  }, 500);
}

function detenerCronometro() {
  if (intervaloCronometro) {
    clearInterval(intervaloCronometro);
    intervaloCronometro = null;
  }
}

function claveRecord() { return `memoria_record_${state.dificultad}`; }

function guardarRecord() {
  const ms = state.tiempoFin - state.tiempoInicio;
  const dataGuardada = JSON.parse(localStorage.getItem(claveRecord()));
  if (!dataGuardada || ms < dataGuardada.ms) {
    localStorage.setItem(claveRecord(), JSON.stringify({ ms, nombre: state.nombreJugador }));
  }
}

function mostrarRecord() {
  const dataGuardada = JSON.parse(localStorage.getItem(claveRecord()));
  if (!dataGuardada) { elRecord.textContent = ''; return; }
  elRecord.textContent = `🏆 Récord actual (${state.dificultad} pares): ${formatearTiempo(dataGuardada.ms)} por ${dataGuardada.nombre}`;
}

// 5. EVENTOS (DELEGACIÓN)
elTablero.addEventListener('click', e => {
  const divCarta = e.target.closest('.carta');
  if (!divCarta) return;
  voltearCarta(Number(divCarta.dataset.indice));
});

// FIX: Reinicio fuerte (Borra el historial)
document.getElementById('btn-reiniciar').addEventListener('click', () => iniciarJuego(true));

// FIX: Cambiar la dificultad también borra el historial para ser justos con los tiempos
document.getElementById('dificultad').addEventListener('change', () => iniciarJuego(true));

// FIX: Presionar la tecla 'R' hace reinicio fuerte
document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'r' && document.activeElement.tagName !== 'INPUT') {
    iniciarJuego(true);
  }
});

document.getElementById('nombre').addEventListener('input', (e) => {
  state.nombreJugador = e.target.value.trim() || 'Jugador';
});

// Arranque inicial suave
iniciarJuego(false);