/* ============================================================
   ESTADO GLOBAL Y PERSISTENCIA (BASE DE DATOS LOCAL)
   ============================================================ */
let matrices = [];
let idCounter = 1;

// Claves para la base de datos local
const DB_MATRICES_KEY = 'algebra_linear_matrices';
const DB_COUNTER_KEY = 'algebra_linear_id_counter';

function saveToDB() {
  localStorage.setItem(DB_MATRICES_KEY, JSON.stringify(matrices));
  localStorage.setItem(DB_COUNTER_KEY, JSON.stringify(idCounter));
}

function loadFromDB() {
  const savedMatrices = localStorage.getItem(DB_MATRICES_KEY);
  const savedCounter = localStorage.getItem(DB_COUNTER_KEY);

  if (savedMatrices) {
    matrices = JSON.parse(savedMatrices);
  }
  if (savedCounter) {
    idCounter = JSON.parse(savedCounter);
  }
}

// Cargar datos inmediatamente al iniciar el script
loadFromDB();

let gaussState = null; // { steps, finalMatrix, stepIndex, sourceMatrix }
let invState = null;   // { steps, inverse, stepIndex, A, b }

/* ============================================================
   UTILIDADES NUMÉRICAS (puerto de formatear() en Python)
   ============================================================ */
const EPS = 1e-9;

function isZero(n) { return Math.abs(n) < EPS; }
function isClose(a, b) { return Math.abs(a - b) < EPS; }

function fmt(numero) {
  let v = Math.round(numero * 100) / 100;
  if (Object.is(v, -0)) v = 0;
  if (Number.isInteger(v)) return String(v);
  return String(v);
}

function cloneMatrix(m) { return m.map(row => row.slice()); }

/* ============================================================
   CAPACIDAD ESTIMADA SEGÚN LA RAM DEL DISPOSITIVO
   ------------------------------------------------------------
   Los navegadores no dan acceso a la memoria RAM real y libre del
   dispositivo (por privacidad), así que esto es una ESTIMACIÓN, no una
   medición exacta:

   - navigator.deviceMemory: en Chrome/Edge/Android da la RAM total
     aproximada del dispositivo en GB (redondeada a valores como 0.5,
     1, 2, 4, 8; el propio navegador la limita a un máximo de 8 aunque
     el equipo tenga más).
   - performance.memory.jsHeapSizeLimit: solo en Chrome, indica cuánta
     memoria de heap de JavaScript puede llegar a usar ESTA pestaña.
     Cuando está disponible es más preciso que deviceMemory, porque ya
     refleja el límite real que el navegador le da a la página.
   - Si ninguno de los dos existe (Firefox, Safari), se usa un
     presupuesto fijo conservador, y se avisa al usuario que es un
     valor por defecto, no una medición de su equipo.
   ============================================================ */

// Estimación de bytes que ocupa cada número guardado en un arreglo de
// arreglos de JS: 8 bytes del valor double + un margen por el overhead
// de arreglos/objetos del motor de JavaScript.
const BYTES_POR_NUMERO = 130;

function obtenerFuenteMemoria() {
  if (typeof performance !== 'undefined' && performance.memory && performance.memory.jsHeapSizeLimit) {
    return { tipo: 'heap', bytes: performance.memory.jsHeapSizeLimit };
  }
  if (typeof navigator !== 'undefined' && navigator.deviceMemory) {
    return { tipo: 'deviceMemory', bytes: navigator.deviceMemory * 1024 * 1024 * 1024 };
  }
  return { tipo: 'estimado', bytes: 300 * 1024 * 1024 }; // 300 MB por defecto si el navegador no reporta nada
}

function presupuestoDeBytes() {
  const fuente = obtenerFuenteMemoria();
  // Nunca dedicamos toda la RAM detectada a las matrices: dejamos margen
  // para el resto de la página, el navegador y el sistema operativo.
  const fraccion = fuente.tipo === 'heap' ? 0.5 : (fuente.tipo === 'deviceMemory' ? 0.03 : 1);
  return { bytes: fuente.bytes * fraccion, fuente: fuente.tipo, totalDetectado: fuente.bytes };
}

function estimarCapacidad() {
  const { bytes: presupuesto, fuente, totalDetectado } = presupuestoDeBytes();
  const bytesUsados = matrices.reduce((acc, m) => acc + m.rows * m.cols * BYTES_POR_NUMERO, 0);
  const restante = Math.max(0, presupuesto - bytesUsados);

  const celdasPromedio = matrices.length
    ? matrices.reduce((acc, m) => acc + m.rows * m.cols, 0) / matrices.length
    : 16; // suposición razonable (una matriz 4x4) mientras el banco esté vacío

  const bytesPorMatrizPromedio = celdasPromedio * BYTES_POR_NUMERO;
  const adicionalesEstimadas = Math.floor(restante / bytesPorMatrizPromedio);

  return { adicionalesEstimadas, fuente, totalDetectado };
}

function actualizarCapacidad() {
  const el = document.getElementById('bank-count');
  if (!el) return;
  const { adicionalesEstimadas, fuente, totalDetectado } = estimarCapacidad();

  let notaFuente;
  if (fuente === 'heap') {
    notaFuente = 'según el límite de memoria que tu navegador le da a esta pestaña';
  } else if (fuente === 'deviceMemory') {
    const gb = (totalDetectado / (1024 * 1024 * 1024)).toFixed(1);
    notaFuente = `estimado a partir de los ~${gb} GB de RAM que reporta tu dispositivo`;
  } else {
    notaFuente = 'tu navegador no reporta la RAM del dispositivo; esto es un valor por defecto, no una medición real';
  }

  el.textContent = `${matrices.length} creadas · ~${adicionalesEstimadas.toLocaleString('es')} más posibles (${notaFuente})`;
  el.classList.toggle('is-low', adicionalesEstimadas < 5);
}

