const jwt = require('jsonwebtoken');

const secret = "1XkPq9!mL#8sR2@vZ7nF4$QaT6yHcE9w";

const adminToken = jwt.sign({ sub: "test-admin", email: "admin@test.com", role: ["ADMIN"] }, secret, { expiresIn: '1h' });
const teacherToken = jwt.sign({ sub: "a7538893-c508-4ef6-ad99-6bf540dcb5df", email: "mohamed@mohs3n.com", role: ["TEACHER"] }, secret, { expiresIn: '1h' });
const studentToken = jwt.sign({ sub: "bf04b2a4-d3db-430f-bee6-9d552c6bac49", email: "student@mohs3n.com", role: ["STUDENT"] }, secret, { expiresIn: '1h' });

const fs = require('fs');
fs.writeFileSync('tokens.json', JSON.stringify({ adminToken, teacherToken, studentToken }));
console.log("Tokens written to tokens.json");
