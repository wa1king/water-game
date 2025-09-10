document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const levelTitleEl = document.getElementById('level-title');
    const targetVolumeEl = document.getElementById('target-volume');
    const stepsEl = document.getElementById('steps');
    const optimalStepsDisplayEl = document.getElementById('optimal-steps-display');
    const optimalStepsEl = document.getElementById('optimal-steps');
    const cupsContainerEl = document.getElementById('cups-container');
    
    const fillBtn = document.getElementById('fill-btn');
    const emptyBtn = document.getElementById('empty-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    const customCup1Input = document.getElementById('custom-cup1');
    const customCup2Input = document.getElementById('custom-cup2');
    const customTargetInput = document.getElementById('custom-target');
    const startCustomBtn = document.getElementById('start-custom-btn');

    const winModalEl = document.getElementById('win-modal');
    const winTitleEl = document.getElementById('win-title');
    const finalStepsEl = document.getElementById('final-steps');
    const winOptimalStepsEl = document.getElementById('win-optimal-steps');
    const replayBtn = document.getElementById('replay-btn');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const toastEl = document.getElementById('toast');

    // --- Game State ---
    let state = {
        levels: [],
        currentLevelIndex: 0,
        isCustomLevel: false,
        cups: [], // { capacity: number, current: number }[]
        target: 0,
        optimalSteps: 0,
        steps: 0,
        selectedCupIndex: null,
    };

    // --- Main Game Logic ---

    let toastTimer;
    /**
     * Shows a toast notification message.
     * @param {string} message The message to display.
     */
    function showToast(message) {
        clearTimeout(toastTimer);
        toastEl.textContent = message;
        toastEl.classList.add('show');
        toastTimer = setTimeout(() => {
            toastEl.classList.remove('show');
        }, 2000);
    }

    /**
     * Initializes the game
     */
    function init() {
        // Hardcoded level data to avoid fetch issues on file:// protocol
        const levelsData = [
          {
            "level": 1,
            "cups": [5, 3],
            "target": 4,
            "optimalSteps": 6
          },
          {
            "level": 2,
            "cups": [8, 5, 3],
            "target": 7,
            "optimalSteps": 8
          },
          {
            "level": 3,
            "cups": [7, 4],
            "target": 5,
            "optimalSteps": 6
          }
        ];
        state.levels = levelsData;

        // Load progress from localStorage
        const savedLevel = parseInt(localStorage.getItem('waterPourLevel') || '0', 10);
        state.currentLevelIndex = savedLevel < state.levels.length ? savedLevel : 0;

        // Load the initial level
        loadLevel(state.levels[state.currentLevelIndex]);

        // Setup event listeners
        setupEventListeners();
    }

    /**
     * Sets up all the event listeners for the game
     */
    function setupEventListeners() {
        resetBtn.addEventListener('click', () => loadLevel(getCurrentLevelData()));
        fillBtn.addEventListener('click', handleFill);
        emptyBtn.addEventListener('click', handleEmpty);
        
        startCustomBtn.addEventListener('click', handleStartCustomLevel);

        replayBtn.addEventListener('click', () => {
            winModalEl.style.display = 'none';
            loadLevel(getCurrentLevelData());
        });

        nextLevelBtn.addEventListener('click', () => {
            winModalEl.style.display = 'none';
            if (!state.isCustomLevel && state.currentLevelIndex < state.levels.length - 1) {
                state.currentLevelIndex++;
                saveProgress();
                loadLevel(state.levels[state.currentLevelIndex]);
            }
        });

        // Clear default values on focus for custom inputs
        const customInputs = [
            { el: customCup1Input, default: "5" },
            { el: customCup2Input, default: "3" },
            { el: customTargetInput, default: "4" }
        ];

        customInputs.forEach(({ el, def }) => {
            el.addEventListener('focus', () => {
                if (el.value === def) {
                    el.value = '';
                }
            });
            el.addEventListener('blur', () => {
                if (el.value.trim() === '') {
                    el.value = def;
                }
            });
        });
    }

    /**
     * Loads a level and sets up the game state.
     * @param {object} levelData - The data for the level to load.
     */
    function loadLevel(levelData) {
        state.steps = 0;
        state.selectedCupIndex = null;
        state.isCustomLevel = !levelData.level;
        state.target = levelData.target;
        state.cups = levelData.cups.map(capacity => ({ capacity, current: 0 }));
        state.optimalSteps = levelData.optimalSteps || 0;

        levelTitleEl.textContent = state.isCustomLevel ? '自定义挑战' : `第 ${levelData.level} 关`;
        targetVolumeEl.textContent = state.target;
        optimalStepsDisplayEl.style.display = state.isCustomLevel ? 'none' : 'inline';
        optimalStepsEl.textContent = state.optimalSteps;

        cupsContainerEl.innerHTML = '';
        state.cups.forEach((cup, index) => {
            const cupEl = document.createElement('div');
            cupEl.className = 'cup';
            cupEl.dataset.index = index;
            cupEl.addEventListener('click', () => handleCupClick(index));

            const cupBodyEl = document.createElement('div');
            cupBodyEl.className = 'cup-body';

            // Dynamically set width and height based on capacity
            const baseHeight = 80; // px
            const heightFactor = 12; // px per liter
            const baseWidth = 70; // px
            const widthFactor = 6; // px per liter
            cupBodyEl.style.height = `${baseHeight + cup.capacity * heightFactor}px`;
            cupBodyEl.style.width = `${baseWidth + cup.capacity * widthFactor}px`;

            const waterEl = document.createElement('div');
            waterEl.className = 'water';
            cupBodyEl.appendChild(waterEl);

            const labelEl = document.createElement('div');
            labelEl.className = 'cup-label';

            cupEl.appendChild(cupBodyEl);
            cupEl.appendChild(labelEl);
            cupsContainerEl.appendChild(cupEl);
        });

        updateUI();
    }

    /**
     * Updates the entire UI based on the current state.
     */
    function updateUI() {
        stepsEl.textContent = state.steps;

        document.querySelectorAll('.cup').forEach((cupEl, index) => {
            const cupData = state.cups[index];
            const waterEl = cupEl.querySelector('.water');
            const labelEl = cupEl.querySelector('.cup-label');
            
            const waterHeightPercent = cupData.capacity > 0 ? (cupData.current / cupData.capacity) * 100 : 0;
            waterEl.style.height = `${waterHeightPercent}%`;
            labelEl.textContent = `${cupData.current}L / ${cupData.capacity}L`;

            cupEl.classList.toggle('selected', index === state.selectedCupIndex);
        });

        const isCupSelected = state.selectedCupIndex !== null;
        fillBtn.disabled = !isCupSelected;
        emptyBtn.disabled = !isCupSelected;
    }

    /**
     * Handles clicking on a cup for selection or pouring.
     * @param {number} clickedIndex - The index of the clicked cup.
     */
    function handleCupClick(clickedIndex) {
        if (state.selectedCupIndex === null) {
            state.selectedCupIndex = clickedIndex;
        } else if (state.selectedCupIndex === clickedIndex) {
            state.selectedCupIndex = null;
        } else {
            handlePour(state.selectedCupIndex, clickedIndex);
            state.selectedCupIndex = null;
        }
        updateUI();
    }

    /**
     * Handles pouring water from one cup to another.
     * @param {number} fromIndex - The index of the cup to pour from.
     * @param {number} toIndex - The index of the cup to pour to.
     */
    function handlePour(fromIndex, toIndex) {
        const fromCup = state.cups[fromIndex];
        const toCup = state.cups[toIndex];
        
        if (fromCup.current === 0) {
            showToast("源杯子是空的！");
            return;
        }

        const amountToPour = Math.min(fromCup.current, toCup.capacity - toCup.current);

        if (amountToPour === 0) {
            showToast("目标杯子已经满了！");
            return;
        }

        fromCup.current -= amountToPour;
        toCup.current += amountToPour;
        
        state.steps++;
        updateUI();
        checkWinCondition();
    }

    /**
     * Handles filling the selected cup.
     */
    function handleFill() {
        if (state.selectedCupIndex === null) return;
        const cup = state.cups[state.selectedCupIndex];

        if (cup.current === cup.capacity) {
            showToast("杯子已经满了！");
            return;
        }

        cup.current = cup.capacity;
        state.steps++;
        state.selectedCupIndex = null; // Deselect after action
        updateUI();
        checkWinCondition();
    }

    /**
     * Handles emptying the selected cup.
     */
    function handleEmpty() {
        if (state.selectedCupIndex === null) return;
        const cup = state.cups[state.selectedCupIndex];

        if (cup.current === 0) {
            showToast("杯子已经是空的！");
            return;
        }

        cup.current = 0;
        state.steps++;
        state.selectedCupIndex = null; // Deselect after action
        updateUI();
        checkWinCondition();
    }

    /**
     * Handles starting a custom level.
     */
    function handleStartCustomLevel() {
        const cup1 = parseInt(customCup1Input.value, 10);
        const cup2 = parseInt(customCup2Input.value, 10);
        const target = parseInt(customTargetInput.value, 10);

        if (!cup1 || !cup2 || !target || cup1 <= 0 || cup2 <= 0 || target <= 0) {
            alert("请输入有效的正整数作为容量和目标！");
            return;
        }
        if (target > Math.max(cup1, cup2)) {
            alert("目标水量不能大于任何一个杯子的容量！");
            return;
        }

        const customLevelData = {
            cups: [cup1, cup2],
            target: target,
        };
        loadLevel(customLevelData);
    }

    /**
     * Checks if the win condition is met and shows the modal if it is.
     */
    function checkWinCondition() {
        if (state.cups.some(cup => cup.current === state.target)) {
            setTimeout(showWinModal, 500); // Delay for visual effect
        }
    }

    /**
     * Shows the win modal with appropriate information.
     */
    function showWinModal() {
        finalStepsEl.textContent = state.steps;
        
        if (state.isCustomLevel) {
            winTitleEl.textContent = "挑战成功!";
            winOptimalStepsEl.textContent = "";
        } else {
            winTitleEl.textContent = "胜利!";
            winOptimalStepsEl.textContent = `最佳步数为: ${state.optimalSteps} 步。`;
        }

        const isLastLevel = state.currentLevelIndex === state.levels.length - 1;
        nextLevelBtn.disabled = state.isCustomLevel || isLastLevel;
        if (isLastLevel && !state.isCustomLevel) {
            winTitleEl.textContent = "恭喜通关!";
        }

        winModalEl.style.display = 'flex';
    }
    
    /**
     * Gets the data for the current level (standard or custom)
     */
    function getCurrentLevelData() {
        if (state.isCustomLevel) {
            return {
                cups: state.cups.map(c => c.capacity),
                target: state.target,
            };
        }
        return state.levels[state.currentLevelIndex];
    }

    /**
     * Saves the current level index to localStorage
     */
    function saveProgress() {
        if (!state.isCustomLevel) {
            localStorage.setItem('waterPourLevel', state.currentLevelIndex);
        }
    }

    // --- Start the game ---
    init();
});