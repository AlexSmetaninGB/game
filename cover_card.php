<?php
session_start();
require 'db.php';

$game_id = $_POST['game_id'] ?? null;
$played_card_id = $_POST['played_card_id'] ?? null;
$covering_card_id = $_POST['covering_card_id'] ?? null;

if (!$game_id || !$played_card_id || !$covering_card_id) {
    echo json_encode(['success' => false, 'message' => 'Не все данные переданы!']);
    exit;
}

try {
    // Получаем текущее состояние игры
    $stmt_game = $mysqli->prepare("
        SELECT g.current_turn, g.attacker_id, g.trump_suit 
        FROM games g 
        WHERE g.id = ?
    ");
    $stmt_game->bind_param("i", $game_id);
    $stmt_game->execute();
    $game_data = $stmt_game->get_result()->fetch_assoc();

    if (!$game_data) {
        echo json_encode(['success' => false, 'message' => 'Игра не найдена!']);
        exit;
    }

    // Определяем ID текущего пользователя
    $current_user_id = $_SESSION['user_id'];
    if ($current_user_id != $game_data['attacker_id']) { // Только обороняющийся может покрывать
        echo json_encode(['success' => false, 'message' => 'Вы не можете покрывать карты сейчас!']);
        exit;
    }

    // Получаем данные о картах
    $stmt_cards = $mysqli->prepare("
        SELECT id, card_value, card_suit 
        FROM cards 
        WHERE game_id = ? AND id IN (?, ?)
    ");
    $stmt_cards->bind_param("iii", $game_id, $played_card_id, $covering_card_id);
    $stmt_cards->execute();
    $cards = $stmt_cards->get_result()->fetch_all(MYSQLI_ASSOC);

    if (count($cards) !== 2) {
        echo json_encode(['success' => false, 'message' => 'Одна из карт не найдена!']);
        exit;
    }

    // Разделяем карты
    $playedCard = $cards[0]['id'] === $played_card_id ? $cards[0] : $cards[1];
    $coveringCard = $cards[0]['id'] === $covering_card_id ? $cards[0] : $cards[1];

    // Проверяем правила покрытия
    if (!canCoverCard($playedCard, $coveringCard, $game_data['trump_suit'])) {
        echo json_encode(['success' => false, 'message' => 'Карта не подходит для покрытия!']);
        exit;
    }

    // Обновляем состояние карты
    $stmt_update = $mysqli->prepare("
        UPDATE cards 
        SET `table` = 1 
        WHERE id = ? AND game_id = ?
    ");
    $stmt_update->bind_param("ii", $covering_card_id, $game_id);
    if (!$stmt_update->execute()) {
        echo json_encode(['success' => false, 'message' => 'Ошибка при обновлении состояния карты!']);
        exit;
    }

    // Удаляем атакующую карту со стола
    $stmt_remove = $mysqli->prepare("
        DELETE FROM cards 
        WHERE id = ? AND game_id = ? AND `table` = 1
    ");
    $stmt_remove->bind_param("ii", $played_card_id, $game_id);
    if (!$stmt_remove->execute()) {
        echo json_encode(['success' => false, 'message' => 'Ошибка при удалении карты со стола!']);
        exit;
    }

    // Проверяем, остались ли ещё непокрытые карты
    $stmt_table = $mysqli->prepare("
        SELECT COUNT(*) AS count 
        FROM cards 
        WHERE game_id = ? AND `table` = 1
    ");
    $stmt_table->bind_param("i", $game_id);
    $stmt_table->execute();
    $table_count = $stmt_table->get_result()->fetch_assoc()['count'];

    if ($table_count === 0) { // Если все карты покрыты
        $new_attacker_id = $current_user_id; // Обороняющийся становится атакующим
    } else {
        $new_attacker_id = $game_data['attacker_id']; // Иначе ход остаётся за атакующим
    }

    // Передаём ход
    $stmt_turn = $mysqli->prepare("
        UPDATE games 
        SET current_turn = IF(current_turn = player1_id, player2_id, player1_id), 
            attacker_id = ? 
        WHERE id = ?
    ");
    $stmt_turn->bind_param("ii", $new_attacker_id, $game_id);
    if (!$stmt_turn->execute()) {
        echo json_encode(['success' => false, 'message' => 'Ошибка при передаче хода!']);
        exit;
    }

    // Возвращаем успешный ответ
    echo json_encode([
        'success' => true,
        'message' => 'Вы покрыли карту!',
        'current_turn' => $new_attacker_id,
        'attacker_id' => $new_attacker_id
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Произошла ошибка: ' . $e->getMessage()]);
}
exit;
?>
