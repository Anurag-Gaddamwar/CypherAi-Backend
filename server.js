
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
const { recognize } = require('tesseract.js-node'); 

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
    await fs.unlinkSync(req.file.path); 
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
    Areas for Improvement: List areas for improvement, offering actionable suggestions for each and mention the specific area where there are gramatical errors or any sort of faults if any.
    
   
    {imp note] - Check properly if the content does not appear to be a resume, and  please indicate this in the output. Ensure the analysis is comprehensive, actionable, and tailored to the specific job role provided.;`
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    res.json({ text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});
app.post('/generate-content', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const { currentQuery, prevConversation } = req.body;
    const prompt = `You are CypherAI, an advanced interview preparation assistant. Your role is to engage in natural, conversational interactions with users who are preparing for job interviews.
    Analyze the user's input carefully. Determine their intent:
    * **Greeting:** If the user simply greets you ("Hello," "Hi there," etc.), respond with a friendly greeting in return, but avoid mentioning interview-related topics.
    * **Direct Question:** If the user asks a question about the interview process, specific questions, or preparation strategies, provide a clear, concise, and helpful answer based on your knowledge.
    * **Vague Statement or Request:** If the user's input is unclear or too broad, gently guide them towards asking a specific question that you can address.
    * **Off-Topic:** If the user's input is unrelated to interview preparation, politely answer them and you can also go off-topic as per the user demands and requirements, but for only educational and emotional support.
    * **Commonly Asked Questions (interpersonal and technical):** If the user asks for commonly asked interview questions then reply back to the user with the commonly asked interpersonal questions or technical questions as asked by the user.
    Always maintain a professional, supportive, and encouraging tone. Aim to boost the user's confidence and help them feel well-prepared for their interview.
    **Additional Considerations:**
    * **Personalization:** If possible, consider ways to personalize your responses based on the user's specific job field or experience level.
    * **Data Collection:** If applicable, you can collect data on common user questions or pain points to improve the assistant's responses over time.
    * **Integration with Resources:** If your project allows, integrate links to relevant articles, videos, or practice tools to provide additional support.
    **Conversation History:**
    
    Previous Conversation: "${prevConversation}"
    **Current Query:**
    
    "${currentQuery}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    res.json({ text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});

app.post('/generate-roadmap', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const { currentQuery } = req.body;

    const prompt = `
  You are CypherAI, an advanced interview preparation assistant. Create a comprehensive learning roadmap for a fresher aiming for the job role specified below. The roadmap should start with foundational skills and progress to advanced topics, with realistic timelines for achieving intermediate proficiency. Ensure the learning path is structured and covers all essential skills and tools for the role.
  **Job Role:** "${currentQuery}"
  **Response Format:**
  1. **Skill 1:** [Number of days]
  2. **Skill 2:** [Number of days]
  3. **Skill 3:** [Number of days]
  4. **Skill 4:** [Number of days]
  5. **Skill 5:** [Number of days]
   ...
  Allocate days based on typical learning requirements, ensuring the roadmap covers all key areas from basics to advanced skills relevant to the job role. Provide only the skills and the number of days required for each.
    `;


    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    console.log(text);
    res.json({ text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Error generating content' });
  }
});


app.post('/conduct-interview', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    let fileContent = '';
    let jobRole = '';
    let interviewType = '';

    // Extract values from request body
    if (req.body.jobRole) {
      jobRole = req.body.jobRole;
    }
    if (req.body.interviewType) {
      interviewType = req.body.interviewType;
    }

    if (req.file.mimetype === 'application/pdf') {
      // Extract text from PDF
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdfParse(dataBuffer);
      fileContent = data.text;
    } else if (['image/jpeg', 'image/png'].includes(req.file.mimetype)) {
      // Extract text from image using OCR
      const result = await recognize(req.file.path, 'eng');
      fileContent = result.data.text;
    } else {
      return res.status(400).json({ error: 'Unsupported file type.' });
    }

    // Generate content using GEMINI API
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `
      You are conducting an interview. You have to provide 10 relevant questions based on the interview type (HR or Technical).

      Here is the candidate's resume and job role:

      Resume: ${fileContent}
      Job Role: ${jobRole}
      Interview Type: ${interviewType} Interview

      Your task is to:
      Provide 10 relevant interview questions. Don't provide even a single word extra other than the questions, not even a heading, strictly follow the output format. Remember the first question is most likely "Tell me something about yourself" in almost all interviews.

      Output Format: 
      - 10 interview questions
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Assuming the response content is a single string
    const text = response.text(); // Get the string content from the response
    console.log(text);
    res.send(text); // Send plain text response
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

    // Construct the prompt for feedback generation
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
    
    // Assuming the response content is a single string
    const feedbackText = response.text(); // Get the string content from the response
    console.log(feedbackText);
    res.send({ feedback: feedbackText }); // Send feedback as JSON
  } catch (error) {
    console.error('Error generating feedback:', error);
    res.status(500).json({ error: 'Error generating feedback' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
