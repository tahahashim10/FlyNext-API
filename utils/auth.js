import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


// From Exercise 6

const SECRET_KEY = process.env.JWT_SECRET;


export function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

// Verify JWT Token (returns payload or null)
export function verifyToken(request) {
    const authorization = request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return null;
    }

    const token = authorization.replace("Bearer ", "");

    try {
        return jwt.verify(token, SECRET_KEY);
    } catch {
        return null;
    }
}
