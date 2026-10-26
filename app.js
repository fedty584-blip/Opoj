let students = JSON.parse(localStorage.getItem('cleaning_students')) || INITIAL_STUDENTS;
let attendanceData = JSON.parse(localStorage.getItem('cleaning_attendance')) || {};
let customHolidays = JSON.parse(localStorage.getItem('cleaning_holidays')) || DEFAULT_HOLIDAYS;
let isAdminLoggedIn = false;
let currentChart = null;
let currentViewMode = 'daily';

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  const dateInput = document.getElementById('currentDate');
  if (dateInput) {
    dateInput.value = todayStr;
  }
  
  initYearSelect();
  renderDailyView();
  if (window.lucide) lucide.createIcons();
});

function checkIsHoliday(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const isWeekend = (day === 0 || day === 6);
  const holidayName = customHolidays[dateStr] || null;
  return { isHoliday: isWeekend || !!holidayName, isWeekend, holidayName };
}

function switchView(mode) {
  currentViewMode = mode;
  document.getElementById('dailyView').classList.toggle('hidden', mode !== 'daily');
  document.getElementById('monthlyView').classList.toggle('hidden', mode !== 'monthly');
  document.getElementById('tabDaily').className = mode === 'daily' ? "px-4 py-2 text-sm font-medium rounded-lg bg-white shadow-sm text-slate-900 transition flex items-center space-x-2" : "px-4 py-2 text-sm font-medium rounded-lg text-slate-600 transition flex items-center space-x-2";
  document.getElementById('tabMonthly').className = mode === 'monthly' ? "px-4 py-2 text-sm font-medium rounded-lg bg-white shadow-sm text-slate-900 transition flex items-center space-x-2" : "px-4 py-2 text-sm font-medium rounded-lg text-slate-600 transition flex items-center space-x-2";
  document.getElementById('datePickerContainer').classList.toggle('hidden', mode !== 'daily');
  document.getElementById('monthPickerContainer').classList.toggle('hidden', mode !== 'monthly');
  document.getElementById('dailyActions').classList.toggle('hidden', mode !== 'daily');
  if (mode === 'monthly') renderMonthlyView();
}

function initYearSelect() {
  const yearSelect = document.getElementById('selectYear');
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `พ.ศ. ${y + 543}`;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  document.getElementById('selectMonth').value = new Date().getMonth();
}