/* ============================================================
   BANCO DE MATRICES
   ============================================================ */
function addMatrix(name, data) {
  const rows = data.length;
  const cols = data[0].length;
  const matrix = {
    id: idCounter++,
    name: name && name.trim() ? name.trim() : `Matriz ${matrices.length + 1}`,
    rows, cols, data
  };
  matrices.push(matrix);
  saveToDB();
  renderBank();
  refreshAllSelects();
  return matrix;
}


function deleteMatrix(id) {
  matrices = matrices.filter(m => m.id !== id);
  saveToDB();
  renderBank();
  refreshAllSelects();
}


function getMatrix(id) {
  return matrices.find(m => m.id === Number(id));
}

function renderBank() {
  actualizarCapacidad();
  const list = document.getElementById('bank-list');
  const empty = document.getElementById('bank-empty');
  list.innerHTML = '';
  if (matrices.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  matrices.forEach(m => {
    const li = document.createElement('li');
    li.className = 'bank-card';
    const preview = m.data.map(row => row.map(v => fmt(v)).join('  ')).join('\n');
    li.innerHTML = `
      <div class="bank-card__head">
        <span class="bank-card__name">${escapeHtml(m.name)}</span>
        <span class="bank-card__size">${m.rows}×${m.cols}</span>
      </div>
      <div class="bank-card__preview">${escapeHtml(preview)}</div>
      <div class="bank-card__actions">
        <button class="btn btn--small" data-edit="${m.id}">Editar</button>
        <button class="btn btn--small btn--danger" data-delete="${m.id}">Eliminar</button>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(Number(btn.dataset.edit)));
  });
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteMatrix(Number(btn.dataset.delete)));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   SELECTS COMPARTIDOS
   ============================================================ */
function fillSelect(select, list, placeholder) {
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  list.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.rows}×${m.cols})`;
    select.appendChild(opt);
  });
  if (list.some(m => String(m.id) === current)) select.value = current;
}

function refreshAllSelects() {
  fillSelect(document.getElementById('op-select-a'), matrices, '— Selecciona A —');
  fillSelect(document.getElementById('op-select-b'), matrices, '— Selecciona B —');
  fillSelect(document.getElementById('gauss-select'), matrices, '— Selecciona una matriz aumentada —');
  fillSelect(document.getElementById('g5-select'), matrices, '— Selecciona una matriz aumentada —');
  fillSelect(document.getElementById('inv-select'), matrices.filter(m => m.rows === m.cols), '— Selecciona una matriz cuadrada —');
}

/* ============================================================
   PESTAÑAS
   ============================================================ */
document.querySelectorAll('.tabs__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs__btn').forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-selected','false'); });
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('is-active'));
    btn.classList.add('is-active');
    btn.setAttribute('aria-selected','true');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('is-active');
  });
});

/* ============================================================
   MODAL: NUEVA MATRIZ
   ============================================================ */
const modalNew = document.getElementById('modal-new');
document.getElementById('btn-new-matrix').addEventListener('click', () => {
  document.getElementById('new-name').value = '';
  document.getElementById('new-rows').value = 3;
  document.getElementById('new-cols').value = 4;
  document.getElementById('new-grid-wrap').innerHTML = '';
  document.getElementById('btn-save-matrix').hidden = true;
  modalNew.hidden = false;
});

document.getElementById('btn-build-grid').addEventListener('click', () => {
  const rows = clampInt(document.getElementById('new-rows').value, 1, 8);
  const cols = clampInt(document.getElementById('new-cols').value, 1, 9);
  document.getElementById('new-rows').value = rows;
  document.getElementById('new-cols').value = cols;
  buildEditableGrid('new-grid-wrap', rows, cols);
  document.getElementById('btn-save-matrix').hidden = false;
});

document.getElementById('btn-save-matrix').addEventListener('click', () => {
  const data = readEditableGrid('new-grid-wrap');
  if (!data) return;
  const name = document.getElementById('new-name').value;
  addMatrix(name, data);
  modalNew.hidden = true;
});

/* ============================================================
   MODAL: EDITAR MATRIZ
   ============================================================ */
const modalEdit = document.getElementById('modal-edit');
let editingId = null;

function openEditModal(id) {
  const m = getMatrix(id);
  if (!m) return;
  editingId = id;
  document.getElementById('edit-title').textContent = `Editar "${m.name}"`;
  buildEditableGrid('edit-grid-wrap', m.rows, m.cols, m.data);
  modalEdit.hidden = false;
}

document.getElementById('btn-save-edit').addEventListener('click', () => {
  const data = readEditableGrid('edit-grid-wrap');
  if (!data) return;
  const m = getMatrix(editingId);
  m.data = data;
  saveToDB();
  modalEdit.hidden = true;
  renderBank();
});


document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.close).hidden = true;
  });
});

function clampInt(v, min, max) {
  let n = parseInt(v, 10);
  if (isNaN(n)) n = min;
  return Math.min(max, Math.max(min, n));
}

/* ============================================================
   CONSTRUCCIÓN DE CUADRÍCULAS EDITABLES (formularios)
   ============================================================ */
