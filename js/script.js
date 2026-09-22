/* ============================================================
   ULTIMATE MATRIX ANALYZER ENGINE (ALL-IN-ONE + TOOLS)
   ============================================================ */
const EPS = 1e-9;

function isZero(n) { return Math.abs(n) < EPS; }
function isClose(a, b) { return Math.abs(a - b) < EPS; }

function fmt(n) {
  let v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? "0" : String(v);
}

function cloneMatrix(m) { return m.map(row => row.slice()); }

// --- 1. GAUSS-JORDAN ENGINE ---
function solveGaussJordan(inputMatrix) {
  const m = cloneMatrix(inputMatrix);
  const rows = m.length;
  const cols = m[0].length;
  const steps = [];
  let pivotRow = 0;

  for (let col = 0; col < cols - 1; col++) {
    if (pivotRow >= rows) break;

    if (isZero(m[pivotRow][col])) {
      for (let f = pivotRow + 1; f < rows; f++) {
        if (!isZero(m[f][col])) {
          [m[pivotRow], m[f]] = [m[f], m[pivotRow]];
          steps.push({ type: 'swap', label: `F${pivotRow+1} ↔ F${f+1}`, snapshot: cloneMatrix(m) });
          break;
        }
      }
    }
    if (isZero(m[pivotRow][col])) continue;

    const pivotVal = m[pivotRow][col];
    if (!isClose(pivotVal, 1)) {
      for (let c = 0; c < cols; c++) m[pivotRow][c] /= pivotVal;
      steps.push({ type: 'scale', label: `F${pivotRow+1} = F${pivotRow+1} / ${fmt(pivotVal)}`, snapshot: cloneMatrix(m) });
    }

    for (let f = 0; f < rows; f++) {
      if (f !== pivotRow) {
        const factor = m[f][col];
        if (!isZero(factor)) {
          for (let c = 0; c < cols; c++) m[f][c] -= factor * m[pivotRow][c];
          steps.push({ type: 'eliminate', label: `F${f+1} = F${f+1} - (${fmt(factor)})F${pivotRow+1}`, snapshot: cloneMatrix(m) });
        }
      }
    }
    pivotRow++;
  }
  return { steps, final: m, rank: pivotRow };
}

function analyzeSolution(final) {
  const rows = final.length;
  const cols = final[0].length;
  const nVars = cols - 1;
  let inconsistent = false;
  const pivotCols = [];

  for (let i = 0; i < rows; i++) {
    let pCol = -1;
    for (let j = 0; j < nVars; j++) {
      if (!isZero(final[i][j])) { pCol = j; break; }
    }
    if (pCol === -1 && !isZero(final[i][nVars])) inconsistent = true;
    if (pCol !== -1) pivotCols.push(pCol);
  }

  if (inconsistent) return { status: 'SIN_SOLUCION', msg: 'Sistema Inconsistente (Sin Solución)' };
  if (pivotCols.length < nVars) return { status: 'INFINITAS', msg: 'Sistema Consistente Indeterminado (Infinitas Soluciones)' };

  const x = new Array(nVars).fill(0);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < nVars; j++) {
      if (!isZero(final[i][j]) && (j === 0 || isZero(final[i][j-1]))) {
        x[j] = final[i][nVars];
        break;
      }
    }
  }
  return { status: 'UNICA', msg: 'Sistema Consistente Determinado (Solución Única)', x };
}

function calculateInverse(m) {
  const n = m.length;
  const aug = m.map((row, i) => [...row, ...Array.from({length: n}, (_, j) => i === j ? 1 : 0)]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(aug[j][i]) > Math.abs(aug[pivot][i])) pivot = j;
    [aug[i], aug[pivot]] = [aug[pivot], aug[i]];
    const div = aug[i][i];
    if (Math.abs(div) < EPS) return null;
    for (let j = i; j < 2 * n; j++) aug[i][j] /= div;
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = aug[k][i];
        for (let j = i; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
      }
    }
  }
  return aug.map(row => row.slice(n));
}

// --- 2. VECTOR OPS ---
function handleVectorOp(op) {
  const uStr = document.getElementById('vec-u').value;
  const vStr = document.getElementById('vec-v').value;
  const resDiv = document.getElementById('vec-result');
  const resVal = resDiv.querySelector('.res-val');

  const parse = s => s.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
  const u = parse(uStr);
  const v = parse(vStr);

  if (!u || !v) { alert('Ingresa vectores válidos'); return; }

  let result = null;
  if (op === 'sumar') {
    if (u.length !== v.length) { alert('Dimensiones distintas'); return; }
    result = u.map((x, i) => x + v[i]);
  } else if (op === 'restar') {
    if (u.length !== v.length) { alert('Dimensiones distintas'); return; }
    result = u.map((x, i) => x - v[i]);
  } else if (op === 'escalar') {
    const k = 2; // Default o podrías agregar un input
    result = u.map(x => x * k);
  }

  if (result) {
    resVal.textContent = `[${result.map(fmt).join(', ')}]`;
    resDiv.hidden = false;
  }
}