function renderDailyView() {
  const dateInput = document.getElementById('currentDate');
  let selectedDate = dateInput ? dateInput.value : '';
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (!selectedDate) {
    selectedDate = todayStr;
    if (dateInput) dateInput.value = todayStr;
  }

  const isPastOrFuture = (selectedDate !== todayStr);
  const canEdit = !isPastOrFuture || isAdminLoggedIn;

  const displayDateEl = document.getElementById('displaySelectedDate');
  if (displayDateEl) displayDateEl.textContent = formatDateThai(selectedDate);
  
  const editNotice = document.getElementById('editModeNotice');
  if (editNotice) editNotice.classList.toggle('hidden', canEdit);

  const holidayInfo = checkIsHoliday(selectedDate);
  const banner = document.getElementById('holidayBanner');
  if (banner) {
    if (holidayInfo.isHoliday) {
      banner.classList.remove('hidden');
      const holidayTitle = document.getElementById('holidayTitle');
      if (holidayTitle) {
        holidayTitle.textContent = holidayInfo.isWeekend ? "วันหยุดเสาร์ - อาทิตย์" : `วันหยุดราชการ: ${holidayInfo.holidayName}`;
      }
    } else {
      banner.classList.add('hidden');
    }
  }

  const dayData = attendanceData[selectedDate] || {};
  const tbody = document.getElementById('attendanceTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  students.forEach((student, index) => {
    const record = dayData[student.id] || { checked: false, note: '' };
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition";
    tr.innerHTML = `
      <td class="py-3.5 px-4 text-center text-slate-500 font-medium">${index + 1}</td>
      <td class="py-3.5 px-4 text-slate-600 font-mono text-xs">${student.id}</td>
      <td class="py-3.5 px-4 font-medium text-slate-800">${student.name}</td>
      <td class="py-3.5 px-4 text-center">
        <input type="checkbox" ${record.checked ? 'checked' : ''} ${!canEdit ? 'disabled title="ต้องเข้าสู่ระบบแอดมิน gun เพื่อแก้ไขย้อนหลัง"' : ''} 
               onchange="toggleCheck('${student.id}')" class="w-5 h-5 text-emerald-600 rounded cursor-pointer">
      </td>
      <td class="py-3.5 px-4">
        <input type="text" value="${record.note || ''}" ${!canEdit ? 'disabled' : ''} placeholder="ระบุโซนทำความสะอาด..." 
               onchange="updateNote('${student.id}', this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleCheck(studentId) {
  const dateInput = document.getElementById('currentDate');
  const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
  if (!attendanceData[selectedDate]) attendanceData[selectedDate] = {};
  if (!attendanceData[selectedDate][studentId]) attendanceData[selectedDate][studentId] = { checked: true, note: '' };
  else attendanceData[selectedDate][studentId].checked = !attendanceData[selectedDate][studentId].checked;
  saveAttendance();
  renderDailyView();
}

function updateNote(studentId, noteText) {
  const dateInput = document.getElementById('currentDate');
  const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
  if (!attendanceData[selectedDate]) attendanceData[selectedDate] = {};
  if (!attendanceData[selectedDate][studentId]) attendanceData[selectedDate][studentId] = { checked: false, note: noteText };
  else attendanceData[selectedDate][studentId].note = noteText;
  saveAttendance();
}

function markAll(status) {
  const dateInput = document.getElementById('currentDate');
  const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (selectedDate !== todayStr && !isAdminLoggedIn) {
    alert('กรุณาเข้าสู่ระบบแอดมิน gun ก่อนแก้ไขข้อมูลย้อนหลัง');
    return;
  }
  if (!attendanceData[selectedDate]) attendanceData[selectedDate] = {};
  students.forEach(s => {
    const note = attendanceData[selectedDate][s.id]?.note || '';
    attendanceData[selectedDate][s.id] = { checked: status, note };
  });
  saveAttendance();
  renderDailyView();
}

function onDateChange() { renderDailyView(); }
function saveAttendance() { localStorage.setItem('cleaning_attendance', JSON.stringify(attendanceData)); }

function renderMonthlyView() {
  const month = parseInt(document.getElementById('selectMonth').value);
  const year = parseInt(document.getElementById('selectYear').value);
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  document.getElementById('monthlyTitleText').textContent = `${monthNames[month]} พ.ศ. ${year + 543}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDaysCount = 0;
  const workingDateStrings = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!checkIsHoliday(dateStr).isHoliday) {
      workingDaysCount++;
      workingDateStrings.push(dateStr);
    }
  }
  document.getElementById('monthlyWorkingDays').textContent = `${workingDaysCount} วัน`;

  const tbody = document.getElementById('monthlyTableBody');
  tbody.innerHTML = '';
  let grandTotalChecked = 0;
  const maxPossible = students.length * workingDaysCount;

  students.forEach((student, index) => {
    let studentCheckedDays = 0;
    workingDateStrings.forEach(dateStr => {
      if (attendanceData[dateStr] && attendanceData[dateStr][student.id]?.checked) studentCheckedDays++;
    });
    grandTotalChecked += studentCheckedDays;
    const pct = workingDaysCount > 0 ? Math.round((studentCheckedDays / workingDaysCount) * 100) : 0;
    let badge = pct >= 80 ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">ดีเยี่ยม</span>' : pct >= 50 ? '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">ปานกลาง</span>' : '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">ต้องปรับปรุง</span>';

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition";
    tr.innerHTML = `<td class="py-3 px-4 text-center text-slate-500">${index + 1}</td><td class="py-3 px-4 text-xs font-mono">${student.id}</td><td class="py-3 px-4 font-medium">${student.name}</td><td class="py-3 px-4 text-center font-semibold text-emerald-600">${studentCheckedDays}</td><td class="py-3 px-4 text-center text-slate-500">${workingDaysCount}</td><td class="py-3 px-4 text-center font-bold">${pct}%</td><td class="py-3 px-4 text-center">${badge}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('monthlyTotalChecked').textContent = `${grandTotalChecked} ครั้ง`;
  const avg = maxPossible > 0 ? Math.round((grandTotalChecked / maxPossible) * 100) : 0;
  document.getElementById('monthlyAvgPercent').textContent = `${avg}%`;
  renderMonthlyChart(grandTotalChecked, maxPossible - grandTotalChecked);
}

function renderMonthlyChart(done, pending) {
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (currentChart) currentChart.destroy();
  currentChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['ทำเวรแล้ว', 'ยังไม่ได้ทำ'], datasets: [{ data: [done, pending < 0 ? 0 : pending], backgroundColor: ['#22c55e', '#f1f5f9'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '75%' }
  });
}

function toggleAdminModal() {
  document.getElementById('adminModal').classList.toggle('hidden');
  if (isAdminLoggedIn) {
    renderAdminStudents();
    renderAdminHolidays();
  }
}

function loginAdmin() {
  const u = document.getElementById('adminUser').value;
  const p = document.getElementById('adminPass').value;
  if (u === 'gun' && p === '11111111') {
    isAdminLoggedIn = true;
    document.getElementById('adminLoginForm').classList.add('hidden');
    document.getElementById('adminPanelContent').classList.remove('hidden');
    document.getElementById('adminBtnText').textContent = 'ผู้ดูแลระบบ (gun)';
    document.getElementById('loginError').classList.add('hidden');
    renderAdminStudents();
    renderAdminHolidays();
    renderDailyView();
  } else {
    document.getElementById('loginError').classList.remove('hidden');
  }
}

function logoutAdmin() {
  isAdminLoggedIn = false;
  document.getElementById('adminLoginForm').classList.remove('hidden');
  document.getElementById('adminPanelContent').classList.add('hidden');
  document.getElementById('adminBtnText').textContent = 'ไอที แอดมิน (gun)';
  document.getElementById('adminUser').value = '';
  document.getElementById('adminPass').value = '';
  renderDailyView();
}

function renderAdminStudents() {
  const list = document.getElementById('adminStudentList');
  list.innerHTML = '';
  students.forEach((s, idx) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-100 border-b border-slate-200/60";
    tr.innerHTML = `
      <td class="p-2 text-center font-mono font-medium text-slate-500">${s.id}</td>
      <td class="p-2">
        <input type="text" id="editName_${s.id}" value="${s.name}" class="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:ring-emerald-500 focus:border-emerald-500">
      </td>
      <td class="p-2 text-center">
        <button onclick="saveStudentName('${s.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-[11px] font-semibold transition">บันทึก</button>
      </td>
    `;
    list.appendChild(tr);
  });
}

function saveStudentName(id) {
  const input = document.getElementById(`editName_${id}`);
  if (input && input.value.trim()) {
    const student = students.find(s => s.id === id);
    if (student) {
      student.name = input.value.trim();
      localStorage.setItem('cleaning_students', JSON.stringify(students));
      alert(`อัปเดตชื่อรหัส ${id} เป็น "${student.name}" เรียบร้อยแล้ว`);
      if (currentViewMode === 'daily') renderDailyView(); else renderMonthlyView();
    }
  }
}

function renderAdminHolidays() {
  const list = document.getElementById('holidayList');
  list.innerHTML = '';
  Object.keys(customHolidays).sort().forEach(k => {
    const div = document.createElement('div');
    div.className = "flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200";
    div.innerHTML = `<span><strong>${k}</strong>: ${customHolidays[k]}</span><button onclick="deleteHoliday('${k}')" class="text-rose-600 font-semibold">ลบ</button>`;
    list.appendChild(div);
  });
}

function addCustomHoliday() {
  const d = document.getElementById('newHolidayDate').value;
  const n = document.getElementById('newHolidayName').value;
  if (d && n) {
    customHolidays[d] = n;
    localStorage.setItem('cleaning_holidays', JSON.stringify(customHolidays));
    renderAdminHolidays();
    if (currentViewMode === 'daily') renderDailyView(); else renderMonthlyView();
  }
}

function deleteHoliday(k) {
  delete customHolidays[k];
  localStorage.setItem('cleaning_holidays', JSON.stringify(customHolidays));
  renderAdminHolidays();
  if (currentViewMode === 'daily') renderDailyView(); else renderMonthlyView();
}

function resetSystemData() {
  if (confirm('คุณต้องการรีเซ็ตและล้างข้อมูลการเช็คชื่อทั้งหมดใช่หรือไม่?')) {
    localStorage.clear();
    location.reload();
  }
}

function formatDateThai(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return `${d.getDate()} ${months[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;
}
