// Глобальные переменные
let gameId = parseInt(document.getElementById('game-id').dataset.gameId, 10);
let currentUserID = parseInt(document.getElementById('current-user-id').dataset.userId, 10);
let player1Id = parseInt(document.getElementById('player1-id').dataset.playerId, 10);
let player2Id = parseInt(document.getElementById('player2-id').dataset.playerId, 10);

if (isNaN(gameId) || isNaN(currentUserID) || isNaN(player1Id) || isNaN(player2Id)) {
    console.error('Ошибка: Game ID, User ID, Player1 ID или Player2 ID не определены!');
    alert('Произошла ошибка! Пожалуйста, обновите страницу.');
}

// Функция для проверки хода
function isYourTurn() {
    const currentTurnElement = document.getElementById('current-turn');
    if (!currentTurnElement) {
        console.error('Элемент "Текущий ход" не найден!');
        return false;
    }

    const currentTurn = parseInt(currentTurnElement.dataset.currentTurn, 10);
    const currentUserID = parseInt(document.getElementById('current-user-id').dataset.userId, 10);
    if (isNaN(currentUserID)) {
        console.error('Ошибка: User ID не определён!');
        alert('Произошла ошибка! User ID не определён.');
        return;
    }
    if (isNaN(currentTurn) || isNaN(currentUserID)) {
        console.error('Ошибка: current_turn или user_id не определены!');
        return false;
    }

    return currentTurn === currentUserID; // Возвращаем true, если это ваш ход
}

// Выбор карты для хода
function selectCardToPlay(cardId) {
    if (!isYourTurn()) {
        alert('Сейчас не ваш ход!');
        return;
    }

    playCard(cardId); // Выкладываем карту
}

// Ход игрока
function playCard(cardId) {
    const gameId = window.gameId;
    if (!gameId) {
        console.error('Game ID не определена!');
        alert('Произошла ошибка! Game ID не определена.');
        return;
    }

    console.log(`Пытаемся выложить карту с ID: ${cardId}`);

    fetch('php/play_card.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `game_id=${encodeURIComponent(gameId)}&card_id=${encodeURIComponent(cardId)}`
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);

                // Удаляем выбранную карту из руки
                const handList = document.getElementById('player-hand');
                if (handList) {
                    const playedCardElement = Array.from(handList.children).find(card => card.dataset.cardId == cardId);
                    if (playedCardElement) {
                        handList.removeChild(playedCardElement); // Убираем карту из DOM
                    } else {
                        console.warn(`Карта с ID ${cardId} не найдена в руке.`);
                    }
                }

                // Добавляем карту на стол
                const tableDiv = document.getElementById('table-cards');
                if (tableDiv && data.card) {
                    const img = document.createElement('img');
                    img.src = data.card.image; // Путь к изображению карты
                    img.alt = data.card.name;
                    img.dataset.cardId = data.card.id;
                    img.classList.add('table-card-image');
                    tableDiv.appendChild(img); // Добавляем карту на стол
                }

                // Обновляем текущий ход
                highlightActivePlayer(data.current_turn);

                // Обновляем data-атрибут текущего хода
                document.getElementById('current-turn').dataset.currentTurn = data.current_turn;

                checkGameStatus(); // Проверяем статус игры
                
                refillPlayerHand(); // Пополняем руку игрока
            } else {
                console.error('Ошибка при ходе:', data.message);
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Ошибка сети при ходе:', error);
            alert('Не удалось сделать ход!');
        });
}
// Загрузка состояния арены
/*
async function loadArenaState() {
    try {
        const response = await fetch(`php/get_arena_state.php?game_id=${gameId}`);
        console.log('HTTP Response Status:', response.status); // Логируем статус ответа
        if (!response.ok) {
            const text = await response.text();
            console.error('Ошибка сервера:', text); // Логируем текст ошибки
            alert('Произошла ошибка на сервере!');
            return;
        }

        const data = await response.json();
        console.log('Server Response Data:', data); // Логируем данные от сервера

        if (data.success) {
            const state = data.state;

            // Обновление индикатора хода
            highlightActivePlayer(state.current_turn);

            // Обновление карт на столе
            updateTableCards(state.table_cards);

            // Обновление руки текущего игрока
            if (currentUserID === player1Id) {
                updatePlayerHand(state.player1_hand);
            } else if (currentUserID === player2Id) {
                updatePlayerHand(state.player2_hand);
            }

            checkGameStatus(); // Проверяем статус игры
        } else {
            console.error('Ошибка при загрузке состояния игры:', data.message);
            alert('Не удалось загрузить состояние игры!');
        }
    } catch (error) {
        console.error('Ошибка сети при загрузке состояния игры:', error);
        alert('Не удалось загрузить состояние игры!');
    }
}
*/
let isHandLoaded = false; // Флаг для проверки загрузки руки


