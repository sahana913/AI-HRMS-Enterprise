const mongoose = require('mongoose');
const JobSchema = new mongoose.Schema({
    title: String,
    description: String,
    requirements: [String],
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Applicant' }]
});
module.exports = mongoose.model('Job', JobSchema);