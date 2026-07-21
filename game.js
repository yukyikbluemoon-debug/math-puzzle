// ============================================
// Supabase Config - ใช้โปรเจคเดียวกับ WordPuzzle
// ============================================
const SUPABASE_URL = 'https://pwrhnmvhwhellfbznczb.supabase.co';
// ⚠️ อย่าลืมใส่ ANON KEY จริงของคุณตรงนี้ (เอา placeholder ออก)
const SUPABASE_ANON_KEY = 'sb_publishable_zmIZ9aucZsRMJrySDe0uIQ_W4OgndeO';

// ✅ แก้ไข: ใช้ชื่อตัวแปรว่า 'db' แทน 'supabase' เพื่อป้องกันชื่อชนกับ Global Object
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// Game State
// ============================================
let currentUser = null;
let currentLevel = 1;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let wrongCount = 0;
let startTime = null;
let timerInterval = null;
let currentStep = 0;
let solutionSteps = [];
let levelAccuracyCache = {};

// ============================================
// Utility Functions
// ============================================
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// Question Generator (Reverse Generation)
// ============================================
function generateQuestion(level) {
  let x, a, b, c, d;
  let equation, steps;

  switch(level) {
    case 1: // x + a = b
      x = randInt(1, 15);
      a = randInt(1, 20);
      b = x + a;
      equation = `x + ${a} = ${b}`;
      steps = [
        { explanation: `ย้าย +${a} ไปลบอีกฝั่ง`, equation: `x = ${b} - ${a}` },
        { explanation: `คำนวณผลลัพธ์`, equation: `x = ${x} ✅`, final: true }
      ];
      break;

    case 2: // ax = b
      a = randInt(2, 9);
      x = randInt(1, 12);
      b = a * x;
      equation = `${a}x = ${b}`;
      steps = [
        { explanation: `นำ ${a} ไปหารทั้งสองฝั่ง`, equation: `x = ${b} ÷ ${a}` },
        { explanation: `คำนวณผลลัพธ์`, equation: `x = ${x} ✅`, final: true }
      ];
      break;

    case 3: // ax + b = c
      a = randInt(2, 6);
      x = randInt(1, 10);
      b = randInt(1, 10);
      c = a * x + b;
      equation = `${a}x + ${b} = ${c}`;
      steps = [
        { explanation: `ย้าย +${b} ไปลบอีกฝั่ง`, equation: `${a}x = ${c} - ${b}` },
        { explanation: `คำนวณฝั่งขวา`, equation: `${a}x = ${c - b}` },
        { explanation: `นำ ${a} ไปหารทั้งสองฝั่ง`, equation: `x = ${c - b} ÷ ${a}` },
        { explanation: `คำนวณผลลัพธ์`, equation: `x = ${x} ✅`, final: true }
      ];
      break;

    case 4: // ax + b = cx + d
      a = randInt(2, 6);
      c = randInt(2, 6);
      while (c === a) c = randInt(2, 6);
      x = randInt(1, 8);
      b = randInt(1, 10);
      d = (a - c) * x + b;
      if (d < 1 || d > 20) return generateQuestion(level);
      
      equation = `${a}x + ${b} = ${c}x + ${d}`;
      const leftCoeff = a - c;
      const rightConst = d - b;
      steps = [
        { explanation: `ย้าย ${c}x ไปลบฝั่งซ้าย`, equation: `${a}x - ${c}x + ${b} = ${d}` },
        { explanation: `รวมสัมประสิทธิ์ x`, equation: `${leftCoeff}x + ${b} = ${d}` },
        { explanation: `ย้าย +${b} ไปลบอีกฝั่ง`, equation: `${leftCoeff}x = ${d} - ${b}` },
        { explanation: `คำนวณฝั่งขวา`, equation: `${leftCoeff}x = ${rightConst}` },
        { explanation: `นำ ${leftCoeff} ไปหารทั้งสองฝั่ง`, equation: `x = ${rightConst} ÷ ${leftCoeff}` },
        { explanation: `คำนวณผลลัพธ์`, equation: `x = ${x} ✅`, final: true }
      ];
      break;
  }

  return { equation, answer: x, steps, level };
}

