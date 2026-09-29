/**
 * ==============================================================================
 * js/admin.js - 인사관리자 전체 현황판 및 월별 연차수당 정산 관리 모듈
 * (주)에스앤더블류 임직원 연차 조회 시스템
 * ==============================================================================
 */

window.SNW = window.SNW || {};

(function (SNW) {
  'use strict';

  // DOM Elements - Admin Overview
  const adminSection = document.getElementById('adminSection');
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const adminModeBtn = document.getElementById('adminModeBtn');
  const btnCloseAdminBtn = document.getElementById('btnCloseAdminBtn');
  const adminLogoutHeaderBtn = document.getElementById('adminLogoutHeaderBtn');
  const adminHeaderControls = document.getElementById('adminHeaderControls');
  const configApiBtn = document.getElementById('configApiBtn');
  const btnHeaderBack = document.getElementById('btnHeaderBack');
  const btnHeaderBackText = document.getElementById('btnHeaderBackText');

  const adminTotalEmp = document.getElementById('adminTotalEmp');
  const adminTotalGranted = document.getElementById('adminTotalGranted');
  const adminTotalUsed = document.getElementById('adminTotalUsed');
  const adminTotalRemaining = document.getElementById('adminTotalRemaining');
  const adminSearchInput = document.getElementById('adminSearchInput');
  const adminCycleYearFilter = document.getElementById('adminCycleYearFilter');
  const adminDeptFilter = document.getElementById('adminDeptFilter');
  const adminSortFilter = document.getElementById('adminSortFilter');
  const adminTenureFilter = document.getElementById('adminTenureFilter');
  const adminTableBody = document.getElementById('adminTableBody');
  const under1NoticeCard = document.getElementById('under1NoticeCard');
  const countTenureAll = document.getElementById('countTenureAll');
  const countTenureUnder1 = document.getElementById('countTenureUnder1');
  const countTenureOver1 = document.getElementById('countTenureOver1');
  const btnExportAllExcel = document.getElementById('btnExportAllExcel');

  // State
  let currentTenureFilter = 'all'; // 'all' | 'under1' | 'over1'
  let currentAdminList = [];
  let currentAdminTab = 'overview'; // 'overview' | 'settlement'
  let currentSettlementYear = 2026;
  let currentSettlementMonth = 9; // 1 ~ 12
  let localWageMap = {}; // key: empId or cleanName, value: number
  let currentSettlementList = [];

  // Restore wage cache
  try {
    const savedWageStr = sessionStorage.getItem('snw_wage_cache');
    if (savedWageStr) {
      localWageMap = JSON.parse(savedWageStr);
    }
  } catch (e) {}

  function cleanName(s) {
    return String(s || '').trim().replace(/\s+/g, '');
  }

  function getEmployeeWage(emp) {
    if (!emp) return 0;
    if (emp.hourly_wage && typeof emp.hourly_wage === 'number' && emp.hourly_wage > 0) {
      return emp.hourly_wage;
    }
    const idKey = emp.emp_id ? String(emp.emp_id).trim() : '';
    if (idKey && localWageMap[idKey]) return localWageMap[idKey];
    const nameKey = cleanName(emp.name);
    if (nameKey && localWageMap[nameKey]) return localWageMap[nameKey];
    return 0;
  }

  function calculateAdminSummary(employees) {
    let granted = 0;
    let used = 0;
    let rem = 0;
    let totalRate = 0;
    let count = 0;

    employees.forEach(emp => {
      const calc = emp.leave_calc;
      if (!calc) return;
      granted += (calc.total_granted || 0);
      used += (calc.used_days || 0);
      rem += (calc.remaining_days || 0);
      totalRate += (calc.usage_rate || 0);
      count++;
    });

    const avgRate = count > 0 ? (totalRate / count).toFixed(1) : 0;
    return {
      total_granted: Math.round(granted * 10) / 10,
      total_used: Math.round(used * 10) / 10,
      total_remaining: Math.round(rem * 10) / 10,
      avg_usage_rate: Number(avgRate)
    };
  }

  function openAdminView(pushHistory = true) {
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'flex';
    if (SNW.state) SNW.state.isViewingFromAdmin = false;

    if (adminHeaderControls) adminHeaderControls.style.display = 'inline-flex';
    if (configApiBtn) configApiBtn.style.display = 'inline-flex';
    if (adminModeBtn) adminModeBtn.style.display = 'inline-flex';

    if (btnHeaderBack) {
      btnHeaderBack.style.display = 'inline-flex';
      if (btnHeaderBackText) btnHeaderBackText.textContent = '뒤로가기';
      btnHeaderBack.title = '로그인 화면으로 돌아가기';
    }

    if (pushHistory) {
      history.pushState({ view: 'admin' }, '', '#admin');
    }

    // Fallback to window.SNW_DATA
    if ((!SNW.state.snwData || !SNW.state.snwData.employees) && window.SNW_DATA) {
      SNW.state.snwData = window.SNW_DATA;
    }

    // Session cache check
    const cachedAdminStr = sessionStorage.getItem('snw_admin_cache');
    if (cachedAdminStr && (!SNW.state.snwData || !SNW.state.snwData.employees)) {
      try {
        const cachedData = JSON.parse(cachedAdminStr);
        if (cachedData && cachedData.employees && cachedData.employees.length > 0) {
          SNW.state.snwData = {
            company: cachedData.company || '(주)에스앤더블류',
            total_employees: cachedData.employees.length,
            summary: calculateAdminSummary(cachedData.employees),
            employees: cachedData.employees
          };
        }
      } catch (e) {}
    }

    if (SNW.state.snwData && SNW.state.snwData.employees) {
      populateAdminCycleYearOptions();
      populateAdminDeptOptions();
      populateSettlementMonthSelect();
      populateSettlementDeptOptions();
      if (currentAdminTab === 'settlement') {
        renderSettlementView();
      } else {
        renderAdminSummary();
        renderAdminTable();
      }
    }

    document.body.classList.add('admin-view-active');

    const gasApiUrl = localStorage.getItem('snw_gas_url') || '';
    if (gasApiUrl) {
      if (!SNW.state.snwData || !SNW.state.snwData.employees) {
        loadAdminDataFromGas(false, false);
      } else {
        loadAdminDataFromGas(false, true);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeAdminView() {
    document.body.classList.remove('admin-view-active');
    sessionStorage.removeItem('snw_is_admin');
    if (SNW.app && typeof SNW.app.showLoginView === 'function') {
      SNW.app.showLoginView(true);
    }
  }

  async function loadAdminDataFromGas(forceRefresh, isBackground) {
    const gasApiUrl = localStorage.getItem('snw_gas_url') || '';
    if (!gasApiUrl) return;

    const tbody = document.getElementById('adminTableBody');
    const refreshBtn = document.getElementById('btnAdminRefresh');
    const refreshIcon = refreshBtn ? refreshBtn.querySelector('.spin-target') : null;
    if (refreshIcon) refreshIcon.classList.add('spin');

    const hasExistingData = (SNW.state.snwData && SNW.state.snwData.employees && SNW.state.snwData.employees.length > 0);

    if (!isBackground && !hasExistingData && tbody) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 40px; color: var(--primary);">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">⚡</div>
        <div><strong>구글 시트에서 전체 사원 연차 데이터를 고속 동기화 중입니다...</strong></div>
        <small style="color: var(--text-secondary);">해시맵 인덱싱 알고리즘으로 빠르게 집계합니다.</small>
      </td></tr>`;
    }

    try {
      const data = await SNW.api.fetchGasAdmin(gasApiUrl, forceRefresh);

      if (data && data.success && data.employees && data.employees.length > 0) {
        try {
          sessionStorage.setItem('snw_admin_cache', JSON.stringify(data));
        } catch (e) {}

        const todaySlash = SNW.api.getTodayFormatted('/');
        SNW.state.snwData = {
          company: data.company || '(주)에스앤더블류',
          ref_date: data.ref_date || todaySlash,
          total_employees: data.employees.length,
          summary: calculateAdminSummary(data.employees),
          employees: data.employees
        };
        SNW.api.updateSystemDateDisplay(data.ref_date, gasApiUrl, SNW.state.snwData);
        populateAdminCycleYearOptions();
        populateAdminDeptOptions();
        populateSettlementMonthSelect();
        populateSettlementDeptOptions();
        renderAdminSummary();
        renderAdminTable();
        if (currentAdminTab === 'settlement') {
          renderSettlementView();
        }

        if (forceRefresh) {
          alert('구글 시트 최신 데이터로 동기화가 완료되었습니다!');
        }
      }
    } catch (err) {
      console.warn('GAS admin load error:', err);
      if (forceRefresh) {
        alert('구글 시트 동기화 안내: ' + (err.message || err));
      }
    } finally {
      if (refreshIcon) refreshIcon.classList.remove('spin');
    }
  }

  function renderAdminSummary() {
    const data = SNW.state.snwData;
    if (!data || !data.employees) return;

    let filtered = data.employees;
    if (currentTenureFilter === 'under1') {
      filtered = filtered.filter(e => e.leave_calc && e.leave_calc.is_under_1_year);
    } else if (currentTenureFilter === 'over1') {
      filtered = filtered.filter(e => e.leave_calc && !e.leave_calc.is_under_1_year);
    }

    const summary = calculateAdminSummary(filtered);

    if (adminTotalEmp) adminTotalEmp.textContent = `${filtered.length}명`;
    if (adminTotalGranted) adminTotalGranted.textContent = `${summary.total_granted.toFixed(1)}일`;
    if (adminTotalUsed) adminTotalUsed.textContent = `${summary.total_used.toFixed(1)}일`;
    if (adminTotalRemaining) adminTotalRemaining.textContent = `${summary.total_remaining.toFixed(1)}일`;

    const totalCount = data.employees.length;
    const under1Count = data.employees.filter(e => e.leave_calc && e.leave_calc.is_under_1_year).length;
    const over1Count = totalCount - under1Count;

    if (countTenureAll) countTenureAll.textContent = totalCount;
    if (countTenureUnder1) countTenureUnder1.textContent = under1Count;
    if (countTenureOver1) countTenureOver1.textContent = over1Count;
  }

  function populateAdminCycleYearOptions() {
    const data = SNW.state.snwData;
    if (!data || !data.employees || !adminCycleYearFilter) return;
    const yearCounts = {};
    data.employees.forEach(e => {
      const y = SNW.calc.getEmployeeCycleYear(e);
      if (y) {
        yearCounts[y] = (yearCounts[y] || 0) + 1;
      }
    });

    const sortedYears = Object.keys(yearCounts).sort((a, b) => b.localeCompare(a));
    const currentVal = adminCycleYearFilter.value || 'all';

    let html = '<option value="all">전체 연차 주기</option>';
    sortedYears.forEach(y => {
      html += `<option value="${y}" ${y === currentVal ? 'selected' : ''}>${y}년도 주기 (${yearCounts[y]}명)</option>`;
    });
    adminCycleYearFilter.innerHTML = html;
  }

  function populateAdminDeptOptions() {
    const data = SNW.state.snwData;
    if (!data || !data.employees || !adminDeptFilter) return;
    const depts = new Set(data.employees.map(e => e.dept).filter(Boolean));
    const sortedDepts = Array.from(depts).sort();

    adminDeptFilter.innerHTML = '<option value="all">모든 부서</option>' +
      sortedDepts.map(d => `<option value="${d}">${d}</option>`).join('');
  }

  function renderAdminTable() {
    const data = SNW.state.snwData;
    if (!data || !data.employees || !adminTableBody) return;

    let allEmps = data.employees;

    if (currentTenureFilter === 'under1') {
      allEmps = allEmps.filter(e => e.leave_calc && e.leave_calc.is_under_1_year);
      if (under1NoticeCard) under1NoticeCard.style.display = 'flex';
    } else if (currentTenureFilter === 'over1') {
      allEmps = allEmps.filter(e => e.leave_calc && !e.leave_calc.is_under_1_year);
      if (under1NoticeCard) under1NoticeCard.style.display = 'none';
    } else {
      if (under1NoticeCard) under1NoticeCard.style.display = 'none';
    }

    const selectedYear = adminCycleYearFilter ? adminCycleYearFilter.value : 'all';
    let filtered = selectedYear === 'all'
      ? allEmps
      : allEmps.filter(e => SNW.calc.getEmployeeCycleYear(e) === selectedYear);

    const searchVal = adminSearchInput ? adminSearchInput.value.trim().toLowerCase() : '';
    const deptVal = adminDeptFilter ? adminDeptFilter.value : 'all';
    const sortVal = adminSortFilter ? adminSortFilter.value : 'dept';

    if (deptVal !== 'all') {
      filtered = filtered.filter(e => e.dept === deptVal);
    }

    if (searchVal) {
      filtered = filtered.filter(e => {
        const text = `${e.name} ${e.emp_id} ${e.dept} ${e.position || ''} ${e.rank || ''}`.toLowerCase();
        return text.includes(searchVal);
      });
    }

    filtered.sort((a, b) => {
      const calcA = a.leave_calc || {};
      const calcB = b.leave_calc || {};

      if (sortVal === 'name') return a.name.localeCompare(b.name, 'ko');
      if (sortVal === 'dept') {
        const deptComp = (a.dept || '').localeCompare(b.dept || '', 'ko');
        if (deptComp !== 0) return deptComp;
        return a.name.localeCompare(b.name, 'ko');
      }
      if (sortVal === 'service') return a.join_date.localeCompare(b.join_date);
      if (sortVal === 'remaining_desc') return (calcB.remaining_days || 0) - (calcA.remaining_days || 0);
      if (sortVal === 'remaining_asc') return (calcA.remaining_days || 0) - (calcB.remaining_days || 0);
      if (sortVal === 'usage_rate_desc') return (calcB.usage_rate || 0) - (calcA.usage_rate || 0);
      if (sortVal === 'usage_rate_asc') return (calcA.usage_rate || 0) - (calcB.usage_rate || 0);
      return 0;
    });

    currentAdminList = filtered;

    if (filtered.length === 0) {
      adminTableBody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align:center; padding: 40px; color: var(--text-secondary);">
            일치하는 사원 정보가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    adminTableBody.innerHTML = filtered.map((emp, idx) => {
      const calc = emp.leave_calc || {
        total_granted: 0,
        used_days: 0,
        remaining_days: 0,
        usage_rate: 0,
        period_start: '-',
        period_end: '-'
      };

      const periodText = (calc.period_start && calc.period_end)
        ? `${calc.period_start} ~ ${calc.period_end}`
        : '-';

      const isUnder1 = Boolean(calc.is_under_1_year);
      const tenurePill = isUnder1
        ? `<span class="tenure-pill tenure-under1">1년미만</span>`
        : `<span class="tenure-pill tenure-over1">1년이상</span>`;

      const cYear = SNW.calc.getEmployeeCycleYear(emp);
      const cycleYearBadge = cYear
        ? `<span class="badge-cycle badge-cycle-current" style="font-size:0.75rem; padding: 2px 6px;">${cYear}년</span>`
        : '';

      const serviceYears = emp.service_years !== undefined ? emp.service_years : Math.floor((emp.service_days || 0) / 365);
      const serviceDisplay = isUnder1
        ? `<span style="color:var(--secondary); font-weight:600;">1년차(월차)</span>`
        : `<strong>${serviceYears}년차</strong>`;

      return `
        <tr data-id="${emp.emp_id}">
          <td>${idx + 1}</td>
          <td>${tenurePill}</td>
          <td>${emp.emp_id}</td>
          <td style="text-align: left;"><strong>${emp.name}</strong></td>
          <td style="text-align: left;">${emp.dept}</td>
          <td>${emp.position || emp.rank || '-'}</td>
          <td>${emp.join_date}</td>
          <td>${serviceDisplay}</td>
          <td style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;">
            ${cycleYearBadge} ${periodText}
          </td>
          <td>${calc.total_granted.toFixed(1)}</td>
          <td>${calc.used_days.toFixed(1)}</td>
          <td><strong>${calc.remaining_days.toFixed(1)}</strong></td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <div class="kpi-progress" style="height:6px; flex:1; min-width:40px;">
                <div class="kpi-progress-fill" style="width: ${Math.min(100, Math.max(0, 100 - calc.usage_rate))}%"></div>
              </div>
              <span style="font-size:0.75rem;">${calc.usage_rate}%</span>
            </div>
          </td>
          <td>
            <button type="button" class="btn-view-emp" data-id="${emp.emp_id}">조회</button>
          </td>
        </tr>
      `;
    }).join('');

    adminTableBody.querySelectorAll('.btn-view-emp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const emp = data.employees.find(x => x.emp_id === id);
        if (emp && SNW.app && typeof SNW.app.loginSuccess === 'function') {
          SNW.app.loginSuccess(emp, null, true, true);
        }
      });
    });
  }

  function setTenureFilter(filter) {
    currentTenureFilter = filter;
    if (adminTenureFilter) {
      adminTenureFilter.querySelectorAll('.tenure-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tenure') === filter);
      });
    }
    renderAdminSummary();
    renderAdminTable();
  }

  function switchAdminTab(tab) {
    currentAdminTab = tab;
    const tabOverview = document.getElementById('btnAdminTabOverview');
    const tabSettlement = document.getElementById('btnAdminTabSettlement');
    const viewOverview = document.getElementById('adminOverviewView');
    const viewSettlement = document.getElementById('adminSettlementView');

    if (tab === 'settlement') {
      if (tabOverview) tabOverview.classList.remove('active');
      if (tabSettlement) tabSettlement.classList.add('active');
      if (viewOverview) viewOverview.style.display = 'none';
      if (viewSettlement) viewSettlement.style.display = 'flex';
      renderSettlementView();
    } else {
      if (tabSettlement) tabSettlement.classList.remove('active');
      if (tabOverview) tabOverview.classList.add('active');
      if (viewSettlement) viewSettlement.style.display = 'none';
      if (viewOverview) viewOverview.style.display = 'flex';
      renderAdminSummary();
      renderAdminTable();
    }
  }

  function populateSettlementMonthSelect() {
    const sel = document.getElementById('settlementMonthSelect');
    if (!sel) return;

    const now = new Date();
    let refYear = now.getFullYear();
    let refMonth = now.getMonth() + 1;
    const snwData = SNW.state ? SNW.state.snwData : null;
    const gasApiUrl = localStorage.getItem('snw_gas_url') || '';

    if (!gasApiUrl && snwData && snwData.ref_date) {
      const parts = snwData.ref_date.split(/[\/-]/);
      if (parts.length >= 2) {
        refYear = parseInt(parts[0], 10) || refYear;
        refMonth = parseInt(parts[1], 10) || refMonth;
      }
    }
    currentSettlementYear = refYear;
    if (!currentSettlementMonth) currentSettlementMonth = refMonth;

    let optionsHtml = '';
    for (let m = 1; m <= 12; m++) {
      const isCurr = (m === refMonth);
      optionsHtml += `<option value="${m}" ${m === currentSettlementMonth ? 'selected' : ''}>${refYear}년 ${m}월 (${m}월 주기 / ${m}월 귀속)${isCurr ? ' ★기준월' : ''}</option>`;
    }
    sel.innerHTML = optionsHtml;
    sel.value = String(currentSettlementMonth);
  }

  function populateSettlementDeptOptions() {
    const deptSel = document.getElementById('settlementDeptFilter');
    const data = SNW.state ? SNW.state.snwData : null;
    if (!deptSel || !data || !data.employees) return;
    const depts = new Set(data.employees.map(e => e.dept).filter(Boolean));
    const sortedDepts = Array.from(depts).sort();
    const currVal = deptSel.value || 'all';

    deptSel.innerHTML = '<option value="all">모든 부서 (전체)</option>' +
      sortedDepts.map(d => `<option value="${d}">${d}</option>`).join('');
    deptSel.value = currVal;
  }

  function evaluateEmployeeSettlement(emp, targetYear, targetMonth) {
    if (!emp || !emp.join_date) {
      return {
        isTargetMonthCycle: false,
        isEligible: false,
        wage: 0,
        amount: 0,
        statusType: 'invalid',
        statusText: '입사일자 없음',
        formulaText: '-',
        periodStart: '',
        periodEnd: '',
        periodText: '-',
        periodName: '',
        cycleIndex: 0,
        cycleTotalGranted: 0,
        cycleUsedDays: 0
      };
    }

    const wage = getEmployeeWage(emp);
    const hasWage = (wage > 0);

    const parts = emp.join_date.split('/');
    const joinYear = parseInt(parts[0], 10);
    const joinMonth = parseInt(parts[1], 10);

    const isTargetMonthCycle = (joinMonth === targetMonth);
    const completedYearsAtTarget = targetYear - joinYear;
    const isNewHireUnder1 = (completedYearsAtTarget < 1);
    const isFirstYearRenewal = (completedYearsAtTarget === 1);

    const gasApiUrl = localStorage.getItem('snw_gas_url') || '';
    const snwData = SNW.state ? SNW.state.snwData : null;
    const getToday = SNW.api ? SNW.api.getTodayFormatted : null;
    const cycles = SNW.calc.ensureEmployeeCycles(emp, gasApiUrl, snwData, getToday);

    let targetCycle = null;
    let targetCycleIndex = 0;

    if (cycles && cycles.length > 0) {
      const foundIdx = cycles.findIndex(c => {
        if (!c.next_renewal_date) return false;
        const p = c.next_renewal_date.split('/');
        return parseInt(p[0], 10) === targetYear && parseInt(p[1], 10) === targetMonth;
      });

      if (foundIdx !== -1) {
        targetCycle = cycles[foundIdx];
        targetCycleIndex = foundIdx;
      } else {
        const foundEndIdx = cycles.findIndex(c => {
          if (!c.period_end) return false;
          const p = c.period_end.split('/');
          return parseInt(p[0], 10) === targetYear && parseInt(p[1], 10) === targetMonth;
        });
        if (foundEndIdx !== -1) {
          targetCycle = cycles[foundEndIdx];
          targetCycleIndex = foundEndIdx;
        }
      }
    }

    if (!targetCycle && isTargetMonthCycle && cycles && cycles.length > 0) {
      targetCycle = cycles[0];
      targetCycleIndex = 0;
    }

    let remainingDays = 0;
    let periodStart = '';
    let periodEnd = '';
    let periodName = '';
    let cycleTotalGranted = 0;
    let cycleUsedDays = 0;

    if (targetCycle) {
      remainingDays = Math.max(0, targetCycle.remaining_days !== undefined ? targetCycle.remaining_days : 0);
      periodStart = targetCycle.period_start || '';
      periodEnd = targetCycle.period_end || '';
      periodName = targetCycle.period_name || '';
      cycleTotalGranted = targetCycle.total_granted || 0;
      cycleUsedDays = targetCycle.used_days || 0;
    } else if (emp.leave_calc) {
      remainingDays = Math.max(0, emp.leave_calc.remaining_days || 0);
      periodStart = emp.leave_calc.period_start || '';
      periodEnd = emp.leave_calc.period_end || '';
      periodName = emp.leave_calc.is_under_1_year ? '1년차 월차' : `${emp.service_years || ''}년차`;
      cycleTotalGranted = emp.leave_calc.total_granted || 0;
      cycleUsedDays = emp.leave_calc.used_days || 0;
    }

    const periodText = (periodStart && periodEnd) ? `${periodStart} ~ ${periodEnd}` : (periodEnd || '-');
    const amount = hasWage ? Math.round(wage * 8 * 1.5 * remainingDays) : 0;
    const formulaText = hasWage
      ? `${wage.toLocaleString()}원 × 8h × 1.5 × ${remainingDays.toFixed(1)}일`
      : '통상시급 미등록';

    let isEligible = false;
    let statusType = '';
    let statusText = '';

    if (!isTargetMonthCycle) {
      statusType = 'other_cycle';
      statusText = `${joinMonth}월 주기 (비대상)`;
    } else if (isNewHireUnder1) {
      statusType = 'new_hire';
      statusText = '당월 신규입사자 (만 1년 미달 제외)';
    } else if (!hasWage) {
      statusType = 'no_wage';
      statusText = '통상시급 미등록 (정산 비대상)';
    } else {
      isEligible = true;
      statusType = isFirstYearRenewal ? 'first_year_done' : 'regular_renewal';
      statusText = isFirstYearRenewal ? '만 1년 도래 월차 정산' : '정규 연차 주기 만료 정산';
    }

    return {
      isTargetMonthCycle,
      isEligible,
      isNewHireUnder1,
      hasWage,
      wage,
      remainingDays,
      amount,
      statusType,
      statusText,
      formulaText,
      periodStart,
      periodEnd,
      periodText,
      periodName,
      cycleIndex: targetCycleIndex,
      cycleTotalGranted,
      cycleUsedDays
    };
  }

  function renderSettlementView() {
    const data = SNW.state ? SNW.state.snwData : null;
    if (!data || !data.employees) return;

    populateSettlementMonthSelect();
    populateSettlementDeptOptions();

    const targetMonth = currentSettlementMonth;
    const targetYear = currentSettlementYear;

    const cycleBadge = document.getElementById('settlementCycleBadge');
    if (cycleBadge) {
      cycleBadge.textContent = `${targetMonth}월 귀속 급여 정산 (만료 당월 기준)`;
    }
    const exportBtnText = document.getElementById('btnExportSettlementText');
    if (exportBtnText) {
      exportBtnText.textContent = `${targetYear}년 ${targetMonth}월 귀속 연차정산 다운로드 (.xlsx)`;
    }

    const allEvaluated = data.employees.map(emp => ({
      emp: emp,
      eval: evaluateEmployeeSettlement(emp, targetYear, targetMonth)
    }));

    const cycleEmps = allEvaluated.filter(x => x.eval.isTargetMonthCycle);
    const eligibleEmps = cycleEmps.filter(x => x.eval.isEligible);
    const newHireExcluded = cycleEmps.filter(x => x.eval.isNewHireUnder1).length;
    const noWageExcluded = cycleEmps.filter(x => !x.eval.hasWage && !x.eval.isNewHireUnder1).length;

    let totalDays = 0;
    let totalAmount = 0;
    eligibleEmps.forEach(x => {
      totalDays += x.eval.remainingDays;
      totalAmount += x.eval.amount;
    });
    const avgAmount = eligibleEmps.length > 0 ? Math.round(totalAmount / eligibleEmps.length) : 0;
    const avgDays = eligibleEmps.length > 0 ? (totalDays / eligibleEmps.length).toFixed(1) : '0.0';

    const countEl = document.getElementById('settlementEmpCount');
    const countSub = document.getElementById('settlementEmpSub');
    const daysEl = document.getElementById('settlementTotalDays');
    const daysSub = document.getElementById('settlementDaysSub');
    const amountEl = document.getElementById('settlementTotalAmount');
    const avgAmountEl = document.getElementById('settlementAvgAmount');

    if (countEl) countEl.textContent = `${eligibleEmps.length}명`;
    if (countSub) countSub.textContent = `제외: 신규입사 ${newHireExcluded}명 / 시급미등록 ${noWageExcluded}명`;
    if (daysEl) daysEl.textContent = `${totalDays.toFixed(1)}일`;
    if (daysSub) daysSub.textContent = `인당 평균 ${avgDays}일`;
    if (amountEl) amountEl.textContent = `₩ ${totalAmount.toLocaleString()}`;
    if (avgAmountEl) avgAmountEl.textContent = `₩ ${avgAmount.toLocaleString()}`;

    const filterMode = document.getElementById('settlementFilterMode') ? document.getElementById('settlementFilterMode').value : 'eligible';
    const deptVal = document.getElementById('settlementDeptFilter') ? document.getElementById('settlementDeptFilter').value : 'all';
    const searchVal = document.getElementById('settlementSearchInput') ? document.getElementById('settlementSearchInput').value.trim().toLowerCase() : '';
    const sortVal = document.getElementById('settlementSortFilter') ? document.getElementById('settlementSortFilter').value : 'amount_desc';

    let displayList = [];
    if (filterMode === 'eligible') {
      displayList = eligibleEmps.slice();
    } else if (filterMode === 'all_cycle') {
      displayList = cycleEmps.slice();
    } else {
      displayList = allEvaluated.slice();
    }

    if (deptVal !== 'all') {
      displayList = displayList.filter(x => x.emp.dept === deptVal);
    }

    if (searchVal) {
      displayList = displayList.filter(x => {
        const text = `${x.emp.name} ${x.emp.emp_id} ${x.emp.dept} ${x.emp.position || ''}`.toLowerCase();
        return text.includes(searchVal);
      });
    }

    displayList.sort((a, b) => {
      if (sortVal === 'amount_desc') return b.eval.amount - a.eval.amount;
      if (sortVal === 'amount_asc') return a.eval.amount - b.eval.amount;
      if (sortVal === 'rem_desc') return b.eval.remainingDays - a.eval.remainingDays;
      if (sortVal === 'wage_desc') return b.eval.wage - a.eval.wage;
      if (sortVal === 'name_asc') return a.emp.name.localeCompare(b.emp.name, 'ko');
      if (sortVal === 'join_asc') return a.emp.join_date.localeCompare(b.emp.join_date);
      return 0;
    });

    currentSettlementList = displayList;

    const tbody = document.getElementById('settlementTableBody');
    if (!tbody) return;

    if (displayList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="13" style="text-align:center; padding: 40px; color: var(--text-secondary);">
            <div style="font-size: 1.6rem; margin-bottom: 8px;">🔍</div>
            <strong>${targetYear}년 ${targetMonth}월에 해당하는 정산 대상 사원이 없습니다.</strong>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = displayList.map((item, idx) => {
      const emp = item.emp;
      const ev = item.eval;
      const isEligible = ev.isEligible;
      const rowClass = isEligible ? '' : 'row-ineligible';

      let statusBadge = '';
      if (!isEligible) {
        if (ev.statusType === 'new_hire') {
          statusBadge = `<div style="margin-top: 2px;"><span class="badge badge-warning" style="font-size:0.72rem; padding: 2px 6px;">신규입사(1년미만 제외)</span></div>`;
        } else if (ev.statusType === 'no_wage') {
          statusBadge = `<div style="margin-top: 2px;"><span class="badge badge-secondary" style="font-size:0.72rem; padding: 2px 6px;">시급미등록(비대상)</span></div>`;
        } else {
          statusBadge = `<div style="margin-top: 2px;"><span class="badge badge-secondary" style="font-size:0.72rem; padding: 2px 6px;">${ev.statusText}</span></div>`;
        }
      }

      const wageText = ev.wage > 0 ? `₩ ${ev.wage.toLocaleString()}` : `<span class="text-muted" style="font-size:0.8rem;">미등록</span>`;
      const amountText = isEligible
        ? `<strong>₩ ${ev.amount.toLocaleString()}</strong>`
        : `<span class="text-muted">-</span>`;

      return `
        <tr class="${rowClass}">
          <td>${idx + 1}</td>
          <td>${emp.emp_id}</td>
          <td style="text-align:left;">
            <strong>${emp.name}</strong>${statusBadge}
          </td>
          <td style="text-align:left;">${emp.dept}</td>
          <td>${emp.position || emp.rank || '-'}</td>
          <td>${emp.join_date}</td>
          <td>${emp.service_text}</td>
          <td>
            <div style="font-weight: 500; font-size: 0.8rem; color: var(--text-primary); white-space: nowrap;">${ev.periodText}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px;">(만료일: ${ev.periodEnd})</div>
          </td>
          <td class="cell-wage">${wageText}</td>
          <td><strong>${ev.remainingDays.toFixed(1)}일</strong></td>
          <td><span class="badge-calc-formula">${isEligible ? ev.formulaText : ev.statusText}</span></td>
          <td class="cell-amount">${amountText}</td>
          <td>
            <button type="button" class="btn-view-emp" data-id="${emp.emp_id}" data-cycle-index="${ev.cycleIndex}">조회</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-emp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const cycleIdx = e.currentTarget.getAttribute('data-cycle-index');
        const emp = data.employees.find(x => x.emp_id === id);
        if (emp && SNW.app && typeof SNW.app.loginSuccess === 'function') {
          SNW.app.loginSuccess(emp, null, true, true);
          if (cycleIdx !== null && cycleIdx !== undefined && !isNaN(parseInt(cycleIdx, 10))) {
            setTimeout(() => {
              if (SNW.dashboard && typeof SNW.dashboard.selectCycle === 'function') {
                SNW.dashboard.selectCycle(parseInt(cycleIdx, 10));
              }
            }, 80);
          }
        }
      });
    });
  }

  function exportSettlementToExcel() {
    if (!currentSettlementList || currentSettlementList.length === 0) {
      alert('다운로드할 정산 데이터가 없습니다.');
      return;
    }

    const rows = currentSettlementList.map((item, idx) => ({
      '순번': idx + 1,
      '사번': item.emp.emp_id,
      '성명': item.emp.name,
      '부서': item.emp.dept,
      '직위': item.emp.position || item.emp.rank || '-',
      '입사일자': item.emp.join_date,
      '근속기간': item.emp.service_text,
      '정산대상주기': item.eval.periodText,
      '주기만료일': item.eval.periodEnd,
      '부여연차(일)': item.eval.cycleTotalGranted || 0,
      '사용연차(일)': item.eval.cycleUsedDays || 0,
      '남은연차(일)': item.eval.remainingDays,
      '통상시급(원)': item.eval.wage || 0,
      '산정식': item.eval.isEligible ? `${item.eval.wage} × 8 × 1.5 × ${item.eval.remainingDays}` : '-',
      '정산지급액(원)': item.eval.amount,
      '정산적격여부': item.eval.isEligible ? '정산대상' : '정산제외',
      '제외및정산사유': item.eval.statusText
    }));

    if (window.XLSX) {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${currentSettlementMonth}월귀속_연차정산`);
      XLSX.writeFile(wb, `(주)에스앤더블류_${currentSettlementYear}년${String(currentSettlementMonth).padStart(2,'0')}월귀속_연차정산내역.xlsx`);
    } else {
      alert('Excel 라이브러리를 로딩 중입니다.');
    }
  }

  function handleWageFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        let targetSheetName = wb.SheetNames.find(n => n.includes('통상시급') || n.includes('시급') || n.includes('급여')) || wb.SheetNames[0];
        const ws = wb.Sheets[targetSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rows || rows.length < 2) {
          alert('업로드한 파일에 유효한 데이터가 없습니다.');
          return;
        }

        let headers = rows[0].map(h => String(h || '').trim().replace(/\s+/g, ''));
        let nameCol = headers.findIndex(h => h.includes('성명') || h.includes('이름') || h.includes('사원명'));
        let idCol = headers.findIndex(h => h.includes('사번'));
        let wageCol = headers.findIndex(h => h.includes('통상시급') || h.includes('시급') || h.includes('통상임금') || h.includes('급여') || h.includes('금액'));

        if (nameCol === -1 && wageCol === -1 && rows.length > 2) {
          headers = rows[1].map(h => String(h || '').trim().replace(/\s+/g, ''));
          nameCol = headers.findIndex(h => h.includes('성명') || h.includes('이름') || h.includes('사원명'));
          idCol = headers.findIndex(h => h.includes('사번'));
          wageCol = headers.findIndex(h => h.includes('통상시급') || h.includes('시급') || h.includes('통상임금') || h.includes('급여') || h.includes('금액'));
        }

        if (wageCol === -1) {
          alert('파일에서 [통상시급] 또는 [시급] 열을 찾을 수 없습니다. 컬럼명을 확인해주세요.');
          return;
        }

        let loadedCount = 0;
        const startRow = (rows[0].some(h => String(h).includes('시급'))) ? 1 : 2;
        for (let r = startRow; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;
          const rawName = nameCol !== -1 ? cleanName(row[nameCol]) : '';
          const rawId = idCol !== -1 ? String(row[idCol] || '').trim().replace(/[^0-9a-zA-Z]/g, '') : '';
          const rawWage = row[wageCol];
          let wageNum = 0;
          if (typeof rawWage === 'number') wageNum = rawWage;
          else if (rawWage) wageNum = parseFloat(String(rawWage).replace(/[^0-9.]/g, '')) || 0;

          if (wageNum > 0) {
            if (rawId) localWageMap[rawId] = wageNum;
            if (rawName) localWageMap[rawName] = wageNum;
            loadedCount++;
          }
        }

        sessionStorage.setItem('snw_wage_cache', JSON.stringify(localWageMap));

        const snwData = SNW.state ? SNW.state.snwData : null;
        if (snwData && snwData.employees) {
          snwData.employees.forEach(emp => {
            const w = getEmployeeWage(emp);
            if (w > 0) {
              emp.hourly_wage = w;
              emp.has_wage = true;
            }
          });
        }

        alert(`[통상시급 동기화 성공]\n총 ${loadedCount}명의 통상시급 데이터가 성공적으로 반영되었습니다!`);
        if (currentAdminTab === 'settlement') {
          renderSettlementView();
        } else {
          renderAdminSummary();
          renderAdminTable();
        }
      } catch (err) {
        alert('엑셀 파일 분석 중 오류가 발생했습니다: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function parseExcelDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(date.getTime()) ? null : date;
    }
    const str = String(val).trim().replace(/[\.-]/g, '/');
    const m = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (m) {
      return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    }
    return null;
  }

  function handleUsageFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        let targetSheetName = wb.SheetNames.find(n => n.includes('사용') || n.includes('연차') || n.includes('근태')) || wb.SheetNames[0];
        const ws = wb.Sheets[targetSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rows || rows.length < 2) {
          alert('업로드한 파일에 유효한 데이터가 없습니다.');
          return;
        }

        let headerRowIdx = 0;
        let headers = rows[0].map(h => String(h || '').trim().replace(/\s+/g, ''));
        function findIdx(cands) {
          return headers.findIndex(h => cands.some(k => h.includes(k)));
        }

        let idCol = findIdx(['사번', '사원번호']);
        let nameCol = findIdx(['성명', '이름', '사원명']);
        let dateCol = findIdx(['근무일', '근무일자', '사용일', '일자', '날짜', '휴가일자']);

        if ((nameCol === -1 && idCol === -1) && rows.length > 2) {
          headerRowIdx = 1;
          headers = rows[1].map(h => String(h || '').trim().replace(/\s+/g, ''));
          idCol = findIdx(['사번', '사원번호']);
          nameCol = findIdx(['성명', '이름', '사원명']);
          dateCol = findIdx(['근무일', '근무일자', '사용일', '일자', '날짜', '휴가일자']);
        }

        if (dateCol === -1 || (nameCol === -1 && idCol === -1)) {
          alert('엑셀 파일에서 [근무일(일자)] 및 [성명(또는 사번)] 열을 찾을 수 없습니다.');
          return;
        }

        let dowCol = findIdx(['요일']);
        let typeCol = findIdx(['근태', '근태구분', '휴가구분', '구분', '연차구분', '유형', '종류']);
        let daysCol = findIdx(['차감일수', '일수', '사용일수']);
        let timeCol = findIdx(['시간코드', '근무시간코드']);
        let noteCol = findIdx(['비고', '사유', '내용', '메모']);

        let maxUsageDateObj = null;
        let usageByEmpId = {};
        let usageByName = {};
        let validRowsCount = 0;

        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;
          const rawId = idCol !== -1 ? String(row[idCol] || '').trim().replace(/[^0-9a-zA-Z]/g, '') : '';
          const rawName = nameCol !== -1 ? cleanName(row[nameCol]) : '';
          if (!rawId && !rawName) continue;

          const dateVal = row[dateCol];
          const dObj = parseExcelDate(dateVal);
          if (dObj) {
            if (!maxUsageDateObj || dObj.getTime() > maxUsageDateObj.getTime()) {
              maxUsageDateObj = dObj;
            }
          }

          const rawType = typeCol !== -1 ? String(row[typeCol] || '년차').trim() : '년차';
          const rawNote = noteCol !== -1 ? String(row[noteCol] || '').trim() : '';
          const isAbsence = (rawType.includes('결근') || rawNote.includes('결근'));
          let deduct = 1.0;
          if (isAbsence) {
            deduct = 0.0;
          } else if (daysCol !== -1 && row[daysCol] !== undefined && row[daysCol] !== '' && !isNaN(parseFloat(row[daysCol]))) {
            deduct = parseFloat(row[daysCol]);
          } else if (rawType.includes('반차') || rawType.includes('0.5') || rawType.includes('반일')) {
            deduct = 0.5;
          } else if (rawType.includes('시간') || rawType.includes('외출') || rawType.includes('조퇴')) {
            deduct = 0.0;
          }

          const dateStr = dObj ? `${dObj.getFullYear()}/${String(dObj.getMonth()+1).padStart(2,'0')}/${String(dObj.getDate()).padStart(2,'0')}` : String(dateVal || '');
          const dowStr = dowCol !== -1 ? String(row[dowCol] || '-').trim() : '-';

          const record = {
            date: dateStr,
            dateObj: dObj,
            day_of_week: dowStr,
            leave_type: isAbsence ? '결근 (개근미달)' : rawType,
            days: deduct,
            is_absence: isAbsence,
            time_code: timeCol !== -1 ? String(row[timeCol] || '').trim() : '',
            note: isAbsence ? (rawNote ? rawNote + ' [개근 미달로 월차 미발생]' : '[개근 미달로 월차 미발생]') : rawNote
          };

          if (rawId) {
            if (!usageByEmpId[rawId]) usageByEmpId[rawId] = [];
            usageByEmpId[rawId].push(record);
          }
          if (rawName) {
            if (!usageByName[rawName]) usageByName[rawName] = [];
            usageByName[rawName].push(record);
          }
          validRowsCount++;
        }

        if (validRowsCount === 0) {
          alert('유효한 사용내역 데이터를 찾지 못했습니다.');
          return;
        }

        const snwData = SNW.state ? SNW.state.snwData : null;
        if (!snwData || !snwData.employees) {
          alert('사원명부 데이터가 로드되지 않았습니다.');
          return;
        }

        // 기준일자: 업로드된 연차사용내역 파일의 가장 마지막(최신) 날짜로 설정!
        let newRefDateStr = '';
        if (maxUsageDateObj) {
          newRefDateStr = `${maxUsageDateObj.getFullYear()}/${String(maxUsageDateObj.getMonth()+1).padStart(2,'0')}/${String(maxUsageDateObj.getDate()).padStart(2,'0')}`;
          snwData.ref_date = newRefDateStr;
        }

        // 각 사원의 사용내역 및 연차 재계산
        snwData.employees.forEach(emp => {
          const empIdClean = cleanId(emp.emp_id);
          const empNameClean = cleanName(emp.name);
          const myRecords = (empIdClean && usageByEmpId[empIdClean]) || (empNameClean && usageByName[empNameClean]) || [];

          let joinObj = null;
          if (emp.join_date) {
            const jParts = emp.join_date.split(/[\/-]/);
            if (jParts.length >= 3) {
              joinObj = new Date(parseInt(jParts[0],10), parseInt(jParts[1],10)-1, parseInt(jParts[2],10));
            }
          }

          const validMyRecords = [];
          const absenceDates = [];
          myRecords.forEach(r => {
            if (!joinObj || !r.dateObj || r.dateObj >= joinObj) {
              validMyRecords.push(r);
              if (r.is_absence && r.dateObj) {
                absenceDates.push(r.dateObj);
              }
            }
          });

          const refDateForCalc = newRefDateStr || snwData.ref_date;
          if (SNW.calc && typeof SNW.calc.calculateLeave === 'function') {
            const newCalc = SNW.calc.calculateLeave(emp.join_date, refDateForCalc, absenceDates);
            if (newCalc) {
              emp.leave_calc = Object.assign(emp.leave_calc || {}, newCalc);
            }
          }

          const pStartStr = emp.leave_calc ? emp.leave_calc.period_start : null;
          const pEndStr = emp.leave_calc ? emp.leave_calc.period_end : null;
          let pStartObj = null;
          let pEndObj = null;
          if (pStartStr) {
            const sp = pStartStr.split(/[\/-]/);
            pStartObj = new Date(parseInt(sp[0],10), parseInt(sp[1],10)-1, parseInt(sp[2],10));
          }
          if (pEndStr) {
            const ep = pEndStr.split(/[\/-]/);
            pEndObj = new Date(parseInt(ep[0],10), parseInt(ep[1],10)-1, parseInt(ep[2],10));
          }

          const currUsage = [];
          const priorUsage = [];
          let totalUsedCurr = 0;

          validMyRecords.forEach(item => {
            const cleanItem = {
              date: item.date,
              day_of_week: item.day_of_week,
              leave_type: item.leave_type,
              days: item.days,
              note: item.note
            };
            if (item.dateObj && pStartObj && pEndObj) {
              if (item.dateObj >= pStartObj && item.dateObj <= pEndObj) {
                currUsage.push(cleanItem);
                totalUsedCurr += item.days;
              } else {
                priorUsage.push(cleanItem);
              }
            } else {
              currUsage.push(cleanItem);
              totalUsedCurr += item.days;
            }
          });

          currUsage.sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
          priorUsage.sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
          const allMy = currUsage.concat(priorUsage);
          allMy.sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));

          emp.current_usage = currUsage;
          emp.prior_usage = priorUsage;
          emp.all_usage = allMy;

          if (emp.leave_calc) {
            emp.leave_calc.used_days = Math.round(totalUsedCurr * 10) / 10;
            emp.leave_calc.remaining_days = Math.round(Math.max(0, emp.leave_calc.total_granted - totalUsedCurr) * 10) / 10;
            emp.leave_calc.usage_rate = emp.leave_calc.total_granted > 0 ? Math.round((totalUsedCurr / emp.leave_calc.total_granted) * 1000) / 10 : 0;
          }

          emp.leave_cycles = null;
          if (SNW.calc && typeof SNW.calc.ensureEmployeeCycles === 'function') {
            SNW.calc.ensureEmployeeCycles(emp, null, snwData, SNW.api.getTodayFormatted);
          }
        });

        snwData.summary = calculateAdminSummary(snwData.employees);

        const gasApiUrl = localStorage.getItem('snw_gas_url') || '';
        SNW.api.updateSystemDateDisplay(snwData.ref_date, gasApiUrl, snwData);

        populateSettlementMonthSelect();
        if (currentAdminTab === 'settlement') {
          renderSettlementView();
        } else {
          renderAdminSummary();
          renderAdminTable();
        }

        const displayDate = snwData.ref_date ? snwData.ref_date.replace(/[\/-]/g, '.') : '알 수 없음';
        alert(`[연차사용내역 최신화 완료]\n총 ${validRowsCount}건의 사용내역 데이터가 정상 반영되었습니다.\n기준일자가 연차사용내역의 최종일인 [${displayDate}]로 자동 갱신되었습니다.`);
      } catch (err) {
        alert('연차사용내역 엑셀 파일 분석 중 오류가 발생했습니다: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleRosterFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        let targetSheetName = wb.SheetNames.find(n => n.includes('사원') || n.includes('명부') || n.includes('직원')) || wb.SheetNames[0];
        const ws = wb.Sheets[targetSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rows || rows.length < 2) {
          alert('업로드한 사원명부 파일에 유효한 데이터가 없습니다.');
          return;
        }
        alert('사원명부 파일이 확인되었습니다.');
      } catch (err) {
        alert('사원명부 엑셀 파일 분석 중 오류가 발생했습니다: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function setupAdminEvents() {
    if (adminModeBtn) {
      adminModeBtn.addEventListener('click', () => openAdminView());
    }
    if (btnCloseAdminBtn) {
      btnCloseAdminBtn.addEventListener('click', closeAdminView);
    }
    if (adminLogoutHeaderBtn) {
      adminLogoutHeaderBtn.addEventListener('click', closeAdminView);
    }

    if (adminSearchInput) adminSearchInput.addEventListener('input', renderAdminTable);
    if (adminCycleYearFilter) adminCycleYearFilter.addEventListener('change', renderAdminTable);
    if (adminDeptFilter) adminDeptFilter.addEventListener('change', renderAdminTable);
    if (adminSortFilter) adminSortFilter.addEventListener('change', renderAdminTable);

    if (adminTenureFilter) {
      adminTenureFilter.querySelectorAll('.tenure-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const filter = btn.getAttribute('data-tenure');
          setTenureFilter(filter);
        });
      });
    }

    if (btnExportAllExcel) {
      btnExportAllExcel.addEventListener('click', () => {
        if (!currentAdminList || currentAdminList.length === 0) return;

        const rows = currentAdminList.map(emp => {
          const calc = emp.leave_calc || {};
          const cYear = SNW.calc.getEmployeeCycleYear(emp);
          return {
            '사번': emp.emp_id,
            '성명': emp.name,
            '근속구분': calc.is_under_1_year ? '1년미만(월차)' : '1년이상',
            '부서': emp.dept,
            '직위': emp.position || emp.rank || '사원',
            '근무조': emp.shift || '정규직',
            '입사일자': emp.join_date,
            '근속기간': emp.service_text,
            '연차주기연도': cYear ? `${cYear}년` : '-',
            '산정주기': `${calc.period_start || '-'} ~ ${calc.period_end || '-'}`,
            '총발생연차': calc.total_granted,
            '사용연차': calc.used_days,
            '남은연차': calc.remaining_days,
            '사용률(%)': calc.usage_rate,
            '산정규정': calc.rule_description
          };
        });

        if (window.XLSX) {
          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "전직원연차현황");
          const gasApiUrl = localStorage.getItem('snw_gas_url') || '';
          const snwData = SNW.state ? SNW.state.snwData : null;
          const fileRefDate = (gasApiUrl ? SNW.api.getTodayFormatted('') : ((snwData && snwData.ref_date) ? snwData.ref_date.replace(/[\/-]/g,'') : SNW.api.getTodayFormatted('')));
          XLSX.writeFile(wb, `(주)에스앤더블류_전직원_연차현황_${fileRefDate}.xlsx`);
        } else {
          alert('Excel 라이브러리를 로딩 중입니다.');
        }
      });
    }

    const tabOverview = document.getElementById('btnAdminTabOverview');
    const tabSettlement = document.getElementById('btnAdminTabSettlement');
    if (tabOverview) {
      tabOverview.addEventListener('click', () => switchAdminTab('overview'));
    }
    if (tabSettlement) {
      tabSettlement.addEventListener('click', () => switchAdminTab('settlement'));
    }

    const monthSel = document.getElementById('settlementMonthSelect');
    if (monthSel) {
      monthSel.addEventListener('change', (e) => {
        currentSettlementMonth = parseInt(e.target.value, 10);
        renderSettlementView();
      });
    }

    const filterModeSel = document.getElementById('settlementFilterMode');
    if (filterModeSel) {
      filterModeSel.addEventListener('change', renderSettlementView);
    }

    const deptFilterSel = document.getElementById('settlementDeptFilter');
    if (deptFilterSel) {
      deptFilterSel.addEventListener('change', renderSettlementView);
    }

    const searchInput = document.getElementById('settlementSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', renderSettlementView);
    }

    const sortSel = document.getElementById('settlementSortFilter');
    if (sortSel) {
      sortSel.addEventListener('change', renderSettlementView);
    }

    const btnExportSettlement = document.getElementById('btnExportSettlement');
    if (btnExportSettlement) {
      btnExportSettlement.addEventListener('click', exportSettlementToExcel);
    }

    const wageInput = document.getElementById('uploadWageInput');
    if (wageInput) {
      wageInput.addEventListener('change', handleWageFileUpload);
    }
    const btnUploadWage = document.getElementById('btnUploadWage');
    if (btnUploadWage && wageInput) {
      btnUploadWage.addEventListener('click', () => wageInput.click());
    }

    const usageInput = document.getElementById('uploadUsageInput');
    if (usageInput) {
      usageInput.addEventListener('change', handleUsageFileUpload);
    }

    const rosterInput = document.getElementById('uploadRosterInput');
    if (rosterInput) {
      rosterInput.addEventListener('change', handleRosterFileUpload);
    }

    const btnAdminRefresh = document.getElementById('btnAdminRefresh');
    if (btnAdminRefresh) {
      btnAdminRefresh.addEventListener('click', () => loadAdminDataFromGas(true, false));
    }
  }

  // Export to SNW namespace
  SNW.admin = {
    openAdminView,
    closeAdminView,
    loadAdminDataFromGas,
    renderAdminSummary,
    renderAdminTable,
    renderSettlementView,
    populateAdminCycleYearOptions,
    populateAdminDeptOptions,
    populateSettlementMonthSelect,
    populateSettlementDeptOptions,
    setupAdminEvents
  };

})(window.SNW);
