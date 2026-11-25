
const addQuestionBtn = document.getElementById("addQuestionBtn");
const questionType = document.getElementById("questionType");
const questionsContainer = document.getElementById("questionsContainer");

const teacherEditor = document.getElementById("teacherEditor");
const studentPreview = document.getElementById("studentPreview");
const studentQuestions = document.getElementById("studentQuestions");
const studentResults = document.getElementById("studentResults");
const studentFeedback = document.getElementById("studentFeedback");

const previewWorksheetBtn = document.getElementById("previewWorksheetBtn");
const checkAnswersBtn = document.getElementById("checkAnswersBtn");
const retryWorksheetBtn = document.getElementById("retryWorksheetBtn");
const backToEditorBtn = document.getElementById("backToEditorBtn");

const GREEN = "#008000";
const ORANGE = "#FF8500";
const DARK_ORANGE = "#A65300";

const matchingColors = [
    "#008000",
    "#1565C0",
    "#8E24AA",
    "#EF6C00",
    "#00838F",
    "#827717"
];

let questionId = 0;
let worksheetQuestions = [];
let studentAnswers = {};
let worksheetFinished = false;
let matchingObservers = [];

// ==========================================
// أدوات مساعدة
// ==========================================

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeAnswer(value) {
    return String(value ?? "")
        .normalize("NFC")
        .trim()
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/\u0640/g, "")
        .replace(/\s+/g, " ");
}

function shuffleArray(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] =
            [result[j], result[i]];
    }

    return result;
}

function formatNumber(number) {
    return Number(number.toFixed(2)).toString();
}

// ==========================================
// إضافة الأسئلة
// ==========================================

addQuestionBtn.addEventListener("click", function () {

    const type = questionType.value;

    if (type === "text") {
        addTextQuestion();

    } else if (type === "truefalse") {
        addTrueFalseQuestion();

    } else if (type === "image") {
        addImageQuestion();

    } else if (type === "blank") {
        addBlankQuestion();

    } else if (["matching", "match"].includes(type)) {
        addMatchingQuestion();
    }
});

// ==========================================
// إنشاء البطاقة الأساسية للسؤال
// ==========================================

function createQuestionCard(type, title, content) {

    const card = document.createElement("div");

    card.className = "question-card";
    card.dataset.type = type;

    card.innerHTML = `
        <div class="question-header">
            <h3 class="question-number">السؤال</h3>

            <button type="button" class="delete-question">
                حذف السؤال
            </button>
        </div>

        <div class="question-type">${title}</div>

        ${content}

        <label>درجة السؤال</label>

        <input type="number"
            class="question-score"
            value="1"
            min="1"
            step="1"
            aria-label="درجة السؤال">
    `;

    questionsContainer.appendChild(card);

    card.querySelector(".delete-question")
        .addEventListener("click", function () {

            if (confirm("هل تريد حذف هذا السؤال؟")) {
                card.remove();
                updateQuestionNumbers();
            }
        });

    updateQuestionNumbers();

    return card;
}

function updateQuestionNumbers() {

    questionsContainer
        .querySelectorAll(".question-card")
        .forEach(function (card, index) {

            card.querySelector(".question-number")
                .textContent = "السؤال رقم " + (index + 1);
        });
}

// ==========================================
// النوع الأول: اختيار من متعدد - نصوص
// ==========================================

function addTextQuestion() {

    const names = [
        "الأولى", "الثانية", "الثالثة", "الرابعة"
    ];

    const card = createQuestionCard(
        "text",
        "اختيار من متعدد (إجابات نصية)",
        `
        <label>نص السؤال</label>

        <textarea class="question-text"
            rows="2"
            placeholder="اكتب نص السؤال هنا"
            aria-label="نص السؤال"></textarea>

        <label>الإجابات</label>

        ${names.map(name => `
            <input type="text"
                class="answer-input"
                placeholder="الإجابة ${name}"
                aria-label="الإجابة ${name}">
        `).join("")}

        <label>حدد الإجابة الصحيحة</label>

        <select class="correct-answer"
            aria-label="حدد الإجابة الصحيحة">

            <option value="">اختر الإجابة الصحيحة</option>

            ${names.map((name, i) => `
                <option value="${i}">
                    الإجابة ${name}
                </option>
            `).join("")}

        </select>
        `
    );

    const correctSelect = card.querySelector(".correct-answer");

    card.querySelectorAll(".answer-input")
        .forEach(function (input, index) {

            input.addEventListener("input", function () {

                const text = input.value.trim();

                correctSelect.options[index + 1].textContent =
                    "الإجابة " + (index + 1) +
                    (text ? ": " + text : "");
            });
        });
}

// ==========================================
// النوع الثاني: صح أو خطأ
// ==========================================

function addTrueFalseQuestion() {

    questionId++;

    createQuestionCard(
        "truefalse",
        "صح أو خطأ",
        `
        <label>نص العبارة</label>

        <textarea class="question-text"
            rows="2"
            placeholder="اكتب العبارة هنا"
            aria-label="نص العبارة"></textarea>

        <label>حدد الإجابة الصحيحة</label>

        <div style="display:flex;gap:15px;flex-wrap:wrap;">

            <label style="
                flex:1;
                display:flex;
                align-items:center;
                justify-content:center;
                gap:10px;
                padding:18px;
                margin:0;
                border:2px solid #008000;
                border-radius:10px;
                background:#F0FFF0;
                color:#008000;
                cursor:pointer;
            ">

                <input type="radio"
                    name="correct-${questionId}"
                    class="correct-answer"
                    value="true"
                    style="width:auto;accent-color:#008000;">

                ✓ صح

            </label>

            <label style="
                flex:1;
                display:flex;
                align-items:center;
                justify-content:center;
                gap:10px;
                padding:18px;
                margin:0;
                border:2px solid #FF8500;
                border-radius:10px;
                background:#FFF0DC;
                color:#A65300;
                cursor:pointer;
            ">

                <input type="radio"
                    name="correct-${questionId}"
                    class="correct-answer"
                    value="false"
                    style="width:auto;accent-color:#FF8500;">

                ✗ خطأ

            </label>

        </div>
        `
    );
}

// ==========================================
// أدوات رفع الصور
// ==========================================

async function optimizeImage(blob, maxSide = 1200, quality = 0.86) {
    const url = URL.createObjectURL(blob);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality));
        if (!compressed || compressed.type !== "image/webp") return blob;
        return compressed.size < blob.size ? compressed : blob;
    } finally { URL.revokeObjectURL(url); }
}

function setupImageUpload(
    container,
    inputSelector,
    previewSelector,
    placeholderSelector
) {

    const input = container.querySelector(inputSelector);
    const preview = container.querySelector(previewSelector);
    const placeholder = container.querySelector(placeholderSelector);

    let version = 0;

    input.addEventListener("change", function () {

        const file = input.files[0];

        if (!file) return;

        const currentVersion = ++version;

        const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {

            alert("يرجى اختيار صورة PNG أو JPG أو WebP.");

            input.value = "";
            delete container.dataset.pending;

            return;
        }

        if (file.size > 5 * 1024 * 1024) {

            alert("يجب ألا يتجاوز حجم الصورة 5 ميجابايت.");

            input.value = "";
            delete container.dataset.pending;

            return;
        }

        container.dataset.pending = "true";

        const reader = new FileReader();

        function fail(message) {

            if (currentVersion !== version) return;

            delete container.dataset.pending;
            input.value = "";

            alert(message);
        }

        reader.onload = function () {

            if (currentVersion !== version) return;

            const image = new Image();

            image.onload = function () {

                if (currentVersion !== version) return;

                container.dataset.image = reader.result;

                preview.src = reader.result;
                preview.style.display = "block";
                placeholder.style.display = "none";

                delete container.dataset.pending;
            };

            image.onerror = function () {
                fail("تعذر فتح الصورة. اختر صورة أخرى.");
            };

            image.src = reader.result;
        };

        reader.onerror = function () {
            fail("تعذر قراءة الصورة.");
        };

        optimizeImage(file, 1200).then(blob => reader.readAsDataURL(blob)).catch(() => reader.onerror());
    });
}

// ==========================================
// النوع الثالث: اختيار من متعدد - صور
// ==========================================

