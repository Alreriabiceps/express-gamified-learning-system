let io = null;

const initializeSocket = (socketIo) => {
  io = socketIo;
  console.log("Socket.IO service initialized with io instance:", !!io);
  if (io) {
    console.log("Socket.IO io instance details:", {
      hasEngine: !!io.engine,
      hasSockets: !!io.sockets,
      hasRooms: !!io.sockets?.adapter?.rooms,
    });
  }
};

const getIo = () => {
  console.log("🔍 getIo called, io exists:", !!io);
  if (!io) {
    console.error("Socket.IO not initialized!");
    // Optionally throw an error or handle appropriately
    // throw new Error('Socket.IO not initialized!');
  }
  return io;
};

const emitEvent = (event, data) => {
  try {
    if (io) {
      console.log(`Emitting socket event: ${event}`, data);
      io.emit(event, data);
    } else {
      console.error("Socket.IO not initialized, cannot emit event:", event);
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
