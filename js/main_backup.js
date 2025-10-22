// ===== ESTADO DO JOGO =====
let gameState = {
    streak: 0,
    xp: 0,
    level: 1,
    currentPhase: 1,
    currentBlock: 1,
    completedBlocks: [], // Array de objetos: {phaseId, blockId}
    lastPlayDate: null,
    missions: [],
};

// ===== QUIZ =====
let currentQuiz = {
    phaseId: null,
    blockId: null,
    questions: [],
    originalQuestions: [],
    currentQuestionIndex: 0,
    correctAnswers: 0,
    wrongQuestions: [],
    isReview: false
};

// ===== INICIALIZAÇÃO =====
document.addEventListener("DOMContentLoaded", () => {
    loadGameState();
    initializeApp();
});

function initializeApp() {
    updateStreak();
    initializeMissions();
    renderJourney();
    updateUI();
    setupEventListeners();
}

// ===== EVENTOS =====
function setupEventListeners() {
    document.getElementById("nav-journey").addEventListener("click", () => showScreen("journey"));
    document.getElementById("nav-missions").addEventListener("click", () => showScreen("missions"));
    document.getElementById("nav-studies").addEventListener("click", () => showScreen("studies"));
    document.getElementById("nav-profile").addEventListener("click", () => showScreen("profile"));

    document.getElementById("city-card").addEventListener("click", openCitiesModal);
    document.getElementById("close-modal").addEventListener("click", closeCitiesModal);
    document.getElementById("cities-modal").addEventListener("click", (e) => {
        if (e.target.id === "cities-modal") closeCitiesModal();
    });

    const btnReset = document.getElementById("btn-reset");
    const btnLogout = document.getElementById("btn-logout");
    if (btnReset) btnReset.addEventListener("click", resetJourney);
    if (btnLogout) btnLogout.addEventListener("click", logout);
}

// ===== TROCA DE TELAS =====
function showScreen(screenName) {
    document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
    document.getElementById(`screen-${screenName}`).classList.add("active");

    if (screenName !== "quiz") {
        document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
        const navItem = document.getElementById(`nav-${screenName}`);
        if (navItem) navItem.classList.add("active");
    }

    if (screenName === "journey") renderJourney();
    else if (screenName === "missions") renderMissions();
    else if (screenName === "studies") renderStudies();
    else if (screenName === "profile") renderProfile();
}

// ===== SISTEMA DE STREAK =====
function updateStreak() {
    const today = new Date().toDateString();
    const lastPlay = gameState.lastPlayDate ? new Date(gameState.lastPlayDate).toDateString() : null;

    if (lastPlay !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastPlay === yesterdayStr) {
            // mantém streak
        } else if (lastPlay !== null) {
            gameState.streak = 0;
        }
    }
}

function incrementStreak() {
    const today = new Date().toDateString();
    const lastPlay = gameState.lastPlayDate ? new Date(gameState.lastPlayDate).toDateString() : null;

    if (lastPlay !== today) {
        gameState.streak++;
        gameState.lastPlayDate = Date.now();
        saveGameState();
        updateUI();
    }
}

// ===== RENDERIZAÇÃO DA JORNADA =====
function renderJourney() {
    const container = document.getElementById("journey-container");
    const cityNameElement = document.getElementById("city-name");

    if (!journeyData || journeyData.length === 0) {
        container.innerHTML = "<p>Nenhuma jornada disponível.</p>";
        return;
    }

    let currentPhaseIndex = 0;
    for (let i = 0; i < journeyData.length; i++) {
        const phase = journeyData[i];
        const completedBlocksInPhase = gameState.completedBlocks.filter(cb => cb.phaseId === phase.id).length;

        if (completedBlocksInPhase < phase.blocks.length) {
            currentPhaseIndex = i;
            break;
        }
        if (i === journeyData.length - 1) currentPhaseIndex = i;
    }

    const currentPhase = journeyData[currentPhaseIndex];
    gameState.currentPhase = currentPhase.id;
    cityNameElement.textContent = currentPhase.name;

    container.innerHTML = "";
    const phaseCard = document.createElement("div");
    phaseCard.className = "phase-card";

    const phaseHeader = document.createElement("div");
    phaseHeader.className = "phase-header";
    phaseHeader.innerHTML = `
        <div class="phase-icon">${currentPhase.icon}</div>
        <div class="phase-info">
            <div class="phase-name">${currentPhase.name}</div>
            <div class="phase-progress">
                ${gameState.completedBlocks.filter(cb => cb.phaseId === currentPhase.id).length}/${currentPhase.blocks.length} lições completas
            </div>
        </div>
    `;
    phaseCard.appendChild(phaseHeader);

    const blocksGrid = document.createElement("div");
    blocksGrid.className = "blocks-grid";

    currentPhase.blocks.forEach((block, index) => {
        const blockCard = document.createElement("div");
        blockCard.className = "block-card";

        const isCompleted = gameState.completedBlocks.some(cb => cb.phaseId === currentPhase.id && cb.blockId === block.id);
        const isLocked = index > 0 && !gameState.completedBlocks.some(cb => cb.phaseId === currentPhase.id && cb.blockId === currentPhase.blocks[index - 1].id);

        if (isCompleted) blockCard.classList.add("completed");
        else if (isLocked) blockCard.classList.add("locked");
        else blockCard.classList.add("current");

        blockCard.innerHTML = `
            <div class="block-icon">${isCompleted ? "✅" : isLocked ? "🔒" : "📖"}</div>
            <div class="block-title">Lição ${block.id}</div>
        `;

        if (!isLocked) blockCard.addEventListener("click", () => startBlock(currentPhase.id, block.id));
        blocksGrid.appendChild(blockCard);
    });

    phaseCard.appendChild(blocksGrid);
    container.appendChild(phaseCard);
    renderCitiesModal();
}

