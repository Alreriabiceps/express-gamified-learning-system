import { useEffect } from "react";

const useQueueTimer = (
  isQueueing,
  queueTime,
  setQueueTime,
  queueIntervalRef
) => {
  // Queue Timer Effect
  useEffect(() => {
    if (isQueueing) {
      queueIntervalRef.current = setInterval(() => {
        setQueueTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
      setQueueTime(0);
    }
    return () => {
      if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
    };
  }, [isQueueing, setQueueTime, queueIntervalRef]);
};

export default useQueueTimer;