function buildEditableGrid(containerId, rows, cols, initial) {
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'build-grid';
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.dataset.rows = rows;
  grid.dataset.cols = cols;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.value = initial ? initial[i][j] : 0;
      input.dataset.row = i;
      input.dataset.col = j;
      grid.appendChild(input);
    }
  }
  wrap.appendChild(grid);
}

function readEditableGrid(containerId) {
  const grid = document.querySelector(`#${containerId} .build-grid`);
  if (!grid) return null;
  const rows = Number(grid.dataset.rows);
  const cols = Number(grid.dataset.cols);
  const data = Array.from({ length: rows }, () => new Array(cols).fill(0));
  let ok = true;
  grid.querySelectorAll('input').forEach(input => {
    const v = parseFloat(input.value);
    if (isNaN(v)) ok = false;
    data[Number(input.dataset.row)][Number(input.dataset.col)] = isNaN(v) ? 0 : v;
  });
  if (!ok) { alert('Revisa que todos los valores sean números.'); return null; }
  return data;
}

/* ============================================================
   RENDER DE MATRICES DE SOLO LECTURA (con resaltado de pasos)
   ============================================================ */
function renderGrid(container, data, opts = {}) {
  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'grid-display';
  const grid = document.createElement('div');
  grid.className = 'grid-display__matrix';
  const cols = data[0].length;
  grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;
  const sepCol = opts.sepCol; // índice de columna donde empieza la parte "aumentada"
  const h = opts.highlight || {};
  data.forEach((row, i) => {
    row.forEach((val, j) => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      if (sepCol !== undefined && j === sepCol) cell.classList.add('is-augmented-sep');
      if (h.pivotCol === j && h.rowActive === i) cell.classList.add('is-pivot');
      else if (h.rowActive === i) cell.classList.add('is-row-active');
      else if (h.rowSecondary === i) cell.classList.add('is-row-secondary');
      cell.textContent = fmt(val);
      grid.appendChild(cell);
    });
  });
  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}

/* ============================================================
   OPERACIONES: SUMA / RESTA / MULTIPLICACIÓN
   ============================================================ */
function sumar(a, b) { return a.map((row, i) => row.map((v, j) => v + b[i][j])); }
function restar(a, b) { return a.map((row, i) => row.map((v, j) => v - b[i][j])); }
function multiplicar(a, b) {
  const filas = a.length, columnas = b[0].length, k = a[0].length;
  const out = [];
  for (let i = 0; i < filas; i++) {
    const fila = [];
    for (let j = 0; j < columnas; j++) {
      let suma = 0;
      for (let x = 0; x < k; x++) suma += a[i][x] * b[x][j];
      fila.push(suma);
    }
    out.push(fila);
  }
  return out;
}

let lastOpResult = null;

document.querySelectorAll('[data-op]').forEach(btn => {
  btn.addEventListener('click', () => {
    const errBox = document.getElementById('op-error');
    const resultBox = document.getElementById('op-result');
    errBox.hidden = true;
    resultBox.hidden = true;

    const a = getMatrix(document.getElementById('op-select-a').value);
    const b = getMatrix(document.getElementById('op-select-b').value);
    if (!a || !b) { showError(errBox, 'Selecciona ambas matrices, A y B.'); return; }

    const op = btn.dataset.op;
    let out, label;
    if (op === 'sumar' || op === 'restar') {
      if (a.rows !== b.rows || a.cols !== b.cols) {
        showError(errBox, 'Esas matrices no tienen el mismo tamaño; no se pueden sumar ni restar.');
        return;
      }
      out = op === 'sumar' ? sumar(a.data, b.data) : restar(a.data, b.data);
      label = op === 'sumar' ? `${a.name} + ${b.name}` : `${a.name} − ${b.name}`;
    } else {
      if (a.cols !== b.rows) {
        showError(errBox, 'El número de columnas de A debe ser igual al número de filas de B.');
        return;
      }
      out = multiplicar(a.data, b.data);
      label = `${a.name} × ${b.name}`;
    }

    lastOpResult = { data: out, name: label };
    renderGrid(document.getElementById('op-result-grid'), out);
    resultBox.hidden = false;
  });
});

document.getElementById('op-save-result').addEventListener('click', () => {
  if (!lastOpResult) return;
  addMatrix(lastOpResult.name, lastOpResult.data);
  // addMatrix already calls saveToDB()
});


function showError(box, msg) { box.textContent = msg; box.hidden = false; }

/* ============================================================
   MOTOR GAUSS-JORDAN (puerto de gauss_jordan() en Python)
   pivotCols: número de columnas donde se buscan pivotes
   (cols-1 para un sistema normal, n para invertir una matriz)
   ============================================================ */
