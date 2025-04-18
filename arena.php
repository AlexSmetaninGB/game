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

// Получаем данные об игре
$stmt_game = $mysqli->prepare("
    SELECT 
        g.trump_suit, 
        g.current_turn, 
        g.attacker_id,
        p1.username AS player1_name, 
        p2.username AS player2_name,
        p1.faction AS player1_faction,
        p2.faction AS player2_faction
    FROM games g 
    JOIN users p1 ON g.player1_id = p1.id 
    JOIN users p2 ON g.player2_id = p2.id 
    WHERE g.id = ?
");
$stmt_game->bind_param("i", $game_id);
$stmt_game->execute();
$game_data = $stmt_game->get_result()->fetch_assoc();

// Проверяем существование игры
if (!$game_data) {
    echo "Игра не найдена!";
    exit;
}

// Определяем козырь
$trump_suit = $game_data['trump_suit'] ?? 'Не определён';
$trump_image_path = "/img/suits/" . htmlspecialchars($trump_suit) . ".png";

// Определяем текущий ход и атакующего игрока
$current_turn_player_id = $game_data['current_turn'] ?? null;
$attacker_id = $game_data['attacker_id'] ?? null;

// Получаем карты для текущего игрока
$stmt_cards = $mysqli->prepare("
    SELECT id, card_value, card_suit, card_image 
    FROM cards 
    WHERE game_id = ? AND player_id = ? AND `table` = 0
");
$stmt_cards->bind_param("ii", $game_id, $user_id);
$stmt_cards->execute();
$result_cards = $stmt_cards->get_result();
$cards = $result_cards->fetch_all(MYSQLI_ASSOC);

// Формируем пути к изображениям карт
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

    <?php session_start(); ?>
</head>
<body>
<!-- Скрытые данные пользователя -->
<div id="current-user-id" data-user-id="<?= htmlspecialchars($user_id) ?>"></div>
<div id="current-game-id" data-game-id="<?= htmlspecialchars($game_id) ?>"></div>
<div id="current-turn-player-id" data-current-turn-id="<?= htmlspecialchars($current_turn_player_id) ?>"></div>
<div id="attacker-id" data-attacker-id="<?= htmlspecialchars($attacker_id) ?>"></div>

<!-- Контейнер арены -->
<div class="arena-container">
    <!-- Индикатор хода -->
    <div class="turn-indicator" id="turn-indicator">
        <h3>Ход игрока:</h3>
        <span id="current-player-name">
            <?= htmlspecialchars($current_turn_player_id === $user_id ? 'Ваш ход!' : 'Соперник') ?>
        </span>
    </div>

    <!-- Козырная масть -->
    <section class="trump-section" id="trump-suit-section">
        <h3>Козырь:</h3>
        <div class="trump-display">
            <img src="<?= htmlspecialchars($trump_image_path) ?>" alt="Козырь: <?= htmlspecialchars($trump_suit) ?>" class="trump-image">
            <span class="trump-text"><?= htmlspecialchars($trump_suit) ?></span>
        </div>
    </section>

    <!-- Игрок 1 -->
    <div class="player-card faction-blue" id="player1-card">
        <h2 id="player1-username"><?= htmlspecialchars($game_data['player1_name'] ?? 'Игрок 1') ?></h2>
        <p>Фракция: <span id="player1-faction"><?= htmlspecialchars($game_data['player1_faction'] ?? 'blue') ?></span></p>
        <p>Карты: <span id="player1-cards-count">6</span></p>
    </div>

    <!-- Блок хода (стол) -->
    <div class="table-section" id="table-section">
        <h3>Стол:</h3>
        <div class="table-cards" id="table-cards"></div>
    </div>

    <!-- Игрок 2 -->
    <div class="player-card faction-yellow" id="player2-card">
        <h2 id="player2-username"><?= htmlspecialchars($game_data['player2_name'] ?? 'Игрок 2') ?></h2>
        <p>Фракция: <span id="player2-faction"><?= htmlspecialchars($game_data['player2_faction'] ?? 'yellow') ?></span></p>
        <p>Карты: <span id="player2-cards-count">6</span></p>
    </div>

    <!-- Рука текущего игрока -->
    <section class="player-hand" id="player-hand-section">
        <h3>Ваша рука:</h3>
        <ul id="player-hand">
            <?php foreach ($cards as $card): ?>
                <li data-card-id="<?= htmlspecialchars($card['id']) ?>">
                    <img 
                        src="<?= htmlspecialchars($card['card_image']) ?>" 
                        alt="<?= htmlspecialchars($card['card_value'] . ' ' . $card['card_suit']) ?>" 
                        class="card-image"
                    >
                </li>
            <?php endforeach; ?>
        </ul>
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
    <script>
    // Глобальные переменные


    
</script>
    <script src="js/arena.js"></script>
</body>
</html>
