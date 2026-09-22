/* ============================================================
   ULTIMATE MATRIX ANALYZER ENGINE (PURE JS VERSION)
   ============================================================ */

// --- VIEW NAVIGATION ---
function switchView(viewId) {
  document.querySelectorAll('.view-container').forEach(v => v.classList.add('view-hidden'));
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('view-hidden');
  }
}

const EPS = 1e-9;

function isZero(n) { return Math.abs(n) < EPS; }
function isClose(a, b) { return Math.abs(a - b) < EPS; }

function fmt(n) {
  let v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? "0" : String(v);
}

function cloneMatrix(m) { return m.map(row => row.slice()); }

// --- MATRIX HELPERS ---
function getMatrixData(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return null;

  const rows = parseInt(document.getElementById(gridId === 'matrix-grid-a' ? 'rows-a' : 'rows-b').value);
  const cols = parseInt(document.getElementById(gridId === 'matrix-grid-a' ? 'cols-a' : 'cols-b').value);
  const inputs = grid.querySelectorAll('input');

  const data = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(parseFloat(inputs[i * cols + j].value) || 0);
    }
    data.push(row);
  }
  return data;
}

function showOperationResult(matrix, title) {
  const dashboard = document.getElementById('results-dashboard');
  const opCard = document.getElementById('res-op-result-card');
  const opTitle = document.getElementById('res-op-title');
  const opContent = document.getElementById('res-op-content');

  dashboard.hidden = false;
  opCard.hidden = false;
  opTitle.textContent = title;
  opContent.innerHTML = '';
  opContent.appendChild(renderGrid(matrix));

  // Hide the analysis sections when showing a simple operation result
  const analysisCard = document.querySelector('.result-card.highlight:not(#res-op-result-card)');
  if (analysisCard) analysisCard.style.display = 'none';
  const resultsGrid = document.querySelector('.results-grid');
  if (resultsGrid) resultsGrid.style.display = 'none';

  dashboard.scrollIntoView({ behavior: 'smooth' });
}

function resetDashboard() {
  const opCard = document.getElementById('res-op-result-card');
  if (opCard) opCard.hidden = true;
  const analysisCard = document.querySelector('.result-card.highlight:not(#res-op-result-card)');
  if (analysisCard) analysisCard.style.display = 'block';
  const resultsGrid = document.querySelector('.results-grid');
  if (resultsGrid) resultsGrid.style.display = 'grid';
}

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

// --- MATRIX MATH ---
function addMatrices(A, B) {
  if (A.length !== B.length || A[0].length !== B[0].length) return null;
  return A.map((row, i) => row.map((val, j) => val + B[i][j]));
}

function subtractMatrices(A, B) {
  if (A.length !== B.length || A[0].length !== B[0].length) return null;
  return A.map((row, i) => row.map((val, j) => val - B[i][j]));
}

function multiplyMatrices(A, B) {
  if (A[0].length !== B.length) return null;
  const result = Array.from({ length: A.length }, () => new Array(B[0].length).fill(0));
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B[0].length; j++) {
      for (let k = 0; k < A[0].length; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

function scalarMultiplyMatrix(M, k) {
  return M.map(row => row.map(val => val * k));
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
    const k = 2;
    result = u.map(x => x * k);
  }

  if (result) {
    resVal.textContent = `[${result.map(fmt).join(', ')}]`;
    resDiv.hidden = false;
  }
}

function checkLinearCombination() {
  const bStr = document.getElementById('vec-b').value;
  const setStr = document.getElementById('vec-set').value;
  const resDiv = document.getElementById('vec-result');
  const resVal = resDiv.querySelector('.res-val');

  const parse = s => s.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
  const b = parse(bStr);
  const vSet = setStr.trim().split('\\n').map(line => parse(line)).filter(v => v.length > 0);

  if (!b || vSet.length === 0) { alert('Ingresa el vector b y el conjunto de vectores'); return; }

  // Check that all vectors have the same dimension
  const n = b.length;
  if (vSet.some(v => v.length !== n)) {
    alert('Todos los vectores deben tener la misma dimensión que el vector b');
    return;
  }

  // Build Augmented Matrix [V | b]
  // V is matrix where columns are v1, v2... vk
  const rows = n;
  const cols = vSet.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < vSet.length; j++) {
      matrix[i][j] = vSet[j][i];
    }
    matrix[i][cols - 1] = b[i];
  }

  const { final } = solveGaussJordan(matrix);
  const analysis = analyzeSolution(final);

  if (analysis.status === 'SIN_SOLUCION') {
    resVal.textContent = 'No es una combinación lineal (Sistema Inconsistente)';
  } else if (analysis.status === 'UNICA') {
    resVal.textContent = `Sí es una combinación lineal. Coeficientes: [${analysis.x.map(fmt).join(', ')}]`;
  } else {
    resVal.textContent = 'Sí es una combinación lineal (Existen infinitas formas)';
  }
  resDiv.hidden = false;
}

