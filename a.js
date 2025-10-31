const bcrypt = require('bcrypt');

async function hashPassword() {
    const password = "password123"; // your plain text password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
}

hashPassword();