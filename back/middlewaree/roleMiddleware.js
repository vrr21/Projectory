module.exports = function (roles) {
    return function (req, res, next) {
      if (req.method === "OPTIONS") {
        next();
      }
  
      try {
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
          return res.status(403).json({ message: "User not authorized" });
        }
  
        const { roles: userRoles } = jwt.verify(token, secret);
        const hasRole = roles.some(role => userRoles.includes(role));
        if (!hasRole) {
          return res.status(403).json({ message: "Access denied" });
        }
  
        next();
      } catch (e) {
        console.log(e);
        return res.status(403).json({ message: "User not authorized" });
      }
    };
  };
  