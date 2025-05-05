// Socket event handlers for PVP

const pvpController = require('../controllers/pvpController');

/**
 * Registers all PVP socket event handlers
 * @param {Object} socket - The socket.io socket instance
 */
const registerPvpSocketHandlers = (socket) => {
    // Add event listener for request_initial_cards
    socket.on('request_initial_cards', async (data) => {
        try {
            const { lobbyId, playerId } = data;
            const userId = socket.userId || playerId; // Use socket's userId if available

            if (!lobbyId || !userId) {
                console.warn('Missing lobbyId or playerId in request_initial_cards event');
                socket.emit('game_error', { message: 'Missing required data' });
                return;
            }

            console.log(`[Socket] request_initial_cards received from player ${userId} for lobby ${lobbyId}`);

            // Call the controller function
            await pvpController.handleRequestInitialCards(lobbyId, userId);

        } catch (error) {
            console.error('Error handling request_initial_cards:', error);
            socket.emit('game_error', { message: error.message || 'Error requesting initial cards' });
        }
    });
};

module.exports = registerPvpSocketHandlers; 