function gaussJordanSteps(inputMatrix, pivotCols) {
  const m = cloneMatrix(inputMatrix);
  const filas = m.length;
  const columnas = m[0].length;
  const steps = [];
  let filaPivote = 0;

  for (let col = 0; col < pivotCols; col++) {
    if (filaPivote >= filas) break;

    if (isZero(m[filaPivote][col])) {
      for (let f = filaPivote + 1; f < filas; f++) {
        if (!isZero(m[f][col])) {
          [m[filaPivote], m[f]] = [m[f], m[filaPivote]];
          steps.push({
            type: 'swap',
            label: `F${filaPivote + 1} ↔ F${f + 1}`,
            snapshot: cloneMatrix(m),
            rowActive: filaPivote, rowSecondary: f, pivotCol: col
          });
          break;
        }
      }
    }

    if (isZero(m[filaPivote][col])) continue;

    const pivote = m[filaPivote][col];
    if (!isClose(pivote, 1)) {
      for (let c = 0; c < columnas; c++) m[filaPivote][c] = m[filaPivote][c] / pivote;
      steps.push({
        type: 'scale',
        label: `F${filaPivote + 1} = F${filaPivote + 1} / ${fmt(pivote)}`,
        snapshot: cloneMatrix(m),
        rowActive: filaPivote, pivotCol: col
      });
    }

    for (let f = 0; f < filas; f++) {
      if (f !== filaPivote) {
        const factor = m[f][col];
        if (!isZero(factor)) {
          for (let c = 0; c < columnas; c++) m[f][c] = m[f][c] - factor * m[filaPivote][c];
          const label = factor > 0
            ? `F${f + 1} = F${f + 1} − (${fmt(factor)}) F${filaPivote + 1}`
            : `F${f + 1} = F${f + 1} + (${fmt(Math.abs(factor))}) F${filaPivote + 1}`;
          steps.push({
            type: 'eliminate', label, snapshot: cloneMatrix(m),
            rowActive: f, rowSecondary: filaPivote, pivotCol: col
          });
        }
      }
    }
    filaPivote++;
  }

  return { steps, final: m, pivotRowsUsed: filaPivote };
}

/* ============================================================
   INTERPRETACIÓN DE LA SOLUCIÓN DE UN SISTEMA
   ============================================================ */
function analyzeSolution(final) {
  const nVars = final[0].length - 1;
  const rows = final.length;
  const pivotOf = new Array(rows).fill(-1);
  let inconsistent = false;

  for (let i = 0; i < rows; i++) {
    let pivotCol = -1;
    for (let j = 0; j < nVars; j++) {
      if (!isZero(final[i][j])) { pivotCol = j; break; }
    }
    if (pivotCol === -1 && !isZero(final[i][nVars])) inconsistent = true;
    pivotOf[i] = pivotCol;
  }

  if (inconsistent) {
    return { status: 'sin-solucion' };
  }

  const usedCols = new Set(pivotOf.filter(c => c !== -1));
  const freeVars = [];
  for (let j = 0; j < nVars; j++) if (!usedCols.has(j)) freeVars.push(j);

  if (freeVars.length === 0 && usedCols.size === nVars) {
    const x = new Array(nVars).fill(0);
    pivotOf.forEach((col, row) => { if (col !== -1) x[col] = final[row][nVars]; });
    return { status: 'unica', x };
  }

  // Infinitas soluciones: describir cada variable pivote en términos de las libres
  const equations = [];
  pivotOf.forEach((col, row) => {
    if (col === -1) return;
    let terms = fmt(final[row][final[row].length - 1]);
    freeVars.forEach(fv => {
      const coef = final[row][fv];
      if (!isZero(coef)) {
        terms += coef > 0 ? ` − (${fmt(coef)})x${fv + 1}` : ` + (${fmt(Math.abs(coef))})x${fv + 1}`;
      }
    });
    equations.push(`x${col + 1} = ${terms}`);
  });

  return { status: 'infinitas', equations, freeVars };
}

/* ============================================================
   RENDER DE PASOS (compartido entre Gauss-Jordan e Inversa)
   ============================================================ */
function renderStepNav(prefix, state) {
  const progress = document.getElementById(`${prefix}-progress`);
  progress.textContent = `Paso ${state.stepIndex + 1} / ${state.steps.length}`;
  document.getElementById(`${prefix}-prev`).disabled = state.stepIndex <= 0;
  document.getElementById(`${prefix}-next`).disabled = state.stepIndex >= state.steps.length - 1;
}

function renderStepsUpTo(prefix, state, sepCol) {
  const box = document.getElementById(`${prefix}-steps`);
  box.innerHTML = '';
  box.hidden = false;
  for (let i = 0; i <= state.stepIndex; i++) {
    const s = state.steps[i];
    const div = document.createElement('div');
    div.className = 'step' + (i === state.stepIndex ? ' is-current' : '');
    const labelClass = s.type === 'swap' ? 'step__label--swap' : (s.type === 'eliminate' ? 'step__label--eliminate' : '');
    div.innerHTML = `<div class="step__label ${labelClass}">Paso ${i + 1}: ${escapeHtml(s.label)}</div>`;
    box.appendChild(div);
    const gridHost = document.createElement('div');
    renderGrid(gridHost, s.snapshot, { sepCol, highlight: s });
    div.appendChild(gridHost.firstChild);
  }
  box.lastElementChild && box.lastElementChild.scrollIntoView({ block: 'nearest' });
}

/* ============================================================
   PANEL GAUSS-JORDAN
   ============================================================ */
document.getElementById('gauss-solve').addEventListener('click', () => {
  const errBox = document.getElementById('gauss-error');
  errBox.hidden = true;
  document.getElementById('gauss-solution').hidden = true;

  const m = getMatrix(document.getElementById('gauss-select').value);
  if (!m) { showError(errBox, 'Selecciona una matriz del banco.'); return; }
  if (m.cols < 2) { showError(errBox, 'La matriz necesita al menos una columna de incógnitas y una de términos independientes.'); return; }

  const { steps, final } = gaussJordanSteps(m.data, m.cols - 1);
  if (steps.length === 0) {
    showError(errBox, 'Esa matriz ya está resuelta o no tiene columnas para reducir.');
    return;
  }

  gaussState = { steps, final, stepIndex: 0, sepCol: m.cols - 1 };
  document.getElementById('gauss-steps').hidden = false;
  document.getElementById('gauss-controls').hidden = false;
  document.getElementById('gauss-reset').hidden = false;
  renderStepsUpTo('gauss', gaussState, gaussState.sepCol);
  renderStepNav('gauss', gaussState);
  maybeShowGaussSolution();
});