function generateQuestions(level, count = 5) {
  const qs = [];
  for (let i = 0; i < count; i++) {
    qs.push(generateQuestion(level));
  }
  return qs;
}

// ============================================
// Auth Functions
// ============================================
async function handleLogin() {
  const name = document.getElementById('auth-name').value.trim();
  const pin = document.getElementById('auth-pin').value.trim();
  const errorEl = document.getElementById('auth-error');

  if (!name || !pin) {
    errorEl.textContent = 'กรุณากรอกชื่อและ PIN';
    return;
  }
  if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    errorEl.textContent = 'PIN ต้องเป็นตัวเลข 4-6 หลัก';
    return;
  }

  errorEl.textContent = 'กำลังโหลด...';

  try {
    // ✅ แก้ไข: ใช้ db แทน supabase
    const { data: existing, error } = await db
      .from('math_scores')
      .select('*')
      .eq('name', name)
      .limit(1);

    if (error) throw error;

    if (existing && existing.length > 0) {
      if (existing[0].pin !== pin) {
        errorEl.textContent = 'PIN ไม่ถูกต้อง';
        return;
      }
      currentUser = existing[0];
    } else {
      const { data: newUser, error: insertError } = await db
        .from('math_scores')
        .insert([{ name, pin, xp: 0, level: 1, games_played: 0, total_correct: 0 }])
        .select()
        .single();

      if (insertError) throw insertError;
      currentUser = newUser;
    }

    updateHomeUI();
    showScreen('screen-home');
    loadLeaderboard();
    loadLevelAccuracy();
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'เกิดข้อผิดพลาด: ' + err.message;
  }
}

function handleGuest() {
  currentUser = { name: 'Guest', xp: 0, level: 1, id: 'guest-' + Date.now() };
  updateHomeUI();
  showScreen('screen-home');
  loadLevelAccuracy();
}

function handleLogout() {
  currentUser = null;
  document.getElementById('auth-name').value = '';
  document.getElementById('auth-pin').value = '';
  document.getElementById('auth-error').textContent = '';
  showScreen('screen-auth');
}

// ============================================
// UI Updates
// ============================================
function updateHomeUI() {
  if (!currentUser) return;
  document.getElementById('home-name').textContent = currentUser.name;
  document.getElementById('home-level').textContent = currentUser.level || 1;
  const xp = currentUser.xp || 0;
  const nextLevel = (currentUser.level || 1) * 100;
  const prevLevel = ((currentUser.level || 1) - 1) * 100;
  const progress = Math.min(100, ((xp - prevLevel) / (nextLevel - prevLevel)) * 100);
  document.getElementById('home-xp-fill').style.width = progress + '%';
  document.getElementById('home-xp-text').textContent = `${xp} / ${nextLevel} XP`;
}

