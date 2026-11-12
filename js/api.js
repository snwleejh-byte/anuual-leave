/**
 * ==============================================================================
 * js/api.js - 구글 앱스 스크립트 실시간 통신 및 API 모달 설정 모듈
 * (주)에스앤더블류 임직원 연차 조회 시스템
 * ==============================================================================
 */

window.SNW = window.SNW || {};

(function (SNW) {
  'use strict';

  function getTodayFormatted(delimiter = '.') {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${delimiter}${m}${delimiter}${d}`;
  }

  function findMaxUsageDateFromData(snwData, specificEmp) {
    let maxDate = null;

    function processUsage(usages) {
      if (!Array.isArray(usages)) return;
      usages.forEach(u => {
        if (!u || !u.date) return;
        const s = String(u.date).trim();
        const parts = s.split(/[\/\-\.]/);
        if (parts.length >= 3) {
          const y = parts[0].padStart(4, '20');
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          const norm = `${y}.${m}.${d}`;
          if (!maxDate || norm > maxDate) {
            maxDate = norm;
          }
        }
      });
    }

    const emp = specificEmp || (SNW.state ? SNW.state.currentEmp : null);
    if (emp) {
      processUsage(emp.all_usage);
      processUsage(emp.current_usage);
      processUsage(emp.prior_usage);
    }

    const data = snwData || (SNW.state ? SNW.state.snwData : null);
    if (data && data.employees && Array.isArray(data.employees)) {
      data.employees.forEach(e => {
        processUsage(e.all_usage);
        processUsage(e.current_usage);
        processUsage(e.prior_usage);
      });
    }

    return maxDate;
  }

  function updateSystemDateDisplay(customDate, gasApiUrl, snwData) {
    const displayEl = document.getElementById('systemDateDisplay');
    if (!displayEl) return;

    const maxUsage = findMaxUsageDateFromData(snwData);
    const todayDot = getTodayFormatted('.');

    let finalDateStr = '';

    // 1순위: 연차사용내역의 가장 마지막(최신) 날짜를 절대 우선으로 반영!
    if (maxUsage) {
      finalDateStr = maxUsage;
    } else if (customDate && customDate.replace(/[\/-]/g, '.') !== todayDot) {
      finalDateStr = customDate.replace(/[\/-]/g, '.');
    } else if (snwData && snwData.ref_date && snwData.ref_date.replace(/[\/-]/g, '.') !== todayDot) {
      finalDateStr = snwData.ref_date.replace(/[\/-]/g, '.');
    }

    if (!finalDateStr) {
      if (gasApiUrl) {
        displayEl.innerHTML = `<span class="icon">📅</span> 기준일자: <strong>구글 시트 확인 중...</strong> <span class="badge-live" title="구글 시트 연차사용내역 최종 입력일자 기준">실시간</span>`;
        return;
      }
      finalDateStr = (customDate ? customDate.replace(/[\/-]/g, '.') : ((snwData && snwData.ref_date) ? snwData.ref_date.replace(/[\/-]/g, '.') : todayDot));
    }

    if (gasApiUrl) {
      displayEl.innerHTML = `<span class="icon">📅</span> 기준일자: <strong>${finalDateStr}</strong> <span class="badge-live" title="구글 시트 연차사용내역 최종 입력일자 기준">실시간</span>`;
    } else {
      displayEl.innerHTML = `<span class="icon">📅</span> 기준일자: <strong>${finalDateStr}</strong> <span class="badge-local" title="연차사용내역 최종 입력일자 기준">로컬</span>`;
    }
  }

  function initApiConfig(onConfigChange) {
    const configApiBtn = document.getElementById('configApiBtn');
    const apiModal = document.getElementById('apiModal');
    const btnCloseApiModal = document.getElementById('btnCloseApiModal');
    const inputGasUrl = document.getElementById('inputGasUrl');
    const apiStatusText = document.getElementById('apiStatusText');
    const apiStatusBox = document.getElementById('apiStatusBox');
    const btnTestApi = document.getElementById('btnTestApi');
    const btnSaveApi = document.getElementById('btnSaveApi');

    let currentGasUrl = localStorage.getItem('snw_gas_url') || '';

    if (currentGasUrl && inputGasUrl) {
      inputGasUrl.value = currentGasUrl;
      if (apiStatusBox) apiStatusBox.classList.add('connected');
      if (apiStatusText) apiStatusText.textContent = '구글 시트 실시간 연동 활성화됨';
      if (configApiBtn) configApiBtn.classList.add('active');
    }

    if (configApiBtn) {
      configApiBtn.addEventListener('click', () => {
        if (apiModal) apiModal.style.display = 'flex';
      });
    }

    if (btnCloseApiModal) {
      btnCloseApiModal.addEventListener('click', () => {
        if (apiModal) apiModal.style.display = 'none';
      });
    }

    if (btnSaveApi) {
      btnSaveApi.addEventListener('click', () => {
        const val = inputGasUrl ? inputGasUrl.value.trim() : '';
        if (val) {
          localStorage.setItem('snw_gas_url', val);
          if (apiStatusBox) apiStatusBox.classList.add('connected');
          if (apiStatusText) apiStatusText.textContent = '구글 시트 실시간 연동 활성화됨';
          if (configApiBtn) configApiBtn.classList.add('active');
          alert('구글 시트 연동 주소가 성공적으로 저장되었습니다!');
        } else {
          localStorage.removeItem('snw_gas_url');
          if (apiStatusBox) apiStatusBox.classList.remove('connected');
          if (apiStatusText) apiStatusText.textContent = '현재: 로컬 데이터 모드로 동작 중';
          if (configApiBtn) configApiBtn.classList.remove('active');
          alert('로컬 데이터 모드로 전환되었습니다.');
        }
        if (apiModal) apiModal.style.display = 'none';
        if (typeof onConfigChange === 'function') {
          onConfigChange(val);
        }
      });
    }

    if (btnTestApi) {
      btnTestApi.addEventListener('click', async () => {
        const url = inputGasUrl ? inputGasUrl.value.trim() : '';
        if (!url) {
          alert('구글 앱스 스크립트 웹 앱 URL을 입력해주세요.');
          return;
        }
        btnTestApi.textContent = '테스트 중...';
        btnTestApi.disabled = true;
        try {
          const resp = await fetch(`${url}?action=ping`, { method: 'GET', redirect: 'follow' });
          if (resp.status === 404) {
            alert('구글 앱스 스크립트 404 오류: 웹 앱 주소를 찾을 수 없습니다.\n구글 시트에서 [배포] -> [새 배포] -> [웹 앱] -> [액세스: 모든 사용자]로 다시 배포한 새 URL을 입력해주세요.');
            return;
          }
          const text = await resp.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            alert('응답을 파싱할 수 없습니다. 구글 시트 배포 설정에서 "액세스 권한: 모든 사용자"로 설정되었는지 확인해주세요.');
            return;
          }
          if (data && data.success) {
            alert('✅ 구글 시트 연결 성공!\n\n' + (data.message || '구글 시트 API와 정상 통신 중입니다.'));
          } else {
            alert('⚠️ 구글 시트 연동 주의:\n\n' + (data.message || '시트 데이터를 확인해주세요.'));
          }
        } catch (err) {
          alert('연결 오류 발생: ' + (err.message || err));
        } finally {
          btnTestApi.textContent = '연결 테스트';
          btnTestApi.disabled = false;
        }
      });
    }
  }

  async function fetchGasLogin(gasApiUrl, rawName, rawBirth) {
    const fetchUrl = `${gasApiUrl}?action=login&name=${encodeURIComponent(rawName)}&birth=${encodeURIComponent(rawBirth)}&nocache=1`;
    const resp = await fetch(fetchUrl, { method: 'GET', redirect: 'follow' });

    if (resp.status === 404) {
      throw new Error('Google Apps Script 404 Not Found: 배포 주소를 찾을 수 없습니다. 구글 시트에서 [배포] -> [새 배포] -> [액세스 권한: 모든 사용자]로 다시 배포한 후 발급된 새 URL을 등록해주세요.');
    }
    if (!resp.ok) {
      throw new Error(`구글 서버 응답 오류 (HTTP ${resp.status})`);
    }

    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      throw new Error('구글 시트 응답이 올바른 형식이 아닙니다 (구글 로그인 인증 필요 또는 배포 권한 확인 필요)');
    }
  }

  async function fetchGasAdmin(gasApiUrl, forceRefresh) {
    const nocacheParam = forceRefresh ? '&nocache=1' : '';
    let resp = await fetch(`${gasApiUrl}?action=admin&key=2524${nocacheParam}`, { method: 'GET', redirect: 'follow' });
    let data = await resp.json();
    if (!data.success && data.message && data.message.includes('암호')) {
      resp = await fetch(`${gasApiUrl}?action=admin&key=snw2026!${nocacheParam}`, { method: 'GET', redirect: 'follow' });
      data = await resp.json();
    }
    return data;
  }

  async function fetchGasRefDate(gasApiUrl) {
    if (!gasApiUrl) return null;
    try {
      const resp = await fetch(`${gasApiUrl}?action=ref_date&t=${Date.now()}`, { method: 'GET', redirect: 'follow' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success && data.ref_date) {
          return data.ref_date;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch real-time ref_date via ref_date action:', e);
    }
    try {
      const resp = await fetch(`${gasApiUrl}?action=ping&t=${Date.now()}`, { method: 'GET', redirect: 'follow' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success && data.ref_date) {
          return data.ref_date;
        }
      }
    } catch (e) {}
    return null;
  }

  // Export to SNW namespace
  SNW.api = {
    getTodayFormatted,
    findMaxUsageDateFromData,
    updateSystemDateDisplay,
    initApiConfig,
    fetchGasLogin,
    fetchGasAdmin,
    fetchGasRefDate
  };

})(window.SNW);