// --- 3. NUMERICAL CONVERSION ---
function handleConversion(type) {
  const input = document.getElementById('conv-in').value;
  const resDiv = document.getElementById('conv-result');
  const resVal = resDiv.querySelector('.res-val');

  try {
    let result = '';
    if (type === 'dec-bin') {
      let n = parseInt(input);
      if (n === 0) result = "0"; else {
        let res = [], num = n;
        while (num > 0) { res.push(num % 2); num = Math.floor(num / 2); }
        result = res.reverse().join('');
      }
    } else if (type === 'bin-dec') {
      let dec = 0;
      for (let i = 0; i < input.length; i++) dec += parseInt(input[input.length - 1 - i]) * Math.pow(2, i);
      result = dec;
    } else if (type === 'dec-hex') {
      let n = parseInt(input);
      if (n === 0) result = "0"; else {
        const hexChars = "0123456789ABCDEF";
        let res = [], num = n;
        while (num > 0) { res.push(hexChars[num % 16]); num = Math.floor(num / 16); }
        result = res.reverse().join('');
      }
    }
    resVal.textContent = result;
    resDiv.hidden = false;
  } catch (e) { alert('Entrada inválida'); }
}

// --- UI INTEGRATION ---
document.getElementById('btn-generate').addEventListener('click', () => {
  const rows = parseInt(document.getElementById('rows-in').value);
  const cols = parseInt(document.getElementById('cols-in').value);
  const grid = document.getElementById('matrix-grid');
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;

  for (let i = 0; i < rows * cols; i++) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = 0;
    grid.appendChild(input);
  }
  document.getElementById('matrix-wrap').hidden = false;
});

document.getElementById('btn-analyze').addEventListener('click', () => {
  const rows = parseInt(document.getElementById('rows-in').value);
  const cols = parseInt(document.getElementById('cols-in').value);
  const inputs = document.querySelectorAll('#matrix-grid input');
  const data = [];

  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(parseFloat(inputs[i * cols + j].value) || 0);
    }
    data.push(row);
  }

  const { steps, final } = solveGaussJordan(data);
  const analysis = analyzeSolution(final);
  const inverse = (rows === cols) ? calculateInverse(data) : null;

  document.getElementById('res-classification').textContent = analysis.msg;
  const solDiv = document.getElementById('res-solution');
  solDiv.innerHTML = '';
  if (analysis.status === 'UNICA') {
    analysis.x.forEach((v, i) => {
      solDiv.innerHTML += `<div class="solution-line">x<sub>${i+1}</sub> = ${fmt(v)}</div>`;
    });
  } else {
    solDiv.innerHTML = `<p class="hint">${analysis.status === 'INFINITAS' ? 'Infinitas Soluciones' : 'Sin Solución'}</p>`;
  }

  const stepsDiv = document.getElementById('res-steps');
  stepsDiv.innerHTML = '';
  steps.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'step';
    div.innerHTML = `<div class="step__label">Paso ${i+1}: ${s.label}</div>`;
    div.appendChild(renderGrid(s.snapshot));
    stepsDiv.appendChild(div);
  });

  const invDiv = document.getElementById('res-inverse-content');
  invDiv.innerHTML = '';
  if (inverse) {
    invDiv.appendChild(renderGrid(inverse));
    invDiv.innerHTML += `<p class="hint" style="margin-top:10px">Matriz inversa calculada.</p>`;
  } else {
    invDiv.innerHTML = `<p class="hint">La matriz no posee inversa o no es cuadrada.</p>`;
  }

  document.getElementById('results-dashboard').hidden = false;
  document.getElementById('results-dashboard').scrollIntoView({ behavior: 'smooth' });
});

document.querySelectorAll('[data-vec-op]').forEach(btn => {
  btn.addEventListener('click', () => handleVectorOp(btn.dataset.vecOp));
});

document.querySelectorAll('[data-conv]').forEach(btn => {
  btn.addEventListener('click', () => handleConversion(btn.dataset.conv));
});

function renderGrid(data) {
  const wrapper = document.createElement('div');
  wrapper.className = 'grid-display';
  const grid = document.createElement('div');
  grid.className = 'grid-display__matrix';
  grid.style.gridTemplateColumns = `repeat(${data[0].length}, auto)`;
  data.forEach((row, i) => {
    row.forEach((val, j) => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.textContent = fmt(val);
      grid.appendChild(cell);
    });
  });
  wrapper.appendChild(grid);
  return wrapper;
}

window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth) * 100;
  const y = (e.clientY / window.innerHeight) * 100;
  document.body.style.setProperty('--mouse-x', `${x}%`);
  document.body.style.setProperty('--mouse-y', `${y}%`);
});