// --- 3. NUMERICAL CONVERSION ---
function handleConversion(type) {
  const input = document.getElementById('conv-in').value.trim();
  const resDiv = document.getElementById('conv-result');
  const resVal = resDiv.querySelector('.res-val');

  if (!input) { alert('Ingresa un número'); return; }

  try {
    let resultText = '';
    let procedure = '';

    if (type.startsWith('dec-')) {
      const dec = parseInt(input);
      if (isNaN(dec)) throw new Error('Número decimal inválido');

      const base = type === 'dec-bin' ? 2 : (type === 'dec-oct' ? 8 : 16);
      const baseName = type === 'dec-bin' ? 'Binario' : (type === 'dec-oct' ? 'Octal' : 'Hexadecimal');
      const hexChars = "0123456789ABCDEF";

      let num = dec;
      let residues = [];
      let stepsHtml = '<table class="procedure-table"><thead><tr><th>Paso</th><th>División</th><th>Cociente</th><th>Residuo</th></tr></thead><tbody>';

      if (num === 0) residues.push(0);
      while (num > 0) {
        const r = num % base;
        const q = Math.floor(num / base);
        stepsHtml += `<tr><td>${residues.length + 1}</td><td>${num} ÷ ${base}</td><td>${q}</td><td class="residue-highlight">${hexChars[r]}</td></tr>`;
        residues.push(hexChars[r]);
        num = q;
      }
      stepsHtml += '</tbody></table>';
      const finalRes = residues.reverse().join('');
      resultText = `Resultado: ${finalRes} (${baseName})`;
      procedure = `${stepsHtml}<p style="text-align:right; font-size:0.8rem; color:var(--text-secondary)">↑ Leer residuos en orden inverso</p>`;

    } else {
      const base = type === 'bin-dec' ? 2 : (type === 'oct-dec' ? 8 : 16);
      const baseName = type === 'bin-dec' ? 'Binario' : (type === 'oct-dec' ? 'Octal' : 'Hexadecimal');

      let decimal = 0;
      let combinations = [];

      const validChars = { 2: /^[01]+$/, 8: /^[0-7]+$/, 16: /^[0-9a-fA-F]+$/ };
      if (!validChars[base].test(input)) {
        throw new Error(`Carácter no válido para base ${baseName}`);
      }

      for (let i = 0; i < input.length; i++) {
        const char = input[input.length - 1 - i].toUpperCase();
        const val = parseInt(char, base);
        const term = val * Math.pow(base, i);
        decimal += term;
        combinations.push(`(<span class="comb-pill">${char} × ${base}^${i}</span>) = ${term}`);
      }

      resultText = `Resultado: ${decimal} (Decimal)`;
      procedure = `<div class="procedure-list">${combinations.reverse().join('<br>')}</div><div style="margin-top:10px; border-top: 1px solid var(--neon-purple); padding-top:10px; font-weight:bold; color:var(--neon-cyan)">Suma Total = ${decimal}</div>`;
    }

    resVal.innerHTML = `<strong>${resultText}</strong><br><br>${procedure}`;
    resDiv.hidden = false;
  } catch (e) {
    alert(e.message);
  }
}