function addImageQuestion() {

    let imageOptions = "";

    for (let i = 0; i < 4; i++) {

        imageOptions += `
            <div class="image-option" style="
                background:#FFFFFF;
                border:1px solid #D0D7D0;
                border-radius:12px;
                padding:15px;
                text-align:center;
                min-width:0;
            ">

                <h4 style="color:#008000;margin:0 0 15px;">
                    الصورة رقم ${i + 1}
                </h4>

                <div style="
                    height:160px;
                    background:#F4F7F5;
                    border:2px dashed #B8CDB8;
                    border-radius:10px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    overflow:hidden;
                ">

                    <span class="image-placeholder">
                        معاينة الصورة
                    </span>

                    <img class="image-preview"
                        alt="معاينة الصورة رقم ${i + 1}"
                        style="
                            display:none;
                            width:100%;
                            height:100%;
                            object-fit:contain;
                        ">

                </div>

                <label style="
                    background:#008000;
                    color:#FFFFFF;
                    padding:12px;
                    border-radius:8px;
                    cursor:pointer;
                ">

                    اختيار أو استبدال الصورة

                    <input type="file"
                        class="image-input"
                        accept="image/png,image/jpeg,image/webp"
                        aria-label="اختيار الصورة رقم ${i + 1}"
                        style="
                            position:absolute;
                            width:1px;
                            height:1px;
                            opacity:0;
                            padding:0;
                        ">

                </label>

                <input type="text"
                    class="image-description"
                    placeholder="وصف الصورة (اختياري)"
                    aria-label="وصف الصورة رقم ${i + 1}">

            </div>
        `;
    }

    const card = createQuestionCard(
        "image",
        "اختيار من متعدد (إجابات مصورة)",
        `
        <label>نص السؤال</label>

        <textarea class="question-text"
            rows="2"
            placeholder="اكتب نص السؤال هنا"
            aria-label="نص السؤال"></textarea>

        <label>صور الإجابات</label>

        <div style="
            display:grid;
            grid-template-columns:
                repeat(auto-fit,minmax(min(100%,280px),1fr));
            gap:15px;
        ">
            ${imageOptions}
        </div>

        <label>حدد الصورة الصحيحة</label>

        <select class="correct-answer"
            aria-label="حدد الصورة الصحيحة">

            <option value="">اختر الصورة الصحيحة</option>

            ${["الأولى", "الثانية", "الثالثة", "الرابعة"]
                .map((name, i) => `
                    <option value="${i}">
                        الصورة ${name}
                    </option>
                `).join("")}

        </select>
        `
    );

    card.querySelectorAll(".image-option")
        .forEach(function (option) {

            setupImageUpload(
                option,
                ".image-input",
                ".image-preview",
                ".image-placeholder"
            );
        });

    const correctSelect = card.querySelector(".correct-answer");

    card.querySelectorAll(".image-description")
        .forEach(function (input, index) {

            input.addEventListener("input", function () {

                const description = input.value.trim();

                correctSelect.options[index + 1].textContent =
                    "الصورة " + (index + 1) +
                    (description ? ": " + description : "");
            });
        });
}

// ==========================================
// النوع الرابع: أكمل الفراغ
// ==========================================

function addBlankQuestion() {

    createQuestionCard(
        "blank",
        "أكمل الفراغ",
        `
        <label>نص السؤال</label>

        <textarea class="question-text"
            rows="3"
            placeholder="مثال: العضو المسؤول عن ضخ الدم هو ........"
            aria-label="نص السؤال"></textarea>

        <label>الإجابة الصحيحة</label>

        <input type="text"
            class="correct-answer"
            placeholder="مثال: القلب"
            aria-label="الإجابة الصحيحة">

        <label>إجابات بديلة مقبولة (اختياري)</label>

        <input type="text"
            class="alternative-answers"
            placeholder="اكتب الإجابات البديلة مفصولة بفاصلة"
            aria-label="الإجابات البديلة">

        <p style="font-size:14px;color:#607060;">
            يمكنك إضافة أكثر من إجابة مقبولة،
            مع الفصل بينها بفاصلة.
        </p>
        `
    );
}

// ==========================================
// النوع الخامس: التوصيل والمطابقة
// ==========================================

function addMatchingQuestion() {

    const card = createQuestionCard(
        "matching",
        "التوصيل والمطابقة",
        `
        <label>نص السؤال</label>

        <textarea class="question-text"
            rows="2"
            placeholder="صل كل عنصر بما يناسبه"
            aria-label="نص السؤال"></textarea>

        <div style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:15px;
        ">

            <div>
                <label>نوع العمود الأول</label>

                <select class="match-right-type">
                    <option value="text">نص</option>
                    <option value="image">صورة</option>
                </select>
            </div>

            <div>
                <label>نوع العمود الثاني</label>

                <select class="match-left-type">
                    <option value="text">نص</option>
                    <option value="image">صورة</option>
                </select>
            </div>

        </div>

        <p>
            ضع كل عنصر مع الإجابة المطابقة له في نفس الزوج.
        </p>

        <div class="match-pairs"></div>

        <button type="button"
            class="add-pair"
            style="
                background:#008000;
                color:white;
                width:100%;
            ">
            + إضافة زوج جديد
        </button>
        `
    );

    const list = card.querySelector(".match-pairs");

    const types = [
        card.querySelector(".match-right-type"),
        card.querySelector(".match-left-type")
    ];

    function refresh() {

        const pairs = [...list.children];

        pairs.forEach(function (pair, index) {

            pair.querySelector("h4").textContent =
                "الزوج رقم " + (index + 1);

            pair.querySelector(".remove-pair").disabled =
                pairs.length <= 2;

            pair.querySelectorAll(".match-cell")
                .forEach(function (cell, side) {

                    cell.querySelector(".match-text").hidden =
                        types[side].value !== "text";

                    cell.querySelector(".match-image").hidden =
                        types[side].value !== "image";
                });
        });
    }

    function addPair() {

        const pair = document.createElement("div");

        pair.className = "match-pair";

        pair.style.cssText = `
            background:white;
            border:1px solid #D0D7D0;
            border-radius:12px;
            padding:15px;
            margin:15px 0;
        `;

        pair.innerHTML = `
            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:10px;
            ">

                <h4 style="color:#008000;margin:0;"></h4>

                <button type="button"
                    class="remove-pair"
                    style="
                        background:#FFF0DC;
                        color:#A65300;
                        border:1px solid #FF8500;
                        padding:8px 12px;
                        font-size:14px;
                    ">
                    حذف الزوج
                </button>

            </div>

            <div style="
                display:grid;
                grid-template-columns:
                    minmax(0,1fr) minmax(0,1fr);
                gap:15px;
                margin-top:12px;
            ">

                ${["الأول", "الثاني"].map((name, side) => `

                    <div class="match-cell" data-side="${side}">

                        <label>العمود ${name}</label>

                        <div class="match-text">

                            <input type="text"
                                class="match-value"
                                placeholder="اكتب النص هنا">

                        </div>

                        <div class="match-image" hidden>

                            <div style="
                                height:140px;
                                border:2px dashed #B8CDB8;
                                border-radius:8px;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                overflow:hidden;
                            ">

                                <span class="match-placeholder">
                                    معاينة الصورة
                                </span>

                                <img class="match-preview"
                                    alt="معاينة الصورة"
                                    style="
                                        display:none;
                                        width:100%;
                                        height:100%;
                                        object-fit:contain;
                                    ">

                            </div>

                            <label style="
                                background:#008000;
                                color:white;
                                padding:10px;
                                border-radius:8px;
                                cursor:pointer;
                                text-align:center;
                            ">

                                اختيار أو استبدال الصورة

                                <input type="file"
                                    class="match-file"
                                    accept="image/png,image/jpeg,image/webp"
                                    style="
                                        position:absolute;
                                        width:1px;
                                        height:1px;
                                        opacity:0;
                                        padding:0;
                                    ">

                            </label>

                            <input type="text"
                                class="match-description"
                                placeholder="وصف الصورة (اختياري)">

                        </div>

                    </div>

                `).join("")}

            </div>
        `;

        pair.querySelector(".remove-pair")
            .addEventListener("click", function () {

                if (
                    list.children.length > 2 &&
                    confirm("هل تريد حذف هذا الزوج؟")
                ) {
                    pair.remove();
                    refresh();
                }
            });

        pair.querySelectorAll(".match-cell")
            .forEach(function (cell) {

                setupImageUpload(
                    cell,
                    ".match-file",
                    ".match-preview",
                    ".match-placeholder"
                );
            });

        list.appendChild(pair);

        refresh();
    }

    types.forEach(function (type) {
        type.addEventListener("change", refresh);
    });

    card.querySelector(".add-pair")
        .addEventListener("click", addPair);

    addPair();
    addPair();
    addPair();
}

// ==========================================
// قراءة الأسئلة من محرر المعلم
// ==========================================