async function loadArenaState(gameId) {
    try {
        const response = await fetch(`php/get_arena_state.php?game_id=${gameId}`);
        const data = await response.json();

        if (data.success) {
            const state = data.state;

            // Логируем ключевые данные
            console.log('Текущее состояние игры:', state);
            console.log('Current User ID:', currentUserID);
            console.log('Player1 Hand Player ID:', state.player1_hand[0]?.player_id);
            console.log('Player2 Hand Player ID:', state.player2_hand[0]?.player_id);

            // Обновление индикатора хода
            highlightActivePlayer(state.current_turn); // Вызываем обновление хода

            // Обновление карт на столе
            updateTableCards(state.table_cards);
 // Обновление информации об атакующем игроке
 updateAttackerInfo(state);
 toggleTakeCardsButton(state);
            // Обновление руки текущего игрока
            const userId = parseInt(document.getElementById('current-user-id').dataset.userId, 10);
            if (userId === state.player1_hand[0]?.player_id) {
                console.log('Обновление руки для первого игрока:', state.player1_hand);
                updatePlayerHand(state.player1_hand);
            } else if (userId === state.player2_hand[0]?.player_id) {
                console.log('Обновление руки для второго игрока:', state.player2_hand);
                updatePlayerHand(state.player2_hand);
            }
            console.log('Текущий ход:', state.current_turn);
            checkGameStatus(); // Проверяем статус игры
        } else {
            console.error('Ошибка при загрузке состояния игры:', data.message);
            alert('Не удалось загрузить состояние игры!');
        }
    } catch (error) {
        console.error('Ошибка сети при загрузке состояния игры:', error);
        alert('Не удалось загрузить состояние игры!');
    }
}
function updateAttackerInfo(state) {
    const attackerNameElement = document.getElementById('attacker-name');
    if (!attackerNameElement) {
        console.error('Элемент "attacker-name" не найден!');
        return;
    }

    // Проверяем, существует ли attacker_name
    const attackerName = state.attacker_name ?? 'Не определён';
    attackerNameElement.textContent = attackerName;

    console.log('Обновление информации об атакующем игроке:', attackerName);
}
function updatePlayerHand(updatedHand) {
    const handList = document.getElementById('player-hand');
    if (!handList) {
        console.error('Элемент "Рука игрока" (player-hand) не найден!');
        return;
    }

    console.log('Обновление руки игрока:', updatedHand);

    handList.innerHTML = ''; // Очищаем список перед обновлением

    if (Array.isArray(updatedHand) && updatedHand.length > 0) {
        updatedHand.forEach(card => {
            const li = document.createElement('li');
            li.dataset.cardId = card.id;

            const img = document.createElement('img');
            img.src = card.card_image; // Путь к изображению карты
            img.alt = `${card.card_value} ${card.card_suit}`;
            img.classList.add('card-image');

            li.appendChild(img);

            // Добавляем обработчик клика для выбора карты
            li.addEventListener('click', () => selectCardToPlay(card.id));

            handList.appendChild(li);
        });
    } else {
        console.warn('Рука игрока пуста или данные отсутствуют.');
    }
}
// Выделение активного игрока
function highlightActivePlayer(currentTurn) {
    const currentPlayerName = document.getElementById('current-player-name');
    if (!currentPlayerName) {
        console.error('Элемент "Текущий ход" не найден!');
        return;
    }

    // Получаем данные о игроках из DOM
    const gameInfo = document.getElementById('game-info');
    if (!gameInfo) {
        console.error('Элемент "game-info" не найден!');
        return;
    }

    const player1Id = parseInt(gameInfo.dataset.player1Id, 10); // ID первого игрока
    const player2Id = parseInt(gameInfo.dataset.player2Id, 10); // ID второго игрока
    const player1Name = gameInfo.dataset.player1Name; // Имя первого игрока
    const player2Name = gameInfo.dataset.player2Name; // Имя второго игрока

    let playerName = 'Соперник'; // По умолчанию

    // Определяем имя текущего ходящего игрока
    if (currentTurn === player1Id) {
        playerName = player1Name; // Имя первого игрока
    } else if (currentTurn === player2Id) {
        playerName = player2Name; // Имя второго игрока
    }

    // Обновляем текст индикатора хода
    currentPlayerName.textContent = currentTurn === currentUserID ? 'Ваш ход!' : `Ходит: ${playerName}`;
    console.log(`Обновление индикатора хода: ${playerName}`);

    // Выделение активного игрока
    const player1Card = document.getElementById('player1-card');
    const player2Card = document.getElementById('player2-card');

    if (!player1Card || !player2Card) {
        console.error('Элементы игроков не найдены!');
        return;
    }

    player1Card.classList.remove('active-turn');
    player2Card.classList.remove('active-turn');

    if (currentTurn === player1Id) {
        player1Card.classList.add('active-turn');
    } else if (currentTurn === player2Id) {
        player2Card.classList.add('active-turn');
    }
}
// Обновление карт на столе
function updateTableCards(tableCards) {
    const tableDiv = document.getElementById('table-cards');
    if (!tableDiv) return;

    tableDiv.innerHTML = ''; // Очищаем блок перед обновлением

    tableCards.forEach(card => {
        const img = document.createElement('img');
        img.src = card.card_image; // Путь к изображению карты
        img.alt = `${card.card_value} ${card.card_suit}`;
        img.className = 'table-card-image';
        img.dataset.cardId = card.id; // Для идентификации карты
        tableDiv.appendChild(img);
    });

    console.log('Карты на столе успешно обновлены:', tableCards);
}

