// @@STUDENT_CODE_START@@
// ==========================================
// RafeQ 24 - كود الطالب المشترك
// يُستخدم في المعاينة داخل المحرر وفي ورقة العمل المصدّرة.
// لا تضف هنا أي كود خاص بواجهة المعلم.
// ==========================================

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

const BLANK_DOTS = "............";

const GROUP_TYPE_NAMES = {
    text: "اختيار من متعدد (إجابات نصية)",
    image: "اختيار من متعدد (إجابات مصورة)",
    truefalse: "صح أو خطأ",
    blank: "أكمل الفراغ",
    matching: "التوصيل والمطابقة",
    passage: "قطعة وأسئلة",
    wordbank: "بنك الكلمات"
};

const ARABIC_ORDINALS = [
    "الأول", "الثاني", "الثالث", "الرابع", "الخامس",
    "السادس", "السابع", "الثامن", "التاسع", "العاشر",
    "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر",
    "الخامس عشر", "السادس عشر", "السابع عشر", "الثامن عشر",
    "التاسع عشر", "العشرون"
];

const studentQuestions = document.getElementById("studentQuestions");
const studentResults = document.getElementById("studentResults");
const studentFeedback = document.getElementById("studentFeedback");
const checkAnswersBtn = document.getElementById("checkAnswersBtn");
const retryWorksheetBtn = document.getElementById("retryWorksheetBtn");

let worksheetGroups = [];
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
    return Number(Number(number).toFixed(2)).toString();
}

// في المحرر تُقرأ الصور من مجلد assets، وفي النسخة المصدّرة من الصور المدمجة
function assetUrl(name) {

    if (
        typeof embeddedAssets !== "undefined" &&
        embeddedAssets &&
        embeddedAssets[name]
    ) {
        return embeddedAssets[name];
    }

    return "assets/" + name;
}

function groupOrdinalName(number) {
    return "السؤال " +
        (ARABIC_ORDINALS[number - 1] || "رقم " + number);
}

function flattenItems(groups) {
    return groups.flatMap(group => group.items);
}

function setWorksheetData(groups) {
    worksheetGroups = groups;
    worksheetQuestions = flattenItems(groups);
}

// عدد البنود المصححة بشكل مستقل داخل السؤال
function countUnits(question) {
    return question.type === "wordbank"
        ? question.sentences.length
        : 1;
}

function answeredUnits(question) {

    const answer = studentAnswers[question.id];

    if (question.type === "matching") {

        return answer &&
            Object.keys(answer).length === question.pairs.length
            ? 1
            : 0;
    }

    if (question.type === "wordbank") {

        return question.sentences.filter(
            sentence => answer && answer[sentence.id]
        ).length;
    }

    return answer !== undefined &&
        String(answer).trim() !== ""
        ? 1
        : 0;
}

function isQuestionAnswered(question) {
    return answeredUnits(question) === countUnits(question);
}

// ==========================================
// عرض ورقة عمل الطالب
// ==========================================

function clearMatchingObservers() {

    matchingObservers.forEach(observer => {
        observer.disconnect();
    });

    matchingObservers = [];
}

function createStudentGroupHeader(group) {

    const header = document.createElement("div");

    header.className = "student-group-header";

    header.innerHTML = `
        <div class="student-group-top">
            <span class="student-group-number"></span>
            <span class="student-group-type"></span>
            <span class="student-group-score"></span>
        </div>
        <p class="student-group-title" hidden></p>
    `;

    header.querySelector(".student-group-number")
        .textContent = group.ordinal;

    header.querySelector(".student-group-type")
        .textContent = group.typeName;

    header.querySelector(".student-group-score")
        .textContent = "الدرجة: " + formatNumber(group.score);

    if (group.title) {

        const title = header.querySelector(".student-group-title");

        title.textContent = group.title;
        title.hidden = false;
    }

    return header;
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

    worksheetGroups.forEach(function (group) {

        studentQuestions.appendChild(
            createStudentGroupHeader(group)
        );

        if (group.passage) {

            studentQuestions.appendChild(
                createStudentPassage(group.passage)
            );
        }

        group.items.forEach(function (question) {

            const card = document.createElement("div");

            card.className = "student-question";
            card.dataset.index = question.id;
            card.dataset.type = question.type;

            card.innerHTML = `
                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:10px;
                ">

                    <span class="student-question-number"
                        dir="ltr">${escapeHTML(question.label || "")}</span>

                    <span class="student-question-score">
                        الدرجة: ${formatNumber(question.score)}
                    </span>

                </div>

                <div class="student-question-title"
                    style="white-space:pre-wrap;"></div>

                <div class="student-answer-area"></div>

                <div class="question-feedback"
                    role="status"
                    hidden></div>
            `;

            const title = card.querySelector(".student-question-title");

            title.textContent = (question.text || "").trim();

            if (!title.textContent) {
                title.hidden = true;
            }

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

            } else if (question.type === "wordbank") {

                renderWordBank(question, area);
            }

            if (group.passage) {

                applyAutoTextDirection(card);
            }
        });
    });

    updateStudentProgress();
}

// ==========================================
// عرض القطعة فوق أسئلتها
// ==========================================

function createStudentPassage(passage) {

    const section = document.createElement("article");

    section.className = "student-passage";

    const label = document.createElement("div");

    label.className = "student-passage-label";
    label.textContent = "اقرأ القطعة ثم أجب عن الأسئلة التي تليها";

    section.appendChild(label);

    const content = document.createElement("div");

    content.className = "student-passage-content";
    content.dir = passage.direction === "ltr" ? "ltr" : "rtl";
    content.lang = passage.direction === "ltr" ? "en" : "ar";

    if (passage.title) {

        const title = document.createElement("h3");

        title.className = "student-passage-title";
        title.textContent = passage.title;

        content.appendChild(title);
    }

    if (passage.image) {

        const image = document.createElement("img");

        image.className = "student-passage-image";
        image.src = passage.image;
        image.alt = "صورة القطعة";

        content.appendChild(image);
    }

    const text = document.createElement("div");

    text.className = "student-passage-text";
    text.textContent = passage.text;

    content.appendChild(text);
    section.appendChild(content);

    return section;
}