function collectWorksheetQuestions() {

    const cards = [
        ...questionsContainer.querySelectorAll(".question-card")
    ];

    if (!cards.length) {
        throw new Error("يرجى إضافة سؤال واحد على الأقل.");
    }

    return cards.map(function (card, index) {

        const number = index + 1;
        const type = card.dataset.type;

        const text = card.querySelector(".question-text")
            .value.trim();

        const score = Number(
            card.querySelector(".question-score").value
        );

        function requireValue(condition, message) {

            if (!condition) {

                card.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                throw new Error(
                    "السؤال رقم " + number + ": " + message
                );
            }
        }

        requireValue(text, "يرجى كتابة نص السؤال.");

        requireValue(
            Number.isSafeInteger(score) && score > 0,
            "يرجى إدخال درجة صحيحة أكبر من صفر."
        );

        const question = {
            id: index,
            type: type,
            text: text,
            score: score
        };

        if (type === "text") {

            question.options = [
                ...card.querySelectorAll(".answer-input")
            ].map(input => input.value.trim());

            question.correct =
                card.querySelector(".correct-answer").value;

            requireValue(
                question.options.every(Boolean),
                "يرجى كتابة جميع الإجابات."
            );

            requireValue(
                question.correct !== "",
                "يرجى تحديد الإجابة الصحيحة."
            );

        } else if (type === "truefalse") {

            const selected = card.querySelector(
                ".correct-answer:checked"
            );

            requireValue(
                selected,
                "يرجى تحديد صح أو خطأ."
            );

            question.correct = selected.value;

        } else if (type === "image") {

            const options = [
                ...card.querySelectorAll(".image-option")
            ];

            requireValue(
                options.every(option => !option.dataset.pending),
                "انتظر حتى يكتمل تحميل الصور."
            );

            question.options = options.map(option => ({

                image: option.dataset.image || "",

                description: option
                    .querySelector(".image-description")
                    .value.trim()
            }));

            question.correct =
                card.querySelector(".correct-answer").value;

            requireValue(
                question.options.every(option => option.image),
                "يرجى إضافة الصور الأربع."
            );

            requireValue(
                question.correct !== "",
                "يرجى تحديد الصورة الصحيحة."
            );

        } else if (type === "blank") {

            question.correct = card
                .querySelector(".correct-answer")
                .value.trim();

            requireValue(
                question.correct,
                "يرجى كتابة الإجابة الصحيحة."
            );

            question.alternatives = card
                .querySelector(".alternative-answers")
                .value
                .split(/[,،]/)
                .map(answer => answer.trim())
                .filter(Boolean);

        } else if (type === "matching") {

            const types = [
                card.querySelector(".match-right-type").value,
                card.querySelector(".match-left-type").value
            ];

            question.pairs = [
                ...card.querySelectorAll(".match-pair")
            ].map(function (pair, pairIndex) {

                const cells = [
                    ...pair.querySelectorAll(".match-cell")
                ];

                return cells.map(function (cell, side) {

                    const itemType = types[side];

                    if (itemType === "text") {

                        const text = cell
                            .querySelector(".match-value")
                            .value.trim();

                        requireValue(
                            text,
                            "يرجى إكمال نصوص الزوج رقم " +
                            (pairIndex + 1)
                        );

                        return {
                            type: "text",
                            text: text
                        };

                    } else {

                        requireValue(
                            !cell.dataset.pending,
                            "انتظر حتى يكتمل تحميل الصور."
                        );

                        requireValue(
                            cell.dataset.image,
                            "يرجى إضافة صور الزوج رقم " +
                            (pairIndex + 1)
                        );

                        return {
                            type: "image",
                            image: cell.dataset.image,
                            description: cell
                                .querySelector(".match-description")
                                .value.trim()
                        };
                    }
                });
            });

        } else {

            throw new Error("نوع سؤال غير مدعوم.");
        }

        return question;
    });
}

// ==========================================
// تشغيل زر المعاينة
// ==========================================

previewWorksheetBtn.addEventListener("click", function () {

    const subject = document.getElementById("subject")
        .value.trim();

    const lesson = document.getElementById("lesson")
        .value.trim();

    const instructions = document.getElementById("instructions")
        .value.trim();

    if (!subject) {

        alert("يرجى كتابة اسم المادة.");

        document.getElementById("subject").focus();

        return;
    }

    if (!lesson) {

        alert("يرجى كتابة عنوان الدرس.");

        document.getElementById("lesson").focus();

        return;
    }

    try {

        worksheetQuestions = collectWorksheetQuestions();

    } catch (error) {

        alert(error.message);

        return;
    }

    document.getElementById("previewSubject").textContent =
        subject;

    document.getElementById("previewLesson").textContent =
        lesson;

    document.getElementById("previewInstructions").textContent =
        instructions || "اقرأ الأسئلة جيدًا ثم أجب عنها.";

    teacherEditor.hidden = true;
    studentPreview.hidden = false;

    document.body.classList.add("student-mode");

    renderStudentWorksheet();

    window.scrollTo(0, 0);
});

// ==========================================
// عرض ورقة عمل الطالب
// ==========================================

function clearMatchingObservers() {

    matchingObservers.forEach(observer => {
        observer.disconnect();
    });

    matchingObservers = [];
}

function renderStudentWorksheet() {

    clearMatchingObservers();

    studentAnswers = {};
    worksheetFinished = false;

    studentQuestions.innerHTML = "";

    studentResults.hidden = true;
    studentResults.innerHTML = "";

    studentFeedback.hidden = true;
    studentFeedback.innerHTML = "";

    checkAnswersBtn.hidden = false;
    checkAnswersBtn.disabled = false;

    retryWorksheetBtn.hidden = true;

    worksheetQuestions.forEach(function (question, index) {

        const card = document.createElement("div");

        card.className = "student-question";
        card.dataset.index = index;

        card.innerHTML = `
            <div style="
                display:flex;
                justify-content:space-between;
                gap:10px;
            ">

                <span class="student-question-number">
                    السؤال رقم ${index + 1}
                </span>

                <span class="student-question-score">
                    الدرجة: ${question.score}
                </span>

            </div>

            <div class="student-question-title"
                style="white-space:pre-wrap;"></div>

            <div class="student-answer-area"></div>

            <div class="question-feedback"
                role="status"
                hidden></div>
        `;

        card.querySelector(".student-question-title")
            .textContent = question.text.trim();

        studentQuestions.appendChild(card);

        const area = card.querySelector(".student-answer-area");

        if (question.type === "text") {

            renderTextOptions(question, area);

        } else if (question.type === "truefalse") {

            renderTrueFalseOptions(question, area);

        } else if (question.type === "image") {

            renderImageOptions(question, area);

        } else if (question.type === "blank") {

            renderBlankInput(question, area);

        } else if (question.type === "matching") {

            renderMatchingQuestion(question, area);
        }
    });

    updateStudentProgress();
}

// ==========================================
// عرض الإجابات النصية
// ==========================================

function renderTextOptions(question, area) {

    area.innerHTML = `
        <div class="student-options">

            ${question.options.map((option, index) => `

                <label class="student-option"
                    data-value="${index}">

                    <input type="radio"
                        name="student-${question.id}"
                        value="${index}">

                    <span>${escapeHTML(option)}</span>

                </label>

            `).join("")}

        </div>
    `;

    setupStudentRadio(question, area);
}

// ==========================================
// عرض صح أو خطأ
// ==========================================

function renderTrueFalseOptions(question, area) {

    area.innerHTML = `
        <div class="student-options">

            <label class="student-option" data-value="true">

                <input type="radio"
                    name="student-${question.id}"
                    value="true">

                <span>✓ صح</span>

            </label>

            <label class="student-option" data-value="false">

                <input type="radio"
                    name="student-${question.id}"
                    value="false">

                <span>✗ خطأ</span>

            </label>

        </div>
    `;

    setupStudentRadio(question, area);
}

// ==========================================
// عرض الإجابات المصورة
// ==========================================

function renderImageOptions(question, area) {

    area.innerHTML = `
        <div class="student-image-options">

            ${question.options.map((option, index) => `

                <label class="student-image-option"
                    data-value="${index}">

                    <img
                        src="${escapeHTML(option.image)}"
                        alt="${escapeHTML(
                            option.description ||
                            "الصورة رقم " + (index + 1)
                        )}">

                    ${option.description
                        ? `<div>${escapeHTML(option.description)}</div>`
                        : ""}

                    <input type="radio"
                        name="student-${question.id}"
                        value="${index}">

                </label>

            `).join("")}

        </div>
    `;

    setupStudentRadio(question, area);
}

function setupStudentRadio(question, area) {

    area.querySelectorAll("input[type='radio']")
        .forEach(function (input) {

            input.addEventListener("change", function () {

                if (worksheetFinished) return;

                studentAnswers[question.id] = input.value;

                updateStudentProgress();
            });
        });
}