// Активация/деактивация кнопки "Взять карты"
function toggleTakeCardsButton(state) {
    const button = document.getElementById('take-cards-btn');
    if (!button) return;

    const hasVisibleCards = state.table_cards.length > 0;
    const isDefenderTurn = !isYourTurn(state.current_turn) && hasVisibleCards;

    button.disabled = !isDefenderTurn;
    button.textContent = isDefenderTurn ? 'Взять карты' : 'Нет карт для взятия';
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

    // Инициализируем кнопку "Взять карты"
    initTakeCardsButton();

    // Загружаем начальное состояние арены
    loadArenaState(gameIdFromUrl);

    // Периодически обновляем состояние игры
    setInterval(() => loadArenaState(gameIdFromUrl), 5000);

    // Периодически обновляем чат
    setInterval(() => loadArenaChatMessages(gameIdFromUrl), 3000);
});
document.addEventListener('DOMContentLoaded', function () {
    const gameId = new URLSearchParams(window.location.search).get('game_id');
    if (!gameId) {
        alert('ID игры не найден!');
        window.location.href = 'lobby.php';
        return;
    }

    window.gameId = gameId;

    // Загружаем начальное состояние арены
    loadArenaState(gameId);

    // Периодически обновляем состояние игры
    setInterval(() => loadArenaState(gameId), 5000);
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

function takeCardsFromTable() {
    const gameId = window.gameId;
    if (!gameId) {
        console.error('Game ID не определена!');
        alert('Произошла ошибка! Game ID не определена.');
        return;
    }

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
                alert('Вы взяли карты!');
                // Очищаем стол
                const tableDiv = document.getElementById('table-cards');
                if (tableDiv) {
                    tableDiv.innerHTML = ''; // Удаляем все видимые карты со стола
                }

                // Пополняем руку до 6 карт
                refillPlayerHand();

                // Ход передаётся атакующему игроку
                document.getElementById('current-turn').dataset.currentTurn = data.attacker_id;
                document.getElementById('attacker-id').dataset.attackerId = data.attacker_id;

                // Обновляем состояние игры
                loadArenaState(gameId);
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

                // Если рука была обновлена, применяем изменения
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
// Функция покрытия карты
function coverCard(playedCardId, coveringCardId) {
    const gameId = window.gameId;
    if (!gameId) {
        console.error('Game ID не определена!');
        alert('Произошла ошибка! Game ID не определена.');
        return;
    }

    if (!isYourTurn()) {
        alert('Сейчас не ваш ход!');
        return;
    }

    fetch('php/cover_card.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `game_id=${encodeURIComponent(gameId)}&played_card_id=${encodeURIComponent(playedCardId)}&covering_card_id=${encodeURIComponent(coveringCardId)}`
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message); // Сообщение об успешном покрытии

                // Удаляем закрытую карту со стола
                const tableDiv = document.getElementById('table-cards');
                if (tableDiv) {
                    const playedCardElement = Array.from(tableDiv.children).find(card => card.dataset.cardId == playedCardId);
                    if (playedCardElement) {
                        tableDiv.removeChild(playedCardElement);
                    }
                }

                // Удаляем использованную карту из руки
                const handList = document.getElementById('player-hand');
                if (handList) {
                    const coveringCardElement = Array.from(handList.children).find(card => card.dataset.cardId == coveringCardId);
                    if (coveringCardElement) {
                        handList.removeChild(coveringCardElement);
                    }
                }

                // Обновляем текущий ход
                highlightActivePlayer(data.current_turn);

                // Обновляем data-атрибут текущего хода
                document.getElementById('current-turn').dataset.currentTurn = data.current_turn;

                checkGameStatus(); // Проверяем статус игры
                loadArenaState(gameId); // Обновляем состояние игры
            } else {
                alert(data.message); // Сообщение об ошибке (например, "Так нельзя покрыть!")
                console.error('Ошибка при покрытии карты:', data.message);
            }
        })
        .catch(error => {
            console.error('Ошибка сети при покрытии карты:', error);
            alert('Не удалось покрыть карту!');
        });
}
// Функция для проверки, покрыты ли все карты на столе
function checkAllCardsCovered(state) {
    const tableDiv = document.getElementById('table-cards');
    if (!tableDiv) return false;

    const visibleCardsCount = tableDiv.children.length;
    return visibleCardsCount === 0; // Если на столе нет видимых карт, значит все покрыты
}

