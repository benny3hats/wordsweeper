document.addEventListener("DOMContentLoaded", () => {
  // Define difficulty settings.
  const difficulties = {
    easy: {
      gridSize: 5,
      wordLength: 5,
      containerSize: 400, // in pixels
      secretWords: [
        "WORDS", "GAMES", "PLAYS", "HEROE", "TIMES", "LIFES", "WINDS", "STARS",
        "LOVES", "FIRES", "SOULS", "BIRDS", "TREES", "WAVES", "NOTES", "BOOKS",
        "RAINS", "HOPES", "GOLDS", "BLUES"
      ]
    },
    medium: {
      gridSize: 8,
      wordLength: 6,
      containerSize: 480,
      secretWords: [
        "TABLES", "CHAIRS", "PLANET", "WINDOW", "GARDEN", "FRIEND", "FAMILY", "DOCTOR",
        "FLOWER", "MARKET", "BOTTLE", "CANDLE", "STREET", "SILVER", "ORANGE", "PURPLE",
        "YELLOW", "WINTER", "SUMMER", "SPRING"
      ]
    },
    hard: {
      gridSize: 12,
      wordLength: 8,
      containerSize: 600,
      secretWords: [
        "ELEPHANT", "COMPUTER", "NOTEBOOK", "SCISSORS", "BICYCLES", "HOSPITAL", "BASEBALL", "TREASURE",
        "MONSTERS", "MOUNTAIN", "SUNSHINE", "DIAMONDS", "SPACETIME", "DYNAMITE", "CROCODIL", "AIRPLANE",
        "MAGNETIC", "CAMPFIRE", "MOONDUST", "SKYLINES"
      ]
    }
  };

  // Default difficulty is easy.
  let currentDifficulty = "easy";

  // Global configuration.
  const config = {
    guessLimit: 3,
    clueDensityThreshold: 0.4,
    maxRegenerationAttempts: 10,
    letterFrequencies: {
      A: 8.17, B: 1.49, C: 2.78, D: 4.25, E: 12.70,
      F: 2.23, G: 2.02, H: 6.09, I: 6.97, J: 0.15,
      K: 0.77, L: 4.03, M: 2.41, N: 6.75, O: 7.51,
      P: 1.93, Q: 0.10, R: 5.99, S: 6.33, T: 9.06,
      U: 2.76, V: 0.98, W: 2.36, X: 0.15, Y: 1.97,
      Z: 0.07
    },
    secretLetterFactor: 1.5
  };

  // Walkthrough steps.
  const walkthroughSteps = [
    {
      title: "Welcome to Wordsweeper",
      content: "Your mission is to decipher the grid of letters and guess the secret word hidden within.",
      image: "https://raw.githubusercontent.com/benny3hats/wordsweeper/57327b6f20d89511e222f28050d3052c6b99efb5/Step1.svg"
    },
    {
      title: "The Grid & Tiles",
      content: "Each tile shows a letter and a number. The number tells you how many of the eight surrounding tiles contain a letter from the secret word.",
      image: "https://raw.githubusercontent.com/benny3hats/wordsweeper/57327b6f20d89511e222f28050d3052c6b99efb5/Step2.svg"
    },
    {
      title: "Marking Tiles",
      content: "Right-click a tile to mark its letter red if you believe it is NOT in the secret word. Left-click a tile to mark it green if you think it IS part of the secret word. On mobile, tap to mark green; press and hold to mark red.",
      image: "https://raw.githubusercontent.com/benny3hats/wordsweeper/57327b6f20d89511e222f28050d3052c6b99efb5/Step3.svg"
    },
    {
      title: "Secret Word Display",
      content: "At any point you can guess the secret word below. After each guess, any correct letters in the right position are revealed.",
      image: "https://raw.githubusercontent.com/benny3hats/wordsweeper/57327b6f20d89511e222f28050d3052c6b99efb5/Step4.svg"
    },
    {
      title: "Game Rules",
      content: "You have 3 attempts to guess the secret word. Use the clues provided by the numbers on the tiles and your marked letters to deduce the word. And remember, time is ticking!"
    },
    {
      title: "Ready to Play?",
      content: "When you're ready, click 'Start Game' to begin your challenge. You can also change the difficulty using the selector above the grid. Good luck!"
    }
  ];
  let currentStep = 0;

  // Game state variables.
  let grid = [];
  let deducedLetters = new Set();
  let eliminatedLetters = new Set();
  let guessesRemaining = config.guessLimit;
  let gameOver = false;
  let timerInterval = null;
  let startTime = null;
  let wrongGuesses = [];
  let secretWord = "";
  let revealedPositions = [];

  // Pre-load an easy grid on first load.
  window.addEventListener("load", () => {
    const diffConfig = difficulties["easy"];
    const gridContainer = document.getElementById("grid-container");
    gridContainer.style.width = diffConfig.containerSize + "px";
    gridContainer.style.height = diffConfig.containerSize + "px";
    document.getElementById("grid").style.setProperty("--grid-size", diffConfig.gridSize);
    generateGrid(diffConfig.gridSize);
  });

  // Difficulty selector event.
  const difficultySelect = document.getElementById("difficulty");
  difficultySelect.addEventListener("change", (e) => {
    currentDifficulty = e.target.value;
    resetSecretWordDisplay();
    startCountdown();
  });

  function resetSecretWordDisplay() {
    const diffConfig = difficulties[currentDifficulty];
    document.getElementById("secret-word-display").innerHTML =
      `<strong>Secret Word:</strong> <span id="word-hangman">${"_ ".repeat(diffConfig.wordLength).trim()}</span>`;
  }

  // Check for at least one corner clue (0 or 3) in easy mode.
  function easyCornerClueExists() {
    if (currentDifficulty !== "easy") return true;
    const gridSize = difficulties["easy"].gridSize;
    const corners = [
      grid[0][0],
      grid[0][gridSize - 1],
      grid[gridSize - 1][0],
      grid[gridSize - 1][gridSize - 1]
    ];
    return corners.some(tile => tile.number === 0 || tile.number === 3);
  }

  // Countdown overlay logic.
  function startCountdown() {
    const countdownOverlay = document.getElementById("countdown-overlay");
    const countdownNumber = document.getElementById("countdown-number");
    countdownOverlay.style.display = "flex";
    let count = 3;
    countdownNumber.textContent = count;
    const countdownSound = document.getElementById("countdown-sound");
    // Play the countdown sound immediately when the countdown starts.
    if (countdownSound) {
      countdownSound.currentTime = 0;
      countdownSound.play();
    }
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownNumber.textContent = count;
        if (countdownSound) {
          countdownSound.play();
        }
      } else {
        countdownNumber.textContent = "GO!";
        clearInterval(interval);
        setTimeout(() => {
          countdownOverlay.style.display = "none";
          startGame();
        }, 500);
      }
    }, 1000);
  }

  // Start game using current difficulty.
  function startGame() {
    const diffConfig = difficulties[currentDifficulty];
    secretWord = diffConfig.secretWords[Math.floor(Math.random() * diffConfig.secretWords.length)];
    secretWord = secretWord.substring(0, diffConfig.wordLength).toUpperCase();
    guessesRemaining = config.guessLimit;
    deducedLetters.clear();
    eliminatedLetters.clear();
    wrongGuesses = [];
    gameOver = false;
    revealedPositions = new Array(secretWord.length).fill(false);
    updateSecretWordDisplay();
    updateSelectedLetters();
    updateGuessesRemaining();
    updateWrongGuesses();
    document.getElementById("message").textContent = "";
    document.getElementById("wordGuess").disabled = false;
    document.getElementById("start-overlay").style.display = "none";
    document.getElementById("result-overlay").style.display = "none";
    // Set grid container size.
    const gridContainer = document.getElementById("grid-container");
    gridContainer.style.width = diffConfig.containerSize + "px";
    gridContainer.style.height = diffConfig.containerSize + "px";
    document.getElementById("grid").style.setProperty("--grid-size", diffConfig.gridSize);
    let attempts = 0;
    do {
      generateGrid(diffConfig.gridSize);
      attempts++;
    } while (!easyCornerClueExists() && currentDifficulty === "easy" && attempts < config.maxRegenerationAttempts);
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("time-elapsed").textContent = elapsed;
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  // --------------------
  // GRID GENERATION LOGIC
  // --------------------
  function generateGrid(gridSize) {
    let attempts = 0;
    do {
      grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(""));
      placeSecretWord(gridSize);
      fillRandomLetters(gridSize);
      assignNumbers(gridSize);
      attempts++;
    } while (!isGridBalanced(gridSize) && attempts < config.maxRegenerationAttempts);
    drawGrid();
  }

  function placeSecretWord(gridSize) {
    const diffConfig = difficulties[currentDifficulty];
    const horizontal = Math.random() > 0.5;
    let startX, startY;
    if (horizontal) {
      startX = Math.floor(Math.random() * (gridSize - diffConfig.wordLength));
      startY = Math.floor(Math.random() * gridSize);
    } else {
      startX = Math.floor(Math.random() * gridSize);
      startY = Math.floor(Math.random() * (gridSize - diffConfig.wordLength));
    }
    for (let i = 0; i < diffConfig.wordLength; i++) {
      const x = horizontal ? startX + i : startX;
      const y = horizontal ? startY : startY + i;
      grid[y][x] = secretWord[i];
    }
  }

  function fillRandomLetters(gridSize) {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!grid[y][x]) {
          let possibleLetters = [];
          for (let i = 0; i < 26; i++) {
            const letter = String.fromCharCode(65 + i);
            if (secretWord.includes(letter)) {
              possibleLetters.push(letter);
            } else {
              if (!getAdjacentTiles(x, y, gridSize).includes(letter)) {
                possibleLetters.push(letter);
              }
            }
          }
          grid[y][x] = weightedRandomLetter(possibleLetters);
        }
      }
    }
  }

  function weightedRandomLetter(options) {
    let totalWeight = 0;
    const weights = {};
    options.forEach(letter => {
      let weight = config.letterFrequencies[letter] || 1;
      if (secretWord.includes(letter)) {
        weight *= config.secretLetterFactor;
      }
      weights[letter] = weight;
      totalWeight += weight;
    });
    let rand = Math.random() * totalWeight;
    for (const letter of options) {
      rand -= weights[letter];
      if (rand <= 0) return letter;
    }
    return options[0];
  }

  function assignNumbers(gridSize) {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const adjacent = getAdjacentTiles(x, y, gridSize);
        const count = adjacent.filter(letter => secretWord.includes(letter)).length;
        grid[y][x] = { letter: grid[y][x], number: count };
      }
    }
  }

  function getAdjacentTiles(x, y, gridSize) {
    const adjacent = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const newX = x + dx;
        const newY = y + dy;
        if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
          const cell = grid[newY][newX];
          adjacent.push(cell.letter ? cell.letter : cell);
        }
      }
    }
    return adjacent;
  }

  function isGridBalanced(gridSize) {
    let nonZeroCount = 0;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (grid[y][x].number > 0) nonZeroCount++;
      }
    }
    return nonZeroCount >= gridSize * gridSize * config.clueDensityThreshold;
  }

  function drawGrid() {
    const gridContainer = document.getElementById("grid");
    gridContainer.innerHTML = "";
    const diffConfig = difficulties[currentDifficulty];
    for (let y = 0; y < diffConfig.gridSize; y++) {
      for (let x = 0; x < diffConfig.gridSize; x++) {
        const tile = grid[y][x];
        const tileDiv = document.createElement("div");
        tileDiv.classList.add("tile");
        tileDiv.dataset.x = x;
        tileDiv.dataset.y = y;
        tileDiv.dataset.letter = tile.letter;
        tileDiv.innerHTML = `<span class="letter">${tile.letter || ""}</span>
                             <span class="number">${tile.number !== undefined ? tile.number : ""}</span>`;
        if ("ontouchstart" in window) {
          tileDiv.addEventListener("touchstart", onTileTouchStart);
          tileDiv.addEventListener("touchend", onTileTouchEnd);
        } else {
          tileDiv.addEventListener("click", onTileClick);
          tileDiv.addEventListener("contextmenu", onTileContextMenu);
        }
        gridContainer.appendChild(tileDiv);
      }
    }
  }

  // Desktop event handlers.
  function onTileClick(e) {
    if (gameOver) return;
    const letter = this.dataset.letter;
    if (deducedLetters.has(letter)) {
      deducedLetters.delete(letter);
    } else {
      deducedLetters.add(letter);
      eliminatedLetters.delete(letter);
    }
    updateTilesForLetter(letter);
    updateSelectedLetters();
  }

  function onTileContextMenu(e) {
    e.preventDefault();
    if (gameOver) return;
    const letter = this.dataset.letter;
    if (eliminatedLetters.has(letter)) {
      eliminatedLetters.delete(letter);
    } else {
      eliminatedLetters.add(letter);
      deducedLetters.delete(letter);
    }
    updateTilesForLetter(letter);
    updateSelectedLetters();
  }

  // Mobile event handlers.
  function onTileTouchStart(e) {
    if (gameOver) return;
    e.preventDefault();
    this.longPressTriggered = false;
    const tileDiv = this;
    tileDiv.longPressTimer = setTimeout(() => {
      const letter = tileDiv.dataset.letter;
      if (eliminatedLetters.has(letter)) {
        eliminatedLetters.delete(letter);
      } else {
        eliminatedLetters.add(letter);
        deducedLetters.delete(letter);
      }
      updateTilesForLetter(letter);
      updateSelectedLetters();
      tileDiv.longPressTriggered = true;
    }, 500);
  }

  function onTileTouchEnd(e) {
    if (gameOver) return;
    clearTimeout(this.longPressTimer);
    if (!this.longPressTriggered) {
      const letter = this.dataset.letter;
      if (deducedLetters.has(letter)) {
        deducedLetters.delete(letter);
      } else {
        deducedLetters.add(letter);
        eliminatedLetters.delete(letter);
      }
      updateTilesForLetter(letter);
      updateSelectedLetters();
    }
  }

  function updateTilesForLetter(letter) {
    const tiles = document.querySelectorAll(".tile");
    tiles.forEach(tile => {
      if (tile.dataset.letter === letter) {
        tile.classList.remove("deduced", "eliminated");
        if (deducedLetters.has(letter)) {
          tile.classList.add("deduced");
        } else if (eliminatedLetters.has(letter)) {
          tile.classList.add("eliminated");
        }
      }
    });
  }

  function updateSelectedLetters() {
    const display = document.getElementById("green-letters");
    const letters = Array.from(deducedLetters).sort();
    display.textContent = letters.join(" ");
  }

  function updateGuessesRemaining() {
    document.getElementById("remaining-count").textContent = guessesRemaining;
  }

  function updateWrongGuesses() {
    const wrongList = document.getElementById("wrong-list");
    wrongList.innerHTML = wrongGuesses.map(word => `<span class="wrong">${word}</span>`).join(" ");
  }

  function updateSecretWordDisplay() {
    const display = document.getElementById("word-hangman");
    if (!gameOver) {
      let displayText = "";
      for (let i = 0; i < secretWord.length; i++) {
        displayText += (revealedPositions[i] ? secretWord[i] : "_") + " ";
      }
      display.textContent = displayText.trim();
    } else {
      display.textContent = secretWord.split("").join(" ");
    }
  }

  function showResultOverlay(status, messageText) {
    stopTimer();
    const overlay = document.getElementById("result-overlay");
    overlay.style.display = "flex";
    overlay.className = "result-overlay " + status;
    if (status === "win") {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      messageText += " Your time: " + elapsed + " seconds.";
    }
    document.getElementById("result-message").textContent = messageText;
  }

  function checkWord() {
    if (gameOver) return;
    const guessInput = document.getElementById("wordGuess");
    const guess = guessInput.value.trim().toUpperCase();
    const diffConfig = difficulties[currentDifficulty];
    if (guess.length !== diffConfig.wordLength) {
      document.getElementById("message").textContent = "Word must be " + diffConfig.wordLength + " letters long.";
      return;
    }
    if (guess === secretWord) {
      console.log("Correct word guessed!");
      document.getElementById("message").textContent = "Congratulations! You guessed the secret word!";
      gameOver = true;
      revealedPositions = new Array(secretWord.length).fill(true);
      updateSecretWordDisplay();
      showResultOverlay("win", "Congratulations! You guessed the secret word!");
    } else {
      for (let i = 0; i < secretWord.length; i++) {
        if (guess[i] === secretWord[i]) {
          revealedPositions[i] = true;
        }
      }
      guessesRemaining--;
      wrongGuesses.push(guess);
      updateGuessesRemaining();
      updateWrongGuesses();
      updateSecretWordDisplay();
      if (guessesRemaining <= 0) {
        document.getElementById("message").textContent = "Game over! The secret word was " + secretWord + ".";
        gameOver = true;
        document.getElementById("wordGuess").disabled = true;
        revealedPositions = new Array(secretWord.length).fill(true);
        updateSecretWordDisplay();
        showResultOverlay("lose", "Game over! The secret word was " + secretWord + ".");
      } else {
        document.getElementById("message").textContent = "Incorrect guess.";
      }
    }
    guessInput.value = "";
  }

  // Walkthrough guide logic.
  function showGuideStep() {
    const guideContent = document.getElementById("guide-content");
    const step = walkthroughSteps[currentStep];
    let imageHTML = "";
    if (step.image) {
      imageHTML = `<img src="${step.image}" alt="${step.title}" class="guide-image">`;
    }
    guideContent.innerHTML = `<h2>${step.title}</h2>${imageHTML}<p>${step.content}</p>`;
    document.getElementById("prev-step-button").style.display = currentStep === 0 ? "none" : "inline-block";
    if (currentStep === walkthroughSteps.length - 1) {
      document.getElementById("next-step-button").style.display = "none";
      document.getElementById("guide-start-button").style.display = "inline-block";
    } else {
      document.getElementById("next-step-button").style.display = "inline-block";
      document.getElementById("guide-start-button").style.display = "none";
    }
  }

  const howToPlayButton = document.getElementById("how-to-play-button");
  const overlayDefault = document.getElementById("overlay-default");
  const guideContainer = document.getElementById("guide-container");
  const prevStepButton = document.getElementById("prev-step-button");
  const nextStepButton = document.getElementById("next-step-button");
  const guideStartButton = document.getElementById("guide-start-button");
  const guideBackButton = document.getElementById("guide-back-button");

  howToPlayButton.addEventListener("click", () => {
    overlayDefault.style.display = "none";
    guideContainer.style.display = "block";
    currentStep = 0;
    showGuideStep();
  });

  guideBackButton.addEventListener("click", () => {
    guideContainer.style.display = "none";
    overlayDefault.style.display = "block";
  });

  prevStepButton.addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep--;
      showGuideStep();
    }
  });

  nextStepButton.addEventListener("click", () => {
    if (currentStep < walkthroughSteps.length - 1) {
      currentStep++;
      showGuideStep();
    }
  });

  guideStartButton.addEventListener("click", () => {
    guideContainer.style.display = "none";
    document.getElementById("start-overlay").style.display = "none";
    startCountdown();
  });

  document.getElementById("start-button").addEventListener("click", startCountdown);
  document.getElementById("new-game-button").addEventListener("click", () => {
    document.getElementById("start-overlay").style.display = "flex";
    overlayDefault.style.display = "block";
    guideContainer.style.display = "none";
    startCountdown();
  });
  document.getElementById("overlay-new-game-button").addEventListener("click", () => {
    document.getElementById("result-overlay").style.display = "none";
    document.getElementById("start-overlay").style.display = "flex";
    overlayDefault.style.display = "block";
    startCountdown();
  });

  window.checkWord = checkWord;
  window.startGame = startGame;
});
