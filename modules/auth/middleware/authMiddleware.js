const jwt = require("jsonwebtoken");

// Middleware to verify JWT token
exports.verifyToken = (req, res, next) => {
  try {
    // Allow preflight requests to pass
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    // Get token from header
    const authHeader = req.headers.authorization;
    console.log("Auth header:", authHeader);

    if (!authHeader) {
      console.log("No authorization header found");
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token extracted:", token ? "Token present" : "No token");

    if (!token) {
      console.log("No token found in authorization header");
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify token
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );
      console.log("Token decoded successfully:", {
        id: decoded.id,
        role: decoded.role,
      });

      // Add user info to request
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
  console.log("Checking admin role:", req.user);
  if (req.user && req.user.role === "admin") {
    console.log("Admin role verified");
    next();
  } else {
    console.log("Access denied: Not an admin");
    res.status(403).json({ error: "Access denied. Admin only." });
  }
};

// Middleware to check if user is student
exports.isStudent = (req, res, next) => {
  if (req.user && req.user.role === "student") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Students only." });
  }
};

// Middleware to verify JWT token without checking expiration (for refresh)
exports.verifyTokenIgnoreExp = (req, res, next) => {
  try {
    // Allow preflight requests to pass
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    // Get token from header
    const authHeader = req.headers.authorization;
    console.log("Auth header (ignore exp):", authHeader);

    if (!authHeader) {
      console.log("No authorization header found");
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.split(" ")[1];
    console.log(
      "Token extracted (ignore exp):",
      token ? "Token present" : "No token"
    );

    if (!token) {
      console.log("No token found in authorization header");
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify token but ignore expiration
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
        { ignoreExpiration: true } // This allows expired tokens to pass
      );
      console.log("Token decoded successfully (ignore exp):", {
        id: decoded.id,
        role: decoded.role,
      });

      // Add user info to request
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error("JWT verification error (ignore exp):", jwtError);
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Token verification error (ignore exp):", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// Middleware to check if user is quizmaster
exports.verifyQuizmaster = () => {};

// Middleware to authenticate admin (combines verifyToken and isAdmin)
exports.authenticateAdmin = (req, res, next) => {
  console.log("Authenticating admin request:", {
    path: req.path,
    method: req.method,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization
        ? "Bearer [REDACTED]"
        : undefined,
    },
  });

  exports.verifyToken(req, res, () => {
    exports.isAdmin(req, res, next);
  });
};

module.exports = exports;
