document.addEventListener("DOMContentLoaded", () => {
    // Configuration object.
    const config = {
      gridSize: 8,
      guessLimit: 3,
      clueDensityThreshold: 0.4,
      maxRegenerationAttempts: 10,
      secretWords: [
        "TABLES", "CHAIRS", "PLANTS", "FRIDGE", "WINDOW",
        "CANDLE", "MARKET", "GARDEN", "FRIEND", "SISTER",
        "FAMILY", "SCHOOL", "OFFICE", "DOCTOR", "ANIMAL",
        "FLOWER", "PLANET", "BOTTLE", "RANDOM", "SPHERE"
      ],
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
  
    // Walkthrough steps for the How To Play guide.
    const walkthroughSteps = [
      {
        title: "Welcome to Wordsweeper",
        content: "Your mission is to decipher the grid of letters and guess the secret word hidden within."
      },
      {
        title: "The Grid & Tiles",
        content: "Each tile in the grid shows a letter and a number. The number tells you how many of the eight surrounding tiles (including diagonals) contain a letter from the secret word."
      },
      {
        title: "Marking Tiles",
        content: "On desktop, left-click a tile to mark it green (indicating it is likely in the secret word) and right-click to mark it red (indicating it isn’t). On mobile, simply tap for green; to mark red, press and hold a tile for about 500ms."
      },
      {
        title: "Secret Word Display",
        content: "The secret word is displayed in a hangman-style view. Unrevealed letters show as underscores. After each guess, any correct letters in the right positions will be revealed."
      },
      {
        title: "Game Rules",
        content: "You have 3 attempts to guess the secret word. Use the numbers on the tiles and your marked letters to deduce the word. And remember, time is ticking!"
      },
      {
        title: "Ready to Play?",
        content: "When you're ready, click 'Start Game' to begin your challenge. Good luck!"
      }
    ];
    let currentStep = 0;
  
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
  
    // --------------------
    // START / TIMER LOGIC
    // --------------------
    function startGame() {
      secretWord = config.secretWords[Math.floor(Math.random() * config.secretWords.length)];
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
      generateGrid();
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
    function generateGrid() {
      let attempts = 0;
      do {
        grid = Array.from({ length: config.gridSize }, () => Array(config.gridSize).fill(""));
        placeSecretWord();
        fillRandomLetters();
        assignNumbers();
        attempts++;
      } while (!isGridBalanced() && attempts < config.maxRegenerationAttempts);
      drawGrid();
    }
  
    function placeSecretWord() {
      const horizontal = Math.random() > 0.5;
      let startX, startY;
      if (horizontal) {
        startX = Math.floor(Math.random() * (config.gridSize - secretWord.length));
        startY = Math.floor(Math.random() * config.gridSize);
      } else {
        startX = Math.floor(Math.random() * config.gridSize);
        startY = Math.floor(Math.random() * (config.gridSize - secretWord.length));
      }
      for (let i = 0; i < secretWord.length; i++) {
        const x = horizontal ? startX + i : startX;
        const y = horizontal ? startY : startY + i;
        grid[y][x] = secretWord[i];
      }
    }
  
    function fillRandomLetters() {
      for (let y = 0; y < config.gridSize; y++) {
        for (let x = 0; x < config.gridSize; x++) {
          if (!grid[y][x]) {
            let possibleLetters = [];
            for (let i = 0; i < 26; i++) {
              const letter = String.fromCharCode(65 + i);
              if (secretWord.includes(letter)) {
                possibleLetters.push(letter);
              } else {
                if (!getAdjacentTiles(x, y).includes(letter)) {
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
  
    function assignNumbers() {
      for (let y = 0; y < config.gridSize; y++) {
        for (let x = 0; x < config.gridSize; x++) {
          const adjacent = getAdjacentTiles(x, y);
          const count = adjacent.filter(letter => secretWord.includes(letter)).length;
          grid[y][x] = { letter: grid[y][x], number: count };
        }
      }
    }
  
    function getAdjacentTiles(x, y) {
      const adjacent = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const newX = x + dx;
          const newY = y + dy;
          if (newX >= 0 && newX < config.gridSize && newY >= 0 && newY < config.gridSize) {
            const cell = grid[newY][newX];
            adjacent.push(cell.letter ? cell.letter : cell);
          }
        }
      }
      return adjacent;
    }
  
    function isGridBalanced() {
      let nonZeroCount = 0;
      for (let y = 0; y < config.gridSize; y++) {
        for (let x = 0; x < config.gridSize; x++) {
          if (grid[y][x].number > 0) nonZeroCount++;
        }
      }
      return nonZeroCount >= config.gridSize * config.gridSize * config.clueDensityThreshold;
    }
  
    function drawGrid() {
      const gridContainer = document.getElementById("grid");
      gridContainer.innerHTML = "";
      for (let y = 0; y < config.gridSize; y++) {
        for (let x = 0; x < config.gridSize; x++) {
          const tile = grid[y][x];
          const tileDiv = document.createElement("div");
          tileDiv.classList.add("tile");
          tileDiv.dataset.x = x;
          tileDiv.dataset.y = y;
          tileDiv.dataset.letter = tile.letter;
          tileDiv.innerHTML = `<span class="letter">${tile.letter}</span>
                               <span class="number">${tile.number}</span>`;
          // For mobile, use touch events; for desktop, use click and contextmenu.
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
  
    // Mobile long-press / tap handlers.
    function onTileTouchStart(e) {
      if (gameOver) return;
      // Prevent simulated mouse events.
      e.preventDefault();
      this.longPressTriggered = false;
      const tileDiv = this;
      tileDiv.longPressTimer = setTimeout(() => {
        // Long press detected: mark red.
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
      }, 500); // 500ms threshold for long press.
    }
  
    function onTileTouchEnd(e) {
      if (gameOver) return;
      clearTimeout(this.longPressTimer);
      if (!this.longPressTriggered) {
        // Short tap: mark green.
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
  
    // Show an overlay over the grid with win/lose message.
    function showResultOverlay(status, messageText) {
      stopTimer();
      const overlay = document.getElementById("result-overlay");
      overlay.style.display = "flex";
      overlay.className = "result-overlay " + status;
      document.getElementById("result-message").textContent = messageText;
    }
  
    // --------------------
    // WORD GUESS LOGIC
    // --------------------
    function checkWord() {
      if (gameOver) return;
      const guessInput = document.getElementById("wordGuess");
      const guess = guessInput.value.trim().toUpperCase();
      if (guess.length !== secretWord.length) {
        document.getElementById("message").textContent = "Word must be " + secretWord.length + " letters long.";
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
  
    // --------------------
    // WALKTHROUGH GUIDE LOGIC
    // --------------------
    function showGuideStep() {
      const guideContent = document.getElementById("guide-content");
      const step = walkthroughSteps[currentStep];
      guideContent.innerHTML = `<h2>${step.title}</h2><p>${step.content}</p>`;
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
      startGame();
    });
  
    // --------------------
    // INITIAL EVENT LISTENERS
    // --------------------
    document.getElementById("start-button").addEventListener("click", startGame);
    document.getElementById("new-game-button").addEventListener("click", () => {
      document.getElementById("start-overlay").style.display = "flex";
      overlayDefault.style.display = "block";
      guideContainer.style.display = "none";
      startGame();
    });
    document.getElementById("overlay-new-game-button").addEventListener("click", () => {
      document.getElementById("result-overlay").style.display = "none";
      document.getElementById("start-overlay").style.display = "flex";
      overlayDefault.style.display = "block";
      startGame();
    });
  
    window.checkWord = checkWord;
    window.startGame = startGame;
  });
  