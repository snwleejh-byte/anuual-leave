/**
 * ==============================================================================
 * (주)에스앤더블류 임직원 연차 조회 시스템 - Google Apps Script 보안 API
 * ==============================================================================
 * 
 * [보안 특징]
 * 1. 구글 시트는 "비공개(소유자만 접근)" 상태로 안전하게 유지됩니다.
 * 2. 직원이 이름과 생년월일로 조회할 때, "오직 본인 1명의 연차 내역만" 반환합니다.
 * 3. 다른 141명의 명단이나 개인정보는 브라우저로 절대 전송되지 않습니다.
 * 
 * [배포 방법]
 * 1. 구글 시트 상단 메뉴 [확장 프로그램] -> [Apps Script] 클릭
 * 2. 기존 코드를 모두 지우고 본 스크립트 전체를 복사/붙여넣기
 * 3. 오른쪽 상단 [배포] -> [새 배포] 클릭
 * 4. 유형 선택: [웹 앱]
 *    - 설명: SNW 연차 조회 API
 *    - 다음 사용자 권한으로 실행: [나] (Me)
 *    - 액세스 권한이 있는 사용자: [모든 사용자] (Anyone)
 * 5. [배포] 버튼 클릭 후 발급되는 '웹 앱 URL' 복사!
 */

// 관리자 조회용 비밀번호 (인사담당자 전용)
var ADMIN_PASSWORD = "snw2026!";

