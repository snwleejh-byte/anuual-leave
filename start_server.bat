@echo off
chcp 65001 > nul
title 에스앤더블류(SNW) 임직원 연차 조회 시스템

echo ========================================================
echo  (주)에스앤더블류 임직원 연차 조회 시스템을 시작합니다...
echo ========================================================
echo.
echo [1/2] 연차 최신 데이터 빌드 중...
python build_data.py
echo.
echo [2/2] 웹 서버 시작 및 브라우저 실행 중...
echo.
echo * 브라우저 주소: http://localhost:8080
echo * 종료하시려면 이 창을 닫으시거나 Ctrl+C를 누르세요.
echo.

start "" "http://localhost:8080"
python -m http.server 8080
pause
