let io = null;

const initializeSocket = (socketIo) => {
    io = socketIo;
    console.log('Socket.IO service initialized');
};

const getIo = () => {
    if (!io) {
        console.error('Socket.IO not initialized!');
        // Optionally throw an error or handle appropriately
        // throw new Error('Socket.IO not initialized!');
    }
    return io;
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
    getIo,
    emitEvent,
}; 