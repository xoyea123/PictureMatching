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
        this.gridSize = GAME_CONFIG.GRID_SIZE;
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

        const sounds = ['bgm', 'click', 'match', 'hint', 'end'];
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
        fruits.forEach(fruit => {
            const fruitElement = document.createElement('div');
            fruitElement.classList.add('fruit');
            fruitElement.style.backgroundImage = `url(${this.imageCache[fruit].src})`;
            fruitElement.dataset.type = fruit;
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
            this.handleMatch(fruit1, fruit2);
        } else {
            this.clearSelection();
        }
    }

    // 处理匹配成功
    handleMatch(fruit1, fruit2) {
        this.playSound('match');
        this.drawConnectionLine(fruit1, fruit2);
        setTimeout(() => {
            this.updateScore(GAME_CONFIG.SCORE_PER_PAIR);
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
        }
    }

    // 结束游戏
    endGame() {
        this.isGameRunning = false;
        this.timers.forEach(timer => clearInterval(timer));
        this.playSound('end');
        this.showResultModal();
    }

    // 显示结算弹窗
    showResultModal() {
        document.getElementById('result-modal').style.display = 'block';
        document.querySelector('.final-score').textContent = this.currentScore;
    }

    // 重新开始游戏
    restartGame() {
        document.getElementById('result-modal').style.display = 'none';
        this.init();
        this.startGame();
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
        fruit1.remove();
        fruit2.remove();
    }

    // 检查路径是否有效
    isValidPath(fruit1, fruit2) {
        // 实现路径检查逻辑
        return true;
    }
}

// 初始化游戏
new Game();