// --- UI INTEGRATION ---
function generateMatrix(id) {
  const rows = parseInt(document.getElementById(id === 'a' ? 'rows-a' : 'rows-b').value);
  const cols = parseInt(document.getElementById(id === 'a' ? 'cols-a' : 'cols-b').value);
  const grid = document.getElementById(id === 'a' ? 'matrix-grid-a' : 'matrix-grid-b');
  const wrap = document.getElementById(id === 'a' ? 'matrix-wrap-a' : 'matrix-wrap-b');

  if (!grid || !wrap) return;

  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;

  for (let i = 0; i < rows * cols; i++) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = 0;
    grid.appendChild(input);
  }
  wrap.hidden = false;
}

document.getElementById('btn-gen-a').addEventListener('click', () => generateMatrix('a'));
document.getElementById('btn-gen-b').addEventListener('click', () => generateMatrix('b'));

document.getElementById('btn-analyze').addEventListener('click', () => {
  resetDashboard();
  const data = getMatrixData('matrix-grid-a');
  if (!data) { alert('Primero genera la Matriz A'); return; }

  const { steps, final } = solveGaussJordan(data);
  const analysis = analyzeSolution(final);
  const inverse = (data.length === data[0].length) ? calculateInverse(data) : null;

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
    div.innerHTML = `<div class="step__label">Paso ${i+1}: ${s.label}</div> `;
    div.appendChild(renderGrid(s.snapshot));
    stepsDiv.appendChild(div);
  });

  const invDiv = document.getElementById('res-inverse-content');
  invDiv.innerHTML = '';
  if (inverse) {
    invDiv.appendChild(renderGrid(inverse));
    invDiv.innerHTML += `<p class="hint" style="margin-top:10px">Matriz inversa calculada exitosamente.</p>`;
  } else {
    invDiv.innerHTML = `<p class="hint">La matriz no posee inversa o no es cuadrada.</p>`;
  }

  document.getElementById('results-dashboard').hidden = false;
  document.getElementById('results-dashboard').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-add').addEventListener('click', () => {
  const A = getMatrixData('matrix-grid-a');
  const B = getMatrixData('matrix-grid-b');
  if (!A || !B) { alert('Genera ambas matrices primero'); return; }

  const res = addMatrices(A, B);
  if (!res) { alert('Error: Las matrices deben tener las mismas dimensiones para sumar.'); return; }
  showOperationResult(res, 'Resultado de Suma (A + B)');
});

document.getElementById('btn-sub').addEventListener('click', () => {
  const A = getMatrixData('matrix-grid-a');
  const B = getMatrixData('matrix-grid-b');
  if (!A || !B) { alert('Genera ambas matrices primero'); return; }

  const res = subtractMatrices(A, B);
  if (!res) { alert('Error: Las matrices deben tener las mismas dimensiones para restar.'); return; }
  showOperationResult(res, 'Resultado de Resta (A - B)');
});

document.getElementById('btn-mul').addEventListener('click', () => {
  const A = getMatrixData('matrix-grid-a');
  const B = getMatrixData('matrix-grid-b');
  if (!A || !B) { alert('Genera ambas matrices primero'); return; }

  const res = multiplyMatrices(A, B);
  if (!res) { alert('Error: Las columnas de A deben coincidir con las filas de B.'); return; }
  showOperationResult(res, 'Resultado de Multiplicación (A * B)');
});

document.getElementById('btn-check-comb').addEventListener('click', checkLinearCombination);

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

document.getElementById('btn-scalar').addEventListener('click', () => {
  const A = getMatrixData('matrix-grid-a');
  if (!A) { alert('Primero genera la Matriz A'); return; }

  const k = parseFloat(document.getElementById('matrix-scalar').value);
  if (isNaN(k)) { alert('Ingresa un valor válido para k'); return; }

  const res = scalarMultiplyMatrix(A, k);
  showOperationResult(res, `Resultado de Multiplicación Escalar (${k} * A)`);
});

document.querySelectorAll('[data-conv]').forEach(btn => {
  btn.addEventListener('click', () => handleConversion(btn.dataset.conv));
});

window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth) * 100;
  const y = (e.clientY / window.innerHeight) * 100;
  document.body.style.setProperty('--mouse-x', `${x}%`);
  document.body.style.setProperty('--mouse-y', `${y}%`);
});