async function loadLeaderboard() {
  const listEl = document.getElementById('leaderboard-list');
  try {
    // ✅ แก้ไข: ใช้ db แทน supabase
    const { data, error } = await db
      .from('math_scores')
      .select('name, xp, level')
      .order('xp', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      listEl.innerHTML = '<div class="leaderboard-empty">ยังไม่มีใครเล่นเลย เป็นคนแรกสิ! 🚀</div>';
      return;
    }

    listEl.innerHTML = data.map((u, i) => {
      const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
      const isMe = currentUser && u.name === currentUser.name;
      return `
        <div class="leaderboard-row ${isMe ? 'me' : ''}">
          <span class="leaderboard-rank">${rankIcon}</span>
          <div class="leaderboard-name">${escapeHtml(u.name)}</div>
          <div class="leaderboard-xp">Lv.${u.level || 1} · ${u.xp || 0} XP</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<div class="leaderboard-empty">โหลดอันดับไม่ได้</div>';
  }
}

// ============================================
// Game Logic
// ============================================
function startGame(level) {
  currentLevel = level;
  questions = generateQuestions(level, 5);
  currentQuestionIndex = 0;
  score = 0;
  correctCount = 0;
  wrongCount = 0;
  startTime = Date.now();

  showScreen('screen-game');
  startTimer();
  showQuestion();
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('game-timer').textContent = formatTime(elapsed);
  }, 1000);
}

function showQuestion() {
  const q = questions[currentQuestionIndex];
  document.getElementById('game-progress').textContent = `${currentQuestionIndex + 1}/5`;
  document.getElementById('game-score').textContent = score;
  document.getElementById('equation-display').textContent = q.equation;
  document.getElementById('answer-input').value = '';
  document.getElementById('feedback').className = 'feedback';
  document.getElementById('feedback').textContent = '';
  document.getElementById('answer-input').focus();
}

function submitAnswer() {
  const input = document.getElementById('answer-input');
  const answer = parseInt(input.value);
  const feedback = document.getElementById('feedback');

  if (isNaN(answer)) {
    feedback.className = 'feedback wrong';
    feedback.textContent = '⚠️ กรุณากรอกตัวเลข';
    return;
  }

  const q = questions[currentQuestionIndex];
  const isCorrect = answer === q.answer;
  logAttempt(currentLevel, isCorrect);

  if (isCorrect) {
    correctCount++;
    score += 10 + Math.max(0, 5 - currentQuestionIndex);
    feedback.className = 'feedback correct';
    feedback.textContent = '✅ ถูกต้อง! เก่งมาก!';
  } else {
    wrongCount++;
    feedback.className = 'feedback wrong';
    feedback.textContent = `❌ ผิด! คำตอบที่ถูกคือ x = ${q.answer}`;
  }

  document.getElementById('game-score').textContent = score;
  solutionSteps = q.steps;
  currentStep = 0;

  setTimeout(() => {
    showSolution(isCorrect, q);
  }, 1200);
}

function showSolution(isCorrect, q) {
  showScreen('screen-solution');

  const header = document.getElementById('solution-header');
  header.className = `solution-header ${isCorrect ? 'correct' : 'wrong'}`;
  header.textContent = isCorrect ? '🎉 ถูกต้อง!' : '❌ ผิด! มาดูวิธีทำกัน';

  document.getElementById('solution-equation').textContent = q.equation;

  const stepsEl = document.getElementById('solution-steps');
  stepsEl.innerHTML = '';
  currentStep = 0;

  document.getElementById('btn-next-step').style.display = 'block';
  document.getElementById('btn-next-question').style.display = 'none';

  showNextStep();
}

function showNextStep() {
  if (currentStep >= solutionSteps.length) {
    document.getElementById('btn-next-step').style.display = 'none';
    document.getElementById('btn-next-question').style.display = 'block';
    return;
  }

  const step = solutionSteps[currentStep];
  const stepsEl = document.getElementById('solution-steps');

  const stepDiv = document.createElement('div');
  stepDiv.className = `solution-step ${step.final ? 'final' : ''}`;
  stepDiv.innerHTML = `
    <div class="step-number">ขั้นตอนที่ ${currentStep + 1}</div>
    <div class="step-explanation">${step.explanation}</div>
    <div class="step-equation">${step.equation}</div>
  `;
  stepsEl.appendChild(stepDiv);

  currentStep++;

  if (currentStep >= solutionSteps.length) {
    document.getElementById('btn-next-step').style.display = 'none';
    document.getElementById('btn-next-question').style.display = 'block';
  }
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex >= questions.length) {
    endGame();
  } else {
    showScreen('screen-game');
    showQuestion();
  }
}

function endGame() {
  clearInterval(timerInterval);
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const xpGained = score;

  if (currentUser && currentUser.id && !String(currentUser.id).startsWith('guest')) {
    updateScore(xpGained);
  }

  document.getElementById('result-level').textContent = currentLevel;
  document.getElementById('result-title').textContent =
    correctCount === 5 ? '🏆 สมบูรณ์แบบ!' :
    correctCount >= 3 ? '👍 เก่งมาก!' : '💪 ลองใหม่นะ!';
  document.getElementById('result-datetime').textContent = new Date().toLocaleString('th-TH');
  document.getElementById('result-xp').textContent = `+${xpGained} XP`;
  document.getElementById('result-correct').textContent = correctCount;
  document.getElementById('result-wrong').textContent = wrongCount;
  document.getElementById('result-time').textContent = formatTime(elapsed);

  showScreen('screen-result');
}

async function updateScore(xpGained) {
  try {
    const newXp = (currentUser.xp || 0) + xpGained;
    const newLevel = Math.floor(newXp / 100) + 1;

    // ✅ แก้ไข: ใช้ db แทน supabase
    const { error } = await db
      .from('math_scores')
      .update({
        xp: newXp,
        level: newLevel,
        games_played: (currentUser.games_played || 0) + 1,
        total_correct: (currentUser.total_correct || 0) + correctCount
      })
      .eq('id', currentUser.id);

    if (error) throw error;

    currentUser.xp = newXp;
    currentUser.level = newLevel;
  } catch (err) {
    console.error('Error updating score:', err);
  }
}

// ============================================
// Stats (per-attempt logging + parent-facing view)
// ============================================
function isRealUser() {
  return currentUser && currentUser.id && !String(currentUser.id).startsWith('guest');
}

async function logAttempt(level, isCorrect) {
  if (!isRealUser()) return; // ไม่เก็บสถิติของ Guest
  try {
    const { error } = await db
      .from('math_attempts')
      .insert({ player_id: currentUser.id, level: level, is_correct: isCorrect });
    if (error) throw error;
  } catch (err) {
    console.error('Error logging attempt:', err);
  }
}

async function loadStats() {
  showScreen('screen-stats');

  if (!isRealUser()) {
    document.getElementById('stats-player-name').textContent = 'ดูสถิติได้เฉพาะผู้เล่นที่ล็อกอินเท่านั้น (ไม่ใช่ Guest)';
    document.getElementById('stats-level-bars').innerHTML = '';
    document.getElementById('stats-weak-level').textContent = '';
    document.getElementById('stats-trend-chart').innerHTML = '';
    document.getElementById('stats-trend-summary').textContent = '';
    return;
  }

  document.getElementById('stats-player-name').textContent = currentUser.name;

  try {
    const { data, error } = await db
      .from('math_attempts')
      .select('level, is_correct, created_at')
      .eq('player_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    renderLevelBars(data || []);
    renderTrendChart(data || []);
  } catch (err) {
    console.error('Error loading stats:', err);
    document.getElementById('stats-level-bars').innerHTML = '<div class="level-bar-empty">โหลดสถิติไม่ได้</div>';
  }
}

function renderLevelBars(attempts) {
  const container = document.getElementById('stats-level-bars');
  const weakEl = document.getElementById('stats-weak-level');

  if (attempts.length === 0) {
    container.innerHTML = '<div class="level-bar-empty">ยังไม่มีข้อมูล ลองเล่นสักเกมก่อนนะ!</div>';
    weakEl.textContent = '';
    return;
  }

  const byLevel = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 }, 3: { correct: 0, total: 0 }, 4: { correct: 0, total: 0 } };
  attempts.forEach(a => {
    if (!byLevel[a.level]) return;
    byLevel[a.level].total++;
    if (a.is_correct) byLevel[a.level].correct++;
  });

  // หาระดับที่แม่นยำต่ำสุด (ต้องมีอย่างน้อย 3 ข้อขึ้นไปถึงจะนับ ไม่งั้นข้อมูลน้อยเกินไปจะเข้าใจผิดได้)
  let weakestLevel = null;
  let weakestPct = 101;
  [1, 2, 3, 4].forEach(lv => {
    const { correct, total } = byLevel[lv];
    if (total >= 3) {
      const pct = Math.round((correct / total) * 100);
      if (pct < weakestPct) { weakestPct = pct; weakestLevel = lv; }
    }
  });

  container.innerHTML = [1, 2, 3, 4].map(lv => {
    const { correct, total } = byLevel[lv];
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const weakClass = weakestLevel === lv ? 'weak' : '';
    return `
      <div class="level-bar-row">
        <div class="level-bar-label">ระดับ ${lv}</div>
        <div class="level-bar-track">
          <div class="level-bar-fill ${weakClass}" style="width:${pct}%"></div>
        </div>
        <div class="level-bar-pct">${total > 0 ? pct + '%' : '-'}</div>
      </div>
    `;
  }).join('');

  weakEl.textContent = weakestLevel
    ? `จุดที่ควรฝึกเพิ่ม: ระดับ ${weakestLevel} (แม่นยำ ${weakestPct}%)`
    : 'เล่นแต่ละระดับให้ครบ 3 ข้อขึ้นไป เพื่อดูจุดที่ควรฝึกเพิ่ม';
}

function renderTrendChart(attempts) {
  const chartEl = document.getElementById('stats-trend-chart');
  const summaryEl = document.getElementById('stats-trend-summary');

  if (attempts.length === 0) {
    chartEl.innerHTML = '';
    summaryEl.textContent = '';
    return;
  }

  // จัดกลุ่มตามวันที่เล่น (เอา 14 วันล่าสุดที่มีข้อมูล)
  const byDay = {};
  attempts.forEach(a => {
    const day = a.created_at.slice(0, 10); // YYYY-MM-DD
    if (!byDay[day]) byDay[day] = { correct: 0, total: 0 };
    byDay[day].total++;
    if (a.is_correct) byDay[day].correct++;
  });

  const days = Object.keys(byDay).sort().slice(-14);

  if (days.length < 2) {
    chartEl.innerHTML = '<div class="level-bar-empty">เล่นอีกสักวันสองวันเพื่อดูกราฟพัฒนาการ</div>';
    summaryEl.textContent = '';
    return;
  }

  const points = days.map(d => Math.round((byDay[d].correct / byDay[d].total) * 100));
  const w = 600, h = 160, pad = 14;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => [
    pad + i * stepX,
    h - pad - (p / 100) * (h - pad * 2)
  ]);
  const pathD = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');
  const dots = coords.map(c => `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.5" fill="var(--math-green)"/>`).join('');

  chartEl.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <path d="${pathD}" fill="none" stroke="var(--math-blue)" stroke-width="2.5"/>
      ${dots}
    </svg>
  `;

  const first = points[0], last = points[points.length - 1];
  const diff = last - first;
  const trendWord = diff > 5 ? `ดีขึ้น ${diff} จุด 📈` : diff < -5 ? `ลดลง ${Math.abs(diff)} จุด 📉` : 'ค่อนข้างคงที่';
  summaryEl.textContent = `${days[0]} ถึง ${days[days.length - 1]} · แม่นยำ ${first}% → ${last}% (${trendWord})`;
}

// ============================================
// Level Accuracy Badges + Mastery Nudge
// ============================================
async function loadLevelAccuracy() {
  if (!isRealUser()) {
    levelAccuracyCache = {};
    renderLevelAccuracyBadges();
    return;
  }
  try {
    const { data, error } = await db
      .from('math_attempts')
      .select('level, is_correct')
      .eq('player_id', currentUser.id);
    if (error) throw error;

    const byLevel = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 }, 3: { correct: 0, total: 0 }, 4: { correct: 0, total: 0 } };
    (data || []).forEach(a => {
      if (!byLevel[a.level]) return;
      byLevel[a.level].total++;
      if (a.is_correct) byLevel[a.level].correct++;
    });

    levelAccuracyCache = {};
    [1, 2, 3, 4].forEach(lv => {
      const { correct, total } = byLevel[lv];
      levelAccuracyCache[lv] = { total, pct: total > 0 ? Math.round((correct / total) * 100) : 0 };
    });

    renderLevelAccuracyBadges();
  } catch (err) {
    console.error('Error loading level accuracy:', err);
  }
}

function renderLevelAccuracyBadges() {
  [1, 2, 3, 4].forEach(lv => {
    const el = document.getElementById(`level-acc-${lv}`);
    if (!el) return;
    const stats = levelAccuracyCache[lv];
    // ต้องมีอย่างน้อย 3 ข้อขึ้นไปถึงจะโชว์ % กันข้อมูลน้อยเกินไปจนเข้าใจผิด
    if (!stats || stats.total < 3) {
      el.textContent = '';
      el.classList.remove('mastered');
      return;
    }
    // ต้องมีอย่างน้อย 5 ข้อถึงจะนับว่า "เชี่ยวชาญ" กันความบังเอิญจากตัวอย่างน้อย
    const isMastered = stats.total >= 5 && stats.pct === 100;
    el.textContent = `${stats.pct}%`;
    el.classList.toggle('mastered', isMastered);
  });
}

function handleLevelClick(level) {
  const stats = levelAccuracyCache[level];
  const isMastered = stats && stats.total >= 5 && stats.pct === 100;
  if (isMastered && level < 4) {
    showMasteryModal(level);
  } else {
    startGame(level);
  }
}

function showMasteryModal(level) {
  document.getElementById('modal-message').textContent =
    `ระดับ ${level} คุณตอบถูกครบ 100% แล้ว (เล่นมาแล้วอย่างน้อย 5 ข้อ) ลองท้าทายตัวเองด้วยระดับที่ยากขึ้นดูไหม? หรือจะเล่นระดับนี้ต่อก็ได้`;
  document.getElementById('mastery-modal').style.display = 'flex';

  document.getElementById('modal-btn-next').onclick = () => {
    closeMasteryModal();
    startGame(level + 1);
  };
  document.getElementById('modal-btn-stay').onclick = () => {
    closeMasteryModal();
    startGame(level);
  };
}

function closeMasteryModal() {
  document.getElementById('mastery-modal').style.display = 'none';
}

// ============================================
// Event Listeners
// ============================================
document.getElementById('btn-login').addEventListener('click', handleLogin);
document.getElementById('btn-guest').addEventListener('click', handleGuest);
document.getElementById('btn-logout').addEventListener('click', handleLogout);

document.querySelectorAll('.level-card').forEach(card => {
  card.addEventListener('click', () => {
    const level = parseInt(card.dataset.level);
    handleLevelClick(level);
  });
});

document.getElementById('btn-submit').addEventListener('click', submitAnswer);
document.getElementById('answer-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') submitAnswer();
});

document.getElementById('btn-next-step').addEventListener('click', showNextStep);
document.getElementById('btn-next-question').addEventListener('click', nextQuestion);

document.getElementById('btn-play-again').addEventListener('click', () => {
  startGame(currentLevel);
});
document.getElementById('btn-home').addEventListener('click', () => {
  updateHomeUI();
  loadLeaderboard();
  loadLevelAccuracy();
  showScreen('screen-home');
});

document.getElementById('auth-pin').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLogin();
});

document.getElementById('btn-view-stats').addEventListener('click', loadStats);
document.getElementById('btn-stats-home').addEventListener('click', () => {
  updateHomeUI();
  loadLeaderboard();
  loadLevelAccuracy();
  showScreen('screen-home');
});
