const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Tesseract = require('tesseract.js'); // Add this for OCR
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

app.use(express.json());
app.use(cors({
  origin: ['https://cypher-ai.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

const upload = multer({ dest: 'uploads/' });

app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    let fileContent = '';
    let jobRole = '';

    if (req.body.jobRole) {
      jobRole = req.body.jobRole;
    }

    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdfParse(dataBuffer);
      fileContent = data.text;
    } else if (['image/jpeg', 'image/png'].includes(req.file.mimetype)) {
      const result = await Tesseract.recognize(req.file.path, 'eng');
      fileContent = result.data.text;
    } else {
      return res.status(400).json({ error: 'Unsupported file type.' });
    }

    fs.unlinkSync(req.file.path); 

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `This is my resume: "${fileContent}". I am aiming for the job role "${jobRole}".

    Please analyze this resume in the context of the specified job role, providing both individual metrics and a comprehensive assessment of its strengths and weaknesses. 
    
    Assessment Criteria:
    
    1. ATS Compatibility:
        - Evaluate the resume's compatibility with Applicant Tracking Systems (ATS).
        - Identify any formatting or content issues that might hinder ATS parsing.
        - Suggest adjustments to optimize keyword usage and overall ATS score.
    
    2. Content and Relevance:
        - Evaluate the alignment between the resume's content (skills, experience, education) and the requirements of the job role.
        - Assess the effectiveness of showcasing relevant keywords and accomplishments.
        - Identify any gaps or missing information crucial for the position.
    
    3. Structure and Formatting:
        - Review the overall organization and readability of the resume.
        - Assess the clarity and conciseness of section headings and bullet points.
        - Consider the resume's formatting in terms of font choice, spacing, and visual appeal.
    
    4. Strengths and Weaknesses:
        - Highlight the resume's most compelling aspects that align with the job requirements (e.g., quantifiable achievements, relevant skills, strong experience).
        - Pinpoint areas that could be strengthened or expanded (e.g., additional details in project descriptions, highlighting transferable skills).
        - Offer specific recommendations for improvement, keeping the target job role in mind.
    
    Output Format:
    
    ATS Compatibility Score (in %): Provide an estimated score based on the resume's ATS-friendliness. The score should be between 50 to 90. (provide only score)
    Content Relevance Score (in %)): Rate the resume's alignment with the target job role. The score should be between 50 to 90. (provide only score)
    Structure and Formatting Score (in %): Assess the resume's organization and readability. The score should be between 50 to 90. (provide only score)
    Overall Resume Score (in %): Provide an overall score considering all factors. The score should be between 50 to 90. (provide only score)
    Strengths: List the resume's top strengths in bullet points, with specific examples from the resume.
    Areas for Improvement: List areas for improvement in bullet points, offering actionable suggestions for each and mention the specific area where there are gramatical errors or any sort of faults if any.
    
    Additional Notes:
    
    {imp note] - Check properly if the content does not appear to be a resume, and  please indicate this in the output. Ensure the analysis is comprehensive, actionable, and tailored to the specific job role provided.        
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    res.json({ text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});

app.post('/generate-content', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const { question } = req.body;
    const prompt = `You are CypherAI, an advanced interview preparation assistant. Your role is to engage in natural, conversational interactions with users who are preparing for job interviews. 

    Analyze the user's input carefully. Determine their intent:
    
    * **Greeting:** If the user simply greets you ("Hello," "Hi there," etc.), respond with a friendly greeting in return, but avoid mentioning interview-related topics.
    * **Direct Question:** If the user asks a question about the interview process, specific questions, or preparation strategies, provide a clear, concise, and helpful answer based on your knowledge.
    * **Vague Statement or Request:** If the user's input is unclear or too broad, gently guide them towards asking a specific question that you can address.
    * **Off-Topic:** If the user's input is unrelated to interview preparation, politely redirect them back to the main topic.
    *  **Commonly asked questions (interpersonal and technical):** If the user asks for commonly asked interview questions then reply back to the user with the commonly asked interpersonal questions or technical questions as asked by the user.
    
    Always maintain a professional, supportive, and encouraging tone. Aim to boost the user's confidence and help them feel well-prepared for their interview.
    
    **Additional Considerations:**
    
    * **Personalization:** If possible, consider ways to personalize your responses based on the user's specific job field or experience level.
    * **Data Collection:** If applicable, you can collect data on common user questions or pain points to improve the assistant's responses over time.
    * **Integration with Resources:** If your project allows, integrate links to relevant articles, videos, or practice tools to provide additional support.
    
    **The User Input is:**
    
    "${question}"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    res.json({ text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
