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
    document.getElementById("nav-telegram").addEventListener("click", () => showScreen("telegram"));
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

    // ===== CABEÇALHO DA FASE COM ÍCONE MODERNO =====
    const phaseHeader = document.createElement("div");
    phaseHeader.className = "phase-header";

    const isImageUrl = /\.(png|jpg|jpeg|gif|svg)$/i.test(currentPhase.icon);
    phaseHeader.innerHTML = `
        <div class="phase-icon">
            ${isImageUrl
                ? `<img src="${currentPhase.icon}" alt="${currentPhase.name}" class="city-icon-img">`
                : `<span class="city-icon-emoji">${currentPhase.icon || "📍"}</span>`}
        </div>
        <div class="phase-info">
            <div class="phase-name">${currentPhase.name}</div>
            <div class="phase-progress">
                ${gameState.completedBlocks.filter(cb => cb.phaseId === currentPhase.id).length}/${currentPhase.blocks.length} lições completas
            </div>
        </div>
    `;
    phaseCard.appendChild(phaseHeader);

    // ===== BLOCO DE LIÇÕES =====
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
    <div class="block-icon">
        ${
            isCompleted
                ? '<i class="fa-solid fa-circle-check"></i>'
                : isLocked
                    ? '<i class="fa-solid fa-lock"></i>'
                    : '<i class="fa-solid fa-book-open"></i>'
        }
    </div>
    <div class="block-title">Lição ${block.id}</div>
`;

        if (!isLocked) blockCard.addEventListener("click", () => startBlock(currentPhase.id, block.id));
        blocksGrid.appendChild(blockCard);
    });

    phaseCard.appendChild(blocksGrid);
    container.appendChild(phaseCard);
    renderCitiesModal();
}

// ===== MODAL DE CIDADES =====
function renderCitiesModal() {
    const listContainer = document.getElementById("cities-list");
    listContainer.innerHTML = "";

    journeyData.forEach(phase => {
        const completedBlocks = gameState.completedBlocks.filter(cb => cb.phaseId === phase.id).length;
        const isPhaseCompleted = completedBlocks === phase.blocks.length;

        // Detecta se o ícone é uma imagem (local ou URL)
        const isImageUrl = /\.(png|jpg|jpeg|gif|svg)$/i.test(phase.icon);

        const cityItem = document.createElement("div");
        cityItem.className = "city-item" + (phase.id === gameState.currentPhase ? " active" : "");

        cityItem.innerHTML = `
            <div class="city-icon-wrapper">
                ${isPhaseCompleted
                    ? `<span class="city-trophy">🏆</span>`
                    : isImageUrl
                        ? `<img src="${phase.icon}" alt="${phase.name}" class="city-icon-img">`
                        : `<span class="city-icon-emoji">${phase.icon || "📍"}</span>`}
            </div>
            <span class="city-name">${phase.name}</span>
            <span class="city-progress">${completedBlocks}/${phase.blocks.length}</span>
        `;

        listContainer.appendChild(cityItem);
    });
}

// ===== ABRIR E FECHAR MODAL =====
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
    const correctAnswers = currentQuiz.correctAnswers;
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    // ===== Lógica de XP baseada no número de acertos (20 XP por acerto) =====
    let xpEarned = 0;
    
    // Assumindo que totalQuestions é 5, como nos seus exemplos (100xp para 5/5, 80xp para 4/5, etc.)
    // Se o número de perguntas for variável, o cálculo abaixo se adapta:
    // xpEarned = Math.floor((correctAnswers / totalQuestions) * 100); // Ex: 100% -> 100 XP. 80% -> 80 XP.
    
    // Se você quer a regra exata (20 XP por acerto, apenas para 5 perguntas):
    if (totalQuestions === 5) {
        xpEarned = correctAnswers * 20; // 5*20=100, 4*20=80, 3*20=60, etc.
    } else {
        // Lógica de fallback se o número de perguntas não for 5
        // Exemplo: 10 XP fixo por bloco (como estava antes) ou baseado em porcentagem
        xpEarned = Math.floor((correctAnswers / totalQuestions) * 100) > 0 ? 10 : 0; // Se acertar algo, ganha 10 XP
    }
    // =========================================================================

    if (!gameState.completedBlocks.some(cb => cb.phaseId === currentQuiz.phaseId && cb.blockId === currentQuiz.blockId)) {
        gameState.completedBlocks.push({ phaseId: currentQuiz.phaseId, blockId: currentQuiz.blockId });
        
        // AQUI ESTÁ A MUDANÇA: Usando xpEarned
        gameState.xp += xpEarned; 
        
        incrementStreak();
        saveGameState();
    }

    container.innerHTML = `
        <div class="quiz-results">
            <h2>🎉 Lição Completa!</h2>
            <p>Você acertou ${correctAnswers} de ${totalQuestions} perguntas.</p>
            <p>Pontuação: ${score}%</p>
            <p>+${xpEarned} XP</p>
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
document.addEventListener("DOMContentLoaded", () => {
  const studiesContainer = document.getElementById("studies-container");
  const searchInput = document.getElementById("search-studies");
  const modal = document.getElementById("study-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalContent = document.getElementById("modal-content-text");
  const closeModal = document.getElementById("close-study");

  // Evita erro se a tela de estudos não estiver ativa ainda
  if (!studiesContainer) return;

  let estudos = [];

  async function carregarEstudos() {
    try {
      const res = await fetch("data/estudos/index.json");
      const indexData = await res.json();

      estudos = [];

      for (const arquivo of indexData.estudos) {
        const estRes = await fetch(`data/estudos/${arquivo}`);
        const estudo = await estRes.json();
        estudos.push(estudo);
      }

      renderizarEstudos(estudos);
    } catch (error) {
      console.error("Erro ao carregar estudos:", error);
      studiesContainer.innerHTML = "<p>Erro ao carregar os estudos.</p>";
    }
  }

  function renderizarEstudos(lista) {
    studiesContainer.innerHTML = "";
    lista.forEach(estudo => {
      const card = document.createElement("div");
      card.classList.add("study-card");
      card.innerHTML = `
        <h2>${estudo.titulo}</h2>
        <p>${estudo.descricao}</p>
      `;
      card.addEventListener("click", () => abrirEstudo(estudo));
      studiesContainer.appendChild(card);
    });
  }

  function abrirEstudo(estudo) {
    modalTitle.textContent = estudo.titulo;
    modalContent.innerHTML = estudo.conteudo;
    modal.classList.remove("hidden");
  }

  closeModal.addEventListener("click", () => modal.classList.add("hidden"));

  if (searchInput) {
    searchInput.addEventListener("input", e => {
      const termo = e.target.value.toLowerCase();
      const filtrados = estudos.filter(e =>
        e.titulo.toLowerCase().includes(termo) ||
        e.descricao.toLowerCase().includes(termo)
      );
      renderizarEstudos(filtrados);
    });
  }

  carregarEstudos();
});

