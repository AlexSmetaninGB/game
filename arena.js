// Глобальные переменные
let gameId = parseInt(document.getElementById('current-game-id').dataset.gameId, 10);
let currentUserID = parseInt(document.getElementById('current-user-id')?.dataset.userId, 10) || 0;
let player1Id = parseInt(document.getElementById('player1-id')?.dataset.playerId, 10) || 0;
let player2Id = parseInt(document.getElementById('player2-id')?.dataset.playerId, 10) || 0;

if (isNaN(gameId) || isNaN(currentUserID) || isNaN(player1Id) || isNaN(player2Id)) {
    console.error('Ошибка: Game ID, User ID, Player1 ID или Player2 ID не определены!');
    alert('Произошла ошибка! Пожалуйста, обновите страницу.');
}

// Функция для проверки хода
function isYourTurn(currentTurn) {
    return currentTurn === currentUserID;
}

// Загрузка состояния арены
async function loadArenaState(gameId) {
    try {
        const response = await fetch(`php/get_arena_state.php?game_id=${gameId}`);
        if (!response.ok) {
            const text = await response.text(); // Получаем текст ошибки
            console.error('Ошибка сервера:', text);
            alert('Произошла ошибка на сервере!');
            return;
        }

        const data = await response.json();
        console.log('Server Response Data:', data); // Логируем данные от сервера

        if (data.success) {
            const state = data.state;

            // Проверяем существование массивов
            if (!state.table_cards || !Array.isArray(state.table_cards)) {
                console.error('Ошибка: table_cards не определён!');
                state.table_cards = [];
            }
            if (!state.player1_hand || !Array.isArray(state.player1_hand)) {
                console.error('Ошибка: player1_hand не определён!');
                state.player1_hand = [];
            }
            if (!state.player2_hand || !Array.isArray(state.player2_hand)) {
                console.error('Ошибка: player2_hand не определён!');
                state.player2_hand = [];
            }

            // Обновление индикатора хода
            highlightActivePlayer(state.current_turn);

            // Обновление карт на столе
            updateTableCards(state.table_cards);

            // Определяем текущую руку игрока
            let playerHand = [];
            if (currentUserID === player1Id) {
                playerHand = state.player1_hand;
            } else if (currentUserID === player2Id) {
                playerHand = state.player2_hand;
            } else {
                console.warn('Текущий пользователь не найден в player_hand.');
            }

            // Обновление руки текущего игрока
            updatePlayerHand(playerHand);

            checkGameStatus(); // Проверяем статус игры

            // Активация/деактивация кнопки "Взять карты"
            toggleTakeCardsButton(state);

            // Добавляем обработчики для покрытия карт
            addCoverCardHandlers({ ...state, player_hand: playerHand });
        } else {
            console.error('Ошибка при загрузке состояния игры:', data.message);
            alert('Не удалось загрузить состояние игры!');
        }
    } catch (error) {
        console.error('Ошибка сети при загрузке состояния игры:', error);
        alert('Не удалось загрузить состояние игры!');
    }
}