function renderCitiesModal() {
    const listContainer = document.getElementById("cities-list");
    listContainer.innerHTML = "";

    journeyData.forEach(phase => {
        const completedBlocks = gameState.completedBlocks.filter(cb => cb.phaseId === phase.id).length;
        const isPhaseCompleted = completedBlocks === phase.blocks.length;
        const cityItem = document.createElement("div");
        cityItem.className = "city-item" + (phase.id === gameState.currentPhase ? " active" : "");
        cityItem.innerHTML = `
            <span class="city-icon">${isPhaseCompleted ? "🏆" : phase.icon}</span>
            <span class="city-name">${phase.name}</span>
            <span class="city-progress">${completedBlocks}/${phase.blocks.length}</span>
        `;
        listContainer.appendChild(cityItem);
    });
}

function openCitiesModal() {
    document.getElementById("cities-modal").classList.remove("hidden");
}

function closeCitiesModal() {
    document.getElementById("cities-modal").classList.add("hidden");
}

// ===== QUIZ =====
function startBlock(phaseId, blockId) {
    const phase = journeyData.find(p => p.id === phaseId);
    const block = phase.blocks.find(b => b.id === blockId);

    currentQuiz = {
        phaseId,
        blockId,
        questions: [...block.questions],
        originalQuestions: [...block.questions],
        currentQuestionIndex: 0,
        correctAnswers: 0,
        wrongQuestions: [],
        isReview: false
    };

    startQuiz();
}

function startQuiz() {
    showScreen("quiz");
    renderQuestion();
}

function renderQuestion() {
    const container = document.getElementById("quiz-container");

    if (currentQuiz.currentQuestionIndex >= currentQuiz.questions.length) {
        if (currentQuiz.wrongQuestions.length > 0) {
            currentQuiz.questions = [...currentQuiz.wrongQuestions];
            currentQuiz.wrongQuestions = [];
            currentQuiz.currentQuestionIndex = 0;
            currentQuiz.isReview = true;
            renderQuestion();
            return;
        } else {
            showQuizResults();
            return;
        }
    }

    const question = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    const phase = journeyData.find(p => p.id === currentQuiz.phaseId);
    const block = phase.blocks.find(b => b.id === currentQuiz.blockId);
    const progressText = currentQuiz.isReview
        ? `Revisando pergunta ${currentQuiz.currentQuestionIndex + 1} de ${currentQuiz.questions.length}`
        : `Pergunta ${currentQuiz.currentQuestionIndex + 1} de ${currentQuiz.originalQuestions.length}`;

    container.innerHTML = `
        <div class="quiz-header">
            <h2>${phase.name} - Lição ${block.id}</h2>
            <p class="quiz-progress">${progressText}</p>
        </div>
        <div class="quiz-question"><h3>${question.question}</h3></div>
        <div class="quiz-options">
            ${question.options.map((option, index) => `
                <button class="quiz-option" data-index="${index}" onclick="checkAnswer(${index})">${option}</button>
            `).join("")}
        </div>
        <div class="quiz-feedback" id="quiz-feedback"></div>
    `;
}

function checkAnswer(selectedIndex) {
    const question = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    const isCorrect = selectedIndex === question.correct;
    document.querySelectorAll(".quiz-option").forEach(btn => btn.disabled = true);

    const selectedButton = document.querySelector(`.quiz-option[data-index="${selectedIndex}"]`);
    const correctButton = document.querySelector(`.quiz-option[data-index="${question.correct}"]`);

    if (isCorrect) {
        selectedButton.classList.add("correct");
        if (!currentQuiz.isReview) currentQuiz.correctAnswers++;
    } else {
        selectedButton.classList.add("incorrect");
        if (correctButton) correctButton.classList.add("correct");
        if (!currentQuiz.wrongQuestions.some(q => q.question === question.question)) {
            currentQuiz.wrongQuestions.push(question);
        }
    }

    document.getElementById("quiz-feedback").innerHTML = `
        <div class="feedback ${isCorrect ? "correct" : "incorrect"}">
            <p><strong>${isCorrect ? "✅ Correto!" : "❌ Incorreto!"}</strong></p>
            <p class="explanation">${question.explanation}</p>
            <button class="btn-next" onclick="handleNextQuestion()">Próxima Pergunta</button>
        </div>
    `;
}

