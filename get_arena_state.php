<?php
session_start();
require 'db.php';

$game_id = $_GET['game_id'] ?? null;
if (!$game_id) {
    echo json_encode(['success' => false, 'message' => 'Game ID не указан']);
    exit;
}

try {
    // Получаем текущее состояние игры
    $stmt_game = $mysqli->prepare("
        SELECT 
            g.trump_suit, 
            g.current_turn, 
            g.attacker_id,
            p1.id AS player1_id, 
            p1.username AS player1_name, 
            p2.id AS player2_id, 
            p2.username AS player2_name
        FROM games g 
        JOIN users p1 ON g.player1_id = p1.id 
        JOIN users p2 ON g.player2_id = p2.id 
        WHERE g.id = ?
    ");
    $stmt_game->bind_param("i", $game_id);
    $stmt_game->execute();
    $game_data = $stmt_game->get_result()->fetch_assoc();

    if (!$game_data) {
        echo json_encode(['success' => false, 'message' => 'Игра не найдена']);
        exit;
    }

    // Карты на столе (только table = 1)
    $stmt_table = $mysqli->prepare("
        SELECT id, card_value, card_suit, card_image 
        FROM cards 
        WHERE game_id = ? AND `table` = 1
    ");
    $stmt_table->bind_param("i", $game_id);
    $stmt_table->execute();
    $table_cards = $stmt_table->get_result()->fetch_all(MYSQLI_ASSOC);

    // Рука первого игрока (только table = 0)
    $player1_id = $game_data['player1_id'];
    $stmt_player1_hand = $mysqli->prepare("
        SELECT id, card_value, card_suit, card_image, player_id 
        FROM cards 
        WHERE game_id = ? AND player_id = ? AND `table` = 0
    ");
    $stmt_player1_hand->bind_param("ii", $game_id, $player1_id);
    $stmt_player1_hand->execute();
    $player1_hand = $stmt_player1_hand->get_result()->fetch_all(MYSQLI_ASSOC);

    // Рука второго игрока (только table = 0)
    $player2_id = $game_data['player2_id'];
    $stmt_player2_hand = $mysqli->prepare("
        SELECT id, card_value, card_suit, card_image, player_id 
        FROM cards 
        WHERE game_id = ? AND player_id = ? AND `table` = 0
    ");
    $stmt_player2_hand->bind_param("ii", $game_id, $player2_id);
    $stmt_player2_hand->execute();
    $player2_hand = $stmt_player2_hand->get_result()->fetch_all(MYSQLI_ASSOC);

    // Добавляем пути к изображениям карт
    foreach ($table_cards as &$card) {
        $card['card_image'] = "/img/cards/" . htmlspecialchars($card['card_value']) . "_" . htmlspecialchars($card['card_suit']) . ".png";
    }
    foreach ($player1_hand as &$card) {
        $card['card_image'] = "/img/cards/" . htmlspecialchars($card['card_value']) . "_" . htmlspecialchars($card['card_suit']) . ".png";
    }
    foreach ($player2_hand as &$card) {
        $card['card_image'] = "/img/cards/" . htmlspecialchars($card['card_value']) . "_" . htmlspecialchars($card['card_suit']) . ".png";
    }

    // Возвращаем успешный ответ
    echo json_encode([
        'success' => true,
        'state' => [
            'current_turn' => $game_data['current_turn'], // ID активного игрока
            'attacker_id' => $game_data['attacker_id'], // ID атакующего игрока
            'trump_suit' => $game_data['trump_suit'], // Козырная масть
            'table_cards' => $table_cards, // Карты на столе
            'player1_hand' => $player1_hand, // Рука первого игрока
            'player2_hand' => $player2_hand // Рука второго игрока
        ]
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Произошла ошибка: ' . $e->getMessage()]);
}
exit;
?>