// ==========================================
// عرض سؤال أكمل الفراغ
// ==========================================

function renderBlankInput(question, area) {

    area.innerHTML = `
        <input type="text"
            class="student-blank-input"
            placeholder="اكتب إجابتك هنا"
            aria-label="اكتب إجابتك"
            autocomplete="off">
    `;

    area.querySelector("input")
        .addEventListener("input", function (event) {

            if (worksheetFinished) return;

            studentAnswers[question.id] =
                event.target.value;

            updateStudentProgress();
        });
}

// ==========================================
// رسم خطوط التوصيل الفعلية
// ==========================================

function drawMatchingLines(question, area) {

    const matching = area.querySelector(".student-matching");
    const svg = area.querySelector(".matching-lines");

    if (!matching || !svg || !matching.isConnected) return;

    const bounds = matching.getBoundingClientRect();

    if (!bounds.width || !bounds.height) return;

    svg.setAttribute(
        "viewBox",
        `0 0 ${bounds.width} ${bounds.height}`
    );

    svg.innerHTML = "";

    const matches = studentAnswers[question.id] || {};

    const namespace = "http://www.w3.org/2000/svg";

    Object.entries(matches).forEach(function ([right, left]) {

        const rightButton = matching.querySelector(
            `.match-right[data-id="${right}"]`
        );

        const leftButton = matching.querySelector(
            `.match-left[data-id="${left}"]`
        );

        if (!rightButton || !leftButton) return;

        const rightRect = rightButton.getBoundingClientRect();
        const leftRect = leftButton.getBoundingClientRect();

        const x1 = rightRect.left - bounds.left;
        const y1 = rightRect.top - bounds.top +
            rightRect.height / 2;

        const x2 = leftRect.right - bounds.left;
        const y2 = leftRect.top - bounds.top +
            leftRect.height / 2;

        const correct = Number(right) === Number(left);

        const color = worksheetFinished
            ? (correct ? GREEN : ORANGE)
            : matchingColors[
                Number(right) % matchingColors.length
            ];

        const line = document.createElementNS(
            namespace,
            "line"
        );

        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);

        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", "4");
        line.setAttribute("stroke-linecap", "round");

        if (worksheetFinished && !correct) {
            line.setAttribute("stroke-dasharray", "8 5");
        }

        svg.appendChild(line);

        [[x1, y1], [x2, y2]].forEach(function ([x, y]) {

            const dot = document.createElementNS(
                namespace,
                "circle"
            );

            dot.setAttribute("cx", x);
            dot.setAttribute("cy", y);
            dot.setAttribute("r", "5");
            dot.setAttribute("fill", color);
            dot.setAttribute("stroke", "#FFFFFF");
            dot.setAttribute("stroke-width", "1.5");

            svg.appendChild(dot);
        });
    });
}

// ==========================================
// توحيد ارتفاع بطاقات المطابقة
// ==========================================

function equalizeMatchingCards(area) {

    const buttons = [
        ...area.querySelectorAll(".student-match-item")
    ];

    if (!buttons.length) return;

    buttons.forEach(button => {
        button.style.height = "auto";
    });

    const maxHeight = Math.max(
        ...buttons.map(button => button.offsetHeight)
    );

    if (!maxHeight) return;

    buttons.forEach(button => {
        button.style.height = maxHeight + "px";
    });
}

// ==========================================
// عرض التوصيل والمطابقة
// ==========================================

function renderMatchingQuestion(question, area) {

    studentAnswers[question.id] = {};

    let selectedRight = null;

    const rightItems = question.pairs.map(
        (pair, index) => ({
            id: index,
            item: pair[0]
        })
    );

    const leftItems = shuffleArray(
        question.pairs.map(
            (pair, index) => ({
                id: index,
                item: pair[1]
            })
        )
    );

    if (leftItems.every((item, index) => item.id === index)) {
        leftItems.push(leftItems.shift());
    }

    function renderItem(item) {

        if (item.type === "image") {

            return `
                <img src="${escapeHTML(item.image)}"
                    alt="${escapeHTML(
                        item.description || "عنصر مصور"
                    )}">

                ${item.description
                    ? `<span>${escapeHTML(item.description)}</span>`
                    : ""}
            `;
        }

        return `<span>${escapeHTML(item.text)}</span>`;
    }

    function renderButton(item, side) {

        return `
            <button type="button"
                class="student-match-item match-${side}"
                data-id="${item.id}"
                aria-pressed="false">

                ${renderItem(item.item)}

                <small class="match-mark"
                    style="
                        display:block;
                        min-height:1.5em;
                        font-size:14px;
                    "></small>

            </button>
        `;
    }

    area.innerHTML = `
        <p style="text-align:center;margin:8px 0 16px;">
            اختر عنصرًا من العمود الأول،
            ثم اختر ما يناسبه من العمود الثاني.
        </p>

        <div class="student-matching" dir="rtl">

            <div class="student-match-column">

                ${rightItems.map(item =>
                    renderButton(item, "right")
                ).join("")}

            </div>

            <div class="student-match-column">

                ${leftItems.map(item =>
                    renderButton(item, "left")
                ).join("")}

            </div>

            <svg class="matching-lines"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                style="
                    position:absolute;
                    inset:0;
                    width:100%;
                    height:100%;
                    pointer-events:none;
                    overflow:visible;
                    z-index:2;
                ">
            </svg>

        </div>

        <button type="button"
            class="reset-matching"
            style="
                margin-top:20px;
                background:#FFF0DC;
                color:#A65300;
            ">
            إعادة التوصيل
        </button>
    `;

    const matching = area.querySelector(".student-matching");

    matching.style.position = "relative";

    const rightButtons = [
        ...area.querySelectorAll(".match-right")
    ];

    const leftButtons = [
        ...area.querySelectorAll(".match-left")
    ];

    function refreshMatching() {

        const matches = studentAnswers[question.id];

        [...rightButtons, ...leftButtons]
            .forEach(function (button) {

                button.classList.remove("matched", "selected");

                button.setAttribute("aria-pressed", "false");

                button.style.borderColor = "";

                const mark = button.querySelector(".match-mark");

                mark.textContent = "";
                mark.style.color = "";
            });

        Object.entries(matches).forEach(function ([right, left]) {

            const number = Number(right) + 1;

            const color = matchingColors[
                Number(right) % matchingColors.length
            ];

            const rightButton = rightButtons.find(
                button => button.dataset.id === right
            );

            const leftButton = leftButtons.find(
                button => button.dataset.id === String(left)
            );

            [rightButton, leftButton].forEach(function (button) {

                if (!button) return;

                button.classList.add("matched");

                button.style.borderColor = color;

                const mark = button.querySelector(".match-mark");

                mark.textContent = "التوصيل " + number;
                mark.style.color = color;
            });
        });

        if (selectedRight !== null) {

            const selected = rightButtons.find(
                button => Number(button.dataset.id) === selectedRight
            );

            if (selected) {

                selected.classList.add("selected");

                selected.style.borderColor = ORANGE;

                selected.setAttribute("aria-pressed", "true");
            }
        }

        equalizeMatchingCards(area);
        drawMatchingLines(question, area);
        updateStudentProgress();
    }

    rightButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            if (worksheetFinished) return;

            const id = Number(button.dataset.id);

            selectedRight = selectedRight === id
                ? null
                : id;

            refreshMatching();
        });
    });

    leftButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            if (worksheetFinished || selectedRight === null) {
                return;
            }

            const leftId = Number(button.dataset.id);

            const matches = studentAnswers[question.id];

            Object.keys(matches).forEach(function (key) {

                if (matches[key] === leftId) {
                    delete matches[key];
                }
            });

            matches[selectedRight] = leftId;

            selectedRight = null;

            refreshMatching();
        });
    });

    area.querySelector(".reset-matching")
        .addEventListener("click", function () {

            if (worksheetFinished) return;

            studentAnswers[question.id] = {};

            selectedRight = null;

            refreshMatching();
        });

    let lastWidth = 0;

    const observer = new ResizeObserver(function () {

        if (!matching.isConnected) return;

        const width = matching.clientWidth;

        if (width !== lastWidth) {

            lastWidth = width;

            equalizeMatchingCards(area);
        }

        drawMatchingLines(question, area);
    });

    observer.observe(matching);

    matchingObservers.push(observer);

    area.querySelectorAll("img").forEach(function (image) {

        image.addEventListener("load", function () {

            if (!matching.isConnected) return;

            equalizeMatchingCards(area);
            drawMatchingLines(question, area);
        });
    });

    refreshMatching();
}

// ==========================================
// شريط تقدم الطالب
// ==========================================

