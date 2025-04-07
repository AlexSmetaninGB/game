<?php
session_start();
require 'php/db.php';

$game_id = $_GET['game_id'] ?? null;
if (!$game_id) {
    header('Location: lobby.php');
    exit;
}

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

$user_id = $_SESSION['user_id'];

// Получаем данные о текущей игре
$stmt_game = $mysqli->prepare("
    SELECT 
        g.trump_suit, 
        g.current_turn, 
        p1.username AS player1_name, 
        p2.username AS player2_name,
        p1.faction AS player1_faction,
        p2.faction AS player2_faction,
        g.player1_id, 
        g.player2_id
    FROM games g 
    JOIN users p1 ON g.player1_id = p1.id 
    JOIN users p2 ON g.player2_id = p2.id 
    WHERE g.id = ?
");
$stmt_game->bind_param("i", $game_id);
$stmt_game->execute();
$game_data = $stmt_game->get_result()->fetch_assoc();

if (!$game_data) {
    echo "<p>Ошибка: Игра не найдена!</p>";
    exit;
}

$trump_suit = $game_data['trump_suit'] ?? 'Не определён';
$trump_image_path = "/img/suits/" . htmlspecialchars($trump_suit) . ".png";
$current_turn_player_id = $game_data['current_turn'] ?? null;
$player1_name = htmlspecialchars($game_data['player1_name'] ?? 'Игрок 1');
$player2_name = htmlspecialchars($game_data['player2_name'] ?? 'Игрок 2');
$player1_faction = htmlspecialchars($game_data['player1_faction'] ?? 'blue');
$player2_faction = htmlspecialchars($game_data['player2_faction'] ?? 'yellow');
$player1_id = $game_data['player1_id'] ?? 0;
$player2_id = $game_data['player2_id'] ?? 0;

// Получаем руку текущего игрока
$stmt_hand = $mysqli->prepare("
    SELECT 
        id, 
        card_value, 
        card_suit, 
        card_image, 
        `table` 
    FROM cards 
    WHERE game_id = ? 
    AND player_id = ? 
    AND `table` = 0
");
$stmt_hand->bind_param("ii", $game_id, $user_id);
$stmt_hand->execute();
$result = $stmt_hand->get_result();
$cards = $result->fetch_all(MYSQLI_ASSOC);

foreach ($cards as &$card) {
    $card['card_image'] = "/img/cards/" . htmlspecialchars($card['card_value']) . "_" . htmlspecialchars($card['card_suit']) . ".png";
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Арена — Дурак</title>
    <link rel="stylesheet" href="css/arena.css"> <!-- Подключение стилей -->
</head>
<body>
    <!-- Скрытый элемент для хранения user_id -->
    <div id="current-user-id" data-user-id="<?= htmlspecialchars($_SESSION['user_id'] ?? 0) ?>"></div>

    <!-- Блок для хранения Game ID -->
    <div id="game-id" data-game-id="<?= htmlspecialchars($game_id) ?>"></div>

    <!-- Блок для хранения Player1 ID и Player2 ID -->
    <div id="player1-id" data-player-id="<?= htmlspecialchars($player1_id) ?>"></div>
    <div id="player2-id" data-player-id="<?= htmlspecialchars($player2_id) ?>"></div>

    <!-- Индикатор хода -->
    <div class="turn-indicator" id="turn-indicator">
        <h3>Ход игрока:</h3>
        <span id="current-player-name"><?= htmlspecialchars($current_turn_player_id === $user_id ? 'Ваш ход!' : 'Соперник') ?></span>
    </div>

    <!-- Новый блок для текущего хода (скрытый) -->
    <div id="current-turn" data-current-turn="<?= htmlspecialchars($current_turn_player_id ?? 0) ?>"></div>
    <!-- Блок атакующего игрока -->
    <div class="attacker-info" id="attacker-info">
    <h3>Атакующий игрок:</h3>
    <span id="attacker-name">Не определён</span>
</div>
<div id="game-info" data-player1-id="<?= htmlspecialchars($player1_id) ?>"
     data-player2-id="<?= htmlspecialchars($player2_id) ?>"
     data-player1-name="<?= htmlspecialchars($player1_name) ?>"
     data-player2-name="<?= htmlspecialchars($player2_name) ?>"></div>
    <!-- Общий контейнер -->
    <div class="arena-container">
    <!-- Козырная масть -->
    <section class="trump-section" id="trump-suit-section">
            <h3>Козырь:</h3>
            <div id="trump-suit">
                <?php if (!empty($trump_suit)): ?>
                    <img src="<?= $trump_image_path ?>" alt="Козырь: <?= $trump_suit ?>" class="trump-image">
                    <p class="trump-text"><?= $trump_suit ?></p>
                <?php else: ?>
                    <p class="trump-text">Козырь не определён</p>
                <?php endif; ?>
            </div>
        </section>

        <!-- Игрок 1 (противник) -->
        <div class="player-card faction-blue" id="player1-card">
            <h2 id="player1-username"><?= htmlspecialchars($player1_name ?? 'Игрок 1') ?></h2>
            <p>Фракция: <span id="player1-faction"><?= htmlspecialchars($player1_faction ?? 'blue') ?></span></p>
            <p>Карты: <span id="player1-cards-count">6</span></p>
        </div>

        <!-- Блок хода (стол) -->
        <div class="table-section" id="table-section">
            <h3>Стол:</h3>
            <div class="table-cards" id="table-cards"></div>
        </div>

        <!-- Игрок 2 (текущий игрок) -->
        <div class="player-card faction-yellow" id="player2-card">
            <h2 id="player2-username"><?= htmlspecialchars($player2_name ?? 'Игрок 2') ?></h2>
            <p>Фракция: <span id="player2-faction"><?= htmlspecialchars($player2_faction ?? 'yellow') ?></span></p>
            <p>Карты: <span id="player2-cards-count">6</span></p>
        </div>

        <section class="player-hand" id="player-hand-section">
    <h3>Ваша рука:</h3>
    <ul id="player-hand"></ul> <!-- Пустой список для руки игрока -->
</section>
        <!-- Кнопка "Взять карты" -->
        <button class="take-cards-btn" id="take-cards-btn">Взять карты</button>

        <!-- Чат -->
        <section class="chat-section">
            <h3>Чат:</h3>
            <ul class="chat-messages" id="arena-chat-messages"></ul>
            <form id="arena-chat-form">
                <input type="text" id="arena-chat-input" placeholder="Введите сообщение (до 200 символов)" maxlength="200" required>
                <button type="submit">Отправить</button>
            </form>
        </section>

        <!-- Лог игры -->
        <section class="game-log">
    <h3>Лог игры:</h3>
    <ul id="game-log"></ul>
</section>
    </div>

    <!-- Подключение JavaScript -->
    <script src="js/arena.js"></script>
</body>
</html>
