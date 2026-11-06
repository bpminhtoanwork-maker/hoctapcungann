// --- BỘ DỮ LIỆU TỪ VỰNG MẪU (HSK 1 - HSK 6) ---
const defaultHSKDataset = [
  { id: 101, zh: "你好", pinyin: "nǐ hǎo", vi: "Xin chào", en: "Hello", de: "Hallo", hsk: "HSK1" },
  { id: 102, zh: "谢谢", pinyin: "xièxie", vi: "Cảm ơn", en: "Thank you", de: "Danke", hsk: "HSK1" },
  { id: 103, zh: "再见", pinyin: "zàijiàn", vi: "Tạm biệt", en: "Goodbye", de: "Auf Wiedersehen", hsk: "HSK1" },
  { id: 201, zh: "机场", pinyin: "jīchǎng", vi: "Sân bay", en: "Airport", de: "Flughafen", hsk: "HSK2" },
  { id: 301, zh: "照顾", pinyin: "zhàogù", vi: "Chăm sóc", en: "Take care of", de: "Kümmern", hsk: "HSK3" },
  { id: 401, zh: "经济", pinyin: "jīngjì", vi: "Kinh tế", en: "Economy", de: "Wirtschaft", hsk: "HSK4" },
  { id: 501, zh: "积极", pinyin: "jījí", vi: "Tích cực", en: "Active", de: "Aktiv", hsk: "HSK5" },
  { id: 601, zh: "抽象", pinyin: "chōuxiàng", vi: "Trừu tượng", en: "Abstract", de: "Abstrakt", hsk: "HSK6" }
];

// --- QUẢN LÝ TRẠNG THÁI & LOCALSTORAGE ---
let vocabList = JSON.parse(localStorage.getItem('polylang_vocab'));
if (!vocabList || vocabList.length === 0) {
  vocabList = defaultHSKDataset;
  localStorage.setItem('polylang_vocab', JSON.stringify(vocabList));
}

let selectedHSK = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];
let currentCard = null;

document.addEventListener('DOMContentLoaded', () => {
  renderTable();
  loadSavedBackground();
});

// --- TÍNH NĂNG PHÁT ÂM (SPEECH SYNTHESIS API) ---
function speakText(text, langCode) {
  if (!text) return;
  if (!('speechSynthesis' in window)) {
    alert("Trình duyệt của bạn không hỗ trợ tính năng phát âm thanh!");
    return;
  }
  
  window.speechSynthesis.cancel(); 

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode; 
  utterance.rate = 0.9; 
  window.speechSynthesis.speak(utterance);
}

// --- QUẢN LÝ ẢNH NỀN TOÀN CỤC ---
function setPresetBackground(url) {
  applyBackground(`url('${url}')`);
  localStorage.setItem('polylang_bg', `url('${url}')`);
  alert("Đã cập nhật ảnh nền thành công!");
}

function changeBackgroundFromFile(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const bgStyle = `url('${e.target.result}')`;
      applyBackground(bgStyle);
      localStorage.setItem('polylang_bg', bgStyle);
      alert("Đã tải và cập nhật ảnh nền từ máy thành công!");
    };
    reader.readAsDataURL(file);
  }
}

function applyBackground(bgValue) {
  const body = document.getElementById('app-body');
  if (body) body.style.backgroundImage = bgValue;
}

function resetBackground() {
  const body = document.getElementById('app-body');
  if (body) body.style.backgroundImage = 'none';
  localStorage.removeItem('polylang_bg');
  alert("Đã đặt lại nền mặc định!");
}

function loadSavedBackground() {
  const savedBg = localStorage.getItem('polylang_bg');
  if (savedBg) {
    applyBackground(savedBg);
  }
}

// --- QUẢN LÝ API KEY GROQ ---
function setGroqKey() {
  const currentKey = localStorage.getItem('polylang_groq_key') || '';
  const newKey = prompt("Nhập Groq API Key của bạn (Lấy miễn phí tại console.groq.com):", currentKey);
  if (newKey !== null) {
    localStorage.setItem('polylang_groq_key', newKey.trim());
    if (newKey.trim()) {
      alert("Đã lưu Groq API Key thành công trên trình duyệt của bạn!");
    } else {
      alert("Đã xóa API Key!");
    }
  }
}

