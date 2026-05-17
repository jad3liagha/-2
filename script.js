// انتظار تحميل DOM بالكامل قبل بدء التنفيذ
document.addEventListener('DOMContentLoaded', function() {
    // ---- عناصر DOM ----
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const pickBtn = document.getElementById('pickFileBtn');
    const appArea = document.getElementById('appArea');
    const removeBtn = document.getElementById('removeBtn');
    const switchBtn = document.getElementById('switchBtn');
    const showFavBtn = document.getElementById('showFavBtn');
    const showAllBtn = document.getElementById('showAllBtn');
    const exportBtn = document.getElementById('exportBtn');
    const statsBtn = document.getElementById('statsBtn');
    const exportFavBtn = document.getElementById('exportFavBtn');
    const importFavBtn = document.getElementById('importFavBtn');
    const searchInput = document.getElementById('searchInput');
    const statsSpan = document.getElementById('statsSpan');
    const hadithContainer = document.getElementById('hadithContainer');
    const quickIndex = document.getElementById('quickIndex');
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const darkModeBtn = document.getElementById('darkModeBtn');
    const fontUpBtn = document.getElementById('fontUpBtn');
    const fontDownBtn = document.getElementById('fontDownBtn');
    const randomBtn = document.getElementById('randomBtn');
    const densityBtn = document.getElementById('densityBtn');

    // ---- المتغيرات العامة ----
    let allHadiths = [];          // [{ id, text, meta, rawMeta }]
    let currentIndices = [];      // فهارس الأحاديث المعروضة بعد الفلترة
    let favoriteIds = new Set();   // مجموعة المعرفات المفضلة
    let onlyFavorites = false;
    let fontSize = 16;
    let compactMode = false;
    let searchQuery = "";

    // ---- دوال مساعدة ----
    function saveSettings() {
        localStorage.setItem('darkMode', document.body.classList.contains('dark'));
        localStorage.setItem('fontSize', fontSize);
        localStorage.setItem('compactMode', compactMode);
        localStorage.setItem('favorites', JSON.stringify([...favoriteIds]));
        if (allHadiths.length) localStorage.setItem('lastHadithData', JSON.stringify(allHadiths));
    }

    function loadSettings() {
        if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark');
        let savedFont = localStorage.getItem('fontSize');
        if (savedFont) { fontSize = parseInt(savedFont); applyFontSize(); }
        if (localStorage.getItem('compactMode') === 'true') { compactMode = true; if (hadithContainer) hadithContainer.classList.add('compact'); }
        let savedFavs = localStorage.getItem('favorites');
        if (savedFavs) favoriteIds = new Set(JSON.parse(savedFavs));
        let lastData = localStorage.getItem('lastHadithData');
        if (lastData) {
            try {
                let parsed = JSON.parse(lastData);
                if (parsed && parsed.length) {
                    allHadiths = parsed;
                    applyFiltersAndRender();
                    if (appArea) appArea.classList.remove('hidden');
                    if (dropZone) dropZone.style.display = 'none';
                    buildQuickIndex();
                }
            } catch(e) { console.warn(e); }
        }
    }

    function applyFontSize() {
        document.querySelectorAll('.hadith-text').forEach(el => el.style.fontSize = fontSize + 'px');
        saveSettings();
    }

    function showToast(msg, isError = false) {
        let toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = msg;
        toast.style.background = isError ? '#9b2c2c' : '#2c5e2a';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ---- ربط أحداث الأزرار الديناميكية (المفضلة، مشاركة، نطق) ----
    function attachDynamicEvents() {
        document.querySelectorAll('.fav-action').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                let id = btn.dataset.id;
                if (favoriteIds.has(id)) favoriteIds.delete(id);
                else favoriteIds.add(id);
                saveSettings();
                render();
            };
        });
        document.querySelectorAll('.share-action').forEach(btn => {
            btn.onclick = () => {
                let text = btn.dataset.text;
                if (navigator.share) navigator.share({ text });
                else navigator.clipboard.writeText(text).then(() => showToast('تم نسخ الحديث'));
            };
        });
        document.querySelectorAll('.tts-action').forEach(btn => {
            btn.onclick = () => {
                let text = btn.dataset.text;
                let utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ar';
                speechSynthesis.cancel();
                speechSynthesis.speak(utterance);
            };
        });
    }

    // ---- عرض الأحاديث ----
    function render() {
        if (!allHadiths.length) return;
        let indicesToShow = currentIndices;
        if (onlyFavorites) indicesToShow = indicesToShow.filter(idx => favoriteIds.has(allHadiths[idx].id));
        if (indicesToShow.length === 0) {
            hadithContainer.innerHTML = '<div style="text-align:center;padding:20px;">🔍 لا توجد أحاديث مطابقة</div>';
            statsSpan.innerText = `0 من ${allHadiths.length}`;
            return;
        }
        let html = '';
        for (let idx of indicesToShow) {
            let h = allHadiths[idx];
            let isFav = favoriteIds.has(h.id);
            html += `
                <div class="hadith-item" data-id="${h.id}" data-index="${idx}">
                    <div class="item-actions">
                        <button class="fav-action" data-id="${h.id}">${isFav ? '⭐' : '☆'}</button>
                        <button class="share-action" data-text="${escapeHtml(h.text)}">📤</button>
                        <button class="tts-action" data-text="${escapeHtml(h.text)}">🔊</button>
                    </div>
                    <div class="hadith-text">${escapeHtml(h.text)}</div>
                    <div class="hadith-meta">${h.meta.map(m => escapeHtml(m)).join(' • ')}</div>
                </div>
            `;
        }
        hadithContainer.innerHTML = html;
        let shownCount = indicesToShow.length;
        let total = allHadiths.length;
        statsSpan.innerText = onlyFavorites ? `⭐ المفضلة: ${shownCount} من ${favoriteIds.size}` : `📚 عرض ${shownCount} من ${total}`;
        applyFontSize();
        if (compactMode) hadithContainer.classList.add('compact');
        else hadithContainer.classList.remove('compact');
        attachDynamicEvents();
    }

    function applyFiltersAndRender() {
        if (!allHadiths.length) return;
        let filtered = [];
        for (let i = 0; i < allHadiths.length; i++) {
            let h = allHadiths[i];
            let matchesSearch = searchQuery === "" || h.text.includes(searchQuery) || h.rawMeta.includes(searchQuery);
            if (matchesSearch) filtered.push(i);
        }
        currentIndices = filtered;
        render();
        buildQuickIndex();
    }

    function buildQuickIndex() {
        if (!quickIndex) return;
        quickIndex.innerHTML = '<option value="">📑 فهرس سريع</option>';
        for (let i = 0; i < allHadiths.length; i += 10) {
            let opt = document.createElement('option');
            opt.value = i;
            opt.text = `حديث ${i+1} - ${Math.min(i+10, allHadiths.length)}`;
            quickIndex.appendChild(opt);
        }
        quickIndex.onchange = () => {
            let start = parseInt(quickIndex.value);
            if (!isNaN(start) && hadithContainer.children[start]) {
                hadithContainer.children[start].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            quickIndex.value = "";
        };
    }

    // ---- معالجة رفع الملف ----
    function processUploadedFile(file) {
        if (!file.name.endsWith('.json')) {
            showToast('الرجاء اختيار ملف JSON', true);
            return;
        }
        let reader = new FileReader();
        reader.onload = (e) => {
            try {
                let data = JSON.parse(e.target.result);
                extractHadiths(data);
            } catch (err) {
                showToast('خطأ في قراءة الملف: ' + err.message, true);
            }
        };
        reader.readAsText(file, 'UTF-8');
    }

    function extractHadiths(jsonData) {
        let raw = [];
        if (Array.isArray(jsonData)) raw = jsonData;
        else if (jsonData.hadiths) raw = jsonData.hadiths;
        else if (jsonData.data) raw = jsonData.data;
        else raw = Object.values(jsonData).filter(v => typeof v === 'object');
        
        const textFields = ['hadith', 'text', 'content', 'matn', 'الحديث', 'النص', 'body'];
        const metaFields = ['id', 'number', 'source', 'book', 'grade', 'الدرجة', 'المصدر'];
        
        let hadiths = [];
        for (let i = 0; i < raw.length; i++) {
            let item = raw[i];
            let text = '';
            for (let f of textFields) {
                if (item[f] && typeof item[f] === 'string' && item[f].trim()) {
                    text = item[f].trim();
                    break;
                }
            }
            if (!text) continue;
            
            let meta = [];
            let id = null;
            for (let f of metaFields) {
                if (item[f] !== undefined && item[f] !== '') {
                    let label = (f === 'id' || f === 'number') ? 'رقم' : (f === 'source' ? 'المصدر' : (f === 'grade' ? 'الدرجة' : f));
                    meta.push(`${label}: ${item[f]}`);
                    if (f === 'id' || f === 'number') id = item[f];
                }
            }
            if (!id) id = 'h_' + i;
            hadiths.push({ id, text, meta, rawMeta: meta.join(' ') });
        }
        
        if (hadiths.length === 0) {
            showToast('لم يتم العثور على أحاديث في هذا الملف', true);
            return;
        }
        
        allHadiths = hadiths;
        favoriteIds = new Set([...favoriteIds].filter(id => allHadiths.some(h => h.id == id)));
        saveSettings();
        applyFiltersAndRender();
        appArea.classList.remove('hidden');
        dropZone.style.display = 'none';
        buildQuickIndex();
        showToast(`تم تحميل ${hadiths.length} حديث`);
    }

    function resetUI() {
        allHadiths = [];
        currentIndices = [];
        appArea.classList.add('hidden');
        dropZone.style.display = 'block';
        searchInput.value = '';
        searchQuery = '';
        hadithContainer.innerHTML = '';
        statsSpan.innerText = '';
        localStorage.removeItem('lastHadithData');
        showToast('تم إزالة الملف');
    }

    // ---- ربط الأحداث الثابتة ----
    if (pickBtn) pickBtn.onclick = () => fileInput.click();
    if (fileInput) fileInput.onchange = (e) => { if (e.target.files[0]) processUploadedFile(e.target.files[0]); };
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => e.preventDefault());
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            let file = e.dataTransfer.files[0];
            if (file) processUploadedFile(file);
        });
    }
    if (removeBtn) removeBtn.onclick = resetUI;
    if (switchBtn) switchBtn.onclick = () => fileInput.click();
    if (showFavBtn) showFavBtn.onclick = () => { onlyFavorites = true; applyFiltersAndRender(); };
    if (showAllBtn) showAllBtn.onclick = () => { onlyFavorites = false; applyFiltersAndRender(); };
    if (exportBtn) {
        exportBtn.onclick = () => {
            if (!allHadiths.length) return;
            let indices = currentIndices;
            if (onlyFavorites) indices = indices.filter(idx => favoriteIds.has(allHadiths[idx].id));
            let dataToExport = indices.map(idx => allHadiths[idx]);
            let blob = new Blob([JSON.stringify(dataToExport, null, 2)], {type: 'application/json'});
            let a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'exported_hadiths.json';
            a.click();
            showToast('تم تصدير النتائج');
        };
    }
    if (statsBtn) {
        statsBtn.onclick = () => {
            if (!allHadiths.length) return;
            let total = allHadiths.length;
            let totalChars = allHadiths.reduce((s, h) => s + h.text.length, 0);
            let avg = (totalChars / total).toFixed(0);
            let longest = Math.max(...allHadiths.map(h => h.text.length));
            alert(`📊 إحصائيات:\nعدد الأحاديث: ${total}\nمتوسط الطول: ${avg} حرف\nأطول حديث: ${longest} حرف`);
        };
    }
    if (exportFavBtn) {
        exportFavBtn.onclick = () => {
            let favHadiths = allHadiths.filter(h => favoriteIds.has(h.id));
            if (!favHadiths.length) { showToast('لا توجد أحاديث مفضلة', true); return; }
            let blob = new Blob([JSON.stringify(favHadiths, null, 2)], {type: 'application/json'});
            let a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'my_favorites.json';
            a.click();
        };
    }
    if (importFavBtn) {
        importFavBtn.onclick = () => {
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = (e) => {
                let file = e.target.files[0];
                if (!file) return;
                let reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        let imported = JSON.parse(ev.target.result);
                        if (!Array.isArray(imported)) throw new Error();
                        let newFavIds = new Set();
                        for (let h of imported) {
                            if (h.id) newFavIds.add(h.id);
                            else if (h.text) {
                                let match = allHadiths.find(ex => ex.text === h.text);
                                if (match) newFavIds.add(match.id);
                            }
                        }
                        favoriteIds = newFavIds;
                        saveSettings();
                        render();
                        showToast(`تم استيراد ${newFavIds.size} مفضلة`);
                    } catch(err) { showToast('ملف غير صالح', true); }
                };
                reader.readAsText(file);
            };
            input.click();
        };
    }
    if (searchInput) {
        searchInput.oninput = (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            applyFiltersAndRender();
        };
    }
    if (darkModeBtn) {
        darkModeBtn.onclick = () => {
            document.body.classList.toggle('dark');
            saveSettings();
        };
    }
    if (fontUpBtn) {
        fontUpBtn.onclick = () => { fontSize = Math.min(32, fontSize+2); applyFontSize(); saveSettings(); };
    }
    if (fontDownBtn) {
        fontDownBtn.onclick = () => { fontSize = Math.max(12, fontSize-2); applyFontSize(); saveSettings(); };
    }
    if (randomBtn) {
        randomBtn.onclick = () => {
            if (!allHadiths.length) return;
            let randomIndex = Math.floor(Math.random() * allHadiths.length);
            let items = document.querySelectorAll('.hadith-item');
            if (items[randomIndex]) items[randomIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            else showToast('حدث خطأ', true);
        };
    }
    if (densityBtn) {
        densityBtn.onclick = () => {
            compactMode = !compactMode;
            if (compactMode) hadithContainer.classList.add('compact');
            else hadithContainer.classList.remove('compact');
            saveSettings();
        };
    }
    if (hadithContainer) {
        hadithContainer.addEventListener('scroll', () => {
            if (hadithContainer.scrollTop > 300) scrollTopBtn.classList.remove('hidden');
            else scrollTopBtn.classList.add('hidden');
        });
    }
    if (scrollTopBtn) scrollTopBtn.onclick = () => hadithContainer.scrollTo({ top: 0, behavior: 'smooth' });

    // بدء التطبيق
    loadSettings();
});