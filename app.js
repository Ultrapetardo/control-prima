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
let months = {}; // { "2025-06": { baseIncome, bonuses: [] } }

// ------------ Utilidades ------------
function monthKey(month, year) {
  return `${year}-${(month + 1).toString().padStart(2, "0")}`;
}

function getMonthObj() {
  let key = monthKey(currentMonth, currentYear);
  if (!months[key]) {
    months[key] = {
      baseIncome: 0,
      bonuses: [], // { name, amount, date, description }
    };
  }
  return months[key];
}

// ------------ Selector de mes ------------
const monthSelect = document.getElementById("month-select");
for (let y = currentYear - 1; y <= currentYear + 5; y++) {
  for (let m = 0; m < 12; m++) {
    const mk = monthKey(m, y);
    const opt = document.createElement("option");
    opt.value = mk;
    opt.text = `${monthNames[m]} ${y}`;
    monthSelect.appendChild(opt);
  }
}
monthSelect.value = monthKey(currentMonth, currentYear);
monthSelect.onchange = () => {
  let [year, month] = monthSelect.value.split("-");
  currentMonth = Number(month) - 1;
  currentYear = Number(year);
  render();
};

// ------------ Pestañas ------------
document.getElementById("tab-actual").onclick = () => {
  document.getElementById("tab-content-actual").classList.remove("hidden");
  document.getElementById("tab-content-actual").classList.add("visible");
  document.getElementById("tab-content-historial").classList.remove("visible");
  document.getElementById("tab-content-historial").classList.add("hidden");
  document.getElementById("tab-actual").classList.add("active");
  document.getElementById("tab-historial").classList.remove("active");
};
document.getElementById("tab-historial").onclick = () => {
  document.getElementById("tab-content-actual").classList.remove("visible");
  document.getElementById("tab-content-actual").classList.add("hidden");
  document.getElementById("tab-content-historial").classList.remove("hidden");
  document.getElementById("tab-content-historial").classList.add("visible");
  document.getElementById("tab-historial").classList.add("active");
  document.getElementById("tab-actual").classList.remove("active");
};

// ------------ Ingreso base ------------
document.getElementById("save-base-income").onclick = () => {
  let obj = getMonthObj();
  obj.baseIncome = Number(document.getElementById("base-income-input").value) || 0;
  render();
};

// ------------ Primas ------------
document.getElementById("add-bonus").onclick = () => openBonusDialog();

function renderBonuses() {
  let obj = getMonthObj();
  const list = document.getElementById("bonus-list");
  list.innerHTML = "";
  obj.bonuses.forEach((bonus, i) => {
    let fecha = bonus.date ? ` (${bonus.date})` : "";
    let desc = bonus.description ? ` | ${bonus.description}` : "";
    const li = document.createElement("li");
    li.innerHTML = `<span>${bonus.name}: ${fmtCOP.format(bonus.amount)}${fecha}${desc}</span>
      <span class="gasto-actions">
        <button onclick="editBonus(${i})">✏️</button>
        <button onclick="deleteBonus(${i})">🗑️</button>
      </span>`;
    list.appendChild(li);
  });
  const total = obj.bonuses.reduce((a, b) => a + b.amount, 0);
  document.getElementById("bonus-total").textContent = "Total primas: " + fmtCOP.format(total);
  document.getElementById("summary-bonus").textContent = fmtCOP.format(total);
}

window.editBonus = function(idx) {
  let obj = getMonthObj();
  openBonusDialog(obj.bonuses[idx], idx);
};

window.deleteBonus = function(idx) {
  let obj = getMonthObj();
  if (confirm("¿Eliminar esta prima?")) {
    obj.bonuses.splice(idx, 1);
    render();
  }
};

// ------------ Resumen mensual ------------
function renderSummary() {
  let obj = getMonthObj();
  const totalBonuses = obj.bonuses.reduce((a, b) => a + b.amount, 0);
  const total = obj.baseIncome + totalBonuses;
  document.getElementById("base-income-input").value = obj.baseIncome || "";
  document.getElementById("base-income-display").textContent =
    obj.baseIncome ? fmtCOP.format(obj.baseIncome) : "";
  document.getElementById("summary-bonus").textContent = fmtCOP.format(totalBonuses);
  document.getElementById("summary-total").textContent = fmtCOP.format(total);
}