// --- CHUYỂN TAB (3 Tabs) ---
function switchTab(tab) {
  const btnInput = document.getElementById('btn-tab-input');
  const btnQuiz = document.getElementById('btn-tab-quiz');
  const btnBg = document.getElementById('btn-tab-background');

  const tabInput = document.getElementById('tab-input');
  const tabQuiz = document.getElementById('tab-quiz');
  const tabBg = document.getElementById('tab-background');

  if (!btnInput || !btnQuiz || !btnBg || !tabInput || !tabQuiz || !tabBg) return;

  const inactiveClass = "py-4 px-3 text-slate-400 hover:text-indigo-400 transition-colors text-xs md:text-sm font-semibold";
  const activeClass = "py-4 px-3 tab-active transition-colors text-xs md:text-sm font-semibold";

  btnInput.className = inactiveClass;
  btnQuiz.className = inactiveClass;
  btnBg.className = inactiveClass;

  tabInput.classList.add('hidden');
  tabQuiz.classList.add('hidden');
  tabBg.classList.add('hidden');

  if (tab === 'input') {
    btnInput.className = activeClass;
    tabInput.classList.remove('hidden');
  } else if (tab === 'quiz') {
    btnQuiz.className = activeClass;
    tabQuiz.classList.remove('hidden');
    startQuiz();
  } else if (tab === 'background') {
    btnBg.className = activeClass;
    tabBg.classList.remove('hidden');
  }
}