document.getElementById('gauss-prev').addEventListener('click', () => {
  if (!gaussState || gaussState.stepIndex <= 0) return;
  gaussState.stepIndex--;
  renderStepsUpTo('gauss', gaussState, gaussState.sepCol);
  renderStepNav('gauss', gaussState);
  document.getElementById('gauss-solution').hidden = true;
});

document.getElementById('gauss-next').addEventListener('click', () => {
  if (!gaussState || gaussState.stepIndex >= gaussState.steps.length - 1) return;
  gaussState.stepIndex++;
  renderStepsUpTo('gauss', gaussState, gaussState.sepCol);
  renderStepNav('gauss', gaussState);
  maybeShowGaussSolution();
});

document.getElementById('gauss-all').addEventListener('click', () => {
  if (!gaussState) return;
  gaussState.stepIndex = gaussState.steps.length - 1;
  renderStepsUpTo('gauss', gaussState, gaussState.sepCol);
  renderStepNav('gauss', gaussState);
  maybeShowGaussSolution();
});

document.getElementById('gauss-reset').addEventListener('click', () => {
  gaussState = null;
  document.getElementById('gauss-steps').hidden = true;
  document.getElementById('gauss-controls').hidden = true;
  document.getElementById('gauss-reset').hidden = true;
  document.getElementById('gauss-solution').hidden = true;
});

function maybeShowGaussSolution() {
  if (gaussState.stepIndex !== gaussState.steps.length - 1) return;
  const analysis = analyzeSolution(gaussState.final);
  const body = document.getElementById('gauss-solution-body');
  const title = document.getElementById('gauss-solution-title');
  body.innerHTML = '';
  if (analysis.status === 'sin-solucion') {
    title.textContent = 'Sin solución';
    body.innerHTML = '<p class="hint">Una fila se reduce a 0 = valor distinto de cero: el sistema es inconsistente.</p>';
  } else if (analysis.status === 'unica') {
    title.textContent = 'Solución única';
    analysis.x.forEach((v, i) => {
      const p = document.createElement('div');
      p.className = 'solution-line';
      p.textContent = `x${i + 1} = ${fmt(v)}`;
      body.appendChild(p);
    });
  } else {
    title.textContent = 'Infinitas soluciones';
    const info = document.createElement('p');
    info.className = 'hint';
    info.textContent = `Variables libres: ${analysis.freeVars.map(f => 'x' + (f + 1)).join(', ')}`;
    body.appendChild(info);
    analysis.equations.forEach(eq => {
      const p = document.createElement('div');
      p.className = 'solution-line';
      p.textContent = eq;
      body.appendChild(p);
    });
  }
  document.getElementById('gauss-solution').hidden = false;
}

/* ============================================================
   PANEL MÉTODO DE LA MATRIZ INVERSA (reversible)
   ============================================================ */
const invSelect = document.getElementById('inv-select');
invSelect.addEventListener('change', () => {
  const m = getMatrix(invSelect.value);
  const wrap = document.getElementById('inv-b-wrap');
  const inputsHost = document.getElementById('inv-b-inputs');
  inputsHost.innerHTML = '';
  if (!m) { wrap.hidden = true; return; }
  for (let i = 0; i < m.rows; i++) {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.value = 0;
    input.dataset.index = i;
    input.setAttribute('aria-label', `b${i + 1}`);
    inputsHost.appendChild(input);
  }
  wrap.hidden = false;
});

document.getElementById('inv-solve').addEventListener('click', () => {
  const errBox = document.getElementById('inv-error');
  errBox.hidden = true;
  document.getElementById('inv-result').hidden = true;

  const m = getMatrix(invSelect.value);
  if (!m) { showError(errBox, 'Selecciona una matriz cuadrada A del banco.'); return; }

  const n = m.rows;
  const bInputs = Array.from(document.querySelectorAll('#inv-b-inputs input'));
  const b = new Array(n).fill(0);
  let bOk = true;
  bInputs.forEach(inp => {
    const v = parseFloat(inp.value);
    if (isNaN(v)) bOk = false;
    b[Number(inp.dataset.index)] = isNaN(v) ? 0 : v;
  });
  if (!bOk) { showError(errBox, 'Revisa los valores del vector b.'); return; }

  // Construir [A | I]
  const augmented = m.data.map((row, i) => {
    const identityRow = new Array(n).fill(0);
    identityRow[i] = 1;
    return row.concat(identityRow);
  });

  const { steps, final, pivotRowsUsed } = gaussJordanSteps(augmented, n);

  if (pivotRowsUsed < n) {
    showError(errBox, 'Esta matriz no tiene inversa (no se pudo llevar la mitad izquierda a la identidad).');
    return;
  }

  const inverse = final.map(row => row.slice(n));

  invState = { steps, inverse, stepIndex: steps.length ? 0 : -1, sepCol: n, A: m.data, b, n };

  if (steps.length === 0) {
    document.getElementById('inv-steps').hidden = true;
    document.getElementById('inv-controls').hidden = true;
  } else {
    document.getElementById('inv-steps').hidden = false;
    document.getElementById('inv-controls').hidden = false;
    renderStepsUpTo('inv', invState, invState.sepCol);
    renderStepNav('inv', invState);
  }
  document.getElementById('inv-reset').hidden = false;
  showInverseResult();
});