function doGet(e) {
  var params = e ? e.parameter : {};
  var action = params.action || 'ping';

  var result = {};

  try {
    if (action === 'ping') {
      result = { success: true, message: '에스앤더블류 연차 조회 API가 정상 작동 중입니다.' };
    } else if (action === 'login') {
      result = handleLogin(params.name, params.birth);
    } else if (action === 'admin') {
      result = handleAdmin(params.key);
    } else {
      result = { success: false, message: '알 수 없는 요청입니다.' };
    }
  } catch (err) {
    result = { success: false, message: '서버 처리 중 오류 발생: ' + err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  return doGet(e);
}

/**
 * 사원 로그인 및 본인 1명의 연차 데이터 산정/반환
 */
function handleLogin(inputName, inputBirth) {
  if (!inputName || !inputBirth) {
    return { success: false, message: '성명과 생년월일을 모두 입력해주세요.' };
  }

  var nameClean = String(inputName).trim();
  var birthClean = String(inputBirth).replace(/[^0-9]/g, '');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rosterSheet = ss.getSheetByName('사원명부');
  var usageSheet = ss.getSheetByName('연차사용내역');

  if (!rosterSheet) {
    return { success: false, message: '구글 시트에 [사원명부] 탭이 없습니다.' };
  }

  var rosterData = rosterSheet.getDataRange().getValues();
  if (rosterData.length < 2) {
    return { success: false, message: '사원명부 데이터가 비어 있습니다.' };
  }

  var rHeaders = rosterData[0];
  var nameIdx = rHeaders.indexOf('성명');
  var birthIdx = rHeaders.indexOf('생년월일');
  var idIdx = rHeaders.indexOf('사번');
  var deptIdx = rHeaders.indexOf('부서');
  var posIdx = rHeaders.indexOf('직위');
  var rankIdx = rHeaders.indexOf('직급');
  var joinIdx = rHeaders.indexOf('입사일자');
  var shiftIdx = rHeaders.indexOf('근무조');

  var matchedRow = null;
  for (var i = 1; i < rosterData.length; i++) {
    var row = rosterData[i];
    var rowName = String(row[nameIdx]).trim();
    if (rowName !== nameClean) continue;

    var rowBirthRaw = row[birthIdx];
    var birthFormatted = formatBirth(rowBirthRaw);

    if (birthClean.length === 6 && birthFormatted.birth6 === birthClean) {
      matchedRow = row;
      break;
    } else if (birthClean.length === 8 && birthFormatted.birth8 === birthClean) {
      matchedRow = row;
      break;
    }
  }

  if (!matchedRow) {
    return { 
      success: false, 
      message: '일치하는 사원 정보를 찾을 수 없습니다.\n성명(' + nameClean + ')과 생년월일이 사원명부와 일치하는지 확인해주세요.' 
    };
  }

  var empId = String(matchedRow[idIdx]).trim();
  var dept = String(matchedRow[deptIdx] || '-').trim();
  var position = String(matchedRow[posIdx] || matchedRow[rankIdx] || '사원').trim();
  var shift = String(matchedRow[shiftIdx] || '정규직').trim();
  var joinDateObj = parseDate(matchedRow[joinIdx]);

  if (!joinDateObj) {
    return { success: false, message: '입사일자 형식이 올바르지 않습니다.' };
  }

  var today = new Date();
  var daysWorked = Math.floor((today - joinDateObj) / (1000 * 60 * 60 * 24));
  var yearsWorked = Math.floor(daysWorked / 365);
  var remDays = daysWorked % 365;
  var monthsApprox = Math.floor(remDays / 30);
  var serviceText = yearsWorked > 0 ? (yearsWorked + '년 ' + monthsApprox + '개월 (' + daysWorked + '일)') : (monthsApprox + '개월 (' + daysWorked + '일)');

  // 연차 산정 (근로기준법 제60조 및 취업규정)
  var calc = calculateLeave(joinDateObj, today);

  // 연차 사용 내역 조회 (해당 사원 본인 내역만 추출)
  var usageList = [];
  if (usageSheet) {
    var uData = usageSheet.getDataRange().getValues();
    if (uData.length > 1) {
      var uHeaders = uData[0];
      var uIdIdx = uHeaders.indexOf('사번');
      var uNameIdx = uHeaders.indexOf('성명');
      var uDateIdx = uHeaders.indexOf('근무일');
      var uDowIdx = uHeaders.indexOf('요일');
      var uTypeIdx = uHeaders.indexOf('근태');
      var uTimeIdx = uHeaders.indexOf('시간코드');
      var uNoteIdx = uHeaders.indexOf('비고');

      for (var j = 1; j < uData.length; j++) {
        var uRow = uData[j];
        var uEmpId = String(uRow[uIdIdx]).trim();
        var uEmpName = String(uRow[uNameIdx]).trim();

        if (uEmpId === empId || uEmpName === nameClean) {
          var uType = String(uRow[uTypeIdx] || '년차').trim();
          var deduct = uType.indexOf('반차') !== -1 ? 0.5 : 1.0;
          var uDateObj = parseDate(uRow[uDateIdx]);
          var dateStr = formatDate(uDateObj);

          usageList.push({
            date: dateStr,
            dateObj: uDateObj,
            day_of_week: String(uRow[uDowIdx] || '-').trim(),
            leave_type: uType,
            days: deduct,
            time_code: String(uRow[uTimeIdx] || '').trim(),
            note: String(uRow[uNoteIdx] || '').trim()
          });
        }
      }
    }
  }

  // 현재 연차 주기 vs 전체 이력 분류
  var pStart = parseDate(calc.period_start);
  var pEnd = parseDate(calc.period_end);

  var currentUsage = [];
  var priorUsage = [];
  var totalUsedCurrent = 0.0;

  for (var k = 0; k < usageList.length; k++) {
    var item = usageList[k];
    var cleanItem = {
      date: item.date,
      day_of_week: item.day_of_week,
      leave_type: item.leave_type,
      days: item.days,
      time_code: item.time_code,
      note: item.note
    };

    if (item.dateObj && pStart && pEnd) {
      if (item.dateObj >= pStart && item.dateObj <= pEnd) {
        currentUsage.push(cleanItem);
        totalUsedCurrent += item.days;
      } else {
        priorUsage.push(cleanItem);
      }
    } else {
      currentUsage.push(cleanItem);
      totalUsedCurrent += item.days;
    }
  }

  currentUsage.sort(function(a, b) { return b.date.localeCompare(a.date); });
  priorUsage.sort(function(a, b) { return b.date.localeCompare(a.date); });
  var allUsage = currentUsage.concat(priorUsage);

  var remainingDays = Math.round((calc.total_granted - totalUsedCurrent) * 10) / 10;
  var usageRate = calc.total_granted > 0 ? Math.round((totalUsedCurrent / calc.total_granted) * 1000) / 10 : 0;

  calc.used_days = totalUsedCurrent;
  calc.remaining_days = remainingDays;
  calc.usage_rate = usageRate;

  // 오직 본인 데이터만 패키징하여 반환!
  return {
    success: true,
    employee: {
      emp_id: empId,
      name: nameClean,
      dept: dept,
      position: position,
      shift: shift,
      join_date: formatDate(joinDateObj),
      service_years: yearsWorked,
      service_months: monthsApprox,
      service_days: daysWorked,
      service_text: serviceText,
      leave_calc: calc,
      current_usage: currentUsage,
      all_usage: allUsage
    }
  };
}

/**
 * 입사일 기준 연차 계산 로직 (근로기준법 60조 & 취업규정 15조)
 */
function calculateLeave(joinDate, refDate) {
  var diffDays = Math.floor((refDate - joinDate) / (1000 * 60 * 60 * 24));

  if (diffDays < 365) {
    // 1년 미만 신입
    var mCount = (refDate.getFullYear() - joinDate.getFullYear()) * 12 + (refDate.getMonth() - joinDate.getMonth());
    if (refDate.getDate() < joinDate.getDate()) {
      mCount -= 1;
    }
    mCount = Math.max(0, Math.min(11, mCount));

    var firstAnniv = new Date(joinDate.getFullYear() + 1, joinDate.getMonth(), joinDate.getDate());
    var periodEnd = new Date(firstAnniv.getTime() - 24 * 60 * 60 * 1000);
    var dDay = Math.ceil((firstAnniv - refDate) / (1000 * 60 * 60 * 24));

    return {
      is_under_1_year: true,
      completed_years: 0,
      total_granted: mCount,
      period_start: formatDate(joinDate),
      period_end: formatDate(periodEnd),
      next_renewal_date: formatDate(firstAnniv),
      d_day: dDay,
      rule_description: '입사 1년 미만 월 단위 발생 (' + mCount + '개월 개근 / 최대 11일)'
    };
  } else {
    // 1년 이상자
    var candYear = refDate.getFullYear();
    var lastAnniv = new Date(candYear, joinDate.getMonth(), joinDate.getDate());
    var nextAnniv;

    if (lastAnniv <= refDate) {
      nextAnniv = new Date(candYear + 1, joinDate.getMonth(), joinDate.getDate());
    } else {
      lastAnniv = new Date(candYear - 1, joinDate.getMonth(), joinDate.getDate());
      nextAnniv = new Date(candYear, joinDate.getMonth(), joinDate.getDate());
    }

    var compYears = lastAnniv.getFullYear() - joinDate.getFullYear();
    if (compYears < 1) compYears = 1;

    var granted = 15;
    if (compYears >= 3) {
      var addDays = Math.floor((compYears - 1) / 2);
      granted = Math.min(25, 15 + addDays);
    }

    var pEnd = new Date(nextAnniv.getTime() - 24 * 60 * 60 * 1000);
    var dDayRemain = Math.ceil((nextAnniv - refDate) / (1000 * 60 * 60 * 24));

    return {
      is_under_1_year: false,
      completed_years: compYears,
      total_granted: granted,
      period_start: formatDate(lastAnniv),
      period_end: formatDate(pEnd),
      next_renewal_date: formatDate(nextAnniv),
      d_day: dDayRemain,
      rule_description: '근속 ' + compYears + '년차 법정 연차 (기본 15일 + 가산 ' + (granted - 15) + '일)'
    };
  }
}

/**
 * 관리자용 전체 현황 조회 (비밀번호 일치 시에만 동작)
 */
function handleAdmin(inputKey) {
  if (inputKey !== ADMIN_PASSWORD) {
    return { success: false, message: '관리자 암호가 일치하지 않습니다.' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rosterSheet = ss.getSheetByName('사원명부');
  var rosterData = rosterSheet.getDataRange().getValues();
  var rHeaders = rosterData[0];

  var nameIdx = rHeaders.indexOf('성명');
  var birthIdx = rHeaders.indexOf('생년월일');

  var list = [];
  for (var i = 1; i < rosterData.length; i++) {
    var n = rosterData[i][nameIdx];
    var b = rosterData[i][birthIdx];
    if (n) {
      var bInfo = formatBirth(b);
      var empResult = handleLogin(n, bInfo.birth6);
      if (empResult.success) {
        list.push(empResult.employee);
      }
    }
  }

  return {
    success: true,
    company: '(주)에스앤더블류',
    total_employees: list.length,
    employees: list
  };
}

// 헬퍼 유틸
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  var s = String(val).trim().replace(/[-.]/g, '/');
  var parts = s.split('/');
  if (parts.length >= 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return null;
}

function formatDate(d) {
  if (!d) return '';
  var yyyy = d.getFullYear();
  var mm = ('0' + (d.getMonth() + 1)).slice(-2);
  var dd = ('0' + d.getDate()).slice(-2);
  return yyyy + '/' + mm + '/' + dd;
}

function formatBirth(val) {
  if (!val) return { birth6: '', birth8: '' };
  var d = parseDate(val);
  if (d) {
    var yy = ('0' + (d.getFullYear() % 100)).slice(-2);
    var yyyy = String(d.getFullYear());
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return { birth6: yy + mm + dd, birth8: yyyy + mm + dd };
  }
  var s = String(val).replace(/[^0-9]/g, '');
  if (s.length === 6) return { birth6: s, birth8: '19' + s };
  if (s.length === 8) return { birth6: s.slice(2), birth8: s };
  return { birth6: '', birth8: '' };
}