function handleNextQuestion() {
    document.getElementById("quiz-feedback").innerHTML = "";
    currentQuiz.currentQuestionIndex++;
    renderQuestion();
    }
    
function showQuizResults() {
    const container = document.getElementById("quiz-container");
    const phase = journeyData.find(p => p.id === currentQuiz.phaseId);
    const block = phase.blocks.find(b => b.id === currentQuiz.blockId);

    const totalQuestions = currentQuiz.originalQuestions.length;
    const score = Math.round((currentQuiz.correctAnswers / totalQuestions) * 100);

    if (!gameState.completedBlocks.some(cb => cb.phaseId === currentQuiz.phaseId && cb.blockId === currentQuiz.blockId)) {
        gameState.completedBlocks.push({ phaseId: currentQuiz.phaseId, blockId: currentQuiz.blockId });
        gameState.xp += 10;
        incrementStreak();
        saveGameState();
    }

    container.innerHTML = `
        <div class="quiz-results">
            <h2>🎉 Lição Completa!</h2>
            <p>Você acertou ${currentQuiz.correctAnswers} de ${totalQuestions} perguntas.</p>
            <p>Pontuação: ${score}%</p>
            <p>+10 XP</p>
            <button class="btn-primary" onclick="returnToJourney()">Voltar à Jornada</button>
        </div>
    `;
}

function returnToJourney() {
    showScreen("journey");
}

// ===== MISSÕES =====
function initializeMissions() {
    if (gameState.missions.length === 0) {
        gameState.missions = [
            { id: 1, name: "Responda 3 perguntas certas hoje", target: 3, progress: 0, reward: 10, completed: false },
            { id: 2, name: "Complete 1 lição", target: 1, progress: 0, reward: 15, completed: false },
            { id: 3, name: "Mantenha 3 dias seguidos", target: 3, progress: 0, reward: 20, completed: false }
        ];
        saveGameState();
    }
}

function renderMissions() {
    const container = document.getElementById("missions-container");
    container.innerHTML = gameState.missions.map(mission => `
        <div class="mission-card ${mission.completed ? "completed" : ""}">
            <h3>${mission.name}</h3>
            <div class="mission-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(mission.progress / mission.target) * 100}%"></div>
                </div>
                <span>${mission.progress}/${mission.target}</span>
            </div>
            <p class="mission-reward">Recompensa: +${mission.reward} XP</p>
        </div>
    `).join("");
}

// ===== PERFIL =====
function renderProfile() {
    const container = document.getElementById("profile-container");
    container.innerHTML = `
        <div class="profile-content">
            <div class="profile-avatar">👤</div>
            <h2>Usuário</h2>
            <div class="profile-stats">
                <div class="stat-item"><span class="stat-label">Nível</span><span class="stat-value">${gameState.level}</span></div>
                <div class="stat-item"><span class="stat-label">XP Total</span><span class="stat-value">${gameState.xp}</span></div>
                <div class="stat-item"><span class="stat-label">Dias Seguidos</span><span class="stat-value">${gameState.streak}</span></div>
            </div>
            <div class="profile-actions">
                <button class="btn-secondary" id="btn-reset">Reiniciar Jornada</button>
                <button class="btn-secondary" id="btn-logout">Sair</button>
            </div>
        </div>
    `;
    document.getElementById("btn-reset").addEventListener("click", resetJourney);
    document.getElementById("btn-logout").addEventListener("click", logout);
}

// ===== SALVAR / CARREGAR =====
function saveGameState() {
    localStorage.setItem("biblicalJourneyGameState", JSON.stringify(gameState));
}

function loadGameState() {
    const saved = localStorage.getItem("biblicalJourneyGameState");
    if (saved) gameState = { ...gameState, ...JSON.parse(saved) };
}

function resetJourney() {
    if (confirm("Tem certeza que deseja reiniciar sua jornada?")) {
        localStorage.removeItem("biblicalJourneyGameState");
        location.reload();
    }
}

function logout() {
    if (confirm("Deseja sair?")) alert("Logout realizado com sucesso!");
}

// ===== UI =====
function updateUI() {
    const streakElement = document.getElementById("streak-count");
    if (streakElement) streakElement.textContent = gameState.streak;
}