document.getElementById('inv-prev').addEventListener('click', () => {
  if (!invState || invState.stepIndex <= 0) return;
  invState.stepIndex--;
  renderStepsUpTo('inv', invState, invState.sepCol);
  renderStepNav('inv', invState);
});

document.getElementById('inv-next').addEventListener('click', () => {
  if (!invState || invState.stepIndex >= invState.steps.length - 1) return;
  invState.stepIndex++;
  renderStepsUpTo('inv', invState, invState.sepCol);
  renderStepNav('inv', invState);
});

document.getElementById('inv-all').addEventListener('click', () => {
  if (!invState) return;
  invState.stepIndex = invState.steps.length - 1;
  renderStepsUpTo('inv', invState, invState.sepCol);
  renderStepNav('inv', invState);
});

document.getElementById('inv-reset').addEventListener('click', () => {
  invState = null;
  document.getElementById('inv-steps').hidden = true;
  document.getElementById('inv-controls').hidden = true;
  document.getElementById('inv-reset').hidden = true;
  document.getElementById('inv-result').hidden = true;
});

function showInverseResult() {
  const { inverse, A, b, n } = invState;
  renderGrid(document.getElementById('inv-inverse-grid'), inverse);

  const check = multiplicar(A, inverse).map(row => row.map(v => (isZero(v) ? 0 : Math.round(v * 100) / 100)));
  renderGrid(document.getElementById('inv-check-grid'), check);

  const bCol = b.map(v => [v]);
  const x = multiplicar(inverse, bCol).map(row => row[0]);
  const body = document.getElementById('inv-solution-body');
  body.innerHTML = '';
  x.forEach((v, i) => {
    const p = document.createElement('div');
    p.className = 'solution-line';
    p.textContent = `x${i + 1} = ${fmt(v)}`;
    body.appendChild(p);
  });

  document.getElementById('inv-result').hidden = false;
}

/* ============================================================
   INICIO
   ============================================================ */
renderBank();
refreshAllSelects();

// Retorna las columnas pivote encontradas
function gaussJordanSteps(inputMatrix, pivotCols) {
  const m = cloneMatrix(inputMatrix);
  const filas = m.length;
  const columnas = m[0].length;
  const steps = [];
  const pivotColumnsIdentified = [];
  let filaPivote = 0;

  for (let col = 0; col < pivotCols; col++) {
    if (filaPivote >= filas) break;

    if (isZero(m[filaPivote][col])) {
      for (let f = filaPivote + 1; f < filas; f++) {
        if (!isZero(m[f][col])) {
          [m[filaPivote], m[f]] = [m[f], m[filaPivote]];
          steps.push({
            type: 'swap',
            label: `F${filaPivote + 1} ↔ F${f + 1}`,
            snapshot: cloneMatrix(m),
            rowActive: filaPivote, rowSecondary: f, pivotCol: col
          });
          break;
        }
      }
    }

    if (isZero(m[filaPivote][col])) continue;

    pivotColumnsIdentified.push(col); // Guardar índice de columna pivote

    const pivote = m[filaPivote][col];
    if (!isClose(pivote, 1)) {
      for (let c = 0; c < columnas; c++) m[filaPivote][c] = m[filaPivote][c] / pivote;
      steps.push({
        type: 'scale',
        label: `F${filaPivote + 1} = F${filaPivote + 1} / ${fmt(pivote)}`,
        snapshot: cloneMatrix(m),
        rowActive: filaPivote, pivotCol: col
      });
    }

    for (let f = 0; f < filas; f++) {
      if (f !== filaPivote) {
        const factor = m[f][col];
        if (!isZero(factor)) {
          for (let c = 0; c < columnas; c++) m[f][c] = m[f][c] - factor * m[filaPivote][c];
          const label = factor > 0
            ? `F${f + 1} = F${f + 1} − (${fmt(factor)}) F${filaPivote + 1}`
            : `F${f + 1} = F${f + 1} + (${fmt(Math.abs(factor))}) F${filaPivote + 1}`;
          steps.push({
            type: 'eliminate', label, snapshot: cloneMatrix(m),
            rowActive: f, rowSecondary: filaPivote, pivotCol: col
          });
        }
      }
    }
    filaPivote++;
  }

  return { steps, final: m, pivotRowsUsed: filaPivote, pivotColumns: pivotColumnsIdentified };
}

/* ============================================================
   CONVERTIDORES DE BASES
   ============================================================ */

function decToBin(n) {
// ... (existing code)
  if (n === 0) return "0";
  let res = [];
  let num = Math.floor(n);
  while (num > 0) {
    res.push(num % 2);
    num = Math.floor(num / 2);
  }
  return res.reverse().join('');
}

function binToDec(b) {
  let dec = 0;
  let s = String(b);
  for (let i = 0; i < s.length; i++) {
    dec += parseInt(s[s.length - 1 - i]) * Math.pow(2, i);
  }
  return dec;
}

function decToOct(n) {
  if (n === 0) return "0";
  let res = [];
  let num = Math.floor(n);
  while (num > 0) {
    res.push(num % 8);
    num = Math.floor(num / 8);
  }
  return res.reverse().join('');
}

function octToDec(o) {
  let dec = 0;
  let s = String(o);
  for (let i = 0; i < s.length; i++) {
    dec += parseInt(s[s.length - 1 - i]) * Math.pow(8, i);
  }
  return dec;
}

