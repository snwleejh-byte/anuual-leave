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
    populateAdminDeptOptions();
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
        const fetchUrl = `${gasApiUrl}?action=login&name=${encodeURIComponent(rawName)}&birth=${encodeURIComponent(rawBirth)}`;
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

        const fetchUrl = `${gasApiUrl}?action=login&name=${encodeURIComponent(rawName)}&birth=${encodeURIComponent(rawBirth)}`;
        const resp = await fetch(fetchUrl, { method: 'GET', redirect: 'follow' });
        const result = await resp.json();
        if (result.success && result.employee) {
          loginSuccess(result.employee, rawBirth);
          alert('최신 연차 데이터가 성공적으로 갱신되었습니다!');
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
    const parts = s.replace(/-/g, '/').replace(/\./g, '/').split('/');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
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
      for (let i = 1; i <= 3; i++) {
        const prevAnniv = addYearsObj(loopAnniv, -1);
        const prevEnd = new Date(loopAnniv.getTime() - 24 * 60 * 60 * 1000);

        if (prevAnniv < joinDate) {
          if (loopAnniv > joinDate) {
            const firstEnd = new Date(addYearsObj(joinDate, 1).getTime() - 24 * 60 * 60 * 1000);
            cycles.push({
              cycle_id: `cycle_prev_${i}`,
              cycle_type: 'previous',
              cycle_label: i === 1 ? '직전 연차 주기' : `${i}년 전 주기`,
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
            cycle_id: `cycle_prev_${i}`,
            cycle_type: 'previous',
            cycle_label: i === 1 ? '직전 연차 주기' : `${i}년 전 주기`,
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
          const label = i === 1 ? '직전 연차 주기' : `${i}년 전 주기`;
          cycles.push({
            cycle_id: `cycle_prev_${i}`,
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
      populateAdminDeptOptions();
      renderAdminSummary();
      renderAdminTable();
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
        populateAdminDeptOptions();
        renderAdminSummary();
        renderAdminTable();

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
    const emps = snwData.employees || [];

    const underCount = emps.filter(e => e.leave_calc.is_under_1_year).length;
    const regularCount = emps.length - underCount;

    // Update Tab Counters
    if (countTenureAll) countTenureAll.textContent = `${emps.length}명`;
    if (countTenureUnder1) countTenureUnder1.textContent = `${underCount}명`;
    if (countTenureOver1) countTenureOver1.textContent = `${regularCount}명`;

    // Dynamic stat card display based on filter
    if (currentTenureFilter === 'under1') {
      const underEmps = emps.filter(e => e.leave_calc.is_under_1_year);
      let g = 0, u = 0, r = 0;
      underEmps.forEach(e => {
        g += (e.leave_calc.total_granted || 0);
        u += (e.leave_calc.used_days || 0);
        r += (e.leave_calc.remaining_days || 0);
      });
      const rate = g > 0 ? ((u / g) * 100).toFixed(1) : 0;

      adminTotalEmp.innerHTML = `${underCount}명 <small style="font-size:0.85rem; color:#d97706; font-weight:700;">(1년미만)</small>`;
      document.querySelector('.admin-stat-card:nth-child(1) .stat-sub').textContent = `입사 1년 미만 월차 대상 사원`;

      adminTotalGranted.textContent = `${g.toFixed(1)}일`;
      document.querySelector('.admin-stat-card:nth-child(2) .stat-sub').textContent = `인당 평균 ${(g / (underCount || 1)).toFixed(1)}일 (월 단위 발생)`;

      adminTotalUsed.textContent = `${u.toFixed(1)}일`;
      document.querySelector('.admin-stat-card:nth-child(3) .stat-sub').textContent = `1년 미만 평균 사용률 ${rate}%`;

      adminTotalRemaining.textContent = `${r.toFixed(1)}일`;
      document.querySelector('.admin-stat-card:nth-child(4) .stat-sub').textContent = `입사 1년 시점 소멸 예정 잔여`;
    } else {
      adminTotalEmp.textContent = `${emps.length}명`;
      document.querySelector('.admin-stat-card:nth-child(1) .stat-sub').textContent = `1년 이상: ${regularCount}명 / 1년 미만: ${underCount}명`;

      adminTotalGranted.textContent = `${s.total_granted.toFixed(1)}일`;
      document.querySelector('.admin-stat-card:nth-child(2) .stat-sub').textContent = `인당 평균 ${(s.total_granted / (emps.length || 1)).toFixed(1)}일`;

      adminTotalUsed.textContent = `${s.total_used.toFixed(1)}일`;
      document.querySelector('.admin-stat-card:nth-child(3) .stat-sub').textContent = `평균 사용률 ${s.avg_usage_rate}%`;

      adminTotalRemaining.textContent = `${s.total_remaining.toFixed(1)}일`;
      document.querySelector('.admin-stat-card:nth-child(4) .stat-sub').textContent = `미사용 잔여율 ${(100 - s.avg_usage_rate).toFixed(1)}%`;
    }
  }

  adminSearchInput.addEventListener('input', renderAdminTable);
  adminDeptFilter.addEventListener('change', renderAdminTable);
  adminSortFilter.addEventListener('change', renderAdminTable);

  function renderAdminTable() {
    if (!snwData || !snwData.employees) return;

    const query = adminSearchInput.value.trim().toLowerCase();
    const dept = adminDeptFilter.value;
    const sort = adminSortFilter.value;

    let list = snwData.employees.slice();

    // Filter
    list = list.filter(emp => {
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

    adminTableBody.innerHTML = list.map(emp => {
      const calc = emp.leave_calc;
      const periodShort = `${calc.period_start.slice(2)}~${calc.period_end.slice(2)}`;
      const remColor = calc.remaining_days <= 3 ? 'text-danger' : (calc.remaining_days >= 15 ? 'text-success' : '');
      const isUnder = calc.is_under_1_year;

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
          <td><small class="text-muted">${periodShort}</small></td>
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

  // 10. In-browser Excel Re-upload Support
  function setupEventListeners() {
    // 뒤로가기 버튼 클릭 이벤트 연결
    if (btnHeaderBack) {
      btnHeaderBack.addEventListener('click', handleGoBack);
    }
    if (btnDashBack) {
      btnDashBack.addEventListener('click', handleGoBack);
    }

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
