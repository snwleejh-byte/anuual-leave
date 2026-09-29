/**
 * ==============================================================================
 * js/dashboard.js - 사원 개인 연차 대시보드 및 사용 내역 모듈
 * (주)에스앤더블류 임직원 연차 조회 시스템
 * ==============================================================================
 */

window.SNW = window.SNW || {};

(function (SNW) {
  'use strict';

  // DOM Elements
  const empAvatar = document.getElementById('empAvatar');
  const empName = document.getElementById('empName');
  const empPosition = document.getElementById('empPosition');
  const empDept = document.getElementById('empDept');
  const empShift = document.getElementById('empShift');
  const empId = document.getElementById('empId');
  const empJoinDate = document.getElementById('empJoinDate');
  const empServiceText = document.getElementById('empServiceText');

  const prevCycleBanner = document.getElementById('prevCycleBanner');
  const prevCycleBannerTitle = document.getElementById('prevCycleBannerTitle');
  const prevCycleBannerDesc = document.getElementById('prevCycleBannerDesc');
  const btnReturnToCurrentCycle = document.getElementById('btnReturnToCurrentCycle');
  const btnPrevCycle = document.getElementById('btnPrevCycle');
  const btnNextCycle = document.getElementById('btnNextCycle');
  const kpiPeriodName = document.getElementById('kpiPeriodName');

  const kpiPeriodTitle = document.getElementById('kpiPeriodTitle');
  const kpiPeriod = document.getElementById('kpiPeriod');
  const kpiDDay = document.getElementById('kpiDDay');
  const kpiNextRenewal = document.getElementById('kpiNextRenewal');
  const kpiGranted = document.getElementById('kpiGranted');
  const kpiRuleDesc = document.getElementById('kpiRuleDesc');
  const kpiUsed = document.getElementById('kpiUsed');
  const kpiUsedDetail = document.getElementById('kpiUsedDetail');
  const kpiRemaining = document.getElementById('kpiRemaining');
  const kpiProgressFill = document.getElementById('kpiProgressFill');
  const kpiUsageRate = document.getElementById('kpiUsageRate');
  const kpiRemainingRate = document.getElementById('kpiRemainingRate');
  const underOneYearBanner = document.getElementById('underOneYearBanner');

  const cycleTabGroup = document.getElementById('cycleTabGroup');
  const tabCurrentPeriod = document.getElementById('tabCurrentPeriod');
  const tabAllPeriod = document.getElementById('tabAllPeriod');
  const usageCountBadge = document.getElementById('usageCountBadge');
  const usageSearchInput = document.getElementById('usageSearchInput');
  const usageTypeFilter = document.getElementById('usageTypeFilter');
  const usageTableBody = document.getElementById('usageTableBody');
  const usageEmptyState = document.getElementById('usageEmptyState');
  const btnExportMyUsage = document.getElementById('btnExportMyUsage');
  const btnPrintMyUsage = document.getElementById('btnPrintMyUsage');

  let currentEmp = null;
  let selectedCycleIndex = 0;
  let currentUsageMode = 'cycle'; // 'cycle' or 'all'

  function getCycles(emp) {
    const gasApiUrl = localStorage.getItem('snw_gas_url') || '';
    const snwData = SNW.state ? SNW.state.snwData : null;
    const getToday = SNW.api ? SNW.api.getTodayFormatted : null;
    return SNW.calc.ensureEmployeeCycles(emp, gasApiUrl, snwData, getToday);
  }

  function renderEmployeeDashboard(emp) {
    currentEmp = emp;
    if (SNW.state) SNW.state.currentEmp = emp;

    if (empAvatar) empAvatar.textContent = emp.name.charAt(0);
    if (empName) empName.textContent = emp.name;
    if (empPosition) empPosition.textContent = emp.position || emp.rank || '사원';
    if (empDept) empDept.textContent = emp.dept || '-';
    if (empShift) empShift.textContent = emp.shift || '정규직';
    if (empId) empId.textContent = emp.emp_id;
    if (empJoinDate) empJoinDate.textContent = emp.join_date;
    if (empServiceText) empServiceText.textContent = emp.service_text;

    selectedCycleIndex = 0;
    currentUsageMode = 'cycle';
    if (tabCurrentPeriod) tabCurrentPeriod.classList.add('active');
    if (tabAllPeriod) tabAllPeriod.classList.remove('active');
    if (usageSearchInput) usageSearchInput.value = '';
    selectCycle(0);
  }

  function selectCycle(index) {
    if (!currentEmp) return;
    const cycles = getCycles(currentEmp);
    if (!cycles || cycles.length === 0) return;

    selectedCycleIndex = Math.max(0, Math.min(cycles.length - 1, index));
    const cycle = cycles[selectedCycleIndex];

    if (btnNextCycle) {
      btnNextCycle.disabled = (selectedCycleIndex === 0);
      const nextCycle = cycles[selectedCycleIndex - 1];
      btnNextCycle.title = nextCycle ? `다음 주기(${nextCycle.cycle_label}) 보기` : '최신 연차 주기입니다';
    }
    if (btnPrevCycle) {
      btnPrevCycle.disabled = (selectedCycleIndex >= cycles.length - 1);
      const prevCycle = cycles[selectedCycleIndex + 1];
      btnPrevCycle.title = prevCycle ? `이전 주기(${prevCycle.cycle_label}) 보기` : '이전 연차 주기가 없습니다';
    }

    if (kpiPeriodTitle) {
      kpiPeriodTitle.textContent = cycle.is_current ? '현재 연차 적용 주기' : `${cycle.cycle_label}`;
    }
    if (kpiPeriod) kpiPeriod.textContent = `${cycle.period_start} ~ ${cycle.period_end}`;
    if (kpiPeriodName) {
      const pNameShort = cycle.period_name ? cycle.period_name.split('(')[0].trim() : `${cycle.completed_years || 1}년차`;
      kpiPeriodName.textContent = pNameShort;
    }

    if (kpiDDay && kpiNextRenewal) {
      if (cycle.is_current) {
        if (currentEmp.leave_calc && currentEmp.leave_calc.d_day >= 0) {
          kpiDDay.textContent = `D-${currentEmp.leave_calc.d_day}일 남음`;
          kpiDDay.className = 'status-pill status-active';
        } else {
          kpiDDay.textContent = `기간 경과`;
          kpiDDay.className = 'status-pill';
        }
        kpiNextRenewal.textContent = `다음 연차 갱신: ${cycle.next_renewal_date}`;
      } else {
        kpiDDay.textContent = `사용 기한 만료`;
        kpiDDay.className = 'status-pill';
        kpiNextRenewal.textContent = `차기 연차 이관 완료 (${cycle.next_renewal_date})`;
      }
    }

    if (kpiGranted) kpiGranted.textContent = cycle.total_granted.toFixed(1);

    if (kpiRuleDesc) {
      if (cycle.absence_months_deducted > 0) {
        kpiRuleDesc.innerHTML = `${cycle.rule_description}<br><span class="badge badge-danger" style="margin-top:4px; font-size:0.75rem; display:inline-block;">⚠️ 개근 미달(결근) ${cycle.absence_months_deducted}개월 미발생 반영</span>`;
      } else {
        kpiRuleDesc.textContent = cycle.rule_description;
      }
    }

    if (kpiUsed) kpiUsed.textContent = cycle.used_days.toFixed(1);

    const cUsage = cycle.usage_list || [];
    const fullCount = cUsage.filter(u => u.leave_type.includes('년차')).length;
    const halfCount = cUsage.filter(u => u.leave_type.includes('반차')).length;
    if (kpiUsedDetail) {
      if (cUsage.length > 0) {
        kpiUsedDetail.textContent = `종일 ${fullCount}회 · 반차 ${halfCount}회 사용`;
      } else {
        kpiUsedDetail.textContent = `해당 주기 연차 사용 내역 없음`;
      }
    }

    if (kpiRemaining) kpiRemaining.textContent = cycle.remaining_days.toFixed(1);

    let usagePct = cycle.usage_rate;
    let remPct = (100 - usagePct).toFixed(1);
    if (cycle.total_granted === 0) {
      usagePct = 0;
      remPct = 0;
    }
    if (kpiProgressFill) kpiProgressFill.style.width = `${Math.min(100, Math.max(0, 100 - usagePct))}%`;
    if (kpiUsageRate) kpiUsageRate.textContent = `사용률 ${usagePct}%`;
    if (kpiRemainingRate) kpiRemainingRate.textContent = `잔여율 ${remPct}%`;

    if (underOneYearBanner) {
      if (cycle.is_under_1_year && cycle.is_current) {
        underOneYearBanner.style.display = 'flex';
      } else {
        underOneYearBanner.style.display = 'none';
      }
    }

    if (prevCycleBanner) {
      if (!cycle.is_current) {
        prevCycleBanner.style.display = 'flex';
        if (prevCycleBannerTitle) {
          prevCycleBannerTitle.textContent = `📜 ${cycle.cycle_label} (${cycle.period_name}) 조회 중`;
        }
        if (prevCycleBannerDesc) {
          prevCycleBannerDesc.innerHTML = `해당 주기의 법정 발생 <strong>${cycle.total_granted.toFixed(1)}일</strong> 중 <strong>${cycle.used_days.toFixed(1)}일</strong>이 사용되었으며, 마감 시점 잔여 연차는 <strong>${cycle.remaining_days.toFixed(1)}일</strong>입니다. (사용 기간 만료)`;
        }
      } else {
        prevCycleBanner.style.display = 'none';
      }
    }

    updateCycleTabs();
    renderUsageTable();
  }

  function updateCycleTabs() {
    if (!cycleTabGroup || !currentEmp) return;
    const cycles = getCycles(currentEmp);
    const allList = currentEmp.all_usage || (currentEmp.current_usage || []).concat(currentEmp.prior_usage || []);
    const allTotalCount = allList.length;

    cycleTabGroup.innerHTML = '';

    if (cycles.length <= 3) {
      cycles.forEach((c, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isCycleActive = (currentUsageMode === 'cycle' && selectedCycleIndex === idx);
        btn.className = `tab-btn ${isCycleActive ? 'active' : ''}`;
        
        const count = (c.usage_list || []).length;
        let shortLabel = c.is_current ? '현재 주기' : c.cycle_label;
        btn.textContent = `${shortLabel} (${count}건)`;
        btn.title = `${c.period_name || c.cycle_label} 사용 내역 보기`;

        btn.addEventListener('click', () => {
          currentUsageMode = 'cycle';
          selectCycle(idx);
        });
        cycleTabGroup.appendChild(btn);
      });
    } else {
      const c0 = cycles[0];
      const count0 = (c0.usage_list || []).length;
      const isCurrActive = (currentUsageMode === 'cycle' && selectedCycleIndex === 0);
      const btn0 = document.createElement('button');
      btn0.type = 'button';
      btn0.className = `tab-btn ${isCurrActive ? 'active' : ''}`;
      btn0.textContent = `현재 주기 (${count0}건)`;
      btn0.title = `${c0.period_name || '현재 연차 주기'} 사용 내역 보기`;
      btn0.addEventListener('click', () => {
        currentUsageMode = 'cycle';
        selectCycle(0);
      });
      cycleTabGroup.appendChild(btn0);

      const c1 = cycles[1];
      const count1 = (c1.usage_list || []).length;
      const isPrevActive = (currentUsageMode === 'cycle' && selectedCycleIndex === 1);
      const btn1 = document.createElement('button');
      btn1.type = 'button';
      btn1.className = `tab-btn ${isPrevActive ? 'active' : ''}`;
      btn1.textContent = `직전 연차 주기 (${count1}건)`;
      btn1.title = `${c1.period_name || '직전 연차 주기'} 사용 내역 보기`;
      btn1.addEventListener('click', () => {
        currentUsageMode = 'cycle';
        selectCycle(1);
      });
      cycleTabGroup.appendChild(btn1);

      const isOlderActive = (currentUsageMode === 'cycle' && selectedCycleIndex >= 2);
      const selectWrap = document.createElement('div');
      selectWrap.className = 'cycle-select-wrap';

      const select = document.createElement('select');
      select.className = `cycle-select ${isOlderActive ? 'active' : ''}`;
      select.title = '과거 연차 주기 선택';

      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      const olderCount = cycles.length - 2;
      if (isOlderActive && cycles[selectedCycleIndex]) {
        const activeCycle = cycles[selectedCycleIndex];
        const activeCount = (activeCycle.usage_list || []).length;
        defaultOpt.textContent = `📜 ${activeCycle.cycle_label} (${activeCount}건)`;
      } else {
        defaultOpt.textContent = `📜 이전 주기 (${olderCount}개) ▾`;
      }
      defaultOpt.disabled = true;
      if (!isOlderActive) {
        defaultOpt.selected = true;
      }
      select.appendChild(defaultOpt);

      for (let i = 2; i < cycles.length; i++) {
        const c = cycles[i];
        const count = (c.usage_list || []).length;
        const opt = document.createElement('option');
        opt.value = String(i);
        if (isOlderActive && selectedCycleIndex === i) {
          opt.selected = true;
        }
        const periodShort = (c.period_start && c.period_end) ? ` · ${c.period_start.slice(2)}~${c.period_end.slice(2)}` : '';
        const usageTag = count > 0 ? ` [${count}건]` : ' (0건)';
        opt.textContent = `${c.cycle_label}${usageTag}${periodShort}`;
        select.appendChild(opt);
      }

      select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        if (!isNaN(idx)) {
          currentUsageMode = 'cycle';
          selectCycle(idx);
        }
      });

      selectWrap.appendChild(select);
      cycleTabGroup.appendChild(selectWrap);
    }

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `tab-btn ${currentUsageMode === 'all' ? 'active' : ''}`;
    allBtn.textContent = `전체 이력 (총 ${allTotalCount}건)`;
    allBtn.title = '모든 주기 연차 사용 내역 합산 보기';
    allBtn.addEventListener('click', () => {
      currentUsageMode = 'all';
      updateCycleTabs();
      renderUsageTable();
    });
    cycleTabGroup.appendChild(allBtn);
  }

  function renderUsageTable() {
    if (!currentEmp) return;
    const cycles = getCycles(currentEmp);
    const selectedCycle = cycles[selectedCycleIndex] || cycles[0];

    const sourceList = (currentUsageMode === 'cycle' || currentUsageMode === 'current')
      ? (selectedCycle ? (selectedCycle.usage_list || []) : (currentEmp.current_usage || []))
      : (currentEmp.all_usage || currentEmp.current_usage || []);

    const searchVal = usageSearchInput ? usageSearchInput.value.trim().toLowerCase() : '';
    const typeVal = usageTypeFilter ? usageTypeFilter.value : 'all';

    const filtered = sourceList.filter(item => {
      if (typeVal !== 'all' && !item.leave_type.includes(typeVal)) return false;
      if (searchVal) {
        const text = `${item.date} ${item.day_of_week} ${item.leave_type} ${item.note} ${item.time_code} ${item.cycle_label || ''}`.toLowerCase();
        if (!text.includes(searchVal)) return false;
      }
      return true;
    });

    const allList = currentEmp.all_usage || (currentEmp.current_usage || []).concat(currentEmp.prior_usage || []);
    const allTotalCount = allList.length;
    if (usageCountBadge) {
      if (currentUsageMode === 'cycle' || currentUsageMode === 'current') {
        usageCountBadge.textContent = (allTotalCount > filtered.length)
          ? `선택 주기 ${filtered.length}건 (전체 ${allTotalCount}건)`
          : `총 ${filtered.length}건`;
      } else {
        usageCountBadge.textContent = `총 ${filtered.length}건`;
      }
    }

    if (!usageTableBody) return;

    if (filtered.length === 0) {
      usageTableBody.innerHTML = '';
      if (usageEmptyState) usageEmptyState.style.display = 'block';
      return;
    }

    if (usageEmptyState) usageEmptyState.style.display = 'none';
    usageTableBody.innerHTML = filtered.map((item, idx) => {
      const isAbsence = item.is_absence || item.leave_type.includes('결근');
      const isFull = item.leave_type.includes('년차');
      const pillClass = isAbsence ? 'type-pill badge-danger' : (isFull ? 'type-pill type-full' : 'type-pill type-half');
      const daysText = isAbsence ? '<span class="text-danger" style="font-size:0.82rem; font-weight:700;">0.0일 (월차 미발생)</span>' : `<strong>${item.days.toFixed(1)}일</strong>`;
      
      const cycleLabel = item.cycle_label || (selectedCycle ? selectedCycle.cycle_label : '연차 주기');
      const isCurrCycle = (item.cycle_id === 'cycle_curr' || cycleLabel === '현재 연차 주기');
      const cycleBadgeClass = isCurrCycle ? 'badge-cycle-current' : 'badge-cycle-prev';

      return `
        <tr class="${isAbsence ? 'row-absence' : ''}">
          <td>${idx + 1}</td>
          <td><strong>${item.date}</strong></td>
          <td>${item.day_of_week || '-'}</td>
          <td><span class="badge-cycle ${cycleBadgeClass}">${cycleLabel}</span></td>
          <td><span class="${pillClass}">${item.leave_type}</span></td>
          <td>${daysText}</td>
          <td>${item.note || (isAbsence ? '<span class="text-danger">개근 미달로 해당 월 월차 미발생</span>' : '-')}</td>
        </tr>
      `;
    }).join('');
  }

  function setupDashboardEvents() {
    if (btnPrevCycle) {
      btnPrevCycle.addEventListener('click', () => {
        selectCycle(selectedCycleIndex + 1);
      });
    }

    if (btnNextCycle) {
      btnNextCycle.addEventListener('click', () => {
        selectCycle(selectedCycleIndex - 1);
      });
    }

    if (btnReturnToCurrentCycle) {
      btnReturnToCurrentCycle.addEventListener('click', () => {
        selectCycle(0);
      });
    }

    if (usageSearchInput) {
      usageSearchInput.addEventListener('input', renderUsageTable);
    }
    if (usageTypeFilter) {
      usageTypeFilter.addEventListener('change', renderUsageTable);
    }

    if (btnExportMyUsage) {
      btnExportMyUsage.addEventListener('click', () => {
        if (!currentEmp) return;
        const cycles = getCycles(currentEmp);
        const selectedCycle = cycles[selectedCycleIndex] || cycles[0];
        const isCycleMode = (currentUsageMode === 'cycle' || currentUsageMode === 'current');
        const sourceList = isCycleMode ? (selectedCycle ? (selectedCycle.usage_list || []) : []) : (currentEmp.all_usage || []);
        
        const rows = sourceList.map((item, idx) => ({
          '순번': idx + 1,
          '사번': currentEmp.emp_id,
          '성명': currentEmp.name,
          '부서': currentEmp.dept,
          '근무일자': item.date,
          '요일': item.day_of_week,
          '적용주기': item.cycle_label || (selectedCycle ? selectedCycle.cycle_label : '-'),
          '근태구분': item.leave_type,
          '차감일수': item.days,
          '비고': item.note
        }));

        if (window.XLSX) {
          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "연차사용내역");
          const cycleSuffix = isCycleMode ? (selectedCycle ? selectedCycle.cycle_label.replace(/\s+/g, '') : '선택주기') : '전체이력';
          XLSX.writeFile(wb, `${currentEmp.name}_연차사용내역_${cycleSuffix}.xlsx`);
        } else {
          alert('Excel 라이브러리를 불러오는 중입니다.');
        }
      });
    }

    if (btnPrintMyUsage) {
      btnPrintMyUsage.addEventListener('click', () => {
        window.print();
      });
    }
  }

  // Export to SNW namespace
  SNW.dashboard = {
    renderEmployeeDashboard,
    selectCycle,
    renderUsageTable,
    setupDashboardEvents,
    getCurrentEmployee: () => currentEmp
  };

})(window.SNW);