// --- GỌI GROQ API TỰ ĐỘNG ĐIỀN DỮ LIỆU (CÓ CƠ CHẾ DỰ PHÒNG MODEL) ---
async function translateWithGroq() {
  const viInput = document.getElementById('vi');
  if (!viInput) return;
  
  const textVi = viInput.value.trim();
  if (!textVi) {
    alert("Vui lòng nhập từ tiếng Việt trước khi gọi AI!");
    viInput.focus();
    return;
  }

  let apiKey = localStorage.getItem('polylang_groq_key');
  if (!apiKey) {
    apiKey = prompt("Chưa tìm thấy Groq API Key! Vui lòng nhập API Key của bạn (Lấy miễn phí tại console.groq.com):");
    if (!apiKey) return;
    localStorage.setItem('polylang_groq_key', apiKey.trim());
  }

  const promptText = `Dịch từ tiếng Việt sau sang định dạng JSON thuần túy (không kèm giải thích nào khác):
{
  "zh": "Chữ Hán giản thể",
  "pinyin": "Phiên âm Pinyin đầy đủ dấu",
  "en": "Tiếng Anh chuẩn",
  "de": "Tiếng Đức chuẩn",
  "hsk": "HSK1 hoặc HSK2 hoặc HSK3 hoặc HSK4 hoặc HSK5 hoặc HSK6"
}
Từ cần dịch là: "${textVi}"`;

  const aiBtn = document.getElementById('btn-ai-translate');
  const oldHTML = aiBtn ? aiBtn.innerHTML : '';

  try {
    if (aiBtn) {
      aiBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> AI đang dịch...`;
      aiBtn.disabled = true;
    }
    
    // Thử gọi với model thứ nhất
    let response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: promptText }],
        response_format: { type: "json_object" }
      })
    });

    let data = await response.json();

    // Nếu model 1 lỗi, tự động chuyển sang model dự phòng thứ 2
    if (data.error) {
      response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: "gemma2-9b-it",
          messages: [{ role: "user", content: promptText }],
          response_format: { type: "json_object" }
        })
      });
      data = await response.json();
    }

    if(data.error) throw new Error(data.error.message);

    let rawResponse = data.choices[0].message.content;
    rawResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(rawResponse);

    if (document.getElementById('zh')) document.getElementById('zh').value = result.zh || '';
    if (document.getElementById('pinyin')) document.getElementById('pinyin').value = result.pinyin || '';
    if (document.getElementById('en')) document.getElementById('en').value = result.en || '';
    if (document.getElementById('de')) document.getElementById('de').value = result.de || '';
    if (document.getElementById('hsk')) document.getElementById('hsk').value = result.hsk || 'HSK1';

  } catch (err) {
    alert("Lỗi gọi Groq API: " + err.message + "\n(Hãy kiểm tra lại Key hoặc cập nhật key mới bằng biểu tượng chìa khóa).");
  } finally {
    if (aiBtn) {
      aiBtn.innerHTML = oldHTML;
      aiBtn.disabled = false;
    }
  }
}

// --- QUẢN LÝ DỮ LIỆU & BẢNG ---
function addVocabulary(e) {
  e.preventDefault();
  const newItem = {
    id: Date.now(),
    vi: document.getElementById('vi').value.trim(),
    zh: document.getElementById('zh').value.trim(),
    pinyin: document.getElementById('pinyin').value.trim(),
    en: document.getElementById('en').value.trim(),
    de: document.getElementById('de').value.trim(),
    hsk: document.getElementById('hsk').value
  };

  vocabList.unshift(newItem);
  saveAndRender();
  document.getElementById('vocab-form').reset();
}

function saveAndRender() {
  localStorage.setItem('polylang_vocab', JSON.stringify(vocabList));
  renderTable();
}

function resetToDefaultData() {
  if (confirm('Bạn có muốn khôi phục lại bộ từ vựng HSK mẫu ban đầu không?')) {
    vocabList = [...defaultHSKDataset];
    saveAndRender();
    alert('Đã khôi phục thành công!');
  }
}

function renderTable() {
  const tbody = document.getElementById('vocab-table-body');
  const countEl = document.getElementById('vocab-count');
  if (!tbody || !countEl) return;

  countEl.innerText = vocabList.length;
  tbody.innerHTML = '';

  if (vocabList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">Chưa có từ vựng nào.</td></tr>`;
    return;
  }

  vocabList.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-800/40 transition-colors";
    tr.innerHTML = `
      <td class="p-3"><span class="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded text-xs font-semibold">${item.hsk}</span></td>
      <td class="p-3 font-bold text-slate-100">${item.zh}</td>
      <td class="p-3 text-slate-400">${item.pinyin || '-'}</td>
      <td class="p-3 text-slate-200">${item.vi}</td>
      <td class="p-3 text-slate-200">${item.en}</td>
      <td class="p-3 text-slate-200">${item.de}</td>
      <td class="p-3 text-center">
        <button onclick="deleteItem(${item.id})" class="text-rose-400 hover:text-rose-300 p-1"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteItem(id) {
  vocabList = vocabList.filter(item => item.id !== id);
  saveAndRender();
}

function clearAllData() {
  if (confirm('Bạn có chắc muốn xóa sạch toàn bộ từ vựng?')) {
    vocabList = [];
    saveAndRender();
  }
}

function exportJSON() {
  if (vocabList.length === 0) return alert('Chưa có dữ liệu để xuất!');
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vocabList, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `polylang_hsk_backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// --- LOGIC FLASHCARD & QUIZ (TAB 2) ---
function toggleHskFilter(hsk) {
  const btn = document.querySelector(`[data-hsk="${hsk}"]`);
  if (!btn) return;

  if (selectedHSK.includes(hsk)) {
    selectedHSK = selectedHSK.filter(item => item !== hsk);
    btn.className = "hsk-filter-btn px-3 py-1 rounded-full border text-xs font-semibold bg-slate-900/60 border-slate-700 text-slate-400";
  } else {
    selectedHSK.push(hsk);
    btn.className = "hsk-filter-btn px-3 py-1 rounded-full border text-xs font-semibold bg-indigo-950/80 border-indigo-500/60 text-indigo-300";
  }
  startQuiz();
}

function startQuiz() {
  const quizContainer = document.getElementById('quiz-container');
  const noQuizMsg = document.getElementById('no-quiz-msg');
  if (!quizContainer || !noQuizMsg) return;

  const filteredList = vocabList.filter(item => selectedHSK.includes(item.hsk));

  if (filteredList.length === 0) {
    quizContainer.classList.add('hidden');
    noQuizMsg.classList.remove('hidden');
    currentCard = null;
    return;
  }

  noQuizMsg.classList.add('hidden');
  quizContainer.classList.remove('hidden');

  const randomIndex = Math.floor(Math.random() * filteredList.length);
  currentCard = filteredList[randomIndex];

  const quizForm = document.getElementById('quiz-form');
  const solutionBox = document.getElementById('solution-box');
  const pinyinHint = document.getElementById('card-pinyin-hint');
  const btnSubmit = document.getElementById('btn-submit');
  const btnNext = document.getElementById('btn-next');

  if (quizForm) quizForm.reset();
  if (solutionBox) solutionBox.classList.add('hidden');
  if (pinyinHint) pinyinHint.classList.add('hidden');
  if (btnSubmit) btnSubmit.classList.remove('hidden');
  if (btnNext) btnNext.classList.add('hidden');

  ['vi', 'en', 'de'].forEach(lang => {
    const input = document.getElementById(`ans-${lang}`);
    const fb = document.getElementById(`feedback-${lang}`);
    if (input) {
      input.disabled = false;
      input.className = "w-full bg-slate-900/60 border border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-400 outline-none text-sm text-slate-100 placeholder-slate-500";
    }
    if (fb) fb.classList.add('hidden');
  });

  if (document.getElementById('card-hsk')) document.getElementById('card-hsk').innerText = currentCard.hsk;
  if (document.getElementById('card-zh')) document.getElementById('card-zh').innerText = currentCard.zh;
  if (document.getElementById('card-pinyin')) document.getElementById('card-pinyin').innerText = currentCard.pinyin || 'Chưa có';
}

function normalizeStr(str) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function checkAnswers(e) {
  e.preventDefault();
  if (!currentCard) return;

  const userAnswers = {
    vi: document.getElementById('ans-vi') ? document.getElementById('ans-vi').value : '',
    en: document.getElementById('ans-en') ? document.getElementById('ans-en').value : '',
    de: document.getElementById('ans-de') ? document.getElementById('ans-de').value : ''
  };

  ['vi', 'en', 'de'].forEach(lang => {
    const inputField = document.getElementById(`ans-${lang}`);
    const fb = document.getElementById(`feedback-${lang}`);
    if (!inputField || !fb) return;

    inputField.disabled = true;

    const isCorrect = normalizeStr(userAnswers[lang]) === normalizeStr(currentCard[lang]);

    fb.classList.remove('hidden');
    if (isCorrect) {
      inputField.className = "w-full bg-emerald-950/40 border border-emerald-500/60 rounded-lg p-2.5 outline-none text-sm text-emerald-100";
      fb.className = "text-xs mt-1 font-semibold text-emerald-400";
      fb.innerHTML = `<i class="fa-solid fa-circle-check mr-1"></i> Chính xác!`;
    } else {
      inputField.className = "w-full bg-rose-950/40 border border-rose-500/60 rounded-lg p-2.5 outline-none text-sm text-rose-100";
      fb.className = "text-xs mt-1 font-semibold text-rose-400";
      fb.innerHTML = `<i class="fa-solid fa-circle-xmark mr-1"></i> Chưa đúng (Đáp án: <b>${currentCard[lang]}</b>)`;
    }
  });

  if (document.getElementById('card-pinyin-hint')) document.getElementById('card-pinyin-hint').classList.remove('hidden');
  if (document.getElementById('sol-zh')) document.getElementById('sol-zh').innerText = currentCard.zh;
  if (document.getElementById('sol-pinyin')) document.getElementById('sol-pinyin').innerText = currentCard.pinyin || 'Không có';
  if (document.getElementById('sol-vi')) document.getElementById('sol-vi').innerText = currentCard.vi;
  if (document.getElementById('sol-en')) document.getElementById('sol-en').innerText = currentCard.en;
  if (document.getElementById('sol-de')) document.getElementById('sol-de').innerText = currentCard.de;
  if (document.getElementById('solution-box')) document.getElementById('solution-box').classList.remove('hidden');

  if (document.getElementById('btn-submit')) document.getElementById('btn-submit').classList.add('hidden');
  if (document.getElementById('btn-next')) document.getElementById('btn-next').classList.remove('hidden');
}

function nextCard() {
  startQuiz();
}