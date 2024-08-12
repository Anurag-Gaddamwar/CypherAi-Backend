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

app.post('/conduct-interview', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    let fileContent = '';
    let jobRole = req.body.jobRole || '';
    let interviewType = req.body.interviewType || '';

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

    await fs.unlinkSync(req.file.path);

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `
      You are conducting an interview. You have to provide 10 relevant questions based on the interview type (HR or Technical).

      Here is the candidate's resume and job role:

      Resume: ${fileContent}
      Job Role: ${jobRole}
      Interview Type: ${interviewType}

      Your task is to:
      Provide 10 relevant interview questions. Don't provide even a single word extra other than the questions, not even a heading, strictly follow the output format. Remember the first question is most likely "Tell me something about yourself" in almost all interviews.

      Output Format: 
      - 10 interview questions
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    res.send(text); 
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});

app.post('/get-feedback', async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({ error: 'No answers provided.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `
      You are an expert interviewer providing feedback on a candidate's responses.

Here are the interview questions and the candidate's answers:

${Object.entries(answers).map(([question, answer]) => `Question: ${question}\nAnswer: ${answer}`).join('\n\n')}

Your task is to:
- Provide a detailed and structured feedback report.
- Include an "Overall Performance" summary.
- Offer "Suggestions for Improvement."
- Provide "Specific Feedback" for each question, covering:
  - Quality
  - Clarity
  - Relevance
  - Completeness
  - Improvement Suggestions

Ensure your feedback is comprehensive, clear, and actionable, and cover all the questions provided. Use the following format:

**Overall Performance:**

[Summary of overall performance based on the answers provided.]

**Suggestions for Improvement:**
- [Suggestion 1]
- [Suggestion 2]
- [Suggestion 3]
- [Additional suggestions as needed]

**Specific Feedback:**
**1. [Question 1]**

* **Quality:** [Evaluation]
* **Clarity:** [Evaluation]
* **Relevance:** [Evaluation]
* **Completeness:** [Evaluation]
* **Improvement Suggestion:** [Detailed suggestion for improvement]

**2. [Question 2]**

* **Quality:** [Evaluation]
* **Clarity:** [Evaluation]
* **Relevance:** [Evaluation]
* **Completeness:** [Evaluation]
* **Improvement Suggestion:** [Detailed suggestion for improvement]

...

**N. [Question N]**

* **Quality:** [Evaluation]
* **Clarity:** [Evaluation]
* **Relevance:** [Evaluation]
* **Completeness:** [Evaluation]
* **Improvement Suggestion:** [Detailed suggestion for improvement]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const feedbackText = await response.text();
    res.send({ feedback: feedbackText }); 
  } catch (error) {
    console.error('Error generating feedback:', error);
    res.status(500).json({ error: 'Error generating feedback' });
  }
});

app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    let fileContent = '';
    let jobRole = req.body.jobRole || '';

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

    await fs.unlinkSync(req.file.path);

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `This is my resume: "${fileContent}". I am aiming for the job role "${jobRole}".

    Please analyze this resume in the context of the specified job role, providing both individual metrics and a comprehensive assessment of its strengths and weaknesses. Also I have seen that you are always giving the score betn 80-90, even if the resume doesn't actually aligns with the specified job role, which makes it hard to believe the score, so analyse very critically and then give me the scores, the scores may be less, doesn't matter, but they should be genuine.  
    
    Assessment Criteria:
    
    1. ATS Compatibility:
        - Assess the resume's adherence to ATS standards, including keyword optimization, formatting, and structure.
        
    2. Content and Relevance:
        - Evaluate the alignment between the resume's content (skills, experience, education) and the requirements of the job role.
    
    3. Structure and Formatting:
        - Assess the overall organization and readability of the resume along with the clarity and conciseness of section headings and bullet points.
    
    4. Strengths:
        - Highlight the resume's most compelling aspects that align with the job requirements (e.g., quantifiable achievements, relevant skills, strong experience).
        - Emphasize skills and experiences that directly relate to the job role. Showcase any expertise or knowledge areas that are crucial for the position, including any special projects or responsibilities that align with the job’s demands.
    5. Areas of Improvement:
        - Assess how well the resume matches the job description. Identify any missing skills, experiences, or qualifications that are important for the role and suggest ways to better align the resume with these requirements.
        - Provide targeted advice on how to improve the resume. This could include suggestions for rephrasing, adding specific details, or highlighting particular experiences or skills to make the resume more appealing to recruiters for the target job. (Remember that you can consider giving suggestions about the formatting and structure of the resume, but since you only receive the text response hence, the actual formatting and spacing can't be maintained here)
    
    Output Format:
    
    ATS Compatibility Score (in %): Provide an estimated score based on the resume's ATS-friendliness. The score should be between 0 to 80. (provide only score)
    Content Relevance Score (in %)): Rate the resume's alignment with the target job role. The score should be between 0 to 90. (provide only score)
    Structure and Formatting Score (in %): Assess the resume's organization and readability. The score should be between 0 to 90. (provide only score)
    Overall Resume Score (in %): Provide an overall score considering all factors. The score should be between 0 to 80. (provide only score)
    Strengths: List the resume's top strengths, with specific examples from the resume.
    Areas for Improvement: List areas for improvement, offering actionable suggestions for each and mention the specific area where there are grammatical errors or any sort of faults if any.
    
    [imp note] - Check properly if the content does not appear to be a resume, and please indicate this in the output. For example, if the file is not a resume or doesn't match the expected content, respond with a message indicating this.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const feedbackText = await response.text();
    res.send({ feedback: feedbackText }); 
  } catch (error) {
    console.error('Error analyzing resume:', error);
    res.status(500).json({ error: 'Error analyzing resume' });
  }
});

app.post('/generate-roadmap', async (req, res) => {
  try {
    const { jobRole } = req.body;

    if (!jobRole) {
      return res.status(400).json({ error: 'Job role is required.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Generate a detailed roadmap for someone aiming to become a [jobRole]. The roadmap should include foundational skills, intermediate skills, and advanced skills, along with suggested learning resources and milestones.

    Output Format:
    
    1. Foundation Skills:
        - List the foundational skills required.
        - Provide learning resources and milestones.
        
    2. Intermediate Skills:
        - List the intermediate skills required.
        - Provide learning resources and milestones.
    
    3. Advanced Skills:
        - List the advanced skills required.
        - Provide learning resources and milestones.

    Make sure to structure the roadmap in a clear, actionable manner and include any important milestones or deadlines that would help in achieving the career goal effectively.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const roadmapText = await response.text();
    res.send({ roadmap: roadmapText }); 
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: 'Error generating roadmap' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