// ------------ Historial ------------
function renderHistoryTable() {
  const tbody = document.querySelector("#history-table tbody");
  tbody.innerHTML = "";
  Object.keys(months)
    .sort()
    .forEach((k) => {
      const mObj = months[k];
      const [year, monthRaw] = k.split("-");
      const month = Number(monthRaw) - 1;
      const totalBonuses = mObj.bonuses.reduce((a, b) => a + b.amount, 0);
      const total = mObj.baseIncome + totalBonuses;

      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${monthNames[month]} ${year}</td>
        <td>${fmtCOP.format(mObj.baseIncome)}</td>
        <td>${fmtCOP.format(totalBonuses)}</td>
        <td>${fmtCOP.format(total)}</td>`;
      tbody.appendChild(tr);
    });
}

// ------------ Gráfico ------------
let summaryChart;
function renderGraph() {
  let obj = getMonthObj();
  const ctx = document.getElementById("summaryChart").getContext("2d");
  const totalBonuses = obj.bonuses.reduce((a, b) => a + b.amount, 0);
  const base = obj.baseIncome;
  const total = base + totalBonuses;

  const data = {
    labels: ["Ingreso base", "Primas"],
    datasets: [
      {
        data: [base, totalBonuses],
        backgroundColor: ["#3498db", "#9b59b6"],
      },
    ],
  };
  if (summaryChart) summaryChart.destroy();
  summaryChart = new Chart(ctx, {
    type: "pie",
    data: data,
    options: { responsive: false },
  });
}

// ------------ Modal primas ------------
const bonusDlg = document.getElementById("bonusDialog");
const bonusForm = document.getElementById("bonusForm");
let editBonusIdx = null;

function openBonusDialog(bonus = null, idx = null) {
  editBonusIdx = idx;
  bonusForm.reset();
  if (bonus) {
    document.getElementById("bonusName").value = bonus.name || "";
    document.getElementById("bonusAmount").value = bonus.amount || "";
    document.getElementById("bonusDate").value = bonus.date || "";
    document.getElementById("bonusDescription").value = bonus.description || "";
  }
  bonusDlg.showModal();
  document.getElementById("bonusName").focus();
}

bonusForm.onsubmit = function (e) {
  e.preventDefault();
  if (!bonusForm.reportValidity()) return;
  const name = document.getElementById("bonusName").value.trim();
  const amount = Number(document.getElementById("bonusAmount").value);
  const date = document.getElementById("bonusDate").value;
  const description = document.getElementById("bonusDescription").value.trim();
  let obj = getMonthObj();
  const nuevo = { name, amount, date, description };
  if (editBonusIdx != null) obj.bonuses[editBonusIdx] = nuevo;
  else obj.bonuses.push(nuevo);
  bonusDlg.close("saved");
  render();
  editBonusIdx = null;
};

document.getElementById("btnBonusCancel").onclick = function () {
  bonusDlg.close("canceled");
};
bonusDlg.addEventListener("close", function () {
  if (bonusDlg.returnValue !== "saved") bonusForm.reset();
});
bonusDlg.addEventListener("click", function (ev) {
  const r = bonusDlg.getBoundingClientRect();
  const inside =
    ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
  if (!inside) bonusDlg.close("canceled");
});

// ------------ LocalStorage ------------
function saveToStorage() {
  localStorage.setItem("controlPrimasHistorial", JSON.stringify(months));
}
function loadFromStorage() {
  const data = localStorage.getItem("controlPrimasHistorial");
  if (data) months = JSON.parse(data);
}

// Botón Guardar Mes
document.getElementById("save-month").onclick = () => {
  saveToStorage();
  render();
  alert("¡Mes de primas guardado! El historial permanece aunque cierres la app.");
};

// ------------ CSV ------------
document.getElementById("download-csv").onclick = () => {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Mes,Ingreso base,Total primas,Ingreso total\n";
  Object.keys(months)
    .sort()
    .forEach((k) => {
      const mObj = months[k];
      const totalBonuses = mObj.bonuses.reduce((a, b) => a + b.amount, 0);
      const total = mObj.baseIncome + totalBonuses;
      csvContent += `${k},${mObj.baseIncome},${totalBonuses},${total}\n`;
    });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "historial_primas.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ------------ Render global ------------
function render() {
  renderSummary();
  renderBonuses();
  renderHistoryTable();
  renderGraph();
}

// Inicio
loadFromStorage();
render();