function decToHex(n) {
  if (n === 0) return "0";
  const hexChars = "0123456789ABCDEF";
  let res = [];
  let num = Math.floor(n);
  while (num > 0) {
    res.push(hexChars[num % 16]);
    num = Math.floor(num / 16);
  }
  return res.reverse().join('');
}

function hexToDec(h) {
  const hexChars = "0123456789ABCDEF";
  let dec = 0;
  let s = String(h).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    let val = hexChars.indexOf(s[s.length - 1 - i]);
    dec += val * Math.pow(16, i);
  }
  return dec;
}

document.querySelectorAll('[data-conv]').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.conv;
    const decIn = document.getElementById('conv-dec-in');
    const baseIn = document.getElementById('conv-base-in');
    const decOut = document.getElementById('conv-dec-out');
    const baseOut = document.getElementById('conv-base-out');

    decOut.hidden = true;
    baseOut.hidden = true;

    try {
      if (type === 'dec-bin') {
        const val = parseInt(decIn.value);
        if (isNaN(val)) throw new Error('Entrada inválida');
        baseOut.hidden = false; // Reuse baseOut for the result or separate? In HTML I put result boxes.
        // Wait, my HTML has conv-dec-out and conv-base-out.
        // Dec to Base -> result in conv-dec-out
        // Base to Dec -> result in conv-base-out
        document.querySelector('#conv-dec-out .res-val').textContent = decToBin(val);
        decOut.hidden = false;
      } else if (type === 'dec-oct') {
        const val = parseInt(decIn.value);
        if (isNaN(val)) throw new Error('Entrada inválida');
        document.querySelector('#conv-dec-out .res-val').textContent = decToOct(val);
        decOut.hidden = false;
      } else if (type === 'dec-hex') {
        const val = parseInt(decIn.value);
        if (isNaN(val)) throw new Error('Entrada inválida');
        document.querySelector('#conv-dec-out .res-val').textContent = decToHex(val);
        decOut.hidden = false;
      } else if (type === 'bin-dec') {
        const val = baseIn.value;
        if (!/^[01]+$/.test(val)) throw new Error('Binario inválido');
        document.querySelector('#conv-base-out .res-val').textContent = binToDec(val);
        baseOut.hidden = false;
      } else if (type === 'oct-dec') {
        const val = baseIn.value;
        if (!/^[0-7]+$/.test(val)) throw new Error('Octal inválido');
        document.querySelector('#conv-base-out .res-val').textContent = octToDec(val);
        baseOut.hidden = false;
      } else if (type === 'hex-dec') {
        const val = baseIn.value;
        if (!/^[0-9A-Fa-f]+$/.test(val)) throw new Error('Hexadecimal inválido');
        document.querySelector('#conv-base-out .res-val').textContent = hexToDec(val);
        baseOut.hidden = false;
      }
    } catch (e) {
      alert(e.message);
    }
  });
});

/* ============================================================
   MÉTODO GRUPO 5 (Programa1_Grupo5.py)
   ============================================================ */

function g5SolveSteps(inputMatrix) {
  const m = cloneMatrix(inputMatrix);
  const filas = m.length;
  const cols = m[0].length;
  const steps = [];

  for (let i = 0; i < filas; i++) {
    // Paso 1: Pivotaje
    if (isZero(m[i][i])) {
      for (let k = i + 1; k < filas; k++) {
        if (!isZero(m[k][i])) {
          [m[i], m[k]] = [m[k], m[i]];
          steps.push({
            type: 'swap',
            label: `Intercambio F${i + 1} ↔ F${k + 1}`,
            snapshot: cloneMatrix(m),
            rowActive: i, rowSecondary: k, pivotCol: i
          });
          break;
        }
      }
    }

    // Paso 2: Normalización del pivote
    const pivote = m[i][i];
    if (!isZero(pivote)) {
      for (let j = i; j < cols; j++) {
        m[i][j] /= pivote;
      }
      steps.push({
        type: 'scale',
        label: `Normalización F${i + 1} = F${i + 1} / ${fmt(pivote)}`,
        snapshot: cloneMatrix(m),
        rowActive: i, pivotCol: i
      });
    }

    // Paso 3: Eliminación hacia abajo
    for (let k = i + 1; k < filas; k++) {
      const factor = m[k][i];
      if (!isZero(factor)) {
        for (let j = i; j < cols; j++) {
          m[k][j] -= factor * m[i][j];
        }
        steps.push({
          type: 'eliminate',
          label: `Eliminación F${k + 1} = F${k + 1} - (${fmt(factor)})F${i + 1}`,
          snapshot: cloneMatrix(m),
          rowActive: k, rowSecondary: i, pivotCol: i
        });
      }
    }
  }
  return { steps, final: m };
}

function g5Classify(final) {
  const filas = final.length;
  const cols = final[0].length;
  const nVars = cols - 1;

  for (let i = 0; i < filas; i++) {
    let allZeros = true;
    for (let j = 0; j < nVars; j++) {
      if (!isZero(final[i][j])) { allZeros = false; break; }
    }
    if (allZeros && !isZero(final[i][nVars])) {
      return "Sistema Inconsistente: Sin Solución";
    }
  }

  let rango = 0;
  for (let i = 0; i < filas; i++) {
    if (final[i].some(x => !isZero(x))) rango++;
  }

  if (rango < nVars) {
    return "Sistema Consistente Indeterminado: Infinitas Soluciones";
  }

  return "Sistema Consistente Determinado: Solución Única";
}

