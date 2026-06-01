const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'HR', 'Employee', 'Candidate'], default: 'Employee' }
});
module.exports = mongoose.model('User', UserSchema);
