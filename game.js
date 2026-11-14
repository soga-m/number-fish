const retryButton = document.getElementById("retry-button");
const undoButton = document.getElementById("undo-button");
const target = document.getElementById("movement-target");
const game = document.querySelector(".game");
const balls = document.querySelectorAll(".ball");
const correctDisplay = document.getElementById("correct-count");
const targetDisplay = document.getElementById("target-number");
const clearMessage = document.getElementById("clear-message");
const timeDisplay = document.getElementById("time-left");
const startButton = document.getElementById("start-button");

// 何問クリアでALL CLEARか
const TOTAL_QUESTIONS = 3;
// 制限時間（秒）
const TIME_LIMIT = 20;

let currentQuestion = null;
let currentTargetIndex = 0;
let correctCount = 0;
let total = 0;
let gameFinished = false;
let isTransitioning = false;
let mouseDownFlag = false;
let gameStarted = false;
let timeLeft = TIME_LIMIT;
let timerId = null;

// 問題をランダムに作る（正解ペア + ランダムな数字3個）
function createQuestion() {
    const targetValue = Math.floor(Math.random() * 21) + 10; // 10〜30

    // 目標値を2つに分ける（これが正解ペア）
    const a = Math.floor(Math.random() * (targetValue - 1)) + 1; // 1〜targetValue-1
    const b = targetValue - a;

    const numbers = [a, b];
    while (numbers.length < balls.length) {
        // 大きすぎるとすぐOVERになるので、目標値と15の小さい方まで
        numbers.push(Math.floor(Math.random() * Math.min(targetValue, 15)) + 1);
    }

    // シャッフル（正解ペアの位置をバラバラにする）
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    return { target: targetValue, numbers: numbers };
}

// ボールの「取得済み」だけをリセット
function resetCollected() {
    balls.forEach(function(ball) {
        delete ball.dataset.collected;
        ball.classList.remove("collected");
    });
    total = 0;
}

// 新しい問題を作って画面に表示
function loadQuestion() {
    currentQuestion = createQuestion();
    targetDisplay.textContent = currentQuestion.target;

    balls.forEach(function(ball, index) {
        ball.textContent = currentQuestion.numbers[index];
        // 今魚が重なっているボールは「待機中」にする
        if (isTouching(target, ball)) {
            ball.dataset.waiting = "true";
        } else {
            delete ball.dataset.waiting;
        }
    });
    resetCollected();
}

function isTouching(fish, ball) {
    const f = fish.getBoundingClientRect();
    const b = ball.getBoundingClientRect();

    // 魚とボールの中心座標
    const fx = f.left + f.width / 2;
    const fy = f.top + f.height / 2;
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;

    // 中心同士の距離
    const distance = Math.hypot(fx - bx, fy - by);

    // ボールの半径 + 魚の判定の大きさ
    const hitRadius = b.width / 2 + 10;

    return distance < hitRadius;
}

function stopTimer() {
    clearInterval(timerId);
    timerId = null;
}

// 最初の問題を表示
loadQuestion();

// 魚をクリックしたら追従開始
target.addEventListener("mousedown", function() {
    if (!gameStarted || gameFinished) return;
    mouseDownFlag = true;
});

// マウスを離したら追従終了
document.addEventListener("mouseup", function() {
    mouseDownFlag = false;
});

document.addEventListener("mousemove", function(event) {
    if (!mouseDownFlag) return;

    // --- 魚の移動 ---
    const rect = game.getBoundingClientRect();
    const halfWidth = target.offsetWidth / 2;
    const halfHeight = target.offsetHeight / 2;

    target.style.position = "absolute";
    target.style.transform = "translate(-50%, -50%)";

    let newX = event.clientX - rect.left;
    let newY = event.clientY - rect.top;

    newX = Math.max(halfWidth, Math.min(newX, game.clientWidth - halfWidth));
    newY = Math.max(halfHeight, Math.min(newY, game.clientHeight - halfHeight));

    target.style.left = newX + "px";
    target.style.top = newY + "px";

    // 終了後・問題切り替え中は、取得も判定もしない
    if (gameFinished || isTransitioning) return;

    // --- ボールの取得 ---
    balls.forEach(function(ball) {
        const touching = isTouching(target, ball);

        // 待機中のボールは、一度離れたら解除
        if (ball.dataset.waiting) {
            if (!touching) {
                delete ball.dataset.waiting;
            }
            return;
        }

        if (touching && !ball.dataset.collected) {
            total += Number(ball.textContent);
            ball.dataset.collected = "true";
            ball.classList.add("collected");
            console.log("取得:", ball.textContent, "合計:", total);
        }
    });

    // --- 判定 ---
    const targetNumber = currentQuestion.target;

    if (total === targetNumber) {
        correctCount++;
        correctDisplay.textContent = correctCount;
        currentTargetIndex++;

        if (currentTargetIndex < TOTAL_QUESTIONS) {
            clearMessage.textContent = "CLEAR!";
            isTransitioning = true; // 切り替え中は取得を止める

            setTimeout(function() {
                if (gameFinished) return; // 切り替え中に時間切れになった場合
                clearMessage.textContent = "";
                loadQuestion();
                isTransitioning = false;
            }, 800);
        } else {
            clearMessage.textContent = "ALL CLEAR!";
            gameFinished = true;
            stopTimer();
            retryButton.style.display = "inline-block";
        }
    } else if (total > targetNumber) {
        clearMessage.textContent = "OVER! もう一度";
        resetCollected();
    }
});

startButton.addEventListener("click", function() {
    // 二重にタイマーが動かないようにする
    if (gameStarted || gameFinished) return;
    gameStarted = true;
    timeLeft = TIME_LIMIT;
    timeDisplay.textContent = timeLeft;

    timerId = setInterval(function() {
        timeLeft--;
        timeDisplay.textContent = timeLeft;

        if (timeLeft <= 0) {
            stopTimer();
            gameFinished = true;
            clearMessage.textContent = "TIME UP!";
            retryButton.style.display = "inline-block";
        }
    }, 1000);
});

undoButton.addEventListener("click", function() {
    if (!gameStarted || gameFinished || isTransitioning) return;

    resetCollected();
    clearMessage.textContent = "";

    // 魚の下にあるボールがすぐ取得されないようにする
    balls.forEach(function(ball) {
        if (isTouching(target, ball)) {
            ball.dataset.waiting = "true";
        }
    });

    // ペナルティで2秒引く場合は、次の2行を足す
    // timeLeft = Math.max(1, timeLeft - 2);
    // timeDisplay.textContent = timeLeft;
});


function resetGame() {
    stopTimer();

    currentTargetIndex = 0;
    correctCount = 0;
    correctDisplay.textContent = correctCount;
    gameFinished = false;
    gameStarted = false;
    isTransitioning = false;
    mouseDownFlag = false;
    timeLeft = TIME_LIMIT;
    timeDisplay.textContent = timeLeft;
    clearMessage.textContent = "";
    retryButton.style.display = "none";

    loadQuestion();

    // 魚を初期位置に戻す（CSSの初期位置に合わせて）
    target.style.left = "";
    target.style.top = "";
    target.style.transform = "";
}

retryButton.addEventListener("click", resetGame);