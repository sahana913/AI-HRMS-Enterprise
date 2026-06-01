const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.analyzeResume = async (resumeText, jobDescription) => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Analyze this resume against the job description. 
    Resume: ${resumeText}
    JD: ${jobDescription}
    Return JSON only: { "score": 0-100, "skills": [], "summary": "", "decision": "Shortlist/Reject" }`;
    
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
};