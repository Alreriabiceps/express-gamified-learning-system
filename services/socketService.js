let io = null;

const initializeSocket = (socketIo) => {
    io = socketIo;
};

const emitEvent = (event, data) => {
    try {
        if (io) {
            io.emit(event, data);
        }
    } catch (error) {
        console.error(`Socket.IO emit error for event ${event}:`, error);
    }
};

module.exports = {
    initializeSocket,
    emitEvent
}; 