// Выделение активного игрока
function highlightActivePlayer(currentTurn, attackerId) {
    const player1Card = document.getElementById('player1-card');
    const player2Card = document.getElementById('player2-card');

    if (!player1Card || !player2Card) {
        console.error('Элементы игроков не найдены!');
        return;
    }

    // Сбрасываем выделение
    player1Card.classList.remove('active-turn', 'attacking-turn');
    player2Card.classList.remove('active-turn', 'attacking-turn');

    // Выделяем активного игрока
    if (currentTurn === player1Id) {
        player1Card.classList.add('active-turn'); // Первый игрок ходит
    } else if (currentTurn === player2Id) {
        player2Card.classList.add('active-turn'); // Второй игрок ходит
    }

    // Выделяем атакующего игрока
    if (attackerId === player1Id) {
        player1Card.classList.add('attacking-turn'); // Первый игрок атакует
    } else if (attackerId === player2Id) {
        player2Card.classList.add('attacking-turn'); // Второй игрок атакует
    }
  // Обновляем текст индикатора хода
  const currentPlayerName = document.getElementById('current-player-name');
  if (currentPlayerName) {
      currentPlayerName.textContent = isYourTurn(currentTurn) ? 'Ваш ход!' : 'Ходит: Соперник';
  }
// Обновление карт на столе
function updateTableCards(tableCards) {
    const tableDiv = document.getElementById('table-cards');
    if (!tableDiv) {
        console.error('Элемент "Стол" не найден!');
        return;
    }

    tableDiv.innerHTML = ''; // Очищаем блок перед обновлением

    tableCards.forEach(card => {
        const img = document.createElement('img');
        img.src = card.card_image;
        img.alt = `${card.card_value} ${card.card_suit}`;
        img.className = 'table-card-image';
        img.dataset.cardId = card.id; // Для идентификации карты
        tableDiv.appendChild(img);
    });
}

// Обновление руки игрока
function updatePlayerHand(updatedHand) {
    const handList = document.getElementById('player-hand');
    if (!handList) {
        console.error('Элемент "Рука игрока" не найден!');
        return;
    }

    handList.innerHTML = ''; // Очищаем список перед обновлением

    if (Array.isArray(updatedHand) && updatedHand.length > 0) {
        updatedHand.forEach(card => {
            const li = document.createElement('li');
            li.dataset.cardId = card.id;

            const img = document.createElement('img');
            img.src = card.card_image;
            img.alt = `${card.card_value} ${card.card_suit}`;
            img.className = 'card-image';

            li.appendChild(img);

            // Добавляем обработчик клика для выбора карты
            li.addEventListener('click', () => selectCardToPlay(card.id));

            handList.appendChild(li);
        });
    } else {
        console.warn('Рука игрока пуста или данные отсутствуют.');
    }
}

// Активация/деактивация кнопки "Взять карты"
function toggleTakeCardsButton(state) {
    const button = document.getElementById('take-cards-btn');
    if (!button) return;

    const hasVisibleCards = Array.isArray(state.table_cards) && state.table_cards.length > 0;
    const isDefenderTurn = !isYourTurn(state.current_turn) && hasVisibleCards;

    button.disabled = !isDefenderTurn;
    button.textContent = isDefenderTurn ? 'Взять карты' : 'Нет карт для взятия';
}

// Добавление обработчиков для покрытия карт
function addCoverCardHandlers(state) {
    const tableCards = document.getElementById('table-cards');
    const playerHand = document.getElementById('player-hand');

    if (!tableCards || !playerHand) return;

    removeEventListeners(playerHand); // Снимаем старые обработчики

    if (!state.player_hand || !Array.isArray(state.player_hand)) {
        console.error('Ошибка: player_hand не определён!');
        return;
    }

    state.table_cards.forEach(topCard => {
        const topCardElement = Array.from(tableCards.children).find(card => card.dataset.cardId == topCard.id);
        if (!topCardElement) return;

        state.player_hand.forEach(handCard => {
            const handCardElement = Array.from(playerHand.children).find(card => card.dataset.cardId == handCard.id);
            if (!handCardElement) return;

            if (canCoverCard(topCard, handCard, state.trump_suit)) {
                handCardElement.classList.add('can-cover'); // Помечаем возможные для покрытия карты
                handCardElement.addEventListener('click', () => coverCard(topCard.id, handCard.id));
            } else {
                handCardElement.classList.remove('can-cover'); // Убираем метку для невозможных карт
                handCardElement.removeEventListener('click', coverCard); // Снимаем обработчик
            }
        });
    });
}

// Удаление всех обработчиков клика
function removeEventListeners(playerHand) {
    if (!playerHand) return;
    playerHand.querySelectorAll('li').forEach(handCard => {
        handCard.removeEventListener('click', coverCard);
        handCard.classList.remove('can-cover');
    });
}

// Проверка возможности покрытия карты
function canCoverCard(topCard, coveringCard, trumpSuit) {
    const values = { '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'валет': 11, 'дама': 12, 'король': 13, 'туз': 14 };
    const topValue = values[topCard.card_value] ?? 0;
    const coveringValue = values[coveringCard.card_value] ?? 0;

    if (topCard.card_suit === coveringCard.card_suit) {
        return coveringValue > topValue; // Если масти совпадают, сравниваем значения
    } else if (coveringCard.card_suit === trumpSuit) {
        return true; // Козырь всегда сильнее
    }
    return false; // В остальных случаях покрытие невозможно
}

// Инициализация страницы
document.addEventListener('DOMContentLoaded', function () {
    const gameIdFromUrl = new URLSearchParams(window.location.search).get('game_id');
    if (!gameIdFromUrl) {
        alert('ID игры не найден!');
        window.location.href = 'lobby.php';
        return;
    }

    window.gameId = gameIdFromUrl;

    initTakeCardsButton(); // Инициализируем кнопку "Взять карты"
    loadArenaState(gameIdFromUrl); // Загружаем начальное состояние игры

    // Периодически обновляем состояние игры
    setInterval(() => loadArenaState(gameIdFromUrl), 5000);

    // Периодически обновляем чат
    setInterval(() => loadArenaChatMessages(gameIdFromUrl), 3000);
});

// Инициализация кнопки "Взять карты"
function initTakeCardsButton() {
    const button = document.getElementById('take-cards-btn');
    if (!button) {
        console.error('Критическая ошибка: Кнопка "Взять карты" не найдена!');
        return;
    }

    button.addEventListener('click', function () {
        takeCardsFromTable();
    });
}

// Взятие карт со стола
function takeCardsFromTable() {
    if (!isYourTurn()) {
        alert('Сейчас не ваш ход!');
        return;
    }

    fetch('php/take_cards_from_table.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `game_id=${encodeURIComponent(gameId)}`
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);

                // Очищаем стол
                const tableDiv = document.getElementById('table-cards');
                if (tableDiv) {
                    tableDiv.innerHTML = '';
                }

                // Обновляем руку игрока
                updatePlayerHand(data.updated_hand);

                // Обновляем текущий ход
                highlightActivePlayer(data.current_turn);

                // Обновляем data-атрибут текущего хода
                document.getElementById('current-turn').dataset.currentTurn = data.current_turn;

                checkGameStatus(); // Проверяем статус игры
            } else {
                console.error('Ошибка при взятии карт:', data.message);
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Ошибка сети при взятии карт:', error);
            alert('Не удалось взять карты!');
        });
}