function isQuestionAnswered(question) {

    const answer = studentAnswers[question.id];

    if (question.type === "matching") {

        return answer &&
            Object.keys(answer).length === question.pairs.length;
    }

    return answer !== undefined &&
        String(answer).trim() !== "";
}

function updateStudentProgress() {

    const total = worksheetQuestions.length;

    const answered = worksheetQuestions.filter(
        isQuestionAnswered
    ).length;

    const percentage = total
        ? answered / total * 100
        : 0;

    document.getElementById("progressFill").style.width =
        percentage + "%";

    document.getElementById("progressText").textContent =
        "أجبت عن " + answered + " من " + total + " أسئلة";
}

// ==========================================
// التصحيح التلقائي
// ==========================================

function gradeQuestion(question) {

    const answer = studentAnswers[question.id];

    if (question.type === "matching") {

        const matches = answer || {};

        const correctPairs = question.pairs.filter(
            (pair, index) => matches[index] === index
        ).length;

        return {

            correct: correctPairs === question.pairs.length,

            earned:
                question.score *
                correctPairs / question.pairs.length,

            correctPairs: correctPairs
        };
    }

    let correct = false;

    if (question.type === "blank") {

        const acceptedAnswers = [
            question.correct,
            ...question.alternatives
        ].map(normalizeAnswer);

        correct = acceptedAnswers.includes(
            normalizeAnswer(answer)
        );

    } else {

        correct =
            String(answer) === String(question.correct);
    }

    return {
        correct: correct,
        earned: correct ? question.score : 0
    };
}

// ==========================================
// سلطان وجميلة بعد التصحيح
// ==========================================

function showQuestionFeedback(card, question, result) {

    const feedback = card.querySelector(".question-feedback");

    const answer = studentAnswers[question.id];

    let explanation = "";

    if (question.type === "matching") {

        explanation =
            "التوصيلات الصحيحة: " +
            result.correctPairs +
            " من " +
            question.pairs.length;

        card.querySelectorAll(".student-match-item")
            .forEach(function (button) {

                const id = Number(button.dataset.id);

                const correct = answer[id] === id;

                button.style.borderColor = "";

                button.classList.remove("matched", "selected");

                button.classList.add(
                    correct ? "correct" : "wrong"
                );

                button.setAttribute("aria-pressed", "false");

                const mark = button.querySelector(".match-mark");

                mark.textContent = correct
                    ? "✓ توصيل صحيح"
                    : "✗ توصيل غير صحيح";

                mark.style.color = correct
                    ? GREEN
                    : DARK_ORANGE;
            });

        const area = card.querySelector(".student-answer-area");

        equalizeMatchingCards(area);
        drawMatchingLines(question, area);

    } else if (question.type === "blank") {

        card.querySelector(".student-blank-input")
            .classList.add(
                result.correct ? "correct" : "wrong"
            );

        if (!result.correct) {

            explanation =
                "الإجابة الصحيحة: " + question.correct;
        }

    } else {

        card.querySelectorAll("[data-value]")
            .forEach(function (option) {

                if (option.dataset.value === question.correct) {

                    option.classList.add("correct");

                    const mark = document.createElement("span");

                    mark.textContent = "✓ الإجابة الصحيحة";

                    mark.style.cssText = `
                        color:#008000;
                        font-weight:700;
                        font-size:18px;
                    `;

                    option.appendChild(mark);

                } else if (
                    option.dataset.value === String(answer)
                ) {

                    option.classList.add("wrong");

                    const mark = document.createElement("span");

                    mark.textContent = "✗";

                    mark.style.cssText = `
                        color:#A65300;
                        font-weight:800;
                        font-size:22px;
                    `;

                    option.appendChild(mark);
                }
            });
    }

    const image = result.correct
        ? "assets/sultan-correct.png"
        : "assets/jamila-wrong.png";

    const message = result.correct
        ? "أحسنت! إجابة صحيحة"
        : "لا بأس! حاول مرة أخرى";

    feedback.innerHTML = `
        <img src="${image}"
            alt="${result.correct ? "سلطان" : "جميلة"}">

        <div class="feedback-content">

            <div class="${
                result.correct
                    ? "feedback-correct"
                    : "feedback-wrong"
            }">

                ${message}

            </div>

            ${explanation
                ? `<p>${escapeHTML(explanation)}</p>`
                : ""}

            <p>
                حصلت على
                ${formatNumber(result.earned)}
                من
                ${question.score}
            </p>

        </div>
    `;

    feedback.hidden = false;
}

// ==========================================
// التحقق من جميع الإجابات
// ==========================================

checkAnswersBtn.addEventListener("click", function () {

    if (worksheetFinished) return;

    const unanswered = worksheetQuestions.find(
        question => !isQuestionAnswered(question)
    );

    if (unanswered) {

        alert("يرجى الإجابة عن جميع الأسئلة أولًا.");

        studentQuestions
            .querySelector(
                `[data-index="${unanswered.id}"]`
            )
            .scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        return;
    }

    worksheetFinished = true;

    let earnedScore = 0;
    let totalScore = 0;

    worksheetQuestions.forEach(function (question, index) {

        const result = gradeQuestion(question);

        earnedScore += result.earned;
        totalScore += question.score;

        const card = studentQuestions.querySelector(
            `[data-index="${index}"]`
        );

        showQuestionFeedback(card, question, result);

        card.querySelectorAll("input, button, select")
            .forEach(function (element) {

                element.disabled = true;

                element.style.opacity = "1";
            });

        if (question.type === "matching") {

            const area = card.querySelector(".student-answer-area");

            requestAnimationFrame(function () {

                equalizeMatchingCards(area);
                drawMatchingLines(question, area);
            });
        }
    });

    checkAnswersBtn.hidden = true;
    retryWorksheetBtn.hidden = false;

    showFinalResult(earnedScore, totalScore);
});

// ==========================================
// الرسائل التشجيعية الإحدى عشرة
// ==========================================

function getResultMessage(percentage) {

    if (percentage >= 100) {

        return {
            image: "result-champion.png",
            title: "أنت بطل رفيق!",
            message:
                "أداء رائع! نحن فخوران بك. واصل تألقك يا بطل!"
        };

    } else if (percentage >= 90) {

        return {
            image: "result-excellent.png",
            title: "أحسنت يا بطل!",
            message:
                "اقتربت من القمة، واصل تألقك!"
        };

    } else if (percentage >= 80) {

        return {
            image: "result-excellent.png",
            title: "عمل رائع!",
            message:
                "استمر، فأنت قادر على الأفضل!"
        };

    } else if (percentage >= 70) {

        return {
            image: "result-good.png",
            title: "أداء جميل!",
            message:
                "بقليل من التدريب ستصبح أكثر تميزًا!"
        };

    } else if (percentage >= 60) {

        return {
            image: "result-good.png",
            title: "أحسنت المحاولة!",
            message:
                "واصل التدريب، فأنت تتقدم!"
        };

    } else if (percentage >= 50) {

        return {
            image: "result-keep-going.png",
            title: "بداية جيدة!",
            message:
                "لنحاول معًا الوصول إلى نتيجة أفضل!"
        };

    } else if (percentage >= 40) {

        return {
            image: "result-keep-going.png",
            title: "استمر يا صديقنا!",
            message:
                "كل محاولة تجعلك أفضل. نحن معك!"
        };

    } else if (percentage >= 30) {

        return {
            image: "result-try-again.png",
            title: "نحن نؤمن بقدراتك!",
            message:
                "حاول مرة أخرى وستتحسن!"
        };

    } else if (percentage >= 20) {

        return {
            image: "result-try-again.png",
            title: "لا تستسلم يا بطل!",
            message:
                "نحن معك خطوة بخطوة!"
        };

    } else if (percentage >= 10) {

        return {
            image: "result-try-again.png",
            title: "هيا نحاول من جديد!",
            message:
                "كل نجاح يبدأ بمحاولة!"
        };

    } else {

        return {
            image: "result-try-again.png",
            title: "لا بأس يا صديقنا!",
            message:
                "نحن هنا لنتعلم معًا. حاول مرة أخرى!"
        };
    }
}

// ==========================================
// عرض النتيجة النهائية
// ==========================================