// يضبط اتجاه كل نص في أسئلة القطعة حسب لغته (عربي أو إنجليزي)
function applyAutoTextDirection(card) {

    card.querySelectorAll(
        ".student-question-title, " +
        ".student-option > span, " +
        ".student-image-option > div, " +
        ".student-match-item > span"
    ).forEach(function (element) {

        element.setAttribute("dir", "auto");
    });
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
// عرض بنك الكلمات
// ==========================================

function renderWordBank(question, area) {

    const direction = question.direction === "ltr" ? "ltr" : "rtl";

    const wordById = new Map(
        question.words.map(word => [word.id, word])
    );

    // يُخلط البنك عند بدء ورقة العمل أو عند إعادة المحاولة
    const order = shuffleArray(
        question.words.map(word => word.id)
    );

    const placements = {};

    studentAnswers[question.id] = placements;

    let selectedWordId = null;
    let lastDragEnd = 0;
    let drag = null;

    area.innerHTML = `
        <div class="wordbank-activity">

            <div class="wordbank-bank-title">بنك الكلمات</div>

            <div class="wordbank-bank"
                dir="${direction}"
                role="group"
                aria-label="بنك الكلمات"></div>

            <p class="wordbank-hint">
                اسحب الكلمة إلى الفراغ، أو اضغط على الكلمة
                ثم اضغط على الفراغ. اضغط على الكلمة داخل
                الفراغ لإعادتها إلى البنك.
            </p>

            <p class="wordbank-status"
                role="status"
                aria-live="polite"></p>

            <div class="wordbank-sentences">

                ${question.sentences.map(sentence => `

                    <div class="wordbank-sentence"
                        dir="${direction}"
                        data-sentence-id="${escapeHTML(sentence.id)}">

                        <span class="wordbank-sentence-label"
                            dir="ltr">${escapeHTML(sentence.label)}</span>

                        <div class="wordbank-sentence-body">

                            <p class="wordbank-sentence-text"
                                dir="${direction}"><span class="wb-text-part">${escapeHTML(sentence.before)}</span><span class="wordbank-blank"
                                    role="button"
                                    tabindex="0"
                                    data-sentence-id="${escapeHTML(sentence.id)}"></span><span class="wb-text-part">${escapeHTML(sentence.after)}</span></p>

                            <div class="wordbank-sentence-mark" hidden></div>

                        </div>

                    </div>

                `).join("")}

            </div>

        </div>
    `;

    const activity = area.querySelector(".wordbank-activity");
    const bankElement = area.querySelector(".wordbank-bank");
    const statusElement = area.querySelector(".wordbank-status");

    const blankElements = [
        ...area.querySelectorAll(".wordbank-blank")
    ];

    function wordText(id) {
        return wordById.get(id) ? wordById.get(id).text : "";
    }

    function refresh() {

        const used = new Set(Object.values(placements));

        bankElement.innerHTML = "";

        order
            .filter(id => !used.has(id))
            .forEach(function (id) {

                const chip = document.createElement("button");

                chip.type = "button";
                chip.className =
                    "wb-chip" + (id === selectedWordId ? " selected" : "");
                chip.dataset.wordId = id;
                chip.setAttribute(
                    "aria-pressed",
                    id === selectedWordId ? "true" : "false"
                );
                chip.textContent = wordText(id);

                bankElement.appendChild(chip);
            });

        if (!bankElement.children.length) {

            const empty = document.createElement("span");

            empty.className = "wordbank-empty";
            empty.textContent = "تم استخدام جميع الكلمات";

            bankElement.appendChild(empty);
        }

        blankElements.forEach(function (blank) {

            const wordId = placements[blank.dataset.sentenceId];

            blank.innerHTML = "";

            blank.classList.toggle("filled", Boolean(wordId));

            blank.classList.toggle(
                "awaiting",
                selectedWordId !== null && !worksheetFinished
            );

            if (wordId) {

                const chip = document.createElement("span");

                chip.className = "wb-chip placed";
                chip.dataset.wordId = wordId;
                chip.textContent = wordText(wordId);

                blank.appendChild(chip);

                blank.setAttribute(
                    "aria-label",
                    "الفراغ يحتوي على: " + wordText(wordId)
                );

            } else {

                blank.textContent = BLANK_DOTS;

                blank.setAttribute("aria-label", "فراغ");
            }
        });

        statusElement.textContent = selectedWordId !== null
            ? "اخترت الكلمة: " + wordText(selectedWordId) +
              ". اضغط على الفراغ المناسب."
            : "";

        updateStudentProgress();
    }

    // كل كلمة تُستخدم مرة واحدة فقط داخل البنك
    function placeWord(sentenceId, wordId) {

        Object.keys(placements).forEach(function (key) {

            if (placements[key] === wordId) {
                delete placements[key];
            }
        });

        // الكلمة السابقة في هذا الفراغ تعود تلقائيًا إلى البنك
        placements[sentenceId] = wordId;

        selectedWordId = null;

        refresh();
    }

    function returnWord(wordId) {

        Object.keys(placements).forEach(function (key) {

            if (placements[key] === wordId) {
                delete placements[key];
            }
        });

        refresh();
    }

    function activateBlank(blank) {

        const sentenceId = blank.dataset.sentenceId;

        if (selectedWordId !== null) {

            placeWord(sentenceId, selectedWordId);

        } else if (placements[sentenceId]) {

            delete placements[sentenceId];

            refresh();
        }
    }

    // ---------- النقر أو اللمس ----------

    activity.addEventListener("click", function (event) {

        if (worksheetFinished) return;

        // تجاهل النقرة التي تأتي مباشرة بعد انتهاء السحب
        if (Date.now() - lastDragEnd < 350) return;

        const blank = event.target.closest(".wordbank-blank");

        if (blank && activity.contains(blank)) {

            activateBlank(blank);

            return;
        }

        const chip = event.target.closest(".wb-chip");

        if (chip && activity.contains(chip)) {

            const id = chip.dataset.wordId;

            selectedWordId = selectedWordId === id ? null : id;

            refresh();
        }
    });

    activity.addEventListener("keydown", function (event) {

        if (worksheetFinished) return;

        if (event.key !== "Enter" && event.key !== " ") return;

        const blank = event.target.closest(".wordbank-blank");

        if (blank && activity.contains(blank)) {

            event.preventDefault();

            activateBlank(blank);
        }
    });

    // ---------- السحب والإفلات بالماوس واللمس ----------

    function dropTargetAt(x, y) {

        const element = document.elementFromPoint(x, y);

        if (!element || !activity.contains(element)) return null;

        const blank = element.closest(".wordbank-blank");

        if (blank) return { type: "blank", element: blank };

        const bank = element.closest(".wordbank-bank");

        if (bank) return { type: "bank", element: bank };

        return null;
    }

    function clearHover() {

        activity.querySelectorAll(".drop-hover")
            .forEach(function (element) {
                element.classList.remove("drop-hover");
            });
    }

    function endDrag() {

        if (!drag) return;

        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointercancel", onPointerCancel);

        if (drag.ghost) drag.ghost.remove();

        if (drag.sourceChip) {
            drag.sourceChip.classList.remove("dragging");
        }

        clearHover();

        activity.classList.remove("is-dragging");
        document.body.classList.remove("wb-dragging");

        drag = null;
    }

    function onPointerMove(event) {

        if (!drag || event.pointerId !== drag.pointerId) return;

        if (!drag.started) {

            const distance = Math.hypot(
                event.clientX - drag.startX,
                event.clientY - drag.startY
            );

            if (distance < 6) return;

            drag.started = true;

            const ghost = document.createElement("div");

            ghost.className = "wb-chip wb-drag-ghost";
            ghost.textContent = wordText(drag.wordId);
            ghost.dir = direction;
            ghost.setAttribute("aria-hidden", "true");

            document.body.appendChild(ghost);

            drag.ghost = ghost;

            drag.sourceChip.classList.add("dragging");

            activity.classList.add("is-dragging");
            document.body.classList.add("wb-dragging");
        }

        drag.ghost.style.left = event.clientX + "px";
        drag.ghost.style.top = event.clientY + "px";

        clearHover();

        const target = dropTargetAt(event.clientX, event.clientY);

        if (target) target.element.classList.add("drop-hover");

        // تمرير الصفحة تلقائيًا عند الاقتراب من حافة الشاشة
        if (event.clientY < 70) {
            window.scrollBy(0, -14);
        } else if (event.clientY > window.innerHeight - 70) {
            window.scrollBy(0, 14);
        }
    }

    function onPointerUp(event) {

        if (!drag || event.pointerId !== drag.pointerId) return;

        const current = drag;

        const target = current.started
            ? dropTargetAt(event.clientX, event.clientY)
            : null;

        endDrag();

        if (!current.started) return;

        lastDragEnd = Date.now();

        if (!target || worksheetFinished) return;

        if (target.type === "blank") {

            placeWord(
                target.element.dataset.sentenceId,
                current.wordId
            );

        } else {

            returnWord(current.wordId);
        }
    }

    function onPointerCancel(event) {

        if (!drag || event.pointerId !== drag.pointerId) return;

        endDrag();
    }

    activity.addEventListener("pointerdown", function (event) {

        if (worksheetFinished || drag) return;

        if (event.pointerType === "mouse" && event.button !== 0) return;

        const chip = event.target.closest(".wb-chip");

        if (!chip || !activity.contains(chip)) return;

        drag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            started: false,
            ghost: null,
            sourceChip: chip,
            wordId: chip.dataset.wordId
        };

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
        document.addEventListener("pointercancel", onPointerCancel);
    });

    refresh();
}

// ==========================================
// شريط تقدم الطالب
// ==========================================

