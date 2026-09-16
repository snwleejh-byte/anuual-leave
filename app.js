/**
 * (주)에스앤더블류 임직원 연차 조회 시스템 - Core Logic (app.js)
 * 근로기준법 제60조 및 취업규정 기반 입사일 기준 연차 산정 및 대시보드
 */

(function () {
  'use strict';

  // State
  // State
  let snwData = null;
  let currentEmp = null;
  let selectedCycleIndex = 0; // 0 = current cycle, 1 = previous cycle 1, etc.
  let currentUsageMode = 'cycle'; // 'cycle' or 'all'
  let currentAdminList = [];
  const DEFAULT_GAS_URL = '';
  let gasApiUrl = localStorage.getItem('snw_gas_url') || DEFAULT_GAS_URL;

  // DOM Elements
  const btnHeaderBack = document.getElementById('btnHeaderBack');
  const btnHeaderBackText = document.getElementById('btnHeaderBackText');
  const btnDashBack = document.getElementById('btnDashBack');
  const btnDashBackText = document.getElementById('btnDashBackText');
  let isViewingFromAdmin = false;
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const adminModeBtn = document.getElementById('adminModeBtn');
  const btnCloseAdminBtn = document.getElementById('btnCloseAdminBtn');
  const configApiBtn = document.getElementById('configApiBtn');

  // API Modal Elements
  const apiModal = document.getElementById('apiModal');
  const btnCloseApiModal = document.getElementById('btnCloseApiModal');
  const inputGasUrl = document.getElementById('inputGasUrl');
  const apiStatusText = document.getElementById('apiStatusText');
  const apiStatusBox = document.getElementById('apiStatusBox');
  const btnTestApi = document.getElementById('btnTestApi');
  const btnSaveApi = document.getElementById('btnSaveApi');
  
  // Sections
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const adminSection = document.getElementById('adminSection');

  // Login Form & Tab Elements
  const tabEmployeeBtn = document.getElementById('tabEmployeeBtn');
  const tabAdminBtn = document.getElementById('tabAdminBtn');
  const employeeLoginWrapper = document.getElementById('employeeLoginWrapper');
  const adminLoginWrapper = document.getElementById('adminLoginWrapper');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const inputAdminId = document.getElementById('inputAdminId');
  const inputAdminPw = document.getElementById('inputAdminPw');
  const adminLoginError = document.getElementById('adminLoginError');
  const submitAdminLoginBtn = document.getElementById('submitAdminLoginBtn');
  const adminHeaderControls = document.getElementById('adminHeaderControls');
  const adminLogoutHeaderBtn = document.getElementById('adminLogoutHeaderBtn');
  const loginHeaderIcon = document.getElementById('loginHeaderIcon');
  const loginHeaderTitle = document.getElementById('loginHeaderTitle');
  const loginHeaderDesc = document.getElementById('loginHeaderDesc');

  const loginForm = document.getElementById('loginForm');
  const inputName = document.getElementById('inputName');
  const inputBirth = document.getElementById('inputBirth');
  const loginError = document.getElementById('loginError');
  const submitLoginBtn = document.getElementById('submitLoginBtn');
  const demoChipsContainer = document.getElementById('demoChipsContainer');

  // Dashboard Elements
  const empAvatar = document.getElementById('empAvatar');
  const empName = document.getElementById('empName');
  const empPosition = document.getElementById('empPosition');
  const empDept = document.getElementById('empDept');
  const empShift = document.getElementById('empShift');
  const empId = document.getElementById('empId');
  const empJoinDate = document.getElementById('empJoinDate');
  const empServiceText = document.getElementById('empServiceText');
  const logoutBtn = document.getElementById('logoutBtn');

  // Cycle Arrow Navigation & Previous Cycle Banner Elements
  const prevCycleBanner = document.getElementById('prevCycleBanner');
  const prevCycleBannerTitle = document.getElementById('prevCycleBannerTitle');
  const prevCycleBannerDesc = document.getElementById('prevCycleBannerDesc');
  const btnReturnToCurrentCycle = document.getElementById('btnReturnToCurrentCycle');
  const btnPrevCycle = document.getElementById('btnPrevCycle');
  const btnNextCycle = document.getElementById('btnNextCycle');
  const kpiPeriodName = document.getElementById('kpiPeriodName');

  // KPI Elements
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

  // Usage Table Elements
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

  // Admin Elements
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
  const uploadRosterInput = document.getElementById('uploadRosterInput');
  const uploadUsageInput = document.getElementById('uploadUsageInput');

  let currentTenureFilter = 'all'; // 'all' | 'under1' | 'over1'

  // 1. Initialization
  async function init() {
    initTheme();
    setupEventListeners();
    initApiConfig();
    initLoginTabs();
    initTenureFilters();

    // 0. Load data from window.SNW_DATA or fetch data.json first
    if (window.SNW_DATA) {
      snwData = window.SNW_DATA;
    } else {
      try {
        const resp = await fetch('data.json');
        snwData = await resp.json();
      } catch (err) {
        console.warn('Local data.json not loaded, using remote GAS mode if configured.');
        const demoBox = document.querySelector('.quick-demo-box');
        if (demoBox) demoBox.style.display = 'none';
      }
    }

    if (snwData) {
      onDataLoaded();
    }

    // 브라우저 뒤로가기 시 사이트 밖(구글 등)으로 튕기는 문제 방지: 초기 상태를 login으로 등록
    if (!history.state) {
      history.replaceState({ view: 'login' }, '', window.location.pathname + window.location.search);
    }

    if (sessionStorage.getItem('snw_is_admin') === 'true') {
      openAdminView(false);
      history.replaceState({ view: 'admin' }, '', '#admin');
      return;
    }
  }

  function onDataLoaded() {
    renderDemoChips();
    populateAdminCycleYearOptions();
    populateAdminDeptOptions();
    populateSettlementMonthSelect();
    populateSettlementDeptOptions();
    checkSessionLogin();
  }

  // API Config Modal Handlers
  function initApiConfig() {
    if (gasApiUrl) {
      inputGasUrl.value = gasApiUrl;
      apiStatusBox.classList.add('connected');
      apiStatusText.textContent = '구글 시트 실시간 연동 활성화됨';
      configApiBtn.classList.add('active');
    }

    configApiBtn.addEventListener('click', () => {
      apiModal.style.display = 'flex';
    });

    btnCloseApiModal.addEventListener('click', () => {
      apiModal.style.display = 'none';
    });

    btnSaveApi.addEventListener('click', () => {
      const val = inputGasUrl.value.trim();
      gasApiUrl = val;
      if (val) {
        localStorage.setItem('snw_gas_url', val);
        apiStatusBox.classList.add('connected');
        apiStatusText.textContent = '구글 시트 실시간 연동 활성화됨';
        alert('구글 시트 연동 주소가 성공적으로 저장되었습니다!');
      } else {
        localStorage.removeItem('snw_gas_url');
        apiStatusBox.classList.remove('connected');
        apiStatusText.textContent = '현재: 로컬 데이터 모드로 동작 중';
        alert('로컬 데이터 모드로 전환되었습니다.');
      }
      apiModal.style.display = 'none';
    });

    btnTestApi.addEventListener('click', async () => {
      const url = inputGasUrl.value.trim();
      if (!url) {
        alert('구글 앱스 스크립트 웹 앱 URL을 입력해주세요.');
        return;
      }
      btnTestApi.textContent = '테스트 중...';
      try {
        const resp = await fetch(`${url}?action=ping`, { method: 'GET', redirect: 'follow' });
        if (resp.status === 404) {
          throw new Error('404 Not Found (배포 주소를 찾을 수 없음)\n\n구글 시트 Apps Script 화면에서 [배포] -> [새 배포]를 누르고 [배포] 버튼을 클릭해 배포를 완료했는지 확인해주세요.');
        }
        const data = await resp.json();
        if (data.success) {
          alert('연결 성공! 구글 시트와 정상적으로 통신되었습니다.');
          apiStatusBox.classList.add('connected');
          apiStatusText.textContent = '구글 시트 연동 정상';
        } else {
          alert('연결 실패: ' + (data.message || '응답 없음'));
        }
      } catch (err) {
        alert('연결 오류: ' + (err.message || err));
      } finally {
        btnTestApi.textContent = '연결 테스트';
      }
    });
  }

  // 2. Theme Management
  function initTheme() {
    const saved = localStorage.getItem('snw_theme') || 'theme-light';
    document.body.className = saved;
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.contains('theme-dark');
      const nextTheme = isDark ? 'theme-light' : 'theme-dark';
      document.body.className = nextTheme;
      localStorage.setItem('snw_theme', nextTheme);
    });
  }

  // 3. Quick Demo Selector
  function renderDemoChips() {
    if (!demoChipsContainer || !snwData || !snwData.employees) return;
    
    // Pick interesting sample employees
    const demoCandidates = ['정우진', '강동석', '고석진', '정보람', '석윤미', '임원천'];
    const selected = [];
    
    demoCandidates.forEach(targetName => {
      const found = snwData.employees.find(e => e.name === targetName);
      if (found) selected.push(found);
    });

    demoChipsContainer.innerHTML = '';
    selected.forEach(emp => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'demo-chip';
      const labelDesc = emp.leave_calc.is_under_1_year ? '1년미만 신입' : `${emp.service_years}년근속`;
      chip.innerHTML = `<strong>${emp.name}</strong> (${emp.dept} · ${labelDesc})`;
      chip.addEventListener('click', () => {
        inputName.value = emp.name;
        inputBirth.value = emp.birth_info.birth6;
        loginForm.dispatchEvent(new Event('submit'));
      });
      demoChipsContainer.appendChild(chip);
    });
  }

  // 3.5 Login Tabs (Employee vs Admin Mode)
  function initLoginTabs() {
    if (!tabEmployeeBtn || !tabAdminBtn) return;

    tabEmployeeBtn.addEventListener('click', () => switchLoginTab('employee'));
    tabAdminBtn.addEventListener('click', () => switchLoginTab('admin'));

    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const idVal = inputAdminId.value.trim();
        const pwVal = inputAdminPw.value.trim();

        if (idVal !== 'snw' || pwVal !== '2524') {
          adminLoginError.innerHTML = '<strong>[로그인 실패]</strong> 관리자 아이디 또는 비밀번호가 올바르지 않습니다.<br><small style="color:var(--text-secondary);">인사담당자 전용 관리자 계정 정보를 확인해주세요.</small>';
          adminLoginError.style.display = 'block';
          return;
        }

        // Success
        adminLoginError.style.display = 'none';
        sessionStorage.setItem('snw_is_admin', 'true');
        openAdminView();
      });
    }
  }

  function switchLoginTab(type) {
    if (type === 'employee') {
      tabEmployeeBtn.classList.add('active');
      tabAdminBtn.classList.remove('active');
      employeeLoginWrapper.style.display = 'block';
      adminLoginWrapper.style.display = 'none';
      if (loginHeaderIcon) loginHeaderIcon.textContent = '🔐';
      if (loginHeaderTitle) loginHeaderTitle.textContent = '본인 확인 및 연차 조회';
      if (loginHeaderDesc) loginHeaderDesc.innerHTML = '사번을 몰라도 <strong>이름</strong>과 <strong>생년월일</strong>로 간편하게 조회할 수 있습니다.';
      loginError.style.display = 'none';
    } else {
      tabAdminBtn.classList.add('active');
      tabEmployeeBtn.classList.remove('active');
      employeeLoginWrapper.style.display = 'none';
      adminLoginWrapper.style.display = 'block';
      if (loginHeaderIcon) loginHeaderIcon.textContent = '🏢';
      if (loginHeaderTitle) loginHeaderTitle.textContent = '관리자 시스템 로그인';
      if (loginHeaderDesc) loginHeaderDesc.innerHTML = '전 사원 연차 관리 대시보드에 접근하기 위한 <strong>관리자 인증</strong>입니다.';
      if (adminLoginError) adminLoginError.style.display = 'none';
      if (inputAdminId) inputAdminId.focus();
    }
  }

  // 4. Login & Authentication (Local + Google Apps Script Remote)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const rawName = inputName.value.trim();
    const rawBirth = inputBirth.value.trim().replace(/[^0-9]/g, '');

    if (!rawName) {
      showLoginError('성명을 입력해주세요.');
      return;
    }
    if (!rawBirth || (rawBirth.length !== 6 && rawBirth.length !== 8)) {
      showLoginError('생년월일 6자리(YYMMDD) 또는 8자리(YYYYMMDD)를 입력해주세요.');
      return;
    }

    // A. If Google Apps Script URL is configured: Call Remote Secure API!
    if (gasApiUrl) {
      const originalText = submitLoginBtn.innerHTML;
      submitLoginBtn.disabled = true;
      submitLoginBtn.innerHTML = '<span class="btn-text">구글 시트 실시간 조회 중...</span>';
      try {
        const fetchUrl = `${gasApiUrl}?action=login&name=${encodeURIComponent(rawName)}&birth=${encodeURIComponent(rawBirth)}&nocache=1`;
        const resp = await fetch(fetchUrl, { method: 'GET', redirect: 'follow' });

        if (resp.status === 404) {
          throw new Error('Google Apps Script 404 Not Found: 배포 주소를 찾을 수 없습니다. 구글 시트에서 [배포] -> [새 배포] -> [액세스 권한: 모든 사용자]로 다시 배포한 후 발급된 새 URL을 등록해주세요.');
        }
        if (!resp.ok) {
          throw new Error(`구글 서버 응답 오류 (HTTP ${resp.status})`);
        }

        const text = await resp.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (parseErr) {
          throw new Error('구글 시트 응답이 올바른 형식이 아닙니다 (구글 로그인 인증 필요 또는 배포 권한 확인 필요)');
        }

        if (result.success && result.employee) {
          loginSuccess(result.employee, rawBirth);
        } else {
          showLoginError(result.message || '일치하는 사원 정보를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.warn('GAS login error, attempting local lookup fallback:', err);
        const matched = findEmployee(rawName, rawBirth);
        if (matched) {
          loginSuccess(matched, rawBirth);
          return;
        }
        showLoginError(`<strong>[연동 오류]</strong> ${err.message || err}<br><br><small style="color:var(--text-secondary);">※ 구글 시트 Apps Script에서 [배포] -> [새 배포] -> [웹 앱] -> [액세스: 모든 사용자]로 정상 배포되었는지 확인해주세요.</small>`);
      } finally {
        submitLoginBtn.disabled = false;
        submitLoginBtn.innerHTML = originalText;
      }
      return;
    }

    // B. Local dataset lookup fallback
    const matched = findEmployee(rawName, rawBirth);
    if (!matched) {
      showLoginError(`일치하는 사원 정보가 없습니다.<br>입력하신 이름(${rawName})과 생년월일이 사원명부와 일치하는지 확인해주세요.`);
      return;
    }

    loginSuccess(matched, rawBirth);
  });

  // Refresh Buttons
  const refreshBtn = document.getElementById('refreshBtn');
  const dashRefreshBtn = document.getElementById('dashRefreshBtn');

  async function handleRefresh(btn) {
    if (!btn) return;
    const icon = btn.querySelector('.spin-target');
    if (icon) icon.classList.add('spin');

    try {
      if (currentEmp && gasApiUrl) {
        // Re-fetch current employee from GAS
        const rawName = currentEmp.name || sessionStorage.getItem('snw_logged_name');
        const rawBirth = currentEmp.birth || sessionStorage.getItem('snw_logged_birth') || (currentEmp.birth_info ? currentEmp.birth_info.birth6 : '');
        
        if (!rawName || !rawBirth) {
          location.reload();
          return;
        }

        const fetchUrl = `${gasApiUrl}?action=login&name=${encodeURIComponent(rawName)}&birth=${encodeURIComponent(rawBirth)}&nocache=1`;
        const resp = await fetch(fetchUrl, { method: 'GET', redirect: 'follow' });
        const result = await resp.json();
        if (result.success && result.employee) {
          loginSuccess(result.employee, rawBirth);
          alert('구글 시트 최신 연차 데이터가 성공적으로 갱신되었습니다!');
        } else {
          alert('새로고침 실패: ' + (result.message || '데이터 없음'));
        }
      } else {
        // Reload page
        location.reload();
      }
    } catch (err) {
      alert('새로고침 중 오류 발생: ' + err.message);
    } finally {
      setTimeout(() => {
        if (icon) icon.classList.remove('spin');
      }, 500);
    }
  }

  if (refreshBtn) refreshBtn.addEventListener('click', () => handleRefresh(refreshBtn));
  if (dashRefreshBtn) dashRefreshBtn.addEventListener('click', () => handleRefresh(dashRefreshBtn));

  function findEmployee(name, birthClean) {
    if (!snwData || !snwData.employees) return null;

    const matched = snwData.employees.filter(emp => {
      if (emp.name !== name) return false;
      
      const bInfo = emp.birth_info;
      if (!bInfo) return false;

      let isBirth = false;
      if (birthClean.length === 6) {
        isBirth = (bInfo.birth6 === birthClean);
      } else if (birthClean.length === 8) {
        isBirth = (bInfo.birth8 === birthClean);
      }
      if (!isBirth) return false;

      // Exclude retired employees
      if (emp.is_retired || emp.retire_date) {
        return false;
      }
      return true;
    });

    if (matched.length === 0) return null;

    // For re-hired employees with different IDs, pick the latest join_date!
    matched.sort((a, b) => b.join_date.localeCompare(a.join_date));
    return matched[0];
  }

  function showLoginError(msg) {
    loginError.innerHTML = msg;
    loginError.style.display = 'block';
  }

  function showLoginView(pushHistory = true) {
    currentEmp = null;
    isViewingFromAdmin = false;
    document.body.classList.remove('admin-view-active');

    dashboardSection.style.display = 'none';
    adminSection.style.display = 'none';
    loginSection.style.display = 'block';

    if (btnHeaderBack) btnHeaderBack.style.display = 'none';
    if (btnDashBack) btnDashBack.style.display = 'none';
    if (adminHeaderControls) adminHeaderControls.style.display = 'none';
    if (configApiBtn) configApiBtn.style.display = 'none';
    if (adminModeBtn) adminModeBtn.style.display = 'none';

    loginError.style.display = 'none';
    if (pushHistory) {
      history.pushState({ view: 'login' }, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleGoBack() {
    // 1. 대시보드 화면이고 관리자 모드에서 조회한 경우: 관리자 화면으로 복귀
    if (dashboardSection.style.display !== 'none' && (isViewingFromAdmin || sessionStorage.getItem('snw_is_admin') === 'true')) {
      openAdminView(true);
      return;
    }

    // 2. 브라우저 히스토리 pop 또는 로그인 화면 복귀
    if (window.history.length > 1 && window.location.hash) {
      window.history.back();
    } else {
      showLoginView(true);
    }
  }

  function loginSuccess(emp, birth, pushHistory = true, fromAdmin = false) {
    currentEmp = emp;
    if (birth) {
      currentEmp.birth = birth;
      sessionStorage.setItem('snw_logged_birth', birth);
    }
    sessionStorage.setItem('snw_logged_emp_id', emp.emp_id);
    sessionStorage.setItem('snw_logged_name', emp.name);

    isViewingFromAdmin = Boolean(fromAdmin || sessionStorage.getItem('snw_is_admin') === 'true');
    
    // Switch views
    loginSection.style.display = 'none';
    adminSection.style.display = 'none';
    dashboardSection.style.display = 'flex';

    // Header Back Button
    if (btnHeaderBack) {
      btnHeaderBack.style.display = 'inline-flex';
      if (btnHeaderBackText) {
        btnHeaderBackText.textContent = isViewingFromAdmin ? '관리자 목록' : '뒤로가기';
      }
      btnHeaderBack.title = isViewingFromAdmin ? '전체 관리자 목록으로 복귀' : '로그인 화면으로 돌아가기';
    }

    // Dashboard Profile-Right Back Button
    if (btnDashBack) {
      btnDashBack.style.display = 'inline-flex';
      if (btnDashBackText) {
        btnDashBackText.textContent = isViewingFromAdmin ? '관리자 목록으로 복귀' : '로그인 화면으로';
      }
      btnDashBack.title = isViewingFromAdmin ? '전체 사원 연차 관리 대시보드로 복귀' : '로그인 화면으로 돌아가기';
    }

    if (pushHistory) {
      history.pushState({
        view: 'dashboard',
        empId: emp.emp_id,
        fromAdmin: isViewingFromAdmin
      }, '', `#emp-${emp.emp_id}`);
    }

    renderEmployeeDashboard(emp);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 구글 시트 연동 상태이고 과거 사용 내역이 비어있는 경우 백그라운드로 최신 개인 상세 내역 보강
    const hasFullHistory = emp.all_usage && emp.all_usage.length > 0 && emp.leave_cycles && emp.leave_cycles.length > 1;
    if (gasApiUrl && !hasFullHistory && emp.name) {
      const bTarget = birth || emp.birth || (emp.birth_info ? (emp.birth_info.birth6 || emp.birth_info.birth8) : '') || '';
      if (bTarget) {
        fetch(`${gasApiUrl}?action=login&name=${encodeURIComponent(emp.name)}&birth=${encodeURIComponent(bTarget)}`, { method: 'GET', redirect: 'follow' })
          .then(r => r.json())
          .then(res => {
            if (res && res.success && res.employee && currentEmp && currentEmp.emp_id === emp.emp_id) {
              currentEmp = Object.assign(currentEmp, res.employee);
              renderEmployeeDashboard(currentEmp);
            }
          })
          .catch(() => {});
      }
    }
  }

  function checkSessionLogin() {
    const savedId = sessionStorage.getItem('snw_logged_emp_id');
    if (savedId && snwData && snwData.employees) {
      const found = snwData.employees.find(e => e.emp_id === savedId);
      if (found) {
        loginSuccess(found, null, false);
      }
    }
  }

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('snw_logged_emp_id');
    sessionStorage.removeItem('snw_logged_name');
    sessionStorage.removeItem('snw_logged_birth');
    inputName.value = '';
    inputBirth.value = '';
    showLoginView(true);
  });

  // 5. Render Employee Dashboard
  function renderEmployeeDashboard(emp) {
    // Header info
    empAvatar.textContent = emp.name.charAt(0);
    empName.textContent = emp.name;
    empPosition.textContent = emp.position || emp.rank || '사원';
    empDept.textContent = emp.dept || '-';
    empShift.textContent = emp.shift || '정규직';
    empId.textContent = emp.emp_id;
    empJoinDate.textContent = emp.join_date;
    empServiceText.textContent = emp.service_text;

    // Initialize cycles and select current cycle (index 0)
    selectedCycleIndex = 0;
    currentUsageMode = 'cycle';
    tabCurrentPeriod.classList.add('active');
    tabAllPeriod.classList.remove('active');
    usageSearchInput.value = '';
    selectCycle(0);
  }

  // Helper: Ensure employee has leave_cycles array populated
  function ensureEmployeeCycles(emp) {
    if (emp.leave_cycles && emp.leave_cycles.length > 0) {
      return emp.leave_cycles;
    }
    const refDateStr = (snwData && snwData.ref_date) || '2026/09/03';
    const allUsage = emp.all_usage || (emp.current_usage || []).concat(emp.prior_usage || []);
    emp.leave_cycles = computeClientCycles(emp.join_date, refDateStr, allUsage, emp.leave_calc);
    return emp.leave_cycles;
  }

  function parseDateStr(s) {
    if (!s) return null;
    if (s instanceof Date) {
      return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    }
    const str = String(s).trim();
    if (/^\d{8}$/.test(str)) {
      return new Date(parseInt(str.slice(0, 4), 10), parseInt(str.slice(4, 6), 10) - 1, parseInt(str.slice(6, 8), 10));
    }
    const clean = str.replace(/년|월|일/g, '/').replace(/[-.]/g, '/').replace(/\s+/g, '');
    const parts = clean.split('/').filter(Boolean);
    if (parts.length >= 3) {
      let y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    return null;
  }

  function formatDateObj(d) {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  }

  function addYearsObj(d, years) {
    return new Date(d.getFullYear() + years, d.getMonth(), d.getDate());
  }

  function computeClientCycles(joinDateStr, refDateStr, allUsage, leaveCalc) {
    const joinDate = parseDateStr(joinDateStr);
    const refDate = parseDateStr(refDateStr) || new Date();
    const cycles = [];
    const daysWorked = Math.floor((refDate - joinDate) / (1000 * 60 * 60 * 24));

    if (daysWorked < 365) {
      const endObj = new Date(addYearsObj(joinDate, 1).getTime() - 24 * 60 * 60 * 1000);
      const granted = (leaveCalc && leaveCalc.total_granted !== undefined) ? leaveCalc.total_granted : 11;
      cycles.push({
        cycle_id: 'cycle_curr',
        cycle_type: 'current',
        cycle_label: '현재 연차 주기',
        period_name: `1년차 월차 (${formatDateObj(joinDate)} ~ ${formatDateObj(endObj)})`,
        is_current: true,
        is_under_1_year: true,
        completed_years: 0,
        period_start: joinDateStr,
        period_end: formatDateObj(endObj),
        next_renewal_date: formatDateObj(addYearsObj(joinDate, 1)),
        start_obj: joinDate,
        end_obj: endObj,
        total_granted: granted,
        rule_description: (leaveCalc && leaveCalc.rule_description) || '입사 1년 미만 월 단위 발생 (최대 11일)'
      });
    } else {
      const candYear = refDate.getFullYear();
      let cand = new Date(candYear, joinDate.getMonth(), joinDate.getDate());
      let lastAnniv, nextAnniv;
      if (cand <= refDate) {
        lastAnniv = cand;
        nextAnniv = addYearsObj(cand, 1);
      } else {
        lastAnniv = addYearsObj(cand, -1);
        nextAnniv = cand;
      }

      let currCompYears = lastAnniv.getFullYear() - joinDate.getFullYear();
      if (currCompYears < 1) currCompYears = 1;
      let currGranted = 15;
      if (currCompYears >= 3) {
        currGranted = Math.min(25, 15 + Math.floor((currCompYears - 1) / 2));
      }
      const currEnd = new Date(nextAnniv.getTime() - 24 * 60 * 60 * 1000);

      cycles.push({
        cycle_id: 'cycle_curr',
        cycle_type: 'current',
        cycle_label: '현재 연차 주기',
        period_name: `${currCompYears}년차 (${formatDateObj(lastAnniv)} ~ ${formatDateObj(currEnd)})`,
        is_current: true,
        is_under_1_year: false,
        completed_years: currCompYears,
        period_start: formatDateObj(lastAnniv),
        period_end: formatDateObj(currEnd),
        next_renewal_date: formatDateObj(nextAnniv),
        start_obj: lastAnniv,
        end_obj: currEnd,
        total_granted: currGranted,
        rule_description: `근속 ${currCompYears}년차 법정 연차 (기본 15일 + 근속가산 ${currGranted - 15}일)`
      });

      let loopAnniv = lastAnniv;
      let prevIndex = 1;
      while (loopAnniv > joinDate && prevIndex <= 40) {
        const prevAnniv = addYearsObj(loopAnniv, -1);
        const prevEnd = new Date(loopAnniv.getTime() - 24 * 60 * 60 * 1000);

        if (prevAnniv < joinDate) {
          if (loopAnniv > joinDate) {
            const firstEnd = new Date(addYearsObj(joinDate, 1).getTime() - 24 * 60 * 60 * 1000);
            cycles.push({
              cycle_id: `cycle_prev_${prevIndex}`,
              cycle_type: 'previous',
              cycle_label: prevIndex === 1 ? '직전 연차 주기' : `${prevIndex}년 전 주기`,
              period_name: `1년차 월차 (${formatDateObj(joinDate)} ~ ${formatDateObj(firstEnd)})`,
              is_current: false,
              is_under_1_year: true,
              completed_years: 0,
              period_start: formatDateObj(joinDate),
              period_end: formatDateObj(firstEnd),
              next_renewal_date: formatDateObj(loopAnniv),
              start_obj: joinDate,
              end_obj: firstEnd,
              total_granted: 11,
              rule_description: '입사 1년 미만 월 단위 발생 (최대 11일)'
            });
          }
          break;
        }

        const compY = prevAnniv.getFullYear() - joinDate.getFullYear();
        if (compY === 0) {
          const firstEnd = new Date(addYearsObj(joinDate, 1).getTime() - 24 * 60 * 60 * 1000);
          cycles.push({
            cycle_id: `cycle_prev_${prevIndex}`,
            cycle_type: 'previous',
            cycle_label: prevIndex === 1 ? '직전 연차 주기' : `${prevIndex}년 전 주기`,
            period_name: `1년차 월차 (${formatDateObj(joinDate)} ~ ${formatDateObj(firstEnd)})`,
            is_current: false,
            is_under_1_year: true,
            completed_years: 0,
            period_start: formatDateObj(joinDate),
            period_end: formatDateObj(firstEnd),
            next_renewal_date: formatDateObj(loopAnniv),
            start_obj: joinDate,
            end_obj: firstEnd,
            total_granted: 11,
            rule_description: '입사 1년 미만 월 단위 발생 (최대 11일)'
          });
          break;
        } else {
          let pGranted = 15;
          if (compY >= 3) {
            pGranted = Math.min(25, 15 + Math.floor((compY - 1) / 2));
          }
          const label = prevIndex === 1 ? '직전 연차 주기' : `${prevIndex}년 전 주기`;
          cycles.push({
            cycle_id: `cycle_prev_${prevIndex}`,
            cycle_type: 'previous',
            cycle_label: label,
            period_name: `${compY}년차 (${formatDateObj(prevAnniv)} ~ ${formatDateObj(prevEnd)})`,
            is_current: false,
            is_under_1_year: false,
            completed_years: compY,
            period_start: formatDateObj(prevAnniv),
            period_end: formatDateObj(prevEnd),
            next_renewal_date: formatDateObj(loopAnniv),
            start_obj: prevAnniv,
            end_obj: prevEnd,
            total_granted: pGranted,
            rule_description: `근속 ${compY}년차 법정 연차 (기본 15일 + 근속가산 ${pGranted - 15}일)`
          });
          loopAnniv = prevAnniv;
          prevIndex++;
        }
      }
    }

    // Assign usage records
    cycles.forEach(c => {
      const sObj = c.start_obj;
      const eObj = c.end_obj;
      const cUsage = [];
      let usedDays = 0.0;
      (allUsage || []).forEach(u => {
        const uDate = parseDateStr(u.date);
        if (uDate && uDate >= sObj && uDate <= eObj) {
          cUsage.push(u);
          usedDays += (u.days || 0.0);
          if (!u.cycle_label) {
            u.cycle_id = c.cycle_id;
            u.cycle_label = c.cycle_label;
            u.period_name = c.period_name;
          }
        }
      });
      c.usage_list = cUsage;
      c.used_days = Math.round(usedDays * 10) / 10;
      c.remaining_days = Math.round((c.total_granted - usedDays) * 10) / 10;
      c.usage_rate = c.total_granted > 0 ? Math.round((usedDays / c.total_granted) * 1000) / 10 : 0;
      delete c.start_obj;
      delete c.end_obj;
    });

    return cycles;
  }

  // 5. Select Cycle and Update KPIs via In-Card Arrow Navigation
  function selectCycle(index) {
    if (!currentEmp) return;
    const cycles = ensureEmployeeCycles(currentEmp);
    if (!cycles || cycles.length === 0) return;

    selectedCycleIndex = Math.max(0, Math.min(cycles.length - 1, index));
    const cycle = cycles[selectedCycleIndex];

    // Update Arrow Navigation States & Tooltip Titles
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

    // Update KPI Card Header & Values
    if (kpiPeriodTitle) {
      kpiPeriodTitle.textContent = cycle.is_current ? '현재 연차 적용 주기' : `${cycle.cycle_label}`;
    }
    kpiPeriod.textContent = `${cycle.period_start} ~ ${cycle.period_end}`;
    if (kpiPeriodName) {
      const pNameShort = cycle.period_name ? cycle.period_name.split('(')[0].trim() : `${cycle.completed_years || 1}년차`;
      kpiPeriodName.textContent = pNameShort;
    }

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

    kpiGranted.textContent = cycle.total_granted.toFixed(1);

    if (cycle.absence_months_deducted > 0) {
      kpiRuleDesc.innerHTML = `${cycle.rule_description}<br><span class="badge badge-danger" style="margin-top:4px; font-size:0.75rem; display:inline-block;">⚠️ 개근 미달(결근) ${cycle.absence_months_deducted}개월 미발생 반영</span>`;
    } else {
      kpiRuleDesc.textContent = cycle.rule_description;
    }

    kpiUsed.textContent = cycle.used_days.toFixed(1);

    const cUsage = cycle.usage_list || [];
    const fullCount = cUsage.filter(u => u.leave_type.includes('년차')).length;
    const halfCount = cUsage.filter(u => u.leave_type.includes('반차')).length;
    if (cUsage.length > 0) {
      kpiUsedDetail.textContent = `종일 ${fullCount}회 · 반차 ${halfCount}회 사용`;
    } else {
      kpiUsedDetail.textContent = `해당 주기 연차 사용 내역 없음`;
    }

    kpiRemaining.textContent = cycle.remaining_days.toFixed(1);

    let usagePct = cycle.usage_rate;
    let remPct = (100 - usagePct).toFixed(1);
    if (cycle.total_granted === 0) {
      usagePct = 0;
      remPct = 0;
    }
    kpiProgressFill.style.width = `${Math.min(100, Math.max(0, 100 - usagePct))}%`;
    kpiUsageRate.textContent = `사용률 ${usagePct}%`;
    kpiRemainingRate.textContent = `잔여율 ${remPct}%`;

    // 1-year under banner (only if currently selected cycle is under 1 year)
    if (cycle.is_under_1_year && cycle.is_current) {
      underOneYearBanner.style.display = 'flex';
    } else {
      underOneYearBanner.style.display = 'none';
    }

    // Previous Cycle Banner
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

  // Dynamic Cycle & History Tab Generation
  function updateCycleTabs() {
    if (!cycleTabGroup || !currentEmp) return;
    const cycles = ensureEmployeeCycles(currentEmp);
    const allList = currentEmp.all_usage || (currentEmp.current_usage || []).concat(currentEmp.prior_usage || []);
    const allTotalCount = allList.length;

    cycleTabGroup.innerHTML = '';

    // Render an individual tab for each cycle
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

    // Render "전체 이력" tab
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

  // Arrow navigation event listeners
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

  // Return to current cycle button
  if (btnReturnToCurrentCycle) {
    btnReturnToCurrentCycle.addEventListener('click', () => {
      selectCycle(0);
    });
  }

  usageSearchInput.addEventListener('input', renderUsageTable);
  usageTypeFilter.addEventListener('change', renderUsageTable);

  function renderUsageTable() {
    if (!currentEmp) return;
    const cycles = ensureEmployeeCycles(currentEmp);
    const selectedCycle = cycles[selectedCycleIndex] || cycles[0];

    const sourceList = (currentUsageMode === 'cycle' || currentUsageMode === 'current')
      ? (selectedCycle ? (selectedCycle.usage_list || []) : (currentEmp.current_usage || []))
      : (currentEmp.all_usage || currentEmp.current_usage || []);

    const searchVal = usageSearchInput.value.trim().toLowerCase();
    const typeVal = usageTypeFilter.value;

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
    if (currentUsageMode === 'cycle' || currentUsageMode === 'current') {
      usageCountBadge.textContent = (allTotalCount > filtered.length)
        ? `선택 주기 ${filtered.length}건 (전체 ${allTotalCount}건)`
        : `총 ${filtered.length}건`;
    } else {
      usageCountBadge.textContent = `총 ${filtered.length}건`;
    }

    if (filtered.length === 0) {
      usageTableBody.innerHTML = '';
      usageEmptyState.style.display = 'block';
      return;
    }

    usageEmptyState.style.display = 'none';
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

  // 7. My Usage Export to Excel and Print
  btnExportMyUsage.addEventListener('click', () => {
    if (!currentEmp) return;
    const cycles = ensureEmployeeCycles(currentEmp);
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

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "연차사용내역");
    const cycleSuffix = isCycleMode ? (selectedCycle ? selectedCycle.cycle_label.replace(/\s+/g, '') : '선택주기') : '전체이력';
    XLSX.writeFile(wb, `${currentEmp.name}_연차사용내역_${cycleSuffix}.xlsx`);
  });

  btnPrintMyUsage.addEventListener('click', () => {
    window.print();
  });

  // 8. Admin Management View
  if (adminModeBtn) {
    adminModeBtn.addEventListener('click', () => {
      openAdminView();
    });
  }

  if (btnCloseAdminBtn) {
    btnCloseAdminBtn.addEventListener('click', closeAdminView);
  }
  if (adminLogoutHeaderBtn) {
    adminLogoutHeaderBtn.addEventListener('click', closeAdminView);
  }

  function openAdminView(pushHistory = true) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'none';
    adminSection.style.display = 'flex';
    isViewingFromAdmin = false;

    if (adminHeaderControls) adminHeaderControls.style.display = 'inline-flex';
    if (configApiBtn) configApiBtn.style.display = 'inline-flex';
    if (adminModeBtn) adminModeBtn.style.display = 'inline-flex';

    if (btnHeaderBack) {
      btnHeaderBack.style.display = 'inline-flex';
      if (btnHeaderBackText) {
        btnHeaderBackText.textContent = '뒤로가기';
      }
      btnHeaderBack.title = '로그인 화면으로 돌아가기';
    }

    if (pushHistory) {
      history.pushState({ view: 'admin' }, '', '#admin');
    }

    // 0. 로컬 window.SNW_DATA fallback 확인
    if ((!snwData || !snwData.employees || snwData.employees.length === 0) && window.SNW_DATA) {
      snwData = window.SNW_DATA;
    }

    // 1. 브라우저 세션 캐시 확인
    const cachedAdminStr = sessionStorage.getItem('snw_admin_cache');
    let hasLoadedFromCache = false;

    if (cachedAdminStr && (!snwData || !snwData.employees || snwData.employees.length === 0)) {
      try {
        const cachedData = JSON.parse(cachedAdminStr);
        if (cachedData && cachedData.employees && cachedData.employees.length > 0) {
          snwData = {
            company: cachedData.company || '(주)에스앤더블류',
            total_employees: cachedData.employees.length,
            summary: calculateAdminSummary(cachedData.employees),
            employees: cachedData.employees
          };
          hasLoadedFromCache = true;
        }
      } catch (e) {
        console.warn('Failed to parse admin session cache:', e);
      }
    }

    // 즉시 화면 렌더링 (로컬 데이터 또는 캐시 데이터 기반 0초 렌더링)
    if (snwData && snwData.employees && snwData.employees.length > 0) {
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

    // 2. 구글 시트 연동이 있는 경우 최신 데이터 확인
    if (gasApiUrl) {
      if (!snwData || !snwData.employees || snwData.employees.length === 0) {
        loadAdminDataFromGas(false, false);
      } else {
        // 이미 로컬 데이터로 표시 중이므로 백그라운드에서 조용히 최신 데이터 확인
        loadAdminDataFromGas(false, true);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeAdminView() {
    document.body.classList.remove('admin-view-active');
    sessionStorage.removeItem('snw_is_admin');
    showLoginView(true);
  }

  async function loadAdminDataFromGas(forceRefresh, isBackground) {
    const tbody = document.getElementById('adminTableBody');
    const refreshBtn = document.getElementById('btnAdminRefresh');
    const refreshIcon = refreshBtn ? refreshBtn.querySelector('.spin-target') : null;
    if (refreshIcon) refreshIcon.classList.add('spin');

    const hasExistingData = (snwData && snwData.employees && snwData.employees.length > 0);

    // 화면에 데이터가 전혀 없을 때만 로딩 안내 표시
    if (!isBackground && !hasExistingData && tbody) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 40px; color: var(--primary);">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">⚡</div>
        <div><strong>구글 시트에서 전체 사원 연차 데이터를 고속 동기화 중입니다...</strong></div>
        <small style="color: var(--text-secondary);">해시맵 인덱싱 알고리즘으로 빠르게 집계합니다.</small>
      </td></tr>`;
    }

    try {
      const nocacheParam = forceRefresh ? '&nocache=1' : '';
      let resp = await fetch(`${gasApiUrl}?action=admin&key=2524${nocacheParam}`, { method: 'GET', redirect: 'follow' });
      let data = await resp.json();
      if (!data.success && data.message && data.message.includes('암호')) {
        resp = await fetch(`${gasApiUrl}?action=admin&key=snw2026!${nocacheParam}`, { method: 'GET', redirect: 'follow' });
        data = await resp.json();
      }

      if (data.success && data.employees && data.employees.length > 0) {
        // 브라우저 세션 캐시에 보관하여 다음 조회 시 0초 즉시 렌더링
        try {
          sessionStorage.setItem('snw_admin_cache', JSON.stringify(data));
        } catch (e) {}

        snwData = {
          company: data.company || '(주)에스앤더블류',
          total_employees: data.employees.length,
          summary: calculateAdminSummary(data.employees),
          employees: data.employees
        };
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
      } else {
        console.warn('GAS admin response error or empty:', data);
        if (forceRefresh) {
          alert('구글 시트 동기화 안내: ' + (data.message || '응답 데이터 없음') + '\n(기존 로컬 데이터로 안전하게 유지됩니다.)');
        }
        // 로컬 데이터가 없을 때만 fallback으로 window.SNW_DATA 시도
        if (!snwData || !snwData.employees || snwData.employees.length === 0) {
          if (window.SNW_DATA) {
            snwData = window.SNW_DATA;
            populateAdminCycleYearOptions();
            populateAdminDeptOptions();
            renderAdminSummary();
            renderAdminTable();
          } else if (!isBackground && tbody) {
            tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 30px; color: var(--text-secondary);">
              전체 사원 명단은 사원명부 엑셀 파일을 업로드하시거나 구글 시트 연동을 통해 확인할 수 있습니다.
            </td></tr>`;
          }
        }
      }
    } catch (err) {
      console.warn('GAS admin load warning:', err);
      if (forceRefresh) {
        alert('구글 시트 연결 실패: ' + err.message + '\n(기존 데이터로 표시가 유지됩니다.)');
      }
      if (!snwData || !snwData.employees || snwData.employees.length === 0) {
        if (window.SNW_DATA) {
          snwData = window.SNW_DATA;
          populateAdminDeptOptions();
          renderAdminSummary();
          renderAdminTable();
        } else if (!isBackground && tbody) {
          tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 30px; color: var(--text-secondary);">
            상단 [📁 사원명부 파일 선택]을 통해 엑셀을 업로드하시면 전체 명단이 즉시 산정되어 표시됩니다.
          </td></tr>`;
        }
      }
    } finally {
      if (refreshIcon) {
        setTimeout(() => refreshIcon.classList.remove('spin'), 500);
      }
    }
  }

  function calculateAdminSummary(emps) {
    let granted = 0, used = 0, rem = 0;
    emps.forEach(e => {
      if (e.leave_calc) {
        granted += (e.leave_calc.total_granted || 0);
        used += (e.leave_calc.used_days || 0);
        rem += (e.leave_calc.remaining_days || 0);
      }
    });
    const avgRate = granted > 0 ? ((used / granted) * 100).toFixed(1) : 0;
    return {
      total_granted: granted,
      total_used: used,
      total_remaining: rem,
      avg_usage_rate: Number(avgRate)
    };
  }

  function getEmployeeCycleYear(emp) {
    if (!emp || !emp.leave_calc) return null;
    const pStart = emp.leave_calc.period_start;
    if (!pStart) return null;
    const m = String(pStart).trim().match(/^(\d{4})/);
    return m ? m[1] : null;
  }

  function populateAdminCycleYearOptions() {
    if (!snwData || !snwData.employees || !adminCycleYearFilter) return;
    const yearCounts = {};
    snwData.employees.forEach(e => {
      const y = getEmployeeCycleYear(e);
      if (y) {
        yearCounts[y] = (yearCounts[y] || 0) + 1;
      }
    });
    const sortedYears = Object.keys(yearCounts).sort((a, b) => b.localeCompare(a));
    const currentVal = adminCycleYearFilter.value || 'all';

    let html = `<option value="all">📅 연차주기: 전체 연도 (${snwData.employees.length}명)</option>`;
    sortedYears.forEach(y => {
      html += `<option value="${y}">📅 ${y}년 시작 연차주기 (${y}년 리셋 / ${yearCounts[y]}명)</option>`;
    });
    adminCycleYearFilter.innerHTML = html;
    if (sortedYears.includes(currentVal) || currentVal === 'all') {
      adminCycleYearFilter.value = currentVal;
    }
  }

  function populateAdminDeptOptions() {
    if (!snwData || !snwData.employees) return;
    const depts = new Set(snwData.employees.map(e => e.dept).filter(Boolean));
    const sortedDepts = Array.from(depts).sort();

    adminDeptFilter.innerHTML = '<option value="all">모든 부서 (전체)</option>' +
      sortedDepts.map(d => `<option value="${d}">${d}</option>`).join('');
  }

  // Tenure Quick Filter Handlers
  function initTenureFilters() {
    const tenureTabs = document.querySelectorAll('.admin-tenure-tab');
    tenureTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const val = tab.getAttribute('data-tenure');
        setTenureFilter(val);
      });
    });

    if (adminTenureFilter) {
      adminTenureFilter.addEventListener('change', (e) => {
        setTenureFilter(e.target.value);
      });
    }

    // Clicking on the First Stat Card (총 재직 사원) toggles 1-year under!
    const statCardEmp = document.querySelector('.admin-stat-card:nth-child(1)');
    if (statCardEmp) {
      statCardEmp.style.cursor = 'pointer';
      statCardEmp.setAttribute('title', '클릭하여 1년 미만 입사자만 모아보기');
      statCardEmp.addEventListener('click', () => {
        setTenureFilter(currentTenureFilter === 'under1' ? 'all' : 'under1');
      });
    }
  }

  function setTenureFilter(val) {
    currentTenureFilter = val;
    const tenureTabs = document.querySelectorAll('.admin-tenure-tab');
    tenureTabs.forEach(t => {
      if (t.getAttribute('data-tenure') === val) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    if (adminTenureFilter) {
      adminTenureFilter.value = val;
    }

    if (under1NoticeCard) {
      under1NoticeCard.style.display = val === 'under1' ? 'flex' : 'none';
    }

    renderAdminSummary();
    renderAdminTable();
  }

  function renderAdminSummary() {
    if (!snwData) return;
    const s = snwData.summary;
    const allEmps = snwData.employees || [];
    const selectedYear = adminCycleYearFilter ? adminCycleYearFilter.value : 'all';

    // Base filtered by cycle start year if specified
    const yearFilteredEmps = selectedYear === 'all'
      ? allEmps
      : allEmps.filter(e => getEmployeeCycleYear(e) === selectedYear);

    const underCount = yearFilteredEmps.filter(e => e.leave_calc && e.leave_calc.is_under_1_year).length;
    const regularCount = yearFilteredEmps.length - underCount;

    // Update Tab Counters (showing count in selected year or overall)
    if (countTenureAll) countTenureAll.textContent = `${yearFilteredEmps.length}명`;
    if (countTenureUnder1) countTenureUnder1.textContent = `${underCount}명`;
    if (countTenureOver1) countTenureOver1.textContent = `${regularCount}명`;

    // Target list for the 4 stat cards based on currentTenureFilter
    let targetEmps = yearFilteredEmps;
    if (currentTenureFilter === 'under1') {
      targetEmps = yearFilteredEmps.filter(e => e.leave_calc && e.leave_calc.is_under_1_year);
    } else if (currentTenureFilter === 'over1') {
      targetEmps = yearFilteredEmps.filter(e => e.leave_calc && !e.leave_calc.is_under_1_year);
    }

    let g = 0, u = 0, r = 0;
    targetEmps.forEach(e => {
      if (e.leave_calc) {
        g += (e.leave_calc.total_granted || 0);
        u += (e.leave_calc.used_days || 0);
        r += (e.leave_calc.remaining_days || 0);
      }
    });
    const avgRate = g > 0 ? ((u / g) * 100).toFixed(1) : 0;
    const yearSuffix = selectedYear === 'all' ? '' : ` (${selectedYear}년 주기)`;

    if (currentTenureFilter === 'under1') {
      adminTotalEmp.innerHTML = `${targetEmps.length}명 <small style="font-size:0.85rem; color:#d97706; font-weight:700;">(1년미만${yearSuffix})</small>`;
      const sub1 = document.querySelector('.admin-stat-card:nth-child(1) .stat-sub');
      if (sub1) sub1.textContent = `입사 1년 미만 월차 대상 사원${yearSuffix}`;

      adminTotalGranted.textContent = `${g.toFixed(1)}일`;
      const sub2 = document.querySelector('.admin-stat-card:nth-child(2) .stat-sub');
      if (sub2) sub2.textContent = `인당 평균 ${(g / (targetEmps.length || 1)).toFixed(1)}일 (월 단위 발생)`;

      adminTotalUsed.textContent = `${u.toFixed(1)}일`;
      const sub3 = document.querySelector('.admin-stat-card:nth-child(3) .stat-sub');
      if (sub3) sub3.textContent = `1년 미만 평균 사용률 ${avgRate}%`;

      adminTotalRemaining.textContent = `${r.toFixed(1)}일`;
      const sub4 = document.querySelector('.admin-stat-card:nth-child(4) .stat-sub');
      if (sub4) sub4.textContent = `입사 1년 시점 소멸 예정 잔여`;
    } else if (currentTenureFilter === 'over1') {
      adminTotalEmp.innerHTML = `${targetEmps.length}명 <small style="font-size:0.85rem; color:var(--primary); font-weight:700;">(1년이상${yearSuffix})</small>`;
      const sub1 = document.querySelector('.admin-stat-card:nth-child(1) .stat-sub');
      if (sub1) sub1.textContent = `1년 이상 정규 연차 대상${yearSuffix}`;

      adminTotalGranted.textContent = `${g.toFixed(1)}일`;
      const sub2 = document.querySelector('.admin-stat-card:nth-child(2) .stat-sub');
      if (sub2) sub2.textContent = `인당 평균 ${(g / (targetEmps.length || 1)).toFixed(1)}일`;

      adminTotalUsed.textContent = `${u.toFixed(1)}일`;
      const sub3 = document.querySelector('.admin-stat-card:nth-child(3) .stat-sub');
      if (sub3) sub3.textContent = `평균 사용률 ${avgRate}%`;

      adminTotalRemaining.textContent = `${r.toFixed(1)}일`;
      const sub4 = document.querySelector('.admin-stat-card:nth-child(4) .stat-sub');
      if (sub4) sub4.textContent = `미사용 잔여율 ${(100 - avgRate).toFixed(1)}%`;
    } else {
      adminTotalEmp.innerHTML = selectedYear === 'all'
        ? `${targetEmps.length}명`
        : `${targetEmps.length}명 <small style="font-size:0.85rem; color:var(--primary); font-weight:700;">(${selectedYear}년 주기)</small>`;
      const sub1 = document.querySelector('.admin-stat-card:nth-child(1) .stat-sub');
      if (sub1) sub1.textContent = `1년 이상: ${regularCount}명 / 1년 미만: ${underCount}명${yearSuffix}`;

      adminTotalGranted.textContent = `${g.toFixed(1)}일`;
      const sub2 = document.querySelector('.admin-stat-card:nth-child(2) .stat-sub');
      if (sub2) sub2.textContent = `인당 평균 ${(g / (targetEmps.length || 1)).toFixed(1)}일`;

      adminTotalUsed.textContent = `${u.toFixed(1)}일`;
      const sub3 = document.querySelector('.admin-stat-card:nth-child(3) .stat-sub');
      if (sub3) sub3.textContent = `평균 사용률 ${avgRate}%`;

      adminTotalRemaining.textContent = `${r.toFixed(1)}일`;
      const sub4 = document.querySelector('.admin-stat-card:nth-child(4) .stat-sub');
      if (sub4) sub4.textContent = `미사용 잔여율 ${(100 - avgRate).toFixed(1)}%`;
    }
  }

  if (adminCycleYearFilter) {
    adminCycleYearFilter.addEventListener('change', () => {
      renderAdminSummary();
      renderAdminTable();
    });
  }
  adminSearchInput.addEventListener('input', renderAdminTable);
  adminDeptFilter.addEventListener('change', () => {
    renderAdminSummary();
    renderAdminTable();
  });
  adminSortFilter.addEventListener('change', renderAdminTable);

  function renderAdminTable() {
    if (!snwData || !snwData.employees) return;

    const query = adminSearchInput.value.trim().toLowerCase();
    const dept = adminDeptFilter.value;
    const sort = adminSortFilter.value;
    const selectedYear = adminCycleYearFilter ? adminCycleYearFilter.value : 'all';

    let list = snwData.employees.slice();

    // Filter
    list = list.filter(emp => {
      // Cycle year filter (연차주기 시작연도)
      if (selectedYear !== 'all') {
        const cYear = getEmployeeCycleYear(emp);
        if (cYear !== selectedYear) return false;
      }

      // Tenure filter
      if (currentTenureFilter === 'under1' && !emp.leave_calc.is_under_1_year) return false;
      if (currentTenureFilter === 'over1' && emp.leave_calc.is_under_1_year) return false;

      // Dept filter
      if (dept !== 'all' && emp.dept !== dept) return false;

      // Search query
      if (query) {
        const text = `${emp.name} ${emp.emp_id} ${emp.dept} ${emp.position} ${emp.rank}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });

    // Sort
    list.sort((a, b) => {
      if (sort === 'name_asc') return a.name.localeCompare(b.name, 'ko');
      if (sort === 'rem_asc') return a.leave_calc.remaining_days - b.leave_calc.remaining_days;
      if (sort === 'rem_desc') return b.leave_calc.remaining_days - a.leave_calc.remaining_days;
      if (sort === 'rate_desc') return b.leave_calc.usage_rate - a.leave_calc.usage_rate;
      if (sort === 'join_desc') return b.join_date.localeCompare(a.join_date);
      if (sort === 'join_asc') return a.join_date.localeCompare(b.join_date);
      return 0;
    });

    currentAdminList = list;

    if (list.length === 0) {
      adminTableBody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align:center; padding: 40px; color: var(--text-secondary);">
            <div style="font-size: 1.5rem; margin-bottom: 8px;">🔍</div>
            <strong>선택하신 필터 조건에 해당하는 사원이 없습니다.</strong>
            <div style="font-size: 0.82rem; margin-top: 4px; color: var(--text-muted);">연차주기 연도나 부서, 검색어를 변경해보세요.</div>
          </td>
        </tr>
      `;
      return;
    }

    adminTableBody.innerHTML = list.map(emp => {
      const calc = emp.leave_calc;
      const periodShort = `${calc.period_start.slice(2)}~${calc.period_end.slice(2)}`;
      const remColor = calc.remaining_days <= 3 ? 'text-danger' : (calc.remaining_days >= 15 ? 'text-success' : '');
      const isUnder = calc.is_under_1_year;
      const cYear = getEmployeeCycleYear(emp);
      const yearBadge = cYear
        ? `<span class="badge ${cYear === '2026' ? 'badge-primary' : 'badge-secondary'}" style="font-size:0.72rem; padding: 2px 5px; margin-right: 4px; vertical-align: middle;">${cYear}년</span>`
        : '';

      const tenureHtml = isUnder
        ? `<strong class="text-primary">${emp.service_months}개월차</strong> <small class="text-muted">(${emp.service_days}일)</small>`
        : `${emp.service_years}년 ${emp.service_months}개월`;

      const nameHtml = isUnder
        ? `<strong>${emp.name}</strong> <span class="badge badge-warning" style="font-size:0.7rem; padding: 2px 5px; vertical-align: middle;">1년미만</span>`
        : `<strong>${emp.name}</strong>`;

      let grantedHtml = `<strong>${calc.total_granted.toFixed(1)}</strong>`;
      if (isUnder) {
        if (calc.absence_months_deducted > 0) {
          grantedHtml += ` <span class="badge badge-danger" style="font-size:0.65rem; padding: 2px 4px;" title="결근으로 인한 ${calc.absence_months_deducted}개월 미발생">결근 -${calc.absence_months_deducted}</span>`;
        } else {
          grantedHtml += ` <small class="text-muted">월차</small>`;
        }
      }

      return `
        <tr class="${isUnder ? 'row-under1' : ''}">
          <td>${emp.emp_id}</td>
          <td>${nameHtml}</td>
          <td>${emp.dept}</td>
          <td>${emp.position || emp.rank || '-'}</td>
          <td>${emp.join_date}</td>
          <td>${tenureHtml}</td>
          <td>${yearBadge}<small class="text-muted">${periodShort}</small></td>
          <td>${grantedHtml}</td>
          <td class="text-danger">${calc.used_days.toFixed(1)}</td>
          <td class="${remColor}"><strong>${calc.remaining_days.toFixed(1)}</strong></td>
          <td>${calc.usage_rate}%</td>
          <td>
            <button type="button" class="btn-view-emp" data-id="${emp.emp_id}">조회</button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click listeners to view buttons
    adminTableBody.querySelectorAll('.btn-view-emp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const emp = snwData.employees.find(x => x.emp_id === id);
        if (emp) {
          loginSuccess(emp, null, true, true);
        }
      });
    });
  }

  // 9. Export All Employees Summary to Excel
  btnExportAllExcel.addEventListener('click', () => {
    if (!currentAdminList || currentAdminList.length === 0) return;

    const rows = currentAdminList.map(emp => {
      const calc = emp.leave_calc;
      const cYear = getEmployeeCycleYear(emp);
      return {
        '사번': emp.emp_id,
        '성명': emp.name,
        '부서': emp.dept,
        '직위': emp.position,
        '직급': emp.rank,
        '근무조': emp.shift,
        '입사일자': emp.join_date,
        '근속연수': emp.service_years,
        '근속기간': emp.service_text,
        '1년미만여부': calc.is_under_1_year ? 'Y' : 'N',
        '연차주기시작연도': cYear ? `${cYear}년` : '',
        '연차주기시작': calc.period_start,
        '연차주기종료': calc.period_end,
        '다음연차갱신일': calc.next_renewal_date,
        '총발생연차': calc.total_granted,
        '사용한연차': calc.used_days,
        '남은연차': calc.remaining_days,
        '사용률(%)': calc.usage_rate,
        '산정규정': calc.rule_description
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "전직원연차현황");
    XLSX.writeFile(wb, `(주)에스앤더블류_전직원_연차현황_${snwData.ref_date.replace(/\//g,'')}.xlsx`);
  });

  // ==============================================================================
  // 10. Monthly Leave Settlement Management (월별 연차수당 정산 관리 로직)
  // ==============================================================================
  let currentAdminTab = 'overview'; // 'overview' | 'settlement'
  let currentSettlementYear = 2026;
  let currentSettlementMonth = 9; // 1 ~ 12
  let localWageMap = {}; // key: empId or cleanName, value: number
  let currentSettlementList = [];

  // Restore wage cache from sessionStorage if present
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

    let refYear = 2026;
    let refMonth = 9;
    if (snwData && snwData.ref_date) {
      const parts = snwData.ref_date.split('/');
      if (parts.length >= 2) {
        refYear = parseInt(parts[0], 10) || 2026;
        refMonth = parseInt(parts[1], 10) || 9;
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
    if (!deptSel || !snwData || !snwData.employees) return;
    const depts = new Set(snwData.employees.map(e => e.dept).filter(Boolean));
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
    const isNewHireUnder1 = (completedYearsAtTarget < 1); // 당월 신규입사자 (아직 1년 미달)
    const isFirstYearRenewal = (completedYearsAtTarget === 1); // 만 1년 도래 월차 정산자

    // 직원의 전체 연차 주기 계산
    const cycles = ensureEmployeeCycles(emp);

    // 정산 대상 주기 탐색:
    // 해당 정산년도(targetYear), 정산월(targetMonth)에 만료/갱신된 실제 주기를 찾음
    // 1) next_renewal_date의 연도와 월이 targetYear, targetMonth인 주기 (입사일 당월 갱신 기준)
    // 2) period_end의 연도와 월이 targetYear, targetMonth인 주기 (말일 만료 기준 등)
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

    // 만약 매칭되는 과거/도래 주기가 없고 대상월 주기인 경우 기본 첫 주기(현재 주기) 사용
    if (!targetCycle && isTargetMonthCycle && cycles && cycles.length > 0) {
      targetCycle = cycles[0];
      targetCycleIndex = 0;
    }

    // 남은 연차 및 대상 주기 세부 정보 산출
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

    // 계산식: 통상시급 * 8 * 1.5 * 남은 연차개수 (원 단위 반올림)
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
      // 규칙 1: 당월 신규입사자(1년 미만 입사자)는 정산 대상에서 자동 제외
      statusType = 'new_hire';
      statusText = '당월 신규입사자 (만 1년 미달 제외)';
    } else if (!hasWage) {
      // 규칙 2: 통상시급 시트에 없는 사원은 정산 비대상
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
    if (!snwData || !snwData.employees) return;

    populateSettlementMonthSelect();
    populateSettlementDeptOptions();

    const targetMonth = currentSettlementMonth;
    const targetYear = currentSettlementYear;

    // Badges & Buttons Update
    const cycleBadge = document.getElementById('settlementCycleBadge');
    if (cycleBadge) {
      cycleBadge.textContent = `${targetMonth}월 귀속 급여 정산 (만료 당월 기준)`;
    }
    const exportBtnText = document.getElementById('btnExportSettlementText');
    if (exportBtnText) {
      exportBtnText.textContent = `${targetYear}년 ${targetMonth}월 귀속 연차정산 다운로드 (.xlsx)`;
    }

    // Evaluate all employees
    const allEvaluated = snwData.employees.map(emp => ({
      emp: emp,
      eval: evaluateEmployeeSettlement(emp, targetYear, targetMonth)
    }));

    // Target Month Cycle Stats
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

    // Update KPI Cards
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

    // Filter for Table
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

    // Sort
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
            <div style="font-size: 0.83rem; margin-top: 5px; color: var(--text-muted);">
              정산 대상월을 변경하시거나 상단 [통상시급 업로드]를 통해 급여 정보를 확인해주세요.
            </div>
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

    // Attach click listeners to view buttons
    tbody.querySelectorAll('.btn-view-emp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const cycleIdx = e.currentTarget.getAttribute('data-cycle-index');
        const emp = snwData.employees.find(x => x.emp_id === id);
        if (emp) {
          loginSuccess(emp, null, true, true);
          if (cycleIdx !== null && cycleIdx !== undefined && !isNaN(parseInt(cycleIdx, 10))) {
            setTimeout(() => {
              selectCycle(parseInt(cycleIdx, 10));
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

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${currentSettlementMonth}월귀속_연차정산`);
    XLSX.writeFile(wb, `(주)에스앤더블류_${currentSettlementYear}년${String(currentSettlementMonth).padStart(2,'0')}월귀속_연차정산내역.xlsx`);
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

        // Update memory
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

  // 11. Event Listeners Setup
  function setupEventListeners() {
    // 뒤로가기 버튼 클릭 이벤트 연결
    if (btnHeaderBack) {
      btnHeaderBack.addEventListener('click', handleGoBack);
    }
    if (btnDashBack) {
      btnDashBack.addEventListener('click', handleGoBack);
    }

    // Admin Main Navigation Tabs
    const btnTabOverview = document.getElementById('btnAdminTabOverview');
    const btnTabSettlement = document.getElementById('btnAdminTabSettlement');
    if (btnTabOverview) {
      btnTabOverview.addEventListener('click', () => switchAdminTab('overview'));
    }
    if (btnTabSettlement) {
      btnTabSettlement.addEventListener('click', () => switchAdminTab('settlement'));
    }

    // Settlement Month Selector
    const monthSelect = document.getElementById('settlementMonthSelect');
    if (monthSelect) {
      monthSelect.addEventListener('change', (e) => {
        currentSettlementMonth = parseInt(e.target.value, 10);
        renderSettlementView();
      });
    }

    const btnPrevMonth = document.getElementById('btnSettlementPrevMonth');
    if (btnPrevMonth) {
      btnPrevMonth.addEventListener('click', () => {
        currentSettlementMonth = (currentSettlementMonth > 1) ? currentSettlementMonth - 1 : 12;
        if (monthSelect) monthSelect.value = String(currentSettlementMonth);
        renderSettlementView();
      });
    }

    const btnNextMonth = document.getElementById('btnSettlementNextMonth');
    if (btnNextMonth) {
      btnNextMonth.addEventListener('click', () => {
        currentSettlementMonth = (currentSettlementMonth < 12) ? currentSettlementMonth + 1 : 1;
        if (monthSelect) monthSelect.value = String(currentSettlementMonth);
        renderSettlementView();
      });
    }

    // Settlement Filter Controls
    const setFilterMode = document.getElementById('settlementFilterMode');
    if (setFilterMode) setFilterMode.addEventListener('change', renderSettlementView);

    const setDeptFilter = document.getElementById('settlementDeptFilter');
    if (setDeptFilter) setDeptFilter.addEventListener('change', renderSettlementView);

    const setSortFilter = document.getElementById('settlementSortFilter');
    if (setSortFilter) setSortFilter.addEventListener('change', renderSettlementView);

    const setSearchInput = document.getElementById('settlementSearchInput');
    if (setSearchInput) setSearchInput.addEventListener('input', renderSettlementView);

    // Export Settlement to Excel
    const btnExpSettlement = document.getElementById('btnExportSettlementExcel');
    if (btnExpSettlement) {
      btnExpSettlement.addEventListener('click', exportSettlementToExcel);
    }

    // Wage Excel Uploads
    const wageUp1 = document.getElementById('uploadWageInput');
    if (wageUp1) wageUp1.addEventListener('change', handleWageFileUpload);

    const wageUp2 = document.getElementById('uploadWageInputSettlement');
    if (wageUp2) wageUp2.addEventListener('change', handleWageFileUpload);

    // 브라우저 뒤로가기 / 앞으로가기 키 및 모바일 뒤로가기 제스처 완벽 지원
    window.addEventListener('popstate', (e) => {
      const state = e.state;
      if (!state || state.view === 'login') {
        showLoginView(false);
      } else if (state.view === 'admin') {
        openAdminView(false);
      } else if (state.view === 'dashboard' && state.empId) {
        const found = snwData && snwData.employees ? snwData.employees.find(x => x.emp_id === state.empId) : null;
        if (found) {
          loginSuccess(found, null, false, state.fromAdmin);
        } else {
          showLoginView(false);
        }
      } else {
        showLoginView(false);
      }
    });

    uploadRosterInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      alert(`[사원명부 업로드]\n선택하신 파일(${file.name})은 브라우저 세션에 즉시 반영할 수 있으며, 영구 반영을 위해서는 build_data.py를 실행하거나 파일을 덮어쓰시면 됩니다.`);
    });

    uploadUsageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      alert(`[연차사용내역 업로드]\n선택하신 파일(${file.name})을 반영하려면 파일을 덮어쓰고 새로고침하시면 연동됩니다.`);
    });

    const btnAdminRefresh = document.getElementById('btnAdminRefresh');
    if (btnAdminRefresh) {
      btnAdminRefresh.addEventListener('click', () => {
        loadAdminDataFromGas(true);
      });
    }
  }

  // Kickoff
  document.addEventListener('DOMContentLoaded', init);
})();
