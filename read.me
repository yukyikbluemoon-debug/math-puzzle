# Math Puzzle - แก้สมการเชิงเส้นตัวแปรเดียว

![Math Puzzle Demo](https://i.imgur.com/placeholder.png)

**เกมฝึกคณิตศาสตร์สำหรับนักเรียนมัธยมศึกษา** ที่ช่วยให้ผู้เรียนฝึกแก้สมการเชิงเส้นตัวแปรเดียวแบบมีปฏิสัมพันธ์ พร้อมระบบแสดงวิธีทำทีละขั้นตอน และเก็บคะแนนเป็นระบบเกม

---

## ✨ คุณสมบัติหลัก
- **โจทย์สุ่มทุกครั้ง** พร้อมคำตอบเป็นจำนวนเต็ม 100% (ใช้เทคนิค Reverse Generation)
- **4 ระดับความยาก** ตั้งแต่พื้นฐานจนถึงขั้นสูง
  - ระดับ 1: `x + a = b`
  - ระดับ 2: `ax = b`
  - ระดับ 3: `ax + b = c`
  - ระดับ 4: `ax + b = cx + d`
- **ระบบแสดงวิธีทำแบบทีละขั้นตอน** (Interactive Step) ไม่ท่วมท้น
- **ระบบเก็บคะแนนแบบเกม** พร้อมระบบเลเวลและอันดับผู้เล่น
- **รองรับทุกอุปกรณ์** (มือถือ/แท็บเล็ต/คอมพิวเตอร์)

---

## 🛠️ วิธีติดตั้งและใช้งาน

### 1. คัดลอกไฟล์
```bash
git clone https://github.com/yukyikbluemoon-debug/MathPuzzle.git
cd MathPuzzle
```

### 2. ตั้งค่า Supabase
1. ไปที่ [Supabase Dashboard](https://app.supabase.com/)
2. ใช้ Project ID นี้: `pwrhnmvhwhellfbznczb`
3. คัดลอก **Anonymous Key** จาก Project Settings → API
4. เปิดไฟล์ `game.js` และเปลี่ยน:
```javascript
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // แทนด้วย Key จริง
```

### 3. สร้างตารางในฐานข้อมูล
ไปที่ **SQL Editor** ใน Supabase และรันคำสั่งนี้:
```sql
CREATE TABLE math_scores (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  games_played INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE math_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON math_scores FOR ALL USING (true) WITH CHECK (true);
```

### 4. เปิดเกม
- เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์
- หรือใช้ [GitHub Pages](https://yukyikbluemoon-debug.github.io/math-puzzle/)

---

## 📱 สำหรับการใช้งานบนมือถือ
- สามารถใช้งานได้ทันทีผ่านเบราว์เซอร์บนมือถือ
- แนะนำให้เพิ่มเว็บเป็น **PWA** โดย:
  1. เปิดเว็บใน Chrome
  2. แตะปุ่ม ⋮ → บันทึกไปที่หน้าจอหลัก

---

## 🎮 วิธีเล่น
1. เลือก "ระดับความยาก" (1-4)
2. แก้สมการ 5 ข้อ
3. ดูวิธีทำแบบทีละขั้นตอนเมื่อตอบผิด/ถูก
4. ดูคะแนนและอันดับผู้เล่นหลังจบเกม

---

## 💡 ข้อแนะนำสำหรับครู/ผู้พัฒนา
- สามารถปรับระดับความยากได้ในไฟล์ `game.js` (ฟังก์ชัน `generateQuestion()`)
- ปรับธีมสีได้ใน `style.css` (ตัวแปร CSS ที่เริ่มด้วย `--math-`)
- ใช้ระบบ **Supabase** ร่วมกับ WordPuzzle ได้โดยไม่ต้องสร้าง Project ใหม่

---

## 📄 ไฟล์หลัก
| ไฟล์ | หน้าที่ |
|------|--------|
| `index.html` | ส่วนติดต่อผู้ใช้หลัก |
| `style.css` | ดีไซน์แบบ "คณิตศาสตร์" (น้ำเงิน/ฟ้า/เขียว) |
| `game.js` | ลอจิกเกมและระบบสุ่มโจทย์ |

---

## 🤝 ร่วมพัฒนา
- สร้าง Pull Request เพื่อเพิ่มฟีเจอร์ใหม่
- แจ้งปัญหาผ่าน Issues
- ปรับปรุงคู่มือการใช้งาน

---

## 📜 ใบอนุญาต
MIT License - ใช้งานได้ฟรีสำหรับการศึกษาและการพัฒนา

---

> "คณิตศาสตร์ไม่ใช่เรื่องยากเกินไป ถ้าเรามีวิธีฝึกที่ถูกต้อง"  
> ติดตามการอัปเดต: [GitHub Repository](https://github.com/yukyikbluemoon-debug/MathPuzzle)