function showFinalResult(earnedScore, totalScore) {

    const rawPercentage = totalScore
        ? earnedScore / totalScore * 100
        : 0;

    const allCorrect = worksheetQuestions.every(
        question => gradeQuestion(question).correct
    );

    const percentage = allCorrect
        ? 100
        : Math.min(99.999999, Math.max(0, rawPercentage));

    const displayPercentage = allCorrect
        ? "100"
        : formatNumber(Math.floor(percentage * 100) / 100);

    const result = getResultMessage(percentage);

    studentResults.innerHTML = `
        <div class="result-title">
            نتيجتك النهائية
        </div>

        <img class="result-image"
            src="assets/${result.image}"
            alt="سلطان وجميلة يشجعانك">

        <div class="result-circle"
            style="--result-progress:${percentage}%;">

            <div class="result-circle-inner">

                <div class="result-percentage" dir="ltr">
                    ${displayPercentage}%
                </div>

                <div class="result-score" dir="ltr">
                    ${formatNumber(earnedScore)} / ${totalScore}
                </div>

            </div>

        </div>

        <div class="result-message-title">
            رسالة من سلطان وجميلة
        </div>

        <div class="result-title">
            ${escapeHTML(result.title)}
        </div>

        <div class="result-message">
            ${escapeHTML(result.message)}
        </div>
    `;

    studentResults.hidden = false;

    studentResults.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    if (allCorrect) {
        celebrateSuccess();
    }
}

// ==========================================
// احتفال عند الحصول على 100%
// ==========================================

function celebrateSuccess() {

    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    const colors = [
        "#008000",
        "#FF8500",
        "#FFD700",
        "#70C900",
        "#FFFFFF"
    ];

    const celebration = document.createElement("div");

    celebration.setAttribute("aria-hidden", "true");

    celebration.style.cssText = `
        position:fixed;
        inset:0;
        overflow:hidden;
        pointer-events:none;
        z-index:9999;
    `;

    document.body.appendChild(celebration);

    for (let i = 0; i < 65; i++) {

        const piece = document.createElement("div");

        const size = 6 + Math.random() * 8;

        piece.style.cssText = `
            position:absolute;
            top:-20px;
            left:${Math.random() * 100}%;
            width:${size}px;
            height:${size * 1.5}px;
            background:${colors[i % colors.length]};
            border-radius:2px;
        `;

        celebration.appendChild(piece);

        piece.animate(
            [
                {
                    transform: "translateY(0) rotate(0deg)",
                    opacity: 1
                },
                {
                    transform:
                        "translateY(110vh) rotate(720deg)",
                    opacity: 0
                }
            ],
            {
                duration: 1800 + Math.random() * 1400,
                delay: Math.random() * 500,
                fill: "both"
            }
        );
    }

    setTimeout(function () {
        celebration.remove();
    }, 4000);
}

// ==========================================
// إعادة المحاولة
// ==========================================

