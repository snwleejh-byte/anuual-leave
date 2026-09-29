/**
 * ==============================================================================
 * js/calculation.js - 연차 산정 엔진 및 날짜 연산 모듈
 * (주)에스앤더블류 임직원 연차 조회 시스템
 * ==============================================================================
 */

window.SNW = window.SNW || {};

(function (SNW) {
  'use strict';

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

  function ensureEmployeeCycles(emp, gasApiUrl, snwData, getTodayFormatted) {
    if (emp.leave_cycles && emp.leave_cycles.length > 0) {
      return emp.leave_cycles;
    }
    const todaySlash = getTodayFormatted ? getTodayFormatted('/') : formatDateObj(new Date());
    const refDateStr = (snwData && snwData.ref_date) ? snwData.ref_date.replace(/[\.-]/g, '/') : todaySlash;
    const allUsage = emp.all_usage || (emp.current_usage || []).concat(emp.prior_usage || []);
    emp.leave_cycles = computeClientCycles(emp.join_date, refDateStr, allUsage, emp.leave_calc);
    return emp.leave_cycles;
  }

  function getEmployeeCycleYear(emp) {
    if (!emp || !emp.leave_calc) return null;
    const pStart = emp.leave_calc.period_start;
    if (!pStart) return null;
    const m = String(pStart).trim().match(/^(\d{4})/);
    return m ? m[1] : null;
  }

  function findEmployee(name, birthClean, snwData) {
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

  // Export to SNW namespace
  SNW.calc = {
    parseDateStr,
    formatDateObj,
    addYearsObj,
    computeClientCycles,
    ensureEmployeeCycles,
    getEmployeeCycleYear,
    findEmployee
  };

})(window.SNW);
