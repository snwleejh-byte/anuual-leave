/**
 * ==============================================================================
 * js/app.js - 메인 애플리케이션 진입점 및 라우팅 제어 모듈
 * (주)에스앤더블류 임직원 연차 조회 시스템
 * ==============================================================================
 */

window.SNW = window.SNW || {};

// Global Shared State
window.SNW.state = {
  snwData: null,
  currentEmp: null,
  isViewingFromAdmin: false
};

(function (SNW) {
  'use strict';

  // DOM Elements - Sections & Header
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const adminSection = document.getElementById('adminSection');

  const btnHeaderBack = document.getElementById('btnHeaderBack');
  const btnHeaderBackText = document.getElementById('btnHeaderBackText');
  const btnDashBack = document.getElementById('btnDashBack');
  const btnDashBackText = document.getElementById('btnDashBackText');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const adminModeBtn = document.getElementById('adminModeBtn');
  const configApiBtn = document.getElementById('configApiBtn');
  const adminHeaderControls = document.getElementById('adminHeaderControls');

  // DOM Elements - Login
  const tabEmployeeBtn = document.getElementById('tabEmployeeBtn');
  const tabAdminBtn = document.getElementById('tabAdminBtn');
  const employeeLoginWrapper = document.getElementById('employeeLoginWrapper');
  const adminLoginWrapper = document.getElementById('adminLoginWrapper');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const inputAdminId = document.getElementById('inputAdminId');
  const inputAdminPw = document.getElementById('inputAdminPw');
  const adminLoginError = document.getElementById('adminLoginError');

  const loginHeaderIcon = document.getElementById('loginHeaderIcon');
  const loginHeaderTitle = document.getElementById('loginHeaderTitle');
  const loginHeaderDesc = document.getElementById('loginHeaderDesc');

  const loginForm = document.getElementById('loginForm');
  const inputName = document.getElementById('inputName');
  const inputBirth = document.getElementById('inputBirth');
  const loginError = document.getElementById('loginError');
  const submitLoginBtn = document.getElementById('submitLoginBtn');
  const demoChipsContainer = document.getElementById('demoChipsContainer');
  const logoutBtn = document.getElementById('logoutBtn');

  const refreshBtn = document.getElementById('refreshBtn');
  const dashRefreshBtn = document.getElementById('dashRefreshBtn');

  // 1. Theme Management
  function initTheme() {
    const saved = localStorage.getItem('snw_theme') || 'theme-light';
    document.body.className = saved;
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('theme-dark');
        const nextTheme = isDark ? 'theme-light' : 'theme-dark';
        document.body.className = nextTheme;
        localStorage.setItem('snw_theme', nextTheme);
      });
    }
  }

  // 2. Quick Demo Selector
  function renderDemoChips() {
    const snwData = SNW.state.snwData;
    if (!demoChipsContainer || !snwData || !snwData.employees) return;
    
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
      const labelDesc = emp.leave_calc && emp.leave_calc.is_under_1_year ? '1년미만 신입' : `${emp.service_years}년근속`;
      chip.innerHTML = `<strong>${emp.name}</strong> (${emp.dept} · ${labelDesc})`;
      chip.addEventListener('click', () => {
        inputName.value = emp.name;
        inputBirth.value = emp.birth_info ? emp.birth_info.birth6 : '';
        loginForm.dispatchEvent(new Event('submit'));
      });
      demoChipsContainer.appendChild(chip);
    });
  }

  // 3. Login Tabs (Employee vs Admin Mode)
  function initLoginTabs() {
    if (!tabEmployeeBtn || !tabAdminBtn) return;

    tabEmployeeBtn.addEventListener('click', () => switchLoginTab('employee'));
    tabAdminBtn.addEventListener('click', () => switchLoginTab('admin'));

    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const idVal = inputAdminId ? inputAdminId.value.trim() : '';
        const pwVal = inputAdminPw ? inputAdminPw.value.trim() : '';

        if (idVal !== 'snw' || (pwVal !== '2524' && pwVal !== 'snw2026!')) {
          if (adminLoginError) {
            adminLoginError.innerHTML = '<strong>[로그인 실패]</strong> 관리자 아이디 또는 비밀번호가 올바르지 않습니다.<br><small style="color:var(--text-secondary);">인사담당자 전용 관리자 계정 정보를 확인해주세요.</small>';
            adminLoginError.style.display = 'block';
          }
          return;
        }

        if (adminLoginError) adminLoginError.style.display = 'none';
        sessionStorage.setItem('snw_is_admin', 'true');
        SNW.admin.openAdminView();
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
      if (loginError) loginError.style.display = 'none';
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

  function showLoginError(msg) {
    if (loginError) {
      loginError.innerHTML = msg;
      loginError.style.display = 'block';
    }
  }

  function showLoginView(pushHistory = true) {
    SNW.state.currentEmp = null;
    SNW.state.isViewingFromAdmin = false;
    document.body.classList.remove('admin-view-active');

    if (dashboardSection) dashboardSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    if (loginSection) loginSection.style.display = 'block';

    if (btnHeaderBack) btnHeaderBack.style.display = 'none';
    if (btnDashBack) btnDashBack.style.display = 'none';
    if (adminHeaderControls) adminHeaderControls.style.display = 'none';
    if (configApiBtn) configApiBtn.style.display = 'none';
    if (adminModeBtn) adminModeBtn.style.display = 'none';

    if (loginError) loginError.style.display = 'none';
    if (pushHistory) {
      history.pushState({ view: 'login' }, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleGoBack() {
    if (dashboardSection && dashboardSection.style.display !== 'none' && (SNW.state.isViewingFromAdmin || sessionStorage.getItem('snw_is_admin') === 'true')) {
      SNW.admin.openAdminView(true);
      return;
    }

    if (window.history.length > 1 && window.location.hash) {
      window.history.back();
    } else {
      showLoginView(true);
    }
  }

  function loginSuccess(emp, birth, pushHistory = true, fromAdmin = false) {
    SNW.state.currentEmp = emp;
    if (birth) {
      emp.birth = birth;
      sessionStorage.setItem('snw_logged_birth', birth);
    }
    sessionStorage.setItem('snw_logged_emp_id', emp.emp_id);
    sessionStorage.setItem('snw_logged_name', emp.name);

    SNW.state.isViewingFromAdmin = Boolean(fromAdmin || sessionStorage.getItem('snw_is_admin') === 'true');

    if (loginSection) loginSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'flex';

    if (btnHeaderBack) {
      btnHeaderBack.style.display = 'inline-flex';
      if (btnHeaderBackText) {
        btnHeaderBackText.textContent = SNW.state.isViewingFromAdmin ? '관리자 목록' : '뒤로가기';
      }
      btnHeaderBack.title = SNW.state.isViewingFromAdmin ? '전체 관리자 목록으로 복귀' : '로그인 화면으로 돌아가기';
    }

    if (btnDashBack) {
      btnDashBack.style.display = 'inline-flex';
      if (btnDashBackText) {
        btnDashBackText.textContent = SNW.state.isViewingFromAdmin ? '관리자 목록으로 복귀' : '로그인 화면으로';
      }
      btnDashBack.title = SNW.state.isViewingFromAdmin ? '전체 사원 연차 관리 대시보드로 복귀' : '로그인 화면으로 돌아가기';
    }

    if (pushHistory) {
      history.pushState({
        view: 'dashboard',
        empId: emp.emp_id,
        fromAdmin: SNW.state.isViewingFromAdmin
      }, '', `#emp-${emp.emp_id}`);
    }

    SNW.dashboard.renderEmployeeDashboard(emp);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Background detail fetch if needed
    const gasApiUrl = localStorage.getItem('snw_gas_url') || '';
    const hasFullHistory = emp.all_usage && emp.all_usage.length > 0 && emp.leave_cycles && emp.leave_cycles.length > 1;
    if (gasApiUrl && !hasFullHistory && emp.name) {
      const bTarget = birth || emp.birth || (emp.birth_info ? (emp.birth_info.birth6 || emp.birth_info.birth8) : '') || '';
      if (bTarget) {
        SNW.api.fetchGasLogin(gasApiUrl, emp.name, bTarget)
          .then(res => {
            if (res && res.success && res.employee && SNW.state.currentEmp && SNW.state.currentEmp.emp_id === emp.emp_id) {
              SNW.state.currentEmp = Object.assign(SNW.state.currentEmp, res.employee);
              SNW.dashboard.renderEmployeeDashboard(SNW.state.currentEmp);
            }
          })
          .catch(() => {});
      }
    }
  }

  function checkSessionLogin() {
    const savedId = sessionStorage.getItem('snw_logged_emp_id');
    const data = SNW.state.snwData;
    if (savedId && data && data.employees) {
      const found = data.employees.find(e => e.emp_id === savedId);
      if (found) {
        loginSuccess(found, null, false);
      }
    }
  }

  async function handleRefresh(btn) {
    if (!btn) return;
    const icon = btn.querySelector('.spin-target');
    if (icon) icon.classList.add('spin');

    const gasApiUrl = localStorage.getItem('snw_gas_url') || '';
    const currentEmp = SNW.state.currentEmp;

    try {
      if (currentEmp && gasApiUrl) {
        const rawName = currentEmp.name || sessionStorage.getItem('snw_logged_name');
        const rawBirth = currentEmp.birth || sessionStorage.getItem('snw_logged_birth') || (currentEmp.birth_info ? currentEmp.birth_info.birth6 : '');
        
        if (!rawName || !rawBirth) {
          location.reload();
          return;
        }

        const result = await SNW.api.fetchGasLogin(gasApiUrl, rawName, rawBirth);
        if (result.success && result.employee) {
          loginSuccess(result.employee, rawBirth);
          alert('구글 시트 최신 연차 데이터가 성공적으로 갱신되었습니다!');
        } else {
          alert('새로고침 실패: ' + (result.message || '데이터 없음'));
        }
      } else {
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

  // 4. Main App Initialization
  async function init() {
    initTheme();
    initLoginTabs();
    SNW.dashboard.setupDashboardEvents();
    SNW.admin.setupAdminEvents();

    const gasApiUrl = localStorage.getItem('snw_gas_url') || '';
    SNW.api.initApiConfig((newUrl) => {
      SNW.api.updateSystemDateDisplay(null, newUrl, SNW.state.snwData);
    });

    // 0. Load data from window.SNW_DATA or fetch data/data.json
    if (window.SNW_DATA) {
      SNW.state.snwData = window.SNW_DATA;
    } else {
      try {
        const resp = await fetch('data/data.json');
        SNW.state.snwData = await resp.json();
      } catch (err) {
        try {
          const fallbackResp = await fetch('data.json');
          SNW.state.snwData = await fallbackResp.json();
        } catch (fErr) {
          console.warn('Local data.json not loaded, using remote GAS mode if configured.');
          const demoBox = document.querySelector('.quick-demo-box');
          if (demoBox) demoBox.style.display = 'none';
        }
      }
    }

    if (SNW.state.snwData) {
      renderDemoChips();
      SNW.admin.populateAdminCycleYearOptions();
      SNW.admin.populateAdminDeptOptions();
      SNW.admin.populateSettlementMonthSelect();
      SNW.admin.populateSettlementDeptOptions();
      checkSessionLogin();
    }

    SNW.api.updateSystemDateDisplay(null, gasApiUrl, SNW.state.snwData);

    if (!history.state) {
      history.replaceState({ view: 'login' }, '', window.location.pathname + window.location.search);
    }

    if (sessionStorage.getItem('snw_is_admin') === 'true') {
      SNW.admin.openAdminView(false);
      history.replaceState({ view: 'admin' }, '', '#admin');
      return;
    }

    // Event listeners
    if (btnHeaderBack) btnHeaderBack.addEventListener('click', handleGoBack);
    if (btnDashBack) btnDashBack.addEventListener('click', handleGoBack);
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('snw_logged_emp_id');
        sessionStorage.removeItem('snw_logged_name');
        sessionStorage.removeItem('snw_logged_birth');
        showLoginView(true);
      });
    }

    if (refreshBtn) refreshBtn.addEventListener('click', () => handleRefresh(refreshBtn));
    if (dashRefreshBtn) dashRefreshBtn.addEventListener('click', () => handleRefresh(dashRefreshBtn));

    // Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (loginError) loginError.style.display = 'none';

        const rawName = inputName ? inputName.value.trim() : '';
        const rawBirth = inputBirth ? inputBirth.value.trim().replace(/[^0-9]/g, '') : '';

        if (!rawName) {
          showLoginError('성명을 입력해주세요.');
          return;
        }
        if (!rawBirth || (rawBirth.length !== 6 && rawBirth.length !== 8)) {
          showLoginError('생년월일 6자리(YYMMDD) 또는 8자리(YYYYMMDD)를 입력해주세요.');
          return;
        }

        const currentGasUrl = localStorage.getItem('snw_gas_url') || '';

        // A. Google Apps Script Remote API
        if (currentGasUrl) {
          const originalText = submitLoginBtn.innerHTML;
          submitLoginBtn.disabled = true;
          submitLoginBtn.innerHTML = '<span class="btn-text">구글 시트 실시간 조회 중...</span>';
          try {
            const result = await SNW.api.fetchGasLogin(currentGasUrl, rawName, rawBirth);

            if (result.success && result.employee) {
              if (result.ref_date) {
                SNW.api.updateSystemDateDisplay(result.ref_date, currentGasUrl, SNW.state.snwData);
              } else {
                SNW.api.updateSystemDateDisplay(null, currentGasUrl, SNW.state.snwData);
              }
              loginSuccess(result.employee, rawBirth);
            } else {
              showLoginError(result.message || '일치하는 사원 정보를 찾을 수 없습니다.');
            }
          } catch (err) {
            console.warn('GAS login error, attempting local lookup fallback:', err);
            const matched = SNW.calc.findEmployee(rawName, rawBirth, SNW.state.snwData);
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

        // B. Local fallback
        const matched = SNW.calc.findEmployee(rawName, rawBirth, SNW.state.snwData);
        if (!matched) {
          showLoginError(`일치하는 사원 정보가 없습니다.<br>입력하신 이름(${rawName})과 생년월일이 사원명부와 일치하는지 확인해주세요.`);
          return;
        }

        loginSuccess(matched, rawBirth);
      });
    }

    // Popstate handling (Back button)
    window.addEventListener('popstate', (e) => {
      const st = e.state;
      if (!st || st.view === 'login') {
        showLoginView(false);
      } else if (st.view === 'dashboard' && st.empId) {
        const data = SNW.state.snwData;
        if (data && data.employees) {
          const emp = data.employees.find(x => x.emp_id === st.empId);
          if (emp) {
            loginSuccess(emp, null, false, st.fromAdmin);
          }
        }
      } else if (st.view === 'admin') {
        SNW.admin.openAdminView(false);
      }
    });
  }

  // Export to SNW namespace
  SNW.app = {
    init,
    loginSuccess,
    showLoginView,
    handleGoBack
  };

  // Start on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.SNW);