// Пополнение руки игрока
function refillPlayerHand() {
    fetch(`php/refill_player_hand.php?game_id=${gameId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);

                // Обновляем руку игрока
                if (data.updated_hand.length > 0) {
                    updatePlayerHand(data.updated_hand);
                }
            } else {
                console.error('Ошибка при пополнении руки:', data.message);
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Ошибка сети при пополнении руки:', error);
            alert('Не удалось пополнить руку!');
        });
}

// Проверка статуса игры
function checkGameStatus() {
    fetch(`php/check_game_status.php?game_id=${gameId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.is_finished) {
                    if (currentUserID === data.winner_id) {
                        alert('Поздравляем! Вы победили!');
                    } else {
                        alert('Вы проиграли. Победил соперник.');
                    }
                    window.location.href = 'lobby.php'; // Перенаправляем в лобби
                }
            } else {
                console.error('Ошибка при проверке статуса игры:', data.message);
                alert('Произошла ошибка при проверке статуса игры!');
            }
        })
        .catch(error => {
            console.error('Ошибка сети при проверке статуса игры:', error);
            alert('Не удалось проверить статус игры!');
        });
}

// Загрузка сообщений из чата арены
function loadArenaChatMessages(gameId) {
    const chatMessagesList = document.getElementById('arena-chat-messages');
    if (!chatMessagesList) {
        console.error('Элемент "Чат сообщений" не найден!');
        return;
    }

    fetch('php/get_arena_messages.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `game_id=${encodeURIComponent(gameId)}`
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                chatMessagesList.innerHTML = ''; // Очищаем список перед обновлением

                data.messages.forEach(msg => {
                    const li = document.createElement('li');
                    li.textContent = `${msg.username} (${msg.faction}): ${msg.message}`;
                    li.classList.add(`faction-${msg.faction}`); // Добавляем класс для цветовой маркировки
                    chatMessagesList.appendChild(li);
                });

                // Прокручиваем чат вниз
                chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
            } else {
                console.error('Ошибка при загрузке чата:', data.message);
                alert('Не удалось загрузить чат!');
            }
        })
        .catch(error => {
            console.error('Ошибка сети при загрузке чата:', error);
            alert('Не удалось загрузить чат!');
        });
}
    // Обновляем текст атакующего игрока
    const attackerName = document.getElementById('attacker-name');
    if (attackerName) {
        if (attackerId === player1Id) {
            attackerName.textContent = `${player1Name} атакует!`;
        } else if (attackerId === player2Id) {
            attackerName.textContent = `${player2Name} атакует!`;
        } else {
            attackerName.textContent = 'Атакующий игрок не определён!';
        }
    }
}
