const fmtCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

let monthNames = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let months = {}; 
let selectedBonusIdx = null;

// Estructura: months["2025-06"] = { bonuses:[ { name, amount, date, description, expenses:[{...}], id } ] }

function monthKey(m, y) {
  return `${y}-${(m+1).toString().padStart(2,"0")}`;
}
function getMonthObj() {
  const key = monthKey(currentMonth, currentYear);
  if (!months[key]) months[key] = { bonuses: [] };
  return months[key];
}

// ---------- selector de mes ----------
const monthSelect = document.getElementById("month-select");
for (let y = currentYear-1; y <= currentYear+5; y++) {
  for (let m=0; m<12; m++) {
    const opt = document.createElement("option");
    opt.value = monthKey(m,y);
    opt.text = `${monthNames[m]} ${y}`;
    monthSelect.appendChild(opt);
  }
}
monthSelect.value = monthKey(currentMonth,currentYear);
monthSelect.onchange = () => {
  const [y,m] = monthSelect.value.split("-");
  currentYear = Number(y);
  currentMonth = Number(m)-1;
  render();
};

// ---------- guardar mes ----------
document.getElementById("save-month").onclick = () => {
  saveToStorage();
  alert("Mes guardado (primas y gastos).");
};

// ---------- gestión de primas ----------
const bonusDlg = document.getElementById("bonusDialog");
const bonusForm = document.getElementById("bonusForm");
let editBonusIdx = null;

document.getElementById("add-bonus").onclick = () => openBonusDialog();

function openBonusDialog(bonus=null, idx=null) {
  editBonusIdx = idx;
  bonusForm.reset();
  if (bonus) {
    document.getElementById("bonusName").value = bonus.name;
    document.getElementById("bonusAmount").value = bonus.amount;
    document.getElementById("bonusDate").value = bonus.date || "";
    document.getElementById("bonusDescription").value = bonus.description || "";
  }
  bonusDlg.showModal();
}

bonusForm.onsubmit = (e) => {
  e.preventDefault();
  if (!bonusForm.reportValidity()) return;
  const name = document.getElementById("bonusName").value.trim();
  const amount = Number(document.getElementById("bonusAmount").value);
  const date = document.getElementById("bonusDate").value;
  const description = document.getElementById("bonusDescription").value.trim();
  const obj = getMonthObj();
  const nuevo = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now()+Math.random(),
    name, amount, date, description,
    expenses: []  // gastos de esta prima
  };
  if (editBonusIdx != null) obj.bonuses[editBonusIdx] = { ...obj.bonuses[editBonusIdx], ...nuevo, expenses: obj.bonuses[editBonusIdx].expenses };
  else obj.bonuses.push(nuevo);
  editBonusIdx = null;
  bonusDlg.close("saved");
  render();
};

document.getElementById("btnBonusCancel").onclick = () => bonusDlg.close("canceled");
bonusDlg.addEventListener("click", ev => {
  const r = bonusDlg.getBoundingClientRect();
  if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) {
    bonusDlg.close("canceled");
  }
});

// ---------- gastos dentro de una prima ----------
const expenseDlg = document.getElementById("expenseDialog");
const expenseForm = document.getElementById("expenseForm");
let currentBonusIdx = null;
let editExpenseIdx = null;

function openExpenseDialog(bonusIdx, expense=null, idx=null) {
  currentBonusIdx = bonusIdx;
  editExpenseIdx = idx;
  expenseForm.reset();
  if (expense) {
    document.getElementById("expName").value = expense.name;
    document.getElementById("expAmount").value = expense.amount;
    document.getElementById("expDate").value = expense.date || "";
    document.getElementById("expDescription").value = expense.description || "";
  }
  expenseDlg.showModal();
}

expenseForm.onsubmit = (e) => {
  e.preventDefault();
  if (!expenseForm.reportValidity()) return;
  const name = document.getElementById("expName").value.trim();
  const amount = Number(document.getElementById("expAmount").value);
  const date = document.getElementById("expDate").value;
  const description = document.getElementById("expDescription").value.trim();
  const obj = getMonthObj();
  const bonus = obj.bonuses[currentBonusIdx];
  const nuevo = { name, amount, date, description };
  if (editExpenseIdx != null) bonus.expenses[editExpenseIdx] = nuevo;
  else bonus.expenses.push(nuevo);
  editExpenseIdx = null;
  expenseDlg.close("saved");
  document.getElementById("add-expense").onclick = () => {
  if (selectedBonusIdx === null) return;
  openExpenseDialog(selectedBonusIdx);
};

  function render() {
  renderBonuses();          // pinta tabla de primas
  renderSelectedBonusExpenses(); // pinta gastos de la prima seleccionada
  renderGraph();            // actualiza gráfico general
}

};

