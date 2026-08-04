import io, re, os, sys

p = "C:/Users/TestAdmin/github-learn/math-puzzle/game.js"
s = open(p, encoding="utf-8").read()
orig = s

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        print(f"  !! EXPECTED {count} match(es) for block, found {n}")
        print("     first 60 chars of old:", repr(old[:60]))
        sys.exit(2)
    s = s.replace(old, new, count)
    print(f"  ok (+{count} replace)")

print("== Applying [1] Supabase key ==")
rep(
"""const SUPABASE_URL = 'https://pwrhnmvhwhellfbznczb.supabase.co';
// ⚠️ อย่าลืมใส่ ANON KEY จริงของคุณตรงนี้ (เอา placeholder ออก)
const SUPABASE_ANON_KEY = 'sb_publishable_zmIZ9aucZsRMJrySDe0uIQ_W4OgndeO';""",
"""const SUPABASE_URL = 'https://pwrhnmvhwhellfbznczb.supabase.co';
// ✅ ดึง key จาก config.js (ไฟล์ไม่ commit เข้า git — เพิ่มใน .gitignore)
//    สำคัญ: ต้องเปิด Row Level Security (RLS) ใน Supabase dashboard ไม่งั้นคนอื่นอ่านได้
const SUPABASE_ANON_KEY = window.__MATH_APP_CONFIG__?.SUPABASE_ANON_KEY
  || 'sb_publishable_zmIZ9aucZsRMJrySDe0uIQ_W4OgndeO'; // fallback""")

print("== Applying [2a] handleLogin pin->token ==")
rep(
"""    // เก็บ pin ไว้ในเครื่อง (จากที่ผู้เล่นพิมพ์เอง ไม่ใช่จากเซิร์ฟเวอร์) เพื่อยืนยันตัวตนกับ RPC อื่นๆ ต่อไป
    currentUser = { ...data[0], pin };""",
"""    // ✅ เก็บแค่ session token (เซิร์ฟเวอร์คืนมา) ไม่เก็บ PIN ดิบ
    currentUser = { ...data[0], token: data[0].token };""")

print("== Applying [2b] updateScore pin->token ==")
rep(
"""    const { data, error } = await db.rpc('math_submit_result', {
      p_score_id: currentUser.id,
      p_pin: currentUser.pin,
      p_xp_gain: xpGained,
      p_correct: correctCount
    });""",
"""    const { data, error } = await db.rpc('math_submit_result', {
      p_score_id: currentUser.id,
      p_token: currentUser.token,   // ✅ ใช้ token แทน pin
      p_xp_gain: xpGained,
      p_correct: correctCount
    });""")

print("== Applying [2c] logAttempt pin->token ==")
rep(
"""    const { error } = await db.rpc('math_log_attempt', {
      p_score_id: currentUser.id,
      p_pin: currentUser.pin,
      p_level: level,
      p_is_correct: isCorrect
    });""",
"""    const { error } = await db.rpc('math_log_attempt', {
      p_score_id: currentUser.id,
      p_token: currentUser.token,   // ✅ ใช้ token แทน pin
      p_level: level,
      p_is_correct: isCorrect
    });""")

print("== Applying [2d] math_get_attempts pin->token (x2) ==")
rep(
"""    const { data, error } = await db.rpc('math_get_attempts', {
      p_score_id: currentUser.id,
      p_pin: currentUser.pin
    });""",
"""    const { data, error } = await db.rpc('math_get_attempts', {
      p_score_id: currentUser.id,
      p_token: currentUser.token   // ✅ ใช้ token แทน pin
    });""", count=2)

print("== Applying [3a] global questionStartTime ==")
rep(
"""let currentStep = 0;""",
"""let currentStep = 0;
let questionStartTime = null; // ✅ เวลาเริ่มตอบแต่ละข้อ (ใช้คำนวณ speed bonus)""")

print("== Applying [3b] showQuestion set timer ==")
rep(
"""  document.getElementById('equation-display').textContent = q.equation;""",
"""  document.getElementById('equation-display').textContent = q.equation;
  questionStartTime = Date.now(); // ✅ จับเวลาเริ่มตอบแต่ละข้อ""")

print("== Applying [3c] score formula ==")
rep(
"""    score += 10 + Math.max(0, 5 - currentQuestionIndex);""",
"""    const elapsedSec = Math.floor((Date.now() - questionStartTime) / 1000);
    const speedBonus = Math.max(0, 5 - elapsedSec); // ตอบภายใน 5 วินาที ได้ bonus เต็ม
    score += 10 + speedBonus;""")

print("== Applying [4] case 4 recursion->while ==")
rep(
"""    case 4: // ax + b = cx + d
      a = randInt(2, 6);
      c = randInt(2, 6);
      while (c === a) c = randInt(2, 6);
      x = randInt(1, 8);
      b = randInt(1, 10);
      d = (a - c) * x + b;
      if (d < 1 || d > 20) return generateQuestion(level);
      
      equation = `${a}x + ${b} = ${c}x + ${d}`;
      const leftCoeff = a - c;
      const rightConst = d - b;""",
"""    case 4: // ax + b = cx + d
      x = randInt(1, 8);
      b = randInt(1, 10);
      let tries = 0;
      do {
        a = randInt(2, 6);
        c = randInt(2, 6);
        while (c === a) c = randInt(2, 6);
        d = (a - c) * x + b;
        tries++;
      } while ((d < 1 || d > 20) && tries < 50); // ✅ จำกัดรอบ กัน infinite loop
      
      equation = `${a}x + ${b} = ${c}x + ${d}`;
      const leftCoeff = a - c;
      const rightConst = d - b;""")

print("== Applying [5] escapeHtml in showNextStep ==")
rep(
"""    <div class="step-explanation">${step.explanation}</div>
    <div class="step-equation">${step.equation}</div>""",
"""    <div class="step-explanation">${escapeHtml(step.explanation)}</div>
    <div class="step-equation">${escapeHtml(step.equation)}</div>""")

if s == orig:
    print("!! NO CHANGES MADE")
    sys.exit(3)

open(p, "w", encoding="utf-8").write(s)
print(f"== DONE: wrote {len(s)} bytes ({s.count(chr(10))+1} lines) ==")