function g5BackSubstitution(final) {
  const filas = final.length;
  const cols = final[0].length;
  const nVars = cols - 1;
  const solutions = new Array(nVars).fill(0);

  for (let i = filas - 1; i >= 0; i--) {
    let suma = final[i][nVars];
    for (let j = i + 1; j < nVars; j++) {
      suma -= final[i][j] * solutions[j];
    }
    solutions[i] = suma / final[i][i];
  }
  return solutions;
}

document.getElementById('g5-solve').addEventListener('click', () => {
  const errBox = document.getElementById('g5-error');
  const resultBox = document.getElementById('g5-result');
  const stepsBox = document.getElementById('g5-steps');
  const solutionBody = document.getElementById('g5-solution-body');
  const classificationTitle = document.getElementById('g5-classification');

  errBox.hidden = true;
  resultBox.hidden = true;
  stepsBox.hidden = true;
  solutionBody.innerHTML = '';

  const m = getMatrix(document.getElementById('g5-select').value);
  if (!m) { showError(errBox, 'Selecciona una matriz del banco.'); return; }

  const { steps, final } = g5SolveSteps(m.data);
  const classification = g5Classify(final);

  stepsBox.hidden = false;
  steps.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'step';
    const labelClass = s.type === 'swap' ? 'step__label--swap' : (s.type === 'eliminate' ? 'step__label--eliminate' : '');
    div.innerHTML = `<div class="step__label ${labelClass}">Paso ${i + 1}: ${escapeHtml(s.label)}</div>`;
    const gridHost = document.createElement('div');
    renderGrid(gridHost, s.snapshot, { sepCol: m.cols - 1, highlight: s });
    div.appendChild(gridHost.firstChild);
    stepsBox.appendChild(div);
  });

  classificationTitle.textContent = classification;
  resultBox.hidden = false;

  if (classification.includes("Única")) {
    const sol = g5BackSubstitution(final);
    sol.forEach((v, i) => {
      const p = document.createElement('div');
      p.className = 'solution-line';
      p.textContent = `x${i + 1} = ${fmt(v)}`;
      solutionBody.appendChild(p);
    });
  } else if (classification.includes("Infinitas")) {
    solutionBody.innerHTML = '<p class="hint">El sistema tiene múltiples soluciones dependientes.</p>';
  } else {
    solutionBody.innerHTML = '<p class="hint">No existe un conjunto de valores que satisfaga todas las ecuaciones.</p>';
  }
});

document.getElementById('g5-reset').addEventListener('click', () => {
  document.getElementById('g5-steps').hidden = true;
  document.getElementById('g5-result').hidden = true;
  document.getElementById('g5-error').hidden = true;
});

/* ============================================================
   OPERACIONES CON VECTORES
   ============================================================ */

function parseVector(str) {
  if (!str) return null;
  return str.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
}

function parseVectorSet(str) {
  if (!str) return null;
  return str.split(';').map(vStr => parseVector(vStr)).filter(v => v !== null);
}

document.querySelectorAll('[data-vec-op]').forEach(btn => {
  btn.addEventListener('click', () => {
    const u = parseVector(document.getElementById('vec-u').value);
    const v = parseVector(document.getElementById('vec-v').value);
    const k = parseFloat(document.getElementById('vec-k').value);
    const resBox = document.getElementById('vec-op-result');
    const resVal = resBox.querySelector('.res-val');

    resBox.hidden = true;
    const op = btn.dataset.vecOp;
    let result = null;

    try {
      if (op === 'sumar') {
        if (!u || !v || u.length !== v.length) throw new Error('Vectores de distinta dimensión');
        result = u.map((val, i) => val + v[i]);
      } else if (op === 'restar') {
        if (!u || !v || u.length !== v.length) throw new Error('Vectores de distinta dimensión');
        result = u.map((val, i) => val - v[i]);
      } else if (op === 'escalar') {
        if (!u || isNaN(k)) throw new Error('Entrada inválida');
        result = u.map(val => val * k);
      }

      if (result) {
        resVal.textContent = `[${result.map(fmt).join(', ')}]`;
        resBox.hidden = false;
      }
    } catch (e) {
      alert(e.message);
    }
  });
});

document.getElementById('vec-check-cl').addEventListener('click', () => {
  const b = parseVector(document.getElementById('vec-b').value);
  const set = parseVectorSet(document.getElementById('vec-set').value);
  const resBox = document.getElementById('vec-cl-result');
  const resVal = resBox.querySelector('.res-val');

  resBox.hidden = true;
  if (!b || !set || set.length === 0) {
    alert('Ingresa el vector b y el conjunto de vectores.');
    return;
  }

  if (set.some(v => v.length !== b.length)) {
    alert('Todos los vectores deben tener la misma dimensión que b.');
    return;
  }

  const dim = b.length;
  const augmented = [];
  for (let i = 0; i < dim; i++) {
    const row = [];
    set.forEach(v => row.push(v[i]));
    row.push(b[i]);
    augmented.push(row);
  }

  const { final } = gaussJordanSteps(augmented, set.length);
  const analysis = analyzeSolution(final);

  if (analysis.status === 'sin-solucion') {
    resVal.textContent = 'No es combinación lineal';
    resVal.style.color = 'var(--accent-danger)';
  } else {
    resVal.textContent = 'Sí es combinación lineal';
    resVal.style.color = 'var(--accent-secondary)';
  }
  resBox.hidden = false;
});
