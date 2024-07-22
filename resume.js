const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const pdfParse = require('pdf-parse');
require('dotenv').config();


const app = express();
const port = process.env.PORT || 3002;

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

app.use(express.json());
app.use(cors({
  origin: ['https://cypher-ai.vercel.app/resume', 'http://localhost:3000'],
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

    // Check if jobRole is sent in the request body
    if (req.body.jobRole) {
      jobRole = req.body.jobRole;
    }

    if (req.file.mimetype === 'application/pdf') {
      // Extract text from PDF
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdfParse(dataBuffer);
      fileContent = data.text;
    } else if (['image/jpeg', 'image/png'].includes(req.file.mimetype)) {
      // Extract text from image using OCR
      const result = await Tesseract.recognize(req.file.path, 'eng');
      fileContent = result.data.text;
    } else {
      return res.status(400).json({ error: 'Unsupported file type.' });
    }

    // Generate content using GEMINI API
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
    
    ATS Compatibility Score (in %): Provide an estimated score based on the resume's ATS-friendliness. (provide only score)
    Content Relevance Score (in %)): Rate the resume's alignment with the target job role. (provide only score)
    Structure and Formatting Score (in %): Assess the resume's organization and readability. (provide only score)
    Overall Resume Score (in %): Provide an overall score considering all factors. (provide only score)
    Strengths: List the resume's top strengths in bullet points, with specific examples from the resume.
    Areas for Improvement: List areas for improvement in bullet points, offering actionable suggestions for each and mention the specific area where there are gramatical errors or any sort of faults if any.
    
    Additional Notes:
    
    {imp note] - Check properly if the content does not appear to be a resume, and  please indicate this in the output. Ensure the analysis is comprehensive, actionable, and tailored to the specific job role provided.        
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log(response);
    const text = response.text();
    console.log(text);
    res.json({ text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
