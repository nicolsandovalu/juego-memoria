// =============================================================
// app.js — Juego de Memoria (Versión Final)
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
  nombreJugador: ''
};

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
function iniciarJuego() {
  const sel = document.getElementById('dificultad');
  const inputNombre = document.getElementById('nombre');
  
  state.dificultad = Number(sel.value);
  state.nombreJugador = inputNombre.value.trim() || 'Jugador';

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
  
  detenerCronometro();
  construirTableroDOM();
  actualizarUI();
  mostrarRecord();
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
      setTimeout(() => {
        state.cartas[idxA].volteada = false;
        state.cartas[idxB].volteada = false;
        state.volteadas = [];
        state.bloqueado = false; // LIBERA EL TABLERO
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
  const cols = state.dificultad <= 8 ? 4 : state.dificultad <= 12 ? 4 : 6;
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

// FIX Seguridad: Prevención XSS. 
// Uso exclusivo de createElement y textContent. NO se usa innerHTML.
function mostrarVictoria() {
  const ms = state.tiempoFin - state.tiempoInicio;
  const tiempo = formatearTiempo(ms);

  elOverlay.classList.add('visible');
  elMensaje.textContent = ''; // Limpiar seguro

  const titulo = document.createElement('h2');
  titulo.className = 'titulo-victoria';
  titulo.textContent = `¡Felicidades, ${state.nombreJugador}! 🏆`; 

  const detalle = document.createElement('p');
  detalle.className = 'detalle-victoria';
  detalle.textContent = `Encontraste los ${state.totalPares} pares en ${state.movimientos} movimientos y ${tiempo} segundos.`;

  const btnCerrar = document.createElement('button');
  btnCerrar.textContent = 'Jugar de nuevo';
  btnCerrar.style.marginTop = '24px';
  btnCerrar.style.width = '100%';
  btnCerrar.style.justifyContent = 'center';
  btnCerrar.addEventListener('click', () => {
    elOverlay.classList.remove('visible');
    iniciarJuego();
  });

  elMensaje.appendChild(titulo);
  elMensaje.appendChild(detalle);
  elMensaje.appendChild(btnCerrar);
}

// 4. CRONÓMETRO Y LOCALSTORAGE
let intervaloCronometro = null;
function iniciarCronometro() {
  intervaloCronometro = setInterval(() => {
    elTiempo.textContent = formatearTiempo(Date.now() - state.tiempoInicio);
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

document.getElementById('btn-reiniciar').addEventListener('click', iniciarJuego);
document.getElementById('dificultad').addEventListener('change', iniciarJuego);
document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'r' && document.activeElement.tagName !== 'INPUT') iniciarJuego();
});

// FIX: Actualización en tiempo real del nombre del jugador.
// Evita el bug donde el usuario escribe su nombre a mitad de la partida.
document.getElementById('nombre').addEventListener('input', (e) => {
  state.nombreJugador = e.target.value.trim() || 'Jugador';
});

iniciarJuego();