function updateStudentProgress() {

    const total = worksheetQuestions.reduce(
        (sum, question) => sum + countUnits(question),
        0
    );

    const answered = worksheetQuestions.reduce(
        (sum, question) => sum + answeredUnits(question),
        0
    );

    const percentage = total
        ? answered / total * 100
        : 0;

    document.getElementById("progressFill").style.width =
        percentage + "%";

    document.getElementById("progressText").textContent =
        "أجبت عن " + answered + " من " + total;
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

            total: question.score,

            correctPairs: correctPairs
        };
    }

    if (question.type === "wordbank") {

        const placements = answer || {};

        let earned = 0;
        let total = 0;
        let correctCount = 0;

        // كل جملة تُصحح بشكل مستقل ولها درجتها الخاصة
        const details = question.sentences.map(function (sentence) {

            const isCorrect =
                placements[sentence.id] === sentence.answerId;

            total += sentence.score;

            if (isCorrect) {
                earned += sentence.score;
                correctCount++;
            }

            return { id: sentence.id, correct: isCorrect };
        });

        return {
            correct: correctCount === question.sentences.length,
            earned: earned,
            total: total,
            correctCount: correctCount,
            details: details
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
        earned: correct ? question.score : 0,
        total: question.score
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

    } else if (question.type === "wordbank") {

        explanation =
            "الجمل الصحيحة: " +
            result.correctCount +
            " من " +
            question.sentences.length;

        const activity = card.querySelector(".wordbank-activity");

        activity.classList.add("locked");

        const wordById = new Map(
            question.words.map(word => [word.id, word])
        );

        question.sentences.forEach(function (sentence, index) {

            const isCorrect = result.details[index].correct;

            const row = [
                ...activity.querySelectorAll(".wordbank-sentence")
            ].find(element =>
                element.dataset.sentenceId === sentence.id
            );

            if (!row) return;

            const blank = row.querySelector(".wordbank-blank");

            blank.classList.remove("awaiting");
            blank.classList.add(isCorrect ? "correct" : "wrong");
            blank.setAttribute("tabindex", "-1");
            blank.setAttribute("aria-disabled", "true");

            const mark = row.querySelector(".wordbank-sentence-mark");

            mark.hidden = false;
            mark.classList.add(isCorrect ? "correct" : "wrong");

            const correctWord = wordById.get(sentence.answerId);

            mark.textContent = isCorrect
                ? "✓ إجابة صحيحة"
                : "✗ الإجابة الصحيحة: " +
                  (correctWord ? correctWord.text : "") +
                  " (" + formatNumber(sentence.score) + " درجة)";
        });
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
        ? assetUrl("sultan-correct.png")
        : assetUrl("jamila-wrong.png");

    const message = result.correct
        ? "أحسنت! إجابة صحيحة"
        : "لا بأس! حاول مرة أخرى";

    feedback.innerHTML = `
        <img src="${escapeHTML(image)}"
            alt="${result.correct ? "سلطان" : "جميلة"}">

        <div class="feedback-content">

            ${question.label
                ? `<p class="feedback-label" dir="ltr">${escapeHTML(question.label)}</p>`
                : ""}

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
                ${formatNumber(result.total)}
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

        const target = studentQuestions.querySelector(
            `[data-index="${unanswered.id}"]`
        );

        if (target) {

            target.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        return;
    }

    worksheetFinished = true;

    let earnedScore = 0;
    let totalScore = 0;

    const results = [];

    worksheetQuestions.forEach(function (question) {

        const result = gradeQuestion(question);

        results.push(result);

        earnedScore += result.earned;
        totalScore += result.total;

        const card = studentQuestions.querySelector(
            `[data-index="${question.id}"]`
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

    showFinalResult(earnedScore, totalScore, results);
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

function showFinalResult(earnedScore, totalScore, results) {

    const rawPercentage = totalScore
        ? earnedScore / totalScore * 100
        : 0;

    const allCorrect = results.every(result => result.correct);

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
            src="${escapeHTML(assetUrl(result.image))}"
            alt="سلطان وجميلة يشجعانك">

        <div class="result-circle"
            style="--result-progress:${percentage}%;">

            <div class="result-circle-inner">

                <div class="result-percentage" dir="ltr">
                    ${displayPercentage}%
                </div>

                <div class="result-score" dir="ltr">
                    ${formatNumber(earnedScore)} / ${formatNumber(totalScore)}
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

    // يعيد خلط بنوك الكلمات ويمسح جميع الإجابات
    renderStudentWorksheet();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

// @@STUDENT_CODE_END@@


// ==========================================
// واجهة المعلم - العناصر والحالة
// ==========================================

const addQuestionBtn = document.getElementById("addQuestionBtn");
const questionType = document.getElementById("questionType");
const questionsContainer = document.getElementById("questionsContainer");

const collapseAllBtn = document.getElementById("collapseAllBtn");
const expandAllBtn = document.getElementById("expandAllBtn");
const validationBanner = document.getElementById("validationBanner");
const validationText = document.getElementById("validationText");
const validationCloseBtn = document.getElementById("validationCloseBtn");
const worksheetStats = document.getElementById("worksheetStats");

const teacherEditor = document.getElementById("teacherEditor");
const studentPreview = document.getElementById("studentPreview");

const previewWorksheetBtn = document.getElementById("previewWorksheetBtn");
const backToEditorBtn = document.getElementById("backToEditorBtn");

const PASSAGE_TYPE = "قطعة وأسئلة";

// علامة الفراغ داخل جملة بنك الكلمات
const BLANK_MARKER = "[فراغ]";

// قيم القائمة المنسدلة وما يقابلها من أنواع داخلية
const GROUP_TYPE_BY_OPTION = {
    text: "text",
    image: "image",
    truefalse: "truefalse",
    blank: "blank",
    match: "matching",
    matching: "matching",
    "قطعة وأسئلة": "passage",
    passage: "passage",
    wordbank: "wordbank"
};

let questionId = 0;
let uidCounter = 0;

// معرفات داخلية ثابتة لا تعتمد على أرقام الأسئلة المعروضة
function nextUid(prefix) {
    uidCounter++;
    return prefix + "_" + uidCounter;
}

class WorksheetError extends Error {

    constructor(message, card, field) {
        super(message);
        this.card = card || null;
        this.field = field || null;
    }
}

function positiveInt(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

function snippet(text, max = 45) {

    const clean = String(text || "").replace(/\s+/g, " ").trim();

    return clean.length > max
        ? clean.slice(0, max).trimEnd() + "…"
        : clean;
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

    return {
        reset: function () {

            // إلغاء أي تحميل لم يكتمل بعد
            version++;

            delete container.dataset.image;
            delete container.dataset.pending;

            input.value = "";

            preview.removeAttribute("src");
            preview.style.display = "none";
            placeholder.style.display = "";
        }
    };
}


// ==========================================
// البطاقات القابلة للطي
// ==========================================

function toggleButtonHTML(label) {

    return `
        <button type="button"
            class="js-toggle collapse-toggle"
            aria-expanded="true"
            aria-label="طي أو توسيع ${label}"
            title="طي أو توسيع">

            <span class="chevron" aria-hidden="true"></span>

            <span class="toggle-text">طي</span>

        </button>
    `;
}

function cardToolsHTML(deleteLabel) {

    return `
        <div class="card-tools">

            <button type="button"
                class="js-move-up tool-btn"
                aria-label="تحريك لأعلى"
                title="تحريك لأعلى">▲</button>

            <button type="button"
                class="js-move-down tool-btn"
                aria-label="تحريك لأسفل"
                title="تحريك لأسفل">▼</button>

            <button type="button"
                class="js-delete delete-question">
                ${deleteLabel}
            </button>

        </div>
    `;
}

function ownBody(unit) {
    return unit.querySelector(
        ":scope > .card-body, :scope > .group-body"
    );
}

function setCollapsed(unit, collapsed) {

    if (unit.classList.contains("single-activity")) return;

    const body = ownBody(unit);

    if (!body) return;

    // يُخفى المحتوى فقط ولا يُحذف، فتبقى القيم والمستمعات كما هي
    body.hidden = collapsed;

    unit.classList.toggle("collapsed", collapsed);

    const toggle = unit.querySelector(
        ":scope > .question-header .js-toggle, " +
        ":scope > .group-header .js-toggle"
    );

    if (toggle) {

        toggle.setAttribute("aria-expanded", String(!collapsed));

        toggle.querySelector(".toggle-text").textContent =
            collapsed ? "توسيع" : "طي";
    }
}

// توسيع كل ما يحيط بالعنصر ليصبح ظاهرًا
function revealCard(element) {

    let node = element;

    while (node && node !== questionsContainer) {

        if (
            node.matches &&
            node.matches(".question-card, .question-group")
        ) {
            setCollapsed(node, false);
        }

        node = node.parentElement;
    }
}

function revealAndScroll(element) {

    revealCard(element);

    requestAnimationFrame(function () {

        element.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
}

function moveUnit(unit, direction) {

    const sibling = direction < 0
        ? unit.previousElementSibling
        : unit.nextElementSibling;

    if (!sibling) return;

    // نقل العقدة نفسها دون إعادة إنشائها
    if (direction < 0) {
        unit.parentNode.insertBefore(unit, sibling);
    } else {
        unit.parentNode.insertBefore(sibling, unit);
    }

    refreshAll();

    unit.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

questionsContainer.addEventListener("click", function (event) {

    const button = event.target.closest("button");

    if (!button || !questionsContainer.contains(button)) return;

    const unit = button.closest(".question-card, .question-group");

    if (!unit) return;

    if (button.classList.contains("js-toggle")) {

        setCollapsed(unit, !unit.classList.contains("collapsed"));

    } else if (button.classList.contains("js-collapse-bottom")) {

        setCollapsed(unit, true);

        unit.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    } else if (button.classList.contains("js-move-up")) {

        moveUnit(unit, -1);

    } else if (button.classList.contains("js-move-down")) {

        moveUnit(unit, 1);

    } else if (button.classList.contains("js-delete")) {

        const isGroup = unit.classList.contains("question-group");

        const message = isGroup
            ? "هل تريد حذف هذا السؤال وجميع أسئلته الفرعية؟"
            : "هل تريد حذف هذا السؤال الفرعي؟";

        if (confirm(message)) {

            unit.remove();

            refreshAll();
        }

    } else if (button.classList.contains("js-add-sub")) {

        const group = button.closest(".question-group");

        if (!group) return;

        const select = group.querySelector(".passage-question-type");

        const type = select
            ? GROUP_TYPE_BY_OPTION[select.value]
            : group.dataset.type;

        const card = addSubquestion(group, type);

        revealAndScroll(card);
    }
});

collapseAllBtn.addEventListener("click", function () {

    questionsContainer
        .querySelectorAll(":scope > .question-group")
        .forEach(group => setCollapsed(group, true));
});

expandAllBtn.addEventListener("click", function () {

    questionsContainer
        .querySelectorAll(".question-group, .question-card")
        .forEach(unit => setCollapsed(unit, false));
});

// ==========================================
// رسائل التحقق (باللون البرتقالي)
// ==========================================

function clearValidationMarks() {

    validationBanner.hidden = true;
    validationText.textContent = "";

    questionsContainer
        .querySelectorAll(".has-error, .field-invalid")
        .forEach(function (element) {
            element.classList.remove("has-error", "field-invalid");
        });
}

function showValidationMessage(message) {

    validationText.textContent = message;
    validationBanner.hidden = false;
}

function showValidationError(error) {

    clearValidationMarks();

    showValidationMessage(error.message);

    const card = error.card;
    const field = error.field;

    if (card) {

        // توسيع البطاقة ثم الانتقال إليها
        revealCard(card);

        card.classList.add("has-error");
    }

    if (field) {

        field.classList.add("field-invalid");
    }

    const target = field || card;

    if (target) {

        target.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        if (field && typeof field.focus === "function") {

            setTimeout(function () {
                field.focus({ preventScroll: true });
            }, 350);
        }
    }
}

validationCloseBtn.addEventListener("click", function () {
    validationBanner.hidden = true;
});

function clearFieldMark(event) {

    if (event.target.classList) {
        event.target.classList.remove("field-invalid");
    }
}

questionsContainer.addEventListener("input", clearFieldMark);
questionsContainer.addEventListener("change", clearFieldMark);

// ==========================================
// إنشاء بطاقة السؤال الفرعي
// ==========================================

function createQuestionCard(
    type,
    title,
    content,
    target = questionsContainer,
    options = {}
) {

    // مجموعات التوصيل وبنك الكلمات تحتوي نشاطًا واحدًا بدون ترقيم فرعي
    const single = target.dataset.single === "true";

    const card = document.createElement("div");

    card.className =
        "question-card" + (single ? " single-activity" : "");

    card.dataset.type = type;
    card.dataset.uid = nextUid("q");

    const header = single ? "" : `
        <div class="question-header">

            ${toggleButtonHTML("السؤال الفرعي")}

            <h3 class="question-number" dir="ltr"></h3>

            <span class="card-summary"></span>

            ${cardToolsHTML("حذف السؤال الفرعي")}

        </div>
    `;

    const scoreBlock = options.noScore ? "" : `
        <label>درجة السؤال</label>

        <input type="number"
            class="question-score"
            value="1"
            min="1"
            step="1"
            aria-label="درجة السؤال">
    `;

    const footer = single ? "" : `
        <div class="card-footer">
            <button type="button"
                class="js-collapse-bottom bottom-collapse-btn">
                ▲ طي هذا السؤال الفرعي
            </button>
        </div>
    `;

    card.innerHTML = `
        ${header}

        <div class="card-body">

            <div class="question-type">${title}</div>

            ${content}

            ${scoreBlock}

            ${footer}

        </div>
    `;

    target.appendChild(card);

    return card;
}

function addTextQuestion(target = questionsContainer) {

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
        `,
        target
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

    return card;
}

function addTrueFalseQuestion(target = questionsContainer) {

    questionId++;

    const card = createQuestionCard(
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
        `,
        target
    );

    return card;
}

function addImageQuestion(target = questionsContainer) {

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
        `,
        target
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

    return card;
}

function addBlankQuestion(target = questionsContainer) {

    const card = createQuestionCard(
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
        `,
        target
    );

    return card;
}

function addMatchingQuestion(target = questionsContainer) {

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
        `,
        target
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

    return card;
}


// ==========================================
// النوع السابع: بنك الكلمات - واجهة المعلم
// ==========================================

function insertBlankAtCursor(input) {

    let value = input.value;

    let start = input.selectionStart;
    let end = input.selectionEnd;

    if (start === null || start === undefined) start = value.length;
    if (end === null || end === undefined) end = start;

    // فراغ واحد فقط في الجملة: إن وُجد فراغ سابق يُنقل إلى مكان المؤشر
    const existing = value.indexOf(BLANK_MARKER);

    if (existing !== -1) {

        const length = BLANK_MARKER.length;

        value = value.slice(0, existing) +
            value.slice(existing + length);

        const adjust = function (position) {

            if (position <= existing) return position;

            return Math.max(existing, position - length);
        };

        start = adjust(start);
        end = adjust(end);
    }

    const before = value.slice(0, start);
    const after = value.slice(end);

    const spaceBefore = before && !/\s$/.test(before) ? " " : "";

    const spaceAfter =
        after && !/^[\s.,،؛;:!?؟)\]]/.test(after) ? " " : "";

    const insertion = spaceBefore + BLANK_MARKER + spaceAfter;

    input.value = before + insertion + after;

    const caret = (before + spaceBefore + BLANK_MARKER).length +
        spaceAfter.length;

    input.focus();
    input.setSelectionRange(caret, caret);

    input.dispatchEvent(new Event("input", { bubbles: true }));
}

function createWordRow(card, kind, text) {

    const list = card.querySelector(
        kind === "distractor" ? ".wb-distractors" : ".wb-words"
    );

    const row = document.createElement("div");

    row.className = "wb-word-row";
    row.dataset.wordId = nextUid("w");
    row.dataset.kind = kind;

    const direction = card.querySelector(".wordbank-direction").value;

    row.innerHTML = `
        <input type="text"
            class="wb-word-input"
            dir="${direction}"
            autocomplete="off"
            placeholder="${kind === "distractor" ? "كلمة مشتتة" : "كلمة"}"
            aria-label="${kind === "distractor" ? "كلمة مشتتة" : "كلمة من البنك"}">

        <button type="button"
            class="wb-delete-word delete-question">
            حذف
        </button>
    `;

    row.querySelector("input").value = text || "";

    list.appendChild(row);

    return row;
}

function createSentenceRow(card) {

    const list = card.querySelector(".wb-sentences");

    const row = document.createElement("div");

    row.className = "wb-sentence-row";
    row.dataset.sentenceId = nextUid("s");

    const direction = card.querySelector(".wordbank-direction").value;

    row.innerHTML = `
        <div class="wb-sentence-head">

            <span class="sentence-label" dir="ltr"></span>

            <div class="card-tools">

                <button type="button"
                    class="wb-move-sentence-up tool-btn"
                    aria-label="تحريك الجملة لأعلى"
                    title="تحريك لأعلى">▲</button>

                <button type="button"
                    class="wb-move-sentence-down tool-btn"
                    aria-label="تحريك الجملة لأسفل"
                    title="تحريك لأسفل">▼</button>

                <button type="button"
                    class="wb-delete-sentence delete-question">
                    حذف الجملة
                </button>

            </div>

        </div>

        <label>نص الجملة</label>

        <input type="text"
            class="wb-sentence-input"
            dir="${direction}"
            autocomplete="off"
            placeholder="اكتب الجملة ثم ضع المؤشر في مكان الفراغ واضغط «إدراج فراغ»"
            aria-label="نص الجملة">

        <button type="button" class="wb-insert-blank">
            إدراج فراغ
        </button>

        <div class="wb-sentence-meta">

            <div>
                <label>الإجابة الصحيحة (من بنك الكلمات)</label>

                <select class="wb-answer-select"
                    aria-label="الإجابة الصحيحة"></select>
            </div>

            <div>
                <label>درجة الجملة</label>

                <input type="number"
                    class="sentence-score"
                    value="1"
                    min="1"
                    step="1"
                    aria-label="درجة الجملة">
            </div>

        </div>
    `;

    list.appendChild(row);

    return row;
}

// تحديث قوائم الإجابات الصحيحة اعتمادًا على المعرفات الثابتة للكلمات
function refreshWordBankSelects(card) {

    const words = [
        ...card.querySelectorAll(".wb-words .wb-word-row")
    ].map(row => ({
        id: row.dataset.wordId,
        text: row.querySelector("input").value.trim()
    }));

    const selects = [...card.querySelectorAll(".wb-answer-select")];

    const chosen = selects.map(select => select.dataset.answerId || "");

    selects.forEach(function (select, index) {

        const current = chosen[index];

        select.innerHTML = "";

        select.appendChild(
            new Option("اختر الإجابة الصحيحة", "")
        );

        words.forEach(function (word) {

            const option = new Option(
                word.text || "(كلمة بدون نص)",
                word.id
            );

            // لا يُسمح باختيار الكلمة نفسها إجابةً لجملتين
            option.disabled = chosen.some(
                (id, other) => other !== index && id === word.id
            );

            select.appendChild(option);
        });

        const exists = words.some(word => word.id === current);

        select.value = exists ? current : "";
        select.dataset.answerId = exists ? current : "";
    });
}

function addWordBankQuestion(target) {

    const card = createQuestionCard(
        "wordbank",
        GROUP_TYPE_NAMES.wordbank,
        `
        <label>تعليمات بنك الكلمات (اختياري)</label>

        <textarea class="question-text"
            rows="2"
            placeholder="مثال: اختر الكلمة المناسبة لإكمال كل جملة"
            aria-label="تعليمات بنك الكلمات"></textarea>

        <label>اتجاه نص البنك والجمل</label>

        <select class="wordbank-direction"
            aria-label="اتجاه نص بنك الكلمات">
            <option value="rtl">من اليمين إلى اليسار (العربية)</option>
            <option value="ltr">من اليسار إلى اليمين (English)</option>
        </select>

        <div class="wb-section">

            <h4>كلمات البنك</h4>

            <p class="wb-hint">
                هذه الكلمات يشترك فيها جميع جمل هذا السؤال،
                وتُستخدم كل كلمة مرة واحدة فقط.
            </p>

            <div class="wb-words"></div>

            <button type="button" class="wb-add-word">
                + إضافة كلمة
            </button>

        </div>

        <div class="wb-section">

            <h4>كلمات إضافية مشتتة (اختياري)</h4>

            <p class="wb-hint">
                كلمات تظهر للطالب في البنك لكنها ليست إجابة صحيحة لأي جملة.
            </p>

            <div class="wb-distractors"></div>

            <button type="button" class="wb-add-distractor">
                + إضافة كلمة مشتتة
            </button>

        </div>

        <div class="wb-section">

            <h4>الجمل</h4>

            <p class="wb-hint">
                اكتب الجملة، ضع المؤشر في المكان المطلوب، ثم اضغط
                «إدراج فراغ». علامة الفراغ هي ${BLANK_MARKER}
                ويُسمح بفراغ واحد فقط في كل جملة.
            </p>

            <div class="wb-sentences"></div>

            <button type="button" class="wb-add-sentence">
                + إضافة جملة
            </button>

            <p class="wb-total-score"></p>

        </div>
        `,
        target,
        { noScore: true }
    );

    card.addEventListener("click", function (event) {

        const button = event.target.closest("button");

        if (!button || !card.contains(button)) return;

        if (button.classList.contains("wb-add-word")) {

            createWordRow(card, "answer", "");

            refreshWordBankSelects(card);

            refreshAll();

        } else if (button.classList.contains("wb-add-distractor")) {

            createWordRow(card, "distractor", "");

            refreshAll();

        } else if (button.classList.contains("wb-delete-word")) {

            const row = button.closest(".wb-word-row");

            const inUse = [
                ...card.querySelectorAll(".wb-answer-select")
            ].some(select => select.dataset.answerId === row.dataset.wordId);

            if (
                inUse &&
                !confirm(
                    "هذه الكلمة محددة إجابةً صحيحة لإحدى الجمل. هل تريد حذفها؟"
                )
            ) {
                return;
            }

            row.remove();

            refreshWordBankSelects(card);

        } else if (button.classList.contains("wb-add-sentence")) {

            const row = createSentenceRow(card);

            refreshWordBankSelects(card);

            refreshAll();

            row.querySelector(".wb-sentence-input").focus();

        } else if (button.classList.contains("wb-delete-sentence")) {

            if (confirm("هل تريد حذف هذه الجملة؟")) {

                button.closest(".wb-sentence-row").remove();

                refreshWordBankSelects(card);

                refreshAll();
            }

        } else if (button.classList.contains("wb-insert-blank")) {

            insertBlankAtCursor(
                button.closest(".wb-sentence-row")
                    .querySelector(".wb-sentence-input")
            );

        } else if (
            button.classList.contains("wb-move-sentence-up") ||
            button.classList.contains("wb-move-sentence-down")
        ) {

            const row = button.closest(".wb-sentence-row");

            const up = button.classList.contains("wb-move-sentence-up");

            const sibling = up
                ? row.previousElementSibling
                : row.nextElementSibling;

            if (sibling) {

                if (up) {
                    row.parentNode.insertBefore(row, sibling);
                } else {
                    row.parentNode.insertBefore(sibling, row);
                }

                refreshAll();
            }
        }
    });

    card.addEventListener("input", function (event) {

        if (event.target.classList.contains("wb-word-input")) {

            // يتحدث النص في القوائم دون فقدان الإجابة المحددة
            if (
                event.target.closest(".wb-word-row").dataset.kind ===
                "answer"
            ) {
                refreshWordBankSelects(card);
            }
        }
    });

    card.addEventListener("change", function (event) {

        const target = event.target;

        if (target.classList.contains("wb-answer-select")) {

            target.dataset.answerId = target.value;

            refreshWordBankSelects(card);

        } else if (target.classList.contains("wordbank-direction")) {

            card.querySelectorAll(".wb-word-input, .wb-sentence-input")
                .forEach(function (field) {
                    field.dir = target.value;
                });
        }
    });

    for (let i = 0; i < 3; i++) {
        createWordRow(card, "answer", "");
    }

    createSentenceRow(card);
    createSentenceRow(card);

    refreshWordBankSelects(card);

    return card;
}


// ==========================================
// مجموعات الأسئلة الرئيسية والأسئلة الفرعية
// ==========================================

const QUESTION_BUILDERS = {
    text: addTextQuestion,
    truefalse: addTrueFalseQuestion,
    image: addImageQuestion,
    blank: addBlankQuestion,
    matching: addMatchingQuestion,
    wordbank: addWordBankQuestion
};

function getSubquestionHost(group) {
    return group.querySelector(".subquestions");
}

function addSubquestion(group, type) {

    const builder = QUESTION_BUILDERS[type || group.dataset.type];

    if (!builder) {
        throw new Error("نوع سؤال غير مدعوم.");
    }

    const card = builder(getSubquestionHost(group));

    refreshAll();

    return card;
}

function passageFieldsHTML() {

    return `
        <label>اتجاه نص القطعة</label>

        <select class="passage-direction"
            aria-label="اتجاه نص القطعة">
            <option value="rtl">من اليمين إلى اليسار (العربية)</option>
            <option value="ltr">من اليسار إلى اليمين (English)</option>
        </select>

        <label>عنوان القطعة (اختياري)</label>

        <input type="text"
            class="passage-title-input"
            dir="rtl"
            placeholder="اكتب عنوان القطعة"
            aria-label="عنوان القطعة">

        <label>نص القطعة</label>

        <textarea class="passage-text-input"
            rows="10"
            dir="rtl"
            placeholder="اكتب نص القطعة أو الصقه هنا"
            aria-label="نص القطعة"></textarea>

        <label>صورة القطعة (اختياري)</label>

        <div class="passage-image-upload">

            <div class="passage-image-box">

                <span class="passage-image-placeholder">
                    معاينة صورة القطعة
                </span>

                <img class="passage-image-preview"
                    alt="معاينة صورة القطعة"
                    style="display:none;">

            </div>

            <div class="passage-image-actions">

                <label class="passage-file-label">

                    اختيار أو استبدال الصورة

                    <input type="file"
                        class="passage-file"
                        accept="image/png,image/jpeg,image/webp"
                        aria-label="اختيار صورة القطعة">

                </label>

                <button type="button" class="remove-passage-image">
                    حذف صورة القطعة
                </button>

            </div>

        </div>
    `;
}

function addGroup(type) {

    const group = document.createElement("section");

    group.className =
        "question-group" + (type === "passage" ? " passage-card" : "");

    group.dataset.type = type;
    group.dataset.uid = nextUid("g");

    const single = type === "matching" || type === "wordbank";

    let childrenArea;

    if (type === "passage") {

        childrenArea = `
            <div class="passage-children-section">

                <h4>أسئلة القطعة</h4>

                <p class="passage-question-count"></p>

                <div class="subquestions" data-single="false"></div>

                <label>نوع السؤال الجديد لهذه القطعة</label>

                <select class="passage-question-type"
                    aria-label="نوع سؤال القطعة">
                    <option value="text">اختيار من متعدد (إجابات نصية)</option>
                    <option value="truefalse">صح أو خطأ</option>
                    <option value="image">اختيار من متعدد (إجابات مصورة)</option>
                    <option value="blank">أكمل الفراغ</option>
                    <option value="matching">التوصيل والمطابقة</option>
                    <option value="wordbank">بنك الكلمات</option>
                </select>

                <button type="button"
                    class="js-add-sub add-passage-question">
                    + إضافة سؤال إلى هذه القطعة
                </button>

            </div>
        `;

    } else {

        childrenArea = `
            <div class="subquestions"
                data-single="${single}"></div>

            ${single ? "" : `
                <button type="button"
                    class="js-add-sub add-sub-btn">
                    + إضافة سؤال فرعي
                </button>
            `}
        `;
    }

    group.innerHTML = `
        <div class="group-header">

            ${toggleButtonHTML("السؤال")}

            <div class="group-heading">

                <h3 class="group-number"></h3>

                <span class="group-type-badge">
                    ${GROUP_TYPE_NAMES[type]}
                </span>

            </div>

            ${cardToolsHTML("حذف السؤال")}

        </div>

        <div class="group-summary">

            <span class="summary-text"></span>

            <span class="summary-chip summary-count"></span>

            <span class="summary-chip summary-score"></span>

        </div>

        <div class="group-body">

            <div class="group-title-field">

                <label>عنوان السؤال أو توجيه عام (اختياري)</label>

                <input type="text"
                    class="group-title-input"
                    placeholder="مثال: اقرأ جيدًا ثم أجب"
                    aria-label="عنوان السؤال الرئيسي">

            </div>

            ${type === "passage" ? passageFieldsHTML() : ""}

            ${childrenArea}

            <div class="card-footer">
                <button type="button"
                    class="js-collapse-bottom bottom-collapse-btn">
                    ▲ طي هذا السؤال
                </button>
            </div>

        </div>
    `;

    questionsContainer.appendChild(group);

    if (type === "passage") {

        const direction = group.querySelector(".passage-direction");

        direction.addEventListener("change", function () {

            group.querySelectorAll(
                ".passage-title-input, .passage-text-input"
            ).forEach(function (field) {
                field.dir = direction.value;
            });
        });

        const imageUpload = setupImageUpload(
            group.querySelector(".passage-image-upload"),
            ".passage-file",
            ".passage-image-preview",
            ".passage-image-placeholder"
        );

        group.querySelector(".remove-passage-image")
            .addEventListener("click", imageUpload.reset);

    } else {

        // سؤال فرعي أول جاهز للكتابة
        addSubquestion(group, type);
    }

    refreshAll();

    revealAndScroll(group);

    return group;
}

addQuestionBtn.addEventListener("click", function () {

    const type = GROUP_TYPE_BY_OPTION[questionType.value];

    if (!type) return;

    addGroup(type);
});

// ==========================================
// الترقيم الهرمي والملخصات والدرجات
// ==========================================

function ownTool(unit, selector) {

    return unit.querySelector(
        ":scope > .question-header " + selector + ", " +
        ":scope > .group-header " + selector
    );
}

function cardSnippet(card) {

    if (card.dataset.type === "wordbank") {

        const instructions = card.querySelector(".question-text").value;

        if (instructions.trim()) return snippet(instructions);

        const first = card.querySelector(".wb-sentence-input");

        return first
            ? snippet(first.value.split(BLANK_MARKER).join(" … "))
            : "";
    }

    const field = card.querySelector(".question-text");

    return field ? snippet(field.value) : "";
}

// يحسب البنود المصححة ودرجة البطاقة ويحدّث ترقيم جمل بنك الكلمات
function measureCard(card, baseLabel) {

    if (card.dataset.type === "wordbank") {

        const rows = [...card.querySelectorAll(".wb-sentence-row")];

        let score = 0;

        rows.forEach(function (row, index) {

            row.querySelector(".sentence-label").textContent =
                baseLabel + "." + (index + 1);

            score += positiveInt(
                row.querySelector(".sentence-score").value
            );
        });

        card.querySelector(".wb-total-score").textContent =
            "مجموع درجات الجمل: " + score;

        return {
            units: rows.length,
            score: score,
            meta: rows.length + " جمل"
        };
    }

    return {
        units: 1,
        score: positiveInt(card.querySelector(".question-score").value),
        meta: ""
    };
}

function refreshAll() {

    const groups = [
        ...questionsContainer.querySelectorAll(":scope > .question-group")
    ];

    let totalUnits = 0;
    let totalScore = 0;

    groups.forEach(function (group, groupIndex) {

        const type = group.dataset.type;
        const number = groupIndex + 1;

        group.querySelector(":scope > .group-header .group-number")
            .textContent = groupOrdinalName(number);

        const cards = [
            ...getSubquestionHost(group)
                .querySelectorAll(":scope > .question-card")
        ];

        let groupUnits = 0;
        let groupScore = 0;

        cards.forEach(function (card, cardIndex) {

            const single = card.classList.contains("single-activity");

            // ترقيم هرمي: 1.1 ثم 1.2 ... ويعتمد على الموقع لا على المعرف
            const label = single ? "" : number + "." + (cardIndex + 1);

            card.dataset.label = label;

            const numberElement = card.querySelector(
                ":scope > .question-header .question-number"
            );

            if (numberElement) {
                numberElement.textContent = label;
            }

            const info = measureCard(card, label || String(number));

            groupUnits += info.units;
            groupScore += info.score;

            const summary = card.querySelector(
                ":scope > .question-header .card-summary"
            );

            if (summary) {

                const parts = [
                    cardSnippet(card) || "لم يُكتب نص بعد"
                ];

                if (info.meta) parts.push(info.meta);

                parts.push("الدرجة: " + info.score);

                summary.textContent = parts.join(" • ");
            }
        });

        // ملخص المجموعة
        const title = group.querySelector(".group-title-input").value;

        let summaryText = snippet(title);

        if (!summaryText && type === "passage") {

            summaryText =
                snippet(group.querySelector(".passage-title-input").value) ||
                snippet(group.querySelector(".passage-text-input").value);
        }

        if (!summaryText && cards[0]) {
            summaryText = cardSnippet(cards[0]);
        }

        group.querySelector(".summary-text").textContent =
            summaryText || "لم يُكتب نص بعد";

        let countText;

        if (type === "matching") {

            countText = "عدد الأزواج: " +
                group.querySelectorAll(".match-pair").length;

        } else if (type === "wordbank") {

            countText = "عدد الجمل: " + groupUnits;

        } else if (type === "passage") {

            countText = "الأسئلة الفرعية: " + cards.length +
                (groupUnits !== cards.length
                    ? " (البنود المصححة: " + groupUnits + ")"
                    : "");

            group.querySelector(".passage-question-count")
                .textContent = "عدد أسئلة هذه القطعة: " + cards.length;

        } else {

            countText = "الأسئلة الفرعية: " + cards.length;
        }

        group.querySelector(".summary-count").textContent = countText;

        group.querySelector(".summary-score").textContent =
            "مجموع الدرجات: " + groupScore;

        totalUnits += groupUnits;
        totalScore += groupScore;

        // أزرار تحريك الأسئلة الفرعية
        cards.forEach(function (card, index) {

            const up = ownTool(card, ".js-move-up");
            const down = ownTool(card, ".js-move-down");

            if (up) up.disabled = index === 0;
            if (down) down.disabled = index === cards.length - 1;
        });
    });

    // أزرار تحريك الأسئلة الرئيسية
    groups.forEach(function (group, index) {

        ownTool(group, ".js-move-up").disabled = index === 0;

        ownTool(group, ".js-move-down").disabled =
            index === groups.length - 1;
    });

    worksheetStats.textContent = groups.length
        ? "الأسئلة الرئيسية: " + groups.length +
          " • البنود المصححة: " + totalUnits +
          " • مجموع الدرجات: " + totalScore
        : "لم تتم إضافة أسئلة بعد.";
}

let refreshQueued = false;

function scheduleRefresh() {

    if (refreshQueued) return;

    refreshQueued = true;

    requestAnimationFrame(function () {

        refreshQueued = false;

        refreshAll();
    });
}

questionsContainer.addEventListener("input", scheduleRefresh);
questionsContainer.addEventListener("change", scheduleRefresh);

refreshAll();


// ==========================================
// قراءة الأسئلة من محرر المعلم
// ==========================================

function collectWordBank(card, base, requireValue) {

    const direction =
        card.querySelector(".wordbank-direction").value === "ltr"
            ? "ltr"
            : "rtl";

    const instructions =
        card.querySelector(".question-text").value.trim();

    const words = [
        ...card.querySelectorAll(".wb-word-row")
    ].map(row => ({
        id: row.dataset.wordId,
        text: row.querySelector("input").value.trim(),
        distractor: row.dataset.kind === "distractor",
        input: row.querySelector("input")
    }));

    const emptyWord = words.find(word => !word.text);

    requireValue(
        !emptyWord,
        "توجد كلمة فارغة في بنك الكلمات. اكتبها أو احذف الحقل.",
        emptyWord ? emptyWord.input : null
    );

    const seen = new Set();

    words.forEach(function (word) {

        const key = normalizeAnswer(word.text);

        requireValue(
            !seen.has(key),
            "الكلمة «" + word.text + "» مكررة في بنك الكلمات.",
            word.input
        );

        seen.add(key);
    });

    const sentenceRows = [
        ...card.querySelectorAll(".wb-sentence-row")
    ];

    requireValue(
        sentenceRows.length > 0,
        "أضف جملة واحدة على الأقل.",
        card.querySelector(".wb-add-sentence")
    );

    const answerWords = words.filter(word => !word.distractor);

    requireValue(
        answerWords.length >= sentenceRows.length,
        "عدد كلمات البنك المتاحة (" + answerWords.length +
        ") أقل من عدد الجمل (" + sentenceRows.length +
        "). كل كلمة تُستخدم مرة واحدة فقط.",
        card.querySelector(".wb-add-word")
    );

    const usedAnswers = new Set();

    const sentences = sentenceRows.map(function (row) {

        const label = row.querySelector(".sentence-label").textContent;

        const input = row.querySelector(".wb-sentence-input");

        const raw = input.value.replace(/\s+/g, " ");

        const markerCount = raw.split(BLANK_MARKER).length - 1;

        requireValue(
            raw.trim() !== "",
            "الجملة " + label + ": يرجى كتابة نص الجملة.",
            input
        );

        requireValue(
            markerCount > 0,
            "الجملة " + label + ": لا يوجد فراغ. ضع المؤشر في المكان المطلوب واضغط «إدراج فراغ».",
            input
        );

        requireValue(
            markerCount === 1,
            "الجملة " + label + ": يُسمح بفراغ واحد فقط في كل جملة.",
            input
        );

        const index = raw.indexOf(BLANK_MARKER);

        const before = raw.slice(0, index).replace(/^\s+/, "");

        const after = raw
            .slice(index + BLANK_MARKER.length)
            .replace(/\s+$/, "");

        requireValue(
            before.trim() || after.trim(),
            "الجملة " + label + ": اكتب نصًا مع الفراغ.",
            input
        );

        const select = row.querySelector(".wb-answer-select");

        const answerId = select.value;

        requireValue(
            answerId,
            "الجملة " + label + ": حدد الإجابة الصحيحة من بنك الكلمات.",
            select
        );

        const answerWord = answerWords.find(
            word => word.id === answerId
        );

        requireValue(
            answerWord,
            "الجملة " + label + ": الإجابة الصحيحة غير موجودة في بنك الكلمات.",
            select
        );

        requireValue(
            !usedAnswers.has(answerId),
            "الكلمة «" + answerWord.text +
            "» محددة إجابةً صحيحة لأكثر من جملة. كل كلمة تُستخدم مرة واحدة.",
            select
        );

        usedAnswers.add(answerId);

        const scoreField = row.querySelector(".sentence-score");

        const score = Number(scoreField.value);

        requireValue(
            Number.isSafeInteger(score) && score > 0,
            "الجملة " + label + ": يرجى إدخال درجة صحيحة أكبر من صفر.",
            scoreField
        );

        return {
            id: row.dataset.sentenceId,
            label: label,
            before: before,
            after: after,
            answerId: answerId,
            score: score
        };
    });

    return {
        ...base,
        text: instructions,
        direction: direction,
        words: words.map(word => ({
            id: word.id,
            text: word.text,
            distractor: word.distractor
        })),
        sentences: sentences,
        score: sentences.reduce((sum, sentence) => sum + sentence.score, 0)
    };
}

function collectItem(card, id, label, prefix) {

    const type = card.dataset.type;

    function requireValue(condition, message, field) {

        if (!condition) {
            throw new WorksheetError(
                prefix + ": " + message,
                card,
                field || null
            );
        }
    }

    const base = {
        id: id,
        uid: card.dataset.uid,
        type: type,
        label: label
    };

    if (type === "wordbank") {
        return collectWordBank(card, base, requireValue);
    }

    const textField = card.querySelector(".question-text");
    const scoreField = card.querySelector(".question-score");

    const text = textField.value.trim();
    const score = Number(scoreField.value);

    requireValue(text, "يرجى كتابة نص السؤال.", textField);

    requireValue(
        Number.isSafeInteger(score) && score > 0,
        "يرجى إدخال درجة صحيحة أكبر من صفر.",
        scoreField
    );

    const question = { ...base, text: text, score: score };

    if (type === "text") {

        const inputs = [...card.querySelectorAll(".answer-input")];

        question.options = inputs.map(input => input.value.trim());

        question.correct =
            card.querySelector(".correct-answer").value;

        requireValue(
            question.options.every(Boolean),
            "يرجى كتابة جميع الإجابات.",
            inputs.find(input => !input.value.trim())
        );

        requireValue(
            question.correct !== "",
            "يرجى تحديد الإجابة الصحيحة.",
            card.querySelector(".correct-answer")
        );

    } else if (type === "truefalse") {

        const selected = card.querySelector(
            ".correct-answer:checked"
        );

        requireValue(
            selected,
            "يرجى تحديد صح أو خطأ.",
            card.querySelector(".correct-answer")
        );

        question.correct = selected.value;

    } else if (type === "image") {

        const options = [
            ...card.querySelectorAll(".image-option")
        ];

        requireValue(
            options.every(option => !option.dataset.pending),
            "انتظر حتى يكتمل تحميل الصور.",
            options.find(option => option.dataset.pending)
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
            "يرجى إضافة الصور الأربع.",
            options.find(option => !option.dataset.image)
        );

        requireValue(
            question.correct !== "",
            "يرجى تحديد الصورة الصحيحة.",
            card.querySelector(".correct-answer")
        );

    } else if (type === "blank") {

        const correctField = card.querySelector(".correct-answer");

        question.correct = correctField.value.trim();

        requireValue(
            question.correct,
            "يرجى كتابة الإجابة الصحيحة.",
            correctField
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

                    const field = cell.querySelector(".match-value");

                    const value = field.value.trim();

                    requireValue(
                        value,
                        "يرجى إكمال نصوص الزوج رقم " + (pairIndex + 1),
                        field
                    );

                    return {
                        type: "text",
                        text: value
                    };

                } else {

                    requireValue(
                        !cell.dataset.pending,
                        "انتظر حتى يكتمل تحميل الصور.",
                        cell
                    );

                    requireValue(
                        cell.dataset.image,
                        "يرجى إضافة صور الزوج رقم " + (pairIndex + 1),
                        cell
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

        throw new WorksheetError("نوع سؤال غير مدعوم.", card);
    }

    return question;
}

function collectWorksheet() {

    const groupElements = [
        ...questionsContainer.querySelectorAll(":scope > .question-group")
    ];

    if (!groupElements.length) {
        throw new WorksheetError("يرجى إضافة سؤال واحد على الأقل.");
    }

    // ضمان تحديث الترقيم قبل القراءة
    refreshAll();

    // معرف تسلسلي لكل بند مصحح؛ لا علاقة له بالرقم المعروض
    let nextId = 0;

    return groupElements.map(function (groupElement, groupIndex) {

        const type = groupElement.dataset.type;
        const number = groupIndex + 1;
        const ordinal = groupOrdinalName(number);

        function requireGroup(condition, message, field) {

            if (!condition) {
                throw new WorksheetError(
                    ordinal + ": " + message,
                    groupElement,
                    field || null
                );
            }
        }

        const group = {
            id: groupElement.dataset.uid,
            number: number,
            ordinal: ordinal,
            type: type,
            typeName: GROUP_TYPE_NAMES[type],
            title: groupElement
                .querySelector(".group-title-input")
                .value.trim(),
            score: 0,
            items: []
        };

        if (type === "passage") {

            // الحفاظ على الفقرات والأسطر، وحذف الأسطر الفارغة في الطرفين فقط
            const textField =
                groupElement.querySelector(".passage-text-input");

            const text = textField.value
                .replace(/^(?:[ \t]*\r?\n)+/, "")
                .trimEnd();

            const upload =
                groupElement.querySelector(".passage-image-upload");

            requireGroup(text.trim(), "يرجى كتابة نص القطعة.", textField);

            requireGroup(
                !upload.dataset.pending,
                "انتظر حتى يكتمل تحميل صورة القطعة.",
                upload
            );

            group.passage = {
                title: groupElement
                    .querySelector(".passage-title-input")
                    .value.trim(),
                text: text,
                direction:
                    groupElement.querySelector(".passage-direction").value,
                image: upload.dataset.image || ""
            };
        }

        const cards = [
            ...getSubquestionHost(groupElement)
                .querySelectorAll(":scope > .question-card")
        ];

        requireGroup(
            cards.length > 0,
            type === "passage"
                ? "يرجى إضافة سؤال واحد على الأقل لهذه القطعة."
                : "يرجى إضافة سؤال فرعي واحد على الأقل.",
            groupElement.querySelector(".js-add-sub")
        );

        cards.forEach(function (card) {

            const label = card.dataset.label || "";

            const prefix = label
                ? "السؤال " + label
                : ordinal;

            const item = collectItem(card, nextId++, label, prefix);

            group.items.push(item);

            // مجموع المجموعة = مجموع درجات بنودها المصححة مرة واحدة فقط
            group.score += item.score;
        });

        return group;
    });
}

function tryCollectWorksheet() {

    clearValidationMarks();

    try {

        return collectWorksheet();

    } catch (error) {

        if (error instanceof WorksheetError) {

            showValidationError(error);

        } else {

            console.error(error);

            showValidationMessage(error.message);
        }

        return null;
    }
}

// ==========================================
// شاشة بداية التدريب
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
// ملخص شاشة البداية
// ==========================================

function prepareWelcomeSummary(root, groups) {

    const items = flattenItems(groups);

    const units = items.reduce(
        (sum, item) => sum + countUnits(item),
        0
    );

    const totalScore = items.reduce(
        (sum, item) => sum + item.score,
        0
    );

    root.querySelector("#welcomeQuestionCount").textContent =
        "الأسئلة الرئيسية: " + groups.length +
        " • البنود المصححة: " + units +
        " • الدرجة الكلية: " + formatNumber(totalScore);

    const typesElement = root.querySelector("#welcomeQuestionTypes");

    typesElement.innerHTML = "";

    const names = [];

    groups.forEach(function (group) {

        names.push(group.typeName);

        if (group.type === "passage") {

            group.items.forEach(function (item) {
                names.push(GROUP_TYPE_NAMES[item.type]);
            });
        }
    });

    [...new Set(names.filter(Boolean))].forEach(function (name) {

        const badge = document.createElement("span");

        badge.className = "welcome-type-badge";
        badge.textContent = name;

        typesElement.appendChild(badge);
    });
}

// ==========================================
// زر المعاينة
// ==========================================

function validateWorksheetHeader() {

    const subject = document.getElementById("subject")
        .value.trim();

    const lesson = document.getElementById("lesson")
        .value.trim();

    if (!subject) {

        alert("يرجى كتابة اسم المادة.");

        document.getElementById("subject").focus();

        return null;
    }

    if (!lesson) {

        alert("يرجى كتابة عنوان الدرس.");

        document.getElementById("lesson").focus();

        return null;
    }

    if (coverPending) {

        alert("انتظر حتى يكتمل تحميل صورة الغلاف.");

        return null;
    }

    return {
        subject: subject,
        lesson: lesson,
        instructions:
            document.getElementById("instructions").value.trim() ||
            "اقرأ الأسئلة جيدًا ثم أجب عنها."
    };
}

previewWorksheetBtn.addEventListener("click", function () {

    const header = validateWorksheetHeader();

    if (!header) return;

    const groups = tryCollectWorksheet();

    if (!groups) return;

    setWorksheetData(groups);

    document.getElementById("previewSubject").textContent =
        header.subject;

    document.getElementById("previewLesson").textContent =
        header.lesson;

    document.getElementById("previewInstructions").textContent =
        header.instructions;

    document.getElementById("studentCoverImage").src =
        worksheetCoverData || "assets/logo.png";

    prepareWelcomeSummary(studentPreview, groups);

    studentWelcome.hidden = false;
    studentTraining.hidden = true;

    teacherEditor.hidden = true;
    studentPreview.hidden = false;

    document.body.classList.add("student-mode");

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
// العودة إلى محرر المعلم
// ==========================================

backToEditorBtn.addEventListener("click", function () {

    clearMatchingObservers();

    studentPreview.hidden = true;
    teacherEditor.hidden = false;

    document.body.classList.remove("student-mode");

    // محتوى المحرر لم يُمسح، لذلك تبقى جميع الإدخالات كما هي
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

welcomeBackToEditorBtn.addEventListener("click", function () {

    backToEditorBtn.click();
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
// استخراج كود الطالب من script.js
// الحدود تعتمد على علامتين صريحتين داخل الملف، وتُكتب هنا
// مجزأة حتى لا يطابقها الاستخراج داخل هذه الدالة نفسها.
// ==========================================

function extractStudentCode(originalScript) {

    const startMarker = "// @@STUDENT_CODE" + "_START@@";
    const endMarker = "// @@STUDENT_CODE" + "_END@@";

    const start = originalScript.indexOf(startMarker);
    const end = originalScript.indexOf(endMarker);

    if (start < 0 || end <= start) {
        throw new Error("تعذر تحديد حدود كود الطالب داخل script.js.");
    }

    const code = originalScript.slice(
        start + startMarker.length,
        end
    );

    // التأكد من وجود كل ما تحتاجه ورقة الطالب المصدّرة
    const required = [
        "function escapeHTML(",
        "function shuffleArray(",
        "function assetUrl(",
        "function setWorksheetData(",
        "function renderStudentWorksheet(",
        "function renderWordBank(",
        "function renderMatchingQuestion(",
        "function gradeQuestion(",
        "function showQuestionFeedback(",
        "function showFinalResult(",
        "function celebrateSuccess(",
        "function updateStudentProgress(",
        "checkAnswersBtn.addEventListener(",
        "retryWorksheetBtn.addEventListener("
    ];

    const missing = required.filter(name => !code.includes(name));

    if (missing.length) {
        throw new Error(
            "كود الطالب ناقص: " + missing.join(" ، ")
        );
    }

    return code;
}

async function exportWelcomeWorksheet() {

    const header = validateWorksheetHeader();

    if (!header) return;

    const subject = header.subject;
    const lesson = header.lesson;
    const instructions = header.instructions;

    const questions = tryCollectWorksheet();

    if (!questions) return;

    const groups = questions;

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

        // كود الطالب الكامل: الأدوات والحالة والعرض والتصحيح وبنك الكلمات
        const studentCode = extractStudentCode(originalScript);

        // بيانات ورقة العمل

        const worksheetData = {

            subject: subject,

            lesson: lesson,

            instructions: instructions,

            groups: groups
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
            groups
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

        // حفظ كل صورة مرة واحدة فقط، دون تعديل أي نص كتبه المعلم
        const imagePool = [];
        const imageIds = new Map();

        function poolImage(value) {

            if (!String(value).startsWith("data:image/")) {
                return value;
            }

            if (!imageIds.has(value)) {
                imageIds.set(value, imagePool.length);
                imagePool.push(value);
            }

            return "__RAFEQ_IMAGE_" + imageIds.get(value) + "__";
        }

        // الصور في بيانات الأسئلة والقطع محفوظة تحت المفتاح image
        const pooledWorksheetData = JSON.parse(
            JSON.stringify(worksheetData, (key, value) =>
                key === "image" ? poolImage(value) : value
            )
        );

        const pooledAssets = Object.fromEntries(
            Object.entries(embeddedAssets)
                .map(([name, value]) => [name, poolImage(value)])
        );

        // الصور الثابتة في صفحة الطالب
        exportedPreview
            .querySelectorAll("img[src^='data:image/']")
            .forEach(function (image) {

                const token = poolImage(image.getAttribute("src"));

                image.removeAttribute("src");
                image.setAttribute("data-rafeq-image", token);
            });

        const faviconToken =
            poolImage(embeddedAssets["logo.png"]);

        // JavaScript الخاص بالنسخة المستقلة

        const exportedScript = `

            const worksheetData =
                ${safeExportJSON(pooledWorksheetData)};

            const embeddedAssets =
                ${safeExportJSON(pooledAssets)};

            const imagePool =
                ${safeExportJSON(imagePool)};

            function restoreImage(value) {

                const match =
                    /^__RAFEQ_IMAGE_(\\d+)__$/.exec(value);

                return match ? imagePool[Number(match[1])] : value;
            }

            function restoreImageKeys(node) {

                Object.keys(node).forEach(function (key) {

                    if (key === "image") {
                        node[key] = restoreImage(node[key]);

                    } else if (node[key] && typeof node[key] === "object") {
                        restoreImageKeys(node[key]);
                    }
                });
            }

            restoreImageKeys(worksheetData);

            Object.keys(embeddedAssets).forEach(function (name) {

                embeddedAssets[name] =
                    restoreImage(embeddedAssets[name]);
            });

            document.querySelectorAll("[data-rafeq-image]")
                .forEach(function (element) {

                    element.setAttribute(
                        element.tagName === "LINK" ? "href" : "src",
                        restoreImage(element.dataset.rafeqImage)
                    );
                });

            ${studentCode}

            setWorksheetData(worksheetData.groups);

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

        const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl" spellcheck="false">

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <meta name="theme-color" content="#008000">

    <title>${escapeHTML(subject)} - ${escapeHTML(lesson)} | رفيق 24</title>

    <link rel="icon"
          data-rafeq-image="${faviconToken}">

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

        // تنزيل ورقة العمل

        const blob = new Blob(

            [html],

            {
                type: "text/html;charset=utf-8"
            }
        );

        const sizeMiB = blob.size / (1024 * 1024);

        if (sizeMiB > 20) {

            showExportStatus(
                "حجم الورقة " + sizeMiB.toFixed(2) +
                " MiB. الحد الأقصى 20 MiB. قلل عدد الصور أو حجمها.",
                false
            );

            return;
        }

        showExportStatus(
            "حجم ورقة العمل: " + sizeMiB.toFixed(2) + " MiB"
        );

        if (
            !confirm(
                "حجم ورقة العمل: " + sizeMiB.toFixed(2) +
                " MiB. هل تريد تنزيلها؟"
            )
        ) {
            return;
        }

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
            "✓ تم تجهيز ورقة العمل وبدء تنزيلها بنجاح. الحجم: " +
            sizeMiB.toFixed(2) + " MiB"
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

    exportWelcomeWorksheet
);