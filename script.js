// 游戏配置
const GAME_CONFIG = {
    GAME_DURATION: 90,
    GRID_SIZE: 8,
    ITEM_SIZE: 50,
    SCORE_PER_PAIR: 10,
    HINT_COOLDOWN: 10,
    MAX_RESET_TIMES: 3,
    ENDLESS_MODE: true,
    INITIAL_FRUIT_TYPES: 6,
    MAX_FRUIT_TYPES: 15,
    GRID_SIZE_INCREASE: 2,
    FRUIT_INCREASE: 1,
    LEVEL_UP_SCORE: 500
};

class Game {
    constructor() {
        this.init();
        this.bindEvents();
    }

    // 初始化游戏
    init() {
        this.currentScore = 0;
        this.timeLeft = GAME_CONFIG.GAME_DURATION;
        this.selectedFruits = [];
        this.isGameRunning = false;
        this.resetTimes = 0;
        this.level = 1;
        this.fruitTypes = GAME_CONFIG.INITIAL_FRUIT_TYPES;
        this.gridSize = this.calculateGridSize(this.level); // 根据当前关卡设置网格大小
        this.imageCache = {};
        this.audioCache = {};
        this.timers = [];
        this.connectionLines = [];
        
        this.preloadResources();
        this.generateGrid();
        this.updateUI();
    }

    // 预加载资源
    preloadResources() {
        const fruitImages = [
            'caomei', 'chengzi', 'hongpingguo', 'huolongguo', 'juzi',
            'li', 'liulian', 'lizhi', 'mangguo', 'mihoutao',
            'putao', 'taozi', 'xiangjiao', 'xigua'
        ];

        fruitImages.forEach(fruit => {
            const img = new Image();
            img.src = `image/${fruit}.png`;
            this.imageCache[fruit] = img;
        });

        const sounds = ['bgm', 'click', 'match', 'hint', 'end', 'congratulation']; // 添加 congratulation 音效
        sounds.forEach(sound => {
            const audio = new Audio(`music/${sound}.mp3`);
            this.audioCache[sound] = audio;
        });
    }