retryWorksheetBtn.addEventListener("click", function () {

    renderStudentWorksheet();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

// ==========================================
// العودة إلى محرر المعلم
// ==========================================

backToEditorBtn.addEventListener("click", function () {

    clearMatchingObservers();

    studentPreview.hidden = true;
    teacherEditor.hidden = false;

    document.body.classList.remove("student-mode");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});


// ==========================================
// تصدير ورقة العمل المستقلة - RafeQ 24
// ==========================================

const exportWorksheetBtn =
    document.getElementById("exportWorksheetBtn");

const exportStatus =
    document.getElementById("exportStatus");

function showExportStatus(message, success = true) {

    exportStatus.hidden = false;
    exportStatus.textContent = message;
    exportStatus.style.color =
        success ? GREEN : DARK_ORANGE;
}

// ==========================================
// تحويل الصور إلى بيانات مدمجة
// ==========================================

async function embedAsset(path) {

    const response = await fetch(path);

    if (!response.ok) {
        throw new Error("تعذر تحميل الملف: " + path);
    }

    const blob = await optimizeImage(await response.blob(), 1000);

    return new Promise(function (resolve, reject) {

        const reader = new FileReader();

        reader.onload = function () {
            resolve(reader.result);
        };

        reader.onerror = function () {
            reject(new Error("تعذر قراءة الملف: " + path));
        };

        reader.readAsDataURL(blob);
    });
}

// ==========================================
// قراءة الملفات النصية
// ==========================================

async function readExportFile(path) {

    const response = await fetch(path);

    if (!response.ok) {
        throw new Error("تعذر قراءة الملف: " + path);
    }

    return response.text();
}

// ==========================================
// حماية البيانات داخل HTML
// ==========================================

function safeExportJSON(data) {

    return JSON.stringify(data)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}

// ==========================================
// إنشاء ملف ورقة العمل
// ==========================================

async function exportWorksheet() {

    const subject = document
        .getElementById("subject")
        .value.trim();

    const lesson = document
        .getElementById("lesson")
        .value.trim();

    const instructions = document
        .getElementById("instructions")
        .value.trim();

    if (!subject) {
        alert("يرجى كتابة اسم المادة.");
        document.getElementById("subject").focus();
        return;
    }

    if (!lesson) {
        alert("يرجى كتابة عنوان الدرس.");
        document.getElementById("lesson").focus();
        return;
    }

    let questions;

    try {

        questions = collectWorksheetQuestions();

    } catch (error) {

        alert(error.message);
        return;
    }

    exportWorksheetBtn.disabled = true;

    showExportStatus(
        "جارٍ تجهيز ورقة العمل والصور..."
    );

    try {

        // قراءة التصميم والكود الحالي

        const [css, originalScript] = await Promise.all([

            readExportFile("style.css"),

            readExportFile("script.js")

        ]);

        // الصور الرسمية المستخدمة في ورقة العمل

        const assetNames = [

            "logo.png",
            "sultan-correct.png",
            "jamila-wrong.png",
            "result-champion.png",
            "result-excellent.png",
            "result-good.png",
            "result-keep-going.png",
            "result-try-again.png"

        ];

        const embeddedAssets = {};

        await Promise.all(

            assetNames.map(async function (name) {

                embeddedAssets[name] =
                    await embedAsset("assets/" + name);

            })

        );

        // الاحتفاظ بوظائف الطالب فقط

        const helperStart =
            originalScript.indexOf("function escapeHTML(");

        const helperEnd =
            originalScript.indexOf(
                'addQuestionBtn.addEventListener("click"'
            );

        const studentStart =
            originalScript.indexOf(
                "function clearMatchingObservers("
            );

        const studentEnd =
            originalScript.indexOf(
                'backToEditorBtn.addEventListener("click"'
            );

        if (
            helperStart < 0 ||
            helperEnd <= helperStart ||
            studentStart < 0 ||
            studentEnd <= studentStart
        ) {

            throw new Error(
                "تعذر تجهيز وظائف ورقة العمل."
            );

        }

        const helpers = originalScript.slice(
            helperStart,
            helperEnd
        );

        let studentCode = originalScript.slice(
            studentStart,
            studentEnd
        );

        // دمج صور سلطان وجميلة

        studentCode = studentCode.replace(
            /assets\/sultan-correct\.png/g,
            embeddedAssets["sultan-correct.png"]
        );

        studentCode = studentCode.replace(
            /assets\/jamila-wrong\.png/g,
            embeddedAssets["jamila-wrong.png"]
        );

        // دمج صور النتيجة النهائية

        studentCode = studentCode.replace(
            'assets/${result.image}',
            '${embeddedAssets[result.image]}'
        );

        // تجهيز بيانات ورقة العمل

        const worksheetData = {

            subject: subject,

            lesson: lesson,

            instructions: instructions ||
                "اقرأ الأسئلة جيدًا ثم أجب عنها.",

            questions: questions

        };

        // إنشاء نسخة مستقلة من واجهة الطالب

        const exportedPreview =
            studentPreview.cloneNode(true);

        exportedPreview.hidden = false;

        exportedPreview
            .querySelector("#backToEditorBtn")
            ?.remove();

        exportedPreview
            .querySelector(".student-header img")
            .src = embeddedAssets["logo.png"];

        exportedPreview
            .querySelector("#previewSubject")
            .textContent = subject;

        exportedPreview
            .querySelector("#previewLesson")
            .textContent = lesson;

        exportedPreview
            .querySelector("#previewInstructions")
            .textContent = worksheetData.instructions;

        exportedPreview
            .querySelector("#studentQuestions")
            .innerHTML = "";

        exportedPreview
            .querySelector("#studentResults")
            .innerHTML = "";

        exportedPreview
            .querySelector("#studentResults")
            .hidden = true;

        exportedPreview
            .querySelector("#studentFeedback")
            .innerHTML = "";

        exportedPreview
            .querySelector("#studentFeedback")
            .hidden = true;

        // تجهيز JavaScript المستقل

        const exportedScript = `

            const GREEN = "#008000";
            const ORANGE = "#FF8500";
            const DARK_ORANGE = "#A65300";

            const matchingColors =
                ${safeExportJSON(matchingColors)};

            const worksheetData =
                ${safeExportJSON(worksheetData)};

            const embeddedAssets =
                ${safeExportJSON(embeddedAssets)};

            const studentPreview =
                document.getElementById("studentPreview");

            const studentQuestions =
                document.getElementById("studentQuestions");

            const studentResults =
                document.getElementById("studentResults");

            const studentFeedback =
                document.getElementById("studentFeedback");

            const checkAnswersBtn =
                document.getElementById("checkAnswersBtn");

            const retryWorksheetBtn =
                document.getElementById("retryWorksheetBtn");

            let worksheetQuestions =
                worksheetData.questions;

            let studentAnswers = {};

            let worksheetFinished = false;

            let matchingObservers = [];

            ${helpers}

            ${studentCode}

            renderStudentWorksheet();

        `;

        // إنشاء HTML النهائي

        const safeScript = exportedScript.replace(
            /<\/script/gi,
            "<\\/script"
        );

        const safeCSS = css.replace(
            /<\/style/gi,
            "<\\/style"
        );

        const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <meta name="theme-color" content="#008000">

    <title>${escapeHTML(subject)} - ${escapeHTML(lesson)} | رفيق 24</title>

    <link rel="icon"
          href="${embeddedAssets["logo.png"]}">

    <style>

        ${safeCSS}

    </style>

</head>

<body class="student-mode">

    ${exportedPreview.outerHTML}

    <script>

        ${safeScript}

    <\/script>

</body>

</html>`;

        // إنشاء الملف وتنزيله

        const blob = new Blob(
            [html],
            {
                type: "text/html;charset=utf-8"
            }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;

        link.download = "index.html";

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(function () {

            URL.revokeObjectURL(url);

        }, 5000);

        showExportStatus(
            "✓ تم تجهيز ورقة العمل وبدء تنزيلها بنجاح."
        );

    } catch (error) {

        console.error(error);

        showExportStatus(
            "تعذر تصدير ورقة العمل: " + error.message,
            false
        );

        alert(
            "تعذر تصدير ورقة العمل. تأكد من تشغيل Live Server ووجود جميع الصور."
        );

    } finally {

        exportWorksheetBtn.disabled = false;

    }
}

// ==========================================
// تشغيل زر التصدير
// ==========================================

exportWorksheetBtn.addEventListener(
    "click",
    exportWorksheet
);


// ==========================================
// RafeQ 24 - شاشة بداية التدريب
// ==========================================

const studentWelcome =
    document.getElementById("studentWelcome");

const studentTraining =
    document.getElementById("studentTraining");

const startTrainingBtn =
    document.getElementById("startTrainingBtn");

const welcomeBackToEditorBtn =
    document.getElementById("welcomeBackToEditorBtn");

const worksheetCover =
    document.getElementById("worksheetCover");

const coverPreviewContainer =
    document.getElementById("coverPreviewContainer");

const coverPreviewImage =
    document.getElementById("coverPreviewImage");

const removeCoverBtn =
    document.getElementById("removeCoverBtn");

let worksheetCoverData = "";
let coverPending = false;
let coverVersion = 0;

// ==========================================
// رفع صورة غلاف ورقة العمل
// ==========================================

worksheetCover.addEventListener("change", function () {

    const file = worksheetCover.files[0];

    if (!file) return;

    const version = ++coverVersion;

    coverPending = false;

    const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {

        alert("يرجى اختيار صورة PNG أو JPG أو WebP.");

        worksheetCover.value = "";

        return;
    }

    if (file.size > 5 * 1024 * 1024) {

        alert("يجب ألا يتجاوز حجم الصورة 5 ميجابايت.");

        worksheetCover.value = "";

        return;
    }

    coverPending = true;

    const reader = new FileReader();

    function failCover() {

        if (version !== coverVersion) return;

        coverPending = false;
        worksheetCover.value = "";

        alert("تعذر قراءة صورة الغلاف.");
    }

    reader.onload = function () {

        if (version !== coverVersion) return;

        const image = new Image();

        image.onload = function () {

            if (version !== coverVersion) return;

            worksheetCoverData = reader.result;

            coverPreviewImage.src = worksheetCoverData;

            coverPreviewContainer.hidden = false;

            coverPending = false;
        };

        image.onerror = failCover;

        image.src = reader.result;
    };

    reader.onerror = failCover;

    optimizeImage(file, 1200).then(blob => reader.readAsDataURL(blob)).catch(() => reader.onerror());
});

// ==========================================
// حذف صورة الغلاف
// ==========================================

removeCoverBtn.addEventListener("click", function () {

    coverVersion++;

    worksheetCoverData = "";

    coverPending = false;

    worksheetCover.value = "";

    coverPreviewImage.removeAttribute("src");

    coverPreviewContainer.hidden = true;
});

// ==========================================
// أسماء أنواع الأسئلة
// ==========================================

function prepareWelcomeSummary(root, questions) {

    const typeNames = {

        text: "اختيار من متعدد",

        truefalse: "صح أو خطأ",

        image: "إجابات مصورة",

        blank: "أكمل الفراغ",

        matching: "التوصيل والمطابقة",

        match: "التوصيل والمطابقة"
    };

    const count = questions.length;

    const countElement =
        root.querySelector("#welcomeQuestionCount");

    const typesElement =
        root.querySelector("#welcomeQuestionTypes");

    countElement.textContent =
        "عدد الأسئلة: " + count;

    typesElement.innerHTML = "";

    const types = [
        ...new Set(
            questions.map(question =>
                typeNames[question.type]
            ).filter(Boolean)
        )
    ];

    types.forEach(function (type) {

        const badge = document.createElement("span");

        badge.className = "welcome-type-badge";

        badge.textContent = type;

        typesElement.appendChild(badge);
    });
}

// ==========================================
// تجهيز شاشة البداية في المعاينة
// ==========================================

previewWorksheetBtn.addEventListener("click", function (event) {

    if (coverPending) {

        event.stopImmediatePropagation();

        alert("انتظر حتى يكتمل تحميل صورة الغلاف.");

        return;
    }

    studentWelcome.hidden = false;

    studentTraining.hidden = true;

}, true);

previewWorksheetBtn.addEventListener("click", function () {

    if (studentPreview.hidden) return;

    document.getElementById("studentCoverImage").src =
        worksheetCoverData || "assets/logo.png";

    prepareWelcomeSummary(
        studentPreview,
        worksheetQuestions
    );

    studentWelcome.hidden = false;

    studentTraining.hidden = true;

    window.scrollTo(0, 0);
});

// ==========================================
// بدء التدريب
// ==========================================

startTrainingBtn.addEventListener("click", function () {

    studentWelcome.hidden = true;

    studentTraining.hidden = false;

    renderStudentWorksheet();

    window.scrollTo(0, 0);
});

// ==========================================
// العودة إلى محرر المعلم من شاشة البداية
// ==========================================

welcomeBackToEditorBtn.addEventListener("click", function () {

    backToEditorBtn.click();
});

// ==========================================
// نظام التصدير الجديد
// ==========================================

exportWorksheetBtn.removeEventListener(
    "click",
    exportWorksheet
);

async function exportWelcomeWorksheet() {

    const subject =
        document.getElementById("subject").value.trim();

    const lesson =
        document.getElementById("lesson").value.trim();

    const instructions =
        document.getElementById("instructions").value.trim()
        || "اقرأ الأسئلة جيدًا ثم أجب عنها.";

    if (!subject) {

        alert("يرجى كتابة اسم المادة.");

        document.getElementById("subject").focus();

        return;
    }

    if (!lesson) {

        alert("يرجى كتابة عنوان الدرس.");

        document.getElementById("lesson").focus();

        return;
    }

    if (coverPending) {

        alert("انتظر حتى يكتمل تحميل صورة الغلاف.");

        return;
    }

    let questions;

    try {

        questions = collectWorksheetQuestions();

    } catch (error) {

        alert(error.message);

        return;
    }

    const selectedCover = worksheetCoverData;

    exportWorksheetBtn.disabled = true;

    showExportStatus(
        "جارٍ تجهيز ورقة العمل والصور..."
    );

    try {

        const [css, originalScript] = await Promise.all([

            readExportFile("style.css"),

            readExportFile("script.js")
        ]);

        // الصور الرسمية لرفيق 24

        const assetNames = [

            "logo.png",

            "sultan-correct.png",

            "jamila-wrong.png",

            "result-champion.png",

            "result-excellent.png",

            "result-good.png",

            "result-keep-going.png",

            "result-try-again.png"
        ];

        const embeddedAssets = {};

        await Promise.all(

            assetNames.map(async function (name) {

                embeddedAssets[name] =
                    await embedAsset("assets/" + name);
            })
        );

        // استخراج وظائف الطالب من الكود الأصلي

        const helperStart =
            originalScript.indexOf(
                "function escapeHTML("
            );

        const helperEnd =
            originalScript.indexOf(
                'addQuestionBtn.addEventListener("click"'
            );

        const studentStart =
            originalScript.indexOf(
                "function clearMatchingObservers("
            );

        const studentEnd =
            originalScript.indexOf(
                'backToEditorBtn.addEventListener("click"'
            );

        if (

            helperStart < 0 ||

            helperEnd <= helperStart ||

            studentStart < 0 ||

            studentEnd <= studentStart

        ) {

            throw new Error(
                "تعذر تجهيز وظائف ورقة العمل."
            );
        }

        const helpers = originalScript.slice(
            helperStart,
            helperEnd
        );

        let studentCode = originalScript.slice(
            studentStart,
            studentEnd
        );

        // دمج صور الشخصيات داخل HTML

        studentCode = studentCode.replace(

            /assets\/sultan-correct\.png/g,

            '__RAFEQ_SULTAN__'
        );

        studentCode = studentCode.replace(

            /assets\/jamila-wrong\.png/g,

            '__RAFEQ_JAMILA__'
        );

        studentCode = studentCode.replace(

            'assets/${result.image}',

            '${embeddedAssets[result.image]}'
        );

        studentCode = studentCode.replace('"__RAFEQ_SULTAN__"', 'embeddedAssets["sultan-correct.png"]')
            .replace('"__RAFEQ_JAMILA__"', 'embeddedAssets["jamila-wrong.png"]');

        // بيانات ورقة العمل

        const worksheetData = {

            subject: subject,

            lesson: lesson,

            instructions: instructions,

            questions: questions
        };

        // إنشاء نسخة مستقلة من واجهة الطالب

        const exportedPreview =
            studentPreview.cloneNode(true);

        exportedPreview.hidden = false;

        // حذف أزرار العودة إلى محرر المعلم

        exportedPreview
            .querySelector("#backToEditorBtn")
            ?.remove();

        exportedPreview
            .querySelector(".welcome-actions")
            ?.remove();

        // تجهيز شاشة البداية

        exportedPreview
            .querySelector("#studentWelcome")
            .hidden = false;

        exportedPreview
            .querySelector("#studentTraining")
            .hidden = true;

        // دمج شعار رفيق 24

        exportedPreview
            .querySelector(".welcome-logo")
            .src = embeddedAssets["logo.png"];

        // دمج صورة الغلاف

        exportedPreview
            .querySelector("#studentCoverImage")
            .src = selectedCover ||
                embeddedAssets["logo.png"];

        // بيانات المادة والدرس

        exportedPreview
            .querySelector("#previewSubject")
            .textContent = subject;

        exportedPreview
            .querySelector("#previewLesson")
            .textContent = lesson;

        exportedPreview
            .querySelector("#previewInstructions")
            .textContent = instructions;

        // عدد الأسئلة وأنواعها

        prepareWelcomeSummary(
            exportedPreview,
            questions
        );

        // تنظيف أي نتائج سابقة

        exportedPreview
            .querySelector("#studentQuestions")
            .innerHTML = "";

        exportedPreview
            .querySelector("#studentResults")
            .innerHTML = "";

        exportedPreview
            .querySelector("#studentResults")
            .hidden = true;

        exportedPreview
            .querySelector("#studentFeedback")
            .innerHTML = "";

        exportedPreview
            .querySelector("#studentFeedback")
            .hidden = true;

        exportedPreview
            .querySelector("#progressFill")
            .style.width = "0%";

        exportedPreview
            .querySelector("#progressText")
            .textContent = "";

        exportedPreview
            .querySelector("#checkAnswersBtn")
            .hidden = false;

        exportedPreview
            .querySelector("#checkAnswersBtn")
            .disabled = false;

        exportedPreview
            .querySelector("#retryWorksheetBtn")
            .hidden = true;

        // JavaScript الخاص بالنسخة المستقلة

        const exportedScript = `

            const GREEN = "#008000";

            const ORANGE = "#FF8500";

            const DARK_ORANGE = "#A65300";

            const matchingColors =
                ${safeExportJSON(matchingColors)};

            const worksheetData =
                ${safeExportJSON(worksheetData)};

            const embeddedAssets =
                ${safeExportJSON(embeddedAssets)};

            const studentPreview =
                document.getElementById("studentPreview");

            const studentQuestions =
                document.getElementById("studentQuestions");

            const studentResults =
                document.getElementById("studentResults");

            const studentFeedback =
                document.getElementById("studentFeedback");

            const checkAnswersBtn =
                document.getElementById("checkAnswersBtn");

            const retryWorksheetBtn =
                document.getElementById("retryWorksheetBtn");

            let worksheetQuestions =
                worksheetData.questions;

            let studentAnswers = {};

            let worksheetFinished = false;

            let matchingObservers = [];

            ${helpers}

            ${studentCode}

            const studentWelcome =
                document.getElementById("studentWelcome");

            const studentTraining =
                document.getElementById("studentTraining");

            const startTrainingBtn =
                document.getElementById("startTrainingBtn");

            startTrainingBtn.addEventListener(
                "click",
                function () {

                    studentWelcome.hidden = true;

                    studentTraining.hidden = false;

                    renderStudentWorksheet();

                    window.scrollTo(0, 0);
                }
            );

        `;

        // حماية الكود داخل HTML

        const safeScript = exportedScript.replace(

            /<\/script/gi,

            "<\\/script"
        );

        const safeCSS = css.replace(

            /<\/style/gi,

            "<\\/style"
        );

        // إنشاء ملف HTML النهائي

        let html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <meta name="theme-color" content="#008000">

    <title>${escapeHTML(subject)} - ${escapeHTML(lesson)} | رفيق 24</title>

    <link rel="icon"
          href="${embeddedAssets["logo.png"]}">

    <style>

        ${safeCSS}

    </style>

</head>

<body class="student-mode">

    ${exportedPreview.outerHTML}

    <script>

        ${safeScript}

    <\/script>

</body>

</html>`;

        // Store each image only once, restoring data before student initialization.
        const imagePool = [];
        const imageIds = new Map();
        html = html.replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, value => {
            if (!imageIds.has(value)) { imageIds.set(value, imagePool.length); imagePool.push(value); }
            return "__RAFEQ_IMAGE_" + imageIds.get(value) + "__";
        });
        const restoreCode = `
            const imagePool = ${safeExportJSON(imagePool)};
            const restoreImage = value => typeof value === "string" && /^__RAFEQ_IMAGE_\\d+__$/.test(value) ? imagePool[Number(value.slice(14,-2))] : value;
            function restoreTree(value) {
                if (typeof value === "string") return restoreImage(value);
                if (value && typeof value === "object") Object.keys(value).forEach(key => { value[key] = restoreTree(value[key]); });
                return value;
            }
            restoreTree(worksheetData);
            restoreTree(embeddedAssets);
            document.querySelectorAll("img[src],link[rel=icon]").forEach(el => {
                const attr = el.tagName === "IMG" ? "src" : "href";
                el.setAttribute(attr, restoreImage(el.getAttribute(attr)));
            });
        `;
        html = html.replace("const studentPreview =", () => restoreCode + "\nconst studentPreview =");

        // تنزيل ورقة العمل

        const blob = new Blob(

            [html],

            {
                type: "text/html;charset=utf-8"
            }
        );

        const sizeMiB = blob.size / (1024 * 1024);
        if (sizeMiB > 20) {
            showExportStatus("حجم الورقة " + sizeMiB.toFixed(2) + " MiB. الحد الأقصى 20 MiB. قلل عدد الصور أو حجمها.", false);
            return;
        }
        showExportStatus("حجم ورقة العمل: " + sizeMiB.toFixed(2) + " MiB");
        if (!confirm("حجم ورقة العمل: " + sizeMiB.toFixed(2) + " MiB. هل تريد تنزيلها؟")) return;
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;

        link.download = "index.html";

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(function () {

            URL.revokeObjectURL(url);

        }, 5000);

        showExportStatus(
            "✓ تم تجهيز ورقة العمل وبدء تنزيلها بنجاح. الحجم: " + sizeMiB.toFixed(2) + " MiB"
        );

    } catch (error) {

        console.error(error);

        showExportStatus(

            "تعذر تصدير ورقة العمل: " + error.message,

            false
        );

        alert(
            "تعذر تصدير ورقة العمل. تأكد من تشغيل Live Server ووجود جميع الصور."
        );

    } finally {

        exportWorksheetBtn.disabled = false;
    }
}

// ==========================================
// تشغيل نظام التصدير الجديد
// ==========================================

exportWorksheetBtn.addEventListener(

    "click",

    exportWelcomeWorksheet
);
