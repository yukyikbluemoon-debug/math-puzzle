// ============================================
// Supabase Config - ใช้โปรเจคเดียวกับ WordPuzzle
// ============================================
const SUPABASE_URL = 'https://pwrhnmvhwhellfbznczb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cmhudmZ3aGVsbGZienpuY3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAwMDAwMDAsImV4cCI6MjA0NTU3NjAwMH0.placeholder_replace_with_your_key';

// ⚠️ เปลี่ยน SUPABASE_ANON_KEY เป็น key จริงจาก Supabase Dashboard ของคุณ
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ============================================
// Utility Functions
// ============================================
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
      // ตรวจสอบว่า d เป็นบวกและสมการสมเหตุสมผล
      if (d < 1 || d > 20) {
        return generateQuestion(level); // สุ่มใหม่
      }
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

  errorEl.textContent = '';

  try {
    // เช็คชื่อใน database
    const { data: existing, error } = await supabase
      .from('math_scores')
      .select('*')
      .eq('name', name)
      .limit(1);

    if (error) throw error;

    if (existing && existing.length > 0) {
      // มีชื่อแล้ว - เช็ค PIN
      if (existing[0].pin !== pin) {
        errorEl.textContent = 'PIN ไม่ถูกต้อง';
        return;
      }
      currentUser = existing[0];
    } else {
      // สร้างบัญชีใหม่
      const { data: newUser, error: insertError } = await supabase
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
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'เกิดข้อผิดพลาด: ' + err.message;
  }
}

function handleGuest() {
  currentUser = { name: 'Guest', xp: 0, level: 1, id: 'guest-' + Date.now() };
  updateHomeUI();
  showScreen('screen-home');
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
    const { data, error } = await supabase
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
      const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '' : String(i + 1);
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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

  if (isCorrect) {
    correctCount++;
    score += 10 + Math.max(0, 5 - currentQuestionIndex); // โบนัสตอบเร็ว
    feedback.className = 'feedback correct';
    feedback.textContent = '✅ ถูกต้อง! เก่งมาก!';
  } else {
    wrongCount++;
    feedback.className = 'feedback wrong';
    feedback.textContent = `❌ ผิด! คำตอบที่ถูกคือ x = ${q.answer}`;
  }

  document.getElementById('game-score').textContent = score;

  // เก็บ solution steps สำหรับหน้าเฉลย
  solutionSteps = q.steps;
  currentStep = 0;

  // หน่วงเวลาเล็กน้อยแล้วไปหน้าเฉลย
  setTimeout(() => {
    showSolution(isCorrect, q);
  }, 1200);
}

function showSolution(isCorrect, q) {
  showScreen('screen-solution');

  const header = document.getElementById('solution-header');
  header.className = `solution-header ${isCorrect ? 'correct' : 'wrong'}`;
  header.textContent = isCorrect ? '🎉 ถูกต้อง!' : ' ผิด! มาดูวิธีทำกัน';

  document.getElementById('solution-equation').textContent = q.equation;

  const stepsEl = document.getElementById('solution-steps');
  stepsEl.innerHTML = '';
  currentStep = 0;

  const nextStepBtn = document.getElementById('btn-next-step');
  const nextQBtn = document.getElementById('btn-next-question');
  nextStepBtn.style.display = 'block';
  nextQBtn.style.display = 'none';

  // แสดงขั้นตอนแรกทันที
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

  // อัพเดทคะแนนใน database
  if (currentUser && currentUser.id && !currentUser.id.startsWith('guest')) {
    updateScore(xpGained);
  }

  // แสดงหน้าผลลัพธ์
  document.getElementById('result-level').textContent = currentLevel;
  document.getElementById('result-title').textContent =
    correctCount === 5 ? '🏆 สมบูรณ์แบบ!' :
    correctCount >= 3 ? ' เก่งมาก!' : '💪 ลองใหม่นะ!';
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

    const { error } = await supabase
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
// Event Listeners
// ============================================
document.getElementById('btn-login').addEventListener('click', handleLogin);
document.getElementById('btn-guest').addEventListener('click', handleGuest);
document.getElementById('btn-logout').addEventListener('click', handleLogout);

document.querySelectorAll('.level-card').forEach(card => {
  card.addEventListener('click', () => {
    const level = parseInt(card.dataset.level);
    startGame(level);
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
  showScreen('screen-home');
});

// Enter key on auth
document.getElementById('auth-pin').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleLogin();
});