    // 生成游戏网格
    generateGrid() {
        const grid = document.querySelector('.game-grid');
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${this.gridSize}, ${GAME_CONFIG.ITEM_SIZE}px)`;
        grid.style.gridTemplateRows = `repeat(${this.gridSize}, ${GAME_CONFIG.ITEM_SIZE}px)`;

        const fruits = this.generateFruitPairs();
        fruits.forEach((fruit, index) => {
            const fruitElement = document.createElement('div');
            fruitElement.classList.add('fruit');
            fruitElement.style.backgroundImage = `url(${this.imageCache[fruit].src})`;
            fruitElement.dataset.type = fruit;
            fruitElement.dataset.index = index; // 添加索引以便固定位置
            grid.appendChild(fruitElement);
        });
    }

    // 生成水果对
    generateFruitPairs() {
        const fruits = [];
        const totalPairs = (this.gridSize * this.gridSize) / 2;
        const availableFruits = Object.keys(this.imageCache).slice(0, this.fruitTypes);

        for (let i = 0; i < totalPairs; i++) {
            const randomFruit = availableFruits[Math.floor(Math.random() * availableFruits.length)];
            fruits.push(randomFruit, randomFruit);
        }

        return this.shuffleArray(fruits);
    }

    // 洗牌算法
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 绑定事件
    bindEvents() {
        document.getElementById('start-button').addEventListener('click', () => this.startGame());
        document.querySelector('.game-grid').addEventListener('click', e => this.handleFruitClick(e));
        document.getElementById('hint-button').addEventListener('click', () => this.showHint());
        document.getElementById('reset-button').addEventListener('click', () => this.resetGrid());
        document.getElementById('replay-button').addEventListener('click', () => this.restartGame());
    }

    // 开始游戏
    startGame() {
        this.isGameRunning = true;
        document.getElementById('welcome-page').classList.remove('active');
        document.getElementById('game-page').classList.add('active');
        this.startTimer();
        this.playSound('bgm', true);
    }

    // 处理水果点击
    handleFruitClick(event) {
        if (!this.isGameRunning) return;
        
        const fruit = event.target;
        if (!fruit.classList.contains('fruit')) return;

        this.playSound('click');
        
        if (this.selectedFruits.length < 2) {
            fruit.classList.add('selected');
            this.selectedFruits.push(fruit);
            
            if (this.selectedFruits.length === 2) {
                this.checkMatch();
            }
        }
    }

    // 检查匹配
    checkMatch() {
        const [fruit1, fruit2] = this.selectedFruits;
        
        if (fruit1.dataset.type === fruit2.dataset.type && this.isValidPath(fruit1, fruit2)) {
            // 计算两个水果之间的距离
            const rect1 = fruit1.getBoundingClientRect();
            const rect2 = fruit2.getBoundingClientRect();
            const distance = Math.sqrt((rect2.left - rect1.left) ** 2 + (rect2.top - rect1.top) ** 2);
            
            // 根据距离计算得分，距离越远得分越高
            const baseScore = GAME_CONFIG.SCORE_PER_PAIR;
            const maxDistance = Math.sqrt((this.gridSize * GAME_CONFIG.ITEM_SIZE) ** 2 + (this.gridSize * GAME_CONFIG.ITEM_SIZE) ** 2);
            const scoreMultiplier = 1 + (distance / maxDistance);
            const score = Math.round(baseScore * scoreMultiplier);
            
            this.handleMatch(fruit1, fruit2, score);
        } else {
            this.clearSelection();
        }
    }

    // 处理匹配成功
    handleMatch(fruit1, fruit2, score) {
        this.playSound('match');
        this.drawConnectionLine(fruit1, fruit2);
        setTimeout(() => {
            this.updateScore(score);
            this.removeFruits(fruit1, fruit2);
            this.clearSelection();
            this.checkGameOver();
        }, 500);
    }

    // 绘制连线
    drawConnectionLine(fruit1, fruit2) {
        // 获取水果位置
        const rect1 = fruit1.getBoundingClientRect();
        const rect2 = fruit2.getBoundingClientRect();
        
        // 计算中心点
        const x1 = rect1.left + rect1.width / 2;
        const y1 = rect1.top + rect1.height / 2;
        const x2 = rect2.left + rect2.width / 2;
        const y2 = rect2.top + rect2.height / 2;
        
        // 创建连线元素
        const line = document.createElement('div');
        line.classList.add('connection-line');
        
        // 计算连线长度和角度
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // 设置连线样式
        line.style.width = `${length}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.left = `${x1}px`;
        line.style.top = `${y1}px`;
        
        // 添加到页面
        document.body.appendChild(line);
        this.connectionLines.push(line);
        