document.getElementById("btnExpCancel").onclick = () => expenseDlg.close("canceled");
expenseDlg.addEventListener("click", ev => {
  const r = expenseDlg.getBoundingClientRect();
  if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) {
    expenseDlg.close("canceled");
  }
});

// ---------- render de primas + gastos ----------
function renderBonuses() {
  const obj = getMonthObj();
  const tbody = document.getElementById("bonus-tbody");
  tbody.innerHTML = "";
  let totalPrimas = 0;

  obj.bonuses.forEach((b, idx) => {
    const totalGastos = b.expenses.reduce((a,e)=>a+e.amount,0);
    const saldo = b.amount - totalGastos;
    totalPrimas += b.amount;

    const tr = document.createElement("tr");
    if (idx === selectedBonusIdx) tr.classList.add("selected-row");
    tr.innerHTML = `
      <td>${b.name}</td>
      <td>${fmtCOP.format(b.amount)}</td>
      <td>${fmtCOP.format(totalGastos)}</td>
      <td>${fmtCOP.format(saldo)}</td>
      <td>
        <button onclick="selectBonus(${idx})">Ver</button>
        <button onclick="editBonus(${idx})">Editar</button>
        <button onclick="deleteBonus(${idx})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("bonus-total").textContent = fmtCOP.format(totalPrimas);

  // si no hay selección pero hay primas, selecciona la primera
  if (obj.bonuses.length > 0 && (selectedBonusIdx === null || selectedBonusIdx >= obj.bonuses.length)) {
    selectedBonusIdx = 0;
  }
  renderSelectedBonusExpenses();
}
window.selectBonus = function(idx) {
  selectedBonusIdx = idx;
  render();
};

function renderSelectedBonusExpenses() {
  const title = document.getElementById("selected-bonus-title");
  const btnAddExp = document.getElementById("add-expense");
  const tbody = document.getElementById("expense-tbody");
  tbody.innerHTML = "";

  const obj = getMonthObj();
  if (selectedBonusIdx === null || !obj.bonuses[selectedBonusIdx]) {
    title.textContent = "Ninguna prima seleccionada";
    btnAddExp.disabled = true;
    return;
  }

  const b = obj.bonuses[selectedBonusIdx];
  title.textContent = `Prima: ${b.name} (${fmtCOP.format(b.amount)})`;
  btnAddExp.disabled = false;

  b.expenses.forEach((e, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.name}</td>
      <td>${fmtCOP.format(e.amount)}</td>
      <td>${e.date || ""}</td>
      <td>${e.description || ""}</td>
      <td>
        <button onclick="editExpense(${selectedBonusIdx},${i})">✏️</button>
        <button onclick="deleteExpense(${selectedBonusIdx},${i})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- gráfico ----------
let summaryChart;
function renderGraph() {
  const obj = getMonthObj();
  const totalPrimas = obj.bonuses.reduce((a,b)=>a+b.amount,0);
  const totalGastos = obj.bonuses.reduce((a,b)=>a + b.expenses.reduce((x,y)=>x+y.amount,0),0);
  const saldo = totalPrimas - totalGastos;

  const ctx = document.getElementById("summaryChart").getContext("2d");
  const data = {
    labels: ["Primas usadas (gastos)", "Saldo disponible"],
    datasets: [{
      data: [totalGastos, Math.max(saldo,0)],
      backgroundColor: ["#e67e22","#16a085"]
    }]
  };
  if (summaryChart) summaryChart.destroy();
  summaryChart = new Chart(ctx, {
    type: "pie",
    data,
    options: { responsive:false }
  });
}

// ---------- localStorage ----------
function saveToStorage() {
  localStorage.setItem("controlPrimasGastos", JSON.stringify(months));
}
function loadFromStorage() {
  const data = localStorage.getItem("controlPrimasGastos");
  if (data) months = JSON.parse(data);
}

// ---------- render global ----------
function render() {
  renderBonuses();
  renderGraph();
}

// inicio
loadFromStorage();
render();

