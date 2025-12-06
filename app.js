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
  selectedBonusIdx = null;
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
  document.getElementById("bonusName").focus();
}

bonusForm.onsubmit = (e) => {
  e.preventDefault();
  if (!bonusForm.reportValidity()) return;
  const name = document.getElementById("bonusName").value.trim();
  const amount = Number(document.getElementById("bonusAmount").value);
  const date = document.getElementById("bonusDate").value;
  const description = document.getElementById("bonusDescription").value.trim();
  const obj = getMonthObj();
  
  if (editBonusIdx != null) {
    // editando prima existente, preservar gastos
    obj.bonuses[editBonusIdx].name = name;
    obj.bonuses[editBonusIdx].amount = amount;
    obj.bonuses[editBonusIdx].date = date;
    obj.bonuses[editBonusIdx].description = description;
  } else {
    // nueva prima
    const nuevo = {
      id: Date.now() + Math.random(),
      name, amount, date, description,
      expenses: []
    };
    obj.bonuses.push(nuevo);
  }
  
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

// ---------- editar y eliminar prima ----------
window.editBonus = function(idx) {
  const obj = getMonthObj();
  openBonusDialog(obj.bonuses[idx], idx);
};

window.deleteBonus = function(idx) {
  const obj = getMonthObj();
  if (confirm("¿Eliminar esta prima y todos sus gastos?")) {
    obj.bonuses.splice(idx,1);
    if (selectedBonusIdx === idx) selectedBonusIdx = null;
    render();
  }
};

window.selectBonus = function(idx) {
  selectedBonusIdx = idx;
  render();
};

// ---------- render de primas en tabla ----------
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

  // auto-seleccionar primera prima si no hay selección
  if (obj.bonuses.length > 0 && (selectedBonusIdx === null || selectedBonusIdx >= obj.bonuses.length)) {
    selectedBonusIdx = 0;
  }
  if (obj.bonuses.length === 0) {
    selectedBonusIdx = null;
  }
}

// ---------- render gastos de prima seleccionada ----------
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
  const totalGastos = b.expenses.reduce((a,e)=>a+e.amount,0);
  const saldo = b.amount - totalGastos;
  
  title.innerHTML = `Prima: <strong>${b.name}</strong> - Valor: ${fmtCOP.format(b.amount)} | Gastos: ${fmtCOP.format(totalGastos)} | <span style="color: ${saldo >= 0 ? '#16a085' : '#e74c3c'}">Saldo: ${fmtCOP.format(saldo)}</span>`;
  btnAddExp.disabled = false;

  b.expenses.forEach((e, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.name}</td>
      <td>${fmtCOP.format(e.amount)}</td>
      <td>${e.date || ""}</td>
      <td>${e.description || ""}</td>
      <td>
        <button onclick="editExpense(${i})">✏️</button>
        <button onclick="deleteExpense(${i})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- gastos dentro de una prima ----------
const expenseDlg = document.getElementById("expenseDialog");
const expenseForm = document.getElementById("expenseForm");
let editExpenseIdx = null;

document.getElementById("add-expense").onclick = () => {
  if (selectedBonusIdx === null) return;
  openExpenseDialog();
};

function openExpenseDialog(expense=null, idx=null) {
  editExpenseIdx = idx;
  expenseForm.reset();
  if (expense) {
    document.getElementById("expName").value = expense.name;
    document.getElementById("expAmount").value = expense.amount;
    document.getElementById("expDate").value = expense.date || "";
    document.getElementById("expDescription").value = expense.description || "";
  }
  expenseDlg.showModal();
  document.getElementById("expName").focus();
}

expenseForm.onsubmit = (e) => {
  e.preventDefault();
  if (!expenseForm.reportValidity()) return;
  const name = document.getElementById("expName").value.trim();
  const amount = Number(document.getElementById("expAmount").value);
  const date = document.getElementById("expDate").value;
  const description = document.getElementById("expDescription").value.trim();
  
  const obj = getMonthObj();
  const bonus = obj.bonuses[selectedBonusIdx];
  const nuevo = { name, amount, date, description };
  
  if (editExpenseIdx != null) {
    bonus.expenses[editExpenseIdx] = nuevo;
  } else {
    bonus.expenses.push(nuevo);
  }
  
  editExpenseIdx = null;
  expenseDlg.close("saved");
  render();
};

document.getElementById("btnExpCancel").onclick = () => expenseDlg.close("canceled");

expenseDlg.addEventListener("click", ev => {
  const r = expenseDlg.getBoundingClientRect();
  if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) {
    expenseDlg.close("canceled");
  }
});

window.editExpense = function(idx) {
  const obj = getMonthObj();
  const bonus = obj.bonuses[selectedBonusIdx];
  openExpenseDialog(bonus.expenses[idx], idx);
};

window.deleteExpense = function(idx) {
  const obj = getMonthObj();
  if (confirm("¿Eliminar este gasto de la prima?")) {
    obj.bonuses[selectedBonusIdx].expenses.splice(idx,1);
    render();
  }
};

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
  renderSelectedBonusExpenses();
  renderGraph();
}

// inicio
loadFromStorage();
render();