        // 500ms后移除连线
        setTimeout(() => {
            line.remove();
            this.connectionLines = this.connectionLines.filter(l => l !== line);
        }, 500);
    }

    // 更新分数
    updateScore(points) {
        this.currentScore += points;
        document.getElementById('current-score').textContent = this.currentScore;
        
        if (this.currentScore >= this.level * GAME_CONFIG.LEVEL_UP_SCORE) {
            this.levelUp();
        }
    }

    // 升级
    levelUp() {
        this.level++;
        this.fruitTypes = Math.min(this.fruitTypes + GAME_CONFIG.FRUIT_INCREASE, GAME_CONFIG.MAX_FRUIT_TYPES);
        this.gridSize = Math.min(this.gridSize + GAME_CONFIG.GRID_SIZE_INCREASE, 12);
        this.resetGrid();
    }

    // 重置网格
    resetGrid() {
        if (this.resetTimes >= GAME_CONFIG.MAX_RESET_TIMES) return;
        
        this.resetTimes++;
        this.generateGrid();
    }

    // 显示提示
    showHint() {
        if (this.hintCooldown > 0) return;
        
        const hintPair = this.findHintPair();
        if (hintPair) {
            const [first, second] = hintPair;
            
            // 添加闪烁效果
            first.classList.add('hint');
            second.classList.add('hint');
            
            // 3秒后移除闪烁效果
            setTimeout(() => {
                first.classList.remove('hint');
                second.classList.remove('hint');
            }, 3000);
            
            this.hintCooldown = GAME_CONFIG.HINT_COOLDOWN;
            this.updateHintButton();
            this.playSound('hint');
        }
    }

    // 查找可消除对
    findHintPair() {
        const fruits = Array.from(document.querySelectorAll('.fruit:not(.selected)'));
        for (let i = 0; i < fruits.length; i++) {
            for (let j = i + 1; j < fruits.length; j++) {
                if (fruits[i].dataset.type === fruits[j].dataset.type &&
                    this.isValidPath(fruits[i], fruits[j])) {
                    return [fruits[i], fruits[j]];
                }
            }
        }
        return null;
    }

    // 更新提示按钮状态
    updateHintButton() {
        const hintButton = document.getElementById('hint-button');
        hintButton.disabled = this.hintCooldown > 0;
        
        if (this.hintCooldown > 0) {
            const interval = setInterval(() => {
                this.hintCooldown--;
                hintButton.textContent = `提示 (${this.hintCooldown}s)`;
                
                if (this.hintCooldown <= 0) {
                    clearInterval(interval);
                    hintButton.textContent = '提示';
                    hintButton.disabled = false;
                }
            }, 1000);
        }
    }

    // 检查游戏结束
    checkGameOver() {
        if (this.timeLeft <= 0) {
            this.endGame();
        } else {
            // 检查是否所有水果都被消除
            const fruits = document.querySelectorAll('.fruit:not(.empty)');
            if (fruits.length === 0) {
                this.endGame();
            }
        }
    }

    // 结束游戏
    endGame() {
        this.isGameRunning = false;
        this.timers.forEach(timer => clearInterval(timer));
        if (this.timeLeft <= 0) {
            this.playSound('end'); // 时间结束，播放游戏结束音效
        } else {
            this.playSound('congratulation'); // 时间未结束且所有水果消除，播放通关音效
        }
        this.showResultModal(this.timeLeft <= 0); // 传递时间是否结束的标志
    }

    // 显示结算弹窗
    showResultModal(isTimeUp) {
        document.getElementById('result-modal').style.display = 'block';
        document.querySelector('.final-score').textContent = this.currentScore;

        // 清空 modal-content 的内容
        document.querySelector('.modal-content').innerHTML = `
            <h2 class="result-title">游戏结束</h2>
            <div class="final-score">分数: <span id="final-score">${this.currentScore}</span></div>
        `;

        if (isTimeUp) {
            // 如果时间结束，显示“重新开始”按钮
            const restartButton = document.createElement('button');
            restartButton.id = 'restart-button';
            restartButton.className = 'control-button';
            restartButton.textContent = '重新开始';
            restartButton.addEventListener('click', () => this.restartGame());
            document.querySelector('.modal-content').appendChild(restartButton);
        } else {
            // 如果水果消除完毕，显示“下一关”按钮
            const nextLevelButton = document.createElement('button');
            nextLevelButton.id = 'next-level-button';
            nextLevelButton.className = 'control-button';
            nextLevelButton.textContent = '下一关';
            nextLevelButton.addEventListener('click', () => this.nextLevel());
            document.querySelector('.modal-content').appendChild(nextLevelButton);
        }

        // 添加“退出”按钮
        const exitButton = document.createElement('button');
        exitButton.id = 'exit-button';
        exitButton.className = 'control-button';
        exitButton.textContent = '退出';
        exitButton.addEventListener('click', () => this.exitGame());
        document.querySelector('.modal-content').appendChild(exitButton);
    }

    // 重新开始游戏
    restartGame() {
        document.getElementById('result-modal').style.display = 'none';
        this.init();
        this.startGame();
    }

    // 进入下一关
    nextLevel() {
        document.getElementById('result-modal').style.display = 'none';
        this.levelUp(); // 增加难度
        this.generateGrid(); // 重新生成网格
        this.updateUI(); // 更新UI
        this.timeLeft = GAME_CONFIG.GAME_DURATION; // 重置时间
        this.startGame(); // 重新开始游戏
        this.startTimer(); // 重新启动计时器
    }

    // 退出游戏
    exitGame() {
        document.getElementById('result-modal').style.display = 'none';
        document.getElementById('game-page').classList.remove('active');
        document.getElementById('welcome-page').classList.add('active');
    }

    // 更新UI
    updateUI() {
        document.getElementById('current-score').textContent = this.currentScore;
        document.getElementById('time-left').textContent = this.timeLeft;
    }

    // 播放音效
    playSound(sound, loop = false) {
        const audio = this.audioCache[sound];
        if (audio) {
            audio.currentTime = 0;
            audio.loop = loop;
            audio.play();
        }
    }

    // 启动计时器
    startTimer() {
        this.timers.push(setInterval(() => {
            this.timeLeft--;
            document.getElementById('time-left').textContent = this.timeLeft;
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000));
    }

    // 清除选择
    clearSelection() {
        this.selectedFruits.forEach(fruit => fruit.classList.remove('selected'));
        this.selectedFruits = [];
    }

    // 移除水果
    removeFruits(fruit1, fruit2) {
        fruit1.style.backgroundImage = ''; // 留白
        fruit2.style.backgroundImage = ''; // 留白
        fruit1.classList.add('empty'); // 添加空类以便后续处理
        fruit2.classList.add('empty'); // 添加空类以便后续处理
    }

    // 检查路径是否有效
    isValidPath(fruit1, fruit2) {
        if (this.level <= 2) {
            // 前两关直接返回true，因为水果位置固定，不需要检查路径
            return true;
        }
        const rect1 = fruit1.getBoundingClientRect();
        const rect2 = fruit2.getBoundingClientRect();
        
        const x1 = rect1.left + rect1.width / 2;
        const y1 = rect1.top + rect1.height / 2;
        const x2 = rect2.left + rect2.width / 2;
        const y2 = rect2.top + rect2.height / 2;
        
        // 检查是否在同一行或同一列
        if (x1 === x2 || y1 === y2) {
            return true;
        }
        
        // 检查是否有不超过两个拐角的路径
        const corners = [];
        
        // 检查水平-垂直路径
        if (this.isClearPath(x1, y1, x2, y1)) {
            corners.push({ x: x2, y: y1 });
        }
        
        // 检查垂直-水平路径
        if (this.isClearPath(x1, y1, x1, y2)) {
            corners.push({ x: x1, y: y2 });
        }
        
        // 检查是否有不超过两个拐角的路径
        for (const corner of corners) {
            if (this.isClearPath(corner.x, corner.y, x2, y2)) {
                return true;
            }
        }
        
        return false;
    }

    isClearPath(x1, y1, x2, y2) {
        const grid = document.querySelector('.game-grid');
        const gridRect = grid.getBoundingClientRect();
        const gridSize = this.gridSize;
        const itemSize = GAME_CONFIG.ITEM_SIZE;
        
        const startX = Math.floor((x1 - gridRect.left) / itemSize);
        const startY = Math.floor((y1 - gridRect.top) / itemSize);
        const endX = Math.floor((x2 - gridRect.left) / itemSize);
        const endY = Math.floor((y2 - gridRect.top) / itemSize);
        
        if (startX === endX && startY === endY) {
            return true;
        }
        
        if (startX === endX) {
            const step = startY < endY ? 1 : -1;
            for (let y = startY + step; y !== endY; y += step) {
                if (this.isOccupied(startX, y)) {
                    return false;
                }
            }
            return true;
        }
        
        if (startY === endY) {
            const step = startX < endX ? 1 : -1;
            for (let x = startX + step; x !== endX; x += step) {
                if (this.isOccupied(x, startY)) {
                    return false;
                }
            }
            return true;
        }
        
        return false;
    }

    isOccupied(x, y) {
        const grid = document.querySelector('.game-grid');
        const fruitElement = grid.querySelector(`.fruit:nth-child(${y * this.gridSize + x + 1})`);
        return fruitElement && fruitElement.style.backgroundImage !== '';
    }

    // 计算网格大小
    calculateGridSize(level) {
        return 2 * level + 2; // 第一关4×4，第二关6×6，第三关8×8...
    }
}

// 初始化游戏
new Game();