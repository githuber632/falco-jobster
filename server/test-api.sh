#!/usr/bin/env bash
# API integration tests for time-tracker
set -euo pipefail

BASE="http://localhost:3001/api"
PASS=0
FAIL=0

assert_contains() {
  local desc="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -qF "$expected"; then
    echo "  ✅ $desc"
    PASS=$((PASS+1))
  else
    echo "  ❌ $desc"
    echo "     expected: $expected"
    echo "     got:      $actual"
    FAIL=$((FAIL+1))
  fi
}

assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $desc (HTTP $actual)"
    PASS=$((PASS+1))
  else
    echo "  ❌ $desc — expected HTTP $expected, got $actual"
    FAIL=$((FAIL+1))
  fi
}

echo "=== 1. Empty employee list ==="
r=$(curl -sf "$BASE/employees")
assert_contains "Returns empty array on fresh DB" "[]" "$r"

echo ""
echo "=== 2. Add employees ==="
r=$(curl -sf -X POST "$BASE/employees" \
  -H "Content-Type: application/json" \
  -d '{"name":"Алиса Петрова","position":"Разработчик"}')
assert_contains "Alice created" "Алиса Петрова" "$r"
EMP1=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

r=$(curl -sf -X POST "$BASE/employees" \
  -H "Content-Type: application/json" \
  -d '{"name":"Борис Иванов","position":"Дизайнер"}')
assert_contains "Boris created" "Борис Иванов" "$r"
EMP2=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "=== 3. Duplicate employee ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/employees" \
  -H "Content-Type: application/json" \
  -d '{"name":"Алиса Петрова","position":"QA"}')
assert_status "Duplicate rejected" "409" "$STATUS"

echo ""
echo "=== 4. Start timer for Alice ==="
r=$(curl -sf -X POST "$BASE/time-entries/start" \
  -H "Content-Type: application/json" \
  -d "{\"employee_id\":$EMP1,\"task_description\":\"Разработка API\"}")
assert_contains "Timer started" "Разработка API" "$r"
ENTRY1=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "=== 5. Restart timer while one is running (should fail) ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/time-entries/start" \
  -H "Content-Type: application/json" \
  -d "{\"employee_id\":$EMP1,\"task_description\":\"Другая задача\"}")
assert_status "Duplicate timer rejected" "409" "$STATUS"

echo ""
echo "=== 6. Active timer endpoint ==="
r=$(curl -sf "$BASE/time-entries/active?employee_id=$EMP1")
assert_contains "Active entry returned for Alice" "Разработка API" "$r"

echo ""
echo "=== 7. No active timer for Boris ==="
r=$(curl -sf "$BASE/time-entries/active?employee_id=$EMP2")
assert_contains "Null returned for Boris" "null" "$r"

echo ""
echo "=== 8. Stop Alice's timer ==="
sleep 2
r=$(curl -sf -X POST "$BASE/time-entries/$ENTRY1/stop")
assert_contains "Timer stopped — has stopped_at" "stopped_at" "$r"
assert_contains "Duration computed" "duration_seconds" "$r"

echo ""
echo "=== 9. Stop already-stopped timer ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/time-entries/$ENTRY1/stop")
assert_status "Already stopped rejected" "409" "$STATUS"

echo ""
echo "=== 10. Restart timer for Alice after stop ==="
r=$(curl -sf -X POST "$BASE/time-entries/start" \
  -H "Content-Type: application/json" \
  -d "{\"employee_id\":$EMP1,\"task_description\":\"Рефакторинг\"}")
assert_contains "Timer restarted" "Рефакторинг" "$r"
ENTRY2=$(echo "$r" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "=== 11. Stop second timer ==="
sleep 2
r=$(curl -sf -X POST "$BASE/time-entries/$ENTRY2/stop")
assert_contains "Second timer stopped" "stopped_at" "$r"

echo ""
echo "=== 12. Report for today ==="
TODAY=$(date +%Y-%m-%d)
r=$(curl -sf "$BASE/time-entries?from=$TODAY&to=$TODAY")
assert_contains "Report has entries key" '"entries"' "$r"
assert_contains "total_seconds present" '"total_seconds"' "$r"

echo ""
echo "=== 13. Empty report for far future ==="
r=$(curl -sf "$BASE/time-entries?from=2030-01-01&to=2030-01-31")
assert_contains "Empty entries array" '"entries":[]' "$r"
assert_contains "total_seconds is 0" '"total_seconds":0' "$r"

echo ""
echo "=== 14. Employee list with total_seconds ==="
r=$(curl -sf "$BASE/employees")
assert_contains "Employees response has total_seconds" '"total_seconds"' "$r"

echo ""
echo "=== 15. Delete employee ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/employees/$EMP2")
assert_status "Boris deleted" "204" "$STATUS"

echo ""
echo "=== 16. Delete non-existent employee ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/employees/99999")
assert_status "404 for missing employee" "404" "$STATUS"

echo ""
echo "=== 17. Missing required fields ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/employees" \
  -H "Content-Type: application/json" \
  -d '{"name":""}')
assert_status "Empty name rejected" "400" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/time-entries/start" \
  -H "Content-Type: application/json" \
  -d "{\"employee_id\":$EMP1}")
assert_status "Missing task_description rejected" "400" "$STATUS"

echo ""
echo "======================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "======================================"

[ $FAIL -eq 0 ] && exit 0 || exit 1