// Функция для проверки, можно ли покрыть карту
function canCoverCard(topCard, coveringCard, trumpSuit) {
    const values = { '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'валет': 11, 'дама': 12, 'король': 13, 'туз': 14 };

    const topValue = values[topCard.card_value] ?? 0;
    const coveringValue = values[coveringCard.card_value] ?? 0;

    // Если масти совпадают, сравниваем значения
    if (topCard.card_suit === coveringCard.card_suit) {
        return coveringValue > topValue;
    }

    // Если обороняющаяся карта — козырь, она всегда сильнее
    if (coveringCard.card_suit === trumpSuit) {
        return true;
    }

    return false; // В остальных случаях покрытие невозможно
}
// Добавление обработчиков для покрытия карт
function addCoverCardHandlers(state) {
    const tableCards = document.getElementById('table-cards');
    const playerHand = document.getElementById('player-hand');
    if (!tableCards || !playerHand) return;

    // Снимаем предыдущие обработчики
    removeEventListeners(playerHand);

    // Для каждой карты на столе добавляем возможные варианты покрытия
    state.table_cards.forEach(topCard => {
        const topCardElement = Array.from(tableCards.children).find(card => card.dataset.cardId == topCard.id);
        if (!topCardElement) return;

        state.player_hand.forEach(handCard => {
            const handCardElement = Array.from(playerHand.children).find(card => card.dataset.cardId == handCard.id);
            if (!handCardElement) return;

            // Если карта может покрыть, добавляем обработчик клика
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


document.getElementById('arena-chat-form')?.addEventListener('submit', function (event) {
    event.preventDefault(); // Предотвращаем стандартную отправку формы

    const gameId = window.gameId;
    const messageInput = document.getElementById('arena-chat-input');
    const message = messageInput.value.trim(); // Удаляем лишние пробелы

    if (!message) return;

    fetch('php/send_arena_message.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `game_id=${encodeURIComponent(gameId)}&message=${encodeURIComponent(message)}`
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                messageInput.value = ''; // Очищаем input
                loadArenaChatMessages(gameId); // Обновляем чат
            } else {
                console.error('Ошибка при отправке сообщения:', data.message);
                alert('Не удалось отправить сообщение!');
            }
        })
        .catch(error => {
            console.error('Ошибка сети при отправке сообщения:', error);
            alert('Не удалось отправить сообщение!');
        });
});
function logGameAction(action) {
    const gameLog = document.getElementById('game-log');
    if (!gameLog) return;

    const li = document.createElement('li');
    li.textContent = action;
    gameLog.appendChild(li);

    // Прокручиваем лог вниз
    gameLog.scrollTop = gameLog.scrollHeight;